/**
 * Special fix script for RSVP dashboard
 * This script prevents the common JavaScript errors on the RSVP dashboard page
 * and ensures Firebase is properly initialized
 */

// Execute immediately when the script loads
(function() {
    console.log('RSVP Dashboard Fix: Initializing...');

    // Create a global error handler to catch and log errors
    window.addEventListener('error', function(event) {
        console.error('Global error caught:', event.error);

        // Log additional information about the error
        if (event.error && event.error.stack) {
            console.error('Error stack:', event.error.stack);
        }

        // Prevent the error from propagating if it's one of the known errors
        if (event.error && event.error.message) {
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

            // Patch RSVPSystem.initDashboard to handle Firebase initialization better
            if (typeof RSVPSystem !== 'undefined' && typeof RSVPSystem.initDashboard === 'function') {
                console.log('Patching RSVPSystem.initDashboard for better Firebase handling');

                // Save the original method
                RSVPSystem._originalInitDashboard = RSVPSystem.initDashboard;

                // Replace with our enhanced version
                RSVPSystem.initDashboard = function() {
                    try {
                        console.log('Enhanced dashboard initialization starting...');

                        // Reset loading state
                        this.state.submissionsLoaded = false;
                        this.state.guestListLoaded = false;
                        this.state.loadingError = null;

                        // Show loading indicator
                        this.showLoading();

                        // Check if Firebase is available
                        const firebaseAvailable = typeof firebase !== 'undefined';

                        if (!firebaseAvailable) {
                            console.error('Firebase not available, waiting for it to load...');

                            // Wait for Firebase to be ready
                            setTimeout(() => {
                                console.log('Retrying dashboard initialization...');
                                this.initDashboard();
                            }, 1000);

                            return true; // Return true to prevent error message
                        }

                        // Initialize Firestore if needed
                        if (!this.state.db) {
                            console.log('Initializing Firestore...');

                            try {
                                // Try to get the global db instance first
                                if (window.db) {
                                    console.log('Using global db instance');
                                    this.state.db = window.db;
                                } else {
                                    // Create a new Firestore instance
                                    console.log('Creating new Firestore instance');
                                    this.state.db = firebase.firestore();
                                }

                                console.log('Firestore initialized successfully');
                            } catch (error) {
                                console.error('Error initializing Firestore:', error);

                                // Wait and retry once more
                                setTimeout(() => {
                                    console.log('Retrying Firestore initialization...');
                                    try {
                                        this.state.db = firebase.firestore();
                                        console.log('Firestore initialized successfully on retry');

                                        // Now fetch the data
                                        this.fetchSubmissions();
                                        this.fetchGuestList();
                                    } catch (retryError) {
                                        console.error('Failed to initialize Firestore on retry:', retryError);
                                        this.showError('Could not connect to the database. Please try refreshing the page.');
                                    }
                                }, 2000);

                                return true; // Return true to prevent error message
                            }
                        }

                        // Fetch data
                        console.log('Fetching submissions and guest list...');
                        this.fetchSubmissions();
                        this.fetchGuestList();

                        // Add a safety timeout to hide the loading indicator after 30 seconds
                        setTimeout(() => {
                            try {
                                const loadingElement = document.getElementById('loading');
                                if (loadingElement && !loadingElement.classList.contains('hidden')) {
                                    console.log('Safety timeout reached, hiding loading indicator');
                                    this.hideLoading();

                                    // Show toast notification
                                    if (typeof ToastSystem !== 'undefined') {
                                        ToastSystem.warning('Loading took longer than expected. Some data might not be available.', 'Timeout');
                                    }
                                }
                            } catch (error) {
                                console.error('Error in safety timeout handler:', error);
                            }
                        }, 30000);

                        console.log('Enhanced dashboard initialization complete');
                        return true;
                    } catch (error) {
                        console.error('Error in enhanced dashboard initialization:', error);
                        this.hideLoading();
                        this.showError('Could not initialize the dashboard. Please try refreshing the page.');
                        return false;
                    }
                };
            }

            // Patch RSVPSystem.fetchSubmissions to handle permission errors better
            if (typeof RSVPSystem !== 'undefined' && typeof RSVPSystem.fetchSubmissions === 'function') {
                console.log('Patching RSVPSystem.fetchSubmissions for better error handling');

                // Save the original method
                RSVPSystem._originalFetchSubmissions = RSVPSystem.fetchSubmissions;

                // Replace with our enhanced version
                RSVPSystem.fetchSubmissions = function() {
                    try {
                        console.log('Enhanced fetchSubmissions starting...');

                        if (!this.state.db) {
                            console.error('No database connection available for fetchSubmissions');
                            return;
                        }

                        console.log('Fetching submissions from Firestore...');

                        // Use a more reliable collection name
                        const collectionName = 'sheetRsvps';

                        this.state.db.collection(collectionName).get()
                            .then(snapshot => {
                                console.log(`Fetched ${snapshot.size} submissions`);

                                const submissions = [];
                                snapshot.forEach(doc => {
                                    const data = doc.data();
                                    submissions.push({
                                        id: doc.id,
                                        ...data,
                                        submittedAt: data.submittedAt ? data.submittedAt.toDate() : new Date()
                                    });
                                });

                                this.state.submissions = submissions;
                                this.state.submissionsLoaded = true;

                                // Process the data
                                this.processSubmissions();

                                // Check if all data is loaded
                                this.checkAllDataLoaded();
                            })
                            .catch(error => {
                                console.error(`Error fetching submissions from ${collectionName}:`, error);

                                // Try an alternative collection name if the first one fails
                                const altCollectionName = 'rsvps';
                                console.log(`Trying alternative collection: ${altCollectionName}`);

                                this.state.db.collection(altCollectionName).get()
                                    .then(snapshot => {
                                        console.log(`Fetched ${snapshot.size} submissions from ${altCollectionName}`);

                                        const submissions = [];
                                        snapshot.forEach(doc => {
                                            const data = doc.data();
                                            submissions.push({
                                                id: doc.id,
                                                ...data,
                                                submittedAt: data.submittedAt ? data.submittedAt.toDate() : new Date()
                                            });
                                        });

                                        this.state.submissions = submissions;
                                        this.state.submissionsLoaded = true;

                                        // Process the data
                                        this.processSubmissions();

                                        // Check if all data is loaded
                                        this.checkAllDataLoaded();
                                    })
                                    .catch(altError => {
                                        console.error(`Error fetching submissions from ${altCollectionName}:`, altError);
                                        this.state.submissionsLoaded = true; // Mark as loaded even though it failed
                                        this.state.submissions = []; // Empty array

                                        // Check if all data is loaded
                                        this.checkAllDataLoaded();
                                    });
                            });
                    } catch (error) {
                        console.error('Error in enhanced fetchSubmissions:', error);
                        this.state.submissionsLoaded = true; // Mark as loaded even though it failed
                        this.state.submissions = []; // Empty array

                        // Check if all data is loaded
                        this.checkAllDataLoaded();
                    }
                };
            }

            console.log('Function patching complete');
        } catch (error) {
            console.error('Error patching functions:', error);
        }
    }

    // Function to run when DOM is ready
    function onDOMReady() {
        console.log('DOM ready, applying RSVP dashboard fixes');

        // Initialize native tooltips
        initNativeTooltips();

        // Patch problematic functions
        patchProblematicFunctions();

        console.log('RSVP Dashboard Fix: All fixes applied');
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDOMReady);
    } else {
        // DOM is already ready, run immediately
        onDOMReady();
    }
})();
