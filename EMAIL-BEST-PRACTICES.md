# Email Deliverability Best Practices

This guide provides essential best practices for maintaining excellent email deliverability for Eli's Be Mitzvah website communications.

## Content Best Practices

### Subject Lines

✅ **Recommended**:
- Use clear, specific descriptions of email content
- Keep subject lines under 50 characters
- Include recipient's name when possible
- Examples:
  - "Eli's Be Mitzvah - Your RSVP Confirmation"
  - "Important Updates for Eli's Celebration"
  - "Your Travel Information for August 23rd"

❌ **Avoid**:
- ALL CAPS in subject lines
- Excessive punctuation (!!!)
- Special characters ($, %, @)
- Spam trigger words ("free", "urgent", "don't miss out")

### Email Body

✅ **Recommended**:
- Maintain 60% text to 40% images ratio
- Use responsive design that works on mobile
- Include plain text alternative in HTML emails
- Use descriptive link text ("View RSVP Details" not "Click here")
- Personalize content based on recipient data
- Include physical mailing address in footer

❌ **Avoid**:
- Sending one large image as an email
- Using URL shorteners in emails
- Excessive use of colors or fonts
- Embedding videos (use thumbnails with links instead)
- Attachments (host files online and link to them)

## Sending Practices

### Timing and Frequency

- **Best Times to Send**:
  - Weekdays: 10am-2pm in recipient's local time
  - Tuesday, Wednesday, Thursday perform best
  - Allow 2-3 days between mass emails

- **Frequency Guidelines**:
  - For Eli's Be Mitzvah, limit to 4-5 key communications:
    1. Initial invitation
    2. RSVP reminder (if needed)
    3. Pre-event information (1-2 weeks before)
    4. Last-minute details (3-5 days before)
    5. Post-event thank you

### List Management

- Keep your guest list clean and accurate
- Remove hard bounces immediately
- Process unsubscribe requests within 24 hours
- Update contact information promptly
- Segment your list (local vs. out-of-town guests)

## Technical Best Practices

### Authentication

- Properly implement SPF, DKIM, and DMARC
- Use consistent sender information
- Send from verified domains only
- Set proper List-Unsubscribe headers

### Testing

- Send test emails before each campaign
- Test on multiple devices and email clients
- Check for broken links or missing images
- Verify all personalization tags work properly
- Monitor deliverability metrics after sending

## Monitoring and Optimization

### Key Metrics to Track

| Metric | Good | Concerning | Poor |
|--------|------|------------|------|
| Open Rate | >20% | 10-20% | <10% |
| Click Rate | >4% | 2-4% | <2% |
| Bounce Rate | <2% | 2-5% | >5% |
| Spam Complaints | <0.1% | 0.1-0.3% | >0.3% |

### Regular Checks

- **Weekly**: Review Brevo analytics dashboard
- **Monthly**: Run email deliverability test
- **After DNS Changes**: Re-verify authentication
- **After Template Changes**: Test with major providers

## Gmail-Specific Considerations

Since many guests likely use Gmail:

1. **Avoid the Promotions Tab**:
   - Use conversational language and tone
   - Avoid excessive formatting and marketing language
   - Use consistent From name and address

2. **Gmail Performance Monitoring**:
   - Create a free account at [Gmail Postmaster Tools](https://postmaster.google.com/)
   - Monitor domain reputation
   - Track spam rates

## Quick Reference: Email Templates

| Email Type | Subject Line | Sending Timing | Key Content |
|------------|--------------|----------------|------------|
| RSVP Confirmation | "Eli's Be Mitzvah - Your RSVP is Confirmed" | Immediately after RSVP | Date, time, confirmation details |
| Out-of-Town Info | "Important Travel Details for Eli's Be Mitzvah" | 4-6 weeks before | Hotel info, schedule, local tips |
| Final Instructions | "Everything You Need to Know for Eli's Be Mitzvah" | 3-5 days before | Schedule, parking, what to bring |
| Thank You | "Thank You for Celebrating with Eli" | 1-2 weeks after | Photos, gratitude, follow-up info |

---

*Last Updated: May 7, 2025*
