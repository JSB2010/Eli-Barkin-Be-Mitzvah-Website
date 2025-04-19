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
    // These elements are accessed directly in the event handlers

    // Show/hide guest count based on attendance
    if (rsvpForm) {
        // Note: The guest fields are now handled by rsvp-guest-search.js

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
                submittedAt: firebase.firestore.Timestamp.fromDate(new Date())
            };

            // Check if attending
            if (formData.attending === 'yes') {
                // Get adult and child counts
                const adultCount = parseInt(form.adultCount?.value) || 1;
                const childCount = parseInt(form.childCount?.value) || 0;

                // Set total guest count
                formData.guestCount = adultCount + childCount;
                formData.adultCount = adultCount;
                formData.childCount = childCount;

                // Collect adult guest names
                formData.adultGuests = [];
                for (let i = 1; i <= adultCount; i++) {
                    const adultNameField = form[`adultName${i}`];
                    if (adultNameField) {
                        formData.adultGuests.push(adultNameField.value);
                    }
                }

                // Collect child guest names
                formData.childGuests = [];
                for (let i = 1; i <= childCount; i++) {
                    const childNameField = form[`childName${i}`];
                    if (childNameField) {
                        formData.childGuests.push(childNameField.value);
                    }
                }

                // For backward compatibility
                formData.additionalGuests = [];
                if (adultCount > 1) {
                    // Skip the first adult (primary guest)
                    for (let i = 1; i < formData.adultGuests.length; i++) {
                        formData.additionalGuests.push(formData.adultGuests[i]);
                    }
                }
                // Add all children to additional guests
                formData.additionalGuests = formData.additionalGuests.concat(formData.childGuests);
            } else {
                // Not attending
                formData.guestCount = 0;
                formData.adultCount = 0;
                formData.childCount = 0;
                formData.adultGuests = [];
                formData.childGuests = [];
                formData.additionalGuests = [];
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
            // We now consider it an update if there's an existing submission in the database
            // rather than relying on the hasResponded flag
            const isUpdate = window.existingSubmission !== null;
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
                                    actualGuestCount: formData.guestCount || 0,
                                    adultCount: formData.adultCount || 0,
                                    childCount: formData.childCount || 0,
                                    adultGuests: formData.adultGuests || [],
                                    childGuests: formData.childGuests || [],
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

            // Completely rewritten update logic for maximum reliability
            if (isUpdate) {
                // Update existing RSVP
                console.log('Updating existing RSVP for:', formData.name);
                console.log('Existing submission object:', window.existingSubmission);

                // Direct update with document ID is the most reliable method
                if (window.existingSubmission?.id) {
                    const docId = window.existingSubmission.id;
                    console.log('Using direct document ID update method with ID:', docId);

                    // Add the ID to the form data for logging purposes
                    formData.documentId = docId;

                    // Use a direct document reference for the update
                    const docRef = db.collection('sheetRsvps').doc(docId);

                    // First verify the document exists
                    savePromise = docRef.get()
                        .then(docSnapshot => {
                            if (docSnapshot.exists) {
                                console.log('Document exists, performing update on ID:', docId);
                                // Document exists, perform the update
                                return docRef.update(formData);
                            } else {
                                console.warn('Document with ID does not exist, creating new document');
                                // Document doesn't exist, create a new one
                                return db.collection('sheetRsvps').add(formData);
                            }
                        })
                        .catch(error => {
                            console.error('Error during direct document update:', error);
                            // Try the fallback method
                            return findAndUpdateDocument();
                        });
                } else {
                    console.warn('No document ID available, using search and update method');
                    savePromise = findAndUpdateDocument();
                }

                // Helper function to find and update a document
                function findAndUpdateDocument() {
                    console.log('Searching for existing document with name:', formData.name);

                    return new Promise((resolve, reject) => {
                        // First try an exact match query
                        db.collection('sheetRsvps')
                            .where('name', '==', formData.name)
                            .get()
                            .then(snapshot => {
                                if (!snapshot.empty) {
                                    // Found an exact match
                                    const doc = snapshot.docs[0];
                                    console.log('Found exact match document, updating ID:', doc.id);
                                    return doc.ref.update(formData)
                                        .then(() => resolve())
                                        .catch(reject);
                                } else {
                                    // No exact match, try case-insensitive search
                                    console.log('No exact match, trying case-insensitive search');
                                    return db.collection('sheetRsvps').get();
                                }
                            })
                            .then(snapshot => {
                                // If we already resolved, this will be undefined
                                if (!snapshot) return;

                                // Look for case-insensitive match
                                let matchFound = false;

                                snapshot.forEach(doc => {
                                    const data = doc.data();
                                    if (data.name?.toLowerCase() === formData.name.toLowerCase()) {
                                        if (!matchFound) { // Only update the first match
                                            matchFound = true;
                                            console.log('Found case-insensitive match, updating ID:', doc.id);
                                            doc.ref.update(formData)
                                                .then(() => resolve())
                                                .catch(reject);
                                        }
                                    }
                                });

                                // If no match was found, create a new document
                                if (!matchFound) {
                                    console.log('No matching document found, creating new document');
                                    db.collection('sheetRsvps').add(formData)
                                        .then(() => resolve())
                                        .catch(reject);
                                }
                            })
                            .catch(error => {
                                console.error('Error in find and update process:', error);
                                reject(new Error(`Error in find and update process: ${error.message}`));
                            });
                    });
                }
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
                    // Save the guest name in a cookie for future visits
                    // Set cookie to expire in 1 year
                    const expiryDate = new Date();
                    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                    document.cookie = `lastRsvpName=${encodeURIComponent(formData.name)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;

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
                            guest_count: formData.guestCount,
                            is_update: isUpdate
                        });
                    }

                    // Reset form and global state
                    form.reset();
                    window.selectedGuest = null;
                    window.existingSubmission = null;
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
                    } else if (error.name === 'NetworkError' || error.message?.includes('network')) {
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
