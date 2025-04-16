// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Function to clear error messages
    function clearErrorMessage() {
        const errorMessageElement = document.getElementById('errorMessage');
        if (errorMessageElement) {
            errorMessageElement.style.display = 'none';
            errorMessageElement.innerHTML = '';
        }
    }

    // Function to show error messages
    function showErrorMessage(title, details, canRetry = false) {
        const errorMessageElement = document.getElementById('errorMessage');
        if (!errorMessageElement) return;

        // Clear any existing error first
        clearErrorMessage();

        // Create error message content
        let errorHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <div class="error-content">
                <div class="error-title">${title}</div>
                <div class="error-details">${details}</div>
        `;

        // Add retry button if applicable
        if (canRetry) {
            errorHTML += `<button type="button" class="retry-button" id="retrySubmission">
                <i class="fas fa-redo"></i> Try Again
            </button>`;
        }

        errorHTML += `</div>`;

        // Set error message content
        errorMessageElement.innerHTML = errorHTML;

        // Show error message with animation
        errorMessageElement.style.display = 'flex';
        errorMessageElement.style.animation = 'none';
        setTimeout(() => {
            errorMessageElement.style.animation = 'fadeIn 0.3s ease';
        }, 10);

        // Scroll to error message
        errorMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Add event listener to retry button if it exists
        const retryButton = document.getElementById('retrySubmission');
        if (retryButton) {
            retryButton.addEventListener('click', function() {
                // Hide error message
                errorMessageElement.style.display = 'none';

                // Re-enable submit button if it was disabled
                const submitButton = document.querySelector('#rsvpForm button[type="submit"]');
                if (submitButton) {
                    submitButton.disabled = false;
                }
            });
        }
    }
    // Initialize Firebase and handle errors
    let db;
    try {
        // Check if Firebase is initialized
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK not loaded');
        }

        // Initialize Firestore
        db = firebase.firestore();

        // Test connection using guestList collection which allows public read access
        db.collection('guestList').limit(1).get()
            .then(() => {
                console.log('Firebase connection test successful');
                // Clear any connection error messages if they exist
                clearErrorMessage();
            })
            .catch(error => {
                console.error('Firebase connection test failed:', error);
                // Only show error if it's not a permission error
                if (error.code !== 'permission-denied') {
                    showErrorMessage(
                        'Database Connection Issue',
                        'We\'re having trouble connecting to our database. This might be due to network issues or a configuration problem. Please try again in a few moments.',
                        true
                    );
                }
            });
    } catch (error) {
        console.error('Firebase initialization error:', error);
        // Show error on page load
        setTimeout(() => {
            showErrorMessage(
                'System Error',
                'There was a problem initializing the RSVP system. Please refresh the page or try again later.',
                true
            );
        }, 1000);
    }

    // Handle RSVP form submission
    const rsvpForm = document.getElementById('rsvpForm');
    const formConfirmation = document.getElementById('formConfirmation');
    // No longer using reset button
    const guestCountGroup = document.getElementById('guestCountGroup');

    // Show/hide guest count based on attendance
    if (rsvpForm) {
        const attendingRadios = rsvpForm.querySelectorAll('input[name="attending"]');
        const additionalGuestsContainer = document.getElementById('additionalGuestsContainer');
        const guestCountInput = document.getElementById('guestCount');

        // Function to update additional guest name fields
        function updateGuestFields() {
            const guestCount = parseInt(guestCountInput.value) || 1;
            additionalGuestsContainer.innerHTML = '';

            // Only add additional guest fields if count > 1
            if (guestCount > 1) {
                // Add a heading for additional guests
                const heading = document.createElement('h3');
                heading.textContent = 'Additional Guest Names';
                heading.style.marginTop = '20px';
                heading.style.marginBottom = '10px';
                additionalGuestsContainer.appendChild(heading);

                // Add name fields for additional guests (excluding the primary guest)
                for (let i = 2; i <= guestCount; i++) {
                    const guestFieldDiv = document.createElement('div');
                    guestFieldDiv.className = 'form-group';

                    const label = document.createElement('label');
                    label.setAttribute('for', `guestName${i}`);
                    label.textContent = `Guest ${i} Name:`;

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.id = `guestName${i}`;
                    input.name = `guestName${i}`;
                    input.required = true;

                    guestFieldDiv.appendChild(label);
                    guestFieldDiv.appendChild(input);
                    additionalGuestsContainer.appendChild(guestFieldDiv);
                }
            }
        }

        // Listen for changes to guest count
        guestCountInput.addEventListener('change', updateGuestFields);
        guestCountInput.addEventListener('input', updateGuestFields);

        // Show/hide guest count based on attendance
        attendingRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'yes') {
                    guestCountGroup.style.display = 'block';
                    updateGuestFields(); // Update guest fields when showing the section
                } else {
                    guestCountGroup.style.display = 'none';
                    additionalGuestsContainer.innerHTML = ''; // Clear additional guest fields
                }
            });
        });

        // Initialize guest fields on page load
        updateGuestFields();

        // Handle form submission (for Firebase)
        rsvpForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const form = this;
            const submitButton = form.querySelector('button[type="submit"]');

            // Clear any previous error messages
            clearErrorMessage();

            // Store original button text
            const originalButtonText = submitButton.innerHTML;

            // Change button text to show it's submitting
            submitButton.innerHTML = 'Submitting...';
            submitButton.disabled = true;

            // Collect form data
            const formData = {
                name: form.name.value,
                email: form.email.value,
                phone: form.phone.value,
                attending: form.attending.value,
                guestCount: parseInt(form.guestCount.value) || 1,
                additionalGuests: [],
                submittedAt: firebase.firestore.Timestamp.fromDate(new Date())
            };

            // Collect additional guest names if any
            if (formData.guestCount > 1) {
                for (let i = 2; i <= formData.guestCount; i++) {
                    const guestNameField = form[`guestName${i}`];
                    if (guestNameField) {
                        formData.additionalGuests.push(guestNameField.value);
                    }
                }
            }

            // Check if Firestore is available
            if (!db) {
                console.error('Firestore database is not available');
                showErrorMessage('Database Connection Error', 'The database connection is not available. This might be due to network issues or Firebase configuration problems.', true);
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
                return;
            }

            // Check if this is an update or a new submission
            const isUpdate = window.selectedGuest && window.selectedGuest.hasResponded;
            let savePromise;

            // Add response data to the guest list as well
            const updateGuestList = (name) => {
                try {
                    // Find the guest in the guest list and update their response
                    return db.collection('guestList')
                        .where('name', '==', name)
                        .get()
                        .then(snapshot => {
                            if (!snapshot.empty) {
                                // Update the guest's response
                                return snapshot.docs[0].ref.update({
                                    hasResponded: true,
                                    response: formData.attending === 'yes' ? 'attending' : 'declined',
                                    actualGuestCount: formData.guestCount || 1,
                                    additionalGuests: formData.additionalGuests || [],
                                    email: formData.email,
                                    phone: formData.phone || '',
                                    submittedAt: formData.submittedAt
                                });
                            }
                            return Promise.resolve();
                        })
                        .catch(error => {
                            // Log but don't fail the whole submission if guest list update fails
                            console.warn('Failed to update guest list, but RSVP was saved:', error);
                            return Promise.resolve();
                        });
                } catch (error) {
                    console.warn('Error in updateGuestList:', error);
                    return Promise.resolve();
                }
            };

            if (isUpdate) {
                // Update existing RSVP
                console.log('Updating existing RSVP for:', formData.name);
                savePromise = db.collection('sheetRsvps')
                    .where('name', '==', formData.name)
                    .get()
                    .then(snapshot => {
                        if (!snapshot.empty) {
                            // Update the first matching document
                            console.log('Found existing document, updating...');
                            return snapshot.docs[0].ref.update(formData);
                        } else {
                            // If no matching document found, create a new one
                            console.warn('Update requested but no matching document found. Creating new document instead.');
                            return db.collection('sheetRsvps').add(formData);
                        }
                    })
                    .catch(error => {
                        console.error('Error during RSVP update query:', error);
                        // Re-throw to be caught by the main catch handler
                        throw new Error(`Failed to update RSVP: ${error.message}`);
                    });
            } else {
                // Create new RSVP
                console.log('Creating new RSVP for:', formData.name);
                savePromise = db.collection('sheetRsvps').add(formData)
                    .catch(error => {
                        console.error('Error creating new RSVP:', error);
                        // Add more context to the error
                        if (error.code === 'permission-denied') {
                            throw new Error('You don\'t have permission to submit this form. Please contact the event organizer.');
                        } else {
                            throw new Error(`Failed to create RSVP: ${error.message}`);
                        }
                    });
            }

            savePromise.then(() => {
                    // Also update the guest list entry
                    return updateGuestList(formData.name);
                })
                .then(() => {
                    // Show success confirmation with animation
                    form.style.opacity = '1';
                    form.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    form.style.transform = 'translateY(0)';

                    // Fade out the form
                    setTimeout(() => {
                        form.style.opacity = '0';
                        form.style.transform = 'translateY(-20px)';
                    }, 100);

                    // Hide form and show confirmation
                    setTimeout(() => {
                        form.style.display = 'none';

                        // Prepare confirmation animation
                        formConfirmation.classList.remove('hidden');
                        formConfirmation.style.opacity = '0';
                        formConfirmation.style.transform = 'translateY(20px)';

                        // Update confirmation message based on whether it was an update or new submission
                        const confirmationMessage = document.getElementById('confirmation-message');
                        if (confirmationMessage) {
                            if (isUpdate) {
                                confirmationMessage.textContent = 'Your RSVP has been updated successfully. Thank you for keeping us informed!';
                            } else {
                                confirmationMessage.textContent = 'Your RSVP has been received. We look forward to celebrating with you!';
                            }
                        }

                        // Animate confirmation in
                        setTimeout(() => {
                            formConfirmation.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                            formConfirmation.style.opacity = '1';
                            formConfirmation.style.transform = 'translateY(0)';
                            formConfirmation.scrollIntoView({ behavior: 'smooth' });
                        }, 50);
                    }, 600);

                    // Track successful submission with analytics if available
                    if (window.analytics) {
                        window.analytics.logEvent('rsvp_submitted', {
                            attending: formData.attending,
                            guest_count: formData.guestCount
                        });
                    }

                    // Reset form
                    form.reset();
                })
                .catch(error => {
                    // Log detailed error information
                    console.error('RSVP Submission Error:', error);

                    // Determine error type and show appropriate message
                    let errorTitle = 'Submission Error';
                    let errorDetails;
                    let canRetry = true;

                    if (error.code) {
                        // Firebase specific errors
                        switch(error.code) {
                            case 'permission-denied':
                                errorTitle = 'Permission Error';
                                errorDetails = 'You don\'t have permission to submit this form. Please contact the event organizer.';
                                canRetry = false;
                                break;
                            case 'unavailable':
                                errorTitle = 'Service Unavailable';
                                errorDetails = 'The service is currently unavailable. This might be due to network issues or high traffic.';
                                break;
                            case 'not-found':
                                errorTitle = 'Resource Not Found';
                                errorDetails = 'The requested resource was not found. Please refresh the page and try again.';
                                break;
                            case 'resource-exhausted':
                                errorTitle = 'Service Overloaded';
                                errorDetails = 'Our service is currently experiencing high traffic. Please try again in a few minutes.';
                                break;
                            case 'deadline-exceeded':
                                errorTitle = 'Request Timeout';
                                errorDetails = 'The request took too long to complete. This might be due to network issues.';
                                break;
                            default:
                                errorTitle = 'Firebase Error';
                                errorDetails = `Error code: ${error.code}. ${error.message || 'Please try again or contact support if the issue persists.'}`;
                        }
                    } else if (error.name === 'TypeError') {
                        errorTitle = 'Type Error';
                        errorDetails = 'There was a problem with the data format. This might be a bug in our system.';
                    } else if (error.name === 'NetworkError' || error.message && error.message.includes('network')) {
                        errorTitle = 'Network Error';
                        errorDetails = 'There was a problem with your internet connection. Please check your connection and try again.';
                    } else {
                        // Generic error with more details
                        errorDetails = `${error.message || 'Unknown error occurred'}. Please try again or contact support if the issue persists.`;
                    }

                    // Show error message to user
                    showErrorMessage(errorTitle, errorDetails, canRetry);
                })
                .finally(() => {
                    submitButton.innerHTML = originalButtonText;
                    submitButton.disabled = false;
                });
        });
    }

    // Reset form functionality removed

    // Add active class to current nav link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('nav a');

    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
});
