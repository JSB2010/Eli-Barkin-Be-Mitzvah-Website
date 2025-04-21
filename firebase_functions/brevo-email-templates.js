/**
 * Brevo Email Templates with improved styling
 * This file contains templates for all Brevo emails sent from the system
 */

// Common email styles for all templates
const emailStyles = `
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
`;

// RSVP Confirmation Email Template
exports.getRsvpConfirmationTemplate = function(rsvpData) {
  // Determine guest information
  const isAttending = rsvpData.attending === 'yes';
  const isOutOfTown = rsvpData.isOutOfTown === true;

  // Format guest count information
  let guestInfo = '';
  if (isAttending) {
    // Check if we have adult/child counts (new format)
    if (typeof rsvpData.adultCount === 'number' || typeof rsvpData.childCount === 'number') {
      const adultCount = rsvpData.adultCount || 0;
      const childCount = rsvpData.childCount || 0;
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
      guestInfo = `<p>We have you down for ${rsvpData.guestCount || 1} ${rsvpData.guestCount > 1 ? 'guests' : 'guest'}.</p>`;
    }
  }

  // Get additional guests if any
  let additionalGuests = '';
  if (isAttending) {
    // Check if we have adult/child guests (new format)
    if (rsvpData.adultGuests && rsvpData.adultGuests.length > 0) {
      additionalGuests = `
        <p>Your party includes:</p>
        <ul style="padding-left: 20px;">
      `;

      // Add adult guests
      rsvpData.adultGuests.forEach(guest => {
        additionalGuests += `<li>${guest} (Adult)</li>`;
      });

      // Add child guests if any
      if (rsvpData.childGuests && rsvpData.childGuests.length > 0) {
        rsvpData.childGuests.forEach(guest => {
          additionalGuests += `<li>${guest} (Child)</li>`;
        });
      }

      additionalGuests += '</ul>';
    } else if (rsvpData.additionalGuests && rsvpData.additionalGuests.length > 0) {
      // Fall back to old format
      additionalGuests = `
        <p>Your party includes:</p>
        <ul style="padding-left: 20px;">
          <li>${rsvpData.name}</li>
          ${rsvpData.additionalGuests.map(guest => `<li>${guest}</li>`).join('')}
        </ul>
      `;
    }
  }

  // Get the guest's first name
  const firstName = rsvpData.name.split(' ')[0];

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eli's Bar Mitzvah RSVP Confirmation</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style type="text/css">
    ${emailStyles}
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
          <img src="https://elibarkin.com/images/logo.png" width="120" height="120" alt="Eli's Bar Mitzvah" style="border-radius: 60px; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
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
                <p style="margin: 0 0 20px;">Dear ${firstName},</p>
                <p style="margin: 0 0 20px;">We've received your RSVP for Eli's Bar Mitzvah celebration on May 17, 2025.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- RSVP Details Box -->
      <tr>
        <td style="background-color: #ffffff; padding: 0 30px 30px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; border-radius: 8px; border-left: 4px solid ${isAttending ? '#4caf50' : '#f44336'};">
            <tr>
              <td style="padding: 20px; font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">
                <p style="margin: 0 0 10px;"><strong style="color: #0d47a1;">Your response:</strong>
                  <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 14px; font-weight: bold; background-color: ${isAttending ? '#e8f5e9' : '#ffebee'}; color: ${isAttending ? '#2e7d32' : '#c62828'};">
                    ${isAttending ? 'Attending' : 'Not Attending'}
                  </span>
                </p>
                ${guestInfo}
                ${additionalGuests}
                ${isAttending && isOutOfTown ? `
                <p style="margin: 10px 0 0;"><strong style="color: #0d47a1;">Additional Events:</strong></p>
                <ul style="margin: 5px 0 0; padding-left: 20px;">
                  <li>Friday Night Dinner at Linger:
                    <span style="display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 12px; font-weight: bold; background-color: ${rsvpData.fridayDinner === 'yes' ? '#e8f5e9' : '#ffebee'}; color: ${rsvpData.fridayDinner === 'yes' ? '#2e7d32' : '#c62828'};">
                      ${rsvpData.fridayDinner === 'yes' ? 'Attending' : 'Not Attending'}
                    </span>
                  </li>
                  <li>Sunday Brunch at Eli's home:
                    <span style="display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 12px; font-weight: bold; background-color: ${rsvpData.sundayBrunch === 'yes' ? '#e8f5e9' : '#ffebee'}; color: ${rsvpData.sundayBrunch === 'yes' ? '#2e7d32' : '#c62828'};">
                      ${rsvpData.sundayBrunch === 'yes' ? 'Attending' : 'Not Attending'}
                    </span>
                  </li>
                </ul>
                ` : ''}
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
              <td class="button-td" style="border-radius: 50px; background: linear-gradient(135deg, #1e88e5 0%, #0d47a1 100%); box-shadow: 0 4px 10px rgba(13,71,161,0.3);">
                <a href="https://elibarkin.com/rsvp.html?name=${encodeURIComponent(rsvpData.name)}" class="button-a" style="background: linear-gradient(135deg, #1e88e5 0%, #0d47a1 100%); border: 15px solid transparent; color: #ffffff; display: block; font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; line-height: 1.1; text-align: center; text-decoration: none; text-transform: uppercase; border-radius: 50px; letter-spacing: 0.5px; -webkit-text-size-adjust: none; mso-hide: all;">
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
          <p style="margin: 0 0 10px;">This email was sent regarding Eli's Bar Mitzvah celebration on May 17, 2025.</p>
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
</html>`;
};

// RSVP Update Confirmation Email Template
exports.getRsvpUpdateTemplate = function(beforeData, afterData) {
  // Determine guest information
  const isAttending = afterData.attending === 'yes';
  const isOutOfTown = afterData.isOutOfTown === true;

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
  const hasAttendanceChanged = beforeData.attending !== afterData.attending;
  const hasGuestCountChanged = beforeData.guestCount !== afterData.guestCount;
  const hasAdditionalGuestsChanged = JSON.stringify(beforeData.additionalGuests || []) !==
                                  JSON.stringify(afterData.additionalGuests || []);
  const hasAdultGuestsChanged = JSON.stringify(beforeData.adultGuests || []) !==
                             JSON.stringify(afterData.adultGuests || []);
  const hasChildGuestsChanged = JSON.stringify(beforeData.childGuests || []) !==
                             JSON.stringify(afterData.childGuests || []);

  // Out-of-town event changes
  const hasFridayDinnerChanged = isOutOfTown && beforeData.fridayDinner !== afterData.fridayDinner;
  const hasSundayBrunchChanged = isOutOfTown && beforeData.sundayBrunch !== afterData.sundayBrunch;

  let changesInfo = '<div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin-bottom: 20px; border-radius: 4px;">';
  changesInfo += '<h3 style="margin-top: 0; color: #0d47a1; font-size: 16px;">You updated the following information:</h3>';
  changesInfo += '<ul style="margin: 10px 0 0; padding-left: 20px;">';

  if (hasAttendanceChanged) {
    changesInfo += `<li>Attendance: Changed from "${beforeData.attending === 'yes' ? 'Attending' : 'Not Attending'}" to "${afterData.attending === 'yes' ? 'Attending' : 'Not Attending'}"</li>`;
  }

  if (hasGuestCountChanged) {
    changesInfo += `<li>Guest Count: Changed from ${beforeData.guestCount || 1} to ${afterData.guestCount || 1}</li>`;
  }

  if (hasAdditionalGuestsChanged || hasAdultGuestsChanged || hasChildGuestsChanged) {
    changesInfo += '<li>Guest List: Your list of guests has been updated</li>';
  }

  if (hasFridayDinnerChanged) {
    changesInfo += `<li>Friday Night Dinner: Changed from "${beforeData.fridayDinner === 'yes' ? 'Attending' : 'Not Attending'}" to "${afterData.fridayDinner === 'yes' ? 'Attending' : 'Not Attending'}"</li>`;
  }

  if (hasSundayBrunchChanged) {
    changesInfo += `<li>Sunday Brunch: Changed from "${beforeData.sundayBrunch === 'yes' ? 'Attending' : 'Not Attending'}" to "${afterData.sundayBrunch === 'yes' ? 'Attending' : 'Not Attending'}"</li>`;
  }

  changesInfo += '</ul></div>';

  // Get the guest's first name
  const firstName = afterData.name.split(' ')[0];

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eli's Bar Mitzvah RSVP Update Confirmation</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style type="text/css">
    ${emailStyles}
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
          <img src="https://elibarkin.com/images/logo.png" width="120" height="120" alt="Eli's Bar Mitzvah" style="border-radius: 60px; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
          <h1 style="margin: 20px 0 0; color: #ffffff; font-family: 'Montserrat', Arial, sans-serif; font-size: 28px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            Your RSVP Has Been Updated
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
                <p style="margin: 0 0 20px;">Dear ${firstName},</p>
                <p style="margin: 0 0 20px;">Your RSVP for Eli's Bar Mitzvah celebration on May 17, 2025 has been successfully updated.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Changes Info -->
      <tr>
        <td style="background-color: #ffffff; padding: 0 30px 30px;">
          ${changesInfo}
        </td>
      </tr>

      <!-- RSVP Details Box -->
      <tr>
        <td style="background-color: #ffffff; padding: 0 30px 30px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; border-radius: 8px; border-left: 4px solid ${isAttending ? '#4caf50' : '#f44336'};">
            <tr>
              <td style="padding: 20px; font-family: 'Montserrat', Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">
                <p style="margin: 0 0 10px;"><strong style="color: #0d47a1;">Your current response:</strong>
                  <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 14px; font-weight: bold; background-color: ${isAttending ? '#e8f5e9' : '#ffebee'}; color: ${isAttending ? '#2e7d32' : '#c62828'};">
                    ${isAttending ? 'Attending' : 'Not Attending'}
                  </span>
                </p>
                ${guestInfo}
                ${additionalGuests}
                ${isAttending && isOutOfTown ? `
                <p style="margin: 10px 0 0;"><strong style="color: #0d47a1;">Additional Events:</strong></p>
                <ul style="margin: 5px 0 0; padding-left: 20px;">
                  <li>Friday Night Dinner at Linger:
                    <span style="display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 12px; font-weight: bold; background-color: ${afterData.fridayDinner === 'yes' ? '#e8f5e9' : '#ffebee'}; color: ${afterData.fridayDinner === 'yes' ? '#2e7d32' : '#c62828'};">
                      ${afterData.fridayDinner === 'yes' ? 'Attending' : 'Not Attending'}
                    </span>
                  </li>
                  <li>Sunday Brunch at Eli's home:
                    <span style="display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 12px; font-weight: bold; background-color: ${afterData.sundayBrunch === 'yes' ? '#e8f5e9' : '#ffebee'}; color: ${afterData.sundayBrunch === 'yes' ? '#2e7d32' : '#c62828'};">
                      ${afterData.sundayBrunch === 'yes' ? 'Attending' : 'Not Attending'}
                    </span>
                  </li>
                </ul>
                ` : ''}
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
                <p style="margin: 0 0 20px;">If you need to make any additional changes to your RSVP, you can do so at any time:</p>
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
              <td class="button-td" style="border-radius: 50px; background: linear-gradient(135deg, #1e88e5 0%, #0d47a1 100%); box-shadow: 0 4px 10px rgba(13,71,161,0.3);">
                <a href="https://elibarkin.com/rsvp.html?name=${encodeURIComponent(afterData.name)}" class="button-a" style="background: linear-gradient(135deg, #1e88e5 0%, #0d47a1 100%); border: 15px solid transparent; color: #ffffff; display: block; font-family: 'Montserrat', Arial, sans-serif; font-size: 14px; font-weight: 600; line-height: 1.1; text-align: center; text-decoration: none; text-transform: uppercase; border-radius: 50px; letter-spacing: 0.5px; -webkit-text-size-adjust: none; mso-hide: all;">
                  Update Your RSVP Again
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
          <p style="margin: 0 0 10px;">This email was sent regarding Eli's Bar Mitzvah celebration on May 17, 2025.</p>
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
</html>`;
};
