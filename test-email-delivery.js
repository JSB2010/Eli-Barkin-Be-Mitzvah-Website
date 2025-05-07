#!/usr/bin/env node

/**
 * Email Delivery Test Sender
 * 
 * This script sends test emails to specified addresses across multiple email providers
 * to check actual deliverability in real-world conditions. It uses the Brevo API
 * to send emails in the exact same way as your production emails.
 * 
 * Usage: 
 *   1. Add test email addresses in the TEST_EMAILS array below
 *   2. Set your Brevo API key as an environment variable
 *   3. Run the script
 * 
 * Example:
 *   BREVO_API_KEY=your-api-key node test-email-delivery.js
 */

const SibApiV3Sdk = require('sib-api-v3-sdk');
const readline = require('readline');

// Configuration
const DOMAIN = 'elibarkin.com';
const SENDER_EMAIL = `rsvps@${DOMAIN}`;
const SENDER_NAME = "Eli's Bar Mitzvah";

// Add test email addresses here - ideally use addresses from different providers
// Format: { email: 'address@example.com', name: 'Test Name', provider: 'Gmail' }
const TEST_EMAILS = [
  // Example - replace with your actual test emails
  // { email: 'your-gmail@gmail.com', name: 'Gmail Test', provider: 'Gmail' },
  // { email: 'your-outlook@outlook.com', name: 'Outlook Test', provider: 'Outlook' },
  // { email: 'your-yahoo@yahoo.com', name: 'Yahoo Test', provider: 'Yahoo' }
];

// Create CLI interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check for Brevo API key
const apiKey = process.env.BREVO_API_KEY;
if (!apiKey) {
  console.error('❌ Error: BREVO_API_KEY environment variable is not set.');
  console.log('Please set it by running: export BREVO_API_KEY=your-api-key');
  process.exit(1);
}

// If no test emails are configured, prompt for one
async function promptForTestEmail() {
  if (TEST_EMAILS.length > 0) return;
  
  return new Promise((resolve) => {
    rl.question('No test emails configured. Enter an email to test with: ', (email) => {
      TEST_EMAILS.push({
        email: email.trim(),
        name: 'Test User',
        provider: 'Unknown'
      });
      resolve();
    });
  });
}

// Prompt for which test to run
async function promptForTestType() {
  console.log('\n📧 Available Test Types:');
  console.log('1. Basic Authentication Test (simple email to test SPF/DKIM/DMARC)');
  console.log('2. RSVP Confirmation Email Test');
  console.log('3. Out-of-Town Guest Email Test');
  console.log('4. Run All Tests');
  
  return new Promise((resolve) => {
    rl.question('\nSelect a test to run (1-4): ', (answer) => {
      const option = parseInt(answer.trim());
      if (option >= 1 && option <= 4) {
        resolve(option);
      } else {
        console.log('Invalid option, defaulting to Basic Authentication Test');
        resolve(1);
      }
    });
  });
}

// Create a basic authentication test email
function createBasicAuthEmail(recipient) {
  return {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: recipient.email, name: recipient.name }],
    subject: `Email Authentication Test for ${DOMAIN}`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="x-apple-disable-message-reformatting">
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <title>Email Authentication Test</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0d47a1;">Email Deliverability Test</h1>
          <p>Testing email authentication and deliverability for ${DOMAIN}</p>
        </div>
        
        <div style="background-color: #f5f5f5; border-left: 4px solid #0d47a1; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <h2 style="margin-top: 0; color: #0d47a1;">Basic Authentication Test</h2>
          <p>This email is a test to verify proper email authentication (SPF, DKIM, DMARC) configuration.</p>
          <p>If you received this in your primary inbox, authentication is likely working correctly!</p>
        </div>
        
        <div style="margin: 20px 0;">
          <p><strong>Recipient:</strong> ${recipient.email}</p>
          <p><strong>Provider:</strong> ${recipient.provider}</p>
          <p><strong>Time Sent:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="margin-top: 30px; padding: 15px; background-color: #e3f2fd; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #0d47a1;">Next Steps:</h3>
          <p>1. Verify this email landed in your primary inbox (not spam/junk)</p>
          <p>2. Check the email headers to confirm SPF, DKIM, and DMARC passed</p>
          <p>3. Reply to this email to test reply-to functionality</p>
        </div>
        
        <div style="margin-top: 40px; text-align: center; font-size: 14px; color: #666; border-top: 1px solid #e0e0e0; padding-top: 20px;">
          <p>This is an automated test email for Eli's Bar Mitzvah website.</p>
          
          <div style="margin-top: 20px; font-size: 12px; color: #999; text-align: center;">
            <p>This email was sent to ${recipient.email} from ${SENDER_EMAIL}</p>
            <p>To unsubscribe from these test emails, please contact us at <a href="mailto:jacobsamuelbarkin@gmail.com">jacobsamuelbarkin@gmail.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    replyTo: { email: "jacobsamuelbarkin@gmail.com", name: "Jacob Barkin" },
    headers: {
      "List-Unsubscribe": "<mailto:jacobsamuelbarkin@gmail.com?subject=Unsubscribe>",
      "X-Entity-Ref-ID": `auth-test-${Date.now()}`
    }
  };
}

// Create a sample RSVP confirmation email
function createRsvpConfirmationEmail(recipient) {
  return {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: recipient.email, name: recipient.name }],
    subject: `Test: RSVP Confirmation for Eli's Bar Mitzvah`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="x-apple-disable-message-reformatting">
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <title>Test: RSVP Confirmation</title>
      </head>
      <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0d47a1; margin-bottom: 5px; font-size: 24px;">TEST - Thank You for Your RSVP</h1>
          <p style="color: #666; font-size: 16px;">This is a test of our RSVP confirmation email</p>
        </div>

        <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <h2 style="margin-top: 0; color: #2e7d32; font-size: 18px;">
            ${recipient.name}, you will be attending Eli's Bar Mitzvah
          </h2>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #0d47a1; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; font-size: 18px;">Event Details</h3>
          <p><strong>Date:</strong> August 23, 2025</p>
          <p><strong>Time:</strong> 4:00 PM</p>
          <p><strong>Location:</strong> Coors Field, 2001 Blake St, Denver, CO 80205</p>
          <p><strong>Total Guests:</strong> 2</p>
          <div style="margin: 15px 0;">
            <p style="margin-bottom: 5px; font-weight: bold;">Additional Guests:</p>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Test Guest</li>
            </ul>
          </div>
        </div>

        <div style="margin: 30px 0; padding: 15px; background-color: #fff8e1; border-left: 4px solid #ffc107; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #f57c00; font-size: 16px;">Need to make changes?</h3>
          <p>If you need to update your RSVP, you can do so by visiting the RSVP page again and entering your information.</p>
          <p><a href="https://elibarkin.com/rsvp.html" style="display: inline-block; background-color: #0d47a1; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; margin-top: 10px; font-weight: bold;">Update Your RSVP</a></p>
        </div>

        <div style="margin-top: 40px; text-align: center; font-size: 14px; color: #666; border-top: 1px solid #e0e0e0; padding-top: 20px;">
          <p>This is a <strong>TEST EMAIL</strong> for Eli's Bar Mitzvah email deliverability verification.</p>
          <p>August 23, 2025 | Denver, Colorado</p>
          
          <div style="margin-top: 20px; font-size: 12px; color: #999; text-align: center;">
            <p>This email was sent to ${recipient.email} from ${SENDER_EMAIL}</p>
            <p>To update your preferences or RSVP status, <a href="https://elibarkin.com/rsvp.html" style="color: #0d47a1;">visit our RSVP page</a></p>
            <p>If you have questions, please contact us at <a href="mailto:jacobsamuelbarkin@gmail.com" style="color: #0d47a1;">jacobsamuelbarkin@gmail.com</a></p>
            <p>You can <a href="mailto:jacobsamuelbarkin@gmail.com?subject=Unsubscribe from Eli's Bar Mitzvah" style="color: #0d47a1;">unsubscribe</a> from these emails at any time.</p>
            <p>1245 S Gaylord St, Denver, CO 80210</p>
          </div>
        </div>
      </body>
      </html>
    `,
    replyTo: { email: "jacobsamuelbarkin@gmail.com", name: "Jacob Barkin" },
    headers: {
      "List-Unsubscribe": "<mailto:jacobsamuelbarkin@gmail.com?subject=Unsubscribe>",
      "X-Entity-Ref-ID": `rsvp-test-${Date.now()}`
    }
  };
}

// Create a sample out-of-town guest email
function createOutOfTownEmail(recipient) {
  return {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: recipient.email, name: recipient.name }],
    subject: `Test: Eli's Bar Mitzvah - Out-of-Town Guest Information`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="x-apple-disable-message-reformatting">
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <title>Test: Out-of-Town Guest Information</title>
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
            background-color: #f5f5f5;
            border-left: 4px solid #0d47a1;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
          }
          .event-title {
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 10px;
            color: #0d47a1;
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
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 14px;
            color: #666;
            border-top: 1px solid #e0e0e0;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Out-of-Town Guest Information</h1>
          <p>Special events for our out-of-town guests</p>
          <p><strong>THIS IS A TEST EMAIL</strong></p>
        </div>

        <p>Dear ${recipient.name},</p>

        <p>Thank you for your RSVP to Eli's Bar Mitzvah! We're excited that you'll be joining us for this special occasion.</p>

        <p>As an out-of-town guest, we've planned some additional events to make your trip to Denver even more special. Below is information about these events based on your RSVP preferences:</p>

        <h2>Your Out-of-Town Event Schedule</h2>

        <div class="event-card">
          <div class="event-title">Friday Night Dinner at Linger</div>
          <span class="event-status attending">
            You are attending
          </span>
          <div class="event-details">
            <strong>Date:</strong> Friday, August 22, 2025<br>
            <strong>Time:</strong> 5:30 PM<br>
            <strong>Location:</strong> Linger Restaurant
            <div style="margin-top: 10px; font-style: italic;">
              2030 W 30th Ave, Denver, CO 80211
            </div>
          </div>
          <p>Join us for a casual dinner the night before the Bar Mitzvah. This will be a great opportunity to meet family and friends in a relaxed setting before the main event.</p>
        </div>

        <div class="event-card">
          <div class="event-title">Sunday Brunch at Eli's Home</div>
          <span class="event-status attending">
            You are attending
          </span>
          <div class="event-details">
            <strong>Date:</strong> Sunday, August 24, 2025<br>
            <strong>Time:</strong> 9:30 AM<br>
            <strong>Location:</strong> The Barkin Residence
            <div style="margin-top: 10px; font-style: italic;">
              Address details will be provided closer to the event
            </div>
          </div>
          <p>Before you head home, join us for a farewell brunch at our home. This will be a casual gathering to say goodbye and enjoy one last celebration together.</p>
        </div>

        <div style="margin: 30px 0; padding: 15px; background-color: #fff8e1; border-left: 4px solid #ffc107; border-radius: 4px;">
          <p><strong>Note:</strong> This is a TEST EMAIL to verify deliverability. If you received this in your inbox, our email system is working correctly!</p>
        </div>

        <div class="footer">
          <p>This is a test email for Eli's Bar Mitzvah website.</p>
          <p>May 17, 2025 | Denver, Colorado</p>
          
          <div style="margin-top: 20px; font-size: 12px; color: #999; text-align: center;">
            <p>This email was sent to ${recipient.email} from ${SENDER_EMAIL}</p>
            <p>To update your preferences or RSVP status, <a href="https://elibarkin.com/rsvp.html" style="color: #0d47a1;">visit our RSVP page</a></p>
            <p>If you have questions, please contact us at <a href="mailto:jacobsamuelbarkin@gmail.com" style="color: #0d47a1;">jacobsamuelbarkin@gmail.com</a></p>
            <p>You can <a href="mailto:jacobsamuelbarkin@gmail.com?subject=Unsubscribe from Eli's Bar Mitzvah" style="color: #0d47a1;">unsubscribe</a> from these emails at any time.</p>
            <p>1245 S Gaylord St, Denver, CO 80210</p>
          </div>
        </div>
      </body>
      </html>
    `,
    replyTo: { email: "jacobsamuelbarkin@gmail.com", name: "Jacob Barkin" },
    headers: {
      "List-Unsubscribe": "<mailto:jacobsamuelbarkin@gmail.com?subject=Unsubscribe>",
      "X-Entity-Ref-ID": `out-of-town-test-${Date.now()}`
    }
  };
}

// Send email using Brevo API
async function sendEmail(emailData) {
  // Configure API client
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKeyAuth = defaultClient.authentications['api-key'];
  apiKeyAuth.apiKey = apiKey;
  
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  
  try {
    const result = await apiInstance.sendTransacEmail(emailData);
    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Main function
async function main() {
  console.log(`
  ┌───────────────────────────────────────┐
  │                                       │
  │  Email Delivery Test for ${DOMAIN}  │
  │                                       │
  └───────────────────────────────────────┘
  `);
  
  // Make sure we have test emails
  await promptForTestEmail();
  
  // Choose which test to run
  const testType = await promptForTestType();
  
  console.log(`\n📤 Sending test emails to ${TEST_EMAILS.length} recipients...`);
  
  // Results tracking
  const results = [];
  
  // Process each test email
  for (const recipient of TEST_EMAILS) {
    console.log(`\n→ Testing delivery to ${recipient.email} (${recipient.provider || 'Unknown provider'})...`);
    
    // Determine which emails to send based on test type
    const emailsToSend = [];
    
    if (testType === 1 || testType === 4) {
      emailsToSend.push({
        type: 'Basic Authentication Test',
        data: createBasicAuthEmail(recipient)
      });
    }
    
    if (testType === 2 || testType === 4) {
      emailsToSend.push({
        type: 'RSVP Confirmation Email',
        data: createRsvpConfirmationEmail(recipient)
      });
    }
    
    if (testType === 3 || testType === 4) {
      emailsToSend.push({
        type: 'Out-of-Town Guest Email',
        data: createOutOfTownEmail(recipient)
      });
    }
    
    // Send each email
    for (const email of emailsToSend) {
      console.log(`  Sending ${email.type}...`);
      const result = await sendEmail(email.data);
      
      if (result.success) {
        console.log(`  ✅ Sent successfully! Message ID: ${result.messageId}`);
      } else {
        console.log(`  ❌ Failed to send: ${result.error}`);
      }
      
      results.push({
        recipient: recipient.email,
        provider: recipient.provider,
        emailType: email.type,
        result
      });
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('─────────────────────────────────────');
  
  const successCount = results.filter(r => r.result.success).length;
  const totalTests = results.length;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${totalTests - successCount}`);
  
  if (successCount === totalTests) {
    console.log('\n✅ All test emails sent successfully!');
  } else {
    console.log('\n⚠️ Some test emails failed to send.');
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. Check each recipient\'s inbox to verify delivery');
  console.log('2. Check if emails were delivered to Primary/Inbox or Spam/Junk folders');
  console.log('3. Ask recipients to check email headers for SPF/DKIM/DMARC pass status');
  
  // Close the readline interface
  rl.close();
}

// Run the main function
main().catch(error => {
  console.error(`❌ An error occurred: ${error.message}`);
  rl.close();
});
