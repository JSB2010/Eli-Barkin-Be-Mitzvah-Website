# Email Authentication Technical Reference

This document provides comprehensive technical details on implementing email authentication for the Eli Barkin Be Mitzvah website. It covers all aspects of SPF, DKIM, DMARC, and Return-Path configuration.

## DNS Record Reference

These are the exact DNS records required for proper email authentication:

| Record Type | Host/Name | Value | Purpose |
|-------------|-----------|-------|---------|
| TXT | @ | `v=spf1 include:spf.sendinblue.com include:_spf.google.com ~all` | SPF Authentication |
| TXT | [selector provided by Brevo]._domainkey | [key provided by Brevo] | DKIM Authentication |
| TXT | _dmarc | `v=DMARC1; p=none; sp=none; rua=mailto:jacobsamuelbarkin@gmail.com; adkim=r; aspf=r; pct=100;` | DMARC Policy |
| CNAME | bounce | [value provided by Brevo] | Return-Path/Bounce Handling |

## SPF (Sender Policy Framework)

### What is SPF?
SPF is an email authentication method that specifies which mail servers are authorized to send email on behalf of your domain. It helps prevent spoofing and phishing.

### SPF Record Breakdown:
```
v=spf1 include:spf.sendinblue.com include:_spf.google.com ~all
```

- `v=spf1`: SPF version 1
- `include:spf.sendinblue.com`: Authorizes Brevo (Sendinblue) mail servers
- `include:_spf.google.com`: Authorizes Google mail servers (if using Gmail or Google Workspace)
- `~all`: Soft fail for all other servers (recommended for initial implementation)

### SPF Mechanisms:

| Mechanism | Description | Example |
|-----------|-------------|---------|
| `include` | Includes another domain's SPF record | `include:_spf.google.com` |
| `a` | Authorizes the domain's A records | `a:mail.example.com` |
| `mx` | Authorizes the domain's MX records | `mx` |
| `ip4` | Authorizes an IPv4 address or range | `ip4:192.168.0.1/24` |

### SPF Qualifiers:

| Qualifier | Symbol | Description | Recommendation |
|-----------|--------|-------------|---------------|
| Pass | `+` | Authorized (default) | Use for trusted servers |
| Soft Fail | `~` | Not authorized but don't reject | Use for initial implementation |
| Fail | `-` | Not authorized, reject | Use after testing is complete |
| Neutral | `?` | No policy | Not recommended |

## DKIM (DomainKeys Identified Mail)

### What is DKIM?
DKIM adds a digital signature to emails that verifies they were sent from your domain and haven't been tampered with in transit.

### DKIM Record Structure:
```
v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDeMVIzrCa3T14Jrm...
```

- `v=DKIM1`: DKIM version 1
- `k=rsa`: Key type (RSA)
- `p=...`: Public key value

### DKIM Implementation Steps:

1. **Generate Keys**: Brevo automatically generates the public/private key pair
2. **Configure DNS**: Add the public key to your DNS as a TXT record
3. **Configure Sending Service**: Brevo configures their system to sign outgoing emails
4. **Test**: Verify proper signing using the included test tools

### DKIM Selectors:
Selectors allow multiple DKIM keys for a single domain. Brevo typically uses a selector name like "brevo" or "mail".

## DMARC (Domain-based Message Authentication, Reporting & Conformance)

### What is DMARC?
DMARC builds upon SPF and DKIM by telling receiving mail servers what to do when an email fails authentication checks.

### DMARC Record Breakdown:
```
v=DMARC1; p=none; sp=none; rua=mailto:jacobsamuelbarkin@gmail.com; adkim=r; aspf=r; pct=100;
```

- `v=DMARC1`: DMARC version 1
- `p=none`: Policy for domain (monitoring only, no action)
- `sp=none`: Policy for subdomains
- `rua=mailto:jacobsamuelbarkin@gmail.com`: Report URI for aggregate reports
- `adkim=r`: DKIM alignment mode (relaxed)
- `aspf=r`: SPF alignment mode (relaxed)
- `pct=100`: Percentage of emails subject to filtering

### DMARC Policy Options:

| Policy | Value | Description | Recommendation |
|--------|-------|-------------|---------------|
| None | `p=none` | Monitor only, no action | Start with this |
| Quarantine | `p=quarantine` | Mark as suspicious | Implement after successful monitoring |
| Reject | `p=reject` | Reject email | Final implementation |

### DMARC Implementation Strategy:

1. **Start with Monitoring**: Implement `p=none` to collect data without affecting delivery
2. **Analyze Reports**: Review aggregate reports received at the specified email address
3. **Gradually Increase Policy**: After 2-4 weeks without issues, move to `p=quarantine`
4. **Full Protection**: After another 2-4 weeks, consider `p=reject` for maximum security

## Return-Path Configuration

### What is Return-Path?
The Return-Path (also called bounce address) is where delivery failure notifications are sent. Properly configuring it helps with:

1. Bounce handling
2. Feedback loop processing
3. Sender reputation management

### Return-Path Implementation:

1. **Create CNAME Record**:
   ```
   Type: CNAME
   Host: bounce
   Value: [provided by Brevo]
   ```

2. **Configure Email Headers**:
   - All emails should use `bounce@elibarkin.com` as the Return-Path
   - This is handled automatically by Brevo when properly configured

## Email Authentication Headers

When authentication is working correctly, these headers will be visible in received emails:

### SPF Header Example:
```
Authentication-Results: mx.google.com;
   spf=pass (google.com: domain of rsvps@elibarkin.com designates 123.45.67.89 as permitted sender) smtp.mailfrom=rsvps@elibarkin.com
```

### DKIM Header Example:
```
Authentication-Results: mx.google.com;
   dkim=pass header.i=@elibarkin.com header.s=brevo header.b=a1b2c3d4
```

### DMARC Header Example:
```
Authentication-Results: mx.google.com;
   dmarc=pass (p=none sp=none dis=none) header.from=elibarkin.com
```

## Verification Commands

Use these commands to verify your DNS configuration:

### Check SPF Record:
```bash
dig TXT elibarkin.com
```

### Check DKIM Record:
```bash
dig TXT [selector]._domainkey.elibarkin.com
```

### Check DMARC Record:
```bash
dig TXT _dmarc.elibarkin.com
```

### Check Return-Path Record:
```bash
dig CNAME bounce.elibarkin.com
```

## Additional Technical Resources

- [SPF Record Syntax](http://www.openspf.org/SPF_Record_Syntax)
- [DKIM Explained](https://help.brevo.com/hc/en-us/articles/360020739799-Set-up-DKIM-with-Brevo)
- [DMARC.org](https://dmarc.org/wiki/FAQ)
- [MX Toolbox SuperTool](https://mxtoolbox.com/SuperTool.aspx)

---

*Last Updated: May 7, 2025*
