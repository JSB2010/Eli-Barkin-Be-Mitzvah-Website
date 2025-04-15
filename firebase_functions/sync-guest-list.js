const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

// This function assumes admin.initializeApp() has been called in index.js

/**
 * Cloud Function to sync guest list RSVP status to Google Sheets
 * This is triggered whenever a guest's RSVP status is updated
 */
exports.syncGuestToSheet = functions.firestore
  .document('guestList/{guestId}')
  .onUpdate(async (change, context) => {
    try {
      // Get the updated guest data
      const guestData = change.after.data();
      const guestId = context.params.guestId;
      
      // Only sync if the RSVP status has changed
      const oldData = change.before.data();
      if (oldData.hasResponded === guestData.hasResponded &&
          oldData.response === guestData.response &&
          oldData.actualGuestCount === guestData.actualGuestCount) {
        console.log('No RSVP status change detected, skipping sync');
        return null;
      }

      // Get the sheet ID from environment
      const sheetId = functions.config().sheets.sheet_id;
      if (!sheetId) {
        console.error('Sheet ID not configured');
        return null;
      }

      // Get the service account credentials from environment
      const serviceAccountCredentials = functions.config().sheets.credentials;
      if (!serviceAccountCredentials) {
        console.error('Service account credentials not configured');
        return null;
      }

      // Set up Google Sheets authentication
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountCredentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const client = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: client });

      // First, find the row with this guest's name in the sheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Sheet1!A:A', // Assuming names are in column A
      });

      const rows = response.data.values || [];
      let rowIndex = -1;

      // Find the row with this guest's name
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === guestData.name) {
          rowIndex = i + 1; // Sheets API is 1-indexed
          break;
        }
      }

      if (rowIndex === -1) {
        console.error(`Guest ${guestData.name} not found in sheet`);
        return null;
      }

      // Format additional guests as a comma-separated list
      const additionalGuestsText = guestData.additionalGuests && guestData.additionalGuests.length > 0 ?
        guestData.additionalGuests.join(', ') : '';

      // Format the date
      const submittedDate = guestData.submittedAt ?
        new Date(guestData.submittedAt.toDate()).toLocaleString() : '';

      // Update the RSVP status columns in the sheet
      // Assuming columns: Name, Email, Phone, Category, Max Guests, Has Responded, Response, Guest Count, Additional Guests, Submitted At
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `Sheet1!F${rowIndex}:J${rowIndex}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[
            guestData.hasResponded ? 'Yes' : 'No',
            guestData.response === 'yes' ? 'Attending' : (guestData.response === 'no' ? 'Not Attending' : ''),
            guestData.actualGuestCount || '',
            additionalGuestsText,
            submittedDate
          ]]
        }
      });

      console.log(`Successfully updated RSVP status for ${guestData.name} in Google Sheet`);
      return null;

    } catch (error) {
      console.error('Error syncing guest to sheet:', error);
      return null;
    }
  });
