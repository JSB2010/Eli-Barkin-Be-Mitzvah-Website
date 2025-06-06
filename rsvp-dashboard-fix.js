/**
 * RSVP Dashboard Enhancement Script
 * Provides improved tooltips and error handling for the RSVP dashboard
 */

// Execute immediately when the script loads
(function() {
    console.log('RSVP Dashboard Enhancements: Initializing...');

    // Create a global error handler to catch and log errors
    window.addEventListener('error', function(event) {
        console.error('Global error caught:', event.error);

        // Log additional information about the error
        if (event.error?.stack) {
            console.error('Error stack:', event.error.stack);
        }

        // Prevent the error from propagating if it's one of the known errors
        if (event.error?.message) {
            const errorMsg = event.error.message.toLowerCase();

            // Check for known error patterns
            if (errorMsg.includes('null is not an object') &&
                (errorMsg.includes('nav.contains') || errorMsg.includes('offsetwidth'))) {
                console.log('Prevented known error from propagating:', event.error.message);
                event.preventDefault();
                return true; // Prevents the error from propagating
            }
        }
    }, true); // Use capturing phase to catch errors early

    // Function to safely initialize tooltips using native browser tooltips
    function initNativeTooltips() {
        try {
            // Find all elements with data-tooltip attribute
            const tooltipElements = document.querySelectorAll('[data-tooltip]');
            if (tooltipElements.length === 0) return;

            console.log(`Setting up ${tooltipElements.length} native tooltips`);

            // Use title attributes for tooltips (browser native)
            tooltipElements.forEach(element => {
                if (!element) return;

                const tooltipText = element.getAttribute('data-tooltip');
                if (!tooltipText) return;

                // Set the title attribute which will show as a native browser tooltip
                element.setAttribute('title', tooltipText);

                // Add a special class to style these elements
                element.classList.add('has-native-tooltip');
            });

            // Add a style for the tooltip elements
            const styleElement = document.createElement('style');
            styleElement.textContent = `
                .has-native-tooltip {
                    cursor: help;
                    border-bottom: 1px dotted #ccc;
                }

                /* Hide any custom tooltips that might be created */
                .tooltip {
                    display: none !important;
                }
            `;
            document.head.appendChild(styleElement);

            console.log('Native tooltips initialized');
        } catch (error) {
            console.error('Error initializing native tooltips:', error);
        }
    }

    // Function to safely patch problematic functions
    function patchProblematicFunctions() {
        try {
            // If DashboardEnhancements exists, patch its initTooltips method
            if (typeof DashboardEnhancements !== 'undefined') {
                console.log('Patching DashboardEnhancements.initTooltips');

                // Save the original method if we need to restore it
                DashboardEnhancements._originalInitTooltips = DashboardEnhancements.initTooltips;

                // Replace with our safe version
                DashboardEnhancements.initTooltips = function() {
                    console.log('Using safe tooltip initialization');
                    initNativeTooltips();
                };
            }

            console.log('Function patching complete');
        } catch (error) {
            console.error('Error patching functions:', error);
        }
    }

    // Function to ensure Firebase is ready
    function ensureFirebaseReady() {
        console.log('Ensuring Firebase is ready...');

        // Check if Firebase is already initialized
        if (window.db && typeof window.db.collection === 'function') {
            console.log('Firebase already initialized, dashboard can proceed');
            return;
        }

        // Use the new waitForFirebase helper if available
        if (typeof window.waitForFirebase === 'function') {
            window.waitForFirebase().then(() => {
                console.log('Firebase is ready, dashboard can proceed');
            }).catch(error => {
                console.error('Error waiting for Firebase:', error);
                forceFirebaseInitialization();
            });
        } else {
            // Fallback if waitForFirebase is not available
            forceFirebaseInitialization();
        }
    }

    // Function to force Firebase initialization as a last resort
    function forceFirebaseInitialization() {
        console.log('Forcing Firebase initialization as fallback');

        try {
            // Check if Firebase is available
            if (typeof firebase === 'undefined') {
                console.error('Firebase SDK not loaded, cannot force initialization');
                return;
            }

            // Initialize Firebase if not already initialized
            if (!firebase.apps || firebase.apps.length === 0) {
                // Use the global firebaseConfig object if available
                firebase.initializeApp(window.firebaseConfig || {
                    apiKey: "AIzaSyBgAXectfPhAr3HqASJCewnfQJnGnfGAK8",
                    authDomain: "eli-barkin-be-mitzvah.firebaseapp.com",
                    projectId: "eli-barkin-be-mitzvah",
                    storageBucket: "eli-barkin-be-mitzvah.firebasestorage.app",
                    messagingSenderId: "1058445082947",
                    appId: "1:1058445082947:web:8ab0696d5782e63ddaeff6",
                    measurementId: "G-QQBCYHVB9C"
                });
                console.log('Firebase initialized by fallback');
            }

            // Initialize Firestore if not already initialized
            if (!window.db && typeof firebase.firestore === 'function') {
                window.db = firebase.firestore();
                console.log('Firestore initialized by fallback');

                // Dispatch the firebase-ready event
                document.dispatchEvent(new CustomEvent('firebase-ready'));
            }
        } catch (error) {
            console.error('Error in fallback Firebase initialization:', error);
        }
    }

    // Function to run when DOM is ready
    function onDOMReady() {
        console.log('DOM ready, applying RSVP dashboard enhancements');

        // Initialize native tooltips
        initNativeTooltips();

        // Patch problematic functions
        patchProblematicFunctions();

        // Ensure Firebase is ready
        ensureFirebaseReady();

        console.log('RSVP Dashboard Enhancements: All enhancements applied');
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDOMReady);
    } else {
        // DOM is already ready, run immediately
        onDOMReady();
    }
})();
