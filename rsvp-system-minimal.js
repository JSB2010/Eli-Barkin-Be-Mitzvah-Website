// RSVP Dashboard System
const RSVPSystem = {
    // Debug mode
    DEBUG_MODE: false,

    // Internal state
    state: {
        db: null,
        submissions: [],
        filteredSubmissions: [],
        guests: [],
        filteredGuests: [],
        currentPage: 1,
        guestListPage: 1,
        itemsPerPage: 10,
        expectedInvites: 300,
        sortColumn: 'name',
        sortDirection: 'asc',
        guestSortColumn: 'name',
        guestSortDirection: 'asc',
        searchTerm: '',
        guestSearchTerm: '',
        responseFilter: 'all',
        debugLog: [],
        submissionsLoaded: false,
        guestListLoaded: false,
        loadingError: null
    },

    // Debug logging functions
    debug: {
        log: function(message, data = null, type = 'info') {
            if (!RSVPSystem.DEBUG_MODE) return;

            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                message,
                data,
                type
            };

            // Add to state
            RSVPSystem.state.debugLog.push(logEntry);

            // Log to console
            console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`, data || '');

            // Update debug panel if it exists
            RSVPSystem.updateDebugPanel(logEntry);
        },

        info: function(message, data = null) {
            this.log(message, data, 'info');
        },

        warn: function(message, data = null) {
            this.log(message, data, 'warn');
        },

        error: function(message, data = null) {
            this.log(message, data, 'error');
        },

        debug: function(message, data = null) {
            this.log(message, data, 'debug');
        },

        clear: function() {
            RSVPSystem.state.debugLog = [];
            const debugLogElement = document.getElementById('debug-log');
            if (debugLogElement) {
                debugLogElement.innerHTML = '';
            }
        }
    },



    // Update the debug panel with a new log entry
    updateDebugPanel: function(logEntry) {
        const debugLogElement = document.getElementById('debug-log');
        if (!debugLogElement) {
            console.warn('Debug log element not found, creating it');
            // Try to create the debug log element if it doesn't exist
            const debugPanel = document.querySelector('.debug-panel');
            if (debugPanel) {
                const debugContent = document.querySelector('.debug-content') || document.createElement('div');
                debugContent.className = 'debug-content';

                const newDebugLog = document.createElement('div');
                newDebugLog.id = 'debug-log';
                newDebugLog.className = 'debug-log';

                debugContent.appendChild(newDebugLog);
                debugPanel.appendChild(debugContent);

                return this.updateDebugPanel(logEntry); // Try again with the new element
            }
            return; // Can't create the debug log element
        }

        const entryElement = document.createElement('div');
        entryElement.className = `log-entry ${logEntry.type}`;

        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date(logEntry.timestamp).toLocaleTimeString();

        const message = document.createElement('span');
        message.className = 'message';
        message.textContent = logEntry.message;

        entryElement.appendChild(timestamp);
        entryElement.appendChild(message);

        if (logEntry.data) {
            const dataElement = document.createElement('div');
            dataElement.className = 'data';
            dataElement.textContent = typeof logEntry.data === 'object' ?
                JSON.stringify(logEntry.data, null, 2) : logEntry.data.toString();
            entryElement.appendChild(dataElement);
        }

        debugLogElement.appendChild(entryElement);
        debugLogElement.scrollTop = debugLogElement.scrollHeight;

        // Also log to console for backup
        console.log(`[${logEntry.type.toUpperCase()}] ${logEntry.message}`, logEntry.data || '');
    },

    // Initialize the system
    init: function() {
        console.log('RSVP System initializing...');

        try {
            this.debug.info('RSVP System initializing...');
            this.debug.info('Browser information:', navigator.userAgent);
        } catch (e) {
            console.error('Error initializing debug logging:', e);
        }

        // Initialize Firestore - use the global db instance from firebase-config.js
        try {
            if (window.db) {
                console.log('Using global Firestore instance');
                this.state.db = window.db;
                try {
                    this.debug.info('Using global Firestore instance');
                } catch (e) {
                    console.error('Error logging to debug panel:', e);
                }
            } else {
                // Try to initialize Firestore directly if global instance is not available
                console.log('Global Firestore instance not found, initializing directly');
                this.state.db = firebase.firestore();
                console.log('Firestore initialized directly');
                try {
                    this.debug.info('Firestore initialized directly');
                } catch (e) {
                    console.error('Error logging to debug panel:', e);
                }
            }

            // Test the Firestore connection
            console.log('Testing Firestore connection in RSVP System...');
            this.state.db.collection('guestList').limit(1).get()
                .then(snapshot => {
                    console.log('Firestore connection test successful in RSVP System');
                    try {
                        this.debug.info('Firestore connection test successful');
                    } catch (e) {
                        console.error('Error logging to debug panel:', e);
                    }
                })
                .catch(error => {
                    console.error('Error testing Firestore connection in RSVP System:', error);
                    try {
                        this.debug.error('Error testing Firestore connection:', error);
                    } catch (e) {
                        console.error('Error logging to debug panel:', e);
                    }
                    if (error.code === 'permission-denied') {
                        this.showError('Permission denied accessing Firestore. Please make sure you are logged in with the correct account.');
                    } else {
                        this.showError('Could not connect to database: ' + error.message);
                    }
                });
        } catch (error) {
            console.error('Error initializing Firestore in RSVP System:', error);
            try {
                this.debug.error('Error initializing Firestore:', error);
            } catch (e) {
                console.error('Error logging to debug panel:', e);
            }
            this.showError('Could not connect to database: ' + error.message);
        }

        // Set up event listeners
        this.setupEventListeners();

        // Initialize debug panel controls
        this.initDebugControls();

        console.log('RSVP System initialized');
        try {
            this.debug.info('RSVP System initialized');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }
    },

    // Initialize debug panel controls
    initDebugControls: function() {
        try {
            // Set up debug panel toggle button
            const showDebugBtn = document.getElementById('show-debug-btn');
            const debugPanel = document.querySelector('.debug-panel');
            const debugContent = document.querySelector('.debug-content');

            if (showDebugBtn && debugPanel) {
                showDebugBtn.addEventListener('click', () => {
                    console.log('Debug panel toggle clicked');
                    if (debugContent) {
                        if (debugContent.style.display === 'none') {
                            debugContent.style.display = 'block';
                            showDebugBtn.innerHTML = '<i class="fas fa-bug"></i> Hide Debug';
                        } else {
                            debugContent.style.display = 'none';
                            showDebugBtn.innerHTML = '<i class="fas fa-bug"></i> Debug Panel';
                        }
                    }
                });
            }

            // Set up clear debug button
            const clearDebugBtn = document.getElementById('clear-debug');
            if (clearDebugBtn) {
                clearDebugBtn.addEventListener('click', () => {
                    console.log('Clear debug clicked');
                    this.debug.clear();
                });
            }

            // Set up toggle debug button
            const toggleDebugBtn = document.getElementById('toggle-debug');
            if (toggleDebugBtn && debugContent) {
                toggleDebugBtn.addEventListener('click', () => {
                    console.log('Toggle debug clicked');
                    if (debugContent.style.display === 'none') {
                        debugContent.style.display = 'block';
                        toggleDebugBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide';
                    } else {
                        debugContent.style.display = 'none';
                        toggleDebugBtn.innerHTML = '<i class="fas fa-eye"></i> Show';
                    }
                });
            }

            // Initially hide the debug content
            if (debugContent) {
                debugContent.style.display = 'none';
            }

            console.log('Debug controls initialized');
        } catch (e) {
            console.error('Error initializing debug controls:', e);
        }
    },

    // Set up event listeners
    setupEventListeners: function() {
        try {
            this.debug.info('Setting up event listeners...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Set up tab functionality
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        if (tabButtons.length > 0 && tabContents.length > 0) {
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const tabId = button.getAttribute('data-tab');

                    // Remove active class from all buttons and contents
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));

                    // Add active class to current button and content
                    button.classList.add('active');
                    document.getElementById(tabId).classList.add('active');

                    // Refresh charts when switching to the analytics tab
                    if (tabId === 'analytics-tab') {
                        this.updateCharts({
                            attendingGuests: this.state.guests.filter(guest => guest.hasResponded && guest.response === 'yes').length,
                            notAttendingGuests: this.state.guests.filter(guest => guest.hasResponded && guest.response === 'no').length,
                            notRespondedGuests: this.state.guests.filter(guest => !guest.hasResponded).length,
                            adultCount: this.state.submissions.reduce((sum, submission) => {
                                return submission.attending === 'yes' ? sum + (submission.adultCount || 0) : sum;
                            }, 0),
                            childCount: this.state.submissions.reduce((sum, submission) => {
                                return submission.attending === 'yes' ? sum + (submission.childCount || 0) : sum;
                            }, 0),
                            responseRate: this.state.guests.length > 0 ?
                                Math.round((this.state.guests.filter(guest => guest.hasResponded).length / this.state.guests.length) * 100) : 0,
                            submissions: this.state.submissions
                        });
                    }
                });
            });
        }

        // Set up modal close functionality
        const modalCloseButtons = document.querySelectorAll('.modal-close');
        modalCloseButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Find the parent modal
                const modal = button.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Set up form submission handlers
        const addGuestSubmitBtn = document.getElementById('add-guest-submit');
        if (addGuestSubmitBtn) {
            addGuestSubmitBtn.addEventListener('click', () => {
                this.submitAddGuestForm();
            });
        }

        const editGuestSubmitBtn = document.getElementById('edit-guest-submit');
        if (editGuestSubmitBtn) {
            editGuestSubmitBtn.addEventListener('click', () => {
                this.submitEditGuestForm();
            });
        }

        // Set up window resize handler for charts
        window.addEventListener('resize', () => {
            // Debounce the resize event
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }

            this.resizeTimeout = setTimeout(() => {
                // Update charts on resize
                if (document.getElementById('analytics-tab').classList.contains('active')) {
                    this.updateCharts({
                        attendingGuests: this.state.guests.filter(guest => guest.hasResponded && guest.response === 'yes').length,
                        notAttendingGuests: this.state.guests.filter(guest => guest.hasResponded && guest.response === 'no').length,
                        notRespondedGuests: this.state.guests.filter(guest => !guest.hasResponded).length,
                        adultCount: this.state.submissions.reduce((sum, submission) => {
                            return submission.attending === 'yes' ? sum + (submission.adultCount || 0) : sum;
                        }, 0),
                        childCount: this.state.submissions.reduce((sum, submission) => {
                            return submission.attending === 'yes' ? sum + (submission.childCount || 0) : sum;
                        }, 0),
                        responseRate: this.state.guests.length > 0 ?
                            Math.round((this.state.guests.filter(guest => guest.hasResponded).length / this.state.guests.length) * 100) : 0,
                        submissions: this.state.submissions
                    });
                }
            }, 250); // Wait 250ms after resize ends
        });

        // Set up refresh data button
        const refreshDataBtn = document.getElementById('refresh-data-btn');
        if (refreshDataBtn) {
            refreshDataBtn.addEventListener('click', () => {
                console.log('Refresh data button clicked');
                this.initDashboard();
            });
        }

        // Note: Refresh data button is already set up above

        // Set up export buttons
        const exportRsvpsBtn = document.getElementById('export-rsvps-btn');
        if (exportRsvpsBtn) {
            exportRsvpsBtn.addEventListener('click', () => {
                this.exportSubmissionsToCSV();
            });
        }

        const exportGuestListBtn = document.getElementById('export-guest-list-btn');
        if (exportGuestListBtn) {
            exportGuestListBtn.addEventListener('click', () => {
                this.exportGuestListToCSV();
            });
        }

        // Set up sync with Google Sheets button
        const syncSheetBtn = document.getElementById('sync-sheet-btn');
        if (syncSheetBtn) {
            syncSheetBtn.addEventListener('click', () => {
                this.syncWithGoogleSheet();
            });
        }

        // Set up add guest button
        const addGuestBtn = document.getElementById('add-guest-btn');
        if (addGuestBtn) {
            addGuestBtn.addEventListener('click', () => {
                this.showAddGuestModal();
            });
        }

        // Note: Add guest and edit guest form submission handlers are already set up above

        // Close modal when clicking outside of it
        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        });

        // Set up debug panel toggle
        const showDebugBtn = document.getElementById('show-debug-btn');
        const toggleDebugBtn = document.getElementById('toggle-debug');
        const debugPanel = document.querySelector('.debug-panel');
        const debugContent = document.querySelector('.debug-content');

        if (showDebugBtn && debugPanel) {
            showDebugBtn.addEventListener('click', () => {
                debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
            });
        }

        if (toggleDebugBtn && debugContent) {
            toggleDebugBtn.addEventListener('click', () => {
                const isHidden = debugContent.style.display === 'none';
                debugContent.style.display = isHidden ? 'block' : 'none';
                toggleDebugBtn.innerHTML = isHidden ? '<i class="fas fa-eye-slash"></i> Hide' : '<i class="fas fa-eye"></i> Show';
            });
        }

        // Set up clear debug button
        const clearDebugBtn = document.getElementById('clear-debug');
        if (clearDebugBtn && this.debug) {
            clearDebugBtn.addEventListener('click', () => {
                this.debug.clear();
            });
        }
    },

    // Show loading state
    showLoading: function() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = '<div class="loading-spinner"></div><p>Loading data...</p>';
            loadingElement.classList.remove('hidden');
        }
    },

    // Hide loading state
    hideLoading: function() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.classList.add('hidden');

            // Show toast notification
            if (typeof ToastSystem !== 'undefined') {
                ToastSystem.success('Data loaded successfully');
            }
        }
    },

    // Show error message
    showError: function(message) {
        // Hide loading indicator
        this.hideLoading();

        // Show toast notification
        if (typeof ToastSystem !== 'undefined') {
            ToastSystem.error(message, 'Error');
        } else {
            console.error('Error:', message);

            // Fallback to alert if toast system is not available
            alert('Error: ' + message);
        }

        // Add retry button
        const dashboardActions = document.querySelector('.dashboard-actions');
        if (dashboardActions) {
            // Check if retry button already exists
            if (!document.getElementById('retry-data-btn')) {
                const retryBtn = document.createElement('button');
                retryBtn.id = 'retry-data-btn';
                retryBtn.className = 'btn warning';
                retryBtn.innerHTML = '<i class="fas fa-sync"></i> Retry Loading';
                retryBtn.addEventListener('click', () => {
                    this.showLoading();
                    this.state.submissionsLoaded = false;
                    this.state.guestListLoaded = false;
                    this.state.loadingError = null;

                    // Remove retry button
                    retryBtn.remove();

                    // Retry fetching data
                    setTimeout(() => {
                        this.fetchSubmissions();
                        this.fetchGuestList();
                    }, 500);
                });
                dashboardActions.appendChild(retryBtn);
            }
        }
    },

    // Fetch submissions from Firestore
    fetchSubmissions: function() {
        console.log('RSVPSystem.fetchSubmissions called');
        try {
            this.debug.info('RSVPSystem.fetchSubmissions called');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Use direct debug if available
        if (window.directDebug) {
            window.directDebug('RSVPSystem.fetchSubmissions called');
        }

        this.showLoading();

        if (!this.state.db) {
            const errorMsg = 'Database connection not available';
            console.error(errorMsg);
            try {
                this.debug.error(errorMsg);
            } catch (e) {
                console.error('Error logging to debug panel:', e);
            }

            if (window.directDebug) {
                window.directDebug(`Error: ${errorMsg}`);
                window.directDebug(`Firebase available: ${typeof firebase !== 'undefined'}`);
                window.directDebug(`Firestore available: ${typeof firebase !== 'undefined' && typeof firebase.firestore === 'function'}`);
                window.directDebug(`Global db available: ${typeof window.db !== 'undefined'}`);
            }

            this.showError(errorMsg);
            return;
        }

        console.log('Fetching from sheetRsvps collection...');
        try {
            this.debug.info('Fetching from sheetRsvps collection...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        if (window.directDebug) {
            window.directDebug('Fetching from sheetRsvps collection...');
        }

        // Add timestamp to track how long the query takes
        const startTime = new Date().getTime();

        // Log the query we're about to make
        if (window.directDebug) {
            window.directDebug('About to execute query: this.state.db.collection("sheetRsvps").orderBy("submittedAt", "desc").get()');
        }

        this.state.db.collection('sheetRsvps').orderBy('submittedAt', 'desc').get()
            .then((querySnapshot) => {
                const endTime = new Date().getTime();
                const queryTime = endTime - startTime;

                console.log(`Query successful, received ${querySnapshot.size} documents in ${queryTime}ms`);
                try {
                    this.debug.info(`Query successful, received ${querySnapshot.size} documents in ${queryTime}ms`);
                } catch (e) {
                    console.error('Error logging to debug panel:', e);
                }

                this.state.submissions = querySnapshot.docs.map(doc => {
                    const data = doc.data() || {};
                    let submittedDate;

                    try {
                        submittedDate = data.submittedAt?.toDate() || new Date();
                    } catch (e) {
                        console.warn(`Error converting timestamp for doc: ${doc.id}`, e);
                        try {
                            this.debug.warn(`Error converting timestamp for doc: ${doc.id}`, e);
                        } catch (e2) {
                            console.error('Error logging to debug panel:', e2);
                        }
                        submittedDate = new Date();
                    }

                    return {
                        id: doc.id,
                        ...data,
                        submittedAt: submittedDate
                    };
                });

                console.log(`Processed submissions data: ${this.state.submissions.length} items`);
                try {
                    this.debug.info(`Processed submissions data: ${this.state.submissions.length} items`);

                    // Log the first submission for debugging
                    if (this.state.submissions.length > 0) {
                        this.debug.debug('First submission sample:', this.state.submissions[0]);
                    }
                } catch (e) {
                    console.error('Error logging to debug panel:', e);
                }

                // Set the submissions loaded flag
                this.state.submissionsLoaded = true;

                // Process the submissions data
                this.processSubmissions();
            })
            .catch((error) => {
                console.error('Error fetching submissions:', error);
                try {
                    this.debug.error('Error fetching submissions:', error);
                } catch (e) {
                    console.error('Error logging to debug panel:', e);
                }

                // Set the error state
                this.state.loadingError = error;
                this.state.submissionsLoaded = true; // Mark as loaded even though it failed

                // Show a detailed error message
                let errorMsg = 'Error loading submissions: ' + error.message;
                if (error.code === 'permission-denied') {
                    errorMsg += '\n\nYou do not have permission to access this data. Please check your login credentials or contact the administrator.';
                }

                this.showError(errorMsg);

                // Try to continue with empty submissions
                this.processSubmissions();
            });
    },

    // Fetch guest list from Firestore
    fetchGuestList: function() {
        console.log('RSVPSystem.fetchGuestList called');
        try {
            this.debug.info('RSVPSystem.fetchGuestList called');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Use direct debug if available
        if (window.directDebug) {
            window.directDebug('RSVPSystem.fetchGuestList called');
        }

        if (!this.state.db) {
            const errorMsg = 'Firestore database is not available for guest list';
            console.error(errorMsg);
            try {
                this.debug.error(errorMsg);
            } catch (e) {
                console.error('Error logging to debug panel:', e);
            }

            if (window.directDebug) {
                window.directDebug(`Error: ${errorMsg}`);
                window.directDebug(`Firebase available: ${typeof firebase !== 'undefined'}`);
                window.directDebug(`Firestore available: ${typeof firebase !== 'undefined' && typeof firebase.firestore === 'function'}`);
                window.directDebug(`Global db available: ${typeof window.db !== 'undefined'}`);
            }

            this.showError(errorMsg);
            return;
        }

        console.log('Fetching from guestList collection...');
        try {
            this.debug.info('Fetching from guestList collection...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        if (window.directDebug) {
            window.directDebug('Fetching from guestList collection...');
        }

        // Add timestamp to track how long the query takes
        const startTime = new Date().getTime();

        // Log the query we're about to make
        if (window.directDebug) {
            window.directDebug('About to execute query: this.state.db.collection("guestList").get()');
        }

        this.state.db.collection('guestList').get()
            .then((querySnapshot) => {
                const endTime = new Date().getTime();
                const queryTime = endTime - startTime;

                console.log(`Guest list query successful, received ${querySnapshot.size} documents in ${queryTime}ms`);
                try {
                    this.debug.info(`Guest list query successful, received ${querySnapshot.size} documents in ${queryTime}ms`);
                } catch (e) {
                    console.error('Error logging to debug panel:', e);
                }

                this.state.guests = querySnapshot.docs.map(doc => {
                    const data = doc.data() || {};
                    return {
                        id: doc.id,
                        name: data.name || '',
                        category: data.category || '',
                        hasResponded: data.hasResponded || false,
                        response: data.response || '',
                        actualGuestCount: data.actualGuestCount || 0,
                        additionalGuests: data.additionalGuests || [],
                        email: data.email || '',
                        phone: data.phone || '',
                        address: data.address || {},
                        submittedAt: data.submittedAt ? new Date(data.submittedAt.seconds * 1000) : null
                    };
                });

                console.log(`Processed guest list data: ${this.state.guests.length} items`);
                try {
                    this.debug.info(`Processed guest list data: ${this.state.guests.length} items`);

                    // Log the first guest for debugging
                    if (this.state.guests.length > 0) {
                        this.debug.debug('First guest sample:', this.state.guests[0]);
                    }
                } catch (e) {
                    console.error('Error logging to debug panel:', e);
                }

                // Set the guest list loaded flag
                this.state.guestListLoaded = true;

                // Process the guest list data
                this.processGuestList();
            })
            .catch((error) => {
                console.error('Error fetching guest list:', error);
                try {
                    this.debug.error('Error fetching guest list:', error);
                } catch (e) {
                    console.error('Error logging to debug panel:', e);
                }

                // Set the error state
                this.state.loadingError = error;
                this.state.guestListLoaded = true; // Mark as loaded even though it failed

                // Show a detailed error message
                let errorMsg = 'Error loading guest list: ' + error.message;
                if (error.code === 'permission-denied') {
                    errorMsg += '\n\nYou do not have permission to access this data. Please check your login credentials or contact the administrator.';
                }

                this.showError(errorMsg);

                // Try to continue with empty guest list
                this.processGuestList();
            });
    },

    // Process submissions data
    processSubmissions: function() {
        console.log('Processing submissions...');
        try {
            this.debug.info('Processing submissions data...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Filter submissions based on search term
        this.state.filteredSubmissions = this.state.submissions.filter(submission => {
            // If there's a search term, filter by it
            if (this.state.searchTerm) {
                const searchTerm = this.state.searchTerm.toLowerCase();
                const name = (submission.name || '').toLowerCase();
                const email = (submission.email || '').toLowerCase();
                const phone = (submission.phone || '').toLowerCase();

                // Check if any of the fields contain the search term
                return name.includes(searchTerm) ||
                       email.includes(searchTerm) ||
                       phone.includes(searchTerm);
            }

            // If no search term, include all submissions
            return true;
        });

        // Sort the filtered submissions
        this.state.filteredSubmissions.sort((a, b) => {
            let valueA, valueB;

            // Determine the values to compare based on the sort column
            switch (this.state.sortColumn) {
                case 'name':
                    valueA = a.name || '';
                    valueB = b.name || '';
                    break;
                case 'email':
                    valueA = a.email || '';
                    valueB = b.email || '';
                    break;
                case 'phone':
                    valueA = a.phone || '';
                    valueB = b.phone || '';
                    break;
                case 'guestCount':
                    valueA = a.guestCount || 0;
                    valueB = b.guestCount || 0;
                    break;
                case 'date':
                    valueA = a.submittedAt || new Date(0);
                    valueB = b.submittedAt || new Date(0);
                    break;
                default:
                    valueA = a.submittedAt || new Date(0);
                    valueB = b.submittedAt || new Date(0);
            }

            // Compare the values based on their type
            let comparison;
            if (typeof valueA === 'string') {
                comparison = valueA.localeCompare(valueB);
            } else if (valueA instanceof Date) {
                comparison = valueA.getTime() - valueB.getTime();
            } else {
                comparison = valueA - valueB;
            }

            // Apply the sort direction
            return this.state.sortDirection === 'asc' ? comparison : -comparison;
        });

        // Calculate total pages
        const totalPages = Math.ceil(this.state.filteredSubmissions.length / this.state.itemsPerPage);

        // Ensure current page is valid
        if (this.state.currentPage > totalPages) {
            this.state.currentPage = Math.max(1, totalPages);
        }

        // Get the current page of submissions
        const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
        const endIndex = startIndex + this.state.itemsPerPage;
        const currentPageSubmissions = this.state.filteredSubmissions.slice(startIndex, endIndex);

        // Update the UI with a simplified version for now
        this.updateSubmissionsTable(currentPageSubmissions, totalPages);
        this.updateStats();

        // Only hide loading if both submissions and guest list are loaded
        if (this.state.submissionsLoaded && this.state.guestListLoaded) {
            this.hideLoading();
        }

        try {
            this.debug.info(`Processed ${this.state.filteredSubmissions.length} submissions, displaying page ${this.state.currentPage} of ${totalPages}`);
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }
    },

    // Process guest list data
    processGuestList: function() {
        console.log('Processing guest list...');
        try {
            this.debug.info('Processing guest list data...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Filter guests based on search term and response filter
        this.state.filteredGuests = this.state.guests.filter(guest => {
            // Apply search filter if there's a search term
            if (this.state.guestSearchTerm) {
                const searchTerm = this.state.guestSearchTerm.toLowerCase();
                const name = (guest.name || '').toLowerCase();
                const email = (guest.email || '').toLowerCase();
                const phone = (guest.phone || '').toLowerCase();

                // Check if any of the fields contain the search term
                const matchesSearch = name.includes(searchTerm) ||
                                     email.includes(searchTerm) ||
                                     phone.includes(searchTerm);

                if (!matchesSearch) return false;
            }

            // Apply response filter
            switch (this.state.responseFilter) {
                case 'responded':
                    return guest.hasResponded === true;
                case 'not-responded':
                    return guest.hasResponded === false;
                case 'attending':
                    return guest.hasResponded === true && guest.response === 'yes';
                case 'not-attending':
                    return guest.hasResponded === true && guest.response === 'no';
                case 'all':
                default:
                    return true;
            }
        });

        // Sort the filtered guests
        this.state.filteredGuests.sort((a, b) => {
            let valueA, valueB;

            // Determine the values to compare based on the sort column
            switch (this.state.guestSortColumn) {
                case 'name':
                    valueA = a.name || '';
                    valueB = b.name || '';
                    break;
                case 'status':
                    valueA = a.hasResponded ? 'Responded' : 'Not Responded';
                    valueB = b.hasResponded ? 'Responded' : 'Not Responded';
                    break;
                case 'response':
                    valueA = a.response || '';
                    valueB = b.response || '';
                    break;
                case 'guestCount':
                    valueA = a.actualGuestCount || 0;
                    valueB = b.actualGuestCount || 0;
                    break;
                case 'location':
                    valueA = (a.address && a.address.state) ? a.address.state : '';
                    valueB = (b.address && b.address.state) ? b.address.state : '';
                    break;
                default:
                    valueA = a.name || '';
                    valueB = b.name || '';
            }

            // Compare the values based on their type
            let comparison;
            if (typeof valueA === 'string') {
                comparison = valueA.localeCompare(valueB);
            } else {
                comparison = valueA - valueB;
            }

            // Apply the sort direction
            return this.state.guestSortDirection === 'asc' ? comparison : -comparison;
        });

        // Calculate total pages
        const totalPages = Math.ceil(this.state.filteredGuests.length / this.state.itemsPerPage);

        // Ensure current page is valid
        if (this.state.guestListPage > totalPages) {
            this.state.guestListPage = Math.max(1, totalPages);
        }

        // Get the current page of guests
        const startIndex = (this.state.guestListPage - 1) * this.state.itemsPerPage;
        const endIndex = startIndex + this.state.itemsPerPage;
        const currentPageGuests = this.state.filteredGuests.slice(startIndex, endIndex);

        // Update the UI
        this.updateGuestListTable(currentPageGuests, totalPages);
        this.updateStats();

        // Only hide loading if both submissions and guest list are loaded
        if (this.state.submissionsLoaded && this.state.guestListLoaded) {
            this.hideLoading();
            if (window.directDebug) {
                window.directDebug('Both submissions and guest list loaded, hiding loading indicator');
            }
        }

        try {
            this.debug.info(`Processed ${this.state.filteredGuests.length} guests, displaying page ${this.state.guestListPage} of ${totalPages}`);
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }
    },

    // Update the submissions table with the current page of submissions
    updateSubmissionsTable: function(submissions, totalPages) {
        try {
            this.debug.info('Updating submissions table...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        const tableContainer = document.getElementById('table-container');
        if (!tableContainer) return;

        // Show the table container
        tableContainer.style.display = 'block';

        // If there are no submissions, show a message
        if (submissions.length === 0) {
            tableContainer.innerHTML = `
                <div class="no-data-message">
                    <p><i class="fas fa-info-circle"></i> No submissions found matching your criteria.</p>
                </div>
            `;
            return;
        }

        // Create the table HTML
        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th class="sortable" data-sort="name">Name <span class="sort-icon ${this.state.sortColumn === 'name' ? 'active' : ''}">${this.state.sortColumn === 'name' ? (this.state.sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span></th>
                        <th class="sortable" data-sort="email">Email <span class="sort-icon ${this.state.sortColumn === 'email' ? 'active' : ''}">${this.state.sortColumn === 'email' ? (this.state.sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span></th>
                        <th class="sortable" data-sort="phone">Phone <span class="sort-icon ${this.state.sortColumn === 'phone' ? 'active' : ''}">${this.state.sortColumn === 'phone' ? (this.state.sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span></th>
                        <th class="sortable" data-sort="guestCount">Guests <span class="sort-icon ${this.state.sortColumn === 'guestCount' ? 'active' : ''}">${this.state.sortColumn === 'guestCount' ? (this.state.sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span></th>
                        <th class="sortable" data-sort="date">Date <span class="sort-icon ${this.state.sortColumn === 'date' ? 'active' : ''}">${this.state.sortColumn === 'date' ? (this.state.sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span></th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Add rows for each submission
        submissions.forEach(submission => {
            const formattedDate = submission.submittedAt ? submission.submittedAt.toLocaleDateString() : 'N/A';
            const formattedTime = submission.submittedAt ? submission.submittedAt.toLocaleTimeString() : '';

            tableHTML += `
                <tr>
                    <td>${submission.name || 'N/A'}</td>
                    <td>${submission.email || 'N/A'}</td>
                    <td>${submission.phone || 'N/A'}</td>
                    <td>${submission.guestCount || 0}</td>
                    <td title="${formattedDate} ${formattedTime}">${formattedDate}</td>
                    <td class="action-column">
                        <button class="btn btn-sm primary view-details" data-id="${submission.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;

        // Add pagination
        if (totalPages > 1) {
            tableHTML += `
                <div class="pagination">
                    <button class="pagination-btn" data-page="prev" ${this.state.currentPage === 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i> Prev
                    </button>
                    <span class="pagination-info">Page ${this.state.currentPage} of ${totalPages}</span>
                    <button class="pagination-btn" data-page="next" ${this.state.currentPage === totalPages ? 'disabled' : ''}>
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            `;
        }

        // Update the table container
        tableContainer.innerHTML = tableHTML;

        // Add event listeners for sorting
        const sortableHeaders = tableContainer.querySelectorAll('th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-sort');
                if (column) {
                    // Toggle sort direction if same column is clicked again
                    if (this.state.sortColumn === column) {
                        this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        this.state.sortColumn = column;
                        this.state.sortDirection = 'asc';
                    }

                    // Process submissions again with new sort
                    this.processSubmissions();
                }
            });
        });

        // Add event listeners for view details buttons
        const viewDetailsButtons = tableContainer.querySelectorAll('.view-details');
        viewDetailsButtons.forEach(button => {
            button.addEventListener('click', () => {
                const submissionId = button.getAttribute('data-id');
                if (submissionId) {
                    this.showSubmissionDetails(submissionId);
                }
            });
        });

        // Add event listeners for pagination
        const paginationButtons = tableContainer.querySelectorAll('.pagination-btn');
        paginationButtons.forEach(button => {
            button.addEventListener('click', () => {
                const page = button.getAttribute('data-page');
                if (page === 'prev' && this.state.currentPage > 1) {
                    this.state.currentPage--;
                    this.processSubmissions();
                } else if (page === 'next' && this.state.currentPage < totalPages) {
                    this.state.currentPage++;
                    this.processSubmissions();
                }
            });
        });

        try {
            this.debug.info(`Updated submissions table with ${submissions.length} rows`);
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }
    },

    // Update the guest list table with the current page of guests
    updateGuestListTable: function(guests, totalPages) {
        try {
            this.debug.info('Updating guest list table...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        const guestListContainer = document.getElementById('guest-list-container');
        if (!guestListContainer) return;

        const guestListBody = document.getElementById('guest-list-body');
        if (!guestListBody) return;

        // If there are no guests, show a message
        if (guests.length === 0) {
            guestListBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center;">
                        <div class="no-data-message">
                            <p><i class="fas fa-info-circle"></i> No guests found matching your criteria.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Create the table rows HTML
        let rowsHTML = '';

        // Add rows for each guest
        guests.forEach(guest => {
            const status = guest.hasResponded ? '<span class="status responded">Responded</span>' : '<span class="status not-responded">Not Responded</span>';
            const response = guest.hasResponded ? (guest.response === 'yes' ? '<span class="response attending">Attending</span>' : '<span class="response not-attending">Not Attending</span>') : '-';
            const location = guest.address && guest.address.state ? `${guest.address.state}` : 'N/A';

            rowsHTML += `
                <tr>
                    <td>${guest.name || 'N/A'}</td>
                    <td>${status}</td>
                    <td>${response}</td>
                    <td>${guest.actualGuestCount || 0}</td>
                    <td>${location}</td>
                    <td class="action-column">
                        <button class="btn btn-sm primary view-guest-details" data-id="${guest.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        });

        // Update the guest list body
        guestListBody.innerHTML = rowsHTML;

        // Add event listeners for view guest details buttons
        const viewGuestDetailsButtons = guestListBody.querySelectorAll('.view-guest-details');
        viewGuestDetailsButtons.forEach(button => {
            button.addEventListener('click', () => {
                const guestId = button.getAttribute('data-id');
                if (guestId) {
                    this.showGuestDetails(guestId);
                }
            });
        });

        // Update pagination if it exists
        const paginationContainer = guestListContainer.querySelector('.guest-list-pagination');
        if (paginationContainer) {
            if (totalPages > 1) {
                paginationContainer.innerHTML = `
                    <button class="pagination-btn" data-page="prev" ${this.state.guestListPage === 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i> Prev
                    </button>
                    <span class="pagination-info">Page ${this.state.guestListPage} of ${totalPages}</span>
                    <button class="pagination-btn" data-page="next" ${this.state.guestListPage === totalPages ? 'disabled' : ''}>
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                `;

                // Add event listeners for pagination
                const paginationButtons = paginationContainer.querySelectorAll('.pagination-btn');
                paginationButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        const page = button.getAttribute('data-page');
                        if (page === 'prev' && this.state.guestListPage > 1) {
                            this.state.guestListPage--;
                            this.processGuestList();
                        } else if (page === 'next' && this.state.guestListPage < totalPages) {
                            this.state.guestListPage++;
                            this.processGuestList();
                        }
                    });
                });
            } else {
                paginationContainer.innerHTML = '';
            }
        }

        try {
            this.debug.info(`Updated guest list table with ${guests.length} rows`);
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }
    },

    // Update the dashboard statistics
    updateStats: function() {
        try {
            this.debug.info('Updating dashboard statistics...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Calculate statistics
        const totalGuests = this.state.guests.length;
        const respondedGuests = this.state.guests.filter(guest => guest.hasResponded).length;
        const notRespondedGuests = totalGuests - respondedGuests;
        const attendingGuests = this.state.guests.filter(guest => guest.hasResponded && guest.response === 'yes').length;
        const notAttendingGuests = this.state.guests.filter(guest => guest.hasResponded && guest.response === 'no').length;

        // Calculate percentages
        const respondedPercent = totalGuests > 0 ? Math.round((respondedGuests / totalGuests) * 100) : 0;
        const notRespondedPercent = totalGuests > 0 ? Math.round((notRespondedGuests / totalGuests) * 100) : 0;
        const attendingPercent = respondedGuests > 0 ? Math.round((attendingGuests / respondedGuests) * 100) : 0;
        const notAttendingPercent = respondedGuests > 0 ? Math.round((notAttendingGuests / respondedGuests) * 100) : 0;

        // Calculate response rate
        const responseRate = totalGuests > 0 ? Math.round((respondedGuests / totalGuests) * 100) : 0;

        // Calculate adult and child counts
        let adultCount = 0;
        let childCount = 0;

        this.state.submissions.forEach(submission => {
            if (submission.attending === 'yes') {
                adultCount += submission.adultCount || 0;
                childCount += submission.childCount || 0;
            }
        });

        const totalAttending = adultCount + childCount;
        const adultPercent = totalAttending > 0 ? Math.round((adultCount / totalAttending) * 100) : 0;
        const childPercent = totalAttending > 0 ? Math.round((childCount / totalAttending) * 100) : 0;

        // Update the UI elements
        this.updateStatElement('response-rate', `${responseRate}%`);
        this.updateStatElement('total-guests-count', totalGuests);
        this.updateStatElement('responded-count', respondedGuests);
        this.updateStatElement('responded-percent', `${respondedPercent}% of total`);
        this.updateStatElement('not-responded-count', notRespondedGuests);
        this.updateStatElement('not-responded-percent', `${notRespondedPercent}% of total`);
        this.updateStatElement('attending-guests-count', attendingGuests);
        this.updateStatElement('attending-guests-percent', `${attendingPercent}% of responded`);
        this.updateStatElement('not-attending-guests-count', notAttendingGuests);
        this.updateStatElement('not-attending-guests-percent', `${notAttendingPercent}% of responded`);
        this.updateStatElement('adults-count', adultCount);
        this.updateStatElement('adults-percent', `${adultPercent}% of total attending`);
        this.updateStatElement('children-count', childCount);
        this.updateStatElement('children-percent', `${childPercent}% of total attending`);

        // Update out-of-town stats
        this.updateOutOfTownStats();

        // Update charts
        this.updateCharts({
            attendingGuests,
            notAttendingGuests,
            notRespondedGuests,
            adultCount,
            childCount,
            responseRate,
            submissions: this.state.submissions
        });

        // Make sure loading is hidden after stats are updated
        if (this.state.submissionsLoaded && this.state.guestListLoaded) {
            this.hideLoading();
            if (window.directDebug) {
                window.directDebug('Stats updated, hiding loading indicator');
            }
        }

        try {
            this.debug.info('Dashboard statistics updated successfully');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }
    },

    // Update all charts with the latest data
    updateCharts: function(data) {
        try {
            this.debug.info('Updating dashboard charts...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Update attendance breakdown chart
        this.updateAttendanceChart(data);

        // Update age breakdown chart
        this.updateAgeBreakdownChart(data);

        // Update timeline chart
        this.updateTimelineChart(data);

        // Update out-of-town events chart
        this.updateOutOfTownEventsChart();

        try {
            this.debug.info('Dashboard charts updated successfully');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }
    },

    // Update the attendance breakdown chart
    updateAttendanceChart: function(data) {
        const chartCanvas = document.getElementById('attendance-chart');
        if (!chartCanvas) return;

        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        // Destroy existing chart if it exists
        if (this.attendanceChart) {
            this.attendanceChart.destroy();
        }

        // Set a fixed size for the canvas
        chartCanvas.style.height = '300px';
        chartCanvas.style.width = '100%';

        // Create the chart
        this.attendanceChart = new Chart(chartCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Attending', 'Not Attending', 'Not Responded'],
                datasets: [{
                    data: [data.attendingGuests, data.notAttendingGuests, data.notRespondedGuests],
                    backgroundColor: ['#4CAF50', '#F44336', '#9E9E9E'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            boxWidth: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    // Update the age breakdown chart
    updateAgeBreakdownChart: function(data) {
        const chartCanvas = document.getElementById('age-breakdown-chart');
        if (!chartCanvas) return;

        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        // Destroy existing chart if it exists
        if (this.ageBreakdownChart) {
            this.ageBreakdownChart.destroy();
        }

        // Set a fixed size for the canvas
        chartCanvas.style.height = '300px';
        chartCanvas.style.width = '100%';

        // Create the chart
        this.ageBreakdownChart = new Chart(chartCanvas, {
            type: 'pie',
            data: {
                labels: ['Adults', 'Children'],
                datasets: [{
                    data: [data.adultCount, data.childCount],
                    backgroundColor: ['#2196F3', '#FF9800'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            boxWidth: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    // Update the submissions timeline chart
    updateTimelineChart: function(data) {
        const chartCanvas = document.getElementById('timeline-chart');
        if (!chartCanvas) return;

        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        // Destroy existing chart if it exists
        if (this.timelineChart) {
            this.timelineChart.destroy();
        }

        // Set a fixed size for the canvas
        chartCanvas.style.height = '300px';
        chartCanvas.style.width = '100%';

        // Group submissions by date
        const submissionsByDate = {};
        const now = new Date();
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

        // Initialize dates for the past month
        for (let d = new Date(oneMonthAgo); d <= now; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            submissionsByDate[dateStr] = 0;
        }

        // Count submissions by date
        data.submissions.forEach(submission => {
            if (submission.submittedAt) {
                const dateStr = submission.submittedAt.toISOString().split('T')[0];
                if (submissionsByDate[dateStr] !== undefined) {
                    submissionsByDate[dateStr]++;
                }
            }
        });

        // Prepare data for the chart
        const labels = Object.keys(submissionsByDate).sort();
        const values = labels.map(date => submissionsByDate[date]);

        // Create the chart
        this.timelineChart = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Submissions',
                    data: values,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgba(75, 192, 192, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxTicksLimit: 10,
                            callback: function(value, index, values) {
                                const date = new Date(labels[index]);
                                return date.getDate() + '/' + (date.getMonth() + 1);
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                const date = new Date(context[0].label);
                                return date.toLocaleDateString();
                            }
                        }
                    }
                }
            }
        });
    },

    // Update the out-of-town events chart
    updateOutOfTownEventsChart: function() {
        const chartCanvas = document.getElementById('out-of-town-events-chart');
        if (!chartCanvas) return;

        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        // Destroy existing chart if it exists
        if (this.outOfTownEventsChart) {
            this.outOfTownEventsChart.destroy();
        }

        // Set a fixed size for the canvas
        chartCanvas.style.height = '300px';
        chartCanvas.style.width = '100%';

        // Count out-of-town guests
        const outOfTownGuests = this.state.guests.filter(guest => {
            return guest.address &&
                   guest.address.state &&
                   guest.address.state.toUpperCase() !== 'CO' &&
                   guest.hasResponded &&
                   guest.response === 'yes';
        }).length;

        // Count guests attending Friday dinner and Sunday brunch
        let fridayDinnerCount = 0;
        let sundayBrunchCount = 0;

        this.state.submissions.forEach(submission => {
            if (submission.attending === 'yes' && submission.outOfTown) {
                if (submission.fridayDinner === 'yes') {
                    fridayDinnerCount += submission.guestCount || 0;
                }
                if (submission.sundayBrunch === 'yes') {
                    sundayBrunchCount += submission.guestCount || 0;
                }
            }
        });

        // Create the chart
        this.outOfTownEventsChart = new Chart(chartCanvas, {
            type: 'bar',
            data: {
                labels: ['Out-of-Town Guests', 'Friday Dinner', 'Sunday Brunch'],
                datasets: [{
                    data: [outOfTownGuests, fridayDinnerCount, sundayBrunchCount],
                    backgroundColor: ['#3F51B5', '#009688', '#FF5722'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    },

    // Update a single stat element
    updateStatElement: function(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    },

    // Update out-of-town guest statistics
    updateOutOfTownStats: function() {
        try {
            this.debug.info('Updating out-of-town statistics...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Count out-of-town guests
        const outOfTownGuests = this.state.guests.filter(guest => {
            return guest.address &&
                   guest.address.state &&
                   guest.address.state.toUpperCase() !== 'CO' &&
                   guest.hasResponded &&
                   guest.response === 'yes';
        }).length;

        // Count guests attending Friday dinner and Sunday brunch
        let fridayDinnerCount = 0;
        let sundayBrunchCount = 0;

        this.state.submissions.forEach(submission => {
            if (submission.attending === 'yes' && submission.outOfTown) {
                if (submission.fridayDinner === 'yes') {
                    fridayDinnerCount += submission.guestCount || 0;
                }
                if (submission.sundayBrunch === 'yes') {
                    sundayBrunchCount += submission.guestCount || 0;
                }
            }
        });

        // Update the UI elements
        this.updateStatElement('out-of-town-count', outOfTownGuests);
        this.updateStatElement('friday-dinner-count', fridayDinnerCount);
        this.updateStatElement('sunday-brunch-count', sundayBrunchCount);

        try {
            this.debug.info(`Out-of-town stats updated: ${outOfTownGuests} guests, ${fridayDinnerCount} for Friday dinner, ${sundayBrunchCount} for Sunday brunch`);
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }
    },

    // Show submission details in a modal
    showSubmissionDetails: function(submissionId) {
        try {
            this.debug.info(`Showing details for submission ID: ${submissionId}`);
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Find the submission by ID
        const submission = this.state.submissions.find(s => s.id === submissionId);
        if (!submission) {
            console.error(`Submission with ID ${submissionId} not found`);
            return;
        }

        // Get the modal elements
        const modal = document.getElementById('rsvp-modal');
        const modalBody = document.getElementById('modal-body');

        if (!modal || !modalBody) {
            console.error('Modal elements not found');
            return;
        }

        // Format the submission date
        const formattedDate = submission.submittedAt ?
            `${submission.submittedAt.toLocaleDateString()} ${submission.submittedAt.toLocaleTimeString()}` :
            'N/A';

        // Create the modal content
        let modalContent = `
            <div class="modal-details">
                <div class="detail-group">
                    <div class="detail-item">
                        <div class="detail-label">Name</div>
                        <div class="detail-value">${submission.name || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Email</div>
                        <div class="detail-value">${submission.email || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Phone</div>
                        <div class="detail-value">${submission.phone || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Submitted At</div>
                        <div class="detail-value">${formattedDate}</div>
                    </div>
                </div>
                <div class="detail-group">
                    <div class="detail-item">
                        <div class="detail-label">Attending</div>
                        <div class="detail-value">${submission.attending === 'yes' ? 'Yes' : 'No'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Total Guests</div>
                        <div class="detail-value">${submission.guestCount || 0}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Adults</div>
                        <div class="detail-value">${submission.adultCount || 0}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Children</div>
                        <div class="detail-value">${submission.childCount || 0}</div>
                    </div>
                </div>
            </div>
        `;

        // Add guest lists if available
        if (submission.adultGuests && submission.adultGuests.length > 0) {
            modalContent += `
                <div class="detail-group">
                    <div class="detail-item">
                        <div class="detail-label">Adult Guests</div>
                        <ul class="guest-list">
                            ${submission.adultGuests.map(guest => `<li>${guest}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        if (submission.childGuests && submission.childGuests.length > 0) {
            modalContent += `
                <div class="detail-group">
                    <div class="detail-item">
                        <div class="detail-label">Child Guests</div>
                        <ul class="guest-list">
                            ${submission.childGuests.map(guest => `<li>${guest}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        // Add out-of-town information if available
        if (submission.outOfTown) {
            modalContent += `
                <div class="detail-group">
                    <div class="detail-item">
                        <div class="detail-label">Out of Town</div>
                        <div class="detail-value">Yes</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Friday Dinner at Linger</div>
                        <div class="detail-value">${submission.fridayDinner === 'yes' ? 'Yes' : 'No'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Sunday Brunch at Eli's</div>
                        <div class="detail-value">${submission.sundayBrunch === 'yes' ? 'Yes' : 'No'}</div>
                    </div>
                </div>
            `;
        }

        // Update the modal body and show the modal
        modalBody.innerHTML = modalContent;
        modal.style.display = 'block';

        try {
            this.debug.info('Submission details displayed successfully');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }
    },

    // Export submissions to CSV
    exportSubmissionsToCSV: function() {
        try {
            this.debug.info('Exporting submissions to CSV...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Check if we have submissions to export
        if (this.state.submissions.length === 0) {
            alert('No submissions to export');
            return;
        }

        // Define the CSV headers
        const headers = [
            'Name',
            'Email',
            'Phone',
            'Attending',
            'Total Guests',
            'Adult Count',
            'Child Count',
            'Adult Guests',
            'Child Guests',
            'Out of Town',
            'Friday Dinner',
            'Sunday Brunch',
            'Submitted At'
        ];

        // Convert submissions to CSV rows
        const rows = this.state.submissions.map(submission => {
            return [
                submission.name || '',
                submission.email || '',
                submission.phone || '',
                submission.attending || '',
                submission.guestCount || 0,
                submission.adultCount || 0,
                submission.childCount || 0,
                (submission.adultGuests || []).join(', '),
                (submission.childGuests || []).join(', '),
                submission.outOfTown ? 'Yes' : 'No',
                submission.fridayDinner === 'yes' ? 'Yes' : 'No',
                submission.sundayBrunch === 'yes' ? 'Yes' : 'No',
                submission.submittedAt ? submission.submittedAt.toLocaleString() : ''
            ];
        });

        // Generate the CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Create a download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `rsvp-submissions-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.display = 'none';
        document.body.appendChild(link);

        // Trigger the download
        link.click();

        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show success message
        const exportSuccess = document.getElementById('export-success');
        if (exportSuccess) {
            exportSuccess.textContent = `Exported ${rows.length} submissions successfully`;
            exportSuccess.style.display = 'inline-block';

            // Hide the message after 3 seconds
            setTimeout(() => {
                exportSuccess.style.display = 'none';
            }, 3000);
        }

        try {
            this.debug.info(`Exported ${rows.length} submissions to CSV`);
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }
    },

    // Export guest list to CSV
    exportGuestListToCSV: function() {
        try {
            this.debug.info('Exporting guest list to CSV...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Check if we have guests to export
        if (this.state.guests.length === 0) {
            alert('No guests to export');
            return;
        }

        // Define the CSV headers
        const headers = [
            'Name',
            'Category',
            'Email',
            'Phone',
            'Status',
            'Response',
            'Guest Count',
            'Additional Guests',
            'Address Line 1',
            'Address Line 2',
            'City',
            'State',
            'Zip',
            'Response Date'
        ];

        // Convert guests to CSV rows
        const rows = this.state.guests.map(guest => {
            return [
                guest.name || '',
                guest.category || '',
                guest.email || '',
                guest.phone || '',
                guest.hasResponded ? 'Responded' : 'Not Responded',
                guest.hasResponded ? (guest.response === 'yes' ? 'Attending' : 'Not Attending') : '',
                guest.actualGuestCount || 0,
                (guest.additionalGuests || []).join(', '),
                guest.address?.line1 || '',
                guest.address?.line2 || '',
                guest.address?.city || '',
                guest.address?.state || '',
                guest.address?.zip || '',
                guest.submittedAt ? guest.submittedAt.toLocaleString() : ''
            ];
        });

        // Generate the CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Create a download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `guest-list-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.display = 'none';
        document.body.appendChild(link);

        // Trigger the download
        link.click();

        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show success message
        const exportSuccess = document.getElementById('export-guest-success');
        if (exportSuccess) {
            exportSuccess.textContent = `Exported ${rows.length} guests successfully`;
            exportSuccess.style.display = 'inline-block';

            // Hide the message after 3 seconds
            setTimeout(() => {
                exportSuccess.style.display = 'none';
            }, 3000);
        }

        try {
            this.debug.info(`Exported ${rows.length} guests to CSV`);
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }
    },

    // Sync with Google Sheets
    syncWithGoogleSheet: function() {
        try {
            this.debug.info('Syncing with Google Sheets...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Show a modal with sync options
        const modal = document.getElementById('sync-modal');
        if (!modal) {
            console.error('Sync modal not found');
            return;
        }

        // Show the modal
        modal.style.display = 'block';

        // Set up event listeners for sync buttons
        const syncToSheetBtn = document.getElementById('sync-to-sheet');
        const syncFromSheetBtn = document.getElementById('sync-from-sheet');

        if (syncToSheetBtn) {
            syncToSheetBtn.onclick = () => {
                this.syncToGoogleSheet();
                modal.style.display = 'none';
            };
        }

        if (syncFromSheetBtn) {
            syncFromSheetBtn.onclick = () => {
                this.syncFromGoogleSheet();
                modal.style.display = 'none';
            };
        }
    },

    // Sync data to Google Sheet
    syncToGoogleSheet: function() {
        try {
            this.debug.info('Syncing data to Google Sheet...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // This would typically call a server-side function to sync data
        // For now, we'll just show a success message
        alert('This feature requires server-side integration with Google Sheets API. It will be implemented in a future update.');
    },

    // Sync data from Google Sheet
    syncFromGoogleSheet: function() {
        try {
            this.debug.info('Syncing data from Google Sheet...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // This would typically call a server-side function to sync data
        // For now, we'll just show a success message
        alert('This feature requires server-side integration with Google Sheets API. It will be implemented in a future update.');
    },

    // Show add guest modal
    showAddGuestModal: function() {
        try {
            this.debug.info('Showing add guest modal...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Get the modal element
        const modal = document.getElementById('add-guest-modal');
        if (!modal) {
            console.error('Add guest modal not found');
            return;
        }

        // Clear the form
        const form = document.getElementById('add-guest-form');
        if (form) {
            form.reset();
        }

        // Show the modal
        modal.style.display = 'block';
    },

    // Submit add guest form
    submitAddGuestForm: function() {
        try {
            this.debug.info('Submitting add guest form...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Get the form values
        const name = document.getElementById('guest-name').value.trim();
        const category = document.getElementById('guest-category').value.trim();
        const email = document.getElementById('guest-email').value.trim();
        const phone = document.getElementById('guest-phone').value.trim();
        const addressLine1 = document.getElementById('guest-address-line1').value.trim();
        const addressLine2 = document.getElementById('guest-address-line2').value.trim();
        const city = document.getElementById('guest-city').value.trim();
        const state = document.getElementById('guest-state').value.trim();
        const zip = document.getElementById('guest-zip').value.trim();

        // Validate the form
        if (!name) {
            alert('Please enter a name');
            return;
        }

        // Create the guest object
        const guest = {
            name,
            category,
            email,
            phone,
            hasResponded: false,
            response: '',
            actualGuestCount: 0,
            additionalGuests: [],
            address: {
                line1: addressLine1,
                line2: addressLine2,
                city,
                state,
                zip
            }
        };

        // Add the guest to Firestore
        if (!this.state.db) {
            alert('Database connection not available');
            return;
        }

        // Show loading indicator
        const addGuestSubmitBtn = document.getElementById('add-guest-submit');
        if (addGuestSubmitBtn) {
            addGuestSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
            addGuestSubmitBtn.disabled = true;
        }

        this.state.db.collection('guestList').add(guest)
            .then((docRef) => {
                try {
                    this.debug.info(`Added guest with ID: ${docRef.id}`);
                } catch (e) {
                    console.error('Error logging to debug panel:', e);
                }

                // Add the ID to the guest object
                guest.id = docRef.id;

                // Add the guest to the local state
                this.state.guests.push(guest);

                // Process the guest list
                this.processGuestList();

                // Close the modal
                const modal = document.getElementById('add-guest-modal');
                if (modal) {
                    modal.style.display = 'none';
                }

                // Show success message
                alert(`Guest "${name}" added successfully`);

                // Reset the button
                if (addGuestSubmitBtn) {
                    addGuestSubmitBtn.innerHTML = 'Add Guest';
                    addGuestSubmitBtn.disabled = false;
                }
            })
            .catch((error) => {
                console.error('Error adding guest:', error);
                try {
                    this.debug.error('Error adding guest:', error);
                } catch (e) {
                    console.error('Error logging to debug panel:', e);
                }

                // Show error message
                alert(`Error adding guest: ${error.message}`);

                // Reset the button
                if (addGuestSubmitBtn) {
                    addGuestSubmitBtn.innerHTML = 'Add Guest';
                    addGuestSubmitBtn.disabled = false;
                }
            });
    },

    // Show edit guest modal
    showEditGuestModal: function(guestId) {
        try {
            this.debug.info(`Showing edit guest modal for ID: ${guestId}`);
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Find the guest by ID
        const guest = this.state.guests.find(g => g.id === guestId);
        if (!guest) {
            console.error(`Guest with ID ${guestId} not found`);
            return;
        }

        // Get the modal element
        const modal = document.getElementById('edit-guest-modal');
        if (!modal) {
            console.error('Edit guest modal not found');
            return;
        }

        // Set the form values
        document.getElementById('edit-guest-id').value = guest.id;
        document.getElementById('edit-guest-name').value = guest.name || '';
        document.getElementById('edit-guest-category').value = guest.category || '';
        document.getElementById('edit-guest-email').value = guest.email || '';
        document.getElementById('edit-guest-phone').value = guest.phone || '';
        document.getElementById('edit-guest-address-line1').value = guest.address?.line1 || '';
        document.getElementById('edit-guest-address-line2').value = guest.address?.line2 || '';
        document.getElementById('edit-guest-city').value = guest.address?.city || '';
        document.getElementById('edit-guest-state').value = guest.address?.state || '';
        document.getElementById('edit-guest-zip').value = guest.address?.zip || '';

        // Set the response status
        const responseStatusSelect = document.getElementById('edit-guest-response-status');
        if (responseStatusSelect) {
            responseStatusSelect.value = guest.hasResponded ? 'responded' : 'not-responded';
        }

        // Set the response
        const responseSelect = document.getElementById('edit-guest-response');
        if (responseSelect) {
            responseSelect.value = guest.response || '';
            responseSelect.disabled = !guest.hasResponded;
        }

        // Set the guest count
        const guestCountInput = document.getElementById('edit-guest-count');
        if (guestCountInput) {
            guestCountInput.value = guest.actualGuestCount || 0;
            guestCountInput.disabled = !guest.hasResponded || guest.response !== 'yes';
        }

        // Set up the response status change event
        if (responseStatusSelect && responseSelect && guestCountInput) {
            responseStatusSelect.onchange = function() {
                const isResponded = this.value === 'responded';
                responseSelect.disabled = !isResponded;
                guestCountInput.disabled = !isResponded || responseSelect.value !== 'yes';
            };

            responseSelect.onchange = function() {
                guestCountInput.disabled = this.value !== 'yes';
            };
        }

        // Show the modal
        modal.style.display = 'block';
    },

    // Submit edit guest form
    submitEditGuestForm: function() {
        try {
            this.debug.info('Submitting edit guest form...');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Get the form values
        const id = document.getElementById('edit-guest-id').value;
        const name = document.getElementById('edit-guest-name').value.trim();
        const category = document.getElementById('edit-guest-category').value.trim();
        const email = document.getElementById('edit-guest-email').value.trim();
        const phone = document.getElementById('edit-guest-phone').value.trim();
        const addressLine1 = document.getElementById('edit-guest-address-line1').value.trim();
        const addressLine2 = document.getElementById('edit-guest-address-line2').value.trim();
        const city = document.getElementById('edit-guest-city').value.trim();
        const state = document.getElementById('edit-guest-state').value.trim();
        const zip = document.getElementById('edit-guest-zip').value.trim();
        const responseStatus = document.getElementById('edit-guest-response-status').value;
        const response = document.getElementById('edit-guest-response').value;
        const guestCount = parseInt(document.getElementById('edit-guest-count').value) || 0;

        // Validate the form
        if (!name) {
            alert('Please enter a name');
            return;
        }

        // Find the guest in the local state
        const guestIndex = this.state.guests.findIndex(g => g.id === id);
        if (guestIndex === -1) {
            alert('Guest not found');
            return;
        }

        // Create the updated guest object
        const updatedGuest = {
            ...this.state.guests[guestIndex],
            name,
            category,
            email,
            phone,
            hasResponded: responseStatus === 'responded',
            response: responseStatus === 'responded' ? response : '',
            actualGuestCount: responseStatus === 'responded' && response === 'yes' ? guestCount : 0,
            address: {
                line1: addressLine1,
                line2: addressLine2,
                city,
                state,
                zip
            }
        };

        // Update the guest in Firestore
        if (!this.state.db) {
            alert('Database connection not available');
            return;
        }

        // Show loading indicator
        const editGuestSubmitBtn = document.getElementById('edit-guest-submit');
        if (editGuestSubmitBtn) {
            editGuestSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            editGuestSubmitBtn.disabled = true;
        }

        this.state.db.collection('guestList').doc(id).update({
            name: updatedGuest.name,
            category: updatedGuest.category,
            email: updatedGuest.email,
            phone: updatedGuest.phone,
            hasResponded: updatedGuest.hasResponded,
            response: updatedGuest.response,
            actualGuestCount: updatedGuest.actualGuestCount,
            address: updatedGuest.address
        })
            .then(() => {
                try {
                    this.debug.info(`Updated guest with ID: ${id}`);
                } catch (e) {
                    console.error('Error logging to debug panel:', e);
                }

                // Update the guest in the local state
                this.state.guests[guestIndex] = updatedGuest;

                // Process the guest list
                this.processGuestList();

                // Close the modal
                const modal = document.getElementById('edit-guest-modal');
                if (modal) {
                    modal.style.display = 'none';
                }

                // Show success message
                alert(`Guest "${name}" updated successfully`);

                // Reset the button
                if (editGuestSubmitBtn) {
                    editGuestSubmitBtn.innerHTML = 'Update Guest';
                    editGuestSubmitBtn.disabled = false;
                }
            })
            .catch((error) => {
                console.error('Error updating guest:', error);
                try {
                    this.debug.error('Error updating guest:', error);
                } catch (e) {
                    console.error('Error logging to debug panel:', e);
                }

                // Show error message
                alert(`Error updating guest: ${error.message}`);

                // Reset the button
                if (editGuestSubmitBtn) {
                    editGuestSubmitBtn.innerHTML = 'Update Guest';
                    editGuestSubmitBtn.disabled = false;
                }
            });
    },

    // Delete a guest
    deleteGuest: function(guestId) {
        try {
            this.debug.info(`Deleting guest with ID: ${guestId}`);
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Find the guest by ID
        const guest = this.state.guests.find(g => g.id === guestId);
        if (!guest) {
            console.error(`Guest with ID ${guestId} not found`);
            return;
        }

        // Confirm deletion
        if (!confirm(`Are you sure you want to delete guest "${guest.name}"?`)) {
            return;
        }

        // Delete the guest from Firestore
        if (!this.state.db) {
            alert('Database connection not available');
            return;
        }

        this.state.db.collection('guestList').doc(guestId).delete()
            .then(() => {
                try {
                    this.debug.info(`Deleted guest with ID: ${guestId}`);
                } catch (e) {
                    console.error('Error logging to debug panel:', e);
                }

                // Remove the guest from the local state
                this.state.guests = this.state.guests.filter(g => g.id !== guestId);

                // Process the guest list
                this.processGuestList();

                // Show success message
                alert(`Guest "${guest.name}" deleted successfully`);
            })
            .catch((error) => {
                console.error('Error deleting guest:', error);
                try {
                    this.debug.error('Error deleting guest:', error);
                } catch (e) {
                    console.error('Error logging to debug panel:', e);
                }

                // Show error message
                alert(`Error deleting guest: ${error.message}`);
            });
    },

    // Show guest details in a modal
    showGuestDetails: function(guestId) {
        try {
            this.debug.info(`Showing details for guest ID: ${guestId}`);
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }

        // Find the guest by ID
        const guest = this.state.guests.find(g => g.id === guestId);
        if (!guest) {
            console.error(`Guest with ID ${guestId} not found`);
            return;
        }

        // Get the modal elements
        const modal = document.getElementById('guest-modal');
        const modalBody = document.getElementById('guest-modal-body');

        if (!modal || !modalBody) {
            console.error('Modal elements not found');
            return;
        }

        // Format the response date
        const formattedDate = guest.submittedAt ?
            `${guest.submittedAt.toLocaleDateString()} ${guest.submittedAt.toLocaleTimeString()}` :
            'N/A';

        // Format the address
        const address = [];
        if (guest.address) {
            if (guest.address.line1) address.push(guest.address.line1);
            if (guest.address.line2) address.push(guest.address.line2);
            if (guest.address.city || guest.address.state) {
                let cityState = [];
                if (guest.address.city) cityState.push(guest.address.city);
                if (guest.address.state) cityState.push(guest.address.state);
                address.push(cityState.join(', '));
            }
            if (guest.address.zip) address.push(guest.address.zip);
        }
        const formattedAddress = address.length > 0 ? address.join('<br>') : 'N/A';

        // Determine if the guest is out of town
        const isOutOfTown = guest.address &&
                           guest.address.state &&
                           guest.address.state.toUpperCase() !== 'CO';

        // Create the modal content
        let modalContent = `
            <div class="modal-details">
                <div class="detail-group">
                    <div class="detail-item">
                        <div class="detail-label">Name</div>
                        <div class="detail-value">${guest.name || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Category</div>
                        <div class="detail-value">${guest.category || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Email</div>
                        <div class="detail-value">${guest.email || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Phone</div>
                        <div class="detail-value">${guest.phone || 'N/A'}</div>
                    </div>
                </div>
                <div class="detail-group">
                    <div class="detail-item">
                        <div class="detail-label">Status</div>
                        <div class="detail-value">
                            ${guest.hasResponded ?
                                '<span class="status responded">Responded</span>' :
                                '<span class="status not-responded">Not Responded</span>'}
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Response</div>
                        <div class="detail-value">
                            ${guest.hasResponded ?
                                (guest.response === 'yes' ?
                                    '<span class="response attending">Attending</span>' :
                                    '<span class="response not-attending">Not Attending</span>') :
                                'N/A'}
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Actual Guest Count</div>
                        <div class="detail-value">${guest.actualGuestCount || 0}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Response Date</div>
                        <div class="detail-value">${formattedDate}</div>
                    </div>
                </div>
            </div>
            <div class="detail-group">
                <div class="detail-item">
                    <div class="detail-label">Address</div>
                    <div class="detail-value address">${formattedAddress}</div>
                </div>
                ${isOutOfTown ? `
                <div class="detail-item">
                    <div class="detail-label">Location</div>
                    <div class="detail-value"><span class="badge out-of-town">Out of Town</span></div>
                </div>` : ''}
            </div>
        `;

        // Add additional guests if available
        if (guest.additionalGuests && guest.additionalGuests.length > 0) {
            modalContent += `
                <div class="detail-group">
                    <div class="detail-item">
                        <div class="detail-label">Additional Guests</div>
                        <ul class="guest-list">
                            ${guest.additionalGuests.map(g => `<li>${g}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        // Add action buttons
        modalContent += `
            <div class="modal-actions">
                <button class="btn primary edit-guest-btn" data-id="${guest.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn danger delete-guest-btn" data-id="${guest.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;

        // Update the modal body and show the modal
        modalBody.innerHTML = modalContent;
        modal.style.display = 'block';

        // Add event listeners for the action buttons
        const editBtn = modalBody.querySelector('.edit-guest-btn');
        const deleteBtn = modalBody.querySelector('.delete-guest-btn');

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                this.showEditGuestModal(guest.id);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                this.deleteGuest(guest.id);
            });
        }

        try {
            this.debug.info('Guest details displayed successfully');
        } catch (e) {
            console.error('Error logging to debug panel:', e);
        }
    }
};

// Initialize the system when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing RSVP System...');
    RSVPSystem.init();
});

// Initialize the dashboard data
RSVPSystem.initDashboard = function() {
    console.log('Initializing dashboard data...');

    // Use direct debug if available
    if (window.directDebug) {
        window.directDebug('Initializing dashboard data...');
    }

    // Reset loading state
    this.state.submissionsLoaded = false;
    this.state.guestListLoaded = false;
    this.state.loadingError = null;

    // Show loading indicator
    this.showLoading();

    // Check if Firebase is available
    if (window.directDebug) {
        window.directDebug(`Firebase available: ${typeof firebase !== 'undefined'}`);
        window.directDebug(`Firestore available: ${typeof firebase !== 'undefined' && typeof firebase.firestore === 'function'}`);
        window.directDebug(`Global db available: ${typeof window.db !== 'undefined'}`);
        window.directDebug(`RSVPSystem.state.db available: ${this.state.db !== null}`);
    }

    // Fetch data immediately
    console.log('Fetching submissions and guest list...');
    this.fetchSubmissions();
    this.fetchGuestList();

    // Add a safety timeout to hide the loading indicator after 30 seconds
    // in case something goes wrong with the data loading
    setTimeout(() => {
        const loadingElement = document.getElementById('loading');
        if (loadingElement && !loadingElement.classList.contains('hidden')) {
            console.log('Safety timeout reached, hiding loading indicator');
            this.hideLoading();

            // Show error toast
            if (typeof ToastSystem !== 'undefined') {
                ToastSystem.warning('Loading took longer than expected. Some data might not be available.', 'Timeout');
            }
        }
    }, 30000);
};

// Expose functions globally for the login script
window.fetchSubmissions = function() {
    console.log('Global fetchSubmissions called, delegating to RSVPSystem');
    RSVPSystem.fetchSubmissions();
};

window.fetchGuestList = function() {
    console.log('Global fetchGuestList called, delegating to RSVPSystem');
    RSVPSystem.fetchGuestList();
};
