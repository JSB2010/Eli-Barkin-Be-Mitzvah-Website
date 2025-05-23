// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Handle RSVP form submission
    const rsvpForm = document.getElementById('rsvpForm');
    const formConfirmation = document.getElementById('formConfirmation');
    const resetFormButton = document.getElementById('resetForm');
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

        // Handle form submission (for Formcarry)
        rsvpForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const form = this;
            const submitButton = form.querySelector('button[type="submit"]');

            // Store original button text
            const originalButtonText = submitButton.innerHTML;

            // Change button text to show it's submitting
            submitButton.innerHTML = 'Submitting...';

            // Submit form using fetch API for Formcarry
            fetch(form.action, {
                method: form.method,
                body: new FormData(form),
                headers: {
                    'Accept': 'application/json'
                }
            }).then(response => {
                if (response.status === 200) {
                    // Show success confirmation
                    form.style.display = 'none';
                    formConfirmation.classList.remove('hidden');
                    formConfirmation.scrollIntoView({ behavior: 'smooth' });
                } else {
                    // Show error
                    alert('Oops! There was a problem submitting your form. Please try again.');
                }
                submitButton.innerHTML = originalButtonText;
            }).catch(error => {
                // Show network error
                console.error('Submission error:', error);
                alert('Oops! There was a problem with your submission. Please try again.');
                submitButton.innerHTML = originalButtonText;
            });
        });
    }

    // Reset form button
    if (resetFormButton) {
        resetFormButton.addEventListener('click', function() {
            formConfirmation.classList.add('hidden');
            rsvpForm.style.display = 'block';
            rsvpForm.reset();

            // Scroll back to form
            rsvpForm.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Sports theme animation
    const sportCards = document.querySelectorAll('.sport-card');
    sportCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

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

    // Add special effects on scroll
    function handleScrollEffects() {
        const elements = document.querySelectorAll('.info-card, .sport-card, .about-content');
        const windowHeight = window.innerHeight;

        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;

            if (elementPosition < windowHeight - 100) {
                element.classList.add('visible');
            }
        });
    }

    // Add CSS class for fade-in effect
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        .info-card, .sport-card, .about-content {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .info-card.visible, .sport-card.visible, .about-content.visible {
            opacity: 1;
            transform: translateY(0);
        }

        .floating-sport {
            position: absolute;
            z-index: 1;
            animation: float linear infinite;
            pointer-events: none;
        }

        @keyframes float {
            0% {
                transform: translate(0, 0) rotate(0deg);
            }
            33% {
                transform: translate(30px, -50px) rotate(120deg);
            }
            66% {
                transform: translate(-20px, -20px) rotate(240deg);
            }
            100% {
                transform: translate(0, 0) rotate(360deg);
            }
        }
    `;
    document.head.appendChild(styleSheet);

    // Listen for scroll events
    window.addEventListener('scroll', handleScrollEffects);
    // Initial check for elements in view
    handleScrollEffects();
});