# Firebase Functions v2 Migration

This directory contains the Firebase Functions v2 implementation for the Eli Barkin Be Mitzvah website.

## Migration Status

All functions have been successfully migrated from v1 to v2:

### HTTP Functions
- ✅ testV2Function - Simple test function to verify v2 functionality
- ✅ getApiKeysV2 - Function to retrieve API keys from Firestore
- ✅ removeDuplicateGuestsV2 - Function to remove duplicate guests
- ✅ manualSyncSheetChangesV2 - HTTP endpoint to manually trigger sheet sync

### Firestore Trigger Functions
- ✅ sendStyledRsvpConfirmationV2 - Sends confirmation email when a guest submits an RSVP
- ✅ sendStyledRsvpUpdateConfirmationV2 - Sends confirmation email when a guest updates their RSVP
- ✅ sendStyledAdminNotificationV2 - Sends admin notification when a guest submits or updates an RSVP
- ✅ sendOutOfTownGuestEmailV2 - Sends email to out-of-town guests with additional event information
- ✅ sendOutOfTownEventNotificationV2 - Sends notification when out-of-town guests update their event attendance
- ✅ updateMasterSheetV2 - Updates the master Google Sheet when an RSVP is submitted or updated

### Scheduled Functions
- ✅ syncSheetChangesV2 - Syncs changes from Google Sheet to Firestore every 60 minutes

### Callable Functions
- ✅ manualUpdateMasterSheetV2 - Manually updates all RSVPs in the master sheet

## Secrets Configuration

The following secrets need to be configured:

- SHEETS_CREDENTIALS - Google Sheets service account credentials (JSON)
- SHEETS_SHEET_ID - Google Sheets ID
- BREVO_API_KEY - Brevo API key for sending emails
- GMAIL_EMAIL - Gmail email for admin notifications
- GMAIL_PASSWORD - Gmail password or app password
- ADMIN_EMAIL - Admin email address for notifications

## Migration Process

1. Created a new codebase for v2 functions
2. Set up Firebase secrets
3. Migrated functions one by one, renaming them to avoid conflicts
4. Tested each function to ensure it works correctly
5. Updated the migration plan to track progress

## Migration Complete

1. ✅ Test all v2 functions thoroughly
2. ✅ Update client code to use v2 functions
3. ✅ Remove v1 functions once all v2 functions are working correctly

## Notes

- All v2 functions have been renamed with a "V2" suffix to avoid conflicts with v1 functions
- The v2 functions use the same Firestore collections as v1 functions
- The v2 functions use Firebase secrets instead of environment variables
