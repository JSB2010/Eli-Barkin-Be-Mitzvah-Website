const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

/**
 * Cloud Function that syncs guest list changes from Firestore to Google Sheet
 */
exports.syncGuestToSheet = functions.firestore
  .document('guestList/{guestId}')
  .onWrite(async (change, context) => {
    try {
      // Get the guest data
      const guestData = change.after.exists ? change.after.data() : null;
      const guestId = context.params.guestId;
      
      // If the document was deleted, we don't need to update the sheet
      if (!guestData) {
        console.log('Guest document was deleted, no sheet update needed');
        return null;
      }
      
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
        console.error('No header row found in sheet');
        return null;
      }
      
      const headers = headerResponse.data.values[0];
      console.log('Headers found:', headers);
      
      // Find column indices
      let nameIndex = headers.indexOf('Name Line 1 (First and Last Name)');
      if (nameIndex === -1) nameIndex = headers.indexOf('Name Line 1');
      if (nameIndex === -1) nameIndex = headers.indexOf('Name');
      if (nameIndex === -1) nameIndex = 0; // Default to first column
      
      if (nameIndex === -1 || !headers[nameIndex]) {
        console.error('Name column not found in sheet');
        return null;
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
      const maxGuestsIndex = headers.indexOf('Max Guests');
      const respondedIndex = headers.indexOf('Responded');
      const rsvpStatusIndex = headers.indexOf('RSVP Status');
      const guestCountIndex = headers.indexOf('Guest Count');
      const additionalGuestsIndex = headers.indexOf('Additional Guests');
      
      // Get all data to find the row for this guest
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
      
      // Find the row for this guest by name
      let rowIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][nameIndex] === guestData.name) {
          rowIndex = i + 2; // +2 because we're skipping the header row and sheets are 1-indexed
          break;
        }
      }
      
      // Prepare the row data
      const rowData = Array(headers.length).fill(''); // Initialize with empty strings
      
      // Set the values for each column
      rowData[nameIndex] = guestData.name;
      if (additionalNamesIndex >= 0) rowData[additionalNamesIndex] = guestData.additionalNames || '';
      if (addressLine1Index >= 0) rowData[addressLine1Index] = guestData.address?.line1 || '';
      if (addressLine2Index >= 0) rowData[addressLine2Index] = guestData.address?.line2 || '';
      if (cityIndex >= 0) rowData[cityIndex] = guestData.address?.city || '';
      if (stateIndex >= 0) rowData[stateIndex] = guestData.address?.state || '';
      if (zipIndex >= 0) rowData[zipIndex] = guestData.address?.zip || '';
      if (countryIndex >= 0) rowData[countryIndex] = guestData.address?.country || '';
      if (emailIndex >= 0) rowData[emailIndex] = guestData.email || '';
      if (phoneIndex >= 0) rowData[phoneIndex] = guestData.phone || '';
      if (categoryIndex >= 0) rowData[categoryIndex] = guestData.category || '';
      if (maxGuestsIndex >= 0) rowData[maxGuestsIndex] = guestData.maxAllowedGuests || 1;
      if (respondedIndex >= 0) rowData[respondedIndex] = guestData.hasResponded ? 'Yes' : 'No';
      if (rsvpStatusIndex >= 0) rowData[rsvpStatusIndex] = guestData.response || '';
      if (guestCountIndex >= 0) rowData[guestCountIndex] = guestData.actualGuestCount || 0;
      if (additionalGuestsIndex >= 0) rowData[additionalGuestsIndex] = guestData.additionalGuests?.join(', ') || '';
      
      if (rowIndex > 0) {
        // Update existing row
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${sheetName}!A${rowIndex}:${String.fromCharCode(65 + headers.length - 1)}${rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [rowData]
          }
        });
        
        console.log(`Updated row ${rowIndex} for guest: ${guestData.name}`);
      } else {
        // Append new row
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: `${sheetName}!A:${String.fromCharCode(65 + headers.length - 1)}`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          resource: {
            values: [rowData]
          }
        });
        
        console.log(`Added new row for guest: ${guestData.name}`);
      }
      
      return null;
    } catch (error) {
      console.error('Error syncing guest to sheet:', error);
      return null;
    }
  });
