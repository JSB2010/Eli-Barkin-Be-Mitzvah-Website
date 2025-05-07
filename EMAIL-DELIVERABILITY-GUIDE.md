# Email Deliverability Guide for Eli's Be Mitzvah Website

![Eli Barkin Be Mitzvah Logo](logo.PNG)

This comprehensive guide will help you ensure emails from Eli's Be Mitzvah website reach guests' inboxes rather than spam folders. Follow these instructions to implement industry-standard email authentication and best practices.

## Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [Implementation Process](#implementation-process)
3. [Technical Configuration](#technical-configuration)
   - [SPF Setup](#spf-setup)
   - [DKIM Setup](#dkim-setup)
   - [DMARC Setup](#dmarc-setup)
   - [Return-Path Configuration](#return-path-configuration)
4. [Brevo Integration](#brevo-integration)
5. [Testing and Verification](#testing-and-verification)
6. [Maintenance and Monitoring](#maintenance-and-monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Tools and Resources](#tools-and-resources)

## Quick Start Guide

1. **Run the Email Toolkit Launcher**:
   ```bash
   node email-toolkit.js
   ```
   This interactive tool provides guided access to all email deliverability tools.

2. **Generate DNS Records**:
   ```bash
   node generate-dns-records.js
   ```
   Creates customized DNS records for your domain.

3. **Test Your Configuration**:
   ```bash
   node enhanced-email-deliverability-test.js
   ```
   Provides a comprehensive deliverability assessment.

4. **Verify Email Delivery**:
   ```bash
   export BREVO_API_KEY=your-brevo-api-key
   node test-email-delivery.js
   ```
   Tests actual delivery to major email providers.

## Implementation Process

Follow this recommended order to implement email deliverability improvements:

1. **Prepare DNS Records** - Generate and configure required DNS records
2. **Configure Brevo** - Set up domain authentication in Brevo
3. **Test Configuration** - Verify DNS and authentication records
4. **Send Test Emails** - Validate actual email delivery
5. **Monitor Results** - Track ongoing deliverability metrics

## Technical Configuration

### SPF Setup

The SPF record authorizes which mail servers can send email on behalf of your domain.

1. Add this TXT record to your domain's DNS:
   ```
   Type: TXT
   Host: @
   Value: v=spf1 include:spf.sendinblue.com include:_spf.google.com ~all
   TTL: 3600
   ```

2. Verification command:
   ```bash
   dig TXT elibarkin.com
   ```
   Look for the SPF record in the output.

### DKIM Setup

DKIM adds a digital signature to verify email authenticity and prevent tampering.

1. Generate DKIM keys in Brevo (see [Brevo Integration](#brevo-integration))
2. Add the provided TXT record to your domain's DNS:
   ```
   Type: TXT
   Host: [selector]._domainkey
   Value: [provided by Brevo]
   TTL: 3600
   ```

### DMARC Setup

DMARC tells receiving servers what to do with emails that fail authentication.

1. Add this TXT record to your domain's DNS:
   ```
   Type: TXT
   Host: _dmarc
   Value: v=DMARC1; p=none; sp=none; rua=mailto:jacobsamuelbarkin@gmail.com; adkim=r; aspf=r; pct=100;
   TTL: 3600
   ```

2. Start with policy `p=none` to monitor without affecting delivery
3. After 2-4 weeks of successful monitoring, consider upgrading to `p=quarantine` or `p=reject`

### Return-Path Configuration

The Return-Path helps handle email bounces properly.

1. Add this CNAME record to your domain's DNS:
   ```
   Type: CNAME
   Host: bounce
   Value: [provided by Brevo]
   TTL: 3600
   ```

## Brevo Integration

Follow these steps to configure your domain in Brevo:

1. **Log in to Brevo**:
   - Visit [app.brevo.com](https://app.brevo.com/login)
   - Enter your credentials

2. **Add Your Domain**:
   - Go to Settings → Senders & IPs → Domains
   - Click "Add a New Domain"
   - Enter `elibarkin.com`

3. **Verify Domain Ownership**:
   - Add the provided TXT record to your DNS
   - Return to Brevo and click "Verify Domain"

4. **Set Up DKIM Authentication**:
   - In the domain settings, click "Set up DKIM"
   - Add the provided DKIM record to your DNS
   - Return to Brevo and verify the setup

5. **Configure Default Sender**:
   - Go to Settings → Senders & IPs → Senders
   - Create a sender with `rsvps@elibarkin.com`
   - Use consistent sender information for all emails

## Testing and Verification

After implementing DNS records and Brevo configuration:

1. **DNS Verification**:
   ```bash
   node enhanced-email-deliverability-test.js
   ```
   All checks should pass with green checkmarks.

2. **Email Delivery Testing**:
   ```bash
   export BREVO_API_KEY=your-brevo-api-key
   node test-email-delivery.js
   ```
   Verify emails arrive in the inbox (not spam) for:
   - Gmail
   - Outlook/Hotmail
   - Yahoo Mail 
   - Apple Mail/iCloud

3. **Header Verification**:
   Examine received email headers for:
   - `SPF: pass`
   - `DKIM: pass`
   - `DMARC: pass`

4. **Third-Party Testing**:
   - [Mail Tester](https://www.mail-tester.com/) - Send an email and get a score
   - [MX Toolbox](https://mxtoolbox.com/) - Verify DNS configuration

## Maintenance and Monitoring

### Regular Checks

- Run email deliverability test monthly
- Monitor Brevo analytics dashboard weekly
- Check email open rates and bounce rates

### Key Metrics to Monitor

- Open rate: Should be above 15-20%
- Click rate: Should be above 2-3%
- Bounce rate: Should be below 2%
- Spam complaints: Should be below 0.1%

### Content Best Practices

1. **Subject Lines**:
   - Avoid all caps, excessive punctuation, and spam-triggering words
   - Be clear and specific about email content

2. **Email Content**:
   - Maintain 60% text to 40% images ratio
   - Always include ALT text for images
   - Use descriptive link text (not "click here")
   - Personalize content when possible

3. **Sending Practices**:
   - Send during weekdays, 10am-2pm local time
   - Space out bulk emails by at least 24 hours
   - Remove hard bounces immediately
   - Process unsubscribe requests promptly

## Troubleshooting

### Common Issues

1. **DNS Propagation Delays**:
   - Changes can take 24-48 hours to propagate
   - Verify records using `dig TXT yourdomain.com`

2. **DKIM Verification Failures**:
   - Ensure the exact DKIM value from Brevo is used
   - Check for formatting issues (line breaks, spaces)

3. **Emails Going to Spam**:
   - Verify authentication is passing (`SPF`, `DKIM`, `DMARC`)
   - Review email content for spam triggers
   - Check domain reputation with [Sender Score](https://senderscore.org/)

4. **Delivery to Specific Providers**:
   - Gmail: Register with [Gmail Postmaster Tools](https://postmaster.google.com/)
   - Outlook: Check for IP reputation issues

### Diagnostic Tools

- Run `node enhanced-email-deliverability-test.js` for comprehensive checks
- Use `node test-email-delivery.js` to test actual delivery
- Check email headers for authentication results

## Tools and Resources

### Included Tools

- `email-toolkit.js` - Interactive menu for all email tools
- `generate-dns-records.js` - Creates customized DNS records
- `enhanced-email-deliverability-test.js` - Complete authentication test
- `test-email-delivery.js` - Tests actual email delivery

### External Resources

- [Brevo Documentation](https://help.brevo.com/hc/en-us/categories/360000171099-Email-Marketing)
- [MX Toolbox](https://mxtoolbox.com/SuperTool.aspx) - DNS and email testing
- [Mail Tester](https://www.mail-tester.com/) - Email deliverability scoring
- [DMARC Analyzer](https://dmarc.postmarkapp.com/) - DMARC implementation help

---

*Last Updated: May 7, 2025*
