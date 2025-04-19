// RSVP Guest Search and Form Handling
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase if not already initialized
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded');
        return;
    }

    // Get DOM elements
    const nameInput = document.getElementById('name');
    const autocompleteResults = document.getElementById('autocompleteResults');
    const additionalFields = document.getElementById('additionalFields');
    const submitButtonContainer = document.getElementById('submitButtonContainer');
    const submitButton = document.getElementById('submitButton');
    const guestFoundInfo = document.getElementById('guestFoundInfo');
    const existingSubmissionInfo = document.getElementById('existingSubmissionInfo');
    const guestCategoryElement = document.getElementById('guestCategory');
    // guestMaxCountElement removed
    // const guestMaxCountElement = document.getElementById('guestMaxCount');
    const adultCountInput = document.getElementById('adultCount');
    const childCountInput = document.getElementById('childCount');
    const adultGuestsContainer = document.getElementById('adultGuestsContainer');
    const childGuestsContainer = document.getElementById('childGuestsContainer');
    const childGuestSection = document.getElementById('childGuestSection');

    // Log DOM elements to verify they exist
    console.log('DOM Elements loaded:', {
        nameInput: !!nameInput,
        autocompleteResults: !!autocompleteResults,
        additionalFields: !!additionalFields,
        submitButtonContainer: !!submitButtonContainer,
        submitButton: !!submitButton,
        guestFoundInfo: !!guestFoundInfo,
        existingSubmissionInfo: !!existingSubmissionInfo,
        guestCategoryElement: !!guestCategoryElement,
        adultCountInput: !!adultCountInput,
        childCountInput: !!childCountInput,
        adultGuestsContainer: !!adultGuestsContainer,
        childGuestsContainer: !!childGuestsContainer,
        childGuestSection: !!childGuestSection
    });

    // Variables to store selected guest data
    // Make it accessible to other scripts
    window.selectedGuest = null;
    window.existingSubmission = null;
    let selectedGuest = window.selectedGuest;
    let existingSubmission = window.existingSubmission;
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

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!selectedItem) {
                    items[0].classList.add('selected');
                } else {
                    const nextItem = selectedItem.nextElementSibling;
                    if (nextItem) {
                        selectedItem.classList.remove('selected');
                        nextItem.classList.add('selected');
                    }
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (selectedItem) {
                    const prevItem = selectedItem.previousElementSibling;
                    if (prevItem) {
                        selectedItem.classList.remove('selected');
                        prevItem.classList.add('selected');
                    }
                }
            } else if (e.key === 'Enter' && selectedItem) {
                e.preventDefault();
                selectGuest(selectedItem.getAttribute('data-id'));
            } else if (e.key === 'Escape') {
                autocompleteResults.style.display = 'none';
            }
        });

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

        // Don't reset submission state immediately - we'll do it after checking for existing submissions
        // This allows us to properly handle the case where a guest has an existing submission

        // Just hide UI elements until we confirm the guest
        additionalFields.style.display = 'none'; // Hide fields until guest is confirmed
        submitButtonContainer.style.display = 'none';
        guestFoundInfo.style.display = 'none';
        existingSubmissionInfo.style.display = 'none';
        // Don't clear the name input yet - we'll set it to the selected guest's name later

        try {
            console.log('[selectGuest] Started for guest ID:', guestId);
            const db = firebase.firestore();

            // STEP 1: Get the guest document
            const guestDoc = await db.collection('guestList').doc(guestId).get();

            if (!guestDoc.exists) {
                console.error('[selectGuest] ERROR: Guest not found in guestList with ID:', guestId);
                // Optionally show an error to the user here
                return false; // Indicate failure
            }

            // Store the selected guest
            selectedGuest = guestDoc.data();
            selectedGuest.id = guestId; // Ensure ID is attached
            window.selectedGuest = selectedGuest; // Update global state

            console.log('[selectGuest] Found guest in guestList:', selectedGuest.name);

            // Set the name input value *after* confirmation
            nameInput.value = selectedGuest.name;

            // Hide autocomplete results
            autocompleteResults.style.display = 'none';

            // Show guest info (category, etc.)
            guestFoundInfo.style.display = 'block';
            if (selectedGuest.category) {
                guestCategoryElement.textContent = `Category: ${selectedGuest.category}`;
            } else {
                guestCategoryElement.textContent = '';
            }

            // STEP 2: Check if this guest has already submitted an RSVP
            console.log('[selectGuest] Checking for existing submission for:', selectedGuest.name);
            console.log('[selectGuest] CRITICAL DEBUG: About to check for existing submission');

            // IMPORTANT: We're removing the resetSubmissionState call here as it might be clearing
            // the state before we can properly process the existing submission
            // resetSubmissionState();

            // Set the name input value
            nameInput.value = selectedGuest.name;

            // Check for existing submission
            console.log('[selectGuest] Calling checkExistingSubmission with name:', selectedGuest.name);
            const hasExisting = await checkExistingSubmission(selectedGuest.name);
            console.log('[selectGuest] Existing submission check result:', hasExisting);
            console.log('[selectGuest] After check, window.existingSubmission is:', window.existingSubmission ? 'SET' : 'NULL');

            // STEP 3: Show the appropriate form fields *after* checking submission
            additionalFields.style.display = 'block';
            submitButtonContainer.style.display = 'block';

            // No maximum guest limit
            adultCountInput.removeAttribute('max');

            // Update guest fields (create inputs) - This needs to happen *before* prefill if attending
            // If not attending, prefill handles hiding/showing sections
            if (!hasExisting || (existingSubmission && existingSubmission.attending === 'yes')) {
                 updateGuestFields(); // Create fields needed for attending/new submission
            }

            // If an existing submission was found, prefillFormWithExistingData was already called by processExistingSubmission
            // If no existing submission, ensure the form is ready for a new entry
            if (!hasExisting) {
                 // Ensure attending section is visible by default for new submissions
                 document.getElementById('attendingSection').style.display = 'block';
                 // Ensure guest counts are reset/defaulted if needed
                 adultCountInput.value = 1;
                 childCountInput.value = 0;
                 updateGuestFields(); // Ensure fields match default counts
            }

             // Ensure correct sections are visible based on attending status (handled by radio button change event in prefill or default state)
            const attendingYesRadio = document.getElementById('attendingYes');
            const attendingNoRadio = document.getElementById('attendingNo');
            if (attendingYesRadio.checked) {
                document.getElementById('attendingSection').style.display = 'block';
            } else if (attendingNoRadio.checked) {
                 document.getElementById('attendingSection').style.display = 'none';
            }


            console.log('[selectGuest] Completed successfully for:', selectedGuest.name);
            return true; // Indicate success

        } catch (error) {
            console.error('[selectGuest] CRITICAL ERROR:', error);
            // Optionally show a user-facing error message
            resetSubmissionState(); // Ensure clean state on error
            return false; // Indicate failure
        }
    }

    // Check if guest has already submitted an RSVP - completely rewritten for reliability
    async function checkExistingSubmission(guestName) {
        console.log('[checkExistingSubmission] Started for guest name:', guestName);
        if (!guestName) {
            console.warn('[checkExistingSubmission] No guest name provided.');
            return resetSubmissionState(); // Cannot check without a name
        }

        try {
            const db = firebase.firestore();
            const guestNameLower = guestName.toLowerCase().trim(); // Normalize search name

            // STEP 1: Try to find an exact match by name (case-sensitive)
            console.log('[checkExistingSubmission] Step 1: Trying exact match search for:', guestName);
            console.log('[checkExistingSubmission] CRITICAL DEBUG: Querying Firestore sheetRsvps collection');

            // Check if Firebase is properly initialized
            if (!db) {
                console.error('[checkExistingSubmission] ERROR: Firebase db is not initialized');
                return resetSubmissionState();
            }

            // Log all collections to verify sheetRsvps exists
            try {
                console.log('[checkExistingSubmission] DEBUG: Attempting to list all collections');
                const collections = await db.listCollections();
                console.log('[checkExistingSubmission] Available collections:', collections.map(c => c.id));
            } catch (e) {
                console.warn('[checkExistingSubmission] Could not list collections:', e);
            }

            // Try to get all submissions first to verify data exists
            try {
                const allDocs = await db.collection('sheetRsvps').limit(10).get();
                console.log('[checkExistingSubmission] Sample submissions exist?', !allDocs.empty, 'Count:', allDocs.size);
                if (!allDocs.empty) {
                    console.log('[checkExistingSubmission] Sample submission data:', allDocs.docs[0].data());

                    // Log all submission names for debugging
                    console.log('[checkExistingSubmission] All submission names:',
                        allDocs.docs.map(doc => {
                            const data = doc.data();
                            return { id: doc.id, name: data.name };
                        })
                    );

                    // Check if any submission matches our guest name directly
                    const matchingDocs = allDocs.docs.filter(doc => {
                        const data = doc.data();
                        return data.name && (
                            data.name.trim() === guestName.trim() ||
                            data.name.toLowerCase().trim() === guestNameLower
                        );
                    });

                    if (matchingDocs.length > 0) {
                        console.log('[checkExistingSubmission] Found direct match in sample data:',
                            matchingDocs.map(doc => ({ id: doc.id, name: doc.data().name })));
                    }
                }
            } catch (e) {
                console.error('[checkExistingSubmission] Error getting sample submissions:', e);
            }

            // Try the query without the orderBy which might be causing issues
            let submissionSnapshot;
            try {
                submissionSnapshot = await db.collection('sheetRsvps')
                    .where('name', '==', guestName.trim()) // Use trimmed name
                    .limit(1)
                    .get();

                console.log('[checkExistingSubmission] Simple query without orderBy result empty?', submissionSnapshot.empty);

                // If that didn't work, try with orderBy
                if (submissionSnapshot.empty) {
                    submissionSnapshot = await db.collection('sheetRsvps')
                        .where('name', '==', guestName.trim()) // Use trimmed name
                        .orderBy('submittedAt', 'desc')
                        .limit(1)
                        .get();

                    console.log('[checkExistingSubmission] Query with orderBy result empty?', submissionSnapshot.empty);
                }
            } catch (e) {
                console.error('[checkExistingSubmission] Error with query:', e);

                // If there was an error, try a simpler query without any conditions
                try {
                    submissionSnapshot = await db.collection('sheetRsvps').limit(10).get();
                    console.log('[checkExistingSubmission] Fallback query result empty?', submissionSnapshot.empty);

                    // If we got results, manually filter for our guest
                    if (!submissionSnapshot.empty) {
                        const matchingDocs = submissionSnapshot.docs.filter(doc => {
                            const data = doc.data();
                            return data.name && (
                                data.name.trim() === guestName.trim() ||
                                data.name.toLowerCase().trim() === guestNameLower
                            );
                        });

                        if (matchingDocs.length > 0) {
                            // Create a new snapshot with just the matching docs
                            submissionSnapshot = {
                                empty: false,
                                docs: matchingDocs
                            };
                            console.log('[checkExistingSubmission] Found matches through manual filtering');

                            // Pre-process the first matching document to ensure it has all required fields
                            const firstMatch = matchingDocs[0];
                            const matchData = firstMatch.data();

                            // Make sure we have all the required fields
                            if (!matchData.name) {
                                matchData.name = guestName; // Use the guest name if missing in submission
                            }

                            // Ensure attending field exists
                            if (!matchData.attending) {
                                matchData.attending = 'yes'; // Default to yes if missing
                                console.warn('[checkExistingSubmission] Manual match missing attending field, defaulting to yes');
                            }

                            // Update the document in the snapshot
                            firstMatch.data = () => matchData;
                        } else {
                            submissionSnapshot = { empty: true, docs: [] };
                        }
                    }
                } catch (innerError) {
                    console.error('[checkExistingSubmission] Error with fallback query:', innerError);
                    submissionSnapshot = { empty: true, docs: [] };
                }
            }

            console.log('[checkExistingSubmission] Query result empty?', submissionSnapshot.empty);

            if (!submissionSnapshot.empty) {
                const doc = submissionSnapshot.docs[0];
                const submission = doc.data();
                submission.id = doc.id; // IMPORTANT: Store the document ID
                console.log('[checkExistingSubmission] SUCCESS: Found exact match submission (ID:', submission.id, ')');

                // Make sure we have all the required fields
                if (!submission.name) {
                    submission.name = guestName; // Use the guest name if missing in submission
                }

                // Ensure attending field exists
                if (!submission.attending) {
                    submission.attending = 'yes'; // Default to yes if missing
                    console.warn('[checkExistingSubmission] Submission missing attending field, defaulting to yes');
                }

                // Call processExistingSubmission and capture the result
                console.log('[checkExistingSubmission] CRITICAL DEBUG: About to call processExistingSubmission with submission:', submission);
                const result = processExistingSubmission(submission);
                console.log('[checkExistingSubmission] processExistingSubmission returned:', result);
                console.log('[checkExistingSubmission] After processExistingSubmission, window.existingSubmission is:', window.existingSubmission ? 'SET' : 'NULL');
                return result; // Return the result
            }

            // STEP 2: If no exact match, try a case-insensitive search
            console.log('[checkExistingSubmission] Step 2: No exact match found, trying case-insensitive search.');
            // Firestore doesn't support case-insensitive queries directly. Fetch potential matches.
            // This might be inefficient for very large datasets, but necessary here.
            console.log('[checkExistingSubmission] CRITICAL DEBUG: Fetching all submissions for case-insensitive check');
            const allSubmissionsSnapshot = await db.collection('sheetRsvps').get();
            console.log('[checkExistingSubmission] Found total submissions:', allSubmissionsSnapshot.size);

            let caseInsensitiveMatch = null;

            allSubmissionsSnapshot.forEach(doc => {
                const data = doc.data();
                // Check if name exists and matches case-insensitively
                if (data.name && data.name.toLowerCase().trim() === guestNameLower) {
                    console.log('[checkExistingSubmission] Found case-insensitive match:', data.name);

                    // Store submittedAt as a JavaScript Date if it's a Firebase timestamp
                    let submittedAt;
                    if (data.submittedAt) {
                        if (data.submittedAt.toDate) {
                            submittedAt = data.submittedAt.toDate();
                            console.log('[checkExistingSubmission] Converted timestamp to date:', submittedAt);
                        } else {
                            submittedAt = data.submittedAt;
                            console.log('[checkExistingSubmission] Using raw submittedAt:', submittedAt);
                        }
                    }

                    if (!caseInsensitiveMatch ||
                        (submittedAt && (!caseInsensitiveMatch.submittedAt ||
                         submittedAt > caseInsensitiveMatch.submittedAt))) {
                        // Found a match, store it along with ID
                        caseInsensitiveMatch = JSON.parse(JSON.stringify(data));  // Deep clone the data
                        caseInsensitiveMatch.id = doc.id; // IMPORTANT: Store the document ID
                        console.log('[checkExistingSubmission] Selected as best match (ID):', caseInsensitiveMatch.id);
                        // Keep the most recent submission if multiple matches found
                    }
                }
            });

            if (caseInsensitiveMatch) {
                console.log('[checkExistingSubmission] SUCCESS: Found case-insensitive match submission (ID:', caseInsensitiveMatch.id, ')');
                // Make sure we have a complete object with ID before processing
                if (!caseInsensitiveMatch.id) {
                    console.error('[checkExistingSubmission] ERROR: Match is missing ID, cannot process');
                    return resetSubmissionState();
                }

                // Make sure we have all the required fields
                if (!caseInsensitiveMatch.name) {
                    caseInsensitiveMatch.name = guestName; // Use the guest name if missing in submission
                }

                // Ensure attending field exists
                if (!caseInsensitiveMatch.attending) {
                    caseInsensitiveMatch.attending = 'yes'; // Default to yes if missing
                    console.warn('[checkExistingSubmission] Case-insensitive match missing attending field, defaulting to yes');
                }

                console.log('[checkExistingSubmission] CRITICAL DEBUG: About to call processExistingSubmission');
                const result = processExistingSubmission(caseInsensitiveMatch);
                console.log('[checkExistingSubmission] processExistingSubmission returned:', result);
                return result; // Return the result from processing
            }

            // STEP 3: Optional - Add more lenient matching if needed (e.g., partial match)
            // For now, exact and case-insensitive should cover most cases.
            console.log('[checkExistingSubmission] Step 3: No case-insensitive match found.');


            // No submission found after all attempts
            console.log('[checkExistingSubmission] RESULT: No existing submission found for:', guestName);
            return resetSubmissionState(); // Explicitly reset state

        } catch (error) {
            console.error('[checkExistingSubmission] CRITICAL ERROR:', error);
            // Optionally show a user-facing error
            return resetSubmissionState(); // Ensure clean state on error
        }
    }

    // Helper function to process an existing submission
    function processExistingSubmission(submission) {
        console.log('[processExistingSubmission] Processing submission:', submission);
        console.log('[processExistingSubmission] CRITICAL DEBUG: Function was called!');
        console.log('[processExistingSubmission] CRITICAL DEBUG: Current window.existingSubmission:', window.existingSubmission);

        // Detailed logging of submission object
        console.log('[processExistingSubmission] Submission keys:', Object.keys(submission));
        console.log('[processExistingSubmission] Submission attending value:', submission.attending);
        console.log('[processExistingSubmission] Submission email:', submission.email);
        console.log('[processExistingSubmission] Submission adultGuests:', submission.adultGuests);
        console.log('[processExistingSubmission] Submission ID:', submission.id);

        // Get fresh references to DOM elements to ensure they exist
        const existingSubmissionInfoElement = document.getElementById('existingSubmissionInfo');
        if (!existingSubmissionInfoElement) {
            console.error('[processExistingSubmission] CRITICAL ERROR: Could not find existingSubmissionInfo element!');
            return false;
        }

        const submitButtonElement = document.getElementById('submitButton');
        if (!submitButtonElement) {
            console.error('[processExistingSubmission] CRITICAL ERROR: Could not find submitButton element!');
            return false;
        }

        // Use the fresh references for the rest of the function
        const localExistingSubmissionInfo = existingSubmissionInfoElement;
        const localSubmitButton = submitButtonElement;

        // Use optional chaining for cleaner check
        if (!submission?.id) {
             console.error('[processExistingSubmission] ERROR: Invalid submission object received (missing ID):', submission);
             return resetSubmissionState(); // Cannot process without valid data/ID
        }

        // Store the existing submission globally - make a clone to avoid reference issues
        try {
            existingSubmission = JSON.parse(JSON.stringify(submission));
            window.existingSubmission = existingSubmission; // Ensure global state is set
            console.log('[processExistingSubmission] Set window.existingSubmission with ID:', window.existingSubmission.id);
            console.log('[processExistingSubmission] CRITICAL DEBUG: window.existingSubmission is now:', window.existingSubmission);
        } catch (error) {
            console.error('[processExistingSubmission] ERROR setting existingSubmission:', error);
        }

        // Show existing submission info section
        console.log('[processExistingSubmission] Setting existingSubmissionInfo display to block');
        localExistingSubmissionInfo.style.display = 'block'; // Use 'block' or 'flex' depending on CSS

        // Update button text and style
        console.log('[processExistingSubmission] Updating submit button to Update RSVP mode');
        localSubmitButton.innerHTML = '<i class="fas fa-edit"></i> Update RSVP';
        localSubmitButton.classList.add('update-mode');

        // Show update notice (if element exists)
        const updateNotice = document.getElementById('updateNotice');
        if (updateNotice) {
            console.log('[processExistingSubmission] Setting updateNotice display to block');
            updateNotice.style.display = 'block';
        } else {
            console.warn('[processExistingSubmission] updateNotice element not found');
        }

        // Update form title
        const formTitle = document.getElementById('rsvp-form-title');
        if (formTitle) {
            console.log('[processExistingSubmission] Updating form title to Update Your RSVP');
            formTitle.textContent = 'Update Your RSVP';
        } else {
            console.warn('[processExistingSubmission] formTitle element not found');
        }

        // Pre-fill form with existing data
        prefillFormWithExistingData(submission);

        // Save the name in a cookie for convenience on future visits
        // Consider security implications if sensitive data is involved
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        document.cookie = `lastRsvpName=${encodeURIComponent(submission.name)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;
        console.log('[processExistingSubmission] Cookie set for:', submission.name);

        return true; // Indicate that we found and processed an existing submission
    }

    // Helper function to reset submission state and UI
    function resetSubmissionState() {
        console.log('[resetSubmissionState] Resetting state and UI.');
        console.log('[resetSubmissionState] CRITICAL DEBUG: Current window.existingSubmission:', window.existingSubmission);

        // Clear global state
        try {
            existingSubmission = null;
            window.existingSubmission = null;
            console.log('[resetSubmissionState] Cleared existingSubmission');
        } catch (error) {
            console.error('[resetSubmissionState] Error clearing existingSubmission:', error);
        }
        // selectedGuest is handled by selectGuest start

        // Get fresh references to DOM elements
        const existingSubmissionInfoElement = document.getElementById('existingSubmissionInfo');
        const submitButtonElement = document.getElementById('submitButton');
        const updateNoticeElement = document.getElementById('updateNotice');
        const formTitleElement = document.getElementById('rsvp-form-title');

        console.log('[resetSubmissionState] DOM elements found:', {
            existingSubmissionInfo: !!existingSubmissionInfoElement,
            submitButton: !!submitButtonElement,
            updateNotice: !!updateNoticeElement,
            formTitle: !!formTitleElement
        });

        // Hide specific sections
        if (existingSubmissionInfoElement) {
            existingSubmissionInfoElement.style.display = 'none';
        }

        if (updateNoticeElement) {
            updateNoticeElement.style.display = 'none';
        }
        // Keep guestFoundInfo visible if a guest was selected

        // Reset button text and style
        if (submitButtonElement) {
            submitButtonElement.innerHTML = '<i class="fas fa-paper-plane"></i> Submit RSVP';
            submitButtonElement.classList.remove('update-mode');
        }

        // Reset form title
        if (formTitleElement) {
            formTitleElement.textContent = 'Submit Your RSVP'; // Or your default title
        }

        // Clear form fields (optional, could be done on new selection)
        // document.getElementById('rsvpForm')?.reset(); // Be careful with this, might clear name input

        console.log('[resetSubmissionState] Reset complete.');
        console.log('[resetSubmissionState] CRITICAL DEBUG: Final window.existingSubmission:', window.existingSubmission);
        return false; // Indicate that we are NOT in an update state
    }

    // Pre-fill form with existing submission data
    function prefillFormWithExistingData(submission) {
        console.log('[prefillForm] Pre-filling form with data:', submission);
        console.log('[prefillForm] CRITICAL DEBUG: Current window.existingSubmission:', window.existingSubmission);

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

        if (!emailInput || !phoneInput || !attendingYesRadio || !attendingNoRadio || !attendingSectionElement) {
            console.error('[prefillForm] Missing required DOM elements:', {
                emailInput: !!emailInput,
                phoneInput: !!phoneInput,
                attendingYesRadio: !!attendingYesRadio,
                attendingNoRadio: !!attendingNoRadio,
                attendingSectionElement: !!attendingSectionElement
            });
            return;
        }

        // Set email and phone
        emailInput.value = submission.email || '';
        phoneInput.value = submission.phone || '';

        // Determine if attending based on submission data
        const isAttending = submission.attending === 'yes';
        console.log('[prefillForm] Is Attending:', isAttending);

        // Set the appropriate radio button
        if (isAttending) {
            attendingYesRadio.checked = true;
            attendingNoRadio.checked = false;
            attendingSectionElement.style.display = 'block'; // Show guest count section
        } else {
            attendingNoRadio.checked = true;
            attendingYesRadio.checked = false;
            attendingSectionElement.style.display = 'none'; // Hide guest count section
        }

        // Parse guest counts for attending guests
        if (isAttending) {
            // Get adult count
            let adultCount = 1; // Default to 1 adult
            // Check for adultCount first, then guestCount for backward compatibility
            if (typeof submission.adultCount === 'number' && submission.adultCount >= 0) {
                 adultCount = submission.adultCount;
            } else if (typeof submission.guestCount === 'number' && submission.guestCount >= 1) {
                 // Assume guestCount was adults if adultCount is missing
                 adultCount = submission.guestCount;
                 console.warn('[prefillForm] Using guestCount for adultCount (backward compatibility).');
            } else if (submission.adultGuests && Array.isArray(submission.adultGuests)) {
                 // Infer from adultGuests array if counts are missing
                 adultCount = submission.adultGuests.length > 0 ? submission.adultGuests.length : 1;
                 console.warn('[prefillForm] Inferring adultCount from adultGuests array.');
            }


            // Get child count
            let childCount = 0; // Default to 0 children
            if (typeof submission.childCount === 'number' && submission.childCount >= 0) {
                childCount = submission.childCount;
            } else if (submission.childGuests && Array.isArray(submission.childGuests)) {
                 // Infer from childGuests array if count is missing
                 childCount = submission.childGuests.length;
                 console.warn('[prefillForm] Inferring childCount from childGuests array.');
            }


            console.log(`[prefillForm] Setting counts - Adults: ${adultCount}, Children: ${childCount}`);

            // Set guest counts in form
            adultCountInput.value = adultCount;
            childCountInput.value = childCount;

            // Update guest fields to create the input elements *before* filling them
            updateGuestFields();

            // Use setTimeout with a short delay instead of requestAnimationFrame
            // This ensures the DOM has time to fully update before we try to fill guest names
            setTimeout(() => {
                console.log('[prefillForm] DOM updated, attempting to fill guest names.');
                // Pre-fill adult guest names
                if (submission.adultGuests && Array.isArray(submission.adultGuests) && submission.adultGuests.length > 0) {
                    const adultInputs = adultGuestsContainer.querySelectorAll('input');
                    console.log(`[prefillForm] Found ${adultInputs.length} adult input fields.`);
                    submission.adultGuests.forEach((name, index) => {
                        if (adultInputs[index]) {
                            adultInputs[index].value = name || ''; // Ensure value is not undefined
                            console.log(`[prefillForm] Set Adult ${index + 1} to: ${name}`);
                        } else {
                            console.warn(`[prefillForm] Could not find input field for Adult ${index + 1}`);
                        }
                    });
                } else {
                     console.log('[prefillForm] No adultGuests array found or empty.');
                     // Ensure the first adult field (primary guest) is filled if possible
                     const firstAdultInput = adultGuestsContainer.querySelector('input');
                     if (firstAdultInput && !firstAdultInput.value) {
                         firstAdultInput.value = submission.name || '';
                         console.log(`[prefillForm] Set primary adult name from submission.name: ${submission.name}`);
                     }
                }


                // Pre-fill child guest names
                if (submission.childGuests && Array.isArray(submission.childGuests) && submission.childGuests.length > 0) {
                    const childInputs = childGuestsContainer.querySelectorAll('input');
                     console.log(`[prefillForm] Found ${childInputs.length} child input fields.`);
                    submission.childGuests.forEach((name, index) => {
                        if (childInputs[index]) {
                            childInputs[index].value = name || ''; // Ensure value is not undefined
                            console.log(`[prefillForm] Set Child ${index + 1} to: ${name}`);
                        } else {
                             console.warn(`[prefillForm] Could not find input field for Child ${index + 1}`);
                        }
                    });
                } else {
                     console.log('[prefillForm] No childGuests array found or empty.');
                }
                 console.log('[prefillForm] Finished filling guest names.');
            }, 50); // Short 50ms delay
        } else {
             // If not attending, clear/hide guest count fields
             adultCountInput.value = 0;
             childCountInput.value = 0;
             updateGuestFields(); // Clear the fields
        }


        // Trigger change events manually to ensure form is properly updated
        const event = new Event('change', { bubbles: true });
        if (attendingYesRadio.checked) {
            attendingYesRadio.dispatchEvent(event);
        } else if (attendingNoRadio.checked) {
            attendingNoRadio.dispatchEvent(event);
        }

        console.log('[prefillForm] Form pre-fill attempt complete.');
    }

    // Update guest fields based on adult and child counts
    function updateGuestFields() {
        let adultCount = parseInt(adultCountInput.value) || 0;
        const childCount = parseInt(childCountInput.value) || 0;

        // Ensure at least one guest (adult or child) is selected
        if (adultCount === 0 && childCount === 0) {
            // Default to 1 adult if both are 0
            adultCountInput.value = 1;
            adultCount = 1;
        }

        // Update adult guest fields
        adultGuestsContainer.innerHTML = '';
        for (let i = 0; i < adultCount; i++) {
            const guestField = document.createElement('div');
            guestField.className = 'guest-field';

            const label = document.createElement('label');
            label.setAttribute('for', `adultName${i+1}`);
            label.textContent = i === 0 ? 'Your Name:' : `Adult Guest ${i}:`;

            const input = document.createElement('input');
            input.type = 'text';
            input.id = `adultName${i+1}`;
            input.name = `adultName${i+1}`;
            input.required = true;

            // Pre-fill the first field with the selected guest's name
            if (i === 0 && selectedGuest) {
                input.value = selectedGuest.name;
            }

            guestField.appendChild(label);
            guestField.appendChild(input);
            adultGuestsContainer.appendChild(guestField);
        }

        // Update child guest fields
        childGuestsContainer.innerHTML = '';
        for (let i = 0; i < childCount; i++) {
            const guestField = document.createElement('div');
            guestField.className = 'guest-field';

            const label = document.createElement('label');
            label.setAttribute('for', `childName${i+1}`);
            label.textContent = `Child ${i+1}:`;

            const input = document.createElement('input');
            input.type = 'text';
            input.id = `childName${i+1}`;
            input.name = `childName${i+1}`;
            input.required = true;

            guestField.appendChild(label);
            guestField.appendChild(input);
            childGuestsContainer.appendChild(guestField);
        }

        // Show/hide sections based on counts
        childGuestSection.style.display = childCount > 0 ? 'block' : 'none';

        // Get the adults section
        const adultGuestSection = adultGuestsContainer.closest('.guest-section');
        if (adultGuestSection) {
            adultGuestSection.style.display = adultCount > 0 ? 'block' : 'none';
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
            // Optionally clear guest names when switching to No
             adultCountInput.value = 0;
             childCountInput.value = 0;
             updateGuestFields(); // Clear guest name fields
        }
    }

    if (attendingYesRadio && attendingNoRadio && attendingSection) {
        attendingYesRadio.addEventListener('change', handleAttendingChange);
        attendingNoRadio.addEventListener('change', handleAttendingChange);
        // Initial check in case the form is pre-filled by the browser or existing submission
         handleAttendingChange();
    }

    // Initialize guest fields on page load
    updateGuestFields();

    // Function to auto-search for a guest by name - simplified for reliability
    async function autoSearchGuest(guestName) {
        if (!guestName || !nameInput) {
            console.log('Invalid parameters for auto-search');
            return false;
        }

        console.log('CRITICAL FUNCTION: Auto-searching for guest:', guestName);
        nameInput.value = guestName;

        try {
            // First search for the guest in the guest list
            console.log('Searching for guest in guest list:', guestName);
            const results = await searchGuests(guestName);

            if (results.length > 0) {
                // Find exact match if possible (case-insensitive)
                const exactMatch = results.find(guest =>
                    guest.name.toLowerCase() === guestName.toLowerCase());

                if (exactMatch) {
                    console.log('Exact match found in guest list, selecting guest:', exactMatch.name);
                    const success = await selectGuest(exactMatch.id);
                    return success;
                } else {
                    // Otherwise select the first result
                    console.log('No exact match in guest list, selecting first result:', results[0].name);
                    const success = await selectGuest(results[0].id);
                    return success;
                }
            }

            // If no results in guest list, try a more flexible search
            console.log('No results found in guest list, trying flexible search...');

            // Get all guests
            const db = firebase.firestore();
            const allGuests = await db.collection('guestList').get();

            // Try to find a partial match
            const searchNameLower = guestName.toLowerCase();
            let bestMatch = null;
            let bestScore = 0;

            allGuests.forEach(doc => {
                const guest = doc.data();
                if (guest.name) {
                    const guestNameLower = guest.name.toLowerCase();

                    // Check for partial matches
                    if (guestNameLower.includes(searchNameLower) || searchNameLower.includes(guestNameLower)) {
                        const score = Math.min(guestNameLower.length, searchNameLower.length) /
                                     Math.max(guestNameLower.length, searchNameLower.length);

                        if (score > bestScore) {
                            bestScore = score;
                            bestMatch = doc;
                        }
                    }
                }
            });

            // If we found a good match, select it
            if (bestMatch && bestScore > 0.5) {
                const guest = bestMatch.data();
                guest.id = bestMatch.id;

                console.log(`Found partial match in guest list (score ${bestScore.toFixed(2)}):`, guest.name);
                const success = await selectGuest(guest.id);
                return success;
            }

            console.log('No matching guest found for:', guestName);
            return false;
        } catch (error) {
            console.error('ERROR in autoSearchGuest:', error);
            return false;
        }
    }

    // Check for name parameter in URL for direct RSVP updates
    function getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name) || '';
    }

    // Initialize the RSVP form with a more reliable approach
    function initializeRsvpForm() {
        console.log('Initializing RSVP form...');

        // First check for name parameter in URL
        const nameParam = getUrlParameter('name');
        if (nameParam) {
            console.log('Name parameter found in URL:', nameParam);
            // Decode the name parameter in case it was encoded in the URL
            const decodedName = decodeURIComponent(nameParam);
            console.log('Decoded name parameter:', decodedName);

            // Use a longer timeout to ensure the DOM and Firebase are fully loaded
            setTimeout(() => {
                console.log('Attempting auto-search with URL parameter...');
                autoSearchGuest(decodedName).then(success => {
                    if (!success) {
                        console.log('Auto-search with URL parameter failed, trying fallbacks...');
                        tryFallbackMethods();
                    }
                }).catch(error => {
                    console.error('Error in auto-search with URL parameter:', error);
                    tryFallbackMethods();
                });
            }, 500);
        } else {
            // No name parameter, try fallback methods
            console.log('No name parameter in URL, trying fallback methods...');
            tryFallbackMethods();
        }
    }

    // Function to try fallback methods for finding the guest
    function tryFallbackMethods() {
        // Check if there's a cookie with previous submission info
        const lastSubmissionName = getCookie('lastRsvpName');
        if (lastSubmissionName) {
            console.log('Found cookie with previous submission name:', lastSubmissionName);

            // Decode the cookie value in case it was encoded
            const decodedName = decodeURIComponent(lastSubmissionName);
            console.log('Decoded cookie name:', decodedName);

            autoSearchGuest(decodedName).then(success => {
                if (!success) {
                    console.log('Auto-search with cookie failed, trying Firebase...');
                    checkForExistingSubmissions();
                }
            }).catch(error => {
                console.error('Error in auto-search with cookie:', error);
                checkForExistingSubmissions();
            });
        } else {
            // If no cookie, check if we can find an existing submission in Firebase
            // This allows updates from any device without relying on cookies
            console.log('No cookie found, checking Firebase for existing submissions...');
            checkForExistingSubmissions();
        }
    }

    // Start the initialization process
    initializeRsvpForm();

    // Function to check for existing submissions in Firebase
    async function checkForExistingSubmissions() {
        try {
            // This function will be called when the page loads if no name parameter or cookie is found
            // It tries to find any existing submissions that might be relevant

            console.log('Checking for existing submissions in Firebase...');
            const db = firebase.firestore();

            // Get the most recent submissions (up to 5)
            const submissionsSnapshot = await db.collection('sheetRsvps')
                .orderBy('submittedAt', 'desc')
                .limit(5)
                .get();

            if (!submissionsSnapshot.empty) {
                console.log(`Found ${submissionsSnapshot.size} recent submissions in Firebase`);

                // Try each submission, starting with the most recent
                for (const doc of submissionsSnapshot.docs) {
                    const submission = doc.data();
                    const submissionName = submission.name;

                    if (submissionName) {
                        console.log('Trying to auto-search for recent submission:', submissionName);
                        const success = await autoSearchGuest(submissionName);

                        if (success) {
                            console.log('Successfully found and selected guest from recent submission');
                            return true;
                        }
                    }
                }

                console.log('Could not find any matching guests for recent submissions');
            } else {
                console.log('No existing submissions found in Firebase');
            }

            return false;
        } catch (error) {
            console.error('Error checking for existing submissions:', error);
            return false;
        }
    }

    // Helper function to get cookie value
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
    }
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
