const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

// This function assumes admin.initializeApp() has been called in index.js

/**
 * Cloud Function to check for changes in Google Sheet and sync to Firebase
 * This can be scheduled to run periodically
 */
exports.syncSheetChanges = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    try {
      console.log('Starting Google Sheet sync check');
      console.log('Service account:', functions.config().sheets.credentials.client_email);

      // Use the specific Google Sheet ID
      const sheetId = '1e9ejByxnDLAMi_gJPiSQyiRbHougbzwLFeH6GNLjAnk';
      console.log('Using Google Sheet ID:', sheetId);

      // Get the service account credentials from environment
      const serviceAccountCredentials = functions.config().sheets.credentials;
      if (!serviceAccountCredentials) {
        console.error('Service account credentials not configured');
        return null;
      }

      // Set up Google Sheets authentication
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountCredentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
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

      const headers = headerResponse.data.values[0] || [];

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

      const allRows = response.data.values || [];
      if (allRows.length <= 1) { // Only header or empty
        console.log('No data found in sheet');
        return null;
      }

      // Skip the header row
      const rows = allRows.slice(1);

      // Log the headers to see what columns are available
      console.log('Sheet headers:', headers);

      // Find column indices
      // First, try to find the name column with various possible names
      let nameIndex = headers.indexOf('Name Line 1');
      if (nameIndex === -1) nameIndex = headers.indexOf('Name');
      if (nameIndex === -1) nameIndex = headers.indexOf('Full Name');
      if (nameIndex === -1) nameIndex = 0; // Default to first column if no match

      console.log('Using name column index:', nameIndex, 'with value:', headers[nameIndex]);

      if (nameIndex === -1 || !headers[nameIndex]) {
        console.error('Name column not found in sheet');
        return null;
      }

      // Get Firestore reference
      const db = admin.firestore();
      const guestListRef = db.collection('guestList');

      // Get all existing guests from Firestore
      const existingGuests = await guestListRef.get();
      const existingGuestMap = new Map();

      existingGuests.forEach(doc => {
        const data = doc.data();
        existingGuestMap.set(data.name.toLowerCase(), {
          id: doc.id,
          ...data
        });
      });

      // Process each row from the sheet
      let updatedCount = 0;
      let addedCount = 0;

      // Find all column indices with fallbacks for different possible column names
      let additionalNamesIndex = headers.indexOf('Name Line 2');
      if (additionalNamesIndex === -1) additionalNamesIndex = headers.indexOf('Additional Names');

      let addressLine1Index = headers.indexOf('Address Line 1');
      if (addressLine1Index === -1) addressLine1Index = headers.indexOf('Address');

      let addressLine2Index = headers.indexOf('Address Line 2');
      if (addressLine2Index === -1) addressLine2Index = headers.indexOf('Address 2');

      const cityIndex = headers.indexOf('City');
      const stateIndex = headers.indexOf('State');
      const zipIndex = headers.indexOf('Zip');

      let countryIndex = headers.indexOf('Country');
      if (countryIndex === -1) countryIndex = headers.indexOf('Country (non-US)');

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

      // Create a batch for updates
      const batch = db.batch();

      // Track names in the sheet to detect deletions
      const namesInSheet = new Set();

      // Process each row
      for (const row of rows) {
        if (!row[nameIndex]) continue; // Skip rows without a name

        const name = row[nameIndex];
        const nameLower = name.toLowerCase();
        namesInSheet.add(nameLower);

        // Parse RSVP status from sheet if available
        let hasResponded = false;
        let response = null;
        let actualGuestCount = null;
        let additionalGuests = [];

        // Check if responded column exists and has a value
        if (respondedIndex !== -1 && row[respondedIndex]) {
          const respondedValue = row[respondedIndex].toString().toUpperCase();
          hasResponded = respondedValue === 'TRUE' || respondedValue === 'YES' || respondedValue === '1';
        }

        // Check if RSVP status column exists and has a value
        if (rsvpStatusIndex !== -1 && row[rsvpStatusIndex]) {
          const status = row[rsvpStatusIndex].toString().toLowerCase();
          if (status.includes('attend') || status === 'yes') {
            response = 'yes';
          } else if (status.includes('not') || status === 'no') {
            response = 'no';
          }
        }

        // Check if guest count column exists and has a value
        if (guestCountIndex !== -1 && row[guestCountIndex]) {
          const count = parseInt(row[guestCountIndex]);
          if (!isNaN(count)) {
            actualGuestCount = count;
          }
        }

        // Check if additional guests column exists and has a value
        if (additionalGuestsIndex !== -1 && row[additionalGuestsIndex]) {
          additionalGuests = row[additionalGuestsIndex].split(',').map(name => name.trim()).filter(name => name);
        }

        // Prepare guest data
        const guestData = {
          name: name,
          additionalNames: additionalNamesIndex !== -1 ? (row[additionalNamesIndex] || '') : '',
          address: {
            line1: addressLine1Index !== -1 ? (row[addressLine1Index] || '') : '',
            line2: addressLine2Index !== -1 ? (row[addressLine2Index] || '') : '',
            city: cityIndex !== -1 ? (row[cityIndex] || '') : '',
            state: stateIndex !== -1 ? (row[stateIndex] || '') : '',
            zip: zipIndex !== -1 ? (row[zipIndex] || '') : '',
            country: countryIndex !== -1 ? (row[countryIndex] || 'USA') : 'USA'
          },
          email: emailIndex !== -1 ? (row[emailIndex] || '') : '',
          phone: phoneIndex !== -1 ? (row[phoneIndex] || '') : '',
          category: categoryIndex !== -1 ? (row[categoryIndex] || 'Guest') : 'Guest',
          maxAllowedGuests: maxGuestsIndex !== -1 ? (parseInt(row[maxGuestsIndex]) || 4) : 4,
          hasResponded: hasResponded,
          response: response,
          actualGuestCount: actualGuestCount,
          additionalGuests: additionalGuests,
          lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Check if this guest already exists
        if (existingGuestMap.has(nameLower)) {
          // Update existing guest
          const existingGuest = existingGuestMap.get(nameLower);
          const docRef = guestListRef.doc(existingGuest.id);

          // Don't overwrite RSVP data if the guest has already responded in Firebase
          // but the sheet doesn't show it (to avoid data loss)
          if (existingGuest.hasResponded && !hasResponded) {
            // Keep the existing RSVP data
            guestData.hasResponded = existingGuest.hasResponded;
            guestData.response = existingGuest.response;
            guestData.actualGuestCount = existingGuest.actualGuestCount;
            guestData.additionalGuests = existingGuest.additionalGuests || [];
            guestData.submittedAt = existingGuest.submittedAt;
          } else if (hasResponded) {
            // Update the submittedAt timestamp if it's a new response
            if (!existingGuest.hasResponded) {
              guestData.submittedAt = admin.firestore.FieldValue.serverTimestamp();
            } else {
              // Keep the original submission timestamp
              guestData.submittedAt = existingGuest.submittedAt;
            }
          }

          // Preserve the original import timestamp
          guestData.importedAt = existingGuest.importedAt;

          batch.update(docRef, guestData);
          updatedCount++;
        } else {
          // Add new guest
          const docRef = guestListRef.doc();

          // Set submission timestamp if responded
          if (hasResponded) {
            guestData.submittedAt = admin.firestore.FieldValue.serverTimestamp();
          } else {
            guestData.submittedAt = null;
          }

          // Set import timestamp
          guestData.importedAt = admin.firestore.FieldValue.serverTimestamp();

          batch.set(docRef, guestData);
          addedCount++;
        }
      }

      // Check for guests that were removed from the sheet
      let removedCount = 0;
      existingGuestMap.forEach((guest, name) => {
        if (!namesInSheet.has(name)) {
          // This guest was removed from the sheet
          const docRef = guestListRef.doc(guest.id);
          batch.delete(docRef);
          removedCount++;
        }
      });

      // Commit all changes
      if (updatedCount > 0 || addedCount > 0 || removedCount > 0) {
        await batch.commit();
        console.log(`Sync completed: ${addedCount} added, ${updatedCount} updated, ${removedCount} removed`);
      } else {
        console.log('No changes detected');
      }

      return null;
    } catch (error) {
      console.error('Error syncing sheet changes:', error);
      return null;
    }
  });

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
