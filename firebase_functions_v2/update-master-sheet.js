const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { google } = require('googleapis');

// Define secrets for Google Sheets
const sheetsCredentials = defineSecret('SHEETS_CREDENTIALS');
const sheetsSheetId = defineSecret('SHEETS_SHEET_ID');

// Helper function to sleep for a specified time
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cloud Function that updates the master sheet when an RSVP is created or updated
 */
exports.updateMasterSheetV2 = onDocumentWritten({
  document: 'sheetRsvps/{rsvpId}',
  minInstances: 0,
  maxInstances: 10,
  memory: '512MiB',
  timeoutSeconds: 120,
  region: 'us-central1',
  secrets: [sheetsCredentials, sheetsSheetId]
}, async (event) => {
  const change = event.data;
  if (!change) return null;
  const context = { params: { rsvpId: event.params.rsvpId } };

  try {
    // Get the RSVP data
    const rsvpData = change.after.exists ? change.after.data() : null;
    const rsvpId = context.params.rsvpId;
    const previousData = change.before.exists ? change.before.data() : null;
    const isUpdate = change.before.exists && change.after.exists;
    const isCreate = !change.before.exists && change.after.exists;
    const isDelete = change.before.exists && !change.after.exists;

    // If the document was deleted, we don't need to update the sheet
    if (isDelete || !rsvpData) {
      console.log('Document was deleted or no data, skipping sheet update');
      return null;
    }

    console.log(`Processing RSVP ${isUpdate ? 'update' : 'creation'} for ${rsvpData.name}`);

    // Get the service account credentials from secrets
    const sheetsCredentialsValue = sheetsCredentials.value();
    const sheetsSheetIdValue = sheetsSheetId.value();

    if (!sheetsCredentialsValue) {
      throw new Error('No Google Sheets credentials found');
    }

    if (!sheetsSheetIdValue) {
      throw new Error('No Google Sheets ID found');
    }

    // Create a single submission object for the update function
    const submission = {
      id: rsvpId,
      ...rsvpData
    };

    // Call the update function with a single submission
    return await updateMasterSheet([submission]);
  } catch (error) {
    console.error('Error updating master sheet:', error);
    return null;
  }
});

/**
 * Cloud Function that manually updates the master sheet for all RSVPs
 */
exports.manualUpdateMasterSheetV2 = onCall({
  minInstances: 0,
  maxInstances: 10,
  memory: '512MiB',
  timeoutSeconds: 300,
  region: 'us-central1',
  secrets: [sheetsCredentials, sheetsSheetId]
}, async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to update the master sheet'
    );
  }

  try {
    // Get all RSVP submissions from Firestore
    const snapshot = await admin.firestore().collection('sheetRsvps').get();

    if (snapshot.empty) {
      return {
        success: false,
        message: 'No RSVP submissions found'
      };
    }

    // Convert the snapshot to an array of submissions
    const submissions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Found ${submissions.length} RSVP submissions`);

    // Update the master sheet with all submissions
    return await updateMasterSheet(submissions);
  } catch (error) {
    console.error('Error updating master sheet:', error);
    throw new HttpsError(
      'internal',
      `Error updating master sheet: ${error.message}`
    );
  }
});

/**
 * Helper function to update the master sheet with RSVP submissions
 * @param {Array} submissions - Array of RSVP submissions
 * @returns {Object} - Result of the update operation
 */
async function updateMasterSheet(submissions) {
  try {
    console.log(`Updating master sheet with ${submissions.length} submissions`);

    // Get the service account credentials and sheet ID from secrets
    const sheetsCredentialsValue = sheetsCredentials.value();
    const sheetsSheetIdValue = sheetsSheetId.value();

    if (!sheetsCredentialsValue) {
      throw new Error('No Google Sheets credentials found');
    }

    if (!sheetsSheetIdValue) {
      throw new Error('No Google Sheets ID found');
    }

    // Parse the service account credentials
    let serviceAccountCredentials;
    let masterSheetId;
    let auth;
    let client;
    let sheets;

    try {
      console.log('Parsing service account credentials...');
      serviceAccountCredentials = JSON.parse(sheetsCredentialsValue);
      console.log('Successfully parsed service account credentials');
      console.log('Service account project_id:', serviceAccountCredentials.project_id);

      // Get the sheet ID from secrets or use the specific one
      // Trim the sheet ID to remove any whitespace or newlines
      masterSheetId = (sheetsSheetIdValue || "1e9ejByxnDLAMi_gJPiSQyiRbHougbzwLFeH6GNLjAnk").trim();
      // Remove any newline characters that might be in the sheet ID
      masterSheetId = masterSheetId.replace(/[\r\n]+/g, '');
      // Remove any URL-encoded newline characters (%0A)
      masterSheetId = masterSheetId.replace(/%0A/g, '');
      console.log('Sheet ID after cleaning:', masterSheetId);
      console.log('Using master sheet ID:', masterSheetId);

      // Set up Google Sheets authentication
      auth = new google.auth.GoogleAuth({
        credentials: serviceAccountCredentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      client = await auth.getClient();
      sheets = google.sheets({ version: 'v4', auth: client });
      console.log('Successfully set up Google Sheets API client');
    } catch (error) {
      console.error('Error setting up Google Sheets:', error);
      throw new HttpsError(
        'internal',
        `Error with Google Sheets setup: ${error.message}`
      );
    }

    // Get the sheet names
    console.log(`Getting spreadsheet with ID: ${masterSheetId}`);
    try {
      const sheetsResponse = await sheets.spreadsheets.get({
        spreadsheetId: masterSheetId,
      });
      console.log('Successfully retrieved spreadsheet');

      const sheetNames = sheetsResponse.data.sheets.map(sheet => sheet.properties.title);
      const sheetName = sheetNames[0] || 'Sheet1';
      console.log('Using sheet name:', sheetName);

      // Get the header row
      console.log(`Getting header row from ${sheetName}!1:1`);
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: masterSheetId,
        range: `${sheetName}!1:1`, // Get header row
      });
      console.log('Successfully retrieved header row');

      if (!headerResponse.data.values || headerResponse.data.values.length === 0) {
        throw new HttpsError(
          'internal',
          'No header row found in sheet'
        );
      }

      const headers = headerResponse.data.values[0];
      console.log('Headers found:', headers);

      // Find column indices for all required columns
      const nameIndex = headers.indexOf('Name Line 1 (First and Last Name)');
      if (nameIndex === -1) {
        throw new HttpsError(
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
      console.log('Column indices found:', {
        submittedIndex,
        submissionIdIndex,
        nameSubmittedIndex,
        emailIndex,
        phoneIndex,
        attendingIndex,
        guestCountIndex,
        adultsIndex,
        childrenIndex,
        submittedAtIndex,
        dinnerAtLingerIndex,
        sundayBrunchIndex,
        stateIndex
      });

      // Get all data from the sheet
      console.log(`Getting all data from ${sheetName}!A:Z`);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: masterSheetId,
        range: `${sheetName}!A:Z`, // Get all data with a valid range
      });
      console.log('Successfully retrieved all data');

      if (!response.data.values || response.data.values.length <= 1) {
        return {
          success: false,
          message: 'No data found in sheet or only header row exists'
        };
      }

      // Skip the header row
      const rows = response.data.values.slice(1);
      console.log(`Found ${rows.length} data rows in sheet`);

      // Create a map of names to row indices for faster lookup
      const nameToRowIndex = {};
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][nameIndex]) {
          const name = rows[i][nameIndex].trim().toLowerCase();
          nameToRowIndex[name] = i + 2; // +2 because we're skipping the header row and sheets are 1-indexed
        }
      }
      console.log(`Created name to row index map with ${Object.keys(nameToRowIndex).length} entries`);

      // Process each submission
      let updatedCount = 0;
      let skippedCount = 0;
      const updateResults = [];
      console.log(`Processing ${submissions.length} submissions`);

      for (let i = 0; i < submissions.length; i++) {
        const submission = submissions[i];
        try {
          const name = submission.name.trim().toLowerCase();
          const rowIndex = nameToRowIndex[name];

          if (!rowIndex) {
            console.log(`No matching row found for guest: ${submission.name}`);
            skippedCount++;
            updateResults.push({
              name: submission.name,
              status: 'skipped',
              reason: 'No matching row found in sheet'
            });
            continue;
          }

          console.log(`Processing submission for ${submission.name} at row ${rowIndex}`);

          // Format the date
          const submittedDate = submission.submittedAt ?
            new Date(submission.submittedAt.toDate()).toLocaleString() :
            new Date().toLocaleString();

          // Out-of-town guest functionality has been removed
          // We always set isOutOfTown to false
          let isOutOfTown = false;
          console.log(`Out-of-town guest functionality has been removed, isOutOfTown: ${isOutOfTown}`);

          // Prepare the update data for RSVP columns
          const updateData = {};

          // Set checkbox for Submitted column
          if (submittedIndex >= 0) {
            // Create a checkbox instead of just text
            await sheets.spreadsheets.batchUpdate({
              spreadsheetId: masterSheetId,
              resource: {
                requests: [{
                  repeatCell: {
                    range: {
                      sheetId: sheetsResponse.data.sheets[0].properties.sheetId,
                      startRowIndex: rowIndex - 1,
                      endRowIndex: rowIndex,
                      startColumnIndex: submittedIndex,
                      endColumnIndex: submittedIndex + 1
                    },
                    cell: {
                      userEnteredValue: {
                        boolValue: true
                      }
                    },
                    fields: 'userEnteredValue'
                  }
                }]
              }
            });
          }

          // Set Submission ID
          if (submissionIdIndex >= 0) {
            updateData[`${sheetName}!${String.fromCharCode(65 + submissionIdIndex)}${rowIndex}`] = [[submission.id]];
          }

          // Set Name
          if (nameSubmittedIndex >= 0) {
            updateData[`${sheetName}!${String.fromCharCode(65 + nameSubmittedIndex)}${rowIndex}`] = [[submission.name]];
          }

          // Set Email
          if (emailIndex >= 0) {
            updateData[`${sheetName}!${String.fromCharCode(65 + emailIndex)}${rowIndex}`] = [[submission.email || '']];
          }

          // Set Phone
          if (phoneIndex >= 0) {
            updateData[`${sheetName}!${String.fromCharCode(65 + phoneIndex)}${rowIndex}`] = [[submission.phone || '']];
          }

          // Set Attending checkbox
          if (attendingIndex >= 0) {
            // Create a checkbox instead of just text
            await sheets.spreadsheets.batchUpdate({
              spreadsheetId: masterSheetId,
              resource: {
                requests: [{
                  repeatCell: {
                    range: {
                      sheetId: sheetsResponse.data.sheets[0].properties.sheetId,
                      startRowIndex: rowIndex - 1,
                      endRowIndex: rowIndex,
                      startColumnIndex: attendingIndex,
                      endColumnIndex: attendingIndex + 1
                    },
                    cell: {
                      userEnteredValue: {
                        boolValue: submission.attending === 'yes'
                      }
                    },
                    fields: 'userEnteredValue'
                  }
                }]
              }
            });
          }

          // Set Guest Count
          if (guestCountIndex >= 0) {
            updateData[`${sheetName}!${String.fromCharCode(65 + guestCountIndex)}${rowIndex}`] =
              [[submission.guestCount || 1]];
          }

          // Set Adults - now includes names instead of just count
          if (adultsIndex >= 0) {
            // Check if we have adult guest names
            if (submission.adultGuests && submission.adultGuests.length > 0) {
              // Use the names of adult guests
              updateData[`${sheetName}!${String.fromCharCode(65 + adultsIndex)}${rowIndex}`] =
                [[submission.adultGuests.join(', ')]];
            } else {
              // Fallback to just the count if no names are available
              updateData[`${sheetName}!${String.fromCharCode(65 + adultsIndex)}${rowIndex}`] =
                [[submission.adultCount || (submission.attending === 'yes' ? 1 : 0)]];
            }
          }

          // Set Children - now includes names instead of just count
          if (childrenIndex >= 0) {
            // Check if we have child guest names
            if (submission.childGuests && submission.childGuests.length > 0) {
              // Use the names of child guests
              updateData[`${sheetName}!${String.fromCharCode(65 + childrenIndex)}${rowIndex}`] =
                [[submission.childGuests.join(', ')]];
            } else {
              // Fallback to just the count if no names are available
              updateData[`${sheetName}!${String.fromCharCode(65 + childrenIndex)}${rowIndex}`] =
                [[submission.childCount || 0]];
            }
          }

          // Set Submitted At
          if (submittedAtIndex >= 0) {
            updateData[`${sheetName}!${String.fromCharCode(65 + submittedAtIndex)}${rowIndex}`] = [[submittedDate]];
          }

          // Out-of-town guest functionality has been removed
          // We still set the values to 'no' for compatibility
          if (dinnerAtLingerIndex >= 0) {
            // Create a checkbox with value false
            await sheets.spreadsheets.batchUpdate({
              spreadsheetId: masterSheetId,
              resource: {
                requests: [{
                  repeatCell: {
                    range: {
                      sheetId: sheetsResponse.data.sheets[0].properties.sheetId,
                      startRowIndex: rowIndex - 1,
                      endRowIndex: rowIndex,
                      startColumnIndex: dinnerAtLingerIndex,
                      endColumnIndex: dinnerAtLingerIndex + 1
                    },
                    cell: {
                      userEnteredValue: {
                        boolValue: false
                      }
                    },
                    fields: 'userEnteredValue'
                  }
                }]
              }
            });
          }

          if (sundayBrunchIndex >= 0) {
            // Create a checkbox with value false
            await sheets.spreadsheets.batchUpdate({
              spreadsheetId: masterSheetId,
              resource: {
                requests: [{
                  repeatCell: {
                    range: {
                      sheetId: sheetsResponse.data.sheets[0].properties.sheetId,
                      startRowIndex: rowIndex - 1,
                      endRowIndex: rowIndex,
                      startColumnIndex: sundayBrunchIndex,
                      endColumnIndex: sundayBrunchIndex + 1
                    },
                    cell: {
                      userEnteredValue: {
                        boolValue: false
                      }
                    },
                    fields: 'userEnteredValue'
                  }
                }]
              }
            });
          }

          // Batch update all cells
          if (Object.keys(updateData).length > 0) {
            console.log(`Updating ${Object.keys(updateData).length} cells for ${submission.name}`);
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
            updatedCount++;

            updateResults.push({
              name: submission.name,
              status: 'updated',
              rowIndex: rowIndex
            });

            console.log(`Updated master sheet for guest: ${submission.name} at row ${rowIndex}`);

            // Add delay between API calls to avoid quota limits
            // Only add delay if not the last item
            if (i < submissions.length - 1) {
              console.log('Adding delay between API calls to avoid quota limits...');
              await sleep(1000); // 1 second delay between updates
            }
          }
        } catch (error) {
          console.error(`Error processing submission for ${submission.name}:`, error);
          updateResults.push({
            name: submission.name,
            status: 'error',
            error: error.message
          });

          // If we hit a quota limit, add a longer delay
          if (error.message && error.message.includes('Quota exceeded')) {
            console.log('Quota exceeded, adding longer delay...');
            await sleep(5000); // 5 second delay after quota error
          }
        }
      }

      return {
        success: true,
        message: `Updated ${updatedCount} guests, skipped ${skippedCount} guests`,
        updatedCount,
        skippedCount,
        results: updateResults
      };
    } catch (error) {
      console.error('Error updating master sheet:', error);
      throw new HttpsError(
        'internal',
        `Error updating master sheet: ${error.message}`
      );
    }
  } catch (error) {
    console.error('Error in updateMasterSheet:', error);
    throw new HttpsError(
      'internal',
      `Error updating master sheet: ${error.message}`
    );
  }
}
