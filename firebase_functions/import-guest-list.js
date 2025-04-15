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

        // Use the specific Google Sheet ID
        const sheetId = '1e9ejByxnDLAMi_gJPiSQyiRbHougbzwLFeH6GNLjAnk';

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

        // First get the header row to understand column structure
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Sheet1!1:1', // Get header row
        });

        const headers = headerResponse.data.values[0] || [];

        // Get all data including headers
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Sheet1', // Get all data
        });

        const allRows = response.data.values || [];
        if (allRows.length <= 1) { // Only header or empty
            res.status(404).send('No data found in sheet');
            return;
        }

        // Skip the header row
        const rows = allRows.slice(1);

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

        // Find column indices
        const nameIndex = headers.indexOf('Name Line 1');
        const additionalNamesIndex = headers.indexOf('Name Line 2');
        const addressLine1Index = headers.indexOf('Address Line 1');
        const addressLine2Index = headers.indexOf('Address Line 2');
        const cityIndex = headers.indexOf('City');
        const stateIndex = headers.indexOf('State');
        const zipIndex = headers.indexOf('Zip');
        const countryIndex = headers.indexOf('Country');
        const emailIndex = headers.indexOf('Email');
        const phoneIndex = headers.indexOf('Phone');
        const categoryIndex = headers.indexOf('Category');
        const maxGuestsIndex = headers.indexOf('Max Guests');
        const respondedIndex = headers.indexOf('Responded');
        const rsvpStatusIndex = headers.indexOf('RSVP Status');
        const guestCountIndex = headers.indexOf('Guest Count');
        const additionalGuestsIndex = headers.indexOf('Additional Guests');

        // Process each row and add to Firestore
        const batch = db.batch();
        let importCount = 0;

        rows.forEach((row, index) => {
            if (!row[nameIndex] || nameIndex === -1) return; // Skip rows without a name

            // Parse RSVP status from sheet if available
            let hasResponded = false;
            let response = null;
            let actualGuestCount = null;
            let additionalGuests = [];

            // Check if responded column exists and has a value
            if (respondedIndex !== -1 && row[respondedIndex]) {
                const respondedValue = row[respondedIndex].toString().toUpperCase();
                hasResponded = respondedValue === 'TRUE' || respondedValue === 'YES' || respondedValue === '1';
            }

            // Check if RSVP status column exists and has a value
            if (rsvpStatusIndex !== -1 && row[rsvpStatusIndex]) {
                const status = row[rsvpStatusIndex].toString().toLowerCase();
                if (status.includes('attend') || status === 'yes') {
                    response = 'yes';
                } else if (status.includes('not') || status === 'no') {
                    response = 'no';
                }
            }

            // Check if guest count column exists and has a value
            if (guestCountIndex !== -1 && row[guestCountIndex]) {
                const count = parseInt(row[guestCountIndex]);
                if (!isNaN(count)) {
                    actualGuestCount = count;
                }
            }

            // Check if additional guests column exists and has a value
            if (additionalGuestsIndex !== -1 && row[additionalGuestsIndex]) {
                additionalGuests = row[additionalGuestsIndex].split(',').map(name => name.trim()).filter(name => name);
            }

            const guestData = {
                name: row[nameIndex] || '', // Name Line 1 (First and Last Name)
                additionalNames: additionalNamesIndex !== -1 ? (row[additionalNamesIndex] || '') : '', // Name Line 2
                address: {
                    line1: addressLine1Index !== -1 ? (row[addressLine1Index] || '') : '', // Address Line 1
                    line2: addressLine2Index !== -1 ? (row[addressLine2Index] || '') : '', // Address Line 2
                    city: cityIndex !== -1 ? (row[cityIndex] || '') : '', // City
                    state: stateIndex !== -1 ? (row[stateIndex] || '') : '', // State
                    zip: zipIndex !== -1 ? (row[zipIndex] || '') : '', // Zip
                    country: countryIndex !== -1 ? (row[countryIndex] || 'USA') : 'USA' // Country
                },
                email: emailIndex !== -1 ? (row[emailIndex] || '') : '', // Email if available
                phone: phoneIndex !== -1 ? (row[phoneIndex] || '') : '', // Phone if available
                category: categoryIndex !== -1 ? (row[categoryIndex] || 'Guest') : 'Guest', // Category
                maxAllowedGuests: maxGuestsIndex !== -1 ? (parseInt(row[maxGuestsIndex]) || 4) : 4, // Max guests
                hasResponded: hasResponded,
                response: response,
                actualGuestCount: actualGuestCount,
                additionalGuests: additionalGuests,
                submittedAt: hasResponded ? admin.firestore.FieldValue.serverTimestamp() : null,
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
