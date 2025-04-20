/**
 * Enhanced mobile navigation script for Eli's Be Mitzvah website
 * Includes improved mobile experience, smoother animations, and better performance
 */

// IMPORTANT: This script is completely disabled on dashboard pages and any page that doesn't have the main navigation
// This prevents the errors with nav.contains and offsetWidth

// Only run this script on the main site pages
(function() {
    // Check if we're on a page that should run this script
    function shouldRunScript() {
        try {
            // Skip on dashboard pages
            if (window.location.pathname.includes('dashboard')) {
                console.log('Mobile nav: Skipping on dashboard page');
                return false;
            }

            // Skip on any page that doesn't have the main navigation
            const nav = document.querySelector('nav');
            const menuToggle = document.querySelector('.menu-toggle');

            if (!nav || !menuToggle) {
                console.log('Mobile nav: Required elements not found, skipping');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Mobile nav: Error checking if script should run:', error);
            return false;
        }
    }

    // Only initialize when DOM is ready
    function init() {
        // Exit immediately if we shouldn't run this script
        if (!shouldRunScript()) return;

        try {
            console.log('Mobile nav: Initializing');

            // Cache DOM elements - we already checked they exist
            const menuToggle = document.querySelector('.menu-toggle');
            const nav = document.querySelector('nav');
            const menuOverlay = document.querySelector('.menu-overlay');
            const header = document.querySelector('header');
            const body = document.body;

            // Get all nav links
            const navLinks = nav.querySelectorAll('ul li a');

            // Track touch start position for swipe detection
            let touchStartX = 0;
            let touchEndX = 0;

            // Function to close the menu
            function closeMenu() {
                menuToggle.classList.remove('active');
                nav.classList.remove('active');
                if (menuOverlay) menuOverlay.classList.remove('active');
                body.classList.remove('menu-open');
                menuToggle.setAttribute('aria-expanded', 'false');
            }

            // Function to open the menu
            function openMenu() {
                menuToggle.classList.add('active');
                nav.classList.add('active');
                if (menuOverlay) menuOverlay.classList.add('active');
                body.classList.add('menu-open');
                menuToggle.setAttribute('aria-expanded', 'true');
            }

            // Function to toggle the menu
            function toggleMenu() {
                if (nav.classList.contains('active')) {
                    closeMenu();
                } else {
                    openMenu();
                }
            }

            // Set up accessibility attributes
            menuToggle.setAttribute('aria-label', 'Toggle navigation menu');
            menuToggle.setAttribute('aria-expanded', 'false');
            menuToggle.setAttribute('role', 'button');
            menuToggle.setAttribute('tabindex', '0');
            nav.setAttribute('aria-label', 'Main navigation');

            // Toggle menu when hamburger icon is clicked
            menuToggle.addEventListener('click', toggleMenu);

            // Also toggle on Enter or Space key for accessibility
            menuToggle.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleMenu();
                }
            });

            // Close menu when overlay is clicked
            if (menuOverlay) {
                menuOverlay.addEventListener('click', closeMenu);
            }

            // Close menu when a nav link is clicked
            navLinks.forEach(link => {
                if (link) link.addEventListener('click', closeMenu);
            });

            // Close menu when clicking outside of it
            document.addEventListener('click', function(event) {
                const isClickInsideNav = nav.contains(event.target);
                const isClickOnToggle = menuToggle.contains(event.target);

                if (nav.classList.contains('active') && !isClickInsideNav && !isClickOnToggle) {
                    closeMenu();
                }
            });

            // Close menu when pressing Escape key
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape' && nav.classList.contains('active')) {
                    closeMenu();
                }
            });

            // Add swipe detection for mobile
            document.addEventListener('touchstart', function(event) {
                touchStartX = event.changedTouches[0].screenX;
            }, { passive: true });

            document.addEventListener('touchend', function(event) {
                touchEndX = event.changedTouches[0].screenX;
                const swipeThreshold = 100;
                const swipeDistance = touchEndX - touchStartX;

                // If menu is open and swipe right-to-left, close menu
                if (nav.classList.contains('active') && swipeDistance < -swipeThreshold) {
                    closeMenu();
                }

                // If menu is closed and swipe left-to-right near the edge, open menu
                if (!nav.classList.contains('active') && swipeDistance > swipeThreshold && touchStartX < 50) {
                    openMenu();
                }
            }, { passive: true });

            // Update header height for content padding
            function updateHeaderHeight() {
                if (header) {
                    const headerHeight = header.offsetHeight || 0;
                    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
                }
            }

            // Initial header height update
            updateHeaderHeight();

            // Update on window resize
            let resizeTimer;
            window.addEventListener('resize', function() {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(updateHeaderHeight, 100);
            });

            // Update after page load
            window.addEventListener('load', updateHeaderHeight);

            console.log('Mobile nav: Initialization complete');
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
