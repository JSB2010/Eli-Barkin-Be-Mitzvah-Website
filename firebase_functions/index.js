const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');

admin.initializeApp();

// Import guest list functions
const { importGuestList } = require('./import-guest-list');
const { syncGuestToSheet } = require('./sync-guest-list');
const { syncSheetChanges, manualSyncSheetChanges } = require('./sync-sheet-changes');
const { removeDuplicateGuests } = require('./remove-duplicates');

// Export guest list functions
exports.importGuestList = importGuestList;
exports.syncGuestToSheet = syncGuestToSheet;
exports.syncSheetChanges = syncSheetChanges;
exports.manualSyncSheetChanges = manualSyncSheetChanges;
exports.removeDuplicateGuests = removeDuplicateGuests;

// Configure the email transport using nodemailer
// For Gmail, you'll need to create an "App Password" in your Google Account
// See: https://support.google.com/accounts/answer/185833
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jacobsamuelbarkin@gmail.com', // Your Gmail address
    pass: 'phnv varx llta soll' // App password
  }
});

/**
 * Cloud Function that sends an email notification when a new RSVP is submitted
 */
exports.sendRsvpNotification = functions.firestore
  .document('sheetRsvps/{rsvpId}')
  .onCreate(async (snapshot, context) => {
    // Get the RSVP data
    const rsvpData = snapshot.data();
    const rsvpId = context.params.rsvpId;

    // Format the date
    const submittedDate = rsvpData.submittedAt ?
      new Date(rsvpData.submittedAt.toDate()).toLocaleString() :
      new Date().toLocaleString();

    // Format additional guests as a list if any
    let additionalGuestsText = '';
    if (rsvpData.additionalGuests && rsvpData.additionalGuests.length > 0) {
      additionalGuestsText = 'Additional Guests:\n' +
        rsvpData.additionalGuests.map(guest => `- ${guest}`).join('\n');
    }

    // Create email content
    const mailOptions = {
      from: 'Eli\'s Be Mitzvah RSVP <jacobsamuelbarkin@gmail.com>',
      to: 'jacobsamuelbarkin@gmail.com',
      subject: `New RSVP from ${rsvpData.name}`,
      text: `
New RSVP Submission (ID: ${rsvpId})

Name: ${rsvpData.name}
Email: ${rsvpData.email}
Phone: ${rsvpData.phone || 'Not provided'}
Attending: ${rsvpData.attending === 'yes' ? 'Yes' : 'No'}
Guest Count: ${rsvpData.guestCount || 1}
${additionalGuestsText}
Submitted At: ${submittedDate}

View all RSVPs on your dashboard: https://elibarkin.com/rsvp-dashboard.html
      `,
      html: `
<h2>New RSVP Submission</h2>
<p><strong>ID:</strong> ${rsvpId}</p>
<p><strong>Name:</strong> ${rsvpData.name}</p>
<p><strong>Email:</strong> ${rsvpData.email}</p>
<p><strong>Phone:</strong> ${rsvpData.phone || 'Not provided'}</p>
<p><strong>Attending:</strong> ${rsvpData.attending === 'yes' ? 'Yes' : 'No'}</p>
<p><strong>Guest Count:</strong> ${rsvpData.guestCount || 1}</p>
${rsvpData.additionalGuests && rsvpData.additionalGuests.length > 0 ?
  `<p><strong>Additional Guests:</strong></p>
  <ul>
    ${rsvpData.additionalGuests.map(guest => `<li>${guest}</li>`).join('')}
  </ul>` : ''}
<p><strong>Submitted At:</strong> ${submittedDate}</p>
<p>
  <a href="https://elibarkin.com/rsvp-dashboard.html"
     style="background-color: #2563eb; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">
    View All RSVPs on Dashboard
  </a>
</p>
      `
    };

    try {
      // Send the email
      await transporter.sendMail(mailOptions);
      console.log('Email notification sent successfully for RSVP:', rsvpId);
      return null;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return null;
    }
  });

/**
 * Cloud Function to add RSVP data to a Google Sheet and update guest list
 */
exports.addRsvpToSheet = functions.firestore
  .document('sheetRsvps/{rsvpId}')
  .onCreate(async (snapshot, context) => {
    try {
      // Get the RSVP data
      const rsvpData = snapshot.data();
      const rsvpId = context.params.rsvpId;

      // Format the date
      const submittedDate = rsvpData.submittedAt ?
        new Date(rsvpData.submittedAt.toDate()).toLocaleString() :
        new Date().toLocaleString();

      // Format additional guests as a comma-separated list
      const additionalGuestsText = rsvpData.additionalGuests && rsvpData.additionalGuests.length > 0 ?
        rsvpData.additionalGuests.join(', ') : '';

      // Get the service account credentials from environment
      const serviceAccountCredentials = functions.config().sheets.credentials;

      // Get the sheet ID from environment
      const sheetId = functions.config().sheets.sheet_id;

      // Set up Google Sheets authentication
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountCredentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const client = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: client });

      // Prepare the row data
      const values = [
        [
          rsvpId,
          rsvpData.name,
          rsvpData.email,
          rsvpData.phone || '',
          rsvpData.attending === 'yes' ? 'Yes' : 'No',
          rsvpData.guestCount || 1,
          additionalGuestsText,
          submittedDate
        ]
      ];

      // Append the data to the sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Sheet1!A2:H', // Assuming headers are in row 1
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: values
        }
      });

      console.log('RSVP data added to Google Sheet successfully:', rsvpId);

      // Now try to find and update the corresponding guest in the guest list
      try {
        const db = admin.firestore();
        const guestListRef = db.collection('guestList');

        // Search for a guest with the same name
        const guestQuery = await guestListRef.where('name', '==', rsvpData.name).get();

        if (!guestQuery.empty) {
          // Found a matching guest, update their RSVP status
          const guestDoc = guestQuery.docs[0];
          await guestDoc.ref.update({
            hasResponded: true,
            response: rsvpData.attending,
            actualGuestCount: rsvpData.guestCount || 1,
            additionalGuests: rsvpData.additionalGuests || [],
            email: rsvpData.email,
            phone: rsvpData.phone || '',
            submittedAt: rsvpData.submittedAt || admin.firestore.FieldValue.serverTimestamp()
          });

          console.log('Updated guest list entry for:', rsvpData.name);
        } else {
          console.log('No matching guest found in guest list for:', rsvpData.name);
        }
      } catch (guestError) {
        console.error('Error updating guest list:', guestError);
        // Continue even if guest list update fails
      }

      return null;
    } catch (error) {
      console.error('Error adding RSVP data to Google Sheet:', error);
      return null;
    }
  });

/**
 * Cloud Function to update the guest list sheet with RSVP information
 * This function finds the matching guest in the sheet by name and updates their row
 */
exports.updateGuestListSheet = functions.firestore
  .document('sheetRsvps/{rsvpId}')
  .onCreate(async (snapshot, context) => {
    try {
      // Get the RSVP data
      const rsvpData = snapshot.data();

      // Format the date
      const submittedDate = rsvpData.submittedAt ?
        new Date(rsvpData.submittedAt.toDate()).toLocaleString() :
        new Date().toLocaleString();

      // Format additional guests as a comma-separated list
      const additionalGuestsText = rsvpData.additionalGuests && rsvpData.additionalGuests.length > 0 ?
        rsvpData.additionalGuests.join(', ') : '';

      // Get the service account credentials from environment
      const serviceAccountCredentials = functions.config().sheets.credentials;

      // Use the guest list sheet ID (hardcoded to ensure it's correct)
      const guestListSheetId = "1e9ejByxnDLAMi_gJPiSQyiRbHougbzwLFeH6GNLjAnk";

      // Set up Google Sheets authentication
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountCredentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const client = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: client });

      // First, get the sheet data to find the matching guest
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: guestListSheetId,
        range: 'Sheet1!A:H', // Get all rows from columns A-H
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        console.log('No data found in the guest list sheet');
        return null;
      }

      // Find the row with the matching name
      let rowIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        // Check if the name in column A matches the RSVP name
        // Note: We're doing a case-insensitive comparison and trimming whitespace
        if (rows[i][0] && rows[i][0].trim().toLowerCase() === rsvpData.name.trim().toLowerCase()) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex === -1) {
        console.log('No matching guest found in the sheet for:', rsvpData.name);
        return null;
      }

      console.log(`Found matching guest at row ${rowIndex + 1} for: ${rsvpData.name}`);

      // Check if we need to add RSVP columns
      // First, get the sheet metadata to see what columns exist
      const sheetMetadata = await sheets.spreadsheets.get({
        spreadsheetId: guestListSheetId,
        ranges: ['Sheet1!1:1'], // Get the header row
        includeGridData: true,
      });

      const headerRow = sheetMetadata.data.sheets[0].data[0].rowData[0].values || [];
      const headerValues = headerRow.map(cell => cell.formattedValue || '');

      // Define the RSVP columns we want to add if they don't exist
      const rsvpColumns = [
        'RSVP Status', 'Email', 'Phone', 'Guest Count', 'Additional Guests', 'Submitted At'
      ];

      // Check if we need to add these columns
      let columnsToAdd = [];
      for (const column of rsvpColumns) {
        if (!headerValues.includes(column)) {
          columnsToAdd.push(column);
        }
      }

      // If we need to add columns, update the header row
      if (columnsToAdd.length > 0) {
        console.log('Adding RSVP columns to the sheet:', columnsToAdd);

        // Add the new columns to the header row
        await sheets.spreadsheets.values.update({
          spreadsheetId: guestListSheetId,
          range: `Sheet1!${String.fromCharCode(65 + headerValues.length)}1:${String.fromCharCode(65 + headerValues.length + columnsToAdd.length - 1)}1`,
          valueInputOption: 'RAW',
          resource: {
            values: [columnsToAdd]
          }
        });
      }

      // Now get the updated header row to find the column indices
      const updatedHeaderResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: guestListSheetId,
        range: 'Sheet1!1:1', // Get the header row
      });

      const updatedHeaderValues = updatedHeaderResponse.data.values[0] || [];

      // Find the column indices for each RSVP field
      const rsvpStatusIndex = updatedHeaderValues.indexOf('RSVP Status');
      const emailIndex = updatedHeaderValues.indexOf('Email');
      const phoneIndex = updatedHeaderValues.indexOf('Phone');
      const guestCountIndex = updatedHeaderValues.indexOf('Guest Count');
      const additionalGuestsIndex = updatedHeaderValues.indexOf('Additional Guests');
      const submittedAtIndex = updatedHeaderValues.indexOf('Submitted At');

      // Prepare the RSVP data to update
      const rsvpUpdateData = [];
      for (let i = 0; i < updatedHeaderValues.length; i++) {
        if (i === rsvpStatusIndex) {
          rsvpUpdateData.push(rsvpData.attending === 'yes' ? 'Attending' : 'Not Attending');
        } else if (i === emailIndex) {
          rsvpUpdateData.push(rsvpData.email || '');
        } else if (i === phoneIndex) {
          rsvpUpdateData.push(rsvpData.phone || '');
        } else if (i === guestCountIndex) {
          rsvpUpdateData.push(rsvpData.guestCount || 1);
        } else if (i === additionalGuestsIndex) {
          rsvpUpdateData.push(additionalGuestsText);
        } else if (i === submittedAtIndex) {
          rsvpUpdateData.push(submittedDate);
        } else if (i >= 8) { // Only add values for columns after the original 8 columns
          rsvpUpdateData.push(''); // Add empty values for other columns
        }
      }

      // Update the guest's row with the RSVP data
      if (rsvpUpdateData.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: guestListSheetId,
          range: `Sheet1!${String.fromCharCode(65 + 8)}${rowIndex + 1}:${String.fromCharCode(65 + 8 + rsvpUpdateData.length - 1)}${rowIndex + 1}`,
          valueInputOption: 'RAW',
          resource: {
            values: [rsvpUpdateData]
          }
        });

        console.log('Updated guest list sheet with RSVP data for:', rsvpData.name);
      }

      return null;
    } catch (error) {
      console.error('Error updating guest list sheet with RSVP data:', error);
      return null;
    }
  });
