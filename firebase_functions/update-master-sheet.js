const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

/**
 * Cloud Function that updates the master Google Sheet with RSVP information
 * This function runs when an RSVP is created or updated in the sheetRsvps collection
 */
exports.updateMasterSheet = functions.firestore
  .document('sheetRsvps/{rsvpId}')
  .onWrite(async (change, context) => {
    try {
      // Get the RSVP data
      const rsvpData = change.after.exists ? change.after.data() : null;
      const rsvpId = context.params.rsvpId;
      const previousData = change.before.exists ? change.before.data() : null;
      const isUpdate = change.before.exists && change.after.exists;
      const isCreate = !change.before.exists && change.after.exists;
      const isDelete = change.before.exists && !change.after.exists;

      // If the document was deleted, we don't need to update the sheet
      if (!rsvpData) {
        console.log('RSVP document was deleted, no sheet update needed');

        // Log the deletion event
        if (isDelete && previousData) {
          await admin.firestore().collection('rsvpUpdateLogs').add({
            action: 'delete',
            rsvpId: rsvpId,
            name: previousData.name,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            previousData: previousData
          });
        }

        return null;
      }

      console.log('Processing RSVP update for:', rsvpData.name);

      // Get the service account credentials from environment
      const serviceAccountCredentials = functions.config().sheets.credentials;

      // Use the master sheet ID (hardcoded to ensure it's correct)
      const masterSheetId = "1e9ejByxnDLAMi_gJPiSQyiRbHougbzwLFeH6GNLjAnk";

      // Set up Google Sheets authentication
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountCredentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const client = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: client });

      // Get the sheet names
      const sheetsResponse = await sheets.spreadsheets.get({
        spreadsheetId: masterSheetId,
      });

      const sheetNames = sheetsResponse.data.sheets.map(sheet => sheet.properties.title);
      console.log('Available sheets:', sheetNames);

      // Use the first sheet by default
      const sheetName = sheetNames[0] || 'Sheet1';
      console.log('Using sheet name:', sheetName);

      // Get the header row
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: masterSheetId,
        range: `${sheetName}!1:1`, // Get header row
      });

      if (!headerResponse.data.values || headerResponse.data.values.length === 0) {
        console.error('No header row found in sheet');
        return null;
      }

      const headers = headerResponse.data.values[0];
      console.log('Headers found:', headers);

      // Find column indices for all required columns
      const nameIndex = headers.indexOf('Name Line 1 (First and Last Name)');
      if (nameIndex === -1) {
        console.error('Name column not found in sheet');
        return null;
      }

      // Find indices for RSVP-related columns
      const submittedIndex = headers.indexOf('Submitted');
      const submissionIdIndex = headers.indexOf('Submission ID');
      const nameSubmittedIndex = headers.indexOf('Name');
      const emailIndex = headers.indexOf('Email');
      const phoneIndex = headers.indexOf('Phone');
      const attendingIndex = headers.indexOf('Attending');
      const guestCountIndex = headers.indexOf('Guest Count');
      const adultsIndex = headers.indexOf('Adults');
      const childrenIndex = headers.indexOf('Children');
      const submittedAtIndex = headers.indexOf('Submitted At');
      const dinnerAtLingerIndex = headers.indexOf('Dinner at Linger');
      const sundayBrunchIndex = headers.indexOf('Sunday Brunch');
      const stateIndex = headers.indexOf('State');

      // Get all data to find the row for this guest
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: masterSheetId,
        range: sheetName, // Get all data
      });

      if (!response.data.values || response.data.values.length <= 1) {
        console.log('No data found in sheet or only header row exists');
        return null;
      }

      // Skip the header row
      const rows = response.data.values.slice(1);
      console.log(`Found ${rows.length} data rows in sheet`);

      // Find the row for this guest by name (case-insensitive)
      let rowIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][nameIndex] &&
            rows[i][nameIndex].trim().toLowerCase() === rsvpData.name.trim().toLowerCase()) {
          rowIndex = i + 2; // +2 because we're skipping the header row and sheets are 1-indexed
          break;
        }
      }

      if (rowIndex === -1) {
        console.log(`No matching row found for guest: ${rsvpData.name}`);
        return null;
      }

      console.log(`Found matching row ${rowIndex} for guest: ${rsvpData.name}`);

      // Format the date
      const submittedDate = rsvpData.submittedAt ?
        new Date(rsvpData.submittedAt.toDate()).toLocaleString() :
        new Date().toLocaleString();

      // Format additional guests as a comma-separated list
      const additionalGuestsText = rsvpData.additionalGuests && rsvpData.additionalGuests.length > 0 ?
        rsvpData.additionalGuests.join(', ') : '';

      // Determine if this is an out-of-town guest
      let isOutOfTown = false;
      if (stateIndex >= 0 && rows[rowIndex-2][stateIndex]) {
        const state = rows[rowIndex-2][stateIndex].trim().toUpperCase();
        isOutOfTown = state !== 'CO' && state !== 'COLORADO';
        console.log(`Guest state: ${state}, isOutOfTown: ${isOutOfTown}`);
      }

      // Prepare the update data for RSVP columns
      const updateData = {};

      // Set checkbox for Submitted column (column I)
      if (submittedIndex >= 0) {
        updateData[`${sheetName}!${String.fromCharCode(65 + submittedIndex)}${rowIndex}`] = [['TRUE']];
      }

      // Set Submission ID (column J)
      if (submissionIdIndex >= 0) {
        updateData[`${sheetName}!${String.fromCharCode(65 + submissionIdIndex)}${rowIndex}`] = [[rsvpId]];
      }

      // Set Name (column K)
      if (nameSubmittedIndex >= 0) {
        updateData[`${sheetName}!${String.fromCharCode(65 + nameSubmittedIndex)}${rowIndex}`] = [[rsvpData.name]];
      }

      // Set Email (column L)
      if (emailIndex >= 0) {
        updateData[`${sheetName}!${String.fromCharCode(65 + emailIndex)}${rowIndex}`] = [[rsvpData.email || '']];
      }

      // Set Phone (column M)
      if (phoneIndex >= 0) {
        updateData[`${sheetName}!${String.fromCharCode(65 + phoneIndex)}${rowIndex}`] = [[rsvpData.phone || '']];
      }

      // Set Attending checkbox (column N)
      if (attendingIndex >= 0) {
        updateData[`${sheetName}!${String.fromCharCode(65 + attendingIndex)}${rowIndex}`] =
          [[rsvpData.attending === 'yes' ? 'TRUE' : 'FALSE']];
      }

      // Set Guest Count (column O)
      if (guestCountIndex >= 0) {
        updateData[`${sheetName}!${String.fromCharCode(65 + guestCountIndex)}${rowIndex}`] =
          [[rsvpData.guestCount || 1]];
      }

      // Set Adults (column P)
      if (adultsIndex >= 0) {
        updateData[`${sheetName}!${String.fromCharCode(65 + adultsIndex)}${rowIndex}`] =
          [[rsvpData.adultCount || (rsvpData.attending === 'yes' ? 1 : 0)]];
      }

      // Set Children (column Q)
      if (childrenIndex >= 0) {
        updateData[`${sheetName}!${String.fromCharCode(65 + childrenIndex)}${rowIndex}`] =
          [[rsvpData.childCount || 0]];
      }

      // Set Submitted At (column R)
      if (submittedAtIndex >= 0) {
        updateData[`${sheetName}!${String.fromCharCode(65 + submittedAtIndex)}${rowIndex}`] = [[submittedDate]];
      }

      // Only update out-of-town event columns if this is an out-of-town guest
      if (isOutOfTown) {
        // Set Dinner at Linger checkbox (column S)
        if (dinnerAtLingerIndex >= 0) {
          updateData[`${sheetName}!${String.fromCharCode(65 + dinnerAtLingerIndex)}${rowIndex}`] =
            [[rsvpData.fridayDinner === 'yes' ? 'TRUE' : 'FALSE']];
        }

        // Set Sunday Brunch checkbox (column T)
        if (sundayBrunchIndex >= 0) {
          updateData[`${sheetName}!${String.fromCharCode(65 + sundayBrunchIndex)}${rowIndex}`] =
            [[rsvpData.sundayBrunch === 'yes' ? 'TRUE' : 'FALSE']];
        }
      }

      // Batch update all cells
      if (Object.keys(updateData).length > 0) {
        const batchUpdateRequest = {
          spreadsheetId: masterSheetId,
          resource: {
            valueInputOption: 'USER_ENTERED',
            data: Object.keys(updateData).map(range => ({
              range,
              values: updateData[range]
            }))
          }
        };

        await sheets.spreadsheets.values.batchUpdate(batchUpdateRequest);
        console.log(`Updated master sheet for guest: ${rsvpData.name} at row ${rowIndex}`);

        // Log the update event
        const isUpdate = change.before.exists && change.after.exists;
        await admin.firestore().collection('rsvpUpdateLogs').add({
          action: isUpdate ? 'update' : 'create',
          rsvpId: rsvpId,
          name: rsvpData.name,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          data: rsvpData,
          previousData: previousData,
          sheetRow: rowIndex,
          isOutOfTown: isOutOfTown
        });
      }

      return null;
    } catch (error) {
      console.error('Error updating master sheet with RSVP data:', error);
      return null;
    }
  });

/**
 * Manual function to update all existing RSVPs in the master sheet
 */
exports.manualUpdateMasterSheet = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to update RSVPs'
    );
  }

  try {
    // Get all submissions
    const submissionsSnapshot = await admin.firestore().collection('sheetRsvps').get();
    const submissions = [];

    submissionsSnapshot.forEach(doc => {
      submissions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    if (submissions.length === 0) {
      return {
        success: true,
        message: 'No submissions to update',
        updatedCount: 0
      };
    }

    console.log(`Found ${submissions.length} RSVP submissions to process`);

    // Get the service account credentials from environment
    const serviceAccountCredentials = functions.config().sheets.credentials;

    // Use the master sheet ID (hardcoded to ensure it's correct)
    const masterSheetId = "1e9ejByxnDLAMi_gJPiSQyiRbHougbzwLFeH6GNLjAnk";

    // Set up Google Sheets authentication
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Get the sheet names
    const sheetsResponse = await sheets.spreadsheets.get({
      spreadsheetId: masterSheetId,
    });

    const sheetNames = sheetsResponse.data.sheets.map(sheet => sheet.properties.title);
    const sheetName = sheetNames[0] || 'Sheet1';

    // Get the header row
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: masterSheetId,
      range: `${sheetName}!1:1`, // Get header row
    });

    if (!headerResponse.data.values || headerResponse.data.values.length === 0) {
      throw new functions.https.HttpsError(
        'internal',
        'No header row found in sheet'
      );
    }

    const headers = headerResponse.data.values[0];

    // Find column indices for all required columns
    const nameIndex = headers.indexOf('Name Line 1 (First and Last Name)');
    if (nameIndex === -1) {
      throw new functions.https.HttpsError(
        'internal',
        'Name column not found in sheet'
      );
    }

    // Find indices for RSVP-related columns
    const submittedIndex = headers.indexOf('Submitted');
    const submissionIdIndex = headers.indexOf('Submission ID');
    const nameSubmittedIndex = headers.indexOf('Name');
    const emailIndex = headers.indexOf('Email');
    const phoneIndex = headers.indexOf('Phone');
    const attendingIndex = headers.indexOf('Attending');
    const guestCountIndex = headers.indexOf('Guest Count');
    const adultsIndex = headers.indexOf('Adults');
    const childrenIndex = headers.indexOf('Children');
    const submittedAtIndex = headers.indexOf('Submitted At');
    const dinnerAtLingerIndex = headers.indexOf('Dinner at Linger');
    const sundayBrunchIndex = headers.indexOf('Sunday Brunch');
    const stateIndex = headers.indexOf('State');

    // Get all data to find the rows for each guest
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterSheetId,
      range: sheetName, // Get all data
    });

    if (!response.data.values || response.data.values.length <= 1) {
      throw new functions.https.HttpsError(
        'internal',
        'No data found in sheet or only header row exists'
      );
    }

    // Skip the header row
    const rows = response.data.values.slice(1);
    console.log(`Found ${rows.length} data rows in sheet`);

    let updatedCount = 0;
    const errors = [];

    // Process each submission
    for (const submission of submissions) {
      try {
        // Find the row for this guest by name (case-insensitive)
        let rowIndex = -1;
        for (let i = 0; i < rows.length; i++) {
          if (rows[i][nameIndex] &&
              rows[i][nameIndex].trim().toLowerCase() === submission.name.trim().toLowerCase()) {
            rowIndex = i + 2; // +2 because we're skipping the header row and sheets are 1-indexed
            break;
          }
        }

        if (rowIndex === -1) {
          console.log(`No matching row found for guest: ${submission.name}`);
          errors.push(`No matching row found for guest: ${submission.name}`);
          continue;
        }

        console.log(`Found matching row ${rowIndex} for guest: ${submission.name}`);

        // Format the date
        const submittedDate = submission.submittedAt ?
          new Date(submission.submittedAt.toDate()).toLocaleString() :
          new Date().toLocaleString();

        // Format additional guests as a comma-separated list
        const additionalGuestsText = submission.additionalGuests && submission.additionalGuests.length > 0 ?
          submission.additionalGuests.join(', ') : '';

        // Determine if this is an out-of-town guest
        let isOutOfTown = false;
        if (stateIndex >= 0 && rows[rowIndex-2][stateIndex]) {
          const state = rows[rowIndex-2][stateIndex].trim().toUpperCase();
          isOutOfTown = state !== 'CO' && state !== 'COLORADO';
          console.log(`Guest state: ${state}, isOutOfTown: ${isOutOfTown}`);
        }

        // Prepare the update data for RSVP columns
        const updateData = {};

        // Set checkbox for Submitted column (column I)
        if (submittedIndex >= 0) {
          updateData[`${sheetName}!${String.fromCharCode(65 + submittedIndex)}${rowIndex}`] = [['TRUE']];
        }

        // Set Submission ID (column J)
        if (submissionIdIndex >= 0) {
          updateData[`${sheetName}!${String.fromCharCode(65 + submissionIdIndex)}${rowIndex}`] = [[submission.id]];
        }

        // Set Name (column K)
        if (nameSubmittedIndex >= 0) {
          updateData[`${sheetName}!${String.fromCharCode(65 + nameSubmittedIndex)}${rowIndex}`] = [[submission.name]];
        }

        // Set Email (column L)
        if (emailIndex >= 0) {
          updateData[`${sheetName}!${String.fromCharCode(65 + emailIndex)}${rowIndex}`] = [[submission.email || '']];
        }

        // Set Phone (column M)
        if (phoneIndex >= 0) {
          updateData[`${sheetName}!${String.fromCharCode(65 + phoneIndex)}${rowIndex}`] = [[submission.phone || '']];
        }

        // Set Attending checkbox (column N)
        if (attendingIndex >= 0) {
          updateData[`${sheetName}!${String.fromCharCode(65 + attendingIndex)}${rowIndex}`] =
            [[submission.attending === 'yes' ? 'TRUE' : 'FALSE']];
        }

        // Set Guest Count (column O)
        if (guestCountIndex >= 0) {
          updateData[`${sheetName}!${String.fromCharCode(65 + guestCountIndex)}${rowIndex}`] =
            [[submission.guestCount || 1]];
        }

        // Set Adults (column P)
        if (adultsIndex >= 0) {
          updateData[`${sheetName}!${String.fromCharCode(65 + adultsIndex)}${rowIndex}`] =
            [[submission.adultCount || (submission.attending === 'yes' ? 1 : 0)]];
        }

        // Set Children (column Q)
        if (childrenIndex >= 0) {
          updateData[`${sheetName}!${String.fromCharCode(65 + childrenIndex)}${rowIndex}`] =
            [[submission.childCount || 0]];
        }

        // Set Submitted At (column R)
        if (submittedAtIndex >= 0) {
          updateData[`${sheetName}!${String.fromCharCode(65 + submittedAtIndex)}${rowIndex}`] = [[submittedDate]];
        }

        // Only update out-of-town event columns if this is an out-of-town guest
        if (isOutOfTown) {
          // Set Dinner at Linger checkbox (column S)
          if (dinnerAtLingerIndex >= 0) {
            updateData[`${sheetName}!${String.fromCharCode(65 + dinnerAtLingerIndex)}${rowIndex}`] =
              [[submission.fridayDinner === 'yes' ? 'TRUE' : 'FALSE']];
          }

          // Set Sunday Brunch checkbox (column T)
          if (sundayBrunchIndex >= 0) {
            updateData[`${sheetName}!${String.fromCharCode(65 + sundayBrunchIndex)}${rowIndex}`] =
              [[submission.sundayBrunch === 'yes' ? 'TRUE' : 'FALSE']];
          }
        }

        // Batch update all cells
        if (Object.keys(updateData).length > 0) {
          const batchUpdateRequest = {
            spreadsheetId: masterSheetId,
            resource: {
              valueInputOption: 'USER_ENTERED',
              data: Object.keys(updateData).map(range => ({
                range,
                values: updateData[range]
              }))
            }
          };

          await sheets.spreadsheets.values.batchUpdate(batchUpdateRequest);
          console.log(`Updated master sheet for guest: ${submission.name} at row ${rowIndex}`);

          // Log the update event
          await admin.firestore().collection('rsvpUpdateLogs').add({
            action: 'manual-update',
            rsvpId: submission.id,
            name: submission.name,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            data: submission,
            sheetRow: rowIndex,
            isOutOfTown: isOutOfTown,
            updatedBy: context.auth.uid
          });

          updatedCount++;
        }
      } catch (error) {
        console.error(`Error updating master sheet for ${submission.name}:`, error);
        errors.push(`Error updating ${submission.name}: ${error.message}`);
      }
    }

    return {
      success: true,
      message: `Updated ${updatedCount} of ${submissions.length} RSVPs in the master sheet`,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Error in manualUpdateMasterSheet:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Error updating master sheet: ${error.message}`
    );
  }
});
