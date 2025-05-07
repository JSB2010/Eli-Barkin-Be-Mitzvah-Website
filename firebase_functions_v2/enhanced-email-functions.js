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
    let apiKeyValue = brevoApiKey.value().trim();
    // Remove any newline characters
    apiKeyValue = apiKeyValue.replace(/[\r\n]+/g, '');
    console.log('Using Brevo API key:', apiKeyValue.substring(0, 5) + '...');
    apiKey.apiKey = apiKeyValue;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // Get the HTML content from our template
    const htmlContent = emailTemplates.getRsvpConfirmationTemplate(rsvpData);

    // Create the email
    const sendSmtpEmail = {
      sender: {
        email: 'rsvps@elibarkin.com',
        name: "Eli's Be Mitzvah"
      },
      to: [{ email: rsvpData.email, name: rsvpData.name }],
      subject: 'Thank You for Your RSVP to Eli\'s Be Mitzvah',
      htmlContent: htmlContent,
      replyTo: { email: "jacobsamuelbarkin@gmail.com", name: "Jacob Barkin" },
      headers: {
        "List-Unsubscribe": "<mailto:jacobsamuelbarkin@gmail.com?subject=Unsubscribe>",
        "X-Entity-Ref-ID": `rsvp-${rsvpId}`
      }
    };

    // Send the email
    try {
      console.log('Attempting to send email to:', rsvpData.email);
      console.log('Email sender:', JSON.stringify(sendSmtpEmail.sender));
      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Styled confirmation email sent to:', rsvpData.email);
      console.log('Email result:', JSON.stringify(result));

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
        messageId: result.messageId,
        success: true
      });
    } catch (emailError) {
      console.error('Error in sendTransacEmail:', emailError);
      console.error('Error details:', JSON.stringify(emailError, Object.getOwnPropertyNames(emailError)));

      // Log the failed email attempt
      await admin.firestore().collection('emailLogs').add({
        type: 'rsvp-confirmation-failed',
        recipient: rsvpData.email,
        recipientName: rsvpData.name,
        subject: sendSmtpEmail.subject,
        rsvpId: rsvpId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        error: emailError.message || 'Unknown error',
        success: false
      });
    }

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
    // Make sure the API key doesn't have any special characters or whitespace
    let apiKeyValue = brevoApiKey.value().trim();
    // Remove any newline characters
    apiKeyValue = apiKeyValue.replace(/[\r\n]+/g, '');
    console.log('Using Brevo API key:', apiKeyValue.substring(0, 5) + '...');
    apiKey.apiKey = apiKeyValue;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // Get the HTML content from our template
    const htmlContent = emailTemplates.getRsvpUpdateTemplate(beforeData, afterData);

    // Create the email
    const sendSmtpEmail = {
      sender: {
        email: 'rsvps@elibarkin.com',
        name: "Eli's Be Mitzvah"
      },
      to: [{ email: afterData.email, name: afterData.name }],
      subject: 'Your RSVP to Eli\'s Be Mitzvah Has Been Updated',
      htmlContent: htmlContent,
      replyTo: { email: "jacobsamuelbarkin@gmail.com", name: "Jacob Barkin" },
      headers: {
        "List-Unsubscribe": "<mailto:jacobsamuelbarkin@gmail.com?subject=Unsubscribe>",
        "X-Entity-Ref-ID": `rsvp-update-${rsvpId}`
      }
    };

    // Send the email
    try {
      console.log('Attempting to send update email to:', afterData.email);
      console.log('Email sender:', JSON.stringify(sendSmtpEmail.sender));
      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Styled update confirmation email sent to:', afterData.email);
      console.log('Email result:', JSON.stringify(result));

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
        success: true,
        changes: {
          attendance: hasAttendanceChanged,
          guestCount: hasGuestCountChanged,
          guestList: hasAdditionalGuestsChanged || hasAdultGuestsChanged || hasChildGuestsChanged,
          fridayDinner: hasFridayDinnerChanged,
          sundayBrunch: hasSundayBrunchChanged
        }
      });
    } catch (emailError) {
      console.error('Error in sendTransacEmail for update:', emailError);
      console.error('Error details:', JSON.stringify(emailError, Object.getOwnPropertyNames(emailError)));

      // Log the failed email attempt
      await admin.firestore().collection('emailLogs').add({
        type: 'rsvp-update-confirmation-failed',
        recipient: afterData.email,
        recipientName: afterData.name,
        subject: sendSmtpEmail.subject,
        rsvpId: rsvpId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        error: emailError.message || 'Unknown error',
        success: false
      });
    }

    return null;
  } catch (error) {
    console.error('Error sending styled update confirmation email:', error);
    return null;
  }
});
