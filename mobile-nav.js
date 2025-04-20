/**
 * Enhanced mobile navigation script for Eli's Be Mitzvah website
 * Includes improved mobile experience, smoother animations, and better performance
 * Completely rewritten to be more defensive and only run when necessary elements are present
 */

// Wrap everything in an IIFE to avoid global scope pollution
(function() {
    // Debug flag - set to true to enable console logging
    const DEBUG = true;

    // Safe console log function that only logs when DEBUG is true
    function log(message, data) {
        if (DEBUG) {
            if (data) {
                console.log(`[MobileNav] ${message}`, data);
            } else {
                console.log(`[MobileNav] ${message}`);
            }
        }
    }

    // Safe error logging function
    function logError(message, error) {
        console.error(`[MobileNav] ${message}`, error);
    }

    // Safe element selector that won't throw errors
    function safeSelect(selector) {
        try {
            return document.querySelector(selector);
        } catch (error) {
            logError(`Error selecting ${selector}:`, error);
            return null;
        }
    }

    // Safe element selector for multiple elements
    function safeSelectAll(selector) {
        try {
            return document.querySelectorAll(selector);
        } catch (error) {
            logError(`Error selecting all ${selector}:`, error);
            return [];
        }
    }

    // Safe event listener addition
    function safeAddEventListener(element, event, handler, options) {
        if (!element) return;

        try {
            element.addEventListener(event, handler, options);
        } catch (error) {
            logError(`Error adding ${event} listener:`, error);
        }
    }

    // Safe class manipulation
    function safeAddClass(element, className) {
        if (!element) return;

        try {
            element.classList.add(className);
        } catch (error) {
            logError(`Error adding class ${className}:`, error);
        }
    }

    function safeRemoveClass(element, className) {
        if (!element) return;

        try {
            element.classList.remove(className);
        } catch (error) {
            logError(`Error removing class ${className}:`, error);
        }
    }

    function safeHasClass(element, className) {
        if (!element) return false;

        try {
            return element.classList.contains(className);
        } catch (error) {
            logError(`Error checking class ${className}:`, error);
            return false;
        }
    }

    // Safe attribute manipulation
    function safeSetAttribute(element, attr, value) {
        if (!element) return;

        try {
            element.setAttribute(attr, value);
        } catch (error) {
            logError(`Error setting attribute ${attr}:`, error);
        }
    }

    // Safe style manipulation
    function safeSetStyle(element, property, value) {
        if (!element) return;

        try {
            element.style[property] = value;
        } catch (error) {
            logError(`Error setting style ${property}:`, error);
        }
    }

    // Safe contains check
    function safeContains(element, target) {
        if (!element) return false;

        try {
            return element.contains(target);
        } catch (error) {
            logError('Error checking if element contains target:', error);
            return false;
        }
    }

    // Initialize mobile navigation
    function initMobileNav() {
        log('Initializing mobile navigation');

        // Check if we're on a page that needs mobile navigation
        // Skip initialization on dashboard pages
        if (window.location.pathname.includes('dashboard')) {
            log('Skipping mobile navigation on dashboard page');
            return;
        }

        // Cache DOM elements - only proceed if essential elements exist
        const menuToggle = safeSelect('.menu-toggle');
        const nav = safeSelect('nav');

        // If essential elements don't exist, don't initialize
        if (!menuToggle || !nav) {
            log('Essential navigation elements not found, skipping initialization');
            return;
        }

        // Continue with other elements
        const menuOverlay = safeSelect('.menu-overlay');
        const navLinks = safeSelectAll('nav ul li a');
        const header = safeSelect('header');
        const body = document.body;

        // Track touch start position for swipe detection
        let touchStartX = 0;
        let touchEndX = 0;

        // Function to close the menu with optional animation duration
        function closeMenu(duration = 300) {
            log('Closing menu');
            safeSetStyle(nav, 'transition', `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`);
            safeRemoveClass(menuToggle, 'active');
            safeRemoveClass(nav, 'active');
            safeRemoveClass(menuOverlay, 'active');
            safeRemoveClass(body, 'menu-open');

            // Announce menu closed for screen readers
            safeSetAttribute(menuToggle, 'aria-expanded', 'false');
        }

        // Function to open the menu with optional animation duration
        function openMenu(duration = 300) {
            log('Opening menu');
            safeSetStyle(nav, 'transition', `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`);
            safeAddClass(menuToggle, 'active');
            safeAddClass(nav, 'active');
            safeAddClass(menuOverlay, 'active');
            safeAddClass(body, 'menu-open');

            // Announce menu opened for screen readers
            safeSetAttribute(menuToggle, 'aria-expanded', 'true');
        }

        // Function to toggle the menu
        function toggleMenu() {
            log('Toggling menu');
            if (safeHasClass(nav, 'active')) {
                closeMenu();
            } else {
                openMenu();
            }
        }

        // Initialize ARIA attributes for accessibility
        function initAccessibility() {
            log('Initializing accessibility');
            safeSetAttribute(menuToggle, 'aria-label', 'Toggle navigation menu');
            safeSetAttribute(menuToggle, 'aria-expanded', 'false');
            safeSetAttribute(menuToggle, 'role', 'button');
            safeSetAttribute(menuToggle, 'tabindex', '0');
            safeSetAttribute(nav, 'aria-label', 'Main navigation');
        }

        // Toggle menu when hamburger icon is clicked
        safeAddEventListener(menuToggle, 'click', toggleMenu);

        // Also toggle on Enter or Space key for accessibility
        safeAddEventListener(menuToggle, 'keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleMenu();
            }
        });

        // Close menu when overlay is clicked
        safeAddEventListener(menuOverlay, 'click', closeMenu);

        // Close menu when a nav link is clicked
        navLinks.forEach(link => {
            safeAddEventListener(link, 'click', closeMenu);
        });

        // Close menu when clicking outside of it
        safeAddEventListener(document, 'click', function(event) {
            const isClickInsideNav = safeContains(nav, event.target);
            const isClickOnToggle = safeContains(menuToggle, event.target);

            if (safeHasClass(nav, 'active') && !isClickInsideNav && !isClickOnToggle) {
                closeMenu();
            }
        });

        // Close menu when pressing Escape key
        safeAddEventListener(document, 'keydown', function(event) {
            if (event.key === 'Escape' && safeHasClass(nav, 'active')) {
                closeMenu();
            }
        });

        // Add swipe detection for mobile
        function initSwipeDetection() {
            log('Initializing swipe detection');

            // Track touch start position
            safeAddEventListener(document, 'touchstart', function(event) {
                touchStartX = event.changedTouches[0].screenX;
            }, { passive: true });

            // Track touch end position and determine swipe direction
            safeAddEventListener(document, 'touchend', function(event) {
                touchEndX = event.changedTouches[0].screenX;
                handleSwipe();
            }, { passive: true });

            // Handle swipe based on direction
            function handleSwipe() {
                const swipeThreshold = 100; // Minimum distance for a swipe
                const swipeDistance = touchEndX - touchStartX;

                // If menu is open and swipe right-to-left, close menu
                if (safeHasClass(nav, 'active') && swipeDistance < -swipeThreshold) {
                    closeMenu();
                }

                // If menu is closed and swipe left-to-right near the edge, open menu
                if (!safeHasClass(nav, 'active') && swipeDistance > swipeThreshold && touchStartX < 50) {
                    openMenu();
                }
            }
        }

        // Adjust header height for content padding
        function updateHeaderHeight() {
            if (!header) return;

            try {
                const headerHeight = header.offsetHeight || 0;
                document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
                log('Updated header height:', headerHeight);
            } catch (error) {
                logError('Error updating header height:', error);
            }
        }

        // Check if we need to switch to mobile view based on nav width
        function checkNavOverflow() {
            if (!header) return;

            try {
                // Only run this check if we're on a larger screen
                if (window.innerWidth <= 1024) {
                    safeRemoveClass(body, 'force-mobile-nav');
                    return;
                }

                const navContainer = safeSelect('header');
                const logo = safeSelect('.logo');

                // Check if all elements exist before accessing properties
                if (!navContainer || !logo || !menuToggle) {
                    log('Nav elements not found, skipping overflow check');
                    return;
                }

                // Get dimensions safely
                const logoWidth = logo.offsetWidth || 0;
                const menuToggleWidth = menuToggle.offsetWidth || 0;
                const containerWidth = navContainer.offsetWidth || 0;

                const availableWidth = containerWidth - logoWidth - menuToggleWidth - 60; // 60px buffer

                // Calculate the width of all nav items
                let navItemsWidth = 0;
                const navItems = safeSelectAll('nav ul li');

                if (navItems.length === 0) {
                    log('No nav items found, skipping overflow check');
                    return;
                }

                navItems.forEach(item => {
                    if (item) {
                        navItemsWidth += item.offsetWidth || 0;
                    }
                });

                // If nav items don't fit, switch to mobile view
                if (navItemsWidth > availableWidth) {
                    safeAddClass(body, 'force-mobile-nav');
                    log('Enabling forced mobile nav');
                } else {
                    safeRemoveClass(body, 'force-mobile-nav');
                    log('Disabling forced mobile nav');
                }
            } catch (error) {
                logError('Error checking nav overflow:', error);
            }
        }

        // Add active class to current page in navigation
        function highlightCurrentPage() {
            if (navLinks.length === 0) return;

            try {
                const currentPage = window.location.pathname.split('/').pop() || 'index.html';
                log('Current page:', currentPage);

                navLinks.forEach(link => {
                    if (!link) return;

                    const href = link.getAttribute('href');
                    if (href === currentPage) {
                        safeAddClass(link, 'active');
                        // Also add active class to parent li for styling
                        const parentLi = link.closest('li');
                        if (parentLi) {
                            safeAddClass(parentLi, 'active');
                        }
                    } else {
                        safeRemoveClass(link, 'active');
                    }
                });
            } catch (error) {
                logError('Error highlighting current page:', error);
            }
        }

        // Initialize all navigation features
        function initNavigation() {
            log('Initializing navigation features');

            // Set up accessibility attributes
            initAccessibility();

            // Set up swipe detection for mobile
            initSwipeDetection();

            // Update header height
            updateHeaderHeight();

            // Check nav overflow
            checkNavOverflow();

            // Highlight current page
            highlightCurrentPage();

            // Run again after a short delay to ensure all assets are loaded
            setTimeout(function() {
                updateHeaderHeight();
                checkNavOverflow();
            }, 100);

            log('Navigation initialization complete');
        }

        // Run initialization
        initNavigation();

        // Set up event listeners for window resize
        let resizeTimer;
        safeAddEventListener(window, 'resize', function() {
            // Debounce resize events for better performance
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                updateHeaderHeight();
                checkNavOverflow();
            }, 100);
        });

        // Also update after the page has fully loaded
        safeAddEventListener(window, 'load', function() {
            updateHeaderHeight();
            checkNavOverflow();
            // Run again after a delay to account for any layout shifts
            setTimeout(function() {
                updateHeaderHeight();
                checkNavOverflow();
            }, 500);
        });
    }

    // Wait for DOM to be ready before initializing
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileNav);
    } else {
        // DOM is already ready, initialize immediately
        initMobileNav();
    }
})();
