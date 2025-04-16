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
    const guestMaxCountElement = document.getElementById('guestMaxCount');
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

            if (selectedGuest.maxAllowedGuests) {
                guestMaxCountElement.textContent = `Maximum Guests: ${selectedGuest.maxAllowedGuests}`;
            } else {
                guestMaxCountElement.textContent = '';
            }

            // Check if guest has already submitted an RSVP
            await checkExistingSubmission(selectedGuest.name);

            // Show additional fields
            additionalFields.style.display = 'block';
            submitButtonContainer.style.display = 'block';

            // Update guest count inputs based on max allowed
            const maxGuests = selectedGuest.maxAllowedGuests || 1;
            adultCountInput.max = maxGuests;

            // Update guest fields
            updateGuestFields();
        } catch (error) {
            console.error('Error selecting guest:', error);
        }
    }

    // Check if guest has already submitted an RSVP
    async function checkExistingSubmission(guestName) {
        try {
            const db = firebase.firestore();
            const submissionsSnapshot = await db.collection('sheetRsvps')
                .where('name', '==', guestName)
                .orderBy('submittedAt', 'desc')
                .limit(1)
                .get();

            if (!submissionsSnapshot.empty) {
                // Get the most recent submission
                const submission = submissionsSnapshot.docs[0].data();
                submission.id = submissionsSnapshot.docs[0].id;

                // Store the existing submission
                existingSubmission = submission;
                window.existingSubmission = existingSubmission;

                // Show existing submission info
                existingSubmissionInfo.style.display = 'block';

                // Update button text
                submitButton.textContent = 'Update RSVP';

                // Pre-fill form with existing data
                prefillFormWithExistingData(submission);
            } else {
                // No existing submission
                existingSubmission = null;
                window.existingSubmission = null;

                // Hide existing submission info
                existingSubmissionInfo.style.display = 'none';

                // Reset button text
                submitButton.textContent = 'Submit RSVP';
            }
        } catch (error) {
            console.error('Error checking existing submission:', error);
        }
    }

    // Pre-fill form with existing submission data
    function prefillFormWithExistingData(submission) {
        // Set email and phone
        document.getElementById('email').value = submission.email || '';
        document.getElementById('phone').value = submission.phone || '';

        // Set attending radio button
        const attendingYes = document.getElementById('attendingYes');
        const attendingNo = document.getElementById('attendingNo');

        if (submission.attending === 'yes') {
            attendingYes.checked = true;

            // Parse guest counts
            let adultCount = 1; // Default to 1 adult
            let childCount = 0; // Default to 0 children

            if (submission.adultCount) {
                adultCount = submission.adultCount;
            } else if (submission.guestCount) {
                // For backward compatibility
                adultCount = submission.guestCount;
            }

            if (submission.childCount) {
                childCount = submission.childCount;
            }

            // Set guest counts
            adultCountInput.value = adultCount;
            childCountInput.value = childCount;

            // Update guest fields
            updateGuestFields();

            // Pre-fill guest names
            if (submission.adultGuests && submission.adultGuests.length > 0) {
                const adultInputs = adultGuestsContainer.querySelectorAll('input');
                submission.adultGuests.forEach((name, index) => {
                    if (adultInputs[index]) {
                        adultInputs[index].value = name;
                    }
                });
            } else if (submission.additionalGuests && submission.additionalGuests.length > 0) {
                // For backward compatibility
                const adultInputs = adultGuestsContainer.querySelectorAll('input');
                submission.additionalGuests.forEach((name, index) => {
                    if (adultInputs[index + 1]) { // +1 to skip the first input (self)
                        adultInputs[index + 1].value = name;
                    }
                });
            }

            if (submission.childGuests && submission.childGuests.length > 0) {
                const childInputs = childGuestsContainer.querySelectorAll('input');
                submission.childGuests.forEach((name, index) => {
                    if (childInputs[index]) {
                        childInputs[index].value = name;
                    }
                });
            }
        } else {
            attendingNo.checked = true;
        }

        // Trigger change event to update form visibility
        const event = new Event('change');
        if (attendingYes.checked) {
            attendingYes.dispatchEvent(event);
        } else {
            attendingNo.dispatchEvent(event);
        }
    }

    // Update guest fields based on adult and child counts
    function updateGuestFields() {
        const adultCount = parseInt(adultCountInput.value) || 1;
        const childCount = parseInt(childCountInput.value) || 0;

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

        // Show/hide child section based on child count
        childGuestSection.style.display = childCount > 0 ? 'block' : 'none';
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

            if (guest.name && guest.name.toLowerCase().includes(searchTermLower)) {
                results.push(guest);
            }
        });

        return results;
    } catch (error) {
        console.error('Error searching guests:', error);
        return [];
    }
}
