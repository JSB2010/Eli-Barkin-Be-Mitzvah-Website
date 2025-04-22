const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const SibApiV3Sdk = require('sib-api-v3-sdk');

// Define secrets for Brevo API
const brevoApiKey = defineSecret('BREVO_API_KEY');

/**
 * Cloud Function that sends emails to out-of-town guests when they submit or update their RSVP
 */
exports.sendOutOfTownGuestEmailV2 = onDocumentWritten({
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
    // Get the RSVP data
    const rsvpData = change.after.exists ? change.after.data() : null;
    const previousData = change.before.exists ? change.before.data() : null;
    const rsvpId = event.params.rsvpId;

    // If the document was deleted, we don't need to send an email
    if (!rsvpData) {
      return null;
    }

    // Check if this is an out-of-town guest
    const isOutOfTown = rsvpData.isOutOfTown === true;

    // If not an out-of-town guest or not attending, don't send the email
    if (!isOutOfTown || rsvpData.attending !== 'yes') {
      return null;
    }

    // Determine if this is a new submission or an update
    const isUpdate = change.before.exists && change.after.exists;
    const isCreate = !change.before.exists && change.after.exists;

    // Only send email on new submissions or when out-of-town event attendance changes
    if (isUpdate) {
      const fridayDinnerChanged = rsvpData.fridayDinner !== previousData.fridayDinner;
      const sundayBrunchChanged = rsvpData.sundayBrunch !== previousData.sundayBrunch;

      if (!fridayDinnerChanged && !sundayBrunchChanged) {
        return null;
      }
    }

    console.log(`Sending out-of-town guest email to ${rsvpData.name} (${rsvpData.email})`);

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

    // Prepare email content
    const subject = isCreate
      ? `Eli's Bar Mitzvah - Out-of-Town Guest Information`
      : `Eli's Bar Mitzvah - Updated Out-of-Town Event Information`;

    // Get the guest's first name
    const firstName = rsvpData.name.split(' ')[0];

    // Format the date for Friday dinner
    const fridayDate = 'Friday, May 16, 2025';
    const fridayTime = '6:30 PM';

    // Format the date for Sunday brunch
    const sundayDate = 'Sunday, May 18, 2025';
    const sundayTime = '10:00 AM';

    // Determine which events they're attending
    const attendingFridayDinner = rsvpData.fridayDinner === 'yes';
    const attendingSundayBrunch = rsvpData.sundayBrunch === 'yes';

    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Eli's Bar Mitzvah - Out-of-Town Guest Information</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header img {
            max-width: 200px;
            margin-bottom: 20px;
          }
          h1 {
            color: #0d47a1;
            margin-bottom: 5px;
          }
          h2 {
            color: #0d47a1;
            margin-top: 30px;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 10px;
          }
          .event-card {
            background-color: ${attendingFridayDinner || attendingSundayBrunch ? '#f5f5f5' : '#f9f9f9'};
            border-left: 4px solid ${attendingFridayDinner || attendingSundayBrunch ? '#0d47a1' : '#e0e0e0'};
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
          }
          .event-title {
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 10px;
            color: ${attendingFridayDinner || attendingSundayBrunch ? '#0d47a1' : '#666'};
          }
          .event-details {
            margin-bottom: 15px;
          }
          .event-status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 15px;
          }
          .attending {
            background-color: #e8f5e9;
            color: #2e7d32;
          }
          .not-attending {
            background-color: #ffebee;
            color: #c62828;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 14px;
            color: #666;
            border-top: 1px solid #e0e0e0;
            padding-top: 20px;
          }
          .button {
            display: inline-block;
            background-color: #0d47a1;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 4px;
            margin-top: 15px;
            font-weight: bold;
          }
          .button:hover {
            background-color: #1565c0;
          }
          .note {
            background-color: #fff8e1;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .address {
            margin-top: 10px;
            font-style: italic;
          }
          @media only screen and (max-width: 480px) {
            body {
              padding: 10px;
            }
            .header img {
              max-width: 150px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://elibarkin.com/images/logo.png" alt="Eli's Bar Mitzvah Logo">
          <h1>Out-of-Town Guest Information</h1>
          <p>Special events for our out-of-town guests</p>
        </div>

        <p>Dear ${firstName},</p>

        <p>${isCreate
          ? `Thank you for your RSVP to Eli's Bar Mitzvah! We're excited that you'll be joining us for this special occasion.`
          : `Thank you for updating your RSVP for Eli's Bar Mitzvah! We've updated your preferences for our out-of-town guest events.`
        }</p>

        <p>As an out-of-town guest, we've planned some additional events to make your trip to Denver even more special. Below is information about these events based on your RSVP preferences:</p>

        <h2>Your Out-of-Town Event Schedule</h2>

        <div class="event-card">
          <div class="event-title">Friday Night Dinner at Linger</div>
          <span class="event-status ${attendingFridayDinner ? 'attending' : 'not-attending'}">
            ${attendingFridayDinner ? 'You are attending' : 'You are not attending'}
          </span>
          <div class="event-details">
            <strong>Date:</strong> ${fridayDate}<br>
            <strong>Time:</strong> ${fridayTime}<br>
            <strong>Location:</strong> Linger Restaurant
            <div class="address">
              2030 W 30th Ave, Denver, CO 80211
            </div>
          </div>
          ${attendingFridayDinner ? `
          <p>Join us for a casual dinner the night before the Bar Mitzvah. This will be a great opportunity to meet family and friends in a relaxed setting before the main event.</p>
          ` : `
          <p>We understand you won't be joining us for the Friday night dinner. If your plans change, please let us know!</p>
          `}
        </div>

        <div class="event-card">
          <div class="event-title">Sunday Brunch at Eli's Home</div>
          <span class="event-status ${attendingSundayBrunch ? 'attending' : 'not-attending'}">
            ${attendingSundayBrunch ? 'You are attending' : 'You are not attending'}
          </span>
          <div class="event-details">
            <strong>Date:</strong> ${sundayDate}<br>
            <strong>Time:</strong> ${sundayTime}<br>
            <strong>Location:</strong> The Barkin Residence
            <div class="address">
              Address details will be provided closer to the event
            </div>
          </div>
          ${attendingSundayBrunch ? `
          <p>Before you head home, join us for a farewell brunch at our home. This will be a casual gathering to say goodbye and enjoy one last celebration together.</p>
          ` : `
          <p>We understand you won't be joining us for the Sunday brunch. If your plans change, please let us know!</p>
          `}
        </div>

        <div class="note">
          <strong>Note:</strong> If you need to update your RSVP or have any questions about these events, please don't hesitate to contact us at <a href="mailto:jacobsamuelbarkin@gmail.com">jacobsamuelbarkin@gmail.com</a> or by phone at (303) 555-1234.
        </div>

        <p>We're looking forward to celebrating with you in Denver!</p>

        <p>Warm regards,<br>The Barkin Family</p>

        <div class="footer">
          <p>This email was sent regarding your RSVP to Eli Barkin's Bar Mitzvah.</p>
          <p>May 17, 2025 | Denver, Colorado</p>
          <a href="https://elibarkin.com" class="button">Visit Event Website</a>
        </div>
      </body>
      </html>
    `;

    // Send email
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { name: "Eli's Bar Mitzvah", email: "noreply@elibarkin.com" };
    sendSmtpEmail.to = [{ email: rsvpData.email, name: rsvpData.name }];
    sendSmtpEmail.replyTo = { email: "jacobsamuelbarkin@gmail.com", name: "Jacob Barkin" };

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Out-of-town guest email sent:', result);

    // Log the email
    await admin.firestore().collection('emailLogs').add({
      type: 'out-of-town-guest-email',
      recipient: rsvpData.email,
      recipientName: rsvpData.name,
      subject: subject,
      rsvpId: rsvpId,
      isUpdate: isUpdate,
      fridayDinner: attendingFridayDinner,
      sundayBrunch: attendingSundayBrunch,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      messageId: result.messageId
    });

    return null;
  } catch (error) {
    console.error('Error sending out-of-town guest email:', error);
    return null;
  }
});
