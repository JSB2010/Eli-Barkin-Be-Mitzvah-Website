/**
 * Email templates for Brevo (formerly Sendinblue) API
 */

/**
 * Get the HTML template for RSVP confirmation emails
 * @param {Object} rsvpData - The RSVP data
 * @returns {string} HTML content for the email
 */
exports.getRsvpConfirmationTemplate = (rsvpData) => {
  // Get the guest's first name
  const firstName = rsvpData.name.split(' ')[0];

  // Determine if they're attending
  const isAttending = rsvpData.attending === 'yes';

  // Format the date
  const eventDate = 'August 23, 2025';
  const eventTime = '4:00 PM';
  const eventLocation = 'Coors Field, 2001 Blake St, Denver, CO 80205';

  // Format adult and child guests as separate lists
  let guestListHtml = '';
  if (isAttending) {
    // Adult guests section
    const adultGuests = rsvpData.adultGuests || [];
    let adultGuestsHtml = '';
    // Only show adult guests if there are any and adultCount > 0
    if (adultGuests.length > 0 && (rsvpData.adultCount > 0)) {
      adultGuestsHtml = `
        <div style="margin: 15px 0;">
          <p style="margin-bottom: 5px; font-weight: bold;">Adult Guests:</p>
          <ul style="margin: 0; padding-left: 20px;">
            ${adultGuests.map(guest => `<li>${guest}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Child guests section
    const childGuests = rsvpData.childGuests || [];
    let childGuestsHtml = '';
    if (childGuests.length > 0) {
      childGuestsHtml = `
        <div style="margin: 15px 0;">
          <p style="margin-bottom: 5px; font-weight: bold;">Child Guests:</p>
          <ul style="margin: 0; padding-left: 20px;">
            ${childGuests.map(guest => `<li>${guest}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Combine both sections
    guestListHtml = adultGuestsHtml + childGuestsHtml;
  }

  // Determine if this is an out-of-town guest
  const isOutOfTown = rsvpData.isOutOfTown === true;

  // Create out-of-town event section if applicable
  let outOfTownHtml = '';
  if (isOutOfTown && isAttending) {
    const attendingFridayDinner = rsvpData.fridayDinner === 'yes';
    const attendingSundayBrunch = rsvpData.sundayBrunch === 'yes';

    outOfTownHtml = `
      <div style="margin: 30px 0; padding: 20px; background-color: #f5f5f5; border-left: 4px solid #0d47a1; border-radius: 4px;">
        <h3 style="margin-top: 0; color: #0d47a1; font-size: 18px;">Out-of-Town Guest Events</h3>
        <p>As an out-of-town guest, we've planned some additional events:</p>

        <div style="margin: 15px 0; padding: 15px; background-color: ${attendingFridayDinner ? '#e8f5e9' : '#ffebee'}; border-radius: 4px;">
          <h4 style="margin-top: 0; color: ${attendingFridayDinner ? '#2e7d32' : '#c62828'}; font-size: 16px;">
            Friday Night Dinner at Linger
          </h4>
          <p><strong>Date:</strong> Friday, August 22, 2025</p>
          <p><strong>Time:</strong> 5:30 PM</p>
          <p><strong>Location:</strong> Linger Restaurant, 2030 W 30th Ave, Denver, CO 80211</p>
          <p><strong>Status:</strong> ${attendingFridayDinner ? 'You are attending' : 'You are not attending'}</p>
        </div>

        <div style="margin: 15px 0; padding: 15px; background-color: ${attendingSundayBrunch ? '#e8f5e9' : '#ffebee'}; border-radius: 4px;">
          <h4 style="margin-top: 0; color: ${attendingSundayBrunch ? '#2e7d32' : '#c62828'}; font-size: 16px;">
            Sunday Brunch at Eli's Home
          </h4>
          <p><strong>Date:</strong> Sunday, August 24, 2025</p>
          <p><strong>Time:</strong> 9:30 AM</p>
          <p><strong>Location:</strong> Eli's Home, 1245 S Gaylord St, Denver, CO 80210</p>
          <p><strong>Status:</strong> ${attendingSundayBrunch ? 'You are attending' : 'You are not attending'}</p>
        </div>

        <p style="margin-top: 20px; font-style: italic;">
          You'll receive more details about these events closer to the date.
        </p>
      </div>
    `;
  }

  // Create the HTML content
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="x-apple-disable-message-reformatting">
      <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <title>Thank You for Your RSVP to Eli's Be Mitzvah</title>
      <style type="text/css">
        /* iOS blue links */
        a[x-apple-data-detectors] {color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important;}
        /* Gmail blue links */
        u + #body a {color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important;}
      </style>
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;" id="body">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://elibarkin.com/logo.PNG" alt="Eli's Be Mitzvah Logo" style="max-width: 200px; margin-bottom: 20px;">
        <h1 style="color: #0d47a1; margin-bottom: 5px; font-size: 24px;">Thank You for Your RSVP</h1>
        <p style="color: #666; font-size: 16px;">We've received your response</p>
      </div>

      <div style="background-color: ${isAttending ? '#e8f5e9' : '#ffebee'}; border-left: 4px solid ${isAttending ? '#4caf50' : '#f44336'}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
        <h2 style="margin-top: 0; color: ${isAttending ? '#2e7d32' : '#c62828'}; font-size: 18px;">
          ${firstName}, you ${isAttending ? 'will be attending' : 'will not be attending'} Eli's Be Mitzvah
        </h2>
      </div>

      ${isAttending ? `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #0d47a1; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; font-size: 18px;">Event Details</h3>
        <p><strong>Date:</strong> ${eventDate}</p>
        <p><strong>Time:</strong> ${eventTime}</p>
        <p><strong>Location:</strong> ${eventLocation}</p>
        <p><strong>Total Guests:</strong> ${rsvpData.guestCount || 1}</p>
        ${guestListHtml}
      </div>
      ` : ''}

      ${outOfTownHtml}

      <div style="margin: 30px 0; padding: 15px; background-color: #fff8e1; border-left: 4px solid #ffc107; border-radius: 4px;">
        <h3 style="margin-top: 0; color: #f57c00; font-size: 16px;">Need to make changes?</h3>
        <p>If you need to update your RSVP, you can do so by visiting the RSVP page again and entering your information.</p>
        <p><a href="https://elibarkin.com/rsvp.html" style="display: inline-block; background-color: #0d47a1; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; margin-top: 10px; font-weight: bold;">Update Your RSVP</a></p>
      </div>

      <div style="margin-top: 40px; text-align: center; font-size: 14px; color: #666; border-top: 1px solid #e0e0e0; padding-top: 20px;">
        <p>We're looking forward to celebrating with you!</p>
        <p>The Barkin Family</p>
        <p>August 23, 2025 | Denver, Colorado</p>
        <a href="https://elibarkin.com" style="display: inline-block; background-color: #0d47a1; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; margin-top: 15px; font-weight: bold;">Visit Event Website</a>

        <div style="margin-top: 20px; font-size: 12px; color: #999; text-align: center;">
          <p>This email was sent to {{params.email}} from rsvps@elibarkin.com</p>
          <p>To update your preferences or RSVP status, <a href="https://elibarkin.com/rsvp.html" style="color: #0d47a1;">visit our RSVP page</a></p>
          <p>If you have questions, please contact us at <a href="mailto:jacobsamuelbarkin@gmail.com" style="color: #0d47a1;">jacobsamuelbarkin@gmail.com</a></p>
          <p>You can <a href="mailto:jacobsamuelbarkin@gmail.com?subject=Unsubscribe from Eli's Be Mitzvah" style="color: #0d47a1;">unsubscribe</a> from these emails at any time.</p>
          <p>1245 S Gaylord St, Denver, CO 80210</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Get the HTML template for RSVP update confirmation emails
 * @param {Object} beforeData - The RSVP data before the update
 * @param {Object} afterData - The RSVP data after the update
 * @returns {string} HTML content for the email
 */
exports.getRsvpUpdateTemplate = (beforeData, afterData) => {
  // Get the guest's first name
  const firstName = afterData.name.split(' ')[0];

  // Determine if they're attending
  const isAttending = afterData.attending === 'yes';
  const wasAttending = beforeData.attending === 'yes';
  const attendanceChanged = beforeData.attending !== afterData.attending;

  // Format the date
  const eventDate = 'August 23, 2025';
  const eventTime = '4:00 PM';
  const eventLocation = 'Coors Field, 2001 Blake St, Denver, CO 80205';

  // Format adult and child guests as separate lists
  let guestListHtml = '';
  if (isAttending) {
    // Adult guests section
    const adultGuests = afterData.adultGuests || [];
    let adultGuestsHtml = '';
    // Only show adult guests if there are any and adultCount > 0
    if (adultGuests.length > 0 && (afterData.adultCount > 0)) {
      adultGuestsHtml = `
        <div style="margin: 15px 0;">
          <p style="margin-bottom: 5px; font-weight: bold;">Adult Guests:</p>
          <ul style="margin: 0; padding-left: 20px;">
            ${adultGuests.map(guest => `<li>${guest}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Child guests section
    const childGuests = afterData.childGuests || [];
    let childGuestsHtml = '';
    if (childGuests.length > 0) {
      childGuestsHtml = `
        <div style="margin: 15px 0;">
          <p style="margin-bottom: 5px; font-weight: bold;">Child Guests:</p>
          <ul style="margin: 0; padding-left: 20px;">
            ${childGuests.map(guest => `<li>${guest}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Combine both sections
    guestListHtml = adultGuestsHtml + childGuestsHtml;
  }

  // Determine if this is an out-of-town guest
  const isOutOfTown = afterData.isOutOfTown === true;

  // Check for changes
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

  // Create changes section
  let changesHtml = '';
  if (attendanceChanged || hasGuestCountChanged || hasAdditionalGuestsChanged ||
      hasAdultGuestsChanged || hasChildGuestsChanged || hasFridayDinnerChanged ||
      hasSundayBrunchChanged) {

    const changes = [];

    if (attendanceChanged) {
      changes.push(`<li>Attendance: ${wasAttending ? 'Attending' : 'Not Attending'} → ${isAttending ? 'Attending' : 'Not Attending'}</li>`);
    }

    if (hasGuestCountChanged) {
      changes.push(`<li>Guest Count: ${beforeData.guestCount || 1} → ${afterData.guestCount || 1}</li>`);
    }

    if (hasAdditionalGuestsChanged || hasAdultGuestsChanged || hasChildGuestsChanged) {
      changes.push(`<li>Guest List: Updated</li>`);
    }

    if (isOutOfTown) {
      if (hasFridayDinnerChanged) {
        changes.push(`<li>Friday Dinner: ${beforeData.fridayDinner === 'yes' ? 'Attending' : 'Not Attending'} → ${afterData.fridayDinner === 'yes' ? 'Attending' : 'Not Attending'}</li>`);
      }

      if (hasSundayBrunchChanged) {
        changes.push(`<li>Sunday Brunch: ${beforeData.sundayBrunch === 'yes' ? 'Attending' : 'Not Attending'} → ${afterData.sundayBrunch === 'yes' ? 'Attending' : 'Not Attending'}</li>`);
      }
    }

    changesHtml = `
      <div style="margin: 20px 0; padding: 15px; background-color: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
        <h3 style="margin-top: 0; color: #0d47a1; font-size: 16px;">Changes Made:</h3>
        <ul style="margin: 10px 0 0; padding-left: 20px;">
          ${changes.join('')}
        </ul>
      </div>
    `;
  }

  // Create out-of-town event section if applicable
  let outOfTownHtml = '';
  if (isOutOfTown && isAttending) {
    const attendingFridayDinner = afterData.fridayDinner === 'yes';
    const attendingSundayBrunch = afterData.sundayBrunch === 'yes';

    outOfTownHtml = `
      <div style="margin: 30px 0; padding: 20px; background-color: #f5f5f5; border-left: 4px solid #0d47a1; border-radius: 4px;">
        <h3 style="margin-top: 0; color: #0d47a1; font-size: 18px;">Out-of-Town Guest Events</h3>
        <p>As an out-of-town guest, we've planned some additional events:</p>

        <div style="margin: 15px 0; padding: 15px; background-color: ${attendingFridayDinner ? '#e8f5e9' : '#ffebee'}; border-radius: 4px;">
          <h4 style="margin-top: 0; color: ${attendingFridayDinner ? '#2e7d32' : '#c62828'}; font-size: 16px;">
            Friday Night Dinner at Linger
          </h4>
          <p><strong>Date:</strong> Friday, August 22, 2025</p>
          <p><strong>Time:</strong> 5:30 PM</p>
          <p><strong>Location:</strong> Linger Restaurant, 2030 W 30th Ave, Denver, CO 80211</p>
          <p><strong>Status:</strong> ${attendingFridayDinner ? 'You are attending' : 'You are not attending'}</p>
        </div>

        <div style="margin: 15px 0; padding: 15px; background-color: ${attendingSundayBrunch ? '#e8f5e9' : '#ffebee'}; border-radius: 4px;">
          <h4 style="margin-top: 0; color: ${attendingSundayBrunch ? '#2e7d32' : '#c62828'}; font-size: 16px;">
            Sunday Brunch at Eli's Home
          </h4>
          <p><strong>Date:</strong> Sunday, August 24, 2025</p>
          <p><strong>Time:</strong> 9:30 AM</p>
          <p><strong>Location:</strong> Eli's Home, 1245 S Gaylord St, Denver, CO 80210</p>
          <p><strong>Status:</strong> ${attendingSundayBrunch ? 'You are attending' : 'You are not attending'}</p>
        </div>

        <p style="margin-top: 20px; font-style: italic;">
          You'll receive more details about these events closer to the date.
        </p>
      </div>
    `;
  }

  // Create the HTML content
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="x-apple-disable-message-reformatting">
      <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <title>Your RSVP to Eli's Be Mitzvah Has Been Updated</title>
      <style type="text/css">
        /* iOS blue links */
        a[x-apple-data-detectors] {color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important;}
        /* Gmail blue links */
        u + #body a {color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important;}
      </style>
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;" id="body">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://elibarkin.com/logo.PNG" alt="Eli's Be Mitzvah Logo" style="max-width: 200px; margin-bottom: 20px;">
        <h1 style="color: #0d47a1; margin-bottom: 5px; font-size: 24px;">Your RSVP Has Been Updated</h1>
        <p style="color: #666; font-size: 16px;">We've received your updated response</p>
      </div>

      ${changesHtml}

      <div style="background-color: ${isAttending ? '#e8f5e9' : '#ffebee'}; border-left: 4px solid ${isAttending ? '#4caf50' : '#f44336'}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
        <h2 style="margin-top: 0; color: ${isAttending ? '#2e7d32' : '#c62828'}; font-size: 18px;">
          ${firstName}, you ${isAttending ? 'will be attending' : 'will not be attending'} Eli's Be Mitzvah
        </h2>
      </div>

      ${isAttending ? `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #0d47a1; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; font-size: 18px;">Event Details</h3>
        <p><strong>Date:</strong> ${eventDate}</p>
        <p><strong>Time:</strong> ${eventTime}</p>
        <p><strong>Location:</strong> ${eventLocation}</p>
        <p><strong>Total Guests:</strong> ${afterData.guestCount || 1}</p>
        ${guestListHtml}
      </div>
      ` : ''}

      ${outOfTownHtml}

      <div style="margin: 30px 0; padding: 15px; background-color: #fff8e1; border-left: 4px solid #ffc107; border-radius: 4px;">
        <h3 style="margin-top: 0; color: #f57c00; font-size: 16px;">Need to make more changes?</h3>
        <p>If you need to update your RSVP again, you can do so by visiting the RSVP page and entering your information.</p>
        <p><a href="https://elibarkin.com/rsvp.html" style="display: inline-block; background-color: #0d47a1; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; margin-top: 10px; font-weight: bold;">Update Your RSVP</a></p>
      </div>

      <div style="margin-top: 40px; text-align: center; font-size: 14px; color: #666; border-top: 1px solid #e0e0e0; padding-top: 20px;">
        <p>We're looking forward to celebrating with you!</p>
        <p>The Barkin Family</p>
        <p>August 23, 2025 | Denver, Colorado</p>
        <a href="https://elibarkin.com" style="display: inline-block; background-color: #0d47a1; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; margin-top: 15px; font-weight: bold;">Visit Event Website</a>

        <div style="margin-top: 20px; font-size: 12px; color: #999; text-align: center;">
          <p>This email was sent to {{params.email}} from rsvps@elibarkin.com</p>
          <p>To update your preferences or RSVP status, <a href="https://elibarkin.com/rsvp.html" style="color: #0d47a1;">visit our RSVP page</a></p>
          <p>If you have questions, please contact us at <a href="mailto:jacobsamuelbarkin@gmail.com" style="color: #0d47a1;">jacobsamuelbarkin@gmail.com</a></p>
          <p>You can <a href="mailto:jacobsamuelbarkin@gmail.com?subject=Unsubscribe from Eli's Be Mitzvah" style="color: #0d47a1;">unsubscribe</a> from these emails at any time.</p>
          <p>1245 S Gaylord St, Denver, CO 80210</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
