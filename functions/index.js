const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configure email transporter with your Gmail credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jacobsamuelbarkin@gmail.com',
    pass: 'phnv varx llta soll' // Your app password
  }
});

exports.sendEmailOnNewRSVP = functions.firestore
  .document('rsvps/{rsvpId}')
  .onCreate(async (snapshot, context) => {
    // Get the RSVP data
    const rsvpData = snapshot.data();
    const rsvpId = context.params.rsvpId;
    
    // Format the email content
    const attending = rsvpData.attending === 'yes' ? 'Yes' : 'No';
    const guestCount = rsvpData.guestCount || 1;
    const additionalGuests = Array.isArray(rsvpData.additionalGuests) 
      ? rsvpData.additionalGuests.join(', ') 
      : 'None';
    
    // Format the date
    let submittedDate = 'Unknown date';
    try {
      if (rsvpData.submittedAt) {
        if (rsvpData.submittedAt.toDate) {
          // Firestore Timestamp
          submittedDate = rsvpData.submittedAt.toDate().toLocaleString();
        } else if (rsvpData.submittedAt.seconds) {
          // Firestore Timestamp in seconds
          submittedDate = new Date(rsvpData.submittedAt.seconds * 1000).toLocaleString();
        } else {
          // Regular date
          submittedDate = new Date(rsvpData.submittedAt).toLocaleString();
        }
      }
    } catch (e) {
      console.error('Error formatting date:', e);
      submittedDate = new Date().toLocaleString() + ' (current time, original time unknown)';
    }
    
    // Create email options
    const mailOptions = {
      from: 'Eli\'s Be Mitzvah RSVP <jacobsamuelbarkin@gmail.com>',
      to: 'jacobsamuelbarkin@gmail.com', // Send to yourself
      subject: `New RSVP from ${rsvpData.name || 'Unknown'}`,
      html: `
        <h2>New RSVP Submission</h2>
        <p><strong>Name:</strong> ${rsvpData.name || 'Not provided'}</p>
        <p><strong>Email:</strong> ${rsvpData.email || 'Not provided'}</p>
        <p><strong>Phone:</strong> ${rsvpData.phone || 'Not provided'}</p>
        <p><strong>Attending:</strong> ${attending}</p>
        <p><strong>Guest Count:</strong> ${guestCount}</p>
        <p><strong>Additional Guests:</strong> ${additionalGuests}</p>
        <p><strong>Submitted At:</strong> ${submittedDate}</p>
        <p>View all RSVPs on your <a href="https://jsb2010.github.io/Eli-Barkin-Be-Mitzvah-Website/rsvp-dashboard.html">dashboard</a>.</p>
      `
    };
    
    try {
      // Send the email
      await transporter.sendMail(mailOptions);
      console.log(`New RSVP notification email sent successfully for submission ${rsvpId}`);
      return null;
    } catch (error) {
      console.error('Error sending email:', error);
      return null;
    }
  });
