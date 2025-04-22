# Firebase Functions v1 to v2 Migration Plan

## Current Status

- ✅ Created a new codebase for v2 functions
- ✅ Deployed a test function to verify v2 functionality
- ✅ Deployed getApiKeysV2 function as a v2 function

## Migration Steps

### Phase 1: Migrate HTTP Functions

1. ✅ testV2Function (already migrated)
2. ✅ getApiKeysV2 (already migrated)
3. ✅ removeDuplicateGuestsV2 (renamed to avoid conflicts)
4. ✅ manualSyncSheetChangesV2 (renamed to avoid conflicts, needs troubleshooting)
5. ✅ importGuestListV2 (renamed to avoid conflicts)

### Phase 2: Migrate Firestore Trigger Functions

1. ✅ sendStyledRsvpConfirmationV2 (renamed to avoid conflicts)
2. ✅ sendStyledRsvpUpdateConfirmationV2 (renamed to avoid conflicts)
3. ✅ sendStyledAdminNotificationV2 (renamed to avoid conflicts)
4. ✅ sendOutOfTownGuestEmailV2 (renamed to avoid conflicts)
5. ✅ sendOutOfTownEventNotificationV2 (renamed to avoid conflicts)
6. ✅ updateMasterSheetV2 (renamed to avoid conflicts)
7. ✅ syncGuestToSheetV2 (renamed to avoid conflicts)

### Phase 3: Migrate Scheduled Functions

1. ✅ syncSheetChangesV2 (renamed to avoid conflicts)

### Phase 4: Migrate Callable Functions

1. ✅ manualUpdateMasterSheetV2 (renamed to avoid conflicts)

### Phase 5: Cleanup

1. ✅ Remove v1 functions
2. ✅ Update client code to use v2 functions
3. ✅ Remove v1 codebase

## Migration Process for Each Function

1. Copy the function code to the v2 codebase
2. Update imports to use v2 syntax
3. Add secrets configuration
4. Deploy and test the v2 function
5. Update client code to use the v2 function
6. Remove the v1 function

## Notes

- Keep both v1 and v2 functions running in parallel during migration
- Test each function thoroughly before removing the v1 version
- Update client code to use v2 functions one by one
