/**
 * Enhanced mobile navigation script for Eli's Be Mitzvah website
 * Includes improved mobile experience, smoother animations, and better performance
 */
document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');
    const menuOverlay = document.querySelector('.menu-overlay');
    const navLinks = document.querySelectorAll('nav ul li a');
    const header = document.querySelector('header');
    const body = document.body;

    // Track touch start position for swipe detection
    let touchStartX = 0;
    let touchEndX = 0;

    // Function to close the menu with optional animation duration
    function closeMenu(duration = 300) {
        // Add a class for smooth transition
        nav.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        menuToggle.classList.remove('active');
        nav.classList.remove('active');
        menuOverlay.classList.remove('active');
        body.classList.remove('menu-open');

        // Announce menu closed for screen readers
        menuToggle.setAttribute('aria-expanded', 'false');
    }

    // Function to open the menu with optional animation duration
    function openMenu(duration = 300) {
        // Add a class for smooth transition
        nav.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        menuToggle.classList.add('active');
        nav.classList.add('active');
        menuOverlay.classList.add('active');
        body.classList.add('menu-open');

        // Announce menu opened for screen readers
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

    // Initialize ARIA attributes for accessibility
    function initAccessibility() {
        if (menuToggle) {
            menuToggle.setAttribute('aria-label', 'Toggle navigation menu');
            menuToggle.setAttribute('aria-expanded', 'false');
            menuToggle.setAttribute('role', 'button');
            menuToggle.setAttribute('tabindex', '0');
        }

        if (nav) {
            nav.setAttribute('aria-label', 'Main navigation');
        }
    }

    // Toggle menu when hamburger icon is clicked
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMenu);

        // Also toggle on Enter or Space key for accessibility
        menuToggle.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleMenu();
            }
        });
    }

    // Close menu when overlay is clicked
    if (menuOverlay) {
        menuOverlay.addEventListener('click', closeMenu);
    }

    // Close menu when a nav link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
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
    function initSwipeDetection() {
        // Track touch start position
        document.addEventListener('touchstart', function(event) {
            touchStartX = event.changedTouches[0].screenX;
        }, { passive: true });

        // Track touch end position and determine swipe direction
        document.addEventListener('touchend', function(event) {
            touchEndX = event.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        // Handle swipe based on direction
        function handleSwipe() {
            const swipeThreshold = 100; // Minimum distance for a swipe
            const swipeDistance = touchEndX - touchStartX;

            // If menu is open and swipe right-to-left, close menu
            if (nav.classList.contains('active') && swipeDistance < -swipeThreshold) {
                closeMenu();
            }

            // If menu is closed and swipe left-to-right near the edge, open menu
            if (!nav.classList.contains('active') && swipeDistance > swipeThreshold && touchStartX < 50) {
                openMenu();
            }
        }
    }

    // Adjust header height for content padding (no body padding needed)
    function updateHeaderHeight() {
        if (header) {
            const headerHeight = header.offsetHeight;
            document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
        }
    }

    // Check if we need to switch to mobile view based on nav width
    function checkNavOverflow() {
        // Only run this check if we're on a larger screen
        if (window.innerWidth > 1024) {
            const navContainer = document.querySelector('header');
            const logoWidth = document.querySelector('.logo').offsetWidth;
            const menuToggleWidth = document.querySelector('.menu-toggle').offsetWidth;
            const availableWidth = navContainer.offsetWidth - logoWidth - menuToggleWidth - 60; // 60px buffer

            // Calculate the width of all nav items
            let navItemsWidth = 0;
            const navItems = document.querySelectorAll('nav ul li');
            navItems.forEach(item => {
                navItemsWidth += item.offsetWidth;
            });

            // If nav items don't fit, switch to mobile view
            if (navItemsWidth > availableWidth) {
                body.classList.add('force-mobile-nav');
            } else {
                body.classList.remove('force-mobile-nav');
            }
        } else {
            body.classList.remove('force-mobile-nav');
        }
    }

    // Add active class to current page in navigation
    function highlightCurrentPage() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage) {
                link.classList.add('active');
                // Also add active class to parent li for styling
                const parentLi = link.closest('li');
                if (parentLi) {
                    parentLi.classList.add('active');
                }
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Initialize all navigation features
    function initNavigation() {
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
    }

    // Run initialization
    initNavigation();

    // Set up event listeners for window resize
    let resizeTimer;
    window.addEventListener('resize', function() {
        // Debounce resize events for better performance
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            updateHeaderHeight();
            checkNavOverflow();
        }, 100);
    });

    // Also update after the page has fully loaded
    window.addEventListener('load', function() {
        updateHeaderHeight();
        checkNavOverflow();
        // Run again after a delay to account for any layout shifts
        setTimeout(function() {
            updateHeaderHeight();
            checkNavOverflow();
        }, 500);
    });
});
