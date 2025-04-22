const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { google } = require('googleapis');

// Define secrets for Google Sheets
const sheetsCredentials = defineSecret('SHEETS_CREDENTIALS');
const sheetsSheetId = defineSecret('SHEETS_SHEET_ID');

/**
 * Cloud Function that updates the master Google Sheet with RSVP information
 * This function runs when an RSVP is created or updated in the sheetRsvps collection
 */
exports.updateMasterSheetV2 = onDocumentWritten({
  document: 'sheetRsvps/{rsvpId}',
  minInstances: 0,
  maxInstances: 10,
  memory: '256MiB',
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

    // Get the service account credentials from secrets
    const serviceAccountCredentials = JSON.parse(sheetsCredentials.value());

    // Get the sheet ID from secrets or use the specific one
    const masterSheetId = sheetsSheetId.value() || "1e9ejByxnDLAMi_gJPiSQyiRbHougbzwLFeH6GNLjAnk";

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
      range: `${sheetName}!A:Z`, // Get all data with a valid range
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
    const dataUpdateRequests = [];

    // Set checkbox for Submitted column (column I)
    if (submittedIndex >= 0) {
      // First update the cell value
      updateData[`${sheetName}!${String.fromCharCode(65 + submittedIndex)}${rowIndex}`] = [['TRUE']];

      // Then create a checkbox
      dataUpdateRequests.push({
        createDeveloperMetadata: {
          developerMetadata: {
            metadataId: Math.floor(Math.random() * 1000000),
            metadataKey: 'checkbox',
            metadataValue: 'TRUE',
            location: {
              dimensionRange: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: submittedIndex,
                endIndex: submittedIndex + 1
              }
            },
            visibility: 'DOCUMENT'
          }
        }
      });
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
      // First update the cell value
      updateData[`${sheetName}!${String.fromCharCode(65 + attendingIndex)}${rowIndex}`] =
        [[rsvpData.attending === 'yes' ? 'TRUE' : 'FALSE']];

      // Then create a checkbox
      dataUpdateRequests.push({
        createDeveloperMetadata: {
          developerMetadata: {
            metadataId: Math.floor(Math.random() * 1000000),
            metadataKey: 'checkbox',
            metadataValue: rsvpData.attending === 'yes' ? 'TRUE' : 'FALSE',
            location: {
              dimensionRange: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: attendingIndex,
                endIndex: attendingIndex + 1
              }
            },
            visibility: 'DOCUMENT'
          }
        }
      });
    }

    // Set Guest Count (column O)
    if (guestCountIndex >= 0) {
      updateData[`${sheetName}!${String.fromCharCode(65 + guestCountIndex)}${rowIndex}`] =
        [[rsvpData.guestCount || 1]];
    }

    // Set Adults (column P) - now includes names instead of just count
    if (adultsIndex >= 0) {
      // Check if we have adult guest names
      if (rsvpData.adultGuests && rsvpData.adultGuests.length > 0) {
        // Use the names of adult guests
        updateData[`${sheetName}!${String.fromCharCode(65 + adultsIndex)}${rowIndex}`] =
          [[rsvpData.adultGuests.join(', ')]];
      } else {
        // Fallback to just the count if no names are available
        updateData[`${sheetName}!${String.fromCharCode(65 + adultsIndex)}${rowIndex}`] =
          [[rsvpData.adultCount || (rsvpData.attending === 'yes' ? 1 : 0)]];
      }
    }

    // Set Children (column Q) - now includes names instead of just count
    if (childrenIndex >= 0) {
      // Check if we have child guest names
      if (rsvpData.childGuests && rsvpData.childGuests.length > 0) {
        // Use the names of child guests
        updateData[`${sheetName}!${String.fromCharCode(65 + childrenIndex)}${rowIndex}`] =
          [[rsvpData.childGuests.join(', ')]];
      } else {
        // Fallback to just the count if no names are available
        updateData[`${sheetName}!${String.fromCharCode(65 + childrenIndex)}${rowIndex}`] =
          [[rsvpData.childCount || 0]];
      }
    }

    // Set Submitted At (column R)
    if (submittedAtIndex >= 0) {
      updateData[`${sheetName}!${String.fromCharCode(65 + submittedAtIndex)}${rowIndex}`] = [[submittedDate]];
    }

    // Only update out-of-town event columns if this is an out-of-town guest
    if (isOutOfTown) {
      // Set Dinner at Linger checkbox (column S)
      if (dinnerAtLingerIndex >= 0) {
        // First update the cell value
        updateData[`${sheetName}!${String.fromCharCode(65 + dinnerAtLingerIndex)}${rowIndex}`] =
          [[rsvpData.fridayDinner === 'yes' ? 'TRUE' : 'FALSE']];

        // Then create a checkbox
        dataUpdateRequests.push({
          createDeveloperMetadata: {
            developerMetadata: {
              metadataId: Math.floor(Math.random() * 1000000),
              metadataKey: 'checkbox',
              metadataValue: rsvpData.fridayDinner === 'yes' ? 'TRUE' : 'FALSE',
              location: {
                dimensionRange: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: dinnerAtLingerIndex,
                  endIndex: dinnerAtLingerIndex + 1
                }
              },
              visibility: 'DOCUMENT'
            }
          }
        });
      }

      // Set Sunday Brunch checkbox (column T)
      if (sundayBrunchIndex >= 0) {
        // First update the cell value
        updateData[`${sheetName}!${String.fromCharCode(65 + sundayBrunchIndex)}${rowIndex}`] =
          [[rsvpData.sundayBrunch === 'yes' ? 'TRUE' : 'FALSE']];

        // Then create a checkbox
        dataUpdateRequests.push({
          createDeveloperMetadata: {
            developerMetadata: {
              metadataId: Math.floor(Math.random() * 1000000),
              metadataKey: 'checkbox',
              metadataValue: rsvpData.sundayBrunch === 'yes' ? 'TRUE' : 'FALSE',
              location: {
                dimensionRange: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: sundayBrunchIndex,
                  endIndex: sundayBrunchIndex + 1
                }
              },
              visibility: 'DOCUMENT'
            }
          }
        });
      }
    }

    // Batch update all cells
    if (Object.keys(updateData).length > 0) {
      // First update the cell values
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

      // Then apply the checkbox formatting if we have any
      if (dataUpdateRequests.length > 0) {
        try {
          // Get the sheet ID first
          const sheetsResponse = await sheets.spreadsheets.get({
            spreadsheetId: masterSheetId,
          });

          const sheetId = sheetsResponse.data.sheets.find(s => s.properties.title === sheetName)?.properties.sheetId || 0;

          // Update the sheet ID in all requests
          dataUpdateRequests.forEach(request => {
            if (request.createDeveloperMetadata?.developerMetadata?.location?.dimensionRange) {
              request.createDeveloperMetadata.developerMetadata.location.dimensionRange.sheetId = sheetId;
            }
          });

          // Apply the checkbox formatting
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: masterSheetId,
            resource: {
              requests: [
                // First create data validation for checkboxes
                ...dataUpdateRequests.map(request => {
                  const range = request.createDeveloperMetadata.developerMetadata.location.dimensionRange;
                  return {
                    setDataValidation: {
                      range: {
                        sheetId: range.sheetId,
                        startRowIndex: rowIndex - 1, // 0-indexed
                        endRowIndex: rowIndex,
                        startColumnIndex: range.startIndex,
                        endColumnIndex: range.endIndex
                      },
                      rule: {
                        condition: {
                          type: 'BOOLEAN',
                        },
                        inputMessage: 'Please select a value',
                        strict: true,
                        showCustomUi: true
                      }
                    }
                  };
                })
              ]
            }
          });

          console.log(`Applied checkbox formatting for guest: ${rsvpData.name} at row ${rowIndex}`);
        } catch (error) {
          console.error('Error applying checkbox formatting:', error);
          // Continue even if checkbox formatting fails
        }
      }

      console.log(`Updated master sheet for guest: ${rsvpData.name} at row ${rowIndex}`);

      // Log the update event
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
/**
 * Helper function to add delay between API calls to avoid quota limits
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

exports.manualUpdateMasterSheetV2 = onCall({
  minInstances: 0,
  maxInstances: 1,
  memory: '256MiB',
  timeoutSeconds: 300,
  region: 'us-central1',
  secrets: [sheetsCredentials, sheetsSheetId]
}, async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to update RSVPs'
    );
  }

  try {
    console.log('Starting manualUpdateMasterSheetV2 function');
    console.log('Auth user:', request.auth ? request.auth.uid : 'No auth');

    // Get the service account credentials from secrets
    console.log('Getting sheet credentials and ID');
    const sheetsCredentialsValue = sheetsCredentials.value();
    const sheetsSheetIdValue = sheetsSheetId.value();

    console.log('Sheet ID:', sheetsSheetIdValue);
    console.log('Credentials available:', !!sheetsCredentialsValue);

    // Get all submissions
    console.log('Fetching RSVP submissions from Firestore');
    const submissionsSnapshot = await admin.firestore().collection('sheetRsvps').get();
    const submissions = [];

    submissionsSnapshot.forEach(doc => {
      submissions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`Found ${submissions.length} RSVP submissions in Firestore`);

    if (submissions.length === 0) {
      return {
        success: true,
        message: 'No submissions to update',
        updatedCount: 0
      };
    }

    console.log(`Found ${submissions.length} RSVP submissions to process`);

    // Get the service account credentials from secrets
    let serviceAccountCredentials;
    let masterSheetId;
    let auth;
    let client;
    let sheets;

    try {
      serviceAccountCredentials = JSON.parse(sheetsCredentialsValue);
      console.log('Successfully parsed service account credentials');

      // Get the sheet ID from secrets or use the specific one
      // Trim the sheet ID to remove any whitespace or newlines
      masterSheetId = (sheetsSheetIdValue || "1e9ejByxnDLAMi_gJPiSQyiRbHougbzwLFeH6GNLjAnk").trim();
      // Remove any newline characters that might be in the sheet ID
      masterSheetId = masterSheetId.replace(/[\r\n]+/g, '');
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

    // Get all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: masterSheetId,
      range: `${sheetName}!A:Z`, // Get all data with a valid range
    });

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

    // Process each submission
    let updatedCount = 0;
    let skippedCount = 0;
    const updateResults = [];

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

        // Determine if this is an out-of-town guest
        let isOutOfTown = false;
        if (stateIndex >= 0 && rows[rowIndex-2][stateIndex]) {
          const state = rows[rowIndex-2][stateIndex].trim().toUpperCase();
          isOutOfTown = state !== 'CO' && state !== 'COLORADO';
        }

        // Prepare the update data for RSVP columns
        const updateData = {};

        // Set checkbox for Submitted column
        if (submittedIndex >= 0) {
          updateData[`${sheetName}!${String.fromCharCode(65 + submittedIndex)}${rowIndex}`] = [['TRUE']];
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
          updateData[`${sheetName}!${String.fromCharCode(65 + attendingIndex)}${rowIndex}`] =
            [[submission.attending === 'yes' ? 'TRUE' : 'FALSE']];
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

        // Only update out-of-town event columns if this is an out-of-town guest
        if (isOutOfTown) {
          // Set Dinner at Linger checkbox
          if (dinnerAtLingerIndex >= 0) {
            updateData[`${sheetName}!${String.fromCharCode(65 + dinnerAtLingerIndex)}${rowIndex}`] =
              [[submission.fridayDinner === 'yes' ? 'TRUE' : 'FALSE']];
          }

          // Set Sunday Brunch checkbox
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
});
