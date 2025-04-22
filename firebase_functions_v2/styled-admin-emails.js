const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Define secrets for Gmail and admin email
const gmailEmail = defineSecret('GMAIL_EMAIL');
const gmailPassword = defineSecret('GMAIL_PASSWORD');
const adminEmail = defineSecret('ADMIN_EMAIL');

/**
 * Send styled admin notification emails for different RSVP actions
 */
exports.sendStyledAdminNotificationV2 = onDocumentWritten({
  document: 'sheetRsvps/{rsvpId}',
  minInstances: 0,
  maxInstances: 10,
  memory: '256MiB',
  timeoutSeconds: 60,
  region: 'us-central1',
  secrets: [gmailEmail, gmailPassword, adminEmail]
}, async (event) => {
  const change = event.data;
  if (!change) return null;

  try {
    // Get the RSVP data
    const rsvpData = change.after.exists ? change.after.data() : null;
    const previousData = change.before.exists ? change.before.data() : null;
    const rsvpId = event.params.rsvpId;

    // Determine the action type
    const isCreate = !change.before.exists && change.after.exists;
    const isUpdate = change.before.exists && change.after.exists;
    const isDelete = change.before.exists && !change.after.exists;

    // If it's a delete, we don't need to send an email
    if (isDelete) {
      return null;
    }

    // Get the admin email from secrets
    const adminEmailValue = adminEmail.value() || 'jacobsamuelbarkin@gmail.com';

    // Create email transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailEmail.value().trim().replace(/[\r\n]+/g, ''),
        pass: gmailPassword.value().trim().replace(/[\r\n]+/g, '')
      }
    });

    console.log('Using Gmail email:', gmailEmail.value().trim().substring(0, 5) + '...');

    // Determine if this is an out-of-town guest
    const isOutOfTown = rsvpData.isOutOfTown === true;

    // Determine if they're attending
    const isAttending = rsvpData.attending === 'yes';

    // Determine the email subject based on action type and guest type
    let subject = '';
    if (isCreate) {
      subject = `New RSVP: ${rsvpData.name} ${isAttending ? 'is attending' : 'is not attending'}`;
      if (isOutOfTown) {
        subject = `New Out-of-Town RSVP: ${rsvpData.name} ${isAttending ? 'is attending' : 'is not attending'}`;
      }
    } else if (isUpdate) {
      subject = `RSVP Updated: ${rsvpData.name} ${isAttending ? 'is attending' : 'is not attending'}`;
      if (isOutOfTown) {
        subject = `Out-of-Town RSVP Updated: ${rsvpData.name} ${isAttending ? 'is attending' : 'is not attending'}`;
      }
    }

    // Format the date
    const submittedDate = rsvpData.submittedAt ?
      new Date(rsvpData.submittedAt.toDate()).toLocaleString() :
      new Date().toLocaleString();

    // Format additional guests
    const additionalGuests = rsvpData.additionalGuests || [];
    const additionalGuestsHtml = additionalGuests.length > 0 ?
      `<ul style="margin: 5px 0 15px; padding-left: 20px;">
        ${additionalGuests.map(guest => `<li style="margin-bottom: 5px;">${guest}</li>`).join('')}
      </ul>` :
      '<p style="margin: 5px 0 15px;">None</p>';

    // Determine changes if this is an update
    let changesHtml = '';
    if (isUpdate) {
      const changes = [];

      // Check for changes in attendance
      if (rsvpData.attending !== previousData.attending) {
        changes.push(`<li>Attendance: ${previousData.attending === 'yes' ? 'Attending' : 'Not Attending'} → ${rsvpData.attending === 'yes' ? 'Attending' : 'Not Attending'}</li>`);
      }

      // Check for changes in guest count
      if (rsvpData.guestCount !== previousData.guestCount) {
        changes.push(`<li>Guest Count: ${previousData.guestCount || 1} → ${rsvpData.guestCount || 1}</li>`);
      }

      // Check for changes in additional guests
      const prevGuests = previousData.additionalGuests || [];
      const newGuests = rsvpData.additionalGuests || [];
      if (JSON.stringify(prevGuests) !== JSON.stringify(newGuests)) {
        changes.push(`<li>Additional Guests: Changed</li>`);
      }

      // Check for changes in out-of-town event attendance
      if (isOutOfTown) {
        if (rsvpData.fridayDinner !== previousData.fridayDinner) {
          changes.push(`<li>Friday Dinner: ${previousData.fridayDinner === 'yes' ? 'Attending' : 'Not Attending'} → ${rsvpData.fridayDinner === 'yes' ? 'Attending' : 'Not Attending'}</li>`);
        }

        if (rsvpData.sundayBrunch !== previousData.sundayBrunch) {
          changes.push(`<li>Sunday Brunch: ${previousData.sundayBrunch === 'yes' ? 'Attending' : 'Not Attending'} → ${rsvpData.sundayBrunch === 'yes' ? 'Attending' : 'Not Attending'}</li>`);
        }
      }

      if (changes.length > 0) {
        changesHtml = `
          <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #0d47a1; border-radius: 4px;">
            <h3 style="margin-top: 0; color: #0d47a1; font-size: 16px;">Changes Made:</h3>
            <ul style="margin: 10px 0 0; padding-left: 20px;">
              ${changes.join('')}
            </ul>
          </div>
        `;
      }
    }

    // Create the email HTML content based on the action type and guest type
    let htmlContent = '';

    // Base template for all emails
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${subject}</title>
      </head>
      <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://elibarkin.com/images/logo.png" alt="Eli's Bar Mitzvah Logo" style="max-width: 200px; margin-bottom: 20px;">
          <h1 style="color: #0d47a1; margin-bottom: 5px; font-size: 24px;">${subject}</h1>
          <p style="color: #666; font-size: 16px;">${submittedDate}</p>
        </div>

        <!-- Content will be inserted here -->
        {{CONTENT}}

        <div style="margin-top: 40px; text-align: center; font-size: 14px; color: #666; border-top: 1px solid #e0e0e0; padding-top: 20px;">
          <p>This is an automated notification from the Eli Barkin Bar Mitzvah website.</p>
          <p>May 17, 2024 | Denver, Colorado</p>
          <a href="https://elibarkin.com/rsvp-dashboard.html" style="display: inline-block; background-color: #0d47a1; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; margin-top: 15px; font-weight: bold;">View RSVP Dashboard</a>
        </div>
      </body>
      </html>
    `;

    // Content for new RSVP
    if (isCreate) {
      const newRsvpContent = `
        <div style="background-color: ${isAttending ? '#e8f5e9' : '#ffebee'}; border-left: 4px solid ${isAttending ? '#4caf50' : '#f44336'}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <h2 style="margin-top: 0; color: ${isAttending ? '#2e7d32' : '#c62828'}; font-size: 18px;">
            ${rsvpData.name} ${isAttending ? 'will be attending' : 'will not be attending'} Eli's Bar Mitzvah
          </h2>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="color: #0d47a1; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; font-size: 18px;">Guest Information</h3>

          <div style="display: flex; margin-bottom: 10px;">
            <div style="width: 150px; font-weight: bold;">Name:</div>
            <div>${rsvpData.name}</div>
          </div>

          <div style="display: flex; margin-bottom: 10px;">
            <div style="width: 150px; font-weight: bold;">Email:</div>
            <div>${rsvpData.email || 'Not provided'}</div>
          </div>

          <div style="display: flex; margin-bottom: 10px;">
            <div style="width: 150px; font-weight: bold;">Phone:</div>
            <div>${rsvpData.phone || 'Not provided'}</div>
          </div>

          <div style="display: flex; margin-bottom: 10px;">
            <div style="width: 150px; font-weight: bold;">Attending:</div>
            <div>
              <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 14px; font-weight: bold; background-color: ${isAttending ? '#e8f5e9' : '#ffebee'}; color: ${isAttending ? '#2e7d32' : '#c62828'};">
                ${isAttending ? 'Yes' : 'No'}
              </span>
            </div>
          </div>

          ${isAttending ? `
          <div style="display: flex; margin-bottom: 10px;">
            <div style="width: 150px; font-weight: bold;">Guest Count:</div>
            <div>${rsvpData.guestCount || 1}</div>
          </div>

          <div style="display: flex; margin-bottom: 10px;">
            <div style="width: 150px; font-weight: bold;">Additional Guests:</div>
            <div style="flex: 1;">${additionalGuestsHtml}</div>
          </div>
          ` : ''}

          ${isOutOfTown && isAttending ? `
          <div style="margin-top: 20px; background-color: #fff8e1; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px;">
            <h3 style="margin-top: 0; color: #f57c00; font-size: 16px;">Out-of-Town Guest Events</h3>

            <div style="display: flex; margin-bottom: 10px;">
              <div style="width: 150px; font-weight: bold;">Friday Dinner:</div>
              <div>
                <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 14px; font-weight: bold; background-color: ${rsvpData.fridayDinner === 'yes' ? '#e8f5e9' : '#ffebee'}; color: ${rsvpData.fridayDinner === 'yes' ? '#2e7d32' : '#c62828'};">
                  ${rsvpData.fridayDinner === 'yes' ? 'Attending' : 'Not Attending'}
                </span>
              </div>
            </div>

            <div style="display: flex; margin-bottom: 10px;">
              <div style="width: 150px; font-weight: bold;">Sunday Brunch:</div>
              <div>
                <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 14px; font-weight: bold; background-color: ${rsvpData.sundayBrunch === 'yes' ? '#e8f5e9' : '#ffebee'}; color: ${rsvpData.sundayBrunch === 'yes' ? '#2e7d32' : '#c62828'};">
                  ${rsvpData.sundayBrunch === 'yes' ? 'Attending' : 'Not Attending'}
                </span>
              </div>
            </div>
          </div>
          ` : ''}
        </div>
      `;

      htmlContent = baseTemplate.replace('{{CONTENT}}', newRsvpContent);
    }
    // Content for updated RSVP
    else if (isUpdate) {
      const updatedRsvpContent = `
        <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <h2 style="margin-top: 0; color: #0d47a1; font-size: 18px;">
            ${rsvpData.name} has updated their RSVP
          </h2>
        </div>

        ${changesHtml}

        <div style="margin-bottom: 20px;">
          <h3 style="color: #0d47a1; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; font-size: 18px;">Current Information</h3>

          <div style="display: flex; margin-bottom: 10px;">
            <div style="width: 150px; font-weight: bold;">Name:</div>
            <div>${rsvpData.name}</div>
          </div>

          <div style="display: flex; margin-bottom: 10px;">
            <div style="width: 150px; font-weight: bold;">Email:</div>
            <div>${rsvpData.email || 'Not provided'}</div>
          </div>

          <div style="display: flex; margin-bottom: 10px;">
            <div style="width: 150px; font-weight: bold;">Phone:</div>
            <div>${rsvpData.phone || 'Not provided'}</div>
          </div>

          <div style="display: flex; margin-bottom: 10px;">
            <div style="width: 150px; font-weight: bold;">Attending:</div>
            <div>
              <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 14px; font-weight: bold; background-color: ${isAttending ? '#e8f5e9' : '#ffebee'}; color: ${isAttending ? '#2e7d32' : '#c62828'};">
                ${isAttending ? 'Yes' : 'No'}
              </span>
            </div>
          </div>

          ${isAttending ? `
          <div style="display: flex; margin-bottom: 10px;">
            <div style="width: 150px; font-weight: bold;">Guest Count:</div>
            <div>${rsvpData.guestCount || 1}</div>
          </div>

          <div style="display: flex; margin-bottom: 10px;">
            <div style="width: 150px; font-weight: bold;">Additional Guests:</div>
            <div style="flex: 1;">${additionalGuestsHtml}</div>
          </div>
          ` : ''}

          ${isOutOfTown && isAttending ? `
          <div style="margin-top: 20px; background-color: #fff8e1; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px;">
            <h3 style="margin-top: 0; color: #f57c00; font-size: 16px;">Out-of-Town Guest Events</h3>

            <div style="display: flex; margin-bottom: 10px;">
              <div style="width: 150px; font-weight: bold;">Friday Dinner:</div>
              <div>
                <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 14px; font-weight: bold; background-color: ${rsvpData.fridayDinner === 'yes' ? '#e8f5e9' : '#ffebee'}; color: ${rsvpData.fridayDinner === 'yes' ? '#2e7d32' : '#c62828'};">
                  ${rsvpData.fridayDinner === 'yes' ? 'Attending' : 'Not Attending'}
                </span>
              </div>
            </div>

            <div style="display: flex; margin-bottom: 10px;">
              <div style="width: 150px; font-weight: bold;">Sunday Brunch:</div>
              <div>
                <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 14px; font-weight: bold; background-color: ${rsvpData.sundayBrunch === 'yes' ? '#e8f5e9' : '#ffebee'}; color: ${rsvpData.sundayBrunch === 'yes' ? '#2e7d32' : '#c62828'};">
                  ${rsvpData.sundayBrunch === 'yes' ? 'Attending' : 'Not Attending'}
                </span>
              </div>
            </div>
          </div>
          ` : ''}
        </div>
      `;

      htmlContent = baseTemplate.replace('{{CONTENT}}', updatedRsvpContent);
    }

    // Send the email
    const mailOptions = {
      from: '"Eli\'s Bar Mitzvah" <noreply@elibarkin.com>',
      to: adminEmailValue,
      subject: subject,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);

    // Log the email
    await admin.firestore().collection('emailLogs').add({
      type: 'admin-notification',
      recipient: adminEmailValue,
      subject: subject,
      rsvpId: rsvpId,
      guestName: rsvpData.name,
      isOutOfTown: isOutOfTown,
      isAttending: isAttending,
      isCreate: isCreate,
      isUpdate: isUpdate,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return null;
  } catch (error) {
    console.error('Error sending styled admin notification:', error);
    return null;
  }
});
