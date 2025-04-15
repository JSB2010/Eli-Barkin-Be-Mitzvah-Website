// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
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
                alert('Error: Database connection is not available. Please try again later.');
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
                return;
            }

            // Submit to Firebase using the new collection for this branch
            db.collection('sheetRsvps').add(formData)
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
                    // Show error
                    console.error('Submission error:', error);
                    alert('Oops! There was a problem with your submission. Please try again.');
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
