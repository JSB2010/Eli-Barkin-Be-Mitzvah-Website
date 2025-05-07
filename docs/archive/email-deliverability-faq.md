# Email Deliverability FAQ & Troubleshooting Guide

This comprehensive document answers common questions about email deliverability and provides detailed troubleshooting guidance for Eli's Be Mitzvah website.

## General Questions

### Q: Why are email deliverability improvements necessary?
**A:** Proper email authentication helps ensure your event communications reach guests' inboxes rather than spam folders. Without it, important information about Eli's Be Mitzvah could be missed by attendees.

### Q: Why are some of our emails going to spam/junk folders?
**A:** Email deliverability depends on multiple factors, including:
- Domain authentication (SPF, DKIM, DMARC)
- Email content and formatting
- Sending reputation
- Recipient engagement

We've implemented best practices for authentication, formatting, and sending practices. If you're still seeing issues, please follow the troubleshooting steps in this guide.

### Q: What email authentication standards are being implemented?
**A:** We're implementing three industry-standard email authentication protocols:
- **SPF** (Sender Policy Framework) - Verifies authorized sending servers
- **DKIM** (DomainKeys Identified Mail) - Adds a digital signature to verify authenticity
- **DMARC** (Domain-based Message Authentication) - Tells receiving servers how to handle authentication failures

### Q: How long will it take for the DNS changes to take effect?
**A:** DNS changes can take anywhere from a few minutes to 48 hours to propagate globally. For email authentication specifically, most providers will recognize the changes within 24 hours.

### Q: Do we need to make these changes with our domain registrar or our hosting provider?
**A:** The DNS changes should be made with whoever manages your domain's DNS settings. This is typically your domain registrar (like GoDaddy, Namecheap, etc.) but sometimes hosting providers manage DNS as well.

## Technical Questions

### Q: What's the difference between SPF, DKIM, and DMARC?
**A:** 
- **SPF** (Sender Policy Framework) verifies which mail servers are authorized to send email on behalf of your domain
- **DKIM** (DomainKeys Identified Mail) adds a digital signature to emails that verifies the content hasn't been tampered with
- **DMARC** (Domain-based Message Authentication) tells receiving mail servers what to do when SPF or DKIM checks fail

### Q: What email address should we use for sending communications?
**A:** Use `rsvps@elibarkin.com` consistently for all communications. Changing the sending address can negatively impact deliverability.

### Q: Is it normal to start with DMARC policy set to "none"?
**A:** Yes, starting with `p=none` is recommended as it puts DMARC in monitoring mode. This lets you receive reports without affecting delivery. After monitoring for 2-4 weeks with no issues, you can gradually increase to `p=quarantine` and eventually `p=reject`.

## Troubleshooting

### Q: How can I check if our domain authentication is set up correctly?
**A:** Use these tools:
1. Run the included `email-deliverability-test.js` script
2. [MX Toolbox](https://mxtoolbox.com/) - Test SPF, DKIM, and DMARC
3. [Mail Tester](https://www.mail-tester.com/) - Send an email and get a deliverability score

### Q: A specific guest reported not receiving our emails. What should I check?
**A:** Follow these steps:
1. Verify the email address is correct in your system
2. Check if previous emails to this address have bounced (check the emailLogs collection)
3. Ask the recipient to check their spam/junk folder
4. Ask them to add `rsvps@elibarkin.com` to their contacts
5. For Gmail users, ask them to check the "Promotions" tab

### Q: We've made DNS changes but the test script still shows issues. Why?
**A:** This could be due to:
1. DNS propagation delays (wait 24-48 hours)
2. Incorrect record formats or values
3. Records added to the wrong domain or subdomain

Check your DNS management interface and verify the records match exactly what's specified in the guide.

## Best Practices

### Q: How often should we be sending emails to our guests?
**A:** Limit mass emails to important updates only. For Eli's Be Mitzvah, good occasions include:
- Initial invitation
- Important updates about venue/timing
- Week-before reminders
- Post-event thank you

### Q: Should we use the same email templates for all communications?
**A:** While the overall design should be consistent for branding, vary the content substantially between emails. Email providers may filter repetitive content patterns as spam.

### Q: How can we monitor our email performance?
**A:** Use these methods:
1. Check Brevo's analytics dashboard regularly
2. Review the Firebase `emailLogs` collection for delivery status
3. Set up Gmail Postmaster Tools if many guests use Gmail
4. Run the `email-deliverability-test.js` script monthly

## Additional Resources

- [Brevo Documentation](https://help.brevo.com/hc/en-us/categories/360000171099-Email-Marketing)
- [Gmail Postmaster Tools](https://postmaster.google.com/)
- [MX Toolbox](https://mxtoolbox.com/SuperTool.aspx) - DNS and email testing
- [Mail Tester](https://www.mail-tester.com/) - Email deliverability scoring
- [DMARC Analyzer](https://dmarc.postmarkapp.com/) - DMARC implementation help

## Detailed Troubleshooting Guide

### Diagnostic Steps

#### Step 1: Run the Comprehensive Test
```bash
node enhanced-email-deliverability-test.js
```
This will check all aspects of your email authentication setup.

#### Step 2: Examine Test Results
The test will show specific issues with your configuration. Look for red or yellow indicators and address those specific problems.

#### Step 3: Verify DNS Records Manually
Use these commands to check your DNS records directly:

```bash
# Check SPF
dig TXT elibarkin.com

# Check DKIM
dig TXT [selector]._domainkey.elibarkin.com

# Check DMARC
dig TXT _dmarc.elibarkin.com
```

#### Step 4: Test Real Email Delivery
```bash
export BREVO_API_KEY=your-brevo-api-key
node test-email-delivery.js
```

#### Step 5: Check Email Headers
For emails received during testing:
1. View the full email headers (procedure varies by email provider)
2. Look for `Authentication-Results` sections
3. Verify each mechanism shows "pass"

### Provider-Specific Troubleshooting

#### Gmail
- Register with [Gmail Postmaster Tools](https://postmaster.google.com/)
- Check domain and IP reputation
- Monitor feedback loop reports

#### Outlook/Hotmail
- Check for IP reputation issues at [Microsoft Smart Network Data Service](https://sendersupport.olc.protection.outlook.com/snds/)
- Maintain consistent sending patterns
- Respect Microsoft's sending limits

#### Yahoo
- Adhere strictly to authentication requirements
- Monitor complaint rates carefully
- Maintain consistent sending volume

### Getting Additional Help

If you encounter persistent issues after following these troubleshooting steps:

1. Check the [Brevo Help Center](https://help.brevo.com/)
2. Use [MX Toolbox](https://mxtoolbox.com/) for advanced diagnostics
3. Contact your domain registrar's support for DNS assistance
4. Reach out to jacobsamuelbarkin@gmail.com for project-specific support

---

*Last Updated: May 7, 2025*
