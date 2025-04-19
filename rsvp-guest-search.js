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
        try {
            console.log('CRITICAL FUNCTION: Selecting guest with ID:', guestId);
            const db = firebase.firestore();

            // STEP 1: Get the guest document
            const guestDoc = await db.collection('guestList').doc(guestId).get();

            if (!guestDoc.exists) {
                console.error('ERROR: Guest not found with ID:', guestId);
                return false;
            }

            // Store the selected guest
            selectedGuest = guestDoc.data();
            selectedGuest.id = guestId;
            window.selectedGuest = selectedGuest;

            console.log('SUCCESS: Found guest in guest list:', selectedGuest.name);

            // Set the name input value
            nameInput.value = selectedGuest.name;

            // Hide autocomplete results
            autocompleteResults.style.display = 'none';

            // Show guest info
            guestFoundInfo.style.display = 'block';

            // Set guest category if available
            if (selectedGuest.category) {
                guestCategoryElement.textContent = `Category: ${selectedGuest.category}`;
            } else {
                guestCategoryElement.textContent = '';
            }

            // STEP 2: Check if this guest has already submitted an RSVP
            console.log('STEP 2: Checking if guest has already submitted an RSVP...');

            // First check if the guest has a response flag in their record
            if (selectedGuest.hasResponded === true) {
                console.log('Guest record indicates they have already responded, checking for submission...');
            }

            // Always check for existing submission in the database
            // This is the most reliable way to find existing submissions
            const hasExistingSubmission = await checkExistingSubmission(selectedGuest.name);

            console.log('Existing submission check result:', hasExistingSubmission ? 'Found' : 'Not found');

            // STEP 3: Show the appropriate form fields
            // Show additional fields regardless of whether there's an existing submission
            additionalFields.style.display = 'block';
            submitButtonContainer.style.display = 'block';

            // No maximum guest limit
            adultCountInput.removeAttribute('max');

            // Update guest fields
            updateGuestFields();

            return true;
        } catch (error) {
            console.error('ERROR in selectGuest:', error);
            return false;
        }
    }

    // Check if guest has already submitted an RSVP - completely rewritten for reliability
    async function checkExistingSubmission(guestName) {
        try {
            console.log('CRITICAL FUNCTION: Checking for existing submission for:', guestName);
            const db = firebase.firestore();

            // STEP 1: Try to find an exact match by name
            console.log('Step 1: Trying exact match search for:', guestName);
            let submissionSnapshot = await db.collection('sheetRsvps')
                .where('name', '==', guestName)
                .orderBy('submittedAt', 'desc')
                .limit(1)
                .get();

            // If we found an exact match, use it
            if (!submissionSnapshot.empty) {
                const doc = submissionSnapshot.docs[0];
                const submission = doc.data();
                submission.id = doc.id;

                console.log('SUCCESS: Found exact match submission:', submission);
                return processExistingSubmission(submission);
            }

            // STEP 2: If no exact match, try a case-insensitive search
            console.log('Step 2: No exact match found, trying case-insensitive search for:', guestName);

            // Get all submissions
            const allSubmissions = await db.collection('sheetRsvps').get();
            let matchFound = false;
            let matchingDoc = null;

            // Find a case-insensitive match
            allSubmissions.forEach(doc => {
                const data = doc.data();
                if (!matchFound && data.name && data.name.toLowerCase() === guestName.toLowerCase()) {
                    matchFound = true;
                    matchingDoc = doc;
                }
            });

            // If we found a case-insensitive match, use it
            if (matchFound && matchingDoc) {
                const submission = matchingDoc.data();
                submission.id = matchingDoc.id;

                console.log('SUCCESS: Found case-insensitive match submission:', submission);
                return processExistingSubmission(submission);
            }

            // STEP 3: Try a more flexible search (partial match)
            console.log('Step 3: No case-insensitive match found, trying partial match search for:', guestName);

            // Convert name to lowercase for comparison
            const searchNameLower = guestName.toLowerCase();
            let bestMatch = null;
            let bestMatchScore = 0;

            // Find the best partial match
            allSubmissions.forEach(doc => {
                const data = doc.data();
                if (data.name) {
                    const docNameLower = data.name.toLowerCase();

                    // Check if names share significant parts
                    if (docNameLower.includes(searchNameLower) || searchNameLower.includes(docNameLower)) {
                        // Calculate a simple match score (higher is better)
                        const score = Math.min(docNameLower.length, searchNameLower.length) /
                                     Math.max(docNameLower.length, searchNameLower.length);

                        // Keep the best match
                        if (score > bestMatchScore) {
                            bestMatchScore = score;
                            bestMatch = doc;
                        }
                    }
                }
            });

            // If we found a good partial match (score > 0.5 means significant overlap)
            if (bestMatch && bestMatchScore > 0.5) {
                const submission = bestMatch.data();
                submission.id = bestMatch.id;

                console.log(`SUCCESS: Found partial match submission (score ${bestMatchScore.toFixed(2)}):`, submission);
                return processExistingSubmission(submission);
            }

            // No submission found after all attempts
            console.log('RESULT: No existing submission found for:', guestName);
            return resetSubmissionState();

        } catch (error) {
            console.error('ERROR in checkExistingSubmission:', error);
            return resetSubmissionState();
        }
    }

    // Helper function to process an existing submission
    function processExistingSubmission(submission) {
        // Store the existing submission
        existingSubmission = submission;
        window.existingSubmission = existingSubmission;

        console.log('Setting existingSubmission:', existingSubmission);

        // Show existing submission info
        existingSubmissionInfo.style.display = 'block';

        // Update button text and style
        submitButton.innerHTML = '<i class="fas fa-edit"></i> Update RSVP';
        submitButton.classList.add('update-mode');

        // Show update notice
        const updateNotice = document.getElementById('updateNotice');
        if (updateNotice) {
            updateNotice.style.display = 'block';
        }

        // Update form title
        const formTitle = document.getElementById('rsvp-form-title');
        if (formTitle) {
            formTitle.textContent = 'Update Your RSVP';
        }

        // Pre-fill form with existing data
        prefillFormWithExistingData(submission);

        // Save the name in a cookie for convenience on future visits
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        document.cookie = `lastRsvpName=${encodeURIComponent(submission.name)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;

        return true; // Indicate that we found an existing submission
    }

    // Helper function to reset submission state
    function resetSubmissionState() {
        // No existing submission
        existingSubmission = null;
        window.existingSubmission = null;

        // Hide existing submission info
        existingSubmissionInfo.style.display = 'none';

        // Reset button text and style
        submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Submit RSVP';
        submitButton.classList.remove('update-mode');

        // Hide update notice
        const updateNotice = document.getElementById('updateNotice');
        if (updateNotice) {
            updateNotice.style.display = 'none';
        }

        return false; // Indicate that we didn't find an existing submission
    }

    // Pre-fill form with existing submission data
    function prefillFormWithExistingData(submission) {
        console.log('Pre-filling form with existing data:', submission);

        // Set email and phone
        document.getElementById('email').value = submission.email || '';
        document.getElementById('phone').value = submission.phone || '';

        // Set attending radio button
        const attendingYes = document.getElementById('attendingYes');
        const attendingNo = document.getElementById('attendingNo');

        // Determine if attending based on submission data
        const isAttending = submission.attending === 'yes';

        // Set the appropriate radio button
        if (isAttending) {
            attendingYes.checked = true;
        } else {
            attendingNo.checked = true;
        }

        // Parse guest counts for attending guests
        if (isAttending) {
            // Get adult count
            let adultCount = 1; // Default to 1 adult
            if (typeof submission.adultCount === 'number') {
                adultCount = submission.adultCount;
            } else if (typeof submission.guestCount === 'number') {
                // For backward compatibility
                adultCount = submission.guestCount;
            }

            // Get child count
            let childCount = 0; // Default to 0 children
            if (typeof submission.childCount === 'number') {
                childCount = submission.childCount;
            }

            // Set guest counts in form
            adultCountInput.value = adultCount;
            childCountInput.value = childCount;

            // Update guest fields to create the input elements
            updateGuestFields();

            // Wait a moment for the DOM to update
            setTimeout(() => {
                // Pre-fill adult guest names
                if (submission.adultGuests && Array.isArray(submission.adultGuests) && submission.adultGuests.length > 0) {
                    const adultInputs = adultGuestsContainer.querySelectorAll('input');
                    submission.adultGuests.forEach((name, index) => {
                        if (adultInputs[index]) {
                            adultInputs[index].value = name;
                        }
                    });
                } else if (submission.additionalGuests && Array.isArray(submission.additionalGuests) && submission.additionalGuests.length > 0) {
                    // For backward compatibility
                    const adultInputs = adultGuestsContainer.querySelectorAll('input');
                    // Make sure the first input has the primary guest name
                    if (adultInputs[0]) {
                        adultInputs[0].value = submission.name || '';
                    }

                    // Fill in additional guests
                    submission.additionalGuests.forEach((name, index) => {
                        if (adultInputs[index + 1]) { // +1 to skip the first input (self)
                            adultInputs[index + 1].value = name;
                        }
                    });
                }

                // Pre-fill child guest names
                if (submission.childGuests && Array.isArray(submission.childGuests) && submission.childGuests.length > 0) {
                    const childInputs = childGuestsContainer.querySelectorAll('input');
                    submission.childGuests.forEach((name, index) => {
                        if (childInputs[index]) {
                            childInputs[index].value = name;
                        }
                    });
                }
            }, 100); // Short delay to ensure DOM is updated
        }

        // Trigger change event to update form visibility
        const event = new Event('change');
        if (attendingYes.checked) {
            attendingYes.dispatchEvent(event);
        } else {
            attendingNo.dispatchEvent(event);
        }

        console.log('Form pre-filled successfully');
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

    // Show/hide guest count based on attendance
    const attendingRadios = document.querySelectorAll('input[name="attending"]');
    if (attendingRadios.length) {
        attendingRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                const guestCountsSection = document.getElementById('guestCountsSection');
                const guestsContainer = document.getElementById('guestsContainer');

                if (this.value === 'yes') {
                    guestCountsSection.style.display = 'flex';
                    guestsContainer.style.display = 'block';
                    updateGuestFields(); // Update guest fields when showing the section
                } else {
                    guestCountsSection.style.display = 'none';
                    guestsContainer.style.display = 'none';
                }
            });
        });
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

// Function to search for guests in Firestore
async function searchGuests(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) return [];

    try {
        const db = firebase.firestore();
        const guestListRef = db.collection('guestList');

        // Convert search term to lowercase for case-insensitive search
        const searchTermLower = searchTerm.toLowerCase();

        // Get all guests (we'll filter client-side)
        const snapshot = await guestListRef.get();

        if (snapshot.empty) {
            console.log('No guests found in database');
            return [];
        }

        // Filter guests whose names contain the search term
        const results = [];
        snapshot.forEach(doc => {
            const guest = doc.data();
            guest.id = doc.id; // Add document ID to the guest object

            if (guest.name?.toLowerCase().includes(searchTermLower)) {
                results.push(guest);
            }
        });

        return results;
    } catch (error) {
        console.error('Error searching guests:', error);
        return [];
    }
}
