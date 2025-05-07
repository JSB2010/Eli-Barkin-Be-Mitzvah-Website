# Email Authentication Implementation Checklist

This streamlined checklist will help you track your progress in implementing email deliverability improvements for Eli's Be Mitzvah website.

## Getting Started

- [ ] Install required tools and dependencies
  ```bash
  npm install axios chalk fs readline
  ```
- [ ] Run the toolkit launcher for a guided experience
  ```bash
  node email-toolkit.js
  ```

## DNS Configuration

### SPF Record
- [ ] Add SPF record to domain DNS
  ```
  Type: TXT
  Host: @
  Value: v=spf1 include:spf.sendinblue.com include:_spf.google.com ~all
  TTL: 3600
  ```

### DKIM Record
- [ ] Generate DKIM keys in Brevo
- [ ] Add DKIM record to domain DNS
  ```
  Type: TXT
  Host: [selector]._domainkey
  Value: [provided by Brevo]
  TTL: 3600
  ```

### DMARC Record
- [ ] Add DMARC record to domain DNS
  ```
  Type: TXT
  Host: _dmarc
  Value: v=DMARC1; p=none; sp=none; rua=mailto:jacobsamuelbarkin@gmail.com; adkim=r; aspf=r; pct=100;
  TTL: 3600
  ```

### Return-Path Record
- [ ] Add Return-Path CNAME record
  ```
  Type: CNAME
  Host: bounce
  Value: [provided by Brevo]
  TTL: 3600
  ```

## Brevo Configuration

- [ ] Log in to Brevo account
- [ ] Add domain in Settings → Senders & IPs → Domains
- [ ] Verify domain ownership with provided TXT record
- [ ] Set up DKIM authentication
- [ ] Configure default sender with `rsvps@elibarkin.com`

## Testing & Verification

- [ ] Wait for DNS propagation (24-48 hours)
- [ ] Run enhanced email deliverability test
  ```bash
  node enhanced-email-deliverability-test.js
  ```
- [ ] Verify all authentication checks pass
- [ ] Test actual email delivery
  ```bash
  export BREVO_API_KEY=your-brevo-api-key
  node test-email-delivery.js
  ```
- [ ] Verify test emails land in inbox (not spam) for:
  - [ ] Gmail
  - [ ] Outlook/Hotmail
  - [ ] Yahoo Mail
  - [ ] Apple Mail/iCloud
- [ ] Check email headers to confirm: 
  - [ ] SPF: pass
  - [ ] DKIM: pass
  - [ ] DMARC: pass

## Ongoing Maintenance

- [ ] Schedule monthly authentication verification
- [ ] Create a testing calendar reminder
- [ ] Set up monitoring in Brevo dashboard
- [ ] After 2-4 weeks, consider upgrading DMARC policy from `p=none` to `p=quarantine`
- [ ] After further successful monitoring, consider upgrading to `p=reject`

## Final Verification

- [ ] Send a final test email to multiple providers
- [ ] Run third-party tests with:
  - [ ] [Mail Tester](https://www.mail-tester.com/)
  - [ ] [MX Toolbox](https://mxtoolbox.com/)
- [ ] Document the implementation date
- [ ] Set up a reminder for quarterly review

---

**Completion Date**: _________________

**Implemented By**: _________________
