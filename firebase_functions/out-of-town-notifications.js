const functions = require('firebase-functions');
const admin = require('firebase-admin');
const SibApiV3Sdk = require('sib-api-v3-sdk');

/**
 * Cloud Function that sends notifications when out-of-town guests update their RSVP
 * for Friday dinner or Sunday brunch
 */
exports.sendOutOfTownEventNotification = functions.firestore
  .document('sheetRsvps/{rsvpId}')
  .onWrite(async (change, context) => {
    try {
      // Get the RSVP data
      const rsvpData = change.after.exists ? change.after.data() : null;
      const previousData = change.before.exists ? change.before.data() : null;
      const rsvpId = context.params.rsvpId;
      
      // If the document was deleted or not an update, we don't need to send notifications
      if (!rsvpData || !previousData) {
        return null;
      }
      
      // Check if this is an out-of-town guest
      if (!rsvpData.isOutOfTown) {
        return null;
      }
      
      // Check if they're attending the main event
      if (rsvpData.attending !== 'yes') {
        return null;
      }
      
      // Check if Friday dinner or Sunday brunch status changed
      const fridayDinnerChanged = rsvpData.fridayDinner !== previousData.fridayDinner;
      const sundayBrunchChanged = rsvpData.sundayBrunch !== previousData.sundayBrunch;
      
      if (!fridayDinnerChanged && !sundayBrunchChanged) {
        return null;
      }
      
      console.log(`Out-of-town event update for ${rsvpData.name}: Friday dinner: ${fridayDinnerChanged ? 'changed' : 'unchanged'}, Sunday brunch: ${sundayBrunchChanged ? 'changed' : 'unchanged'}`);
      
      // Get the admin email from environment
      const adminEmail = functions.config().admin.email || 'jacobsamuelbarkin@gmail.com';
      
      // Configure Brevo API client
      const defaultClient = SibApiV3Sdk.ApiClient.instance;
      const apiKey = defaultClient.authentications['api-key'];
      apiKey.apiKey = functions.config().brevo.apikey;
      
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      
      // Prepare email content
      const subject = `Out-of-Town Event Update: ${rsvpData.name}`;
      
      let eventChanges = [];
      if (fridayDinnerChanged) {
        eventChanges.push(`Friday Dinner at Linger: ${rsvpData.fridayDinner === 'yes' ? 'Now Attending' : 'No Longer Attending'}`);
      }
      if (sundayBrunchChanged) {
        eventChanges.push(`Sunday Brunch at Eli's home: ${rsvpData.sundayBrunch === 'yes' ? 'Now Attending' : 'No Longer Attending'}`);
      }
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #0d47a1; margin-bottom: 5px;">Out-of-Town Event Update</h1>
            <p style="color: #666; font-size: 16px;">An out-of-town guest has updated their event attendance</p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #0d47a1; margin-top: 0;">${rsvpData.name}</h2>
            <p><strong>Email:</strong> ${rsvpData.email || 'Not provided'}</p>
            <p><strong>Phone:</strong> ${rsvpData.phone || 'Not provided'}</p>
            <p><strong>Total Guests:</strong> ${rsvpData.guestCount || 1}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #0d47a1;">Event Changes:</h3>
            <ul style="padding-left: 20px;">
              ${eventChanges.map(change => `<li style="margin-bottom: 10px; font-size: 16px;">${change}</li>`).join('')}
            </ul>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #0d47a1;">Current Status:</h3>
            <ul style="padding-left: 20px;">
              <li style="margin-bottom: 10px; font-size: 16px;">Friday Dinner at Linger: ${rsvpData.fridayDinner === 'yes' ? 'Attending' : 'Not Attending'}</li>
              <li style="margin-bottom: 10px; font-size: 16px;">Sunday Brunch at Eli's home: ${rsvpData.sundayBrunch === 'yes' ? 'Attending' : 'Not Attending'}</li>
            </ul>
          </div>
          
          <div style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p>This is an automated notification from the Eli Barkin Bar Mitzvah website.</p>
          </div>
        </div>
      `;
      
      // Send email notification
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = htmlContent;
      sendSmtpEmail.sender = { name: "Eli's Bar Mitzvah", email: "noreply@elibarkin.com" };
      sendSmtpEmail.to = [{ email: adminEmail }];
      sendSmtpEmail.replyTo = { email: "jacobsamuelbarkin@gmail.com", name: "Jacob Barkin" };
      
      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Out-of-town event notification sent:', result);
      
      // Log the notification
      await admin.firestore().collection('emailLogs').add({
        type: 'out-of-town-notification',
        recipient: adminEmail,
        subject: subject,
        rsvpId: rsvpId,
        guestName: rsvpData.name,
        fridayDinner: rsvpData.fridayDinner,
        sundayBrunch: rsvpData.sundayBrunch,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        messageId: result.messageId
      });
      
      return null;
    } catch (error) {
      console.error('Error sending out-of-town event notification:', error);
      return null;
    }
  });
