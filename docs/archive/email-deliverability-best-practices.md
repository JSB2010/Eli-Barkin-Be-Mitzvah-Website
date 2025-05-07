# Email Deliverability Optimization Checklist

This document provides guidance on monitoring and maintaining good email deliverability after implementing all the technical configurations.

## Regular Deliverability Monitoring

### 1. Check Email Performance in Brevo

- Log into your Brevo account weekly
- Review these key metrics:
  - Open rates (Should be above 15-20%)
  - Click rates (Should be above 2-3%)
  - Bounce rates (Should be below 2%)
  - Spam complaints (Should be below 0.1%)
  - Blacklist status (Should be clear)

### 2. Email Test Process

Before sending any bulk emails:
1. Send a test email to accounts at major providers (Gmail, Outlook, Yahoo)
2. Check the email headers to ensure proper authentication
3. Verify the email appears as expected visually
4. Confirm the email lands in the Primary/Inbox tab

## Subject Line Best Practices

Avoid spam-triggering patterns in subject lines:

✅ **Good Examples**:
- "Eli's Be Mitzvah - RSVP Confirmation"
- "Your RSVP Details for Eli's Be Mitzvah"
- "Important Information for Out-of-Town Guests"

❌ **Avoid**:
- ALL CAPS IN SUBJECT LINES
- Excessive punctuation!!!!
- $pecial ch@racters
- "FREE", "Urgent", "Don't miss out", "Limited time"

## Content Guidelines

### Text-to-Image Ratio
- Maintain at least 60% text to 40% images
- Never send an email that is one large image
- Always include ALT text for images

### Link Best Practices
- Use descriptive link text ("Update your RSVP" not "Click here")
- Link to your own domain (elibarkin.com), not third-party URLs
- Don't use URL shorteners in emails

### Personalization
- Use the recipient's name in greeting when available
- Segment emails based on guest type (out-of-town vs. local)
- Send content relevant to recipient's RSVP status

## Sending Practices

### Optimal Sending Times
- Weekdays: 10am-2pm local time
- Avoid sending emails on weekends unless time-sensitive
- Space out bulk emails by at least 24 hours

### Handling Bounces and Complaints
1. Remove hard bounces immediately from your list
2. After 2-3 soft bounces, remove the email address
3. Process unsubscribe requests within 24 hours
4. Maintain a suppression list for bounces and unsubscribes

## Troubleshooting Guide

If deliverability issues occur:

1. **Verify SPF/DKIM/DMARC** - Use [MX Toolbox](https://mxtoolbox.com/) to check your configuration
2. **Check Reputation** - Use [Sender Score](https://senderscore.org/) to check your domain
3. **Sending IP** - Ensure Brevo's IPs aren't blacklisted
4. **Review Recent Content** - Check if recent emails triggered spam filters
5. **Authentication Check** - Verify the email headers with [Mail Tester](https://www.mail-tester.com/)

## Gmail-Specific Considerations

Since many guests likely use Gmail:

1. Stay out of "Promotions" tab:
   - Use consistent From name and address
   - Keep formatting simple
   - Avoid marketing language and excessive images
   
2. Gmail Postmaster Tools:
   - Create a free account at [Gmail Postmaster Tools](https://postmaster.google.com/)
   - Monitor your domain reputation with Gmail
   - Check spam rates and authentication results

## Contacts for Help

- Brevo Support: support@brevo.com
- Domain Registrar Support: [Your registrar's contact info]
- Technical Support: jacobsamuelbarkin@gmail.com
