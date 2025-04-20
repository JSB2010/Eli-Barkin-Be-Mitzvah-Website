/**
 * Mobile navigation script for Eli's Be Mitzvah website
 * COMPLETELY DISABLED ON RSVP DASHBOARD
 */

// This script is now a no-op on the RSVP dashboard page
// It will only run on the main site pages

// Immediately check if we're on the RSVP dashboard and exit if so
(function() {
    // Check if we're on the RSVP dashboard
    const isRsvpDashboard = window.location.pathname.includes('rsvp-dashboard') ||
                           document.title.includes('RSVP Dashboard');

    if (isRsvpDashboard) {
        console.log('Mobile nav: Detected RSVP dashboard, script disabled');
        return; // Exit immediately
    }

    // Check if we're on any dashboard page
    if (window.location.pathname.includes('dashboard')) {
        console.log('Mobile nav: Detected dashboard page, script disabled');
        return; // Exit immediately
    }

    // Only initialize when DOM is ready
    function init() {
        try {
            // Skip if essential elements don't exist
            const nav = document.querySelector('nav');
            const menuToggle = document.querySelector('.menu-toggle');

            if (!nav || !menuToggle) {
                console.log('Mobile nav: Required elements not found, skipping');
                return;
            }

            console.log('Mobile nav: Initializing');

            // Rest of the mobile navigation code...
            // (Simplified version to avoid any potential issues)

            // Basic functionality only
            menuToggle.addEventListener('click', function() {
                if (nav.classList.contains('active')) {
                    nav.classList.remove('active');
                    menuToggle.classList.remove('active');
                    document.body.classList.remove('menu-open');
                } else {
                    nav.classList.add('active');
                    menuToggle.classList.add('active');
                    document.body.classList.add('menu-open');
                }
            });

            console.log('Mobile nav: Basic initialization complete');
        } catch (error) {
            console.error('Mobile nav: Error during initialization:', error);
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
