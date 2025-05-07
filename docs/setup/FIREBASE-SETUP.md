# Firebase Setup Instructions

This document provides step-by-step instructions for setting up Firebase for the RSVP system.

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "Eli-Barkin-Be-Mitzvah")
4. Follow the setup wizard (you can disable Google Analytics if you don't need it)
5. Click "Create project"

## 2. Set Up Firestore Database

1. In the Firebase Console, select your project
2. In the left sidebar, click "Firestore Database"
3. Click "Create database"
4. Start in production mode (or test mode if you're just testing)
5. Choose a location closest to your users (e.g., "us-central")
6. Click "Enable"

## 3. Set Up Authentication

1. In the left sidebar, click "Authentication"
2. Click "Get started"
3. Select "Email/Password" as the sign-in method
4. Enable it and click "Save"
5. Go to the "Users" tab
6. Click "Add user"
7. Enter your email and a password (this will be used to access the dashboard)
8. Click "Add user"

## 4. Get Firebase Configuration

1. In the left sidebar, click "Project settings" (the gear icon)
2. Scroll down to "Your apps" section
3. Click the web icon (</>) to add a web app
4. Register your app with a nickname (e.g., "RSVP System")
5. Click "Register app"
6. Copy the Firebase configuration object (it looks like this):

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

7. Paste this configuration into the `firebase-config.js` file, replacing the placeholder values

## 5. Set Up Firestore Security Rules

1. In the left sidebar, click "Firestore Database"
2. Click the "Rules" tab
3. Replace the default rules with the following:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to authenticated users only
    match /rsvps/{document=**} {
      allow read: if request.auth != null;
      allow write: if true; // Allow anyone to submit an RSVP
    }
  }
}
```

4. Click "Publish"

## 6. Deploy Your Website

1. Update the links in your website to point to the Firebase versions:
   - Change `rsvp.html` links to `rsvp-firebase.html`
   - Add a link to `rsvp-dashboard-firebase.html` for administrators

2. Test the RSVP form and dashboard locally

3. When everything is working correctly, deploy your website to your hosting provider

## 7. Monitoring and Maintenance

1. You can monitor RSVP submissions in the Firebase Console:
   - Go to "Firestore Database"
   - Click on the "rsvps" collection

2. You can manage dashboard users in the Firebase Console:
   - Go to "Authentication"
   - Click on the "Users" tab

## Troubleshooting

- **CORS Issues**: If you encounter CORS issues, make sure your Firebase project has the correct domain listed in the Firebase Console under Project Settings > General > Your Apps > Authorized Domains.

- **Authentication Issues**: If you can't log in to the dashboard, try resetting your password in the Firebase Console.

- **Quota Limits**: The free tier of Firebase has generous limits, but if you expect more than 50,000 reads per day, consider upgrading to the Blaze plan.

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
