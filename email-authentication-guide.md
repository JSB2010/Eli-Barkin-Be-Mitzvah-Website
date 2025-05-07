# Email Authentication Setup Guide for elibarkin.com

This guide provides step-by-step instructions for setting up proper email authentication for the `elibarkin.com` domain to improve email deliverability and prevent emails from going to spam folders.

## Why Authentication Matters

Emails sent from `rsvps@elibarkin.com` can go to spam folders if your domain isn't properly authenticated. Setting up SPF, DKIM, and DMARC records helps:

- Verify that emails are legitimately from your domain
- Prevent email spoofing and phishing
- Improve deliverability rates
- Build domain reputation

## Quick Start

To quickly test your current email authentication setup, run:

```bash
# First install dependencies
npm install axios chalk

# Then run the test script
node email-deliverability-test.js
```

This will check your current DNS configuration and provide recommendations.

## Step 1: Set up SPF (Sender Policy Framework)

SPF defines which mail servers are authorized to send emails on behalf of your domain.

### Instructions:

1. Log in to your domain registrar (e.g., GoDaddy, Namecheap, Google Domains)
2. Go to DNS settings for `elibarkin.com`
3. Create a new TXT record with these settings:
   - **Host/Name**: `@` (represents the root domain)
   - **Value**: `v=spf1 include:spf.sendinblue.com include:_spf.google.com ~all`
   - **TTL**: 3600 (or 1 hour)

> **Note**: If you already have an SPF record, you should modify it to include Brevo's servers. Never create multiple SPF records for a domain.

## Step 2: Set up DKIM (DomainKeys Identified Mail)

DKIM adds a digital signature to your emails to verify they haven't been tampered with.

### Instructions:

1. Log in to your Brevo account
2. Go to **Settings** > **Senders & IP** > **Manage Domains**
3. Click on **Add a New Domain**
4. Enter `elibarkin.com` and follow the setup wizard
5. Brevo will provide you with DKIM selector and key values
6. Add the provided CNAME records to your domain's DNS:
   - **Host/Name**: Will be provided by Brevo (typically like `mail._domainkey`)
   - **Value**: Will be provided by Brevo
   - **Type**: CNAME
   - **TTL**: 3600 (or 1 hour)
7. Verify the setup in Brevo once DNS changes have propagated (this can take up to 48 hours)

## Step 3: Set up DMARC (Domain-based Message Authentication, Reporting, and Conformance)

DMARC tells receiving mail servers what to do with emails that fail SPF or DKIM checks.

### Instructions:

1. Log in to your domain registrar
2. Go to DNS settings for `elibarkin.com`
3. Create a new TXT record with these settings:
   - **Host/Name**: `_dmarc`
   - **Value**: `v=DMARC1; p=none; sp=none; rua=mailto:jacobsamuelbarkin@gmail.com; adkim=r; aspf=r; pct=100;`
   - **TTL**: 3600 (or 1 hour)

> **Explanation**: This initial setup is in monitoring mode (`p=none`). It won't affect email delivery but will send reports to your email. Once you're confident in your setup, you can update to `p=quarantine` or `p=reject`.

## Step 4: Setup Custom Return-Path

Setting up a custom return-path helps with bounce handling.

### Instructions:

1. Log in to your domain registrar
2. Go to DNS settings for `elibarkin.com`
3. Create a new CNAME record with these settings:
   - **Host/Name**: `bounce`
   - **Value**: The value provided by Brevo (typically like `bounce.sendinblue.com`)
   - **Type**: CNAME
   - **TTL**: 3600 (or 1 hour)

## Step 5: Verify with Brevo

After making these DNS changes:

1. Go to your Brevo Dashboard
2. Navigate to **Senders & IPs** > **Domains**
3. Find `elibarkin.com` and click **Verify**
4. Brevo will check your DNS records for proper configuration

## Step 6: Test Your Email Authentication

Use these tools to test your email authentication setup:

1. [Mail Tester](https://www.mail-tester.com/) - Get a score of your email's deliverability
2. [MX Toolbox](https://mxtoolbox.com/SuperTool.aspx) - Test SPF, DKIM, and DMARC records
3. [DMARC Analyzer](https://www.dmarcanalyzer.com/dmarc/dmarc-record-check/) - Validate your DMARC record

## Additional Recommendations

1. **Warm up your domain**: Send emails gradually increasing volume over time
2. **Maintain a clean recipient list**: Remove bounce and unsubscribe emails
3. **Use consistent from/reply-to addresses**: Don't change sending addresses frequently
4. **Include physical address and unsubscribe link**: As you've already implemented in your email templates
5. **Monitor delivery reports**: Regularly check Brevo analytics for delivery issues

## Troubleshooting

If you're still experiencing issues with emails going to spam after setup:

1. **Check email content**: Avoid spam-triggering words and excessive use of images
2. **Verify HTML code quality**: Clean HTML without errors improves deliverability
3. **Review Brevo sending reputation**: Ensure your Brevo account is in good standing
4. **Test with different email providers**: Check delivery to Gmail, Outlook, Yahoo, etc.
5. **Request whitelisting**: Ask recipients to add `rsvps@elibarkin.com` to their contacts

For any additional help, contact Brevo support or a DNS/email specialist.
