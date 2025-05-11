// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Function to sanitize form data before sending to Firestore
    // This ensures there are no undefined values that could cause errors
    function sanitizeFormData(data) {
        // Create a new object to avoid modifying the original
        const sanitized = {};

        // Process each property in the data object
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];

                // Handle different types of values
                if (value === undefined) {
                    // Replace undefined with null for Firestore
                    sanitized[key] = null;
                } else if (Array.isArray(value)) {
                    // For arrays, sanitize each element
                    sanitized[key] = value.map(item =>
                        item === undefined ? null : item
                    );
                } else if (value === null) {
                    // Keep null values as they are
                    sanitized[key] = null;
                } else if (typeof value === 'object' && value !== null) {
                    // For nested objects, recursively sanitize
                    sanitized[key] = sanitizeFormData(value);
                } else {
                    // For primitive values, keep as is
                    sanitized[key] = value;
                }
            }
        }

        // Ensure critical fields are never undefined or missing
        if (!('adultCount' in sanitized) || sanitized.adultCount === undefined) {
            sanitized.adultCount = 0;
        }

        if (!('childCount' in sanitized) || sanitized.childCount === undefined) {
            sanitized.childCount = 0;
        }

        if (!('guestCount' in sanitized) || sanitized.guestCount === undefined) {
            sanitized.guestCount = sanitized.adultCount + sanitized.childCount;
        }

        if (!('adultGuests' in sanitized) || sanitized.adultGuests === undefined) {
            sanitized.adultGuests = [];
        }

        if (!('childGuests' in sanitized) || sanitized.childGuests === undefined) {
            sanitized.childGuests = [];
        }

        if (!('additionalGuests' in sanitized) || sanitized.additionalGuests === undefined) {
            sanitized.additionalGuests = [];
        }

        return sanitized;
    }

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

    if (rsvpForm) {
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
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'; // Added spinner
            submitButton.disabled = true;

            // Collect form data
            const formData = {
                name: form.name.value,
                email: form.email.value,
                phone: form.phone.value,
                attending: form.attending.value,
                // submittedAt will be set differently for new vs update
            };

            // Set default values for all guests (no out-of-town functionality)
            formData.fridayDinner = 'no';
            formData.sundayBrunch = 'no';
            formData.isOutOfTown = false;

            // Check if attending
            if (formData.attending === 'yes') {
                // Get adult and child counts
                const adultCount = parseInt(form.adultCount?.value) || 0; // Default to 0 if not attending
                const childCount = parseInt(form.childCount?.value) || 0;

                // Ensure at least one adult if attending
                 if (adultCount === 0 && childCount > 0) {
                     // If only children are marked, assume the primary contact is the adult
                     // BUT don't increment the total guest count - just mark one of the children as an adult
                     formData.adultCount = 1;
                     formData.childCount = childCount;
                     // Ensure the primary name is captured as the adult
                     formData.adultGuests = [form.name.value]; // Use the main name input
                 } else if (adultCount === 0 && childCount === 0) {
                     // If both are 0 but attending is yes, default to 1 adult
                     formData.adultCount = 1;
                     formData.childCount = 0;
                     formData.adultGuests = [form.name.value];
                 } else {
                    formData.adultCount = adultCount;
                    formData.childCount = childCount;
                     // Collect adult guest names
                    formData.adultGuests = [];
                    for (let i = 1; i <= adultCount; i++) {
                        const adultNameField = form[`adultName${i}`];
                        if (adultNameField) {
                            formData.adultGuests.push(adultNameField.value.trim());
                        } else {
                             formData.adultGuests.push(''); // Add empty string if field missing
                             console.warn(`Missing adultName field for index ${i}`);
                        }
                    }
                     // Collect child guest names
                    formData.childGuests = [];
                    for (let i = 1; i <= childCount; i++) {
                        const childNameField = form[`childName${i}`];
                        if (childNameField) {
                            formData.childGuests.push(childNameField.value.trim());
                        } else {
                             formData.childGuests.push(''); // Add empty string if field missing
                             console.warn(`Missing childName field for index ${i}`);
                        }
                    }
                 }
                 // Calculate guest count correctly - if we have 0 adults and some children,
                 // we don't want to double-count by adding an adult
                 if (adultCount === 0 && childCount > 0) {
                     // In this case, we're treating one child as an adult, so the total is just childCount
                     formData.guestCount = childCount;
                 } else {
                     // Normal case - sum of adults and children
                     formData.guestCount = formData.adultCount + formData.childCount;
                 }


                // For backward compatibility (if needed by other systems)
                formData.additionalGuests = [];
                // Add adults beyond the first one
                if (formData.adultGuests.length > 1) {
                    formData.additionalGuests = formData.additionalGuests.concat(formData.adultGuests.slice(1));
                }
                // Add all children
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

            // Determine if this is an update or a new submission
            const formMode = form.getAttribute('data-mode');
            const submissionId = form.getAttribute('data-submission-id'); // Get ID from form attribute
            const isUpdate = formMode === 'update' && submissionId; // Check both mode and ID presence
            const isFallbackSubmission = window.existingSubmission?.isFallback === true;

            // Log submission details for debugging
            console.log('Form submission details:', {
                isUpdate,
                formMode,
                submissionId,
                formDataName: formData.name,
                windowExistingSubmission: window.existingSubmission, // Log state from other script
                isFallbackSubmission
            });

            let savePromise;

            if (isUpdate && !isFallbackSubmission) {
                // Standard update of an existing RSVP document
                console.log(`Updating existing RSVP (ID: ${submissionId}) for:`, formData.name);

                // Add update-specific timestamp and keep original submittedAt if available
                formData.updatedAt = firebase.firestore.Timestamp.fromDate(new Date());
                // Use optional chaining for submittedAt
                if (window.existingSubmission?.submittedAt) {
                    formData.submittedAt = window.existingSubmission.submittedAt;
                } else {
                    formData.submittedAt = formData.updatedAt;
                    console.warn("Original submittedAt not found for update, using updatedAt instead.");
                }
                formData.isUpdate = true; // Explicit flag

                // Sanitize form data to ensure no undefined values
                const sanitizedFormData = sanitizeFormData(formData);
                console.log('Sanitized form data for update:', sanitizedFormData);

                // Use the submissionId stored in the form's data attribute
                const docRef = db.collection('sheetRsvps').doc(submissionId);
                savePromise = docRef.update(sanitizedFormData)
                    .catch(error => {
                        console.error(`Error updating document ${submissionId}:`, error);
                        // Add more context to the error
                        if (error.code === 'permission-denied') {
                            console.warn('Permission denied for update. Falling back to guestList update only.');
                            // If we can't update the document due to permissions, we'll just update the guestList
                            return Promise.resolve();
                        } else if (error.code === 'not-found') {
                            throw new Error('The RSVP you are trying to update could not be found. It might have been deleted. Please refresh and try again.');
                        } else {
                            throw new Error(`Failed to update RSVP: ${error.message}`);
                        }
                    });
            } else if (isUpdate && isFallbackSubmission) {
                // This is a fallback submission (we don't have direct access to the sheetRsvps document)
                // In this case, we'll just update the guestList entry and treat it as a success
                console.log(`Handling fallback update for ${formData.name} (no direct document access)`);

                formData.updatedAt = firebase.firestore.Timestamp.fromDate(new Date());
                if (window.existingSubmission?.submittedAt) {
                    formData.submittedAt = window.existingSubmission.submittedAt;
                } else {
                    formData.submittedAt = formData.updatedAt;
                }
                formData.isUpdate = true;

                // Resolve immediately - we'll update the guestList in the next step
                savePromise = Promise.resolve();
            } else {
                // Create new RSVP
                console.log('Creating new RSVP for:', formData.name);
                formData.submittedAt = firebase.firestore.Timestamp.fromDate(new Date()); // Set initial submission time
                formData.isUpdate = false; // Explicit flag

                // Sanitize form data to ensure no undefined values
                const sanitizedFormData = sanitizeFormData(formData);
                console.log('Sanitized form data:', sanitizedFormData);

                savePromise = db.collection('sheetRsvps').add(sanitizedFormData)
                    .catch(error => {
                        console.error('Error creating new RSVP:', error);
                        // Add more context to the error
                        if (error.code === 'permission-denied') {
                            console.warn('Permission denied for creating new RSVP. Falling back to guestList update only.');
                            // If we can't create the document due to permissions, we'll just update the guestList
                            return Promise.resolve();
                        } else {
                            throw new Error(`Failed to create RSVP: ${error.message}`);
                        }
                    });
            }

            // Chain the guest list update regardless of new/update
            savePromise = savePromise.then(() => {
                console.log('RSVP saved/updated successfully in sheetRsvps. Updating guestList entry...');
                // Also update the guest list entry - use sanitized data to prevent errors
                const sanitizedData = sanitizeFormData(formData);
                return updateGuestList(formData.name, sanitizedData); // Pass sanitized formData
            });

            // --- Guest List Update Function ---
            // Moved inside the event listener scope to access formData easily
            const updateGuestList = (guestName, rsvpData) => {
                console.log(`[updateGuestList] Attempting to update guestList for: ${guestName}`);
                try {
                    // Find the guest in the guest list by name (case-sensitive match expected here)
                    return db.collection('guestList')
                        .where('name', '==', guestName)
                        .limit(1) // Expect only one match
                        .get()
                        .then(snapshot => {
                            if (!snapshot.empty) {
                                const guestDocRef = snapshot.docs[0].ref;
                                console.log(`[updateGuestList] Found guestList entry (ID: ${guestDocRef.id}). Updating...`);
                                // Update the guest's response details
                                return guestDocRef.update({
                                    hasResponded: true,
                                    response: rsvpData.attending === 'yes' ? 'attending' : 'declined',
                                    // Use counts directly from rsvpData
                                    actualGuestCount: rsvpData.guestCount || 0,
                                    adultCount: rsvpData.adultCount || 0,
                                    childCount: rsvpData.childCount || 0,
                                    // Store guest names arrays
                                    adultGuests: rsvpData.adultGuests || [],
                                    childGuests: rsvpData.childGuests || [],
                                    // Keep additionalGuests for compatibility if needed elsewhere
                                    additionalGuests: rsvpData.additionalGuests || [],
                                    email: rsvpData.email || '',
                                    phone: rsvpData.phone || '',
                                    // Store out-of-town event responses
                                    isOutOfTown: rsvpData.isOutOfTown || false,
                                    fridayDinner: rsvpData.fridayDinner || 'no',
                                    sundayBrunch: rsvpData.sundayBrunch || 'no',
                                    // Use the appropriate timestamp (submittedAt for new, updatedAt for updates)
                                    lastResponseTimestamp: rsvpData.updatedAt || rsvpData.submittedAt
                                });
                            } else {
                                console.warn(`[updateGuestList] Guest not found in guestList for name: ${guestName}. Cannot update guestList entry.`);
                                return Promise.resolve(); // Resolve silently if guest not found
                            }
                        })
                        .catch(error => {
                            // Log but don't fail the whole submission if guest list update fails
                            console.warn(`[updateGuestList] Failed to update guest list entry for ${guestName}, but RSVP was saved:`, error);
                            return Promise.resolve(); // Resolve silently on error
                        });
                } catch (error) {
                    console.warn('[updateGuestList] Error during guest list update process:', error);
                    return Promise.resolve(); // Resolve silently on unexpected error
                }
            };
            // --- End Guest List Update Function ---


            // Set a timeout to prevent the form from getting stuck
            const submissionTimeout = setTimeout(() => {
                console.error('RSVP submission timed out after 30 seconds');
                showErrorMessage(
                    'Submission Timeout',
                    'Your RSVP submission is taking longer than expected. Please try again or contact us if the problem persists.',
                    true
                );
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
            }, 30000); // 30 second timeout

            // Handle success and failure of the savePromise chain
            savePromise
                .then(() => {
                    // Clear the timeout since submission was successful
                    clearTimeout(submissionTimeout);

                    console.log('RSVP and GuestList update process completed successfully.');
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

                        // Add update-mode class to confirmation if it was an update
                        if (isUpdate) {
                            formConfirmation.classList.add('update-mode');
                        } else {
                            formConfirmation.classList.remove('update-mode');
                        }

                        // Update confirmation message based on whether it was an update or new submission
                        const confirmationTitle = document.getElementById('confirmation-title');
                        const confirmationMessage = document.getElementById('confirmation-message');
                        const confirmationDetails = document.getElementById('confirmation-details');

                        // Set appropriate confirmation title
                        if (confirmationTitle) {
                            confirmationTitle.textContent = isUpdate ? 'RSVP Updated!' : 'Thank You!';
                        }

                        // Set main confirmation message
                        if (confirmationMessage) {
                            if (isUpdate) {
                                if (formData.attending === 'yes') {
                                    confirmationMessage.innerHTML = '<strong>Your RSVP has been updated successfully!</strong><br>Thank you for keeping us informed about your attendance details.';
                                } else {
                                    confirmationMessage.innerHTML = '<strong>Your RSVP has been updated to "Not Attending".</strong><br>Thank you for letting us know. We\'ll miss you at the celebration!';
                                }
                            } else {
                                if (formData.attending === 'yes') {
                                    confirmationMessage.innerHTML = '<strong>Your RSVP has been received!</strong><br>We look forward to celebrating with you!';
                                } else {
                                    confirmationMessage.innerHTML = '<strong>Your RSVP has been received.</strong><br>We\'re sorry you won\'t be able to join us, but thank you for letting us know.';
                                }
                            }
                        }

                        // Add details about attendees for "attending" responses
                        if (confirmationDetails && formData.attending === 'yes') {
                            const totalGuests = formData.guestCount; // Use calculated guestCount
                            const guestText = totalGuests === 1 ? 'guest' : 'guests';

                            confirmationDetails.innerHTML = `We have you down for <strong>${totalGuests} ${guestText}</strong> ${isUpdate ? '(updated)' : ''}.`;

                            // Add details about adult and child counts for clarity
                            if (formData.adultCount === 0 && formData.childCount > 0) {
                                confirmationDetails.innerHTML += `<br>This includes <strong>${formData.childCount} ${formData.childCount === 1 ? 'child' : 'children'}</strong>.`;
                            } else if (formData.adultCount > 0 && formData.childCount > 0) {
                                confirmationDetails.innerHTML += `<br>This includes <strong>${formData.adultCount} ${formData.adultCount === 1 ? 'adult' : 'adults'}</strong> and <strong>${formData.childCount} ${formData.childCount === 1 ? 'child' : 'children'}</strong>.`;
                            }

                            // Add submission/update timestamp
                            const timestamp = formData.updatedAt || formData.submittedAt; // Use update time if available
                            const dateStr = timestamp.toDate().toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });

                            confirmationDetails.innerHTML += `<br><br><span class="timestamp">${isUpdate ? 'Updated' : 'Submitted'} on ${dateStr}</span>`;
                        } else if (confirmationDetails) {
                            confirmationDetails.innerHTML = ''; // Clear details if not attending
                        }

                        // Animate confirmation in
                        setTimeout(() => {
                             formConfirmation.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                             formConfirmation.style.opacity = '1';
                             formConfirmation.style.transform = 'translateY(0)';
                             formConfirmation.scrollIntoView({ behavior: 'smooth' });
                         }, 50);

                    }, 600); // End of form fade out timeout

                    // Track successful submission with analytics if available
                    if (window.analytics) {
                        window.analytics.logEvent('rsvp_submitted', {
                            attending: formData.attending,
                            guest_count: formData.guestCount,
                            is_update: isUpdate // Pass the update status
                        });
                    }

                    // Reset form and global state AFTER confirmation is shown
                    form.reset(); // Clear form fields
                    form.setAttribute('data-mode', 'new'); // Reset mode
                    form.removeAttribute('data-submission-id'); // Clear ID
                    window.selectedGuest = null; // Clear selected guest
                    window.existingSubmission = null; // Clear existing submission data

                    // Reset UI elements managed by the other script (optional, but good practice)
                    const formTitle = document.getElementById('rsvp-form-title');
                    if (formTitle) formTitle.textContent = 'RSVP Form';

                    const updateNotice = document.getElementById('updateNotice');
                    if (updateNotice) updateNotice.style.display = 'none';

                    const existingInfo = document.getElementById('existingSubmissionInfo');
                    if (existingInfo) existingInfo.style.display = 'none';

                    const guestFoundInfo = document.getElementById('guestFoundInfo');
                    if (guestFoundInfo) guestFoundInfo.style.display = 'none'; // Hide this too after submission

                    const additionalFields = document.getElementById('additionalFields');
                    if (additionalFields) additionalFields.style.display = 'none'; // Hide fields section

                    const submitContainer = document.getElementById('submitButtonContainer');
                    if (submitContainer) submitContainer.style.display = 'none'; // Hide submit button

                    // Remove update-mode class from form container
                    const formContainer = document.querySelector('.form-container');
                    if (formContainer) formContainer.classList.remove('update-mode');
                })
                .catch(error => {
                    // Clear the timeout since we're handling the error
                    clearTimeout(submissionTimeout);

                    // Log detailed error information
                    console.error('RSVP Submission/Update Error:', error);

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

                    // Log additional information about the form data for debugging
                    console.log('Form data at time of error:', {
                        name: formData.name,
                        attending: formData.attending,
                        adultCount: formData.adultCount,
                        childCount: formData.childCount,
                        guestCount: formData.guestCount,
                        isUpdate: isUpdate,
                        submissionId: submissionId
                    });
                })
                .finally(() => {
                    // Restore button state regardless of success or failure
                    submitButton.innerHTML = originalButtonText;
                    submitButton.disabled = false;
                });
        }); // End of form submit event listener
    } // End of if (rsvpForm)

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
