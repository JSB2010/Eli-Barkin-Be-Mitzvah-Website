const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const SibApiV3Sdk = require('sib-api-v3-sdk');
const emailTemplates = require('./brevo-email-templates');

// Define secrets for Brevo API
const brevoApiKey = defineSecret('BREVO_API_KEY');

/**
 * Cloud Function that sends a styled confirmation email to the guest when they submit an RSVP
 */
exports.sendStyledRsvpConfirmationV2 = onDocumentCreated({
  document: 'sheetRsvps/{rsvpId}',
  minInstances: 0,
  maxInstances: 10,
  memory: '256MiB',
  timeoutSeconds: 60,
  region: 'us-central1',
  secrets: [brevoApiKey]
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return null;

  try {
    // Get the RSVP data
    const rsvpData = snapshot.data();
    const rsvpId = event.params.rsvpId;

    // Skip if no email provided
    if (!rsvpData.email) {
      console.log('No email provided for RSVP, skipping confirmation email');
      return null;
    }

    // Configure Brevo API client
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    // Make sure the API key doesn't have any special characters or whitespace
    apiKey.apiKey = brevoApiKey.value().trim();

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // Get the HTML content from our template
    const htmlContent = emailTemplates.getRsvpConfirmationTemplate(rsvpData);

    // Create the email
    const sendSmtpEmail = {
      sender: {
        email: 'rsvps@elibarkin.com',
        name: "Eli's Bar Mitzvah"
      },
      to: [{ email: rsvpData.email, name: rsvpData.name }],
      subject: 'Thank You for Your RSVP to Eli\'s Bar Mitzvah',
      htmlContent: htmlContent
    };

    // Send the email
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Styled confirmation email sent to:', rsvpData.email);

    // Log the email
    await admin.firestore().collection('emailLogs').add({
      type: 'rsvp-confirmation',
      recipient: rsvpData.email,
      recipientName: rsvpData.name,
      subject: sendSmtpEmail.subject,
      rsvpId: rsvpId,
      isAttending: rsvpData.attending === 'yes',
      isOutOfTown: rsvpData.isOutOfTown === true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      messageId: result.messageId
    });

    return null;
  } catch (error) {
    console.error('Error sending styled confirmation email:', error);
    return null;
  }
});

/**
 * Cloud Function that sends a styled confirmation email when a guest updates their RSVP
 */
exports.sendStyledRsvpUpdateConfirmationV2 = onDocumentUpdated({
  document: 'sheetRsvps/{rsvpId}',
  minInstances: 0,
  maxInstances: 10,
  memory: '256MiB',
  timeoutSeconds: 60,
  region: 'us-central1',
  secrets: [brevoApiKey]
}, async (event) => {
  const change = event.data;
  if (!change) return null;

  try {
    // Get the before and after data
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const rsvpId = event.params.rsvpId;

    // Skip if no email provided
    if (!afterData.email) {
      console.log('No email provided for RSVP update, skipping confirmation email');
      return null;
    }

    // Check if there are meaningful changes to notify about
    const hasAttendanceChanged = beforeData.attending !== afterData.attending;
    const hasGuestCountChanged = beforeData.guestCount !== afterData.guestCount;
    const hasAdditionalGuestsChanged = JSON.stringify(beforeData.additionalGuests || []) !==
                                      JSON.stringify(afterData.additionalGuests || []);
    const hasAdultGuestsChanged = JSON.stringify(beforeData.adultGuests || []) !==
                                 JSON.stringify(afterData.adultGuests || []);
    const hasChildGuestsChanged = JSON.stringify(beforeData.childGuests || []) !==
                                 JSON.stringify(afterData.childGuests || []);

    // Check for out-of-town event changes
    const hasFridayDinnerChanged = beforeData.fridayDinner !== afterData.fridayDinner;
    const hasSundayBrunchChanged = beforeData.sundayBrunch !== afterData.sundayBrunch;

    // If nothing significant changed, don't send an email
    if (!hasAttendanceChanged && !hasGuestCountChanged && !hasAdditionalGuestsChanged &&
        !hasAdultGuestsChanged && !hasChildGuestsChanged && !hasFridayDinnerChanged &&
        !hasSundayBrunchChanged) {
      console.log('No significant changes detected in RSVP update, skipping email');
      return null;
    }

    // Configure Brevo API client
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = brevoApiKey.value();

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // Get the HTML content from our template
    const htmlContent = emailTemplates.getRsvpUpdateTemplate(beforeData, afterData);

    // Create the email
    const sendSmtpEmail = {
      sender: {
        email: 'rsvps@elibarkin.com',
        name: "Eli's Bar Mitzvah"
      },
      to: [{ email: afterData.email, name: afterData.name }],
      subject: 'Your RSVP to Eli\'s Bar Mitzvah Has Been Updated',
      htmlContent: htmlContent
    };

    // Send the email
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Styled update confirmation email sent to:', afterData.email);

    // Log the email
    await admin.firestore().collection('emailLogs').add({
      type: 'rsvp-update-confirmation',
      recipient: afterData.email,
      recipientName: afterData.name,
      subject: sendSmtpEmail.subject,
      rsvpId: rsvpId,
      isAttending: afterData.attending === 'yes',
      isOutOfTown: afterData.isOutOfTown === true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      messageId: result.messageId,
      changes: {
        attendance: hasAttendanceChanged,
        guestCount: hasGuestCountChanged,
        guestList: hasAdditionalGuestsChanged || hasAdultGuestsChanged || hasChildGuestsChanged,
        fridayDinner: hasFridayDinnerChanged,
        sundayBrunch: hasSundayBrunchChanged
      }
    });

    return null;
  } catch (error) {
    console.error('Error sending styled update confirmation email:', error);
    return null;
  }
});
