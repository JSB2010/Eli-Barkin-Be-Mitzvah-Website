# Eli Barkin Be Mitzvah Website

![Eli Barkin Be Mitzvah Logo](logo.PNG)

This repository contains the website for Eli Barkin's Be Mitzvah celebration, scheduled for August 23, 2025, at Coors Field in Denver, Colorado. The website serves as an information hub for guests and provides RSVP functionality with administrative capabilities.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Firebase Setup](#firebase-setup)
- [Google Sheets Integration](#google-sheets-integration)
- [Email Notifications](#email-notifications)
- [Deployment](#deployment)
- [Security Notes](#security-notes)
- [Contributing](#contributing)
- [License](#license)

## Overview

The Eli Barkin Be Mitzvah Website is a comprehensive platform designed to:
- Provide information about Eli's journey and the upcoming celebration
- Allow guests to RSVP online with special handling for out-of-town guests
- Manage guest responses through an administrative dashboard
- Synchronize RSVP data with Google Sheets for easy management
- Send automated email notifications for RSVP confirmations

## Features

### Public-Facing Features
- **Home Page**: Introduction to the event with key details
- **Eli's Journey**: Personal story and background
- **Game Day Details**: Information about the venue, schedule, and logistics
- **RSVP System**:
  - Guest search functionality
  - Dynamic form that adjusts based on guest information
  - Special options for out-of-town guests (Friday dinner at Linger, Sunday brunch)
  - Mobile-responsive design with intuitive controls
- **Family & Out-of-Town Guests**: Special information for traveling attendees

### Administrative Features
- **RSVP Dashboard**:
  - Secure login system
  - Real-time RSVP statistics and analytics
  - Guest list management
  - Google Sheets synchronization
  - Email notification system
  - System administration tools

## Technology Stack

- **Frontend**:
  - HTML5, CSS3, JavaScript (Vanilla)
  - Responsive design using CSS Grid and Flexbox
  - Font Awesome for icons
  - Google Fonts for typography

- **Backend**:
  - Firebase Authentication for secure admin access
  - Firebase Firestore for database storage
  - Firebase Functions (v2) for serverless backend operations
  - Google Sheets API for data synchronization
  - Brevo (formerly Sendinblue) for email notifications

- **Hosting & Deployment**:
  - Cloudflare Pages for website hosting
  - GitHub for version control and CI/CD

## Project Structure

```
/
├── index.html                  # Home page
├── journey.html                # Eli's Journey page
├── the-big-day.html            # Event details page
├── rsvp.html                   # RSVP form page
├── family-details.html         # Information for out-of-town guests
├── rsvp-dashboard.html         # Admin dashboard (requires login)
├── firebase_functions_v2/      # Firebase Functions code
│   ├── index.js                # Main functions entry point
│   ├── update-master-sheet.js  # Google Sheets integration
│   ├── enhanced-email-functions.js # Email notification system
│   └── ...                     # Other function modules
├── styles.css                  # Main stylesheet
├── header-footer.css           # Header and footer styles
├── modern-dashboard.css        # Dashboard styling
├── firebase-config.js          # Firebase configuration
├── firebase-dashboard.js       # Dashboard functionality
├── rsvp-system.js              # RSVP form logic
└── ...                         # Other supporting files
```

## Installation

### Prerequisites
- Git
- Web browser
- Firebase CLI (for full functionality)
- Node.js v16+ (for Firebase Functions development)

### Local Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/JSB2010/Eli-Barkin-Be-Mitzvah-Website.git
   cd Eli-Barkin-Be-Mitzvah-Website
   ```

2. Open any HTML file in your browser to view the site:
   ```bash
   open index.html
   ```

3. For full functionality including Firebase features:
   - Create a `.env` file based on `.env.example`
   - Configure Firebase as described in the Configuration section

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Firebase Configuration
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
FIREBASE_APP_ID=your-app-id
FIREBASE_MEASUREMENT_ID=your-measurement-id

# Google Sheets Integration
SHEETS_CREDENTIALS={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"..."}
SHEETS_SHEET_ID=your-google-sheet-id

# Email Integration
BREVO_API_KEY=your-brevo-api-key
GMAIL_EMAIL=your-gmail-email
GMAIL_PASSWORD=your-gmail-app-password
ADMIN_EMAIL=admin-notification-email
```

## Firebase Setup

### Project Setup

1. Create a new Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication, Firestore, and Functions
3. Set up Authentication with Email/Password provider
4. Create an admin user through the Firebase console

### Firestore Collections

The application uses the following Firestore collections:

- **guestList**: Master list of invited guests
  - Fields: `name`, `email`, `phone`, `address`, `state`, `hasResponded`, etc.

- **sheetRsvps**: RSVP submissions
  - Fields: `name`, `email`, `phone`, `attending`, `adultCount`, `childCount`, `adultGuests`, `childGuests`, `fridayDinner`, `sundayBrunch`, `submittedAt`, etc.

- **apiKeys**: Secure storage for API keys (admin access only)
  - Document: `config`
  - Fields: `github`, `googleAnalytics`, `cloudflare`, `brevo`

### Firebase Functions

Deploy the Firebase Functions:

```bash
cd firebase_functions_v2
npm install
firebase deploy --only functions
```

### Firebase Secrets

Set up the required secrets:

```bash
firebase functions:secrets:set SHEETS_CREDENTIALS
firebase functions:secrets:set SHEETS_SHEET_ID
firebase functions:secrets:set BREVO_API_KEY
firebase functions:secrets:set GMAIL_EMAIL
firebase functions:secrets:set GMAIL_PASSWORD
firebase functions:secrets:set ADMIN_EMAIL
```

## Google Sheets Integration

The system synchronizes RSVP data with a Google Sheet for easier management:

1. Create a Google Sheet with the following columns:
   - Name Line 1 (First and Last Name)
   - Email
   - Phone
   - State
   - Submitted
   - Submission ID
   - Name
   - Attending
   - Guest Count
   - Adults
   - Children
   - Submitted At
   - Dinner at Linger (for out-of-town guests)
   - Sunday Brunch (for out-of-town guests)

2. Create a Google Cloud service account with access to the Google Sheets API
3. Share your Google Sheet with the service account email
4. Save the service account credentials JSON as a Firebase secret

## Email Notifications

The system uses Brevo (formerly Sendinblue) to send email notifications:

1. Create a Brevo account at [brevo.com](https://www.brevo.com/)
2. Generate an API key from the Brevo dashboard
3. Set the API key as a Firebase secret
4. Customize email templates in `firebase_functions_v2/brevo-email-templates.js`

## Deployment

### Cloudflare Pages

The website is configured for deployment to Cloudflare Pages:

1. Create a Cloudflare Pages project
2. Connect to your GitHub repository
3. Configure build settings:
   - Build command: (leave empty)
   - Build output directory: /
4. Deploy the site

### GitHub Actions (Optional)

A GitHub Actions workflow can be set up for automated deployments:

1. Create `.github/workflows/deploy.yml`
2. Configure the workflow to deploy to Cloudflare Pages on push to main

## Security Notes

### Firebase Configuration

The Firebase configuration in this repository includes an API key that is restricted to:
- Only work with specific Firebase services (Authentication, Firestore)
- Only work from approved domains/origins
- Have proper Firebase Security Rules in place to restrict access

This is a standard practice for client-side Firebase applications and does not pose a security risk when properly configured with security rules.

### Firestore Security Rules

Implement proper security rules in your Firebase project:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read access to guestList for RSVP form
    match /guestList/{document} {
      allow read: if true;
      allow write: if false;
    }

    // Allow authenticated users to read/write RSVP submissions
    match /sheetRsvps/{document} {
      allow read: if true;
      allow write: if true;
    }

    // Restrict API keys to authenticated admin users
    match /apiKeys/{document} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

### Required Secrets (Not in Repository)

The following secrets are required for full functionality but are NOT included in this repository:

1. **Google Sheets Service Account Key**: Required for the Google Sheets integration
   - Set as a Firebase Function secret named `SHEETS_CREDENTIALS`

2. **Google Sheets ID**: The ID of the Google Sheet used for guest management
   - Set as a Firebase Function secret named `SHEETS_SHEET_ID`

3. **Brevo API Key**: Required for sending email notifications
   - Set as a Firebase Function secret named `BREVO_API_KEY`

4. **Gmail Credentials**: For admin notifications
   - Set as Firebase Function secrets named `GMAIL_EMAIL` and `GMAIL_PASSWORD`

5. **Admin Email**: For receiving notifications
   - Set as a Firebase Function secret named `ADMIN_EMAIL`

## Contributing

Contributions to improve the website are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is privately maintained for the Barkin family's Be Mitzvah celebration. All rights reserved.
