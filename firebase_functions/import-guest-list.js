const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

// This function assumes admin.initializeApp() has been called in index.js

/**
 * Cloud Function to import guest list from Google Sheets to Firebase
 * This can be triggered manually or on a schedule
 */
exports.importGuestList = functions.https.onRequest(async (req, res) => {
    try {
        // Check for authentication (you should implement proper auth)
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        // Get the sheet ID from environment or request
        const sheetId = functions.config().sheets.sheet_id || req.body.sheetId;
        if (!sheetId) {
            res.status(400).send('Sheet ID is required');
            return;
        }

        // Get the service account credentials from environment
        const serviceAccountCredentials = functions.config().sheets.credentials;
        if (!serviceAccountCredentials) {
            res.status(500).send('Service account credentials not configured');
            return;
        }

        // Set up Google Sheets authentication
        const auth = new google.auth.GoogleAuth({
            credentials: serviceAccountCredentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
        });

        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        // Get the sheet data
        // Assuming the first sheet contains the guest list
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Sheet1!A2:F', // Adjust range as needed, skipping header row
        });

        const rows = response.data.values || [];
        if (rows.length === 0) {
            res.status(404).send('No data found in sheet');
            return;
        }

        // Get Firestore reference
        const db = admin.firestore();
        const guestListRef = db.collection('guestList');

        // Clear existing guest list if requested
        if (req.body.clearExisting) {
            const existingGuests = await guestListRef.get();
            const batch = db.batch();
            
            existingGuests.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log('Cleared existing guest list');
        }

        // Process each row and add to Firestore
        // Assuming columns: Name, Email, Phone, Category, Max Guests, Notes
        const batch = db.batch();
        let importCount = 0;

        rows.forEach((row, index) => {
            if (!row[0]) return; // Skip rows without a name
            
            const guestData = {
                name: row[0] || '',
                email: row[1] || '',
                phone: row[2] || '',
                category: row[3] || 'General',
                maxAllowedGuests: parseInt(row[4] || '2', 10),
                notes: row[5] || '',
                hasResponded: false,
                response: null,
                actualGuestCount: null,
                additionalGuests: [],
                submittedAt: null,
                importedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            
            // Create a new document with auto-generated ID
            const docRef = guestListRef.doc();
            batch.set(docRef, guestData);
            importCount++;
        });

        // Commit the batch
        await batch.commit();

        // Return success response
        res.status(200).json({
            success: true,
            message: `Successfully imported ${importCount} guests`,
            importCount
        });

    } catch (error) {
        console.error('Error importing guest list:', error);
        res.status(500).send(`Error importing guest list: ${error.message}`);
    }
});
