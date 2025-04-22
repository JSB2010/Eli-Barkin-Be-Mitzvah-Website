const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

// Import functions
const { testV2Function } = require('./test-function');
const { removeDuplicateGuestsV2 } = require('./remove-duplicates');
const { manualSyncSheetChangesV2 } = require('./sync-sheet-changes');
const { sendStyledRsvpConfirmationV2, sendStyledRsvpUpdateConfirmationV2 } = require('./enhanced-email-functions');
const { sendStyledAdminNotificationV2 } = require('./styled-admin-emails');
const { sendOutOfTownGuestEmailV2 } = require('./out-of-town-emails');
const { sendOutOfTownEventNotificationV2 } = require('./out-of-town-notifications');
const { updateMasterSheetV2, manualUpdateMasterSheetV2 } = require('./update-master-sheet');
const { syncSheetChangesV2 } = require('./sync-sheet-scheduled');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Define secrets
const sheetsCredentials = defineSecret('SHEETS_CREDENTIALS');
const sheetsSheetId = defineSecret('SHEETS_SHEET_ID');
const brevoApiKey = defineSecret('BREVO_API_KEY');
const gmailEmail = defineSecret('GMAIL_EMAIL');
const gmailPassword = defineSecret('GMAIL_PASSWORD');
const adminEmail = defineSecret('ADMIN_EMAIL');

/**
 * Cloud Function to get API keys (v2 version)
 */
exports.getApiKeysV2 = onCall({
  minInstances: 0,
  maxInstances: 10,
  memory: '256MiB',
  timeoutSeconds: 60,
  region: 'us-central1'
}, async (request) => {
  // Check if the user is authenticated
  if (!request.auth) {
    throw new HttpsError(
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
    throw new HttpsError(
      'internal',
      `Error getting API keys: ${error.message}`
    );
  }
});

// Export functions
exports.testV2Function = testV2Function;
exports.removeDuplicateGuestsV2 = removeDuplicateGuestsV2;
exports.manualSyncSheetChangesV2 = manualSyncSheetChangesV2;
exports.sendStyledRsvpConfirmationV2 = sendStyledRsvpConfirmationV2;
exports.sendStyledRsvpUpdateConfirmationV2 = sendStyledRsvpUpdateConfirmationV2;
exports.sendStyledAdminNotificationV2 = sendStyledAdminNotificationV2;
exports.sendOutOfTownGuestEmailV2 = sendOutOfTownGuestEmailV2;
exports.sendOutOfTownEventNotificationV2 = sendOutOfTownEventNotificationV2;
exports.updateMasterSheetV2 = updateMasterSheetV2;
exports.manualUpdateMasterSheetV2 = manualUpdateMasterSheetV2;
exports.syncSheetChangesV2 = syncSheetChangesV2;
