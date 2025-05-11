// RSVP Guest Search and Form Handling
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase if not already initialized
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded');
        return;
    }

    // Production mode - no debug panel

    // Get DOM elements
    const nameInput = document.getElementById('name');
    const autocompleteResults = document.getElementById('autocompleteResults');
    const additionalFields = document.getElementById('additionalFields');
    const submitButtonContainer = document.getElementById('submitButtonContainer');
    const submitButton = document.getElementById('submitButton');
    const guestFoundInfo = document.getElementById('guestFoundInfo');
    const existingSubmissionInfo = document.getElementById('existingSubmissionInfo'); // Added
    const guestCategoryElement = document.getElementById('guestCategory');
    const adultCountInput = document.getElementById('adultCount');
    const childCountInput = document.getElementById('childCount');
    const adultGuestsContainer = document.getElementById('adultGuestsContainer');
    const childGuestsContainer = document.getElementById('childGuestsContainer');
    const childGuestSection = document.getElementById('childGuestSection');
    const rsvpForm = document.getElementById('rsvpForm'); // Added
    const formTitle = document.getElementById('rsvp-form-title'); // Added
    const updateNotice = document.getElementById('updateNotice'); // Added

    // Log DOM elements to verify they exist
    console.log('DOM Elements loaded:', {
        nameInput: !!nameInput,
        autocompleteResults: !!autocompleteResults,
        additionalFields: !!additionalFields,
        submitButtonContainer: !!submitButtonContainer,
        submitButton: !!submitButton,
        guestFoundInfo: !!guestFoundInfo,
        existingSubmissionInfo: !!existingSubmissionInfo, // Added
        guestCategoryElement: !!guestCategoryElement,
        adultCountInput: !!adultCountInput,
        childCountInput: !!childCountInput,
        adultGuestsContainer: !!adultGuestsContainer,
        childGuestsContainer: !!childGuestsContainer,
        childGuestSection: !!childGuestSection,
        rsvpForm: !!rsvpForm, // Added
        formTitle: !!formTitle, // Added
        updateNotice: !!updateNotice // Added
    });

    // Variables to store selected guest data
    // Make it accessible to other scripts
    window.selectedGuest = null;
    window.existingSubmission = null; // Will store existing submission data + ID
    let selectedGuest = window.selectedGuest;
    let debounceTimer;

    // Set up autocomplete for name input
    if (nameInput) {
        nameInput.addEventListener('input', function() {
            const searchTerm = this.value.trim();

            // Clear previous timer
            clearTimeout(debounceTimer);

            // Hide results if search term is too short
            if (searchTerm.length < 2) {
                autocompleteResults.style.display = 'none';
                return;
            }

            // Debounce search to avoid too many requests
            debounceTimer = setTimeout(() => {
                searchGuests(searchTerm).then(results => {
                    displayAutocompleteResults(results);
                });
            }, 300);
        });

        // Handle keyboard navigation in autocomplete
        nameInput.addEventListener('keydown', function(e) {
            if (autocompleteResults.style.display === 'none') return;

            const items = autocompleteResults.querySelectorAll('.autocomplete-item');
            const selectedItem = autocompleteResults.querySelector('.selected');

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    handleArrowDown(items, selectedItem);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    handleArrowUp(selectedItem);
                    break;
                case 'Enter':
                    if (selectedItem) {
                        e.preventDefault();
                        selectGuest(selectedItem.getAttribute('data-id'));
                    }
                    break;
                case 'Escape':
                    autocompleteResults.style.display = 'none';
                    break;
            }
        });

        // Helper function for ArrowDown navigation
        function handleArrowDown(items, selectedItem) {
            if (!selectedItem) {
                if (items.length > 0) {
                    items[0].classList.add('selected');
                }
            } else {
                const nextItem = selectedItem.nextElementSibling;
                if (nextItem) {
                    selectedItem.classList.remove('selected');
                    nextItem.classList.add('selected');
                }
            }
        }

        // Helper function for ArrowUp navigation
        function handleArrowUp(selectedItem) {
            if (selectedItem) {
                const prevItem = selectedItem.previousElementSibling;
                if (prevItem) {
                    selectedItem.classList.remove('selected');
                    prevItem.classList.add('selected');
                }
            }
        }

        // Hide autocomplete when clicking outside
        document.addEventListener('click', function(e) {
            if (!nameInput.contains(e.target) && !autocompleteResults.contains(e.target)) {
                autocompleteResults.style.display = 'none';
            }
        });
    }

    // Display autocomplete results
    function displayAutocompleteResults(results) {
        autocompleteResults.innerHTML = '';

        if (results.length === 0) {
            autocompleteResults.style.display = 'none';
            return;
        }

        results.forEach(guest => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = guest.name;
            item.setAttribute('data-id', guest.id);

            item.addEventListener('click', function() {
                selectGuest(guest.id);
            });

            autocompleteResults.appendChild(item);
        });

        autocompleteResults.style.display = 'block';
    }

    // Select a guest from the autocomplete results - completely rewritten for reliability
    async function selectGuest(guestId) {
        console.log('[selectGuest] Starting guest selection for ID:', guestId);
        resetSubmissionState(); // Reset state before selecting a new guest

        // Hide UI elements until we confirm the guest and check for submission
        additionalFields.style.display = 'none';
        submitButtonContainer.style.display = 'none';
        guestFoundInfo.style.display = 'none';
        existingSubmissionInfo.style.display = 'none';
        updateNotice.style.display = 'none';
        // Don't clear the name input yet

        // Show loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'rsvp-loading';
        loadingIndicator.innerHTML = '<div class="spinner"></div><p>Checking RSVP status...</p>';
        loadingIndicator.style.position = 'fixed';
        loadingIndicator.style.top = '50%';
        loadingIndicator.style.left = '50%';
        loadingIndicator.style.transform = 'translate(-50%, -50%)';
        loadingIndicator.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        loadingIndicator.style.padding = '20px';
        loadingIndicator.style.borderRadius = '8px';
        loadingIndicator.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        loadingIndicator.style.zIndex = '1000';
        loadingIndicator.style.display = 'flex';
        loadingIndicator.style.flexDirection = 'column';
        loadingIndicator.style.alignItems = 'center';
        loadingIndicator.style.justifyContent = 'center';

        const spinner = document.createElement('style');
        spinner.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            #rsvp-loading .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3182ce;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 10px;
            }
        `;
        document.head.appendChild(spinner);
        document.body.appendChild(loadingIndicator);

        try {
            console.log('[selectGuest] Fetching guest data for ID:', guestId);
            const db = firebase.firestore();

            // STEP 1: Get the guest document from guestList
            let guestDoc;
            try {
                guestDoc = await db.collection('guestList').doc(guestId).get();

                if (!guestDoc.exists) {
                    console.error('[selectGuest] ERROR: Guest not found in guestList with ID:', guestId);
                    showErrorMessage('Guest Not Found', 'Could not find the selected guest in our list. Please try searching again or contact us if the problem persists.');
                    resetSubmissionState();
                    // Remove loading indicator
                    if (document.body.contains(loadingIndicator)) {
                        document.body.removeChild(loadingIndicator);
                    }
                    return false;
                }
            } catch (guestDocError) {
                console.error('[selectGuest] Error fetching guest document:', guestDocError);
                showErrorMessage('Database Error', 'There was a problem accessing the guest list. Please try again in a few moments or contact us if the problem persists.');
                resetSubmissionState();
                // Remove loading indicator
                if (document.body.contains(loadingIndicator)) {
                    document.body.removeChild(loadingIndicator);
                }
                return false;
            }

            // Store the selected guest
            selectedGuest = guestDoc.data();
            selectedGuest.id = guestId; // Ensure ID is attached
            window.selectedGuest = selectedGuest; // Update global state

            console.log('[selectGuest] Found guest in guestList:', selectedGuest.name);

            // Set the name input value *after* confirmation
            nameInput.value = selectedGuest.name;
            autocompleteResults.style.display = 'none'; // Hide autocomplete

            // Show basic guest info
            guestFoundInfo.style.display = 'block';
            guestCategoryElement.textContent = selectedGuest.category ? `Category: ${selectedGuest.category}` : '';

            // Out-of-town guest functionality has been removed
            console.log('[selectGuest] Out-of-town guest functionality has been removed');

            // STEP 2: Check for an existing RSVP submission in sheetRsvps
            console.log('[selectGuest] Checking for existing submission for:', selectedGuest.name);
            let foundSubmission;
            try {
                foundSubmission = await checkExistingSubmission(selectedGuest.name);
                console.log('[selectGuest] checkExistingSubmission result:', foundSubmission);
            } catch (submissionError) {
                console.error('[selectGuest] Error checking for existing submission:', submissionError);
                // Don't fail completely, just proceed with new submission mode
                console.log('[selectGuest] Proceeding with new submission mode due to error checking existing submission');
                foundSubmission = null;
            }

            // STEP 3: Configure UI based on whether a submission was found
            additionalFields.style.display = 'block';
            submitButtonContainer.style.display = 'block';

            if (foundSubmission) {
                // Existing submission found - Switch to update mode
                console.log('[selectGuest] Existing submission found. Switching to update mode.');
                try {
                    processExistingSubmission(foundSubmission); // This sets window.existingSubmission and prefills
                } catch (processError) {
                    console.error('[selectGuest] Error processing existing submission:', processError);
                    // Fall back to new mode if processing fails
                    switchToNewMode();
                    document.getElementById('attendingSection').style.display = 'block';
                    adultCountInput.value = 1;
                    childCountInput.value = 0;
                    updateGuestFields(); // Create fields for default counts
                }
            } else {
                // No existing submission - Switch to new mode
                console.log('[selectGuest] No existing submission found. Switching to new mode.');
                switchToNewMode();
                // Ensure attending section is visible and counts are default for new submissions
                document.getElementById('attendingSection').style.display = 'block';
                adultCountInput.value = 1;
                childCountInput.value = 0;
                updateGuestFields(); // Create fields for default counts
            }

            // Ensure correct sections are visible based on attending status (handled by radio button change event or default state)
            const attendingYesRadio = document.getElementById('attendingYes');
            const attendingNoRadio = document.getElementById('attendingNo');
            const attendingSection = document.getElementById('attendingSection');
            if (attendingYesRadio && attendingNoRadio && attendingSection) {
                if (attendingYesRadio.checked) {
                    attendingSection.style.display = 'block';
                } else if (attendingNoRadio.checked) {
                    attendingSection.style.display = 'none';
                }
            } else {
                console.warn('[selectGuest] Missing radio buttons or attending section elements');
            }

            console.log('[selectGuest] Completed successfully for:', selectedGuest.name);
            // Remove loading indicator
            if (document.body.contains(loadingIndicator)) {
                document.body.removeChild(loadingIndicator);
            }
            return true; // Indicate success

        } catch (error) {
            console.error('[selectGuest] CRITICAL ERROR during guest selection:', error);
            // Remove loading indicator
            if (document.body.contains(loadingIndicator)) {
                document.body.removeChild(loadingIndicator);
            }

            // Provide more specific error messages based on error type
            let errorTitle = 'Error Loading Guest';
            let errorDetails = 'An unexpected error occurred while loading guest information. Please try again.';

            if (error.code === 'permission-denied') {
                errorTitle = 'Permission Error';
                errorDetails = 'You do not have permission to access this guest information. Please try again or contact the administrator.';
            } else if (error.code === 'not-found') {
                errorTitle = 'Guest Not Found';
                errorDetails = 'The guest information could not be found. Please try searching again.';
            } else if (error.code === 'unavailable' || error.message?.includes('network')) {
                errorTitle = 'Network Error';
                errorDetails = 'There was a problem with the network connection. Please check your internet connection and try again.';
            } else if (error.message) {
                errorDetails = `Error details: ${error.message}`;
            }

            showErrorMessage(errorTitle, errorDetails);
            resetSubmissionState(); // Ensure clean state on error
            return false; // Indicate failure
        }
    }


    // Check if guest has already submitted an RSVP - Returns submission data with ID or null
    async function checkExistingSubmission(guestName) {
        console.log('[checkExistingSubmission] Started for guest name:', guestName);

        if (!guestName) {
            console.warn('[checkExistingSubmission] No guest name provided.');
            return null;
        }

        try {
            const db = firebase.firestore();
            const guestNameLower = guestName.toLowerCase().trim(); // Normalize search name

            // Check Firebase initialization
            if (!db) {
                console.error('Firebase Firestore not initialized properly');
                return null;
            }

            // First try to check if the guest has responded in the guestList collection
            // This is a workaround for permission issues with sheetRsvps collection
            console.log('[checkExistingSubmission] Checking guestList for response status...');

            let guestListQuery;
            let guestDoc = null;
            let guestData = null;

            try {
                guestListQuery = await db.collection('guestList')
                    .where('name', '==', guestName)
                    .limit(1)
                    .get();

                if (!guestListQuery.empty) {
                    guestDoc = guestListQuery.docs[0];
                    guestData = guestDoc.data();
                    console.log(`[checkExistingSubmission] Found guest in guestList: ${guestData.name} (ID: ${guestDoc.id})`);

                    if (!guestData.hasResponded) {
                        console.log('[checkExistingSubmission] Guest found in guestList but hasResponded=false. Checking sheetRsvps anyway...');
                    } else {
                        console.log('[checkExistingSubmission] Guest has previously responded according to guestList. Checking for submission details...');
                    }
                } else {
                    console.log('[checkExistingSubmission] Guest not found in guestList collection');
                }
            } catch (guestListError) {
                console.error('[checkExistingSubmission] Error querying guestList:', guestListError);
                // Continue with the process even if this fails
                guestListQuery = { empty: true, docs: [] };
            }

            // Try to query the sheetRsvps collection directly
            try {
                console.log('[checkExistingSubmission] Querying sheetRsvps for potential matches...');
                let querySnapshot;
                try {
                    // Use a more targeted query if possible to reduce data transfer
                    querySnapshot = await db.collection('sheetRsvps')
                        .where('name', '==', guestName)
                        .get();

                    // If no exact match, try to get all documents (fallback)
                    if (querySnapshot.empty) {
                        console.log('[checkExistingSubmission] No exact match found, querying all sheetRsvps...');
                        querySnapshot = await db.collection('sheetRsvps').get();
                    }

                    console.log(`[checkExistingSubmission] Successfully queried sheetRsvps. Found ${querySnapshot.size} documents.`);
                } catch (sheetError) {
                    console.error(`[checkExistingSubmission] Error querying sheetRsvps: ${sheetError.message}`);
                    throw sheetError; // Re-throw to be caught by the outer catch block
                }

                let latestMatch = findLatestSubmission(querySnapshot, guestNameLower);

                if (latestMatch) {
                    console.log('[checkExistingSubmission] SUCCESS: Found latest matching submission (ID:', latestMatch.id, ')');
                    normalizeSubmissionData(latestMatch); // Ensure essential fields exist

                    // Check for and repair inconsistency between collections
                    if (guestDoc && guestData && !guestData.hasResponded) {
                        console.log(`[checkExistingSubmission] Found inconsistency: Entry exists in sheetRsvps but guestList has hasResponded=false`);

                        try {
                            // Update the guestList entry to fix the inconsistency
                            await guestDoc.ref.update({
                                hasResponded: true,
                                response: latestMatch.attending === 'yes' ? 'attending' : 'declined',
                                lastResponseTimestamp: latestMatch.submittedAt || firebase.firestore.Timestamp.now()
                            });
                            console.log(`[checkExistingSubmission] Repaired guestList entry for ${guestName} - set hasResponded=true`);
                        } catch (repairError) {
                            console.error('[checkExistingSubmission] Failed to repair guestList entry:', repairError);
                            // Continue anyway - we still found the submission
                        }
                    }

                    return latestMatch; // Return the full submission data including ID
                } else {
                    console.log('[checkExistingSubmission] RESULT: No existing submission found for:', guestName);
                    return null; // No submission found
                }
            } catch (innerError) {
                // If we get a permission error, we'll try an alternative approach
                if (innerError.code === 'permission-denied') {
                    console.warn('[checkExistingSubmission] Permission denied for sheetRsvps. Using fallback method...');

                    // If we found the guest in guestList, create a basic submission object
                    if (guestDoc && guestData) {
                        console.log('[checkExistingSubmission] Creating fallback submission from guestList data');
                        console.warn(`[checkExistingSubmission] Permission denied for sheetRsvps. Creating fallback submission for ${guestName}`);

                        // Create a basic submission object from guestList data
                        const fallbackSubmission = {
                            id: `fallback-${guestDoc.id}`, // Create a fallback ID
                            name: guestData.name,
                            email: guestData.email || '',
                            phone: guestData.phone || '',
                            // If hasResponded is false, default to 'yes' for attending
                            attending: guestData.hasResponded ? (guestData.response === 'attending' ? 'yes' : 'no') : 'yes',
                            adultGuests: guestData.adultGuests || [],
                            childGuests: guestData.childGuests || [],
                            // Important fix: If we have 0 adults and some children, don't add an extra adult
                            adultCount: guestData.adultCount || (guestData.hasResponded ? 0 : 1), // Default to 1 adult if not responded
                            childCount: guestData.childCount || 0,
                            submittedAt: guestData.lastResponseTimestamp || firebase.firestore.Timestamp.now(),
                            isFallback: true, // Mark this as a fallback submission
                            isNewFallback: !guestData.hasResponded // Flag if this is a new fallback (hasResponded was false)
                        };

                        // Fix for the guest count calculation
                        if (fallbackSubmission.adultCount === 0 && fallbackSubmission.childCount > 0) {
                            // If we have 0 adults and some children, don't add an extra adult to the guest count
                            fallbackSubmission.guestCount = fallbackSubmission.childCount;
                        } else {
                            fallbackSubmission.guestCount = fallbackSubmission.adultCount + fallbackSubmission.childCount;
                        }

                        normalizeSubmissionData(fallbackSubmission);
                        console.log(`[checkExistingSubmission] Created fallback submission for ${guestName} (ID: ${fallbackSubmission.id})`);
                        return fallbackSubmission;
                    }

                    // If we couldn't create a fallback, return null without showing an error
                    console.warn('[checkExistingSubmission] Could not create fallback submission - no valid guest data found');
                    return null;
                } else {
                    // For other errors, propagate to the outer catch block
                    console.error(`[checkExistingSubmission] Error in sheetRsvps query: ${innerError.message} (${innerError.code})`);
                    throw innerError;
                }
            }

        } catch (error) {
            console.error('[checkExistingSubmission] CRITICAL ERROR checking for submission:', error);

            // Don't show permission errors to the user, just handle them gracefully
            if (error.code !== 'permission-denied') {
                // Don't show error message here - let the calling function handle it
                console.error(`[checkExistingSubmission] Error details: ${error.message}`);
            }

            // Try to create a fallback submission even if we had an error
            // Make sure we have valid guest data before attempting to create a fallback
            if (guestData && guestData.hasResponded) {
                console.warn('[checkExistingSubmission] Attempting emergency fallback submission creation after error');
                try {
                    // Create a unique ID for the emergency fallback
                    const fallbackId = `emergency-fallback-${guestData.id || new Date().getTime()}`;

                    const emergencyFallback = {
                        id: fallbackId,
                        name: guestData.name,
                        email: guestData.email || '',
                        phone: guestData.phone || '',
                        attending: guestData.response === 'attending' ? 'yes' : 'no',
                        adultGuests: guestData.adultGuests || [],
                        childGuests: guestData.childGuests || [],
                        adultCount: guestData.adultCount || 0,
                        childCount: guestData.childCount || 0,
                        submittedAt: guestData.lastResponseTimestamp || new Date(),
                        isFallback: true,
                        isEmergencyFallback: true
                    };

                    // Fix for the guest count calculation
                    if (emergencyFallback.adultCount === 0 && emergencyFallback.childCount > 0) {
                        // If we have 0 adults and some children, don't add an extra adult to the guest count
                        emergencyFallback.guestCount = emergencyFallback.childCount;
                    } else {
                        emergencyFallback.guestCount = emergencyFallback.adultCount + emergencyFallback.childCount;
                    }

                    normalizeSubmissionData(emergencyFallback);
                    console.log(`[checkExistingSubmission] Created emergency fallback submission (ID: ${emergencyFallback.id})`);
                    return emergencyFallback;
                } catch (fallbackError) {
                    console.error(`[checkExistingSubmission] Failed to create emergency fallback: ${fallbackError.message}`);
                }
            }

            // Throw the error to be handled by the caller
            throw error;
        }
    }

    // Helper function to find the latest submission from a query snapshot
    function findLatestSubmission(querySnapshot, guestNameLower) {
        let latestMatch = null;
        let latestTimestamp = null;

        console.log(`[findLatestSubmission] Checking ${querySnapshot.size} submissions.`);
        querySnapshot.forEach(doc => {
            const data = doc.data();
            // Use optional chaining and nullish coalescing for safety
            const submissionNameLower = data?.name?.toLowerCase()?.trim();

            if (submissionNameLower === guestNameLower) {
                // Found a match by name (case-insensitive)
                const currentTimestamp = data.submittedAt; // Assume it's a Firestore Timestamp or null/undefined

                try {
                    // Safely check if this match is later than the current latestMatch
                    let isLater = false;

                    if (!latestMatch) {
                        // If we don't have a match yet, this is the latest
                        isLater = true;
                    } else if (currentTimestamp && typeof currentTimestamp.toMillis === 'function') {
                        // If we have a valid Firestore timestamp, compare using toMillis
                        const currentMillis = currentTimestamp.toMillis();
                        const latestMillis = latestTimestamp && typeof latestTimestamp.toMillis === 'function' ?
                            latestTimestamp.toMillis() : -Infinity;
                        isLater = currentMillis > latestMillis;
                    } else if (currentTimestamp && currentTimestamp instanceof Date) {
                        // If it's a JavaScript Date object
                        const currentMillis = currentTimestamp.getTime();
                        const latestMillis = latestTimestamp instanceof Date ?
                            latestTimestamp.getTime() : -Infinity;
                        isLater = currentMillis > latestMillis;
                    } else {
                        // If we can't compare timestamps, just use the first match
                        isLater = !latestMatch;
                    }

                    if (isLater) {
                        latestMatch = { ...data, id: doc.id }; // Clone data and add ID
                        latestTimestamp = currentTimestamp;

                        // Safely log the timestamp
                        let timeString = "unknown time";
                        if (currentTimestamp && typeof currentTimestamp.toDate === 'function') {
                            try {
                                timeString = currentTimestamp.toDate().toString();
                            } catch (e) {
                                timeString = "invalid timestamp";
                            }
                        } else if (currentTimestamp instanceof Date) {
                            timeString = currentTimestamp.toString();
                        } else if (currentTimestamp) {
                            timeString = "non-standard timestamp format";
                        }

                        console.log(`[findLatestSubmission] Found potential match (ID: ${doc.id}, Time: ${timeString})`);
                    }
                } catch (error) {
                    console.error(`[findLatestSubmission] Error comparing timestamps:`, error);
                    // If we encounter an error, still consider this a match if we don't have one yet
                    if (!latestMatch) {
                        latestMatch = { ...data, id: doc.id };
                        latestTimestamp = null; // Reset timestamp since we can't compare
                        console.log(`[findLatestSubmission] Using match despite timestamp error (ID: ${doc.id})`);
                    }
                }
            }
        });
        return latestMatch;
    }

    // Helper function to normalize submission data (ensure required fields)
    function normalizeSubmissionData(submission) {
        if (!submission) return;
        // Default values if fields are missing
        submission.attending = submission.attending ?? 'yes';
        submission.adultGuests = submission.adultGuests ?? [];
        submission.childGuests = submission.childGuests ?? [];
        submission.adultCount = submission.adultCount ?? (submission.adultGuests.length || (submission.attending === 'yes' ? 1 : 0));
        submission.childCount = submission.childCount ?? (submission.childGuests.length || 0);
        submission.email = submission.email ?? '';
        submission.phone = submission.phone ?? '';

        // Fix for guest count calculation
        if (submission.adultCount === 0 && submission.childCount > 0) {
            // If we have 0 adults and some children, don't add an extra adult to the guest count
            submission.guestCount = submission.childCount;
        } else {
            submission.guestCount = submission.adultCount + submission.childCount;
        }

        // Ensure timestamps are properly handled
        if (submission.submittedAt && typeof submission.submittedAt.toDate !== 'function') {
            console.warn('[normalizeSubmissionData] submittedAt is not a Firestore timestamp, converting...');
            submission.submittedAt = firebase.firestore.Timestamp.fromDate(new Date(submission.submittedAt));
        }

        // Ensure out-of-town event fields exist
        submission.fridayDinner = submission.fridayDinner ?? 'no';
        submission.sundayBrunch = submission.sundayBrunch ?? 'no';
        submission.isOutOfTown = submission.isOutOfTown ?? false;

        console.log(`[normalizeSubmissionData] Normalized submission for ${submission.name}: adultCount=${submission.adultCount}, childCount=${submission.childCount}, guestCount=${submission.guestCount}`);
    }

    // Out-of-town guest functionality has been removed
    function isOutOfTownGuest(guestData) {
        // Always return false as out-of-town functionality has been removed
        return false;
    }

    // Helper function to process an existing submission and update UI
    function processExistingSubmission(submission) {
        console.log('[processExistingSubmission] Processing submission:', submission);

        if (!submission?.id) {
            console.error('[processExistingSubmission] Invalid submission object received:', submission);
            resetSubmissionState();
            return false;
        }

        // Store the existing submission globally
        window.existingSubmission = JSON.parse(JSON.stringify(submission)); // Clone to avoid mutation issues
        console.log('[processExistingSubmission] Set window.existingSubmission with ID:', window.existingSubmission.id);

        // Update UI elements for update mode
        existingSubmissionInfo.style.display = 'flex'; // Show the info box
        guestFoundInfo.style.display = 'none'; // Hide the basic "found" box

        // Add update-mode class to form container
        const formContainer = document.querySelector('.form-container');
        if (formContainer) {
            formContainer.classList.add('update-mode');
        }

        submitButton.innerHTML = '<i class="fas fa-edit"></i> Update RSVP';
        submitButton.classList.add('update-mode');

        formTitle.textContent = 'Update Your RSVP';

        // If this is a fallback submission (created from guestList), show a special notice
        if (submission.isFallback) {
            console.log('[processExistingSubmission] Processing fallback submission');

            const existingSubmissionContent = document.querySelector('.existing-submission-content');
            if (existingSubmissionContent) {
                // Remove any existing fallback notices first
                const existingNotices = existingSubmissionContent.querySelectorAll('.fallback-notice');
                existingNotices.forEach(notice => notice.remove());

                // Add the appropriate fallback notice
                const fallbackNotice = document.createElement('p');
                fallbackNotice.className = 'fallback-notice';

                if (submission.isNewFallback) {
                    // This is a new fallback (hasResponded was false)
                    fallbackNotice.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <strong>Important:</strong> We found a record for you in our guest list, but no previous RSVP submission. This form will create a new RSVP for you.';
                    fallbackNotice.style.backgroundColor = '#fff3cd';
                    fallbackNotice.style.color = '#856404';
                    fallbackNotice.style.border = '1px solid #ffeeba';
                    fallbackNotice.style.padding = '10px';

                    // Also update the form title and button to reflect this is a new submission
                    formTitle.textContent = 'Submit Your RSVP';
                    submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Submit RSVP';

                    // Update the notice text
                    updateNotice.innerHTML = `<i class="fas fa-info-circle"></i> You are creating a <strong>new RSVP</strong> for ${submission.name}`;
                } else {
                    // This is a regular fallback (hasResponded was true)
                    fallbackNotice.innerHTML = '<i class="fas fa-info-circle"></i> Some of your previous details may not be available, but we\'ll update your RSVP with any changes you make.';
                }

                existingSubmissionContent.appendChild(fallbackNotice);
            }
        }

        // Format date for display
        let dateDisplay = 'a previous date';
        if (submission.submittedAt?.toDate) {
            try {
                dateDisplay = new Date(submission.submittedAt.toDate()).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } catch (e) {
                console.warn('[processExistingSubmission] Error formatting date:', e);
            }
        }

        updateNotice.style.display = 'block';
        updateNotice.textContent = `You are updating your existing RSVP submitted on ${dateDisplay}`;
        updateNotice.innerHTML = `<i class="fas fa-info-circle"></i> You are updating your existing RSVP submitted on <strong>${dateDisplay}</strong>`;

        // Mark the form as being in update mode and store the ID
        rsvpForm.setAttribute('data-mode', 'update');
        rsvpForm.setAttribute('data-submission-id', submission.id);
        console.log('[processExistingSubmission] Form marked as update mode with ID:', submission.id);
        logDebug('SUCCESS', `Form switched to update mode with ID: ${submission.id}`);

        // Show debug info about the form state
        logDebug('INFO', `Form container has update-mode class: ${formContainer?.classList.contains('update-mode')}`);
        logDebug('INFO', `Form mode attribute: ${rsvpForm.getAttribute('data-mode')}`);
        logDebug('INFO', `Existing submission info display: ${existingSubmissionInfo.style.display}`);
        logDebug('INFO', `Update notice display: ${updateNotice.style.display}`);

        // Pre-fill form fields with the existing data
        prefillFormWithExistingData(submission);

        // Double-check that the form is properly set up for update mode
        setTimeout(() => {
            // Verify the form is in update mode
            const currentMode = rsvpForm.getAttribute('data-mode');
            const hasSubmissionId = rsvpForm.hasAttribute('data-submission-id');
            const formContainerHasClass = document.querySelector('.form-container')?.classList.contains('update-mode');

            logDebug('INFO', `Form state check - Mode: ${currentMode}, Has ID: ${hasSubmissionId}, Container has class: ${formContainerHasClass}`);

            if (currentMode !== 'update' || !hasSubmissionId || !formContainerHasClass) {
                logDebug('WARNING', 'Form not properly set up for update mode. Attempting to fix...');

                // Force update mode
                rsvpForm.setAttribute('data-mode', 'update');
                rsvpForm.setAttribute('data-submission-id', submission.id);
                document.querySelector('.form-container')?.classList.add('update-mode');

                // Force UI elements
                existingSubmissionInfo.style.display = 'flex';
                guestFoundInfo.style.display = 'none';
                submitButton.innerHTML = '<i class="fas fa-edit"></i> Update RSVP';
                submitButton.classList.add('update-mode');
                formTitle.textContent = 'Update Your RSVP';
                updateNotice.style.display = 'block';

                logDebug('SUCCESS', 'Fixed form update mode settings');
            }
        }, 500);

        return true; // Indicate success
    }

    // Helper function to switch UI to new submission mode
    function switchToNewMode() {
        console.log('[switchToNewMode] Switching UI to new submission mode.');
        resetSubmissionState(); // Resets global state and common UI elements

        // Ensure specific "new mode" elements are visible/hidden
        guestFoundInfo.style.display = 'block'; // Show basic found info
        existingSubmissionInfo.style.display = 'none'; // Hide update info box
        updateNotice.style.display = 'none'; // Hide update notice

        // Reset form fields (optional, but good practice)
        // rsvpForm.reset(); // Be careful, this might clear the name input too soon
        document.getElementById('email').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('attendingYes').checked = true; // Default to Yes
        document.getElementById('attendingNo').checked = false;
        document.getElementById('adultCount').value = 1;
        document.getElementById('childCount').value = 0;
        // updateGuestFields will clear name inputs

        console.log('[switchToNewMode] UI switched to new mode.');
    }


    // Helper function to reset submission state and common UI elements
    function resetSubmissionState() {
        console.log('[resetSubmissionState] Resetting state and common UI.');

        // Clear global state
        window.existingSubmission = null;

        // Reset UI elements common to both modes or specific to update mode
        existingSubmissionInfo.style.display = 'none';
        updateNotice.style.display = 'none';

        // Remove update-mode class from form container
        const formContainer = document.querySelector('.form-container');
        if (formContainer) {
            formContainer.classList.remove('update-mode');
        }

        // Reset button text and style
        submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Submit RSVP';
        submitButton.classList.remove('update-mode');

        // Reset form title
        formTitle.textContent = 'RSVP Form'; // Default title

        // Reset form data-mode attribute
        rsvpForm.setAttribute('data-mode', 'new');
        rsvpForm.removeAttribute('data-submission-id');

        console.log('[resetSubmissionState] Common reset complete.');
        return false; // Indicate that we are NOT in an update state
    }

    // Pre-fill form with existing submission data
    function prefillFormWithExistingData(submission) {
        console.log('[prefillForm] Pre-filling form with data:', submission);

        // Ensure we have a valid submission object
        if (!submission || typeof submission !== 'object') {
            console.error('[prefillForm] Invalid submission object:', submission);
            return;
        }

        // Double-check that we have the necessary DOM elements
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');
        const attendingYesRadio = document.getElementById('attendingYes');
        const attendingNoRadio = document.getElementById('attendingNo');
        const attendingSectionElement = document.getElementById('attendingSection');
        const adultCountInput = document.getElementById('adultCount');
        const childCountInput = document.getElementById('childCount');
        const adultGuestsContainer = document.getElementById('adultGuestsContainer');
        const childGuestsContainer = document.getElementById('childGuestsContainer');
        const guestsContainer = document.getElementById('guestsContainer');

        if (!emailInput || !phoneInput || !attendingYesRadio || !attendingNoRadio || !attendingSectionElement ||
            !adultCountInput || !childCountInput || !adultGuestsContainer || !childGuestsContainer) {
            console.error('[prefillForm] Missing required DOM elements for prefill.');
            return;
        }

        // Set email and phone
        emailInput.value = submission.email || '';
        phoneInput.value = submission.phone || '';

        // Force a direct update of the DOM
        try {
            // Use direct property assignment and then dispatch an input event
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(emailInput, submission.email || '');
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(phoneInput, submission.phone || '');

            // Dispatch events to ensure any listeners are triggered
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (e) {
            console.warn(`[prefillForm] Failed to force DOM update: ${e.message}`);
        }

        // Determine if attending based on submission data
        const isAttending = submission.attending === 'yes';
        console.log('[prefillForm] Is Attending:', isAttending);

        // Ensure the attending value is normalized
        if (submission.attending !== 'yes' && submission.attending !== 'no') {
            console.warn(`[prefillForm] Invalid attending value: "${submission.attending}", defaulting to "yes"`);
            submission.attending = 'yes'; // Default to yes if invalid
        }

        // Set the appropriate radio button
        if (isAttending) {
            attendingYesRadio.checked = true;
            attendingNoRadio.checked = false;
            attendingSectionElement.style.display = 'block'; // Show guest count section
            if (guestsContainer) guestsContainer.style.display = 'block';
        } else {
            attendingNoRadio.checked = true;
            attendingYesRadio.checked = false;
            attendingSectionElement.style.display = 'none'; // Hide guest count section
            if (guestsContainer) guestsContainer.style.display = 'none';
        }

        // Force the radio button state using direct DOM manipulation
        try {
            if (isAttending) {
                attendingYesRadio.setAttribute('checked', 'checked');
                attendingNoRadio.removeAttribute('checked');
            } else {
                attendingNoRadio.setAttribute('checked', 'checked');
                attendingYesRadio.removeAttribute('checked');
            }

            // Dispatch change event
            const event = new Event('change', { bubbles: true });
            if (isAttending) {
                attendingYesRadio.dispatchEvent(event);
            } else {
                attendingNoRadio.dispatchEvent(event);
            }
        } catch (e) {
            console.warn(`[prefillForm] Failed to force radio button update: ${e.message}`);
        }

        // Out-of-town event functionality has been removed

        // Parse guest counts for attending guests
        if (isAttending) {
            // Use counts directly from submission if available, otherwise infer/default
            let adultCount = typeof submission.adultCount === 'number' ? submission.adultCount : (submission.adultGuests?.length || 1);
            let childCount = typeof submission.childCount === 'number' ? submission.childCount : (submission.childGuests?.length || 0);

            // Ensure at least one adult if attending
            if (adultCount === 0 && childCount === 0) {
                adultCount = 1;
            }

            console.log(`[prefillForm] Setting counts - Adults: ${adultCount}, Children: ${childCount}`);

            // Set guest counts in form
            adultCountInput.value = adultCount;
            childCountInput.value = childCount;

            // Force direct DOM update for count inputs
            try {
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(adultCountInput, adultCount);
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(childCountInput, childCount);

                // Dispatch events
                adultCountInput.dispatchEvent(new Event('input', { bubbles: true }));
                childCountInput.dispatchEvent(new Event('input', { bubbles: true }));
                adultCountInput.dispatchEvent(new Event('change', { bubbles: true }));
                childCountInput.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (e) {
                console.warn(`[prefillForm] Failed to force count input update: ${e.message}`);
            }

            // Update guest fields to create the input elements *before* filling them
            updateGuestFields(); // This now respects the counts set above

            // Use setTimeout to allow DOM update before filling names
            // Increase timeout to 500ms for more reliable DOM updates
            setTimeout(() => {
                console.log('[prefillForm] DOM updated, attempting to fill guest names.');

                // Pre-fill adult guest names
                if (submission.adultGuests && Array.isArray(submission.adultGuests)) {
                    const adultInputs = adultGuestsContainer.querySelectorAll('input');
                    console.log(`[prefillForm] Found ${adultInputs.length} adult input fields.`);

                    submission.adultGuests.forEach((name, index) => {
                        if (adultInputs[index]) {
                            adultInputs[index].value = name || '';
                            console.log(`[prefillForm] Set Adult ${index + 1} to: ${name}`);

                            // Force direct DOM update
                            try {
                                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(adultInputs[index], name || '');
                                adultInputs[index].dispatchEvent(new Event('input', { bubbles: true }));
                            } catch (e) {
                                console.warn(`[prefillForm] Failed to force adult name update: ${e.message}`);
                            }
                        } else {
                            console.warn(`[prefillForm] Could not find input field for Adult ${index + 1}`);
                        }
                    });

                    // Don't autofill the primary guest name field
                } else if (adultCount > 0) {
                    // Don't autofill the primary guest name field
                }

                // Pre-fill child guest names
                if (submission.childGuests && Array.isArray(submission.childGuests)) {
                    const childInputs = childGuestsContainer.querySelectorAll('input');
                    console.log(`[prefillForm] Found ${childInputs.length} child input fields.`);

                    submission.childGuests.forEach((name, index) => {
                        if (childInputs[index]) {
                            childInputs[index].value = name || '';
                            console.log(`[prefillForm] Set Child ${index + 1} to: ${name}`);

                            // Force direct DOM update
                            try {
                                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(childInputs[index], name || '');
                                childInputs[index].dispatchEvent(new Event('input', { bubbles: true }));
                            } catch (e) {
                                console.warn(`[prefillForm] Failed to force child name update: ${e.message}`);
                            }
                        } else {
                            console.warn(`[prefillForm] Could not find input field for Child ${index + 1}`);
                        }
                    });
                }

                // Check if primary guest field is filled
                const allAdultInputs = adultGuestsContainer.querySelectorAll('input');

                allAdultInputs.forEach((input, i) => {
                    if (!input.value && i === 0 && submission.name) {
                        input.value = submission.name; // Ensure primary guest is filled
                    }
                });

                console.log('[prefillForm] Finished filling guest names.');
            }, 500); // Increased delay to 500ms for more reliable DOM updates

        } else {
            // If not attending, clear/hide guest count fields and clear names
            adultCountInput.value = 0;
            childCountInput.value = 0;
            updateGuestFields(); // Clear the fields
        }

        // Trigger change events manually AFTER setting values
        const event = new Event('change', { bubbles: true });
        emailInput.dispatchEvent(event);
        phoneInput.dispatchEvent(event);
        adultCountInput.dispatchEvent(event);
        childCountInput.dispatchEvent(event);
        if (attendingYesRadio.checked) attendingYesRadio.dispatchEvent(event);
        if (attendingNoRadio.checked) attendingNoRadio.dispatchEvent(event);

        console.log('[prefillForm] Form pre-fill attempt complete.');
    }


    // Update guest fields based on adult and child counts
    function updateGuestFields() {
        let adultCount = parseInt(adultCountInput.value) || 0;
        const childCount = parseInt(childCountInput.value) || 0;

        // If attending is 'yes' (implied if this function runs when attendingSection is visible), ensure at least one adult if both counts are 0
        const attendingSection = document.getElementById('attendingSection');
        if (attendingSection && attendingSection.style.display !== 'none' && adultCount === 0 && childCount === 0) {
            adultCountInput.value = 1;
            adultCount = 1;
            console.log('[updateGuestFields] Both counts were 0 while attending, defaulted adult count to 1.');
        }

        // Special case: If there are children but no adults, we still need to create at least one adult field
        // for the primary contact, but we don't want to increment the total guest count
        let displayAdultCount = adultCount;
        if (adultCount === 0 && childCount > 0) {
            displayAdultCount = 1; // Show one adult field even if adultCount is 0
            console.log('[updateGuestFields] 0 adults with children, showing 1 adult field for primary contact.');
        }

        updateAdultGuestFields(displayAdultCount); // Use displayAdultCount for UI
        updateChildGuestFields(childCount);

        // Show/hide sections based on counts
        if (childGuestSection) {
            childGuestSection.style.display = childCount > 0 ? 'block' : 'none';
        }

        // Get the adults section and show/hide
        const adultGuestSection = adultGuestsContainer?.closest('.guest-section');
        if (adultGuestSection) {
            // Always show adult section if there are children (for primary contact)
            adultGuestSection.style.display = (displayAdultCount > 0 || childCount > 0) ? 'block' : 'none';
        }

        // Show/hide the entire guest info container if both counts are 0
        const guestsContainer = document.getElementById('guestsContainer');
        if (guestsContainer) {
             guestsContainer.style.display = (displayAdultCount > 0 || childCount > 0) ? 'block' : 'none';
        }

        console.log(`[updateGuestFields] Updated fields - adultCount: ${adultCount}, displayAdultCount: ${displayAdultCount}, childCount: ${childCount}`);
    }
    function updateAdultGuestFields(adultCount) {

        adultGuestsContainer.innerHTML = ''; // Clear existing fields first
        for (let i = 0; i < adultCount; i++) {
            const guestField = document.createElement('div');
            guestField.className = 'guest-field';

            const label = document.createElement('label');
            label.setAttribute('for', `adultName${i+1}`);
            // Use a generic label for all adult guests
            label.textContent = i === 0 ? `Adult 1:` : `Adult ${i + 1}:`;


            const input = document.createElement('input');
            input.type = 'text';
            input.id = `adultName${i+1}`;
            input.name = `adultName${i+1}`;
            input.placeholder = i === 0 ? 'Your full name' : `Full name of adult guest ${i + 1}`;
            input.required = true;

            // Store the index as a data attribute for easier debugging
            input.setAttribute('data-guest-index', i);

            // Don't pre-fill the first field with the selected guest's name
            // Let the user enter the name manually

            // Special case for update mode with fallback submission
            if (i === 0 && window.existingSubmission?.name) {
                // This ensures the primary guest name is always filled
                input.value = window.existingSubmission.name;
            }

            guestField.appendChild(label);
            guestField.appendChild(input);
            adultGuestsContainer.appendChild(guestField);
        }
    }
    function updateChildGuestFields(childCount) {
        childGuestsContainer.innerHTML = ''; // Clear existing fields first
        for (let i = 0; i < childCount; i++) {
            const guestField = document.createElement('div');
            guestField.className = 'guest-field';

            const label = document.createElement('label');
            label.setAttribute('for', `childName${i+1}`);
            label.textContent = `Child Guest ${i + 1}:`;

            const input = document.createElement('input');
            input.type = 'text';
            input.id = `childName${i+1}`;
            input.name = `childName${i+1}`;
            input.placeholder = `Full name of child guest ${i + 1}`;
            input.required = true;

            guestField.appendChild(label);
            guestField.appendChild(input);
            childGuestsContainer.appendChild(guestField);
        }
    }


    // Listen for changes to guest counts
    if (adultCountInput) {
        adultCountInput.addEventListener('change', updateGuestFields);
        adultCountInput.addEventListener('input', updateGuestFields);
    }

    if (childCountInput) {
        childCountInput.addEventListener('change', updateGuestFields);
        childCountInput.addEventListener('input', updateGuestFields);
    }


    // Add event listeners for radio buttons to show/hide attending section
    const attendingYesRadio = document.getElementById('attendingYes');
    const attendingNoRadio = document.getElementById('attendingNo');
    const attendingSection = document.getElementById('attendingSection');

    function handleAttendingChange() {
        if (attendingYesRadio.checked) {
            attendingSection.style.display = 'block';
            // Ensure guest counts are reasonable if switching to yes
            if (parseInt(adultCountInput.value) === 0 && parseInt(childCountInput.value) === 0) {
                 adultCountInput.value = 1; // Default to 1 adult
            }
            updateGuestFields(); // Update fields based on current counts
        } else {
            attendingSection.style.display = 'none';
            // Clear guest names when switching to No, but keep counts at 0
             adultCountInput.value = 0;
             childCountInput.value = 0;
             updateGuestFields(); // This will hide the name fields
        }
    }

    if (attendingYesRadio && attendingNoRadio && attendingSection) {
        attendingYesRadio.addEventListener('change', handleAttendingChange);
        attendingNoRadio.addEventListener('change', handleAttendingChange);
    }

    // Helper function to show error messages
    function showErrorMessage(title, details) {
        console.error(`Error: ${title} - ${details}`);
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.innerHTML = `
                <i class="fas fa-exclamation-circle"></i>
                <div class="error-content">
                    <div class="error-title">${title}</div>
                    <div class="error-details">${details}</div>
                </div>
            `;
            errorElement.style.display = 'flex';
        }

        // Log to debug panel
        logDebug('ERROR', `${title}: ${details}`);
    }

    // Helper function for console logging (production version)
    function logDebug(level, message) {
        // In production, we only log errors to console
        if (level === 'ERROR') {
            console.error(`[${level}] ${message}`);
        }
    }

    // Initial setup if needed
    // e.g., check for cookie, pre-populate name? (optional)

});

// Function to search for guests (assuming it exists and returns a promise)
// Example structure:
async function searchGuests(searchTerm) {
    // This function needs to query the 'guestList' collection in Firestore
    // based on the searchTerm and return an array of matching guests
    // e.g., [{ id: '...', name: '...' }, ...]
    console.log(`[searchGuests] Searching for: ${searchTerm}`);
     const db = firebase.firestore();
     const searchTermLower = searchTerm.toLowerCase();
     const results = [];

     try {
         // Example: Simple prefix search (adjust as needed)
         const querySnapshot = await db.collection('guestList')
             // .where('nameLower', '>=', searchTermLower) // Requires a 'nameLower' field
             // .where('nameLower', '<=', searchTermLower + '\uf8ff')
             .orderBy('name') // Order results for consistency
             .get();

         querySnapshot.forEach(doc => {
             const guest = doc.data();
             // Perform client-side filtering for case-insensitivity if needed
             // Use optional chaining
             if (guest?.name?.toLowerCase().includes(searchTermLower)) {
                 results.push({ id: doc.id, name: guest.name });
             }
         });

         console.log(`[searchGuests] Found ${results.length} potential matches.`);
         return results.slice(0, 10); // Limit results shown
     } catch (error) {
         console.error('[searchGuests] Error searching guests:', error);
         return []; // Return empty array on error
     }
}
