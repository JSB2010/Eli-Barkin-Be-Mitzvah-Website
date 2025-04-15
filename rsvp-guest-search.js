// RSVP Guest Search Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase if needed
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded');
        return;
    }

    // Get DOM elements
    const nameInput = document.getElementById('name');
    const autocompleteResults = document.getElementById('autocompleteResults');
    const additionalFields = document.getElementById('additionalFields');
    const submitButtonContainer = document.getElementById('submitButtonContainer');
    const guestFoundInfo = document.getElementById('guestFoundInfo');
    const guestCategoryElement = document.getElementById('guestCategory');
    const guestMaxCountElement = document.getElementById('guestMaxCount');
    const guestCountInput = document.getElementById('guestCount');

    // Variables to store selected guest data
    let selectedGuest = null;

    // Function to handle name input
    async function handleNameInput() {
        const searchTerm = nameInput.value.trim();

        // Clear previous results
        autocompleteResults.innerHTML = '';

        // Hide additional fields if search term is empty
        if (searchTerm.length < 2) {
            autocompleteResults.style.display = 'none';
            return;
        }

        try {
            // Search for guests
            const results = await searchGuests(searchTerm);

            if (results.length > 0) {
                // Display results
                results.forEach(guest => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'autocomplete-item';
                    resultItem.textContent = guest.name;
                    resultItem.addEventListener('click', () => selectGuest(guest));
                    autocompleteResults.appendChild(resultItem);
                });

                autocompleteResults.style.display = 'block';
            } else {
                autocompleteResults.style.display = 'none';
            }
        } catch (error) {
            console.error('Error searching guests:', error);
        }
    }

    // Function to select a guest
    function selectGuest(guest) {
        selectedGuest = guest;
        nameInput.value = guest.name;
        autocompleteResults.style.display = 'none';

        // Update guest info display
        guestCategoryElement.textContent = guest.category ? `Category: ${guest.category}` : '';
        guestMaxCountElement.textContent = `You can add as many guests as needed`;

        // Show guest found info with animation
        guestFoundInfo.style.opacity = '0';
        guestFoundInfo.style.display = 'block';
        setTimeout(() => {
            guestFoundInfo.style.transition = 'opacity 0.5s ease';
            guestFoundInfo.style.opacity = '1';
        }, 10);

        // Remove max value restriction for guest count
        guestCountInput.removeAttribute('max');

        // Prepare additional fields for animation
        additionalFields.style.opacity = '0';
        additionalFields.style.display = 'block';
        additionalFields.style.maxHeight = '0';
        additionalFields.style.overflow = 'hidden';

        // Animate additional fields
        setTimeout(() => {
            additionalFields.style.transition = 'opacity 0.5s ease, max-height 0.8s ease';
            additionalFields.style.opacity = '1';
            additionalFields.style.maxHeight = '2000px'; // Large enough to contain all content
        }, 100);

        // Show submit button with animation
        submitButtonContainer.style.opacity = '0';
        submitButtonContainer.style.display = 'block';
        setTimeout(() => {
            submitButtonContainer.style.transition = 'opacity 0.5s ease';
            submitButtonContainer.style.opacity = '1';
        }, 500);

        // Pre-fill email and phone if available
        if (guest.email) document.getElementById('email').value = guest.email;
        if (guest.phone) document.getElementById('phone').value = guest.phone;

        // Scroll to the form
        setTimeout(() => {
            additionalFields.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }

    // Add event listeners
    if (nameInput) {
        nameInput.addEventListener('input', handleNameInput);
        nameInput.addEventListener('focus', handleNameInput);
    }

    // Handle form submission to update guest data
    const rsvpForm = document.getElementById('rsvpForm');
    if (rsvpForm) {
        rsvpForm.addEventListener('submit', async function(e) {
            // Don't prevent default here, as firebase-rsvp.js will handle that

            // If we have a selected guest, update their record
            if (selectedGuest && selectedGuest.id) {
                try {
                    const db = firebase.firestore();
                    const guestRef = db.collection('guestList').doc(selectedGuest.id);

                    // Get form data
                    const attending = document.querySelector('input[name="attending"]:checked').value === 'yes';
                    const guestCount = parseInt(document.getElementById('guestCount').value) || 1;
                    const email = document.getElementById('email').value;
                    const phone = document.getElementById('phone').value;

                    // Collect additional guest names
                    const additionalGuests = [];
                    if (guestCount > 1) {
                        for (let i = 2; i <= guestCount; i++) {
                            const guestNameField = document.getElementById(`guestName${i}`);
                            if (guestNameField) {
                                additionalGuests.push(guestNameField.value);
                            }
                        }
                    }

                    // Update guest record
                    await guestRef.update({
                        hasResponded: true,
                        response: attending ? 'attending' : 'declined',
                        actualGuestCount: attending ? guestCount : 0,
                        additionalGuests: additionalGuests,
                        email: email,
                        phone: phone,
                        submittedAt: firebase.firestore.Timestamp.fromDate(new Date())
                    });

                    console.log('Guest record updated successfully');
                } catch (error) {
                    console.error('Error updating guest record:', error);
                }
            }
        });
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
