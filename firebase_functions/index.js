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

/**
 * Cloud Function to store and retrieve API keys securely
 */
exports.initializeApiKeys = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to initialize API keys.'
    );
  }

  try {
    // Get the API keys collection reference
    const db = admin.firestore();
    const apiKeysRef = db.collection('apiKeys').doc('config');

    // Check if the document already exists
    const doc = await apiKeysRef.get();
    if (doc.exists) {
      console.log('API keys already exist, not overwriting');
      return { success: true, message: 'API keys already exist' };
    }

    // Initialize with values from environment variables
    await apiKeysRef.set({
      github: functions.config().github?.token || null,
      googleAnalytics: {
        viewId: functions.config().google?.viewid || null,
        clientId: functions.config().google?.clientid || null,
        clientSecret: functions.config().google?.clientsecret || null
      },
      cloudflare: {
        email: functions.config().cloudflare?.email || null,
        apiKey: functions.config().cloudflare?.apikey || null,
        zoneId: functions.config().cloudflare?.zoneid || null
      },
      brevo: functions.config().brevo?.apikey || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid
    });

    return { success: true, message: 'API keys initialized successfully' };
  } catch (error) {
    console.error('Error initializing API keys:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Error initializing API keys: ${error.message}`
    );
  }
});

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
        googleAnalytics: { viewId: null, clientId: null, clientSecret: null },
        cloudflare: { email: null, apiKey: null, zoneId: null },
        brevo: null
      };
    }

    const apiKeys = apiKeysDoc.data();
    return {
      github: apiKeys.github,
      googleAnalytics: {
        viewId: apiKeys.googleAnalytics?.viewId || null,
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

/**
 * Cloud Function to store and retrieve API keys securely
 */
exports.storeApiKeys = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to store API keys.'
    );
  }

  try {
    // Get the API keys collection reference
    const db = admin.firestore();
    const apiKeysRef = db.collection('apiKeys').doc('config');

    // Store the API keys
    await apiKeysRef.set({
      github: data.github || null,
      googleAnalytics: {
        viewId: data.googleAnalytics?.viewId || null,
        clientId: data.googleAnalytics?.clientId || null,
        clientSecret: data.googleAnalytics?.clientSecret || null
      },
      cloudflare: {
        email: data.cloudflare?.email || null,
        apiKey: data.cloudflare?.apiKey || null,
        zoneId: data.cloudflare?.zoneId || null
      },
      brevo: data.brevo || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid
    });

    return { success: true, message: 'API keys stored successfully' };
  } catch (error) {
    console.error('Error storing API keys:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error storing API keys. Please try again.'
    );
  }
});

// Removed duplicate initializeApiKeys and getApiKeys functions

// Removed updateGuestListSheet function - replaced by syncGuestToSheet
