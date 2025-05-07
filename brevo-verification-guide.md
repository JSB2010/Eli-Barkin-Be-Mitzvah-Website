# Brevo Domain Verification and DKIM Setup Guide

This guide provides detailed instructions for verifying your domain in Brevo (formerly Sendinblue) and setting up DKIM authentication to improve email deliverability.

## Step 1: Log in to Your Brevo Account

1. Go to [Brevo Login Page](https://app.brevo.com/login)
2. Enter your credentials and click "Log In"

## Step 2: Access Domain Settings

1. Click on your profile icon in the top-right corner
2. Select "Settings" from the dropdown menu
3. In the left sidebar, click on "Senders & IPs"
4. Click on the "Domains" tab

## Step 3: Add Your Domain

1. Click the "+ Add a New Domain" button
2. Enter your domain name: `elibarkin.com`
3. Click "Add This Domain"

## Step 4: Verify Domain Ownership

You'll need to add a verification DNS record to prove you own the domain.

1. In the domain verification screen, Brevo will provide a TXT record to add to your DNS.
   
   It will look something like:
   ```
   Type: TXT
   Host: brevo
   Value: brevo-verification=a1b2c3d4e5f6g7h8i9j0...
   ```

2. Copy this record information
3. Log in to your domain registrar or DNS provider
4. Add the TXT record with the exact values provided
5. Wait for DNS propagation (may take 24-48 hours)
6. Return to Brevo and click "Verify Domain"

## Step 5: Set Up DKIM Authentication

After verifying domain ownership, you'll need to set up DKIM:

1. In the same domain settings page, locate the DKIM section
2. Click on "Set up DKIM"
3. Brevo will generate a DKIM selector and record value
   
   It will look something like:
   ```
   Type: TXT
   Host: brevo._domainkey
   Value: k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDeMVIzrCa3T14Jrm...
   ```

4. Copy the DKIM record information
5. Log in to your domain registrar or DNS provider
6. Add the TXT record with the exact values provided
7. Wait for DNS propagation (may take 24-48 hours)
8. Return to Brevo and click "Verify DKIM Setup"

## Step 6: Verify Records Using Brevo's Tools

1. In the domain settings page, locate the "Verify" buttons for both domain verification and DKIM
2. Click each to have Brevo check if the records are properly configured
3. If verification fails, wait longer for DNS propagation or double-check your DNS records

## Step 7: Configure Default Sender Information

1. Still in the "Senders & IPs" section, click on the "Senders" tab
2. Click "+ Add a New Sender"
3. Fill in the sender details:
   - Name: Eli's Bar Mitzvah
   - Email: rsvps@elibarkin.com
   - Company: Barkin Family
   - Address: 1245 S Gaylord St, Denver, CO 80210
   - City: Denver
   - Zip Code: 80210
   - Country: United States
4. Click "Save"

## Step 8: Verify Your Setup with Our Tools

After completing the Brevo configuration:

1. Run our enhanced email deliverability test:
   ```bash
   node enhanced-email-deliverability-test.js
   ```

2. All DNS checks should now pass with green checkmarks

## Troubleshooting

### Domain Verification Issues

- **TXT Record Not Found**: DNS propagation can take 24-48 hours. Wait and try again.
- **Incorrect TXT Record**: Double-check that you've added the record exactly as provided by Brevo.
- **Wrong Host Value**: Make sure you've added the TXT record to the correct subdomain/host.

### DKIM Verification Issues

- **DKIM Record Not Found**: DNS propagation can take 24-48 hours. Wait and try again.
- **Incorrect DKIM Format**: The DKIM record must be added exactly as provided, including all quotation marks and spaces.
- **TXT Record vs DKIM Record**: Some DNS providers have a specific DKIM record type. Use TXT type if unsure.

### Email Sending Issues

- **Emails Still Going to Spam**: Full authentication effect can take time. Continue monitoring for a week.
- **Authentication Failing**: Use [Mail Tester](https://www.mail-tester.com/) to get a detailed report.
- **Brevo Sending Limits**: Check your Brevo plan's daily sending limits to avoid issues.

## Getting Help

If you encounter issues with Brevo setup:

1. Contact Brevo Support through your account
2. Use our email deliverability FAQ for common issues
3. Run `node enhanced-email-deliverability-test.js` for detailed diagnostics

---

*Last updated: May 6, 2025*
