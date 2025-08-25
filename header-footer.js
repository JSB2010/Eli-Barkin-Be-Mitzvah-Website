/**
 * Standardized Header and Footer for Eli's Be Mitzvah Website
 * This script dynamically injects a consistent header and footer across all pages
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the RSVP dashboard login page
    const isRsvpDashboardLogin = document.getElementById('login-section') !== null;
    const isDashboardPage = window.location.pathname.includes('rsvp-dashboard.html');

    // Determine whether to inject header/footer
    if (isDashboardPage && isRsvpDashboardLogin) {
        console.log('Header/Footer: Detected RSVP dashboard login, not injecting header/footer yet');

        // For dashboard, we need to listen for login success and then inject the header/footer
        const dashboardSection = document.getElementById('dashboard-section');
        if (dashboardSection) {
            // Create a mutation observer to watch for when the dashboard becomes visible
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        if (!dashboardSection.classList.contains('hidden')) {
                            injectHeader();
                            injectFooter();

                            // Add padding to dashboard container
                            const dashboardContainer = document.querySelector('.dashboard-container');
                            if (dashboardContainer) {
                                dashboardContainer.style.paddingTop = '80px';
                                if (window.innerWidth <= 768) {
                                    dashboardContainer.style.paddingTop = '70px';
                                }
                            }

                            observer.disconnect(); // Stop observing once injected
                        }
                    }
                });
            });

            // Start observing the dashboard section for class changes
            observer.observe(dashboardSection, { attributes: true });
        }
    } else {
        // For all other pages, inject header and footer immediately
        injectHeader();
        injectFooter();
    }

    // Add event listeners for mobile navigation
    setupMobileNav();
});

function injectHeader() {
    // Get the current page path to set active class
    const currentPath = window.location.pathname;
    const pageName = currentPath.split('/').pop() || 'index.html';

    // Check if we're on the index page
    const isIndexPage = pageName === 'index.html';

    // Create header HTML - minimal for index page, full for others
    let headerHTML;

    if (isIndexPage) {
        // Minimal header for index page - just logo, no navigation
        headerHTML = `
            <header>
                <div class="logo">
                    <a href="index.html">
                        <img src="logo.PNG" alt="EZB Sports Logo">
                    </a>
                </div>
            </header>
            <div class="main-content">
        `;
    } else {
        // Full header for all other pages
        headerHTML = `
            <header>
                <div class="logo">
                    <a href="index.html">
                        <img src="logo.PNG" alt="EZB Sports Logo">
                    </a>
                </div>
                <div class="menu-toggle" id="mobile-menu-toggle">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <nav>
                    <ul>
                        <li><a href="index.html" ${pageName === 'index.html' ? 'class="active"' : ''}>Home</a></li>
                        <li><a href="journey.html" ${pageName === 'journey.html' ? 'class="active"' : ''}>Eli's Journey</a></li>
                        <li><a href="the-big-day.html" ${pageName === 'the-big-day.html' ? 'class="active"' : ''}>Game Day Details</a></li>
                        <li><a href="rsvp.html" ${pageName === 'rsvp.html' ? 'class="active"' : ''}>RSVP</a></li>
                        <li><a href="family-details.html" ${pageName === 'family-details.html' ? 'class="active"' : ''}>Family & Out-of-Town Guests</a></li>
                        ${pageName === 'rsvp-dashboard.html' ? '<li><a href="rsvp-dashboard.html" class="active">RSVP Dashboard</a></li>' : ''}
                    </ul>
                </nav>
            </header>
            <div class="menu-overlay"></div>
            <div class="main-content">
        `;
    }

    // Find the body element
    const body = document.body;

    // Insert the header at the beginning of the body
    if (body.firstChild) {
        body.insertAdjacentHTML('afterbegin', headerHTML);
    } else {
        body.innerHTML = headerHTML;
    }
}

function injectFooter() {
    // Get the current page name
    const pageName = window.location.pathname.split('/').pop() || 'index.html';
    const isIndexPage = pageName === 'index.html';

    // Create footer HTML - minimal for index page, full for others
    let footerHTML;

    if (isIndexPage) {
        // Minimal footer for index page
        footerHTML = `
            </div> <!-- Close main-content -->
            <footer>
                <div class="container">
                    <div class="footer-credits">
                        <a href="https://jacobbarkin.com" target="_blank" rel="noopener">Designed by Jacob Barkin</a>
                    </div>
                    <div class="footer-links">
                        <a href="rsvp-dashboard.html">RSVP Dashboard</a>
                    </div>
                </div>
            </footer>
        `;
    } else {
        // Full footer for all other pages
        footerHTML = `
            </div> <!-- Close main-content -->
            <footer>
                <div class="container">
                    <div class="footer-credits">
                        <a href="https://jacobbarkin.com" target="_blank" rel="noopener">Designed by Jacob Barkin</a>
                        <span class="separator">|</span>
                        <a href="https://askthekidz.com" target="_blank" rel="noopener">Ask The Kidz</a>
                        <span class="separator">|</span>
                        <a href="https://github.com/JSB2010/Eli-Barkin-Be-Mitzvah-Website" target="_blank" rel="noopener" class="github-link">
                            <i class="fab fa-github"></i> View on GitHub
                        </a>
                    </div>
                    <div class="footer-links">
                        <a href="index.html">Home</a>
                        <a href="journey.html">Eli's Journey</a>
                        <a href="the-big-day.html">Game Day Details</a>
                        <a href="rsvp.html">RSVP</a>
                        <a href="family-details.html">Family & Out-of-Town Guests</a>
                        <a href="rsvp-dashboard.html">RSVP Dashboard</a>
                    </div>
                </div>
            </footer>
        `;
    }

    // Find the body element
    const body = document.body;

    // Append the footer to the end of the body
    body.insertAdjacentHTML('beforeend', footerHTML);
}

function setupMobileNav() {
    // Get the current page name
    const pageName = window.location.pathname.split('/').pop() || 'index.html';
    const isIndexPage = pageName === 'index.html';

    // Don't setup mobile nav on index page (no hamburger menu there)
    if (isIndexPage) {
        return;
    }

    // Wait for elements to be available (after injection)
    setTimeout(() => {
        const menuToggle = document.querySelector('#mobile-menu-toggle');
        const nav = document.querySelector('nav');
        let menuOverlay = document.querySelector('.menu-overlay');

        // Create menu overlay if it doesn't exist
        if (!menuOverlay) {
            menuOverlay = document.createElement('div');
            menuOverlay.className = 'menu-overlay';
            document.body.appendChild(menuOverlay);
        }

        if (menuToggle && nav) {
            // Toggle menu when hamburger icon is clicked
            menuToggle.addEventListener('click', function() {
                menuToggle.classList.toggle('active');
                nav.classList.toggle('active');
                document.body.classList.toggle('menu-open');
                menuOverlay.classList.toggle('active');

                // Prevent content from being covered by mobile nav
                if (document.body.classList.contains('menu-open')) {
                    document.body.style.overflow = 'hidden';
                } else {
                    document.body.style.overflow = '';
                }
            });

            // Close menu when clicking outside
            menuOverlay.addEventListener('click', function() {
                menuToggle.classList.remove('active');
                nav.classList.remove('active');
                document.body.classList.remove('menu-open');
                menuOverlay.classList.remove('active');
                document.body.style.overflow = '';
            });

            // Close menu when clicking on a nav link (for mobile)
            const navLinks = nav.querySelectorAll('a');
            navLinks.forEach(link => {
                link.addEventListener('click', function() {
                    if (window.innerWidth <= 768) {
                        menuToggle.classList.remove('active');
                        nav.classList.remove('active');
                        document.body.classList.remove('menu-open');
                        menuOverlay.classList.remove('active');
                        document.body.style.overflow = '';
                    }
                });
            });

            // Close menu when window is resized to desktop size
            window.addEventListener('resize', function() {
                if (window.innerWidth > 768) {
                    menuToggle.classList.remove('active');
                    nav.classList.remove('active');
                    document.body.classList.remove('menu-open');
                    menuOverlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });

            // Add scroll event to change header style when scrolling
            window.addEventListener('scroll', function() {
                const header = document.querySelector('header');
                if (header) {
                    if (window.scrollY > 50) {
                        header.classList.add('scrolled');
                    } else {
                        header.classList.remove('scrolled');
                    }
                }
            });

            // Set active class on current page link
            const currentPage = window.location.pathname.split('/').pop();
            navLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href === currentPage ||
                    (currentPage === '' && href === 'index.html') ||
                    (href === 'index.html' && currentPage === '/')) {
                    link.classList.add('active');
                }
            });
        }
    }, 100);
}
