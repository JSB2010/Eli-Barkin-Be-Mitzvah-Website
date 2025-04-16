const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

/**
 * HTTP endpoint to import guest list from Google Sheet to Firestore
 */
exports.importGuestList = functions.https.onRequest(async (req, res) => {
  try {
    // Get the service account credentials from environment
    const serviceAccountCredentials = functions.config().sheets.credentials;

    // Get the sheet ID from environment or use the specific one
    const sheetId = functions.config().sheets.sheet_id || '1e9ejByxnDLAMi_gJPiSQyiRbHougbzwLFeH6GNLjAnk';

    // Set up Google Sheets authentication
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Get the sheet names
    const sheetsResponse = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const sheetNames = sheetsResponse.data.sheets.map(sheet => sheet.properties.title);
    console.log('Available sheets:', sheetNames);

    // Use the first sheet by default
    const sheetName = sheetNames[0] || 'Sheet1';
    console.log('Using sheet name:', sheetName);

    // Get the header row
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!1:1`, // Get header row
    });

    if (!headerResponse.data.values || headerResponse.data.values.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No header row found in sheet'
      });
    }

    const headers = headerResponse.data.values[0];
    console.log('Headers found:', headers);

    // Get all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: sheetName, // Get all data
    });

    if (!response.data.values || response.data.values.length <= 1) {
      return res.status(400).json({
        success: false,
        message: 'No data found in sheet or only header row exists'
      });
    }

    // Skip the header row
    const rows = response.data.values.slice(1);
    console.log(`Found ${rows.length} data rows in sheet`);

    // Find column indices
    let nameIndex = headers.indexOf('Name Line 1 (First and Last Name)');
    if (nameIndex === -1) nameIndex = headers.indexOf('Name Line 1');
    if (nameIndex === -1) nameIndex = headers.indexOf('Name');
    if (nameIndex === -1) nameIndex = 0; // Default to first column

    if (nameIndex === -1 || !headers[nameIndex]) {
      return res.status(400).json({
        success: false,
        message: 'Name column not found in sheet'
      });
    }

    // Find other column indices
    let additionalNamesIndex = headers.indexOf('Name Line 2 (Additional Names)');
    if (additionalNamesIndex === -1) additionalNamesIndex = headers.indexOf('Name Line 2');

    let addressLine1Index = headers.indexOf('Address Line 1');
    let addressLine2Index = headers.indexOf('Address Line 2 (Apt, Suite)');
    if (addressLine2Index === -1) addressLine2Index = headers.indexOf('Address Line 2');

    const cityIndex = headers.indexOf('City');
    const stateIndex = headers.indexOf('State');
    const zipIndex = headers.indexOf('Zip');

    let countryIndex = headers.indexOf('Country (non-US)');
    if (countryIndex === -1) countryIndex = headers.indexOf('Country');

    const emailIndex = headers.indexOf('Email');
    const phoneIndex = headers.indexOf('Phone');
    const categoryIndex = headers.indexOf('Category');
    // maxGuestsIndex removed

    // Get Firestore database
    const db = admin.firestore();
    const guestListRef = db.collection('guestList');

    // Process each row from the sheet
    let addedCount = 0;
    const batch = db.batch();

    for (const row of rows) {
      // Skip empty rows
      if (!row[nameIndex]) continue;

      const name = row[nameIndex];

      // Create guest object with available data
      const guest = {
        name,
        additionalNames: additionalNamesIndex >= 0 && row[additionalNamesIndex] ? row[additionalNamesIndex] : '',
        address: {
          line1: addressLine1Index >= 0 && row[addressLine1Index] ? row[addressLine1Index] : '',
          line2: addressLine2Index >= 0 && row[addressLine2Index] ? row[addressLine2Index] : '',
          city: cityIndex >= 0 && row[cityIndex] ? row[cityIndex] : '',
          state: stateIndex >= 0 && row[stateIndex] ? row[stateIndex] : '',
          zip: zipIndex >= 0 && row[zipIndex] ? row[zipIndex] : '',
          country: countryIndex >= 0 && row[countryIndex] ? row[countryIndex] : ''
        },
        email: emailIndex >= 0 && row[emailIndex] ? row[emailIndex] : '',
        phone: phoneIndex >= 0 && row[phoneIndex] ? row[phoneIndex] : '',
        category: categoryIndex >= 0 && row[categoryIndex] ? row[categoryIndex] : '',
        // maxAllowedGuests removed
        hasResponded: false,
        response: '',
        actualGuestCount: 0,
        additionalGuests: [],
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      };

      // Add new guest
      const docRef = guestListRef.doc();
      batch.set(docRef, guest);
      addedCount++;
    }

    // Commit the batch
    await batch.commit();

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${addedCount} guests from Google Sheet to Firestore`
    });
  } catch (error) {
    console.error('Error importing guest list:', error);
    return res.status(500).json({
      success: false,
      message: `Error: ${error.message}`
    });
  }
});
