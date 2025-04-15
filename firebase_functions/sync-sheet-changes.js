const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

/**
 * Cloud Function that syncs changes from Google Sheet to Firestore
 */
exports.syncSheetChanges = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    return await syncGuestListFromSheet();
  });

/**
 * Helper function to sync guest list from Google Sheet to Firestore
 */
async function syncGuestListFromSheet() {
    try {
      console.log('Starting Google Sheet sync check');
      console.log('Service account:', functions.config().sheets.credentials.client_email);

      // Use the specific Google Sheet ID
      const sheetId = '1e9ejByxnDLAMi_gJPiSQyiRbHougbzwLFeH6GNLjAnk';
      console.log('Using Google Sheet ID:', sheetId);

      // Get the service account credentials from environment
      const serviceAccountCredentials = functions.config().sheets.credentials;

      // Set up Google Sheets authentication
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountCredentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const client = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: client });

      // First, get the sheet names to find the correct sheet
      console.log('Getting sheet names...');
      const sheetsResponse = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });

      const sheetNames = sheetsResponse.data.sheets.map(sheet => sheet.properties.title);
      console.log('Available sheets:', sheetNames);

      // Use the first sheet by default
      const sheetName = sheetNames[0] || 'Sheet1';
      console.log('Using sheet name:', sheetName);

      // First get the header row to understand column structure
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!1:1`, // Get header row
      });

      if (!headerResponse.data.values || headerResponse.data.values.length === 0) {
        console.error('No header row found in sheet');
        return null;
      }

      const headers = headerResponse.data.values[0];
      console.log('Headers found:', headers);

      // Get all data including headers
      console.log('Fetching data from Google Sheet...');
      let response;
      try {
        response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: sheetName, // Get all data
        });
        console.log(`Successfully fetched data from Google Sheet. Found ${response.data.values ? response.data.values.length : 0} rows.`);
      } catch (error) {
        console.error('Error fetching data from Google Sheet:', error.message);
        if (error.message.includes('permission')) {
          console.error('This might be a permissions issue. Make sure the service account has access to the Google Sheet.');
        }
        throw error;
      }

      if (!response.data.values || response.data.values.length <= 1) {
        console.log('No data found in sheet or only header row exists');
        return null;
      }

      // Skip the header row
      const rows = response.data.values.slice(1);
      console.log(`Found ${rows.length} data rows in sheet`);

      // Log the headers to see what columns are available
      console.log('Sheet headers:', headers);

      // Find column indices
      // First, try to find the name column with the exact column name from the sheet
      let nameIndex = headers.indexOf('Name Line 1 (First and Last Name)');
      if (nameIndex === -1) nameIndex = headers.indexOf('Name Line 1');
      if (nameIndex === -1) nameIndex = headers.indexOf('Name');
      if (nameIndex === -1) nameIndex = headers.indexOf('Full Name');
      if (nameIndex === -1) nameIndex = 0; // Default to first column if no match

      console.log('Using name column index:', nameIndex, 'with value:', headers[nameIndex]);

      if (nameIndex === -1 || !headers[nameIndex]) {
        console.error('Name column not found in sheet');
        return null;
      }

      // Find all column indices with fallbacks for different possible column names
      let additionalNamesIndex = headers.indexOf('Name Line 2 (Additional Names)');
      if (additionalNamesIndex === -1) additionalNamesIndex = headers.indexOf('Name Line 2');
      if (additionalNamesIndex === -1) additionalNamesIndex = headers.indexOf('Additional Names');

      let addressLine1Index = headers.indexOf('Address Line 1');
      if (addressLine1Index === -1) addressLine1Index = headers.indexOf('Address');

      let addressLine2Index = headers.indexOf('Address Line 2 (Apt, Suite)');
      if (addressLine2Index === -1) addressLine2Index = headers.indexOf('Address Line 2');
      if (addressLine2Index === -1) addressLine2Index = headers.indexOf('Address 2');

      const cityIndex = headers.indexOf('City');
      const stateIndex = headers.indexOf('State');
      const zipIndex = headers.indexOf('Zip');

      let countryIndex = headers.indexOf('Country (non-US)');
      if (countryIndex === -1) countryIndex = headers.indexOf('Country');

      const emailIndex = headers.indexOf('Email');
      const phoneIndex = headers.indexOf('Phone');

      let categoryIndex = headers.indexOf('Category');
      if (categoryIndex === -1) categoryIndex = headers.indexOf('Group');

      let maxGuestsIndex = headers.indexOf('Max Guests');
      if (maxGuestsIndex === -1) maxGuestsIndex = headers.indexOf('Maximum Guests');

      let respondedIndex = headers.indexOf('Responded');
      if (respondedIndex === -1) respondedIndex = headers.indexOf('Has Responded');

      let rsvpStatusIndex = headers.indexOf('RSVP Status');
      if (rsvpStatusIndex === -1) rsvpStatusIndex = headers.indexOf('Response');

      let guestCountIndex = headers.indexOf('Guest Count');
      if (guestCountIndex === -1) guestCountIndex = headers.indexOf('Number of Guests');

      let additionalGuestsIndex = headers.indexOf('Additional Guests');
      if (additionalGuestsIndex === -1) additionalGuestsIndex = headers.indexOf('Guest Names');

      // Log the column indices to help with debugging
      console.log('Column indices:', {
        nameIndex,
        additionalNamesIndex,
        addressLine1Index,
        addressLine2Index,
        cityIndex,
        stateIndex,
        zipIndex,
        countryIndex,
        emailIndex,
        phoneIndex,
        categoryIndex,
        maxGuestsIndex,
        respondedIndex,
        rsvpStatusIndex,
        guestCountIndex,
        additionalGuestsIndex
      });

      // Get Firestore database
      const db = admin.firestore();
      const guestListRef = db.collection('guestList');

      // Get existing guests from Firestore for comparison
      const existingGuests = await guestListRef.get();
      const existingGuestMap = new Map();
      existingGuests.forEach(doc => {
        const data = doc.data();
        existingGuestMap.set(data.name, { id: doc.id, ...data });
      });

      console.log(`Found ${existingGuestMap.size} existing guests in Firestore`);

      // Process each row from the sheet
      let updatedCount = 0;
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
          maxAllowedGuests: maxGuestsIndex >= 0 && row[maxGuestsIndex] ? parseInt(row[maxGuestsIndex]) || 1 : 1,
          hasResponded: respondedIndex >= 0 && row[respondedIndex] ? row[respondedIndex].toLowerCase() === 'yes' : false,
          response: rsvpStatusIndex >= 0 && row[rsvpStatusIndex] ? row[rsvpStatusIndex].toLowerCase() : '',
          actualGuestCount: guestCountIndex >= 0 && row[guestCountIndex] ? parseInt(row[guestCountIndex]) || 0 : 0,
          additionalGuests: additionalGuestsIndex >= 0 && row[additionalGuestsIndex] ?
            row[additionalGuestsIndex].split(',').map(g => g.trim()).filter(g => g) : [],
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };

        // Check if guest already exists
        if (existingGuestMap.has(name)) {
          // Update existing guest
          const existingGuest = existingGuestMap.get(name);
          const docRef = guestListRef.doc(existingGuest.id);
          batch.update(docRef, guest);
          updatedCount++;
        } else {
          // Add new guest
          const docRef = guestListRef.doc();
          batch.set(docRef, guest);
          addedCount++;
        }
      }

      // Commit the batch
      await batch.commit();

      console.log(`Sync completed: Added ${addedCount} new guests, Updated ${updatedCount} existing guests`);
      return { addedCount, updatedCount };
    } catch (error) {
      console.error('Error syncing guest list from sheet:', error);
      return null;
    }
}

/**
 * HTTP endpoint to manually trigger the sync
 */
exports.manualSyncSheetChanges = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Manual sync triggered');
    console.log('Service account:', functions.config().sheets.credentials.client_email);

    // Call the sync function
    await exports.syncSheetChanges.run();

    console.log('Manual sync completed successfully');
    res.status(200).json({
      success: true,
      message: 'Google Sheet to Firebase sync completed successfully'
    });
  } catch (error) {
    console.error('Error in manual sync:', error);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`
    });
  }
});
