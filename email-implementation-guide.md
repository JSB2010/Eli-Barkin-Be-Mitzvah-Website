# Implementing Email Deliverability Improvements

This document provides step-by-step instructions for implementing all the email deliverability recommendations to ensure your Eli's Bar Mitzvah emails reach the intended recipients.

## Implementation Checklist

- [ ] Set up DNS records (SPF, DKIM, DMARC)
- [ ] Configure Brevo domain authentication
- [ ] Install email testing tools
- [ ] Run initial deliverability tests
- [ ] Review and update email templates
- [ ] Test with real-world email providers
- [ ] Monitor deliverability metrics

## Step 1: Install Test Tools

First, let's install the necessary tools to test your email setup:

```bash
# Clone the repository if you haven't already
cd /Users/jbarkin28/Eli-Barkin-Be-Mitzvah-Website

# Install dependencies for the email testing tools
npm install --prefix . axios chalk
```

## Step 2: Test Current Configuration

Before making any changes, run the test script to see your current email authentication setup:

```bash
# Run the email deliverability test
node email-deliverability-test.js
```

Take note of any issues identified by the test.

## Step 3: Set Up DNS Records

### SPF Record

1. Log in to your domain registrar (e.g., GoDaddy, Namecheap)
2. Navigate to DNS settings for `elibarkin.com`
3. Add or update the SPF record:

| Record Type | Host | Value | TTL |
|-------------|------|-------|-----|
| TXT | @ | v=spf1 include:spf.sendinblue.com include:_spf.google.com ~all | 3600 |

### DKIM Setup

1. Log in to your Brevo account (https://app.brevo.com)
2. Go to Settings → Senders & IPs → Manage Domains
3. Click "Add a new domain"
4. Enter `elibarkin.com` and follow the setup wizard
5. Add the provided CNAME records to your domain's DNS

### DMARC Record

Add a DMARC record to your DNS settings:

| Record Type | Host | Value | TTL |
|-------------|------|-------|-----|
| TXT | _dmarc | v=DMARC1; p=none; sp=none; rua=mailto:jacobsamuelbarkin@gmail.com; adkim=r; aspf=r; pct=100; | 3600 |

### Return-Path/Bounce Domain

Add a bounce domain CNAME record:

| Record Type | Host | Value | TTL |
|-------------|------|-------|-----|
| CNAME | bounce | Provided by Brevo (typically like bounce.sendinblue.com) | 3600 |

## Step 4: Verify DNS Configuration

After adding the DNS records (and waiting 24-48 hours for propagation):

1. Run the email deliverability test again:
   ```bash
   node email-deliverability-test.js
   ```

2. Use external tools to verify:
   - [MX Toolbox](https://mxtoolbox.com/SuperTool.aspx) - Check SPF, DKIM, and DMARC
   - [Mail Tester](https://www.mail-tester.com/) - Send a test email and get a deliverability score

## Step 5: Test Actual Email Delivery

Now let's test actual email delivery to major email providers:

```bash
# Set your Brevo API key
export BREVO_API_KEY=your-api-key-here

# Run the email delivery test
node test-email-delivery.js
```

Follow the prompts to select the type of test and enter test email addresses.

## Step 6: Create Monitoring Plan

Set up regular monitoring of email deliverability:

1. Create a Google Postmaster Tools account:
   - Visit [Google Postmaster Tools](https://postmaster.google.com/)
   - Add and verify your domain
   - Monitor reputation, spam rates, and authentication results

2. Set up regular testing:
   ```bash
   # Add this to your calendar to run monthly
   node email-deliverability-test.js
   ```

3. Review Firebase email logs regularly to check for bounces and issues.

## Step 7: Gradual DMARC Policy Upgrade

After monitoring email delivery for at least 2-4 weeks with no issues:

1. Update your DMARC record to quarantine mode:
   ```
   v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:jacobsamuelbarkin@gmail.com; adkim=r; aspf=r; pct=100;
   ```

2. After another 2-4 weeks of successful delivery, consider upgrading to reject mode:
   ```
   v=DMARC1; p=reject; sp=reject; rua=mailto:jacobsamuelbarkin@gmail.com; adkim=r; aspf=r; pct=100;
   ```

## Common Issues & Fixes

### Emails Still Going to Spam

If after implementing these changes, emails still go to spam:

1. **Check email content**:
   - Avoid spam-triggering words in subject lines
   - Maintain a good text-to-image ratio (60% text, 40% images)
   - Ensure links point to your own domain when possible

2. **Review sending patterns**:
   - Send at a consistent volume
   - Avoid sudden large batches of emails
   - Space out bulk sends by at least 24 hours

3. **Header issues**:
   - Verify `From`, `Reply-To`, and `Return-Path` all use the same domain
   - Ensure proper List-Unsubscribe headers are included

### Brevo Setup Issues

If you encounter issues with Brevo domain authentication:

1. Contact Brevo support directly
2. Verify DNS records with an external DNS lookup tool
3. Check for conflicts with existing DNS records

## Resources

- [Email Authentication Guide](./email-authentication-guide.md)
- [Email Deliverability Best Practices](./email-deliverability-best-practices.md)
- [Email Deliverability FAQ](./email-deliverability-faq.md)
- [Brevo Documentation](https://help.brevo.com/hc/en-us/categories/360000109729-Email)
