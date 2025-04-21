const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

/**
 * Cloud Function that syncs changes from Google Sheet to Firestore
 * Reduced frequency to hourly to optimize costs while maintaining data freshness
 */
exports.syncSheetChanges = functions.pubsub
  .schedule('every 60 minutes')
  .onRun(async (context) => {
    return await syncGuestListFromSheet();
  });

/**
 * Helper function to sync guest list from Google Sheet to Firestore
 * Optimized for reduced complexity and better performance
 */
async function syncGuestListFromSheet() {
    try {
      console.log('Starting Google Sheet sync check');

      // Use the specific Google Sheet ID
      const sheetId = '1e9ejByxnDLAMi_gJPiSQyiRbHougbzwLFeH6GNLjAnk';

      // Get the service account credentials from environment
      const serviceAccountCredentials = functions.config().sheets.credentials;

      // Set up Google Sheets authentication
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountCredentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const client = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: client });

      // Get sheet info and data in parallel to reduce execution time
      const [sheetsResponse, headerResponse] = await Promise.all([
        sheets.spreadsheets.get({ spreadsheetId: sheetId }),
        sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: 'Sheet1!1:1', // Get header row from first sheet
        })
      ]);

      // Use the first sheet by default
      const sheetName = sheetsResponse.data.sheets[0]?.properties.title || 'Sheet1';

      if (!headerResponse.data.values || headerResponse.data.values.length === 0) {
        console.error('No header row found in sheet');
        return null;
      }

      const headers = headerResponse.data.values[0];

      // Get all data including headers
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: sheetName, // Get all data
      });

      if (!response.data.values || response.data.values.length <= 1) {
        console.log('No data found in sheet or only header row exists');
        return null;
      }

      // Skip the header row
      const rows = response.data.values.slice(1);
      console.log(`Found ${rows.length} data rows in sheet`);

      // Find column indices using a helper function to reduce complexity
      const columnIndices = findColumnIndices(headers);

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

      // Process each row from the sheet
      const { batch, updatedCount, addedCount } = processSheetRows(rows, columnIndices, existingGuestMap, guestListRef);

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
 * Helper function to find column indices in the sheet headers
 */
function findColumnIndices(headers) {
  // Find name column index with fallbacks
  let nameIndex = headers.indexOf('Name Line 1 (First and Last Name)');
  if (nameIndex === -1) nameIndex = headers.indexOf('Name Line 1');
  if (nameIndex === -1) nameIndex = headers.indexOf('Name');
  if (nameIndex === -1) nameIndex = headers.indexOf('Full Name');
  if (nameIndex === -1) nameIndex = 0; // Default to first column if no match

  // Find all other column indices with fallbacks
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

  let respondedIndex = headers.indexOf('Responded');
  if (respondedIndex === -1) respondedIndex = headers.indexOf('Has Responded');

  let rsvpStatusIndex = headers.indexOf('RSVP Status');
  if (rsvpStatusIndex === -1) rsvpStatusIndex = headers.indexOf('Response');

  let guestCountIndex = headers.indexOf('Guest Count');
  if (guestCountIndex === -1) guestCountIndex = headers.indexOf('Number of Guests');

  let additionalGuestsIndex = headers.indexOf('Additional Guests');
  if (additionalGuestsIndex === -1) additionalGuestsIndex = headers.indexOf('Guest Names');

  return {
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
    respondedIndex,
    rsvpStatusIndex,
    guestCountIndex,
    additionalGuestsIndex
  };
}

/**
 * Helper function to process sheet rows and update Firestore
 */
function processSheetRows(rows, columnIndices, existingGuestMap, guestListRef) {
  const db = admin.firestore();
  const batch = db.batch();
  let updatedCount = 0;
  let addedCount = 0;

  // Process each row
  for (const row of rows) {
    // Skip empty rows
    if (!row[columnIndices.nameIndex]) continue;

    const name = row[columnIndices.nameIndex];

    // Create guest object
    const guest = createGuestObject(row, columnIndices);

    // Update or add the guest
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

  return { batch, updatedCount, addedCount };
}

/**
 * Helper function to create a guest object from a row
 */
function createGuestObject(row, columnIndices) {
  const {
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
    respondedIndex,
    rsvpStatusIndex,
    guestCountIndex,
    additionalGuestsIndex
  } = columnIndices;

  // Get field values with null checks
  const getValue = (index) => index >= 0 && row[index] ? row[index] : '';

  // Create the guest object
  return {
    name: getValue(nameIndex),
    additionalNames: getValue(additionalNamesIndex),
    address: {
      line1: getValue(addressLine1Index),
      line2: getValue(addressLine2Index),
      city: getValue(cityIndex),
      state: getValue(stateIndex),
      zip: getValue(zipIndex),
      country: getValue(countryIndex)
    },
    email: getValue(emailIndex),
    phone: getValue(phoneIndex),
    category: getValue(categoryIndex),
    hasResponded: respondedIndex >= 0 && row[respondedIndex] ? row[respondedIndex].toLowerCase() === 'yes' : false,
    response: rsvpStatusIndex >= 0 && row[rsvpStatusIndex] ? row[rsvpStatusIndex].toLowerCase() : '',
    actualGuestCount: guestCountIndex >= 0 && row[guestCountIndex] ? parseInt(row[guestCountIndex]) || 0 : 0,
    additionalGuests: additionalGuestsIndex >= 0 && row[additionalGuestsIndex] ?
      row[additionalGuestsIndex].split(',').map(g => g.trim()).filter(g => g) : [],
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  };
}

/**
 * HTTP endpoint to manually trigger the sync
 */
exports.manualSyncSheetChanges = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Manual sync triggered');
    console.log('Service account:', functions.config().sheets.credentials.client_email);

    // Call the sync function directly
    const result = await syncGuestListFromSheet();

    console.log('Manual sync completed successfully');
    res.status(200).json({
      success: true,
      message: 'Google Sheet to Firebase sync completed successfully',
      result: result
    });
  } catch (error) {
    console.error('Error in manual sync:', error);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`
    });
  }
});
