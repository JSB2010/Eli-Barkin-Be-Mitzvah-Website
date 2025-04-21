const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const SibApiV3Sdk = require('sib-api-v3-sdk');

admin.initializeApp();

// Import guest list functions
const { importGuestList } = require('./import-guest-list');
const { syncGuestToSheet } = require('./sync-guest-list');
const { syncSheetChanges, manualSyncSheetChanges } = require('./sync-sheet-changes');
const { removeDuplicateGuests } = require('./remove-duplicates');
const { updateMasterSheet, manualUpdateMasterSheet } = require('./update-master-sheet');
const { sendOutOfTownEventNotification } = require('./out-of-town-notifications');
const { sendOutOfTownGuestEmail } = require('./out-of-town-emails');
const { sendStyledAdminNotification } = require('./styled-admin-emails');
const { sendStyledRsvpConfirmation, sendStyledRsvpUpdateConfirmation } = require('./enhanced-email-functions');

// Export guest list functions
exports.importGuestList = importGuestList;
exports.syncGuestToSheet = syncGuestToSheet;
exports.syncSheetChanges = syncSheetChanges;
exports.manualSyncSheetChanges = manualSyncSheetChanges;
exports.removeDuplicateGuests = removeDuplicateGuests;
exports.updateMasterSheet = updateMasterSheet;
exports.manualUpdateMasterSheet = manualUpdateMasterSheet;
exports.sendOutOfTownEventNotification = sendOutOfTownEventNotification;
exports.sendOutOfTownGuestEmail = sendOutOfTownGuestEmail;
exports.sendStyledAdminNotification = sendStyledAdminNotification;
exports.sendStyledRsvpConfirmation = sendStyledRsvpConfirmation;
exports.sendStyledRsvpUpdateConfirmation = sendStyledRsvpUpdateConfirmation;

// initializeApiKeys function removed to prevent overwriting manually set API keys

/**
 * Cloud Function to get API keys
 */
exports.getApiKeys = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to get API keys.'
    );
  }

  try {
    // Get the API keys from Firestore
    const db = admin.firestore();
    const apiKeysDoc = await db.collection('apiKeys').doc('config').get();

    if (!apiKeysDoc.exists) {
      return {
        github: null,
        googleAnalytics: { propertyId: null, measurementId: null, clientId: null, clientSecret: null },
        cloudflare: { email: null, apiKey: null, zoneId: null },
        brevo: null
      };
    }

    const apiKeys = apiKeysDoc.data();
    return {
      github: apiKeys.github,
      googleAnalytics: {
        propertyId: apiKeys.googleAnalytics?.propertyId || apiKeys.googleAnalytics?.viewId || null,
        measurementId: apiKeys.googleAnalytics?.measurementId || null,
        clientId: apiKeys.googleAnalytics?.clientId || null,
        clientSecret: apiKeys.googleAnalytics?.clientSecret || null
      },
      cloudflare: {
        email: apiKeys.cloudflare?.email || null,
        apiKey: apiKeys.cloudflare?.apiKey || null,
        zoneId: apiKeys.cloudflare?.zoneId || null
      },
      brevo: apiKeys.brevo
    };
  } catch (error) {
    console.error('Error getting API keys:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Error getting API keys: ${error.message}`
    );
  }
});

// Removed nodemailer transporter - using Brevo API instead

// Removed sendRsvpNotification function - replaced by sendStyledAdminNotification

// Removed addRsvpToSheet function - replaced by syncGuestToSheet

// Removed sendRsvpConfirmation function - replaced by sendStyledRsvpConfirmation

// Removed sendRsvpUpdateConfirmation function - replaced by sendStyledRsvpUpdateConfirmation

// storeApiKeys function removed to prevent overwriting manually set API keys

// Removed duplicate initializeApiKeys and getApiKeys functions

// Removed updateGuestListSheet function - replaced by syncGuestToSheet
