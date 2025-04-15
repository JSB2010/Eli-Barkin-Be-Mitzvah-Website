document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');
    const menuOverlay = document.querySelector('.menu-overlay');
    const navLinks = document.querySelectorAll('nav ul li a');
    const header = document.querySelector('header');

    // Function to close the menu
    function closeMenu() {
        menuToggle.classList.remove('active');
        nav.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.classList.remove('menu-open');
    }

    // Function to toggle the menu
    function toggleMenu() {
        menuToggle.classList.toggle('active');
        nav.classList.toggle('active');
        menuOverlay.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    }

    // Toggle menu when hamburger icon is clicked
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMenu);
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

    // Adjust header height for content padding
    function updateHeaderHeight() {
        if (header) {
            const headerHeight = header.offsetHeight;
            document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
        }
    }

    // Run on load
    updateHeaderHeight();

    // Check if we need to switch to mobile view based on nav width
    function checkNavOverflow() {
        // Only run this check if we're on a larger screen
        if (window.innerWidth > 1024) {
            const navContainer = document.querySelector('header');
            const logoWidth = document.querySelector('.logo').offsetWidth;
            const availableWidth = navContainer.offsetWidth - logoWidth - 40; // 40px buffer

            // Calculate the width of all nav items
            let navItemsWidth = 0;
            const navItems = document.querySelectorAll('nav ul li');
            navItems.forEach(item => {
                navItemsWidth += item.offsetWidth;
            });

            // If nav items don't fit, switch to mobile view
            if (navItemsWidth > availableWidth) {
                document.body.classList.add('force-mobile-nav');
            } else {
                document.body.classList.remove('force-mobile-nav');
            }
        } else {
            document.body.classList.remove('force-mobile-nav');
        }
    }

    // Run on load and resize
    checkNavOverflow();
    window.addEventListener('resize', function() {
        checkNavOverflow();
        updateHeaderHeight();
    });

    // Also update header height after the page has fully loaded
    window.addEventListener('load', updateHeaderHeight);
});
