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

    // Select a guest from the autocomplete results
    async function selectGuest(guestId) {
        try {
            const db = firebase.firestore();
            const guestDoc = await db.collection('guestList').doc(guestId).get();

            if (!guestDoc.exists) {
                console.error('Guest not found');
                return;
            }

            // Store the selected guest
            selectedGuest = guestDoc.data();
            selectedGuest.id = guestId;
            window.selectedGuest = selectedGuest;

            // Set the name input value
            nameInput.value = selectedGuest.name;

            // Hide autocomplete results
            autocompleteResults.style.display = 'none';

            // Show guest info
            guestFoundInfo.style.display = 'block';

            // Set guest category and max count
            if (selectedGuest.category) {
                guestCategoryElement.textContent = `Category: ${selectedGuest.category}`;
            } else {
                guestCategoryElement.textContent = '';
            }

            // No maximum guest limit - element removed

            // Check if guest has already submitted an RSVP
            await checkExistingSubmission(selectedGuest.name);

            // Show additional fields
            additionalFields.style.display = 'block';
            submitButtonContainer.style.display = 'block';

            // No maximum guest limit
            adultCountInput.removeAttribute('max');

            // Update guest fields
            updateGuestFields();
        } catch (error) {
            console.error('Error selecting guest:', error);
        }
    }

    // Check if guest has already submitted an RSVP
    async function checkExistingSubmission(guestName) {
        try {
            console.log('Checking for existing submission for:', guestName);
            const db = firebase.firestore();

            // First try to find an exact match by name
            let exactMatchSnapshot = await db.collection('sheetRsvps')
                .where('name', '==', guestName)
                .orderBy('submittedAt', 'desc')
                .limit(1)
                .get();

            // If we found an exact match, use it
            if (!exactMatchSnapshot.empty) {
                const doc = exactMatchSnapshot.docs[0];
                const submission = doc.data();
                submission.id = doc.id;

                console.log('Found exact match submission:', submission);
                return processExistingSubmission(submission);
            }

            // If no exact match, try a case-insensitive search
            console.log('No exact match found, trying case-insensitive search...');

            // Get all submissions and filter client-side
            const allSubmissionsSnapshot = await db.collection('sheetRsvps')
                .orderBy('submittedAt', 'desc')
                .get();

            // Find a case-insensitive match
            let matchingSubmission = null;

            allSubmissionsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.name && data.name.toLowerCase() === guestName.toLowerCase()) {
                    if (!matchingSubmission) { // Take the first match (which is the most recent due to ordering)
                        matchingSubmission = data;
                        matchingSubmission.id = doc.id;
                    }
                }
            });

            // If we found a case-insensitive match, use it
            if (matchingSubmission) {
                console.log('Found case-insensitive match submission:', matchingSubmission);
                return processExistingSubmission(matchingSubmission);
            }

            // No submission found
            console.log('No existing submission found for:', guestName);
            return resetSubmissionState();

        } catch (error) {
            console.error('Error checking existing submission:', error);
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

    // Function to auto-search for a guest by name - completely rewritten for reliability
    async function autoSearchGuest(guestName) {
        if (!guestName || !nameInput) {
            console.log('Invalid parameters for auto-search');
            return false;
        }

        console.log('Auto-searching for guest:', guestName);
        nameInput.value = guestName;

        try {
            // STEP 1: First check if there's an existing RSVP submission with this exact name
            console.log('STEP 1: Checking for existing RSVP submission with name:', guestName);
            const db = firebase.firestore();

            // Try exact match first
            let submissionSnapshot = await db.collection('sheetRsvps')
                .where('name', '==', guestName)
                .limit(1)
                .get();

            // If no exact match, try case-insensitive
            if (submissionSnapshot.empty) {
                console.log('No exact RSVP match, trying case-insensitive...');
                const allSubmissions = await db.collection('sheetRsvps').get();

                allSubmissions.forEach(doc => {
                    const data = doc.data();
                    if (data.name?.toLowerCase() === guestName.toLowerCase()) {
                        // Create a synthetic snapshot with this document
                        submissionSnapshot = {
                            empty: false,
                            docs: [doc]
                        };
                    }
                });
            }

            // If we found a submission, try to find the matching guest
            if (!submissionSnapshot.empty) {
                const submission = submissionSnapshot.docs[0].data();
                submission.id = submissionSnapshot.docs[0].id;
                console.log('Found RSVP submission:', submission);

                // STEP 2: Find the guest in the guest list that matches this submission
                console.log('STEP 2: Finding guest that matches submission name:', submission.name);

                // Try exact match first
                const guestResults = await searchGuests(submission.name);
                let matchedGuest = null;

                if (guestResults.length > 0) {
                    // Look for exact match first
                    matchedGuest = guestResults.find(g =>
                        g.name.toLowerCase() === submission.name.toLowerCase());

                    // If no exact match, use the first result
                    if (!matchedGuest) {
                        matchedGuest = guestResults[0];
                    }

                    console.log('Found matching guest in guest list:', matchedGuest.name);

                    // Select this guest and store the submission
                    await selectGuest(matchedGuest.id);

                    // Manually set the existing submission since we already have it
                    existingSubmission = submission;
                    window.existingSubmission = existingSubmission;

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

                    return true;
                }
            }

            // STEP 3: If no submission found, just try to find the guest directly
            console.log('STEP 3: No submission found or no matching guest, searching guest list directly for:', guestName);
            const results = await searchGuests(guestName);

            if (results.length > 0) {
                // Find exact match if possible (case-insensitive)
                const exactMatch = results.find(guest =>
                    guest.name.toLowerCase() === guestName.toLowerCase());

                if (exactMatch) {
                    console.log('Exact match found in guest list, selecting guest:', exactMatch.name);
                    await selectGuest(exactMatch.id);
                    return true;
                } else {
                    // Otherwise select the first result
                    console.log('No exact match in guest list, selecting first result:', results[0].name);
                    await selectGuest(results[0].id);
                    return true;
                }
            }

            console.log('No matching guest found for:', guestName);
            return false;
        } catch (error) {
            console.error('Error in auto-search:', error);
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
