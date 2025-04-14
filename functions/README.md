# Firebase Cloud Functions for Eli's Be Mitzvah RSVP System

This directory contains Firebase Cloud Functions that enhance the RSVP system:

## Email Notifications

The `sendEmailOnNewRSVP` function automatically sends an email notification to jacobsamuelbarkin@gmail.com whenever a new RSVP is submitted.

## Deployment Instructions

To deploy these functions:

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Install dependencies:
   ```bash
   cd functions
   npm install
   ```

4. Deploy the functions:
   ```bash
   firebase deploy --only functions
   ```

## Security Note

The email credentials are stored directly in the code for simplicity. For better security, consider using Firebase environment variables:

```bash
firebase functions:config:set gmail.email="jacobsamuelbarkin@gmail.com" gmail.password="your-app-password"
```

Then update the code to use:
```javascript
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
```
