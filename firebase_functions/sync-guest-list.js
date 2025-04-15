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

      // Add new columns to the sheet if they don't exist
      // First, get the header row to see what columns exist
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Sheet1!1:1', // Get the header row
      });

      let headers = headerResponse.data.values[0] || [];

      // Check if we need to add RSVP columns
      const requiredColumns = ['Email', 'Phone', 'Responded', 'RSVP Status', 'Guest Count', 'Additional Guests', 'Submitted At'];
      let columnsToAdd = [];

      for (const column of requiredColumns) {
        if (!headers.includes(column)) {
          columnsToAdd.push(column);
        }
      }

      // Add missing columns if needed
      if (columnsToAdd.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          resource: {
            requests: [{
              appendDimension: {
                sheetId: 0, // Assuming first sheet
                dimension: 'COLUMNS',
                length: columnsToAdd.length
              }
            }]
          }
        });

        // Update the header row with new column names
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `Sheet1!${String.fromCharCode(65 + headers.length)}1:${String.fromCharCode(65 + headers.length + columnsToAdd.length - 1)}1`,
          valueInputOption: 'RAW',
          resource: {
            values: [columnsToAdd]
          }
        });

        // Refresh headers
        const updatedHeaderResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: 'Sheet1!1:1',
        });
        headers = updatedHeaderResponse.data.values[0] || [];
      }

      // Find column indices
      const emailIndex = headers.indexOf('Email');
      const phoneIndex = headers.indexOf('Phone');
      const respondedIndex = headers.indexOf('Responded');
      const rsvpStatusIndex = headers.indexOf('RSVP Status');
      const guestCountIndex = headers.indexOf('Guest Count');
      const additionalGuestsIndex = headers.indexOf('Additional Guests');
      const submittedAtIndex = headers.indexOf('Submitted At');

      // Prepare update data
      const updates = {};

      if (emailIndex >= 0) {
        updates[`Sheet1!${String.fromCharCode(65 + emailIndex)}${rowIndex}`] = [[guestData.email || '']];
      }

      if (phoneIndex >= 0) {
        updates[`Sheet1!${String.fromCharCode(65 + phoneIndex)}${rowIndex}`] = [[guestData.phone || '']];
      }

      if (respondedIndex >= 0) {
        updates[`Sheet1!${String.fromCharCode(65 + respondedIndex)}${rowIndex}`] = [[
          guestData.hasResponded ? 'TRUE' : 'FALSE'
        ]];
      }

      if (rsvpStatusIndex >= 0) {
        updates[`Sheet1!${String.fromCharCode(65 + rsvpStatusIndex)}${rowIndex}`] = [[
          guestData.response === 'yes' ? 'Attending' : (guestData.response === 'no' ? 'Not Attending' : '')
        ]];
      }

      if (guestCountIndex >= 0) {
        updates[`Sheet1!${String.fromCharCode(65 + guestCountIndex)}${rowIndex}`] = [[
          guestData.actualGuestCount || ''
        ]];
      }

      if (additionalGuestsIndex >= 0) {
        updates[`Sheet1!${String.fromCharCode(65 + additionalGuestsIndex)}${rowIndex}`] = [[
          additionalGuestsText
        ]];
      }

      if (submittedAtIndex >= 0) {
        updates[`Sheet1!${String.fromCharCode(65 + submittedAtIndex)}${rowIndex}`] = [[
          submittedDate
        ]];
      }

      // Apply all updates in a batch
      for (const range in updates) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: range,
          valueInputOption: 'RAW',
          resource: {
            values: updates[range]
          }
        });
      }

      console.log(`Successfully updated RSVP status for ${guestData.name} in Google Sheet`);
      return null;

    } catch (error) {
      console.error('Error syncing guest to sheet:', error);
      return null;
    }
  });
