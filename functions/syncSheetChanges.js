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

// Sync changes from Google Sheet to Firebase
exports.manualSyncSheetChanges = functions.https.onRequest(async (req, res) => {
    try {
        // Get authenticated sheets client
        const sheets = await getAuthenticatedClient();
        
        // Get all rows from the sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A:Q', // Get all columns
        });
        
        const rows = response.data.values || [];
        
        if (rows.length <= 1) {
            return res.json({
                success: true,
                message: 'No data to sync',
                syncedCount: 0
            });
        }
        
        // Get header row
        const headers = rows[0];
        
        // Process each row (skip header)
        let syncedCount = 0;
        const batch = admin.firestore().batch();
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            
            // Skip empty rows
            if (!row[0]) continue;
            
            // Create guest object
            const guest = {
                name: row[0] || '', // Name Line 1
                address: {
                    line1: row[2] || '', // Address Line 1
                    line2: row[3] || '', // Address Line 2
                    city: row[4] || '',  // City
                    state: row[5] || '', // State
                    zip: row[6] || '',   // Zip
                    country: row[7] || '' // Country
                },
                email: row[11] || '', // Email
                phone: row[12] || '', // Phone
                hasResponded: row[8] === 'TRUE', // Submitted
                response: row[13] === 'yes' ? 'attending' : (row[13] === 'no' ? 'declined' : ''),
                actualGuestCount: row[14] ? parseInt(row[14], 10) : 0,
                additionalGuests: row[15] ? row[15].split(', ').filter(g => g.trim()) : [],
                submittedAt: row[16] ? new Date(row[16]) : null,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            
            // Check if guest exists in Firestore by name
            const guestsSnapshot = await admin.firestore()
                .collection('guests')
                .where('name', '==', guest.name)
                .limit(1)
                .get();
            
            if (!guestsSnapshot.empty) {
                // Update existing guest
                const guestDoc = guestsSnapshot.docs[0];
                batch.update(guestDoc.ref, guest);
            } else {
                // Add new guest
                const newGuestRef = admin.firestore().collection('guests').doc();
                batch.set(newGuestRef, guest);
            }
            
            syncedCount++;
        }
        
        // Commit batch
        await batch.commit();
        
        return res.json({
            success: true,
            message: `Synced ${syncedCount} guests from sheet to Firebase`,
            syncedCount: syncedCount
        });
    } catch (error) {
        console.error('Error syncing sheet changes:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to sync sheet changes: ' + error.message
        });
    }
});
