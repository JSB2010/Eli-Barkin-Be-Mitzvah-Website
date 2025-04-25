# Eli Barkin Be Mitzvah Website

This repository contains the website for Eli Barkin's Be Mitzvah celebration.

## Hosting

This website is hosted on Cloudflare Pages.

## Features

- Information about the event
- RSVP form
- Firebase integration for RSVP handling
- Mobile-responsive design
- Admin dashboard for RSVP management
- Google Sheets integration for guest list management

## Security Notes

### Firebase Configuration

The Firebase configuration in this repository includes an API key that is restricted to:
- Only work with specific Firebase services (Authentication, Firestore)
- Only work from approved domains/origins
- Have proper Firebase Security Rules in place to restrict access

This is a standard practice for client-side Firebase applications and does not pose a security risk when properly configured with security rules.

### Required Secrets (Not in Repository)

The following secrets are required for full functionality but are NOT included in this repository:

1. **Google Sheets Service Account Key**: Required for the Google Sheets integration
   - Set as a Firebase Function secret named `SHEETS_CREDENTIALS`

2. **Google Sheets ID**: The ID of the Google Sheet used for guest management
   - Set as a Firebase Function secret named `SHEETS_SHEET_ID`

3. **Brevo API Key**: Required for sending email notifications
   - Set as a Firebase Function secret named `BREVO_API_KEY`

These secrets should be set using the Firebase CLI:
```
firebase functions:secrets:set SECRET_NAME
```

## Local Development

To run this website locally:

1. Clone the repository
2. Open any HTML file in your browser
3. For full functionality including Firebase features, you'll need to:
   - Create a Firebase project
   - Set up Firestore with the appropriate collections
   - Configure Firebase Functions with the required secrets
