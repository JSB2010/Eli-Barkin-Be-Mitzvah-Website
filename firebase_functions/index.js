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

// Export guest list functions
exports.importGuestList = importGuestList;
exports.syncGuestToSheet = syncGuestToSheet;
exports.syncSheetChanges = syncSheetChanges;
exports.manualSyncSheetChanges = manualSyncSheetChanges;
exports.removeDuplicateGuests = removeDuplicateGuests;

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
    const guestInfo = isAttending
      ? `<p>We have you down for ${rsvpData.guestCount || 1} ${rsvpData.guestCount > 1 ? 'guests' : 'guest'}.</p>`
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
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');

            :root {
              --primary-blue: #1e88e5;
              --primary-orange: #ff9800;
              --dark-blue: #0d47a1;
              --light-blue: #bbdefb;
              --dark-orange: #e65100;
              --light-orange: #ffe0b2;
              --white: #ffffff;
              --light-gray: #f5f5f5;
              --dark-gray: #333333;
            }

            body {
              font-family: 'Montserrat', sans-serif;
              line-height: 1.6;
              color: var(--dark-gray);
              max-width: 600px;
              margin: 0 auto;
              background-color: #f9f9f9;
            }

            .email-container {
              background-color: var(--white);
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
              margin: 20px auto;
            }

            .header {
              background: linear-gradient(135deg, var(--primary-blue) 0%, var(--dark-blue) 100%);
              color: var(--white);
              padding: 30px 20px;
              text-align: center;
              position: relative;
            }

            .header::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 5px;
              background: linear-gradient(90deg, var(--primary-orange), var(--dark-orange));
            }

            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            .content {
              padding: 30px;
              background-color: var(--white);
            }

            .content p {
              margin-bottom: 15px;
              font-size: 16px;
            }

            .details {
              background-color: var(--light-gray);
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid var(--primary-blue);
            }

            .details p {
              margin: 10px 0;
            }

            .details strong {
              color: var(--dark-blue);
              font-weight: 600;
            }

            .details ul {
              margin: 10px 0;
              padding-left: 25px;
            }

            .details li {
              margin-bottom: 5px;
            }

            .button-container {
              text-align: center;
              margin: 25px 0;
            }

            .button {
              display: inline-block;
              background: linear-gradient(135deg, var(--primary-orange) 0%, var(--dark-orange) 100%);
              color: var(--white);
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 50px;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 14px;
              letter-spacing: 0.5px;
              box-shadow: 0 4px 10px rgba(246, 142, 31, 0.3);
              transition: transform 0.3s ease, box-shadow 0.3s ease;
            }

            .button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 15px rgba(246, 142, 31, 0.4);
            }

            .footer {
              text-align: center;
              padding: 20px;
              background-color: var(--light-gray);
              color: var(--dark-gray);
              font-size: 14px;
              border-top: 1px solid #eee;
            }

            .footer a {
              color: var(--primary-blue);
              text-decoration: none;
              font-weight: 500;
              position: relative;
              transition: color 0.3s ease;
            }

            .footer a:hover {
              color: var(--primary-orange);
            }

            .footer a::after {
              content: '';
              position: absolute;
              bottom: -2px;
              left: 0;
              width: 100%;
              height: 1px;
              background-color: var(--primary-orange);
              transform: scaleX(0);
              transition: transform 0.3s ease;
            }

            .footer a:hover::after {
              transform: scaleX(1);
            }

            .logo {
              margin-bottom: 15px;
            }

            .logo img {
              max-height: 60px;
              border-radius: 5px;
            }

            .signature {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #eee;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>Thank You for Your RSVP!</h1>
            </div>
            <div class="content">
              <p>Dear ${rsvpData.name},</p>

              <p>We've received your RSVP for Eli's Be Mitzvah celebration at Coors Field on August 23, 2025.</p>

              <div class="details">
                <p><strong>Your response:</strong> ${isAttending ? 'Attending' : 'Not Attending'}</p>
                ${guestInfo}
                ${additionalGuests}
              </div>

              <p>${isAttending ? 'We look forward to celebrating with you!' : 'We\'re sorry you won\'t be able to join us, but we appreciate you letting us know.'}</p>

              <p>If you need to make any changes to your RSVP, you can do so at any time:</p>

              <div class="button-container">
                <a href="https://elibarkin.com/rsvp.html?name=${encodeURIComponent(rsvpData.name)}" class="button">Update Your RSVP</a>
              </div>

              <div class="signature">
                <p>Warm regards,<br>The Barkin Family</p>
              </div>
            </div>
            <div class="footer">
              <p>This email was sent regarding Eli's Be Mitzvah celebration on August 23, 2025.</p>
              <p><a href="https://elibarkin.com">elibarkin.com</a></p>
            </div>
          </div>
        </body>
        </html>
      `
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
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');

            :root {
              --primary-blue: #1e88e5;
              --primary-orange: #ff9800;
              --dark-blue: #0d47a1;
              --light-blue: #bbdefb;
              --dark-orange: #e65100;
              --light-orange: #ffe0b2;
              --white: #ffffff;
              --light-gray: #f5f5f5;
              --dark-gray: #333333;
            }

            body {
              font-family: 'Montserrat', sans-serif;
              line-height: 1.6;
              color: var(--dark-gray);
              max-width: 600px;
              margin: 0 auto;
              background-color: #f9f9f9;
            }

            .email-container {
              background-color: var(--white);
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
              margin: 20px auto;
            }

            .header {
              background: linear-gradient(135deg, var(--primary-blue) 0%, var(--dark-blue) 100%);
              color: var(--white);
              padding: 30px 20px;
              text-align: center;
              position: relative;
            }

            .header::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 5px;
              background: linear-gradient(90deg, var(--primary-orange), var(--dark-orange));
            }

            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            .content {
              padding: 30px;
              background-color: var(--white);
            }

            .content p {
              margin-bottom: 15px;
              font-size: 16px;
            }

            .details {
              background-color: var(--light-gray);
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid var(--primary-blue);
            }

            .changes {
              background-color: var(--light-orange);
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid var(--dark-orange);
            }

            .details p, .changes p {
              margin: 10px 0;
            }

            .details strong, .changes strong {
              color: var(--dark-blue);
              font-weight: 600;
            }

            .details ul, .changes ul {
              margin: 10px 0;
              padding-left: 25px;
            }

            .details li, .changes li {
              margin-bottom: 5px;
            }

            .button-container {
              text-align: center;
              margin: 25px 0;
            }

            .button {
              display: inline-block;
              background: linear-gradient(135deg, var(--primary-orange) 0%, var(--dark-orange) 100%);
              color: var(--white);
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 50px;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 14px;
              letter-spacing: 0.5px;
              box-shadow: 0 4px 10px rgba(246, 142, 31, 0.3);
              transition: transform 0.3s ease, box-shadow 0.3s ease;
            }

            .button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 15px rgba(246, 142, 31, 0.4);
            }

            .footer {
              text-align: center;
              padding: 20px;
              background-color: var(--light-gray);
              color: var(--dark-gray);
              font-size: 14px;
              border-top: 1px solid #eee;
            }

            .footer a {
              color: var(--primary-blue);
              text-decoration: none;
              font-weight: 500;
              position: relative;
              transition: color 0.3s ease;
            }

            .footer a:hover {
              color: var(--primary-orange);
            }

            .footer a::after {
              content: '';
              position: absolute;
              bottom: -2px;
              left: 0;
              width: 100%;
              height: 1px;
              background-color: var(--primary-orange);
              transform: scaleX(0);
              transition: transform 0.3s ease;
            }

            .footer a:hover::after {
              transform: scaleX(1);
            }

            .logo {
              margin-bottom: 15px;
            }

            .logo img {
              max-height: 60px;
              border-radius: 5px;
            }

            .signature {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #eee;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>RSVP Updated</h1>
            </div>
            <div class="content">
              <p>Dear ${afterData.name},</p>

              <p>Your RSVP for Eli's Be Mitzvah celebration at Coors Field on August 23, 2025 has been successfully updated.</p>

              <div class="changes">
                ${changesInfo}
              </div>

              <div class="details">
                <p><strong>Your updated response:</strong> ${isAttending ? 'Attending' : 'Not Attending'}</p>
                ${guestInfo}
                ${additionalGuests}
              </div>

              <p>${isAttending ? 'We look forward to celebrating with you!' : 'We\'re sorry you won\'t be able to join us, but we appreciate you letting us know.'}</p>

              <p>If you need to make any further changes to your RSVP, you can do so at any time:</p>

              <div class="button-container">
                <a href="https://elibarkin.com/rsvp.html?name=${encodeURIComponent(afterData.name)}" class="button">Update Your RSVP</a>
              </div>

              <div class="signature">
                <p>Warm regards,<br>The Barkin Family</p>
              </div>
            </div>
            <div class="footer">
              <p>This email was sent regarding Eli's Be Mitzvah celebration on August 23, 2025.</p>
              <p><a href="https://elibarkin.com">elibarkin.com</a></p>
            </div>
          </div>
        </body>
        </html>
      `
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
