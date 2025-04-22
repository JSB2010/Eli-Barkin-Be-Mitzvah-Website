const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { google } = require('googleapis');

// Define secrets for Google Sheets
const sheetsCredentials = defineSecret('SHEETS_CREDENTIALS');
const sheetsSheetId = defineSecret('SHEETS_SHEET_ID');

/**
 * HTTP endpoint to manually trigger the sync from Google Sheet to Firestore
 */
exports.manualSyncSheetChangesV2 = onRequest({
  minInstances: 0,
  maxInstances: 1,
  memory: '256MiB',
  timeoutSeconds: 120,
  region: 'us-central1',
  secrets: [sheetsCredentials, sheetsSheetId],
  cors: {
    origin: true, // Allow requests from any origin
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600
  }
}, async (req, res) => {
  // Set CORS headers manually for better browser compatibility
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  try {
    console.log('Manual sync triggered');
    const credentials = JSON.parse(sheetsCredentials.value());
    console.log('Service account:', credentials.client_email);

    const result = await syncGuestListFromSheet();

    return res.status(200).json({
      success: true,
      message: 'Sync completed successfully',
      result
    });
  } catch (error) {
    console.error('Error syncing sheet changes:', error);
    return res.status(500).json({
      success: false,
      message: `Error: ${error.message}`
    });
  }
});

/**
 * Syncs the guest list from the Google Sheet to Firestore
 */
async function syncGuestListFromSheet() {
  try {
    console.log('Starting guest list sync from sheet');

    // Get the sheet ID from secrets or use the specific one
    // Trim the sheet ID to remove any whitespace or newlines
    let sheetId = (sheetsSheetId.value() || '1e9ejByxnDLAMi_gJPiSQyiRbHougbzwLFeH6GNLjAnk').trim();
    // Remove any newline characters that might be in the sheet ID
    sheetId = sheetId.replace(/[\r\n]+/g, '');
    // Remove any URL-encoded newline characters (%0A)
    sheetId = sheetId.replace(/%0A/g, '');
    console.log('Sheet ID after cleaning:', sheetId);

    // Get the service account credentials from secrets
    const serviceAccountCredentials = JSON.parse(sheetsCredentials.value());

    // Set up Google Sheets authentication
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
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

    // Get all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('No data found in sheet');
      return { success: false, message: 'No data found in sheet' };
    }

    console.log(`Found ${rows.length} rows in sheet`);

    // Get the header row
    const headers = rows[0];
    console.log('Headers:', headers);

    // Find the column indices for required fields
    const nameIndex = headers.indexOf('Name Line 1 (First and Last Name)');
    if (nameIndex === -1) {
      console.error('Name column not found in sheet');
      return { success: false, message: 'Name column not found in sheet' };
    }

    // Find other column indices
    const emailIndex = headers.indexOf('Email');
    const phoneIndex = headers.indexOf('Phone');
    const stateIndex = headers.indexOf('State');

    // Skip the header row
    const dataRows = rows.slice(1);

    // Get the existing guest list from Firestore
    const db = admin.firestore();
    const guestListRef = db.collection('guestList');
    const snapshot = await guestListRef.get();

    const existingGuests = new Map();
    snapshot.forEach(doc => {
      const guest = doc.data();
      if (guest.name) {
        existingGuests.set(guest.name.toLowerCase(), {
          id: doc.id,
          ...guest
        });
      }
    });

    console.log(`Found ${existingGuests.size} existing guests in Firestore`);

    // Process each row and update Firestore
    const batch = db.batch();
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];

      // Skip rows with no name
      if (!row[nameIndex]) {
        skippedCount++;
        continue;
      }

      const name = row[nameIndex].trim();
      const email = emailIndex >= 0 && row[emailIndex] ? row[emailIndex].trim() : '';
      const phone = phoneIndex >= 0 && row[phoneIndex] ? row[phoneIndex].trim() : '';
      const state = stateIndex >= 0 && row[stateIndex] ? row[stateIndex].trim() : '';

      // Determine if this is an out-of-town guest
      const isOutOfTown = state && state.toUpperCase() !== 'CO' && state.toUpperCase() !== 'COLORADO';

      // Check if this guest already exists in Firestore
      const existingGuest = existingGuests.get(name.toLowerCase());

      if (existingGuest) {
        // Update existing guest
        const guestRef = guestListRef.doc(existingGuest.id);

        batch.update(guestRef, {
          name,
          email,
          phone,
          state,
          isOutOfTown,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        updatedCount++;
      } else {
        // Add new guest
        const newGuestRef = guestListRef.doc();

        batch.set(newGuestRef, {
          name,
          email,
          phone,
          state,
          isOutOfTown,
          created: admin.firestore.FieldValue.serverTimestamp(),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        addedCount++;
      }

      // Commit batch if it's getting large
      if ((addedCount + updatedCount) % 500 === 0) {
        await batch.commit();
        console.log(`Committed batch of ${addedCount + updatedCount} guests`);
      }
    }

    // Commit any remaining changes
    if (addedCount + updatedCount > 0) {
      await batch.commit();
    }

    console.log(`Sync complete. Added: ${addedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`);

    return {
      success: true,
      added: addedCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: dataRows.length
    };

  } catch (error) {
    console.error('Error syncing guest list from sheet:', error);
    throw error;
  }
}
