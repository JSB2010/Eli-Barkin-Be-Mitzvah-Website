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

// Add a guest to the Google Sheet
exports.addGuestToSheet = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be logged in to add a guest'
        );
    }
    
    try {
        // Validate required fields
        if (!data.name) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Name is required'
            );
        }
        
        // Get authenticated sheets client
        const sheets = await getAuthenticatedClient();
        
        // Format address
        const address = data.address || {};
        
        // Prepare row data
        const rowData = [
            data.name || '',                                // Name Line 1 (First and Last Name)
            '',                                             // Name Line 2 (Additional Names)
            address.line1 || '',                            // Address Line 1
            address.line2 || '',                            // Address Line 2 (Apt, Suite)
            address.city || '',                             // City
            address.state || '',                            // State
            address.zip || '',                              // Zip
            address.country || '',                          // Country (non-US)
            'FALSE',                                        // Submitted (checkbox)
            '',                                             // Submission ID
            '',                                             // Name
            data.email || '',                               // Email
            data.phone || '',                               // Phone
            '',                                             // Attending
            '',                                             // Guest Count
            '',                                             // Additional Guests
            ''                                              // Submitted At
        ];
        
        // Append row to sheet
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A:Q', // Adjust range to include all columns
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [rowData]
            }
        });
        
        // Add guest to Firebase collection
        const guestRef = await admin.firestore().collection('guests').add({
            name: data.name,
            address: data.address || {},
            email: data.email || '',
            phone: data.phone || '',
            hasResponded: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Return success response
        return {
            success: true,
            message: 'Guest added successfully',
            guestId: guestRef.id,
            sheetResponse: response.data
        };
    } catch (error) {
        console.error('Error adding guest to sheet:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to add guest to sheet: ' + error.message
        );
    }
});
