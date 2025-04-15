const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

// This function assumes admin.initializeApp() has been called in index.js

/**
 * Cloud Function to sync Google Sheet changes to Firebase
 * This can be scheduled to run periodically
 */
exports.syncSheetToFirebase = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    try {
      console.log('Starting Google Sheet to Firebase sync');
      
      // Use the specific Google Sheet ID
      const sheetId = '1e9ejByxnDLAMi_gJPiSQyiRbHougbzwLFeH6GNLjAnk';

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

      // Get the sheet data
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Sheet1!A2:Z', // Get all data, skipping header row
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        console.log('No data found in sheet');
        return null;
      }

      // Get the header row to map column indices
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Sheet1!1:1',
      });
      
      const headers = headerResponse.data.values[0] || [];
      
      // Find column indices
      const nameIndex = 0; // Name Line 1 is always the first column
      const additionalNamesIndex = headers.indexOf('Name Line 2 (Additional Names)');
      const addressLine1Index = headers.indexOf('Address Line 1');
      const addressLine2Index = headers.indexOf('Address Line 2 (Apt, Suite)');
      const cityIndex = headers.indexOf('City');
      const stateIndex = headers.indexOf('State');
      const zipIndex = headers.indexOf('Zip');
      const countryIndex = headers.indexOf('Country (non-US)');
      const emailIndex = headers.indexOf('Email');
      const phoneIndex = headers.indexOf('Phone');
      const respondedIndex = headers.indexOf('Responded');
      const rsvpStatusIndex = headers.indexOf('RSVP Status');
      const guestCountIndex = headers.indexOf('Guest Count');
      const additionalGuestsIndex = headers.indexOf('Additional Guests');
      
      // Get Firestore reference
      const db = admin.firestore();
      const guestListRef = db.collection('guestList');
      
      // Get all existing guests from Firestore
      const existingGuests = await guestListRef.get();
      const existingGuestsMap = new Map();
      
      existingGuests.forEach(doc => {
        const guest = doc.data();
        existingGuestsMap.set(guest.name, {
          id: doc.id,
          ...guest
        });
      });
      
      // Process each row from the sheet
      const batch = db.batch();
      let addedCount = 0;
      let updatedCount = 0;
      let removedCount = 0;
      const processedNames = new Set();
      
      // Track which guests from Firestore are found in the sheet
      const foundInSheet = new Set();
      
      for (const row of rows) {
        if (!row[nameIndex]) continue; // Skip rows without a name
        
        const name = row[nameIndex].trim();
        processedNames.add(name);
        
        // Check if this guest already exists in Firestore
        const existingGuest = existingGuestsMap.get(name);
        
        // Prepare guest data from sheet
        const guestData = {
          name: name,
          additionalNames: row[additionalNamesIndex] || '',
          address: {
            line1: row[addressLine1Index] || '',
            line2: row[addressLine2Index] || '',
            city: row[cityIndex] || '',
            state: row[stateIndex] || '',
            zip: row[zipIndex] || '',
            country: row[countryIndex] || 'USA'
          },
          email: row[emailIndex] || '',
          phone: row[phoneIndex] || '',
          category: 'Guest', // Default category
          maxAllowedGuests: 4, // Default max guests
          importedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Check if the guest has responded
        if (respondedIndex >= 0 && row[respondedIndex]) {
          const responded = row[respondedIndex].toUpperCase() === 'TRUE';
          guestData.hasResponded = responded;
          
          if (responded) {
            // Get RSVP status
            if (rsvpStatusIndex >= 0 && row[rsvpStatusIndex]) {
              const status = row[rsvpStatusIndex].toLowerCase();
              guestData.response = status.includes('attend') ? 'yes' : 'no';
            }
            
            // Get guest count
            if (guestCountIndex >= 0 && row[guestCountIndex]) {
              guestData.actualGuestCount = parseInt(row[guestCountIndex], 10) || 1;
            }
            
            // Get additional guests
            if (additionalGuestsIndex >= 0 && row[additionalGuestsIndex]) {
              guestData.additionalGuests = row[additionalGuestsIndex].split(',').map(g => g.trim());
            }
          }
        } else {
          guestData.hasResponded = false;
          guestData.response = null;
          guestData.actualGuestCount = null;
          guestData.additionalGuests = [];
        }
        
        if (existingGuest) {
          // Mark this guest as found in the sheet
          foundInSheet.add(name);
          
          // Update existing guest
          const docRef = guestListRef.doc(existingGuest.id);
          
          // Preserve existing fields that aren't in the sheet
          const updatedData = {
            ...guestData,
            // Don't overwrite these fields if they exist
            submittedAt: existingGuest.submittedAt || null
          };
          
          batch.update(docRef, updatedData);
          updatedCount++;
        } else {
          // Add new guest
          const docRef = guestListRef.doc();
          batch.set(docRef, guestData);
          addedCount++;
        }
      }
      
      // Find guests in Firestore that are not in the sheet anymore
      for (const [name, guest] of existingGuestsMap.entries()) {
        if (!foundInSheet.has(name)) {
          // Guest was removed from the sheet, delete from Firestore
          const docRef = guestListRef.doc(guest.id);
          batch.delete(docRef);
          removedCount++;
        }
      }
      
      // Commit the batch
      await batch.commit();
      
      console.log(`Sync completed: Added ${addedCount}, Updated ${updatedCount}, Removed ${removedCount} guests`);
      return null;
    } catch (error) {
      console.error('Error syncing sheet to Firebase:', error);
      return null;
    }
  });

/**
 * HTTP endpoint to manually trigger the sync
 */
exports.manualSyncSheetToFirebase = functions.https.onRequest(async (req, res) => {
  try {
    // Call the sync function
    await exports.syncSheetToFirebase.run();
    
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
