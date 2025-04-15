// RSVP Guest Search Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Debug functionality
    const debugButton = document.getElementById('debugButton');
    const debugOutput = document.getElementById('debugOutput');

    if (debugButton && debugOutput) {
        debugButton.addEventListener('click', async function() {
            debugOutput.style.display = 'block';
            debugOutput.textContent = 'Checking guestList collection...';

            try {
                // Check if Firebase is initialized
                if (typeof firebase === 'undefined') {
                    debugOutput.textContent = 'Error: Firebase SDK not found';
                    return;
                }

                // Get Firestore instance
                const db = firebase.firestore();

                // Get the guestList collection
                const snapshot = await db.collection('guestList').get();

                if (snapshot.empty) {
                    debugOutput.textContent = 'No documents found in guestList collection';
                    return;
                }

                let result = `Found ${snapshot.size} documents in guestList collection:\n\n`;

                // Show the first 5 documents
                let count = 0;
                snapshot.forEach(doc => {
                    if (count < 5) {
                        const data = doc.data();
                        result += `Document ID: ${doc.id}\n`;
                        result += `Name: ${data.name || 'N/A'}\n`;
                        result += `Email: ${data.email || 'N/A'}\n`;
                        result += `Phone: ${data.phone || 'N/A'}\n`;
                        result += `Has Responded: ${data.hasResponded ? 'Yes' : 'No'}\n`;
                        result += `\n----------------------------\n\n`;
                        count++;
                    }
                });

                if (snapshot.size > 5) {
                    result += `... and ${snapshot.size - 5} more documents`;
                }

                debugOutput.textContent = result;
            } catch (error) {
                debugOutput.textContent = `Error: ${error.message}`;
                console.error('Error checking guestList collection:', error);
            }
        });
    }
    // Elements
    const nameInput = document.getElementById('name');
    const autocompleteResults = document.getElementById('autocompleteResults');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const guestCountInput = document.getElementById('guestCount');
    const guestFoundInfo = document.getElementById('guestFoundInfo');
    const guestCategoryElement = document.getElementById('guestCategory');
    const guestMaxCountElement = document.getElementById('guestMaxCount');

    // State
    let selectedGuest = null;
    let searchResults = [];
    let selectedIndex = -1;

    // Check if Firebase and guest list collection are available
    if (!window.guestListCollection) {
        console.warn('Guest list collection not available. Guest search functionality disabled.');
        return;
    }

    // Add event listeners for name input
    nameInput.addEventListener('input', debounce(handleNameInput, 300));
    nameInput.addEventListener('keydown', handleKeyNavigation);
    nameInput.addEventListener('blur', function() {
        // Delay hiding results to allow for clicks
        setTimeout(() => {
            autocompleteResults.style.display = 'none';
        }, 200);
    });

    // Handle name input changes
    async function handleNameInput() {
        const name = nameInput.value.trim();

        if (name.length < 2) {
            autocompleteResults.style.display = 'none';
            return;
        }

        try {
            // Search for guests matching the name
            searchResults = await window.searchGuest(name);

            // Display results
            if (searchResults.length > 0) {
                displayAutocompleteResults(searchResults);
            } else {
                autocompleteResults.style.display = 'none';
            }
        } catch (error) {
            console.error('Error searching for guests:', error);
            autocompleteResults.style.display = 'none';
        }
    }

    // Display autocomplete results
    function displayAutocompleteResults(results) {
        // Clear previous results
        autocompleteResults.innerHTML = '';
        selectedIndex = -1;

        // Create result items
        results.forEach((guest, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = guest.name;
            item.dataset.index = index;

            item.addEventListener('click', () => {
                selectGuest(guest);
                autocompleteResults.style.display = 'none';
            });

            autocompleteResults.appendChild(item);
        });

        // Show results
        autocompleteResults.style.display = 'block';
    }

    // Handle keyboard navigation
    function handleKeyNavigation(e) {
        if (!searchResults.length || autocompleteResults.style.display === 'none') {
            return;
        }

        const items = autocompleteResults.querySelectorAll('.autocomplete-item');

        // Down arrow
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelectedItem(items);
        }
        // Up arrow
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateSelectedItem(items);
        }
        // Enter key
        else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            selectGuest(searchResults[selectedIndex]);
            autocompleteResults.style.display = 'none';
        }
        // Escape key
        else if (e.key === 'Escape') {
            e.preventDefault();
            autocompleteResults.style.display = 'none';
        }
    }

    // Update the selected item in the dropdown
    function updateSelectedItem(items) {
        // Remove selected class from all items
        items.forEach(item => item.classList.remove('selected'));

        // Add selected class to current item
        if (selectedIndex >= 0) {
            items[selectedIndex].classList.add('selected');
            // Scroll to keep selected item in view if needed
            items[selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    // Select a guest and fill in their information
    function selectGuest(guest) {
        selectedGuest = guest;

        // Fill in the form with guest information
        nameInput.value = guest.name;

        if (guest.email) {
            emailInput.value = guest.email;
        }

        if (guest.phone) {
            phoneInput.value = guest.phone;
        }

        // Set max guest count
        if (guest.maxAllowedGuests) {
            guestCountInput.max = guest.maxAllowedGuests;

            // If current value exceeds max, adjust it
            if (parseInt(guestCountInput.value) > guest.maxAllowedGuests) {
                guestCountInput.value = guest.maxAllowedGuests;

                // Trigger the change event to update additional guest fields
                const event = new Event('change');
                guestCountInput.dispatchEvent(event);
            }
        }

        // Show guest information
        guestFoundInfo.style.display = 'block';
        guestCategoryElement.textContent = `Category: ${guest.category || 'General'}`;
        guestMaxCountElement.textContent = `Maximum Guests: ${guest.maxAllowedGuests || 1}`;

        // Show additional fields and submit button with smooth transition
        const additionalFields = document.getElementById('additionalFields');
        const submitButtonContainer = document.getElementById('submitButtonContainer');

        // Add transition styles
        additionalFields.style.transition = 'opacity 0.5s, max-height 0.5s';
        additionalFields.style.opacity = '0';
        additionalFields.style.maxHeight = '0';
        additionalFields.style.overflow = 'hidden';

        // Show the elements
        additionalFields.style.display = 'block';

        // Trigger reflow
        void additionalFields.offsetWidth;

        // Apply transitions
        additionalFields.style.opacity = '1';
        additionalFields.style.maxHeight = '2000px'; // A large value to accommodate all content

        // Show submit button after a slight delay
        setTimeout(() => {
            submitButtonContainer.style.transition = 'opacity 0.5s';
            submitButtonContainer.style.opacity = '0';
            submitButtonContainer.style.display = 'block';

            // Trigger reflow
            void submitButtonContainer.offsetWidth;

            // Apply transition
            submitButtonContainer.style.opacity = '1';
        }, 300);

        // If the guest has already responded, show a message
        if (guest.hasResponded) {
            const responseDate = guest.submittedAt ? new Date(guest.submittedAt.seconds * 1000).toLocaleDateString() : 'previously';

            // Add a message to the guest info box
            const responseMessage = document.createElement('p');
            responseMessage.innerHTML = `<strong>Note:</strong> You've already responded ${responseDate}. Your previous response will be updated.`;
            responseMessage.style.color = '#e67e22';
            guestFoundInfo.appendChild(responseMessage);

            // Pre-fill the attending radio buttons
            if (guest.response === 'yes') {
                document.getElementById('attendingYes').checked = true;
                document.getElementById('guestCountGroup').style.display = 'block';

                // Set guest count if available
                if (guest.actualGuestCount) {
                    guestCountInput.value = guest.actualGuestCount;

                    // Trigger the change event to update additional guest fields
                    const event = new Event('change');
                    guestCountInput.dispatchEvent(event);

                    // Pre-fill additional guest names if available
                    if (guest.additionalGuests && guest.additionalGuests.length > 0) {
                        setTimeout(() => {
                            const guestInputs = document.querySelectorAll('[id^="guestName"]');
                            guest.additionalGuests.forEach((name, index) => {
                                if (guestInputs[index]) {
                                    guestInputs[index].value = name;
                                }
                            });
                        }, 100);
                    }
                }
            } else if (guest.response === 'no') {
                document.getElementById('attendingNo').checked = true;
                document.getElementById('guestCountGroup').style.display = 'none';
            }
        }
    }

    // Modify the form submission to update the guest record
    const rsvpForm = document.getElementById('rsvpForm');
    if (rsvpForm) {
        // Store the original submit handler
        const originalSubmitHandler = rsvpForm.onsubmit;

        // Override the submit handler
        rsvpForm.onsubmit = async function(e) {
            e.preventDefault();

            // Get form data
            const formData = {
                name: rsvpForm.name.value,
                email: rsvpForm.email.value,
                phone: rsvpForm.phone.value,
                attending: rsvpForm.attending.value,
                guestCount: parseInt(rsvpForm.guestCount.value) || 1,
                additionalGuests: [],
                submittedAt: firebase.firestore.Timestamp.fromDate(new Date())
            };

            // Collect additional guest names if any
            if (formData.guestCount > 1) {
                for (let i = 2; i <= formData.guestCount; i++) {
                    const guestNameField = rsvpForm[`guestName${i}`];
                    if (guestNameField) {
                        formData.additionalGuests.push(guestNameField.value);
                    }
                }
            }

            // If a guest was selected from the list, update their record
            if (selectedGuest) {
                try {
                    // Update the guest's RSVP status
                    await window.updateGuestRsvp(selectedGuest.id, formData);

                    // Continue with the original submission to the rsvps collection
                    // This ensures backward compatibility with the existing system
                    if (typeof originalSubmitHandler === 'function') {
                        return originalSubmitHandler.call(this, e);
                    }
                } catch (error) {
                    console.error('Error updating guest RSVP:', error);
                    alert('There was an error updating your RSVP. Please try again.');
                }
            } else {
                // No guest selected, proceed with the original submission
                if (typeof originalSubmitHandler === 'function') {
                    return originalSubmitHandler.call(this, e);
                }
            }
        };
    }

    // Utility function to debounce input events
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
});
