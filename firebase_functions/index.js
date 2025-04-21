const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
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

// Configure the email transport using nodemailer
// For Gmail, you'll need to create an "App Password" in your Google Account
// See: https://support.google.com/accounts/answer/185833
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jacobsamuelbarkin@gmail.com', // Your Gmail address
    pass: 'phnv varx llta soll' // App password
  }
});

/**
 * Cloud Function that sends an email notification when a new RSVP is submitted
 */
exports.sendRsvpNotification = functions.firestore
  .document('sheetRsvps/{rsvpId}')
  .onCreate(async (snapshot, context) => {
    // Get the RSVP data
    const rsvpData = snapshot.data();
    const rsvpId = context.params.rsvpId;

    // Format the date
    const submittedDate = rsvpData.submittedAt ?
      new Date(rsvpData.submittedAt.toDate()).toLocaleString() :
      new Date().toLocaleString();

    // Format additional guests as a list if any
    let additionalGuestsText = '';
    if (rsvpData.additionalGuests && rsvpData.additionalGuests.length > 0) {
      additionalGuestsText = 'Additional Guests:\n' +
        rsvpData.additionalGuests.map(guest => `- ${guest}`).join('\n');
    }

    // Create email content
    const mailOptions = {
      from: 'Eli\'s Be Mitzvah RSVP <jacobsamuelbarkin@gmail.com>',
      to: 'jacobsamuelbarkin@gmail.com',
      subject: `New RSVP from ${rsvpData.name}`,
      text: `
New RSVP Submission (ID: ${rsvpId})

Name: ${rsvpData.name}
Email: ${rsvpData.email}
Phone: ${rsvpData.phone || 'Not provided'}
Attending: ${rsvpData.attending === 'yes' ? 'Yes' : 'No'}
Guest Count: ${rsvpData.guestCount || 1}
${additionalGuestsText}
Submitted At: ${submittedDate}

View all RSVPs on your dashboard: https://elibarkin.com/rsvp-dashboard.html
      `,
      html: `
<h2>New RSVP Submission</h2>
<p><strong>ID:</strong> ${rsvpId}</p>
<p><strong>Name:</strong> ${rsvpData.name}</p>
<p><strong>Email:</strong> ${rsvpData.email}</p>
<p><strong>Phone:</strong> ${rsvpData.phone || 'Not provided'}</p>
<p><strong>Attending:</strong> ${rsvpData.attending === 'yes' ? 'Yes' : 'No'}</p>
<p><strong>Guest Count:</strong> ${rsvpData.guestCount || 1}</p>
${rsvpData.additionalGuests && rsvpData.additionalGuests.length > 0 ?
  `<p><strong>Additional Guests:</strong></p>
  <ul>
    ${rsvpData.additionalGuests.map(guest => `<li>${guest}</li>`).join('')}
  </ul>` : ''}
<p><strong>Submitted At:</strong> ${submittedDate}</p>
<p>
  <a href="https://elibarkin.com/rsvp-dashboard.html"
     style="background-color: #2563eb; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">
    View All RSVPs on Dashboard
  </a>
</p>
      `
    };

    try {
      // Send the email
      await transporter.sendMail(mailOptions);
      console.log('Email notification sent successfully for RSVP:', rsvpId);
      return null;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return null;
    }
  });

/**
 * Cloud Function to add RSVP data to a Google Sheet and update guest list
 */
exports.addRsvpToSheet = functions.firestore
  .document('sheetRsvps/{rsvpId}')
  .onCreate(async (snapshot, context) => {
    try {
      // Get the RSVP data
      const rsvpData = snapshot.data();
      const rsvpId = context.params.rsvpId;

      // Format the date
      const submittedDate = rsvpData.submittedAt ?
        new Date(rsvpData.submittedAt.toDate()).toLocaleString() :
        new Date().toLocaleString();

      // Format additional guests as a comma-separated list
      const additionalGuestsText = rsvpData.additionalGuests && rsvpData.additionalGuests.length > 0 ?
        rsvpData.additionalGuests.join(', ') : '';

      // Get the service account credentials from environment
      const serviceAccountCredentials = functions.config().sheets.credentials;

      // Get the sheet ID from environment
      const sheetId = functions.config().sheets.sheet_id;

      // Set up Google Sheets authentication
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountCredentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const client = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: client });

      // Prepare the row data
      const values = [
        [
          rsvpId,
          rsvpData.name,
          rsvpData.email,
          rsvpData.phone || '',
          rsvpData.attending === 'yes' ? 'Yes' : 'No',
          rsvpData.guestCount || 1,
          additionalGuestsText,
          submittedDate
        ]
      ];

      // Append the data to the sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Sheet1!A2:H', // Assuming headers are in row 1
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: values
        }
      });

      console.log('RSVP data added to Google Sheet successfully:', rsvpId);

      // Now try to find and update the corresponding guest in the guest list
      try {
        const db = admin.firestore();
        const guestListRef = db.collection('guestList');

        // Search for a guest with the same name
        const guestQuery = await guestListRef.where('name', '==', rsvpData.name).get();

        if (!guestQuery.empty) {
          // Found a matching guest, update their RSVP status
          const guestDoc = guestQuery.docs[0];
          await guestDoc.ref.update({
            hasResponded: true,
            response: rsvpData.attending,
            actualGuestCount: rsvpData.guestCount || 1,
            additionalGuests: rsvpData.additionalGuests || [],
            email: rsvpData.email,
            phone: rsvpData.phone || '',
            submittedAt: rsvpData.submittedAt || admin.firestore.FieldValue.serverTimestamp()
          });

          console.log('Updated guest list entry for:', rsvpData.name);
        } else {
          console.log('No matching guest found in guest list for:', rsvpData.name);
        }
      } catch (guestError) {
        console.error('Error updating guest list:', guestError);
        // Continue even if guest list update fails
      }

      return null;
    } catch (error) {
      console.error('Error adding RSVP data to Google Sheet:', error);
      return null;
    }
  });

/**
 * Cloud Function that sends a confirmation email to the guest when they submit an RSVP
 */
exports.sendRsvpConfirmation = functions.firestore
  .document('sheetRsvps/{rsvpId}')
  .onCreate(async (snapshot, context) => {
    // Get the RSVP data
    const rsvpData = snapshot.data();

    // Skip if no email provided
    if (!rsvpData.email) {
      console.log('No email provided for RSVP, skipping confirmation email');
      return null;
    }

    // Determine guest information
    const isAttending = rsvpData.attending === 'yes';

    // Extract nested ternary into separate statement
    let guestText = 'guest';
    if (rsvpData.guestCount > 1) {
      guestText = 'guests';
    }

    const guestInfo = isAttending
      ? `<p>We have you down for ${rsvpData.guestCount || 1} ${guestText}.</p>`
      : '';

    // Get additional guests if any
    let additionalGuests = '';
    if (isAttending && rsvpData.additionalGuests && rsvpData.additionalGuests.length > 0) {
      additionalGuests = `
        <p>Your party includes:</p>
        <ul style="padding-left: 20px;">
          <li>${rsvpData.name}</li>
          ${rsvpData.additionalGuests.map(guest => `<li>${guest}</li>`).join('')}
        </ul>
      `;
    }

    // Configure Brevo API client
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = functions.config().brevo.key;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // Create the email
    const sendSmtpEmail = {
      sender: {
        email: 'rsvps@elibarkin.com',
        name: "Eli's Be Mitzvah"
      },
      to: [{ email: rsvpData.email }],
      subject: 'Thank You for Your RSVP to Eli\'s Be Mitzvah',
      htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eli's Be Mitzvah RSVP Confirmation</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style type="text/css">
    /* CLIENT-SPECIFIC STYLES */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; }

    /* RESET STYLES */
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }

    /* iOS BLUE LINKS */
    a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }

    /* GMAIL BLUE LINKS */
    u + #body a {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }

    /* SAMSUNG MAIL BLUE LINKS */
    #MessageViewBody a {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }

    /* Universal styles */
    body {
      font-family: 'Montserrat', Arial, sans-serif;
      background-color: #f8f9fa;
    }

    /* Media Queries */
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .fluid {
        max-width: 100% !important;
        height: auto !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }
      .stack-column,
      .stack-column-center {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        direction: ltr !important;
      }
      .stack-column-center {
        text-align: center !important;
      }
      .center-on-narrow {
        text-align: center !important;
        display: block !important;
        margin-left: auto !important;
        margin-right: auto !important;
        float: none !important;
      }
      table.center-on-narrow {
        display: inline-block !important;
      }
      .email-container p {
        font-size: 16px !important;
        line-height: 24px !important;
      }
    }
  </style>
</head>
<body width="100%" style="margin: 0; padding: 0 !important; background-color: #f8f9fa;" bgcolor="#f8f9fa">
  <center role="article" aria-roledescription="email" lang="en" style="width: 100%; background-color: #f8f9fa;">
    <!--[if mso | IE]>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f9fa;">
    <tr>
    <td>
    <![endif]-->

    <!-- Email Body -->
    <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" class="email-container">
      <!-- Header -->
      <tr>
        <td style="background: linear-gradient(135deg, #1e88e5 0%, #0d47a1 100%); padding: 30px 0; text-align: center;">
          <img src="https://elibarkin.com/logo.PNG" width="120" height="120" alt="Eli's Be Mitzvah" style="border-radius: 60px; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
          <h1 style="margin: 20px 0 0; color: #ffffff; font-family: 'Montserrat', Arial, sans-serif; font-size: 28px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            Thank You for Your RSVP!
          </h1>
        </td>
      </tr>

      <!-- Accent bar -->
      <tr>
        <td style="background: linear-gradient(90deg, #ff9800, #e65100); height: 5px; line-height: 5px;">&nbsp;</td>
      </tr>

      <!-- Content -->
      <tr>
        <td style="background-color: #ffffff; padding: 40px 30px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">
                <p style="margin: 0 0 20px;">Dear ${rsvpData.name},</p>
                <p style="margin: 0 0 20px;">We've received your RSVP for Eli's Be Mitzvah celebration at Coors Field on August 23, 2025.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- RSVP Details Box -->
      <tr>
        <td style="background-color: #ffffff; padding: 0 30px 30px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; border-radius: 8px; border-left: 4px solid #1e88e5;">
            <tr>
              <td style="padding: 20px; font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">
                <p style="margin: 0 0 10px;"><strong style="color: #0d47a1;">Your response:</strong> ${isAttending ? 'Attending' : 'Not Attending'}</p>
                ${guestInfo}
                ${additionalGuests}
                ${(() => {
                  if (isAttending && rsvpData.isOutOfTown) {
                    // Extract nested ternary operations
                    const fridayDinnerStatus = rsvpData.fridayDinner === 'yes' ? 'Attending' : 'Not Attending';
                    const sundayBrunchStatus = rsvpData.sundayBrunch === 'yes' ? 'Attending' : 'Not Attending';

                    return `
                    <p style="margin: 10px 0 0;"><strong style="color: #0d47a1;">Additional Events:</strong></p>
                    <ul style="margin: 5px 0 0; padding-left: 20px;">
                      <li>Friday Night Dinner at Linger: ${fridayDinnerStatus}</li>
                      <li>Sunday Brunch at Eli's home: ${sundayBrunchStatus}</li>
                    </ul>
                    `;
                  }
                  return '';
                })()}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Message -->
      <tr>
        <td style="background-color: #ffffff; padding: 0 30px 30px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">
                ${isAttending ?
                '<p style="margin: 0 0 20px;">We look forward to celebrating with you!</p>' :
                '<p style="margin: 0 0 20px;">We\'re sorry you won\'t be able to join us, but we appreciate you letting us know.</p>'}
                <p style="margin: 0 0 20px;">If you need to make any changes to your RSVP, you can do so at any time:</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Button -->
      <tr>
        <td style="background-color: #ffffff; padding: 0 30px 40px;">
          <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: auto;">
            <tr>
              <td class="button-td" style="border-radius: 50px; background: linear-gradient(135deg, #ff9800 0%, #e65100 100%); box-shadow: 0 4px 10px rgba(246,142,31,0.3);">
                <a href="https://elibarkin.com/rsvp.html?name=${encodeURIComponent(rsvpData.name)}" class="button-a" style="background: linear-gradient(135deg, #ff9800 0%, #e65100 100%); border: 15px solid transparent; color: #ffffff; display: block; font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; line-height: 1.1; text-align: center; text-decoration: none; text-transform: uppercase; border-radius: 50px; letter-spacing: 0.5px; -webkit-text-size-adjust: none; mso-hide: all;">
                  Update Your RSVP
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Signature -->
      <tr>
        <td style="background-color: #ffffff; padding: 0 30px 40px; border-top: 1px solid #eeeeee;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333; font-style: italic; padding-top: 20px;">
                <p style="margin: 0;">Warm regards,<br>The Barkin Family</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background-color: #f5f5f5; padding: 20px; text-align: center; font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666666; border-top: 1px solid #eeeeee;">
          <p style="margin: 0 0 10px;">This email was sent regarding Eli's Be Mitzvah celebration on August 23, 2025.</p>
          <p style="margin: 0;"><a href="https://elibarkin.com" style="color: #1e88e5; text-decoration: none; font-weight: 500;">elibarkin.com</a></p>
        </td>
      </tr>
    </table>
    <!--[if mso | IE]>
    </td>
    </tr>
    </table>
    <![endif]-->
  </center>
</body>
</html>`
    };

    try {
      // Send the email
      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Confirmation email sent to:', rsvpData.email);
      console.log('Brevo API response:', response);
      return null;
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      return null;
    }
  });

/**
 * Cloud Function that sends a confirmation email when a guest updates their RSVP
 */
exports.sendRsvpUpdateConfirmation = functions.firestore
  .document('sheetRsvps/{rsvpId}')
  .onUpdate(async (change, context) => {
    // Get the before and after data
    const beforeData = change.before.data();
    const afterData = change.after.data();

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

    // If nothing significant changed, don't send an email
    if (!hasAttendanceChanged && !hasGuestCountChanged && !hasAdditionalGuestsChanged &&
        !hasAdultGuestsChanged && !hasChildGuestsChanged) {
      console.log('No significant changes detected in RSVP update, skipping email');
      return null;
    }

    // Determine guest information
    const isAttending = afterData.attending === 'yes';

    // Format guest count information
    let guestInfo = '';
    if (isAttending) {
      // Check if we have adult/child counts (new format)
      if (typeof afterData.adultCount === 'number' || typeof afterData.childCount === 'number') {
        const adultCount = afterData.adultCount || 0;
        const childCount = afterData.childCount || 0;
        const totalCount = adultCount + childCount;

        guestInfo = `<p>We have you down for ${totalCount} ${totalCount > 1 ? 'guests' : 'guest'} `;

        if (adultCount > 0 && childCount > 0) {
          guestInfo += `(${adultCount} adult${adultCount > 1 ? 's' : ''} and ${childCount} child${childCount > 1 ? 'ren' : ''}).`;
        } else if (adultCount > 0) {
          guestInfo += `(${adultCount} adult${adultCount > 1 ? 's' : ''}).`;
        } else if (childCount > 0) {
          guestInfo += `(${childCount} child${childCount > 1 ? 'ren' : ''}).`;
        }

        guestInfo += '</p>';
      } else {
        // Fall back to old format
        guestInfo = `<p>We have you down for ${afterData.guestCount || 1} ${afterData.guestCount > 1 ? 'guests' : 'guest'}.</p>`;
      }
    }

    // Get additional guests if any
    let additionalGuests = '';
    if (isAttending) {
      // Check if we have adult/child guests (new format)
      if (afterData.adultGuests && afterData.adultGuests.length > 0) {
        additionalGuests = `
          <p>Your party includes:</p>
          <ul style="padding-left: 20px;">
        `;

        // Add adult guests
        afterData.adultGuests.forEach(guest => {
          additionalGuests += `<li>${guest} (Adult)</li>`;
        });

        // Add child guests if any
        if (afterData.childGuests && afterData.childGuests.length > 0) {
          afterData.childGuests.forEach(guest => {
            additionalGuests += `<li>${guest} (Child)</li>`;
          });
        }

        additionalGuests += '</ul>';
      } else if (afterData.additionalGuests && afterData.additionalGuests.length > 0) {
        // Fall back to old format
        additionalGuests = `
          <p>Your party includes:</p>
          <ul style="padding-left: 20px;">
            <li>${afterData.name}</li>
            ${afterData.additionalGuests.map(guest => `<li>${guest}</li>`).join('')}
          </ul>
        `;
      }
    }

    // Highlight what changed
    let changesInfo = '<p><strong>You updated the following information:</strong></p><ul style="padding-left: 20px;">';

    if (hasAttendanceChanged) {
      changesInfo += `<li>Attendance: Changed from "${beforeData.attending === 'yes' ? 'Attending' : 'Not Attending'}" to "${afterData.attending === 'yes' ? 'Attending' : 'Not Attending'}"</li>`;
    }

    if (hasGuestCountChanged) {
      changesInfo += `<li>Guest Count: Changed from ${beforeData.guestCount || 1} to ${afterData.guestCount || 1}</li>`;
    }

    if (hasAdditionalGuestsChanged || hasAdultGuestsChanged || hasChildGuestsChanged) {
      changesInfo += '<li>Guest List: Your list of guests has been updated</li>';
    }

    changesInfo += '</ul>';

    // Configure Brevo API client
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = functions.config().brevo.key;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // Create the email
    const sendSmtpEmail = {
      sender: {
        email: 'rsvps@elibarkin.com',
        name: "Eli's Be Mitzvah"
      },
      to: [{ email: afterData.email }],
      subject: 'Your RSVP to Eli\'s Be Mitzvah Has Been Updated',
      htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eli's Be Mitzvah RSVP Update Confirmation</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style type="text/css">
    /* CLIENT-SPECIFIC STYLES */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; }

    /* RESET STYLES */
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }

    /* iOS BLUE LINKS */
    a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }

    /* GMAIL BLUE LINKS */
    u + #body a {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }

    /* SAMSUNG MAIL BLUE LINKS */
    #MessageViewBody a {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }

    /* Universal styles */
    body {
      font-family: 'Montserrat', Arial, sans-serif;
      background-color: #f8f9fa;
    }

    /* Media Queries */
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .fluid {
        max-width: 100% !important;
        height: auto !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }
      .stack-column,
      .stack-column-center {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        direction: ltr !important;
      }
      .stack-column-center {
        text-align: center !important;
      }
      .center-on-narrow {
        text-align: center !important;
        display: block !important;
        margin-left: auto !important;
        margin-right: auto !important;
        float: none !important;
      }
      table.center-on-narrow {
        display: inline-block !important;
      }
      .email-container p {
        font-size: 16px !important;
        line-height: 24px !important;
      }
    }
  </style>
</head>
<body width="100%" style="margin: 0; padding: 0 !important; background-color: #f8f9fa;" bgcolor="#f8f9fa">
  <center role="article" aria-roledescription="email" lang="en" style="width: 100%; background-color: #f8f9fa;">
    <!--[if mso | IE]>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f9fa;">
    <tr>
    <td>
    <![endif]-->

    <!-- Email Body -->
    <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" class="email-container">
      <!-- Header -->
      <tr>
        <td style="background: linear-gradient(135deg, #1e88e5 0%, #0d47a1 100%); padding: 30px 0; text-align: center;">
          <img src="https://elibarkin.com/logo.PNG" width="120" height="120" alt="Eli's Be Mitzvah" style="border-radius: 60px; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
          <h1 style="margin: 20px 0 0; color: #ffffff; font-family: 'Montserrat', Arial, sans-serif; font-size: 28px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            RSVP Updated
          </h1>
        </td>
      </tr>

      <!-- Accent bar -->
      <tr>
        <td style="background: linear-gradient(90deg, #ff9800, #e65100); height: 5px; line-height: 5px;">&nbsp;</td>
      </tr>

      <!-- Content -->
      <tr>
        <td style="background-color: #ffffff; padding: 40px 30px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">
                <p style="margin: 0 0 20px;">Dear ${afterData.name},</p>
                <p style="margin: 0 0 20px;">Your RSVP for Eli's Be Mitzvah celebration at Coors Field on August 23, 2025 has been successfully updated.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Changes Box -->
      <tr>
        <td style="background-color: #ffffff; padding: 0 30px 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fff9e6; border-radius: 8px; border-left: 4px solid #ff9800;">
            <tr>
              <td style="padding: 20px; font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">
                ${changesInfo}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- RSVP Details Box -->
      <tr>
        <td style="background-color: #ffffff; padding: 0 30px 30px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; border-radius: 8px; border-left: 4px solid #1e88e5;">
            <tr>
              <td style="padding: 20px; font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">
                <p style="margin: 0 0 10px;"><strong style="color: #0d47a1;">Your updated response:</strong> ${isAttending ? 'Attending' : 'Not Attending'}</p>
                ${guestInfo}
                ${additionalGuests}
                ${(() => {
                  if (isAttending && afterData.isOutOfTown) {
                    // Extract nested ternary operations
                    const fridayDinnerStatus = afterData.fridayDinner === 'yes' ? 'Attending' : 'Not Attending';
                    const sundayBrunchStatus = afterData.sundayBrunch === 'yes' ? 'Attending' : 'Not Attending';

                    return `
                    <p style="margin: 10px 0 0;"><strong style="color: #0d47a1;">Additional Events:</strong></p>
                    <ul style="margin: 5px 0 0; padding-left: 20px;">
                      <li>Friday Night Dinner at Linger: ${fridayDinnerStatus}</li>
                      <li>Sunday Brunch at Eli's home: ${sundayBrunchStatus}</li>
                    </ul>
                    `;
                  }
                  return '';
                })()}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Message -->
      <tr>
        <td style="background-color: #ffffff; padding: 0 30px 30px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">
                ${isAttending ?
                '<p style="margin: 0 0 20px;">We look forward to celebrating with you!</p>' :
                '<p style="margin: 0 0 20px;">We\'re sorry you won\'t be able to join us, but we appreciate you letting us know.</p>'}
                <p style="margin: 0 0 20px;">If you need to make any further changes to your RSVP, you can do so at any time:</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Button -->
      <tr>
        <td style="background-color: #ffffff; padding: 0 30px 40px;">
          <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: auto;">
            <tr>
              <td class="button-td" style="border-radius: 50px; background: linear-gradient(135deg, #ff9800 0%, #e65100 100%); box-shadow: 0 4px 10px rgba(246,142,31,0.3);">
                <a href="https://elibarkin.com/rsvp.html?name=${encodeURIComponent(afterData.name)}" class="button-a" style="background: linear-gradient(135deg, #ff9800 0%, #e65100 100%); border: 15px solid transparent; color: #ffffff; display: block; font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; line-height: 1.1; text-align: center; text-decoration: none; text-transform: uppercase; border-radius: 50px; letter-spacing: 0.5px; -webkit-text-size-adjust: none; mso-hide: all;">
                  Update Your RSVP
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Signature -->
      <tr>
        <td style="background-color: #ffffff; padding: 0 30px 40px; border-top: 1px solid #eeeeee;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333; font-style: italic; padding-top: 20px;">
                <p style="margin: 0;">Warm regards,<br>The Barkin Family</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background-color: #f5f5f5; padding: 20px; text-align: center; font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666666; border-top: 1px solid #eeeeee;">
          <p style="margin: 0 0 10px;">This email was sent regarding Eli's Be Mitzvah celebration on August 23, 2025.</p>
          <p style="margin: 0;"><a href="https://elibarkin.com" style="color: #1e88e5; text-decoration: none; font-weight: 500;">elibarkin.com</a></p>
        </td>
      </tr>
    </table>
    <!--[if mso | IE]>
    </td>
    </tr>
    </table>
    <![endif]-->
  </center>
</body>
</html>`
    };

    try {
      // Send the email
      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Update confirmation email sent to:', afterData.email);
      console.log('Brevo API response:', response);
      return null;
    } catch (error) {
      console.error('Error sending update confirmation email:', error);
      return null;
    }
  });

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

/**
 * Initialize API keys with the provided values
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

    // Check if API keys already exist
    const doc = await apiKeysRef.get();
    if (doc.exists) {
      console.log('API keys already initialized, skipping');
      return { success: true, message: 'API keys already initialized' };
    }

    // Initialize with placeholder values - real values should be set via Firebase CLI secrets
    await apiKeysRef.set({
      github: '[GITHUB_TOKEN_PLACEHOLDER]',
      googleAnalytics: {
        viewId: null,
        clientId: '[GOOGLE_CLIENT_ID_PLACEHOLDER]',
        clientSecret: '[GOOGLE_CLIENT_SECRET_PLACEHOLDER]'
      },
      cloudflare: {
        email: null,
        apiKey: '[CLOUDFLARE_API_KEY_PLACEHOLDER]',
        zoneId: null
      },
      brevo: '[BREVO_API_KEY_PLACEHOLDER]',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid
    });

    return { success: true, message: 'API keys initialized successfully' };
  } catch (error) {
    console.error('Error initializing API keys:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error initializing API keys. Please try again.'
    );
  }
});

/**
 * Cloud Function to retrieve API keys
 */
exports.getApiKeys = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to retrieve API keys.'
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
    console.error('Error retrieving API keys:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error retrieving API keys. Please try again.'
    );
  }
});

exports.updateGuestListSheet = functions.firestore
  .document('sheetRsvps/{rsvpId}')
  .onCreate(async (snapshot, context) => {
    try {
      // Get the RSVP data
      const rsvpData = snapshot.data();

      // Format the date
      const submittedDate = rsvpData.submittedAt ?
        new Date(rsvpData.submittedAt.toDate()).toLocaleString() :
        new Date().toLocaleString();

      // Format additional guests as a comma-separated list
      const additionalGuestsText = rsvpData.additionalGuests && rsvpData.additionalGuests.length > 0 ?
        rsvpData.additionalGuests.join(', ') : '';

      // Get the service account credentials from environment
      const serviceAccountCredentials = functions.config().sheets.credentials;

      // Use the guest list sheet ID (hardcoded to ensure it's correct)
      const guestListSheetId = "1e9ejByxnDLAMi_gJPiSQyiRbHougbzwLFeH6GNLjAnk";

      // Set up Google Sheets authentication
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountCredentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const client = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: client });

      // First, get the sheet data to find the matching guest
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: guestListSheetId,
        range: 'Sheet1!A:H', // Get all rows from columns A-H
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        console.log('No data found in the guest list sheet');
        return null;
      }

      // Find the row with the matching name
      let rowIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        // Check if the name in column A matches the RSVP name
        // Note: We're doing a case-insensitive comparison and trimming whitespace
        if (rows[i][0] && rows[i][0].trim().toLowerCase() === rsvpData.name.trim().toLowerCase()) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex === -1) {
        console.log('No matching guest found in the sheet for:', rsvpData.name);
        return null;
      }

      console.log(`Found matching guest at row ${rowIndex + 1} for: ${rsvpData.name}`);

      // Check if we need to add RSVP columns
      // First, get the sheet metadata to see what columns exist
      const sheetMetadata = await sheets.spreadsheets.get({
        spreadsheetId: guestListSheetId,
        ranges: ['Sheet1!1:1'], // Get the header row
        includeGridData: true,
      });

      const headerRow = sheetMetadata.data.sheets[0].data[0].rowData[0].values || [];
      const headerValues = headerRow.map(cell => cell.formattedValue || '');

      // Define the RSVP columns we want to add if they don't exist
      const rsvpColumns = [
        'RSVP Status', 'Email', 'Phone', 'Guest Count', 'Additional Guests', 'Submitted At'
      ];

      // Check if we need to add these columns
      let columnsToAdd = [];
      for (const column of rsvpColumns) {
        if (!headerValues.includes(column)) {
          columnsToAdd.push(column);
        }
      }

      // If we need to add columns, update the header row
      if (columnsToAdd.length > 0) {
        console.log('Adding RSVP columns to the sheet:', columnsToAdd);

        // Add the new columns to the header row
        await sheets.spreadsheets.values.update({
          spreadsheetId: guestListSheetId,
          range: `Sheet1!${String.fromCharCode(65 + headerValues.length)}1:${String.fromCharCode(65 + headerValues.length + columnsToAdd.length - 1)}1`,
          valueInputOption: 'RAW',
          resource: {
            values: [columnsToAdd]
          }
        });
      }

      // Now get the updated header row to find the column indices
      const updatedHeaderResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: guestListSheetId,
        range: 'Sheet1!1:1', // Get the header row
      });

      const updatedHeaderValues = updatedHeaderResponse.data.values[0] || [];

      // Find the column indices for each RSVP field
      const rsvpStatusIndex = updatedHeaderValues.indexOf('RSVP Status');
      const emailIndex = updatedHeaderValues.indexOf('Email');
      const phoneIndex = updatedHeaderValues.indexOf('Phone');
      const guestCountIndex = updatedHeaderValues.indexOf('Guest Count');
      const additionalGuestsIndex = updatedHeaderValues.indexOf('Additional Guests');
      const submittedAtIndex = updatedHeaderValues.indexOf('Submitted At');

      // Prepare the RSVP data to update
      const rsvpUpdateData = [];
      for (let i = 0; i < updatedHeaderValues.length; i++) {
        if (i === rsvpStatusIndex) {
          rsvpUpdateData.push(rsvpData.attending === 'yes' ? 'Attending' : 'Not Attending');
        } else if (i === emailIndex) {
          rsvpUpdateData.push(rsvpData.email || '');
        } else if (i === phoneIndex) {
          rsvpUpdateData.push(rsvpData.phone || '');
        } else if (i === guestCountIndex) {
          rsvpUpdateData.push(rsvpData.guestCount || 1);
        } else if (i === additionalGuestsIndex) {
          rsvpUpdateData.push(additionalGuestsText);
        } else if (i === submittedAtIndex) {
          rsvpUpdateData.push(submittedDate);
        } else if (i >= 8) { // Only add values for columns after the original 8 columns
          rsvpUpdateData.push(''); // Add empty values for other columns
        }
      }

      // Update the guest's row with the RSVP data
      if (rsvpUpdateData.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: guestListSheetId,
          range: `Sheet1!${String.fromCharCode(65 + 8)}${rowIndex + 1}:${String.fromCharCode(65 + 8 + rsvpUpdateData.length - 1)}${rowIndex + 1}`,
          valueInputOption: 'RAW',
          resource: {
            values: [rsvpUpdateData]
          }
        });

        console.log('Updated guest list sheet with RSVP data for:', rsvpData.name);
      }

      return null;
    } catch (error) {
      console.error('Error updating guest list sheet with RSVP data:', error);
      return null;
    }
  });
