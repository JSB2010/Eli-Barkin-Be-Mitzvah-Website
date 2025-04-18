const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

// Import functions
const { addGuestToSheet } = require('./addGuestToSheet');
const { updateRsvpInSheet, manualUpdateAllRsvps } = require('./updateRsvpInSheet');
const { manualSyncSheetChanges } = require('./syncSheetChanges');

// Export functions
exports.addGuestToSheet = addGuestToSheet;
exports.updateRsvpInSheet = updateRsvpInSheet;
exports.manualUpdateAllRsvps = manualUpdateAllRsvps;
exports.manualSyncSheetChanges = manualSyncSheetChanges;
