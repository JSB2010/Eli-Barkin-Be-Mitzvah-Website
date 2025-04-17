const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

// Google Sheets API configuration
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_ID = '1e9ejByxnDLAMi_gJPiSQyiRbHougbzwLFeH6GNLjAnk'; // Replace with your actual Sheet ID

// Function to get authenticated Google Sheets client
async function getAuthenticatedClient() {
    try {
        // Get service account credentials from environment
        const serviceAccountKey = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

        // Create JWT client
        const jwtClient = new google.auth.JWT(
            serviceAccountKey.client_email,
            null,
            serviceAccountKey.private_key,
            SCOPES
        );

        // Authenticate
        await jwtClient.authorize();

        // Return sheets client
        return google.sheets({ version: 'v4', auth: jwtClient });
    } catch (error) {
        console.error('Error getting authenticated client:', error);
        throw new Error('Failed to authenticate with Google Sheets API');
    }
}

// Update RSVP responses in Google Sheet
exports.updateRsvpInSheet = functions.firestore
    .document('sheetRsvps/{submissionId}')
    .onCreate(async (snapshot, context) => {
        try {
            // Get submission data
            const submission = snapshot.data();
            const submissionId = context.params.submissionId;

            // Validate submission data
            if (!submission || !submission.name) {
                console.error('Invalid submission data:', submission);
                return null;
            }

            // Get authenticated sheets client
            const sheets = await getAuthenticatedClient();

            // Get all rows from the sheet
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SHEET_ID,
                range: 'Sheet1!A:H', // Get the guest list columns
            });

            const rows = response.data.values || [];

            // Find the matching row by name
            let rowIndex = -1;
            for (let i = 1; i < rows.length; i++) { // Start from 1 to skip header row
                const rowName = rows[i][0]; // Name is in column A (index 0)
                if (rowName && rowName.toLowerCase() === submission.name.toLowerCase()) {
                    rowIndex = i + 1; // +1 because sheets API is 1-indexed
                    break;
                }
            }

            if (rowIndex === -1) {
                console.log('No matching guest found for:', submission.name);
                return null;
            }

            // Format guests
            const adultGuests = submission.adultGuests || [];
            const childGuests = submission.childGuests || [];
            const additionalGuests = submission.additionalGuests || [];

            // Format all guests for display
            let formattedGuests = '';

            // If we have adult/child guests, use those
            if (adultGuests.length > 0 || childGuests.length > 0) {
                const allGuests = [];

                // Skip the first adult (primary guest)
                if (adultGuests.length > 1) {
                    for (let i = 1; i < adultGuests.length; i++) {
                        allGuests.push(adultGuests[i]);
                    }
                }

                // Add all children
                childGuests.forEach(child => {
                    allGuests.push(child);
                });

                formattedGuests = allGuests.join(', ');
            } else {
                // Fall back to additional guests
                formattedGuests = additionalGuests.join(', ');
            }

            // Format submission date
            const submittedAt = submission.submittedAt ? new Date(submission.submittedAt.toDate()).toISOString() : new Date().toISOString();

            // Update the RSVP columns (I-Q)
            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: `Sheet1!I${rowIndex}:Q${rowIndex}`,
                valueInputOption: 'RAW',
                resource: {
                    values: [[
                        'TRUE',                                 // Submitted (checkbox)
                        submissionId,                           // Submission ID
                        submission.name || '',                  // Name
                        submission.email || '',                 // Email
                        submission.phone || '',                 // Phone
                        submission.attending || '',             // Attending
                        submission.guestCount || 1,             // Guest Count
                        formattedGuests,                        // Additional Guests
                        submittedAt                             // Submitted At
                    ]]
                }
            });

            console.log('Updated RSVP for:', submission.name, 'at row:', rowIndex);
            return { success: true };
        } catch (error) {
            console.error('Error updating RSVP in sheet:', error);
            return { success: false, error: error.message };
        }
    });

// Manual function to update all submissions in the sheet
exports.manualUpdateAllRsvps = functions.https.onCall(async (data, context) => {
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

        // Get authenticated sheets client
        const sheets = await getAuthenticatedClient();

        // Get all rows from the sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A:H', // Get the guest list columns
        });

        const rows = response.data.values || [];
        let updatedCount = 0;

        // Process each submission
        for (const submission of submissions) {
            // Find the matching row by name
            let rowIndex = -1;
            for (let i = 1; i < rows.length; i++) { // Start from 1 to skip header row
                const rowName = rows[i][0]; // Name is in column A (index 0)
                if (rowName && rowName.toLowerCase() === submission.name.toLowerCase()) {
                    rowIndex = i + 1; // +1 because sheets API is 1-indexed
                    break;
                }
            }

            if (rowIndex === -1) {
                console.log('No matching guest found for:', submission.name);
                continue;
            }

            // Format guests
            const adultGuests = submission.adultGuests || [];
            const childGuests = submission.childGuests || [];
            const additionalGuests = submission.additionalGuests || [];

            // Format all guests for display
            let formattedGuests = '';

            // If we have adult/child guests, use those
            if (adultGuests.length > 0 || childGuests.length > 0) {
                const allGuests = [];

                // Skip the first adult (primary guest)
                if (adultGuests.length > 1) {
                    for (let i = 1; i < adultGuests.length; i++) {
                        allGuests.push(adultGuests[i]);
                    }
                }

                // Add all children
                childGuests.forEach(child => {
                    allGuests.push(child);
                });

                formattedGuests = allGuests.join(', ');
            } else {
                // Fall back to additional guests
                formattedGuests = additionalGuests.join(', ');
            }

            // Format submission date
            const submittedAt = submission.submittedAt ?
                (typeof submission.submittedAt.toDate === 'function' ?
                    new Date(submission.submittedAt.toDate()).toISOString() :
                    new Date(submission.submittedAt).toISOString()) :
                new Date().toISOString();

            // Update the RSVP columns (I-Q)
            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: `Sheet1!I${rowIndex}:Q${rowIndex}`,
                valueInputOption: 'RAW',
                resource: {
                    values: [[
                        'TRUE',                                 // Submitted (checkbox)
                        submission.id,                          // Submission ID
                        submission.name || '',                  // Name
                        submission.email || '',                 // Email
                        submission.phone || '',                 // Phone
                        submission.attending || '',             // Attending
                        submission.guestCount || 1,             // Guest Count
                        formattedGuests,                        // Additional Guests
                        submittedAt                             // Submitted At
                    ]]
                }
            });

            updatedCount++;
            console.log('Updated RSVP for:', submission.name, 'at row:', rowIndex);
        }

        return {
            success: true,
            message: `Updated ${updatedCount} submissions in the sheet`,
            updatedCount: updatedCount
        };
    } catch (error) {
        console.error('Error updating RSVPs in sheet:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to update RSVPs in sheet: ' + error.message
        );
    }
});
