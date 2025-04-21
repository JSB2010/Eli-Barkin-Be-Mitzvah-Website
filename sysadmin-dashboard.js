/**
 * Sysadmin Dashboard System
 * Provides monitoring and analytics for all connected services
 */

// Create a namespace for the Sysadmin Dashboard
const SysadminDashboard = {
    // Internal state
    state: {
        db: null,
        currentTab: 'rsvp-tab',
        analyticsTimeframe: 30,
        logFilter: 'all',
        logs: [],
        currentLogPage: 1,
        logsPerPage: 20,
        apiKeys: {
            github: null,
            googleAnalytics: {
                viewId: null,
                clientId: null,
                clientSecret: null
            },
            cloudflare: {
                email: null,
                apiKey: null,
                zoneId: null
            },
            brevo: null
        },
        charts: {}
    },

    // Initialize the dashboard
    init: function() {
        console.log('Sysadmin Dashboard initializing...');

        // Initialize Firestore connection
        try {
            this.state.db = firebase.firestore();
            console.log('Firestore initialized for Sysadmin Dashboard');
        } catch (error) {
            console.error('Error initializing Firestore for Sysadmin Dashboard:', error);
        }

        // Check authentication status
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                console.log('User is authenticated, loading API keys');
                // Load saved API keys
                this.loadApiKeys();
            } else {
                console.log('User is not authenticated, using default API keys');
                // Use the API keys that were pre-filled
                this.updateApiKeyStatus();
            }
        });

        // Set up event listeners
        this.setupEventListeners();

        // Initialize authentication
        this.initAuth();

        console.log('Sysadmin Dashboard initialized');
    },

    // Initialize authentication
    initAuth: function() {
        // Set up authentication UI
        const authSection = document.getElementById('auth-section');
        if (authSection) {
            // Check if user is already logged in
            const user = firebase.auth().currentUser;
            if (user) {
                authSection.innerHTML = `
                    <div class="auth-status">
                        <span class="status-indicator online"><i class="fas fa-circle"></i> Logged in as ${user.email}</span>
                        <button id="logout-btn" class="btn btn-outline-danger btn-sm">Logout</button>
                    </div>
                `;

                // Add logout event listener
                document.getElementById('logout-btn').addEventListener('click', () => {
                    firebase.auth().signOut().then(() => {
                        console.log('User signed out');
                        this.updateAuthUI();
                    }).catch(error => {
                        console.error('Error signing out:', error);
                    });
                });

                // Initialize API keys in Firebase if needed
                this.initializeApiKeysInFirebase();
            } else {
                authSection.innerHTML = `
                    <div class="auth-status">
                        <span class="status-indicator warning"><i class="fas fa-circle"></i> Not logged in</span>
                        <button id="login-btn" class="btn btn-primary btn-sm">Login</button>
                    </div>
                `;

                // Add login event listener
                document.getElementById('login-btn').addEventListener('click', () => {
                    // Use email/password authentication
                    const email = prompt('Enter your email:');
                    const password = prompt('Enter your password:');

                    if (email && password) {
                        firebase.auth().signInWithEmailAndPassword(email, password)
                            .then(userCredential => {
                                console.log('User logged in:', userCredential.user);
                                this.updateAuthUI();
                                this.loadApiKeys(); // Load API keys after login
                                this.initializeApiKeysInFirebase(); // Initialize API keys if needed
                            })
                            .catch(error => {
                                console.error('Error logging in:', error);
                                ToastSystem.error('Login failed: ' + error.message, 'Authentication Error');
                            });
                    }
                });
            }
        }
    },

    // Initialize API keys in Firebase
    initializeApiKeysInFirebase: function() {
        try {
            // Call the Firebase function to initialize API keys
            const initializeApiKeys = firebase.functions().httpsCallable('initializeApiKeys');
            initializeApiKeys().then(result => {
                console.log('API keys initialization result:', result.data);
                // Load the API keys after initialization
                this.loadApiKeys();
            }).catch(error => {
                console.error('Error initializing API keys:', error);
            });
        } catch (error) {
            console.error('Error in initializeApiKeysInFirebase:', error);
        }
    },

    // Update authentication UI based on current auth state
    updateAuthUI: function() {
        const authSection = document.getElementById('auth-section');
        if (!authSection) return;

        const user = firebase.auth().currentUser;
        if (user) {
            authSection.innerHTML = `
                <div class="auth-status">
                    <span class="status-indicator online"><i class="fas fa-circle"></i> Logged in as ${user.email}</span>
                    <button id="logout-btn" class="btn btn-outline-danger btn-sm">Logout</button>
                </div>
            `;

            // Add logout event listener
            document.getElementById('logout-btn').addEventListener('click', () => {
                firebase.auth().signOut().then(() => {
                    console.log('User signed out');
                    this.updateAuthUI();
                }).catch(error => {
                    console.error('Error signing out:', error);
                });
            });
        } else {
            authSection.innerHTML = `
                <div class="auth-status">
                    <span class="status-indicator warning"><i class="fas fa-circle"></i> Not logged in</span>
                    <button id="login-btn" class="btn btn-primary btn-sm">Login</button>
                </div>
            `;

            // Add login event listener
            document.getElementById('login-btn').addEventListener('click', () => {
                // Use email/password authentication
                const email = prompt('Enter your email:');
                const password = prompt('Enter your password:');

                if (email && password) {
                    firebase.auth().signInWithEmailAndPassword(email, password)
                        .then(userCredential => {
                            console.log('User logged in:', userCredential.user);
                            this.updateAuthUI();
                            this.loadApiKeys(); // Load API keys after login
                        })
                        .catch(error => {
                            console.error('Error logging in:', error);
                            ToastSystem.error('Login failed: ' + error.message, 'Authentication Error');
                        });
                }
            });
        }
    },

    // Load API keys from Firebase
    loadApiKeys: function() {
        try {
            // Check if user is authenticated
            const user = firebase.auth().currentUser;
            if (!user) {
                console.log('User not authenticated, cannot load API keys');
                return;
            }

            // Call the Firebase function to get API keys
            const getApiKeys = firebase.functions().httpsCallable('getApiKeys');
            getApiKeys().then(result => {
                this.state.apiKeys = result.data;
                console.log('API keys loaded from Firebase');
                this.updateApiKeyFields();
                this.updateApiKeyStatus();
            }).catch(error => {
                console.error('Error loading API keys from Firebase:', error);
                ToastSystem.error('Failed to load API configuration', 'Error');
            });
        } catch (error) {
            console.error('Error in loadApiKeys:', error);
        }
    },

    // Save API keys to Firebase
    saveApiKeys: function() {
        try {
            // Check if user is authenticated
            const user = firebase.auth().currentUser;
            if (!user) {
                ToastSystem.error('You must be logged in to save API keys', 'Authentication Required');
                return;
            }

            // Get values from form fields
            this.state.apiKeys.github = document.getElementById('github-token').value.trim();

            this.state.apiKeys.googleAnalytics.viewId = document.getElementById('ga-view-id').value.trim();
            this.state.apiKeys.googleAnalytics.clientId = document.getElementById('ga-client-id').value.trim();
            this.state.apiKeys.googleAnalytics.clientSecret = document.getElementById('ga-client-secret').value.trim();

            this.state.apiKeys.cloudflare.email = document.getElementById('cloudflare-email').value.trim();
            this.state.apiKeys.cloudflare.apiKey = document.getElementById('cloudflare-api-key').value.trim();
            this.state.apiKeys.cloudflare.zoneId = document.getElementById('cloudflare-zone-id').value.trim();

            this.state.apiKeys.brevo = document.getElementById('brevo-api-key').value.trim();

            // Call the Firebase function to store API keys
            const storeApiKeys = firebase.functions().httpsCallable('storeApiKeys');
            storeApiKeys(this.state.apiKeys).then(result => {
                console.log('API keys saved to Firebase:', result);

                // Update status indicators
                this.updateApiKeyStatus();

                // Show success message
                ToastSystem.success('API configuration saved successfully', 'Configuration Saved');

                // Refresh data with new API keys
                this.refreshAllData();
            }).catch(error => {
                console.error('Error saving API keys to Firebase:', error);
                ToastSystem.error('Failed to save API configuration', 'Error');
            });
        } catch (error) {
            console.error('Error in saveApiKeys:', error);
            ToastSystem.error('Failed to save API configuration', 'Error');
        }
    },

    // Update API key form fields with saved values
    updateApiKeyFields: function() {
        // GitHub
        if (this.state.apiKeys.github) {
            document.getElementById('github-token').value = this.state.apiKeys.github;
        }

        // Google Analytics
        if (this.state.apiKeys.googleAnalytics.viewId) {
            document.getElementById('ga-view-id').value = this.state.apiKeys.googleAnalytics.viewId;
        }
        if (this.state.apiKeys.googleAnalytics.clientId) {
            document.getElementById('ga-client-id').value = this.state.apiKeys.googleAnalytics.clientId;
        }
        if (this.state.apiKeys.googleAnalytics.clientSecret) {
            document.getElementById('ga-client-secret').value = this.state.apiKeys.googleAnalytics.clientSecret;
        }

        // Cloudflare
        if (this.state.apiKeys.cloudflare.email) {
            document.getElementById('cloudflare-email').value = this.state.apiKeys.cloudflare.email;
        }
        if (this.state.apiKeys.cloudflare.apiKey) {
            document.getElementById('cloudflare-api-key').value = this.state.apiKeys.cloudflare.apiKey;
        }
        if (this.state.apiKeys.cloudflare.zoneId) {
            document.getElementById('cloudflare-zone-id').value = this.state.apiKeys.cloudflare.zoneId;
        }

        // Brevo
        if (this.state.apiKeys.brevo) {
            document.getElementById('brevo-api-key').value = this.state.apiKeys.brevo;
        }
    },

    // Update API key status indicators
    updateApiKeyStatus: function() {
        this.updateSingleApiStatus('github-api-status', !!this.state.apiKeys.github);

        // Google Analytics - all three fields must be present
        const gaConfigured = !!(this.state.apiKeys.googleAnalytics.viewId &&
                             this.state.apiKeys.googleAnalytics.clientId &&
                             this.state.apiKeys.googleAnalytics.clientSecret);
        this.updateSingleApiStatus('ga-api-status', gaConfigured);

        // Cloudflare - all three fields must be present
        const cfConfigured = !!(this.state.apiKeys.cloudflare.email &&
                             this.state.apiKeys.cloudflare.apiKey &&
                             this.state.apiKeys.cloudflare.zoneId);
        this.updateSingleApiStatus('cloudflare-api-status', cfConfigured);

        // Brevo
        this.updateSingleApiStatus('brevo-api-status', !!this.state.apiKeys.brevo);
    },

    // Helper function to update a single API status indicator
    updateSingleApiStatus: function(elementId, isConfigured) {
        const statusElement = document.getElementById(elementId);
        if (!statusElement) return;

        const statusHtml = isConfigured
            ? '<span class="status-indicator online"><i class="fas fa-circle"></i> Configured</span>'
            : '<span class="status-indicator warning"><i class="fas fa-circle"></i> Not Configured</span>';

        statusElement.innerHTML = statusHtml;
    },

    // Set up event listeners
    setupEventListeners: function() {
        // Tab switching
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });

        // Refresh sysadmin data
        const refreshButton = document.getElementById('refresh-sysadmin-btn');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshAllData();
            });
        }

        // Analytics timeframe selector
        const timeframeSelector = document.getElementById('analytics-timeframe');
        if (timeframeSelector) {
            timeframeSelector.addEventListener('change', (e) => {
                this.state.analyticsTimeframe = parseInt(e.target.value);
                this.loadAnalyticsData();
            });
        }

        // Log filter selector
        const logFilter = document.getElementById('log-filter');
        if (logFilter) {
            logFilter.addEventListener('change', (e) => {
                this.state.logFilter = e.target.value;
                this.filterLogs();
            });
        }

        // Save API configuration button
        const saveApiConfigBtn = document.getElementById('save-api-config-btn');
        if (saveApiConfigBtn) {
            saveApiConfigBtn.addEventListener('click', () => {
                this.saveApiKeys();
            });
        }

        // Toggle password visibility buttons
        const togglePasswordButtons = document.querySelectorAll('.toggle-password');
        togglePasswordButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-target');
                const inputField = document.getElementById(targetId);

                if (inputField) {
                    // Toggle between password and text type
                    if (inputField.type === 'password') {
                        inputField.type = 'text';
                        button.innerHTML = '<i class="fas fa-eye-slash"></i>';
                    } else {
                        inputField.type = 'password';
                        button.innerHTML = '<i class="fas fa-eye"></i>';
                    }
                }
            });
        });
    },

    // Switch between tabs
    switchTab: function(tabId) {
        // Update state
        this.state.currentTab = tabId;

        // Update UI
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        // Update active tab button
        tabButtons.forEach(button => {
            if (button.getAttribute('data-tab') === tabId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        // Update active tab content
        tabContents.forEach(content => {
            if (content.id === tabId) {
                content.classList.add('active');

                // Load data for the tab if it's the sysadmin tab
                if (tabId === 'sysadmin-tab') {
                    this.loadSysadminData();
                }
            } else {
                content.classList.remove('active');
            }
        });
    },

    // Load all sysadmin data
    loadSysadminData: function() {
        console.log('Loading sysadmin data...');

        // Check system status
        this.checkSystemStatus();

        // Load analytics data
        this.loadAnalyticsData();

        // Load Firebase usage data
        this.loadFirebaseData();

        // Load email notification data
        this.loadEmailData();

        // Load GitHub repository data
        this.loadGitHubData();

        // Load Cloudflare analytics
        this.loadCloudflareData();

        // Load Google Sheets integration data
        this.loadSheetsData();

        // Load system logs
        this.loadSystemLogs();
    },

    // Refresh all data
    refreshAllData: function() {
        console.log('Refreshing all sysadmin data...');

        // Show loading indicators
        this.showLoadingIndicators();

        // Load all data
        this.loadSysadminData();
    },

    // Show loading indicators for all sections
    showLoadingIndicators: function() {
        // Set all stat values to loading spinner
        const statValues = document.querySelectorAll('#sysadmin-tab .stat-value');
        statValues.forEach(statValue => {
            statValue.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
        });

        // Set all table bodies to loading message
        document.getElementById('commits-table-body').innerHTML = '<tr><td colspan="4" class="text-center">Loading commit history...</td></tr>';
        document.getElementById('sync-history-body').innerHTML = '<tr><td colspan="4" class="text-center">Loading sync history...</td></tr>';
        document.getElementById('logs-table-body').innerHTML = '<tr><td colspan="4" class="text-center">Loading system logs...</td></tr>';
    },

    // Check system status
    checkSystemStatus: function() {
        console.log('Checking system status...');

        // Check Cloudflare status
        this.checkServiceStatus('cloudflare-status', 'Cloudflare', true);

        // Check Firebase status
        this.checkFirebaseStatus();

        // Check GitHub status
        this.checkGitHubStatus();

        // Check Google Analytics status
        this.checkAnalyticsStatus();

        // Check Google Sheets status
        this.checkSheetsStatus();

        // Check Brevo status
        this.checkBrevoStatus();
    },

    // Generic service status check
    checkServiceStatus: function(elementId, serviceName, assumeOnline = false) {
        const statusElement = document.getElementById(elementId);
        if (!statusElement) return;

        if (assumeOnline) {
            // For services we can't directly check, assume they're online
            statusElement.querySelector('.stat-value').innerHTML =
                '<span class="status-indicator online"><i class="fas fa-circle"></i> Available</span>';
        } else {
            statusElement.querySelector('.stat-value').innerHTML =
                '<span class="status-indicator warning"><i class="fas fa-circle"></i> Unknown</span>';
        }
    },

    // Check Firebase connection status
    checkFirebaseStatus: function() {
        const statusElement = document.getElementById('firebase-status');
        if (!statusElement) return;

        try {
            // Check if Firestore is initialized
            if (this.state.db) {
                // Try a simple query to verify connection
                this.state.db.collection('sheetRsvps').limit(1).get()
                    .then(() => {
                        statusElement.querySelector('.stat-value').innerHTML =
                            '<span class="status-indicator online"><i class="fas fa-circle"></i> Online</span>';
                    })
                    .catch(error => {
                        console.error('Firebase connection error:', error);
                        statusElement.querySelector('.stat-value').innerHTML =
                            '<span class="status-indicator offline"><i class="fas fa-circle"></i> Error</span>';
                    });
            } else {
                statusElement.querySelector('.stat-value').innerHTML =
                    '<span class="status-indicator offline"><i class="fas fa-circle"></i> Not Connected</span>';
            }
        } catch (error) {
            console.error('Error checking Firebase status:', error);
            statusElement.querySelector('.stat-value').innerHTML =
                '<span class="status-indicator offline"><i class="fas fa-circle"></i> Error</span>';
        }
    },

    // Check GitHub repository status
    checkGitHubStatus: function() {
        const statusElement = document.getElementById('github-status');
        if (!statusElement) return;

        // Use GitHub API to check repository status
        const headers = {};
        if (this.state.apiKeys.github) {
            headers.Authorization = `token ${this.state.apiKeys.github}`;
        }

        fetch('https://api.github.com/repos/JSB2010/Eli-Barkin-Be-Mitzvah-Website', { headers })
            .then(response => {
                if (response.ok) {
                    statusElement.querySelector('.stat-value').innerHTML =
                        '<span class="status-indicator online"><i class="fas fa-circle"></i> Available</span>';
                } else {
                    statusElement.querySelector('.stat-value').innerHTML =
                        '<span class="status-indicator warning"><i class="fas fa-circle"></i> Limited</span>';
                }
            })
            .catch(error => {
                console.error('GitHub API error:', error);
                statusElement.querySelector('.stat-value').innerHTML =
                    '<span class="status-indicator offline"><i class="fas fa-circle"></i> Unavailable</span>';
            });
    },

    // Check Google Analytics status
    checkAnalyticsStatus: function() {
        const statusElement = document.getElementById('analytics-status');
        if (!statusElement) return;

        // Since we can't directly check GA status, we'll check if the GA script is loaded
        if (typeof gtag === 'function') {
            statusElement.querySelector('.stat-value').innerHTML =
                '<span class="status-indicator online"><i class="fas fa-circle"></i> Connected</span>';
        } else {
            statusElement.querySelector('.stat-value').innerHTML =
                '<span class="status-indicator warning"><i class="fas fa-circle"></i> Not Detected</span>';
        }
    },



    // Check Google Sheets integration status
    checkSheetsStatus: function() {
        const statusElement = document.getElementById('sheets-status');
        if (!statusElement) return;

        // Check if we have a recent sync record in Firestore
        if (this.state.db) {
            this.state.db.collection('syncHistory')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get()
                .then(snapshot => {
                    if (!snapshot.empty) {
                        const lastSync = snapshot.docs[0].data();
                        const syncTime = lastSync.timestamp.toDate();
                        const now = new Date();
                        const hoursSinceSync = (now - syncTime) / (1000 * 60 * 60);

                        if (hoursSinceSync < 24) {
                            statusElement.querySelector('.stat-value').innerHTML =
                                '<span class="status-indicator online"><i class="fas fa-circle"></i> Connected</span>';
                        } else {
                            statusElement.querySelector('.stat-value').innerHTML =
                                '<span class="status-indicator warning"><i class="fas fa-circle"></i> Stale</span>';
                        }
                    } else {
                        statusElement.querySelector('.stat-value').innerHTML =
                            '<span class="status-indicator warning"><i class="fas fa-circle"></i> No Sync Data</span>';
                    }
                })
                .catch(error => {
                    console.error('Error checking Sheets status:', error);
                    statusElement.querySelector('.stat-value').innerHTML =
                        '<span class="status-indicator offline"><i class="fas fa-circle"></i> Error</span>';
                });
        } else {
            statusElement.querySelector('.stat-value').innerHTML =
                '<span class="status-indicator offline"><i class="fas fa-circle"></i> Not Connected</span>';
        }
    },

    // Check Brevo email service status
    checkBrevoStatus: function() {
        const statusElement = document.getElementById('brevo-status');
        if (!statusElement) return;

        // Check if we have recent email logs in Firestore
        if (this.state.db) {
            this.state.db.collection('emailLogs')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get()
                .then(snapshot => {
                    if (!snapshot.empty) {
                        const lastEmail = snapshot.docs[0].data();
                        const emailTime = lastEmail.timestamp.toDate();
                        const now = new Date();
                        const daysSinceEmail = (now - emailTime) / (1000 * 60 * 60 * 24);

                        if (daysSinceEmail < 7) {
                            statusElement.querySelector('.stat-value').innerHTML =
                                '<span class="status-indicator online"><i class="fas fa-circle"></i> Active</span>';
                        } else {
                            statusElement.querySelector('.stat-value').innerHTML =
                                '<span class="status-indicator warning"><i class="fas fa-circle"></i> Inactive</span>';
                        }
                    } else {
                        statusElement.querySelector('.stat-value').innerHTML =
                            '<span class="status-indicator warning"><i class="fas fa-circle"></i> No Email Data</span>';
                    }
                })
                .catch(error => {
                    console.error('Error checking Brevo status:', error);
                    statusElement.querySelector('.stat-value').innerHTML =
                        '<span class="status-indicator offline"><i class="fas fa-circle"></i> Error</span>';
                });
        } else {
            statusElement.querySelector('.stat-value').innerHTML =
                '<span class="status-indicator offline"><i class="fas fa-circle"></i> Not Connected</span>';
        }
    },

    // Load analytics data
    loadAnalyticsData: function() {
        console.log('Loading analytics data...');

        // Set sample data for analytics (in a real implementation, this would come from Google Analytics API)
        this.setSampleAnalyticsData();

        // Create analytics charts
        this.createAnalyticsCharts();
    },

    // Set sample analytics data
    setSampleAnalyticsData: function() {
        // Set visitors count
        const visitorsCard = document.getElementById('visitors-card');
        if (visitorsCard) {
            visitorsCard.querySelector('.stat-value').innerHTML = '1,245';
        }

        // Set pageviews count
        const pageviewsCard = document.getElementById('pageviews-card');
        if (pageviewsCard) {
            pageviewsCard.querySelector('.stat-value').innerHTML = '3,872';
        }

        // Set average time on site
        const avgTimeCard = document.getElementById('avg-time-card');
        if (avgTimeCard) {
            avgTimeCard.querySelector('.stat-value').innerHTML = '2:34';
        }

        // Set bounce rate
        const bounceRateCard = document.getElementById('bounce-rate-card');
        if (bounceRateCard) {
            bounceRateCard.querySelector('.stat-value').innerHTML = '42.8%';
        }
    },

    // Create analytics charts
    createAnalyticsCharts: function() {
        // Create visitors chart
        this.createVisitorsChart();

        // Create pages chart
        this.createPagesChart();

        // Create sources chart
        this.createSourcesChart();

        // Create devices chart
        this.createDevicesChart();
    },

    // Create visitors over time chart
    createVisitorsChart: function() {
        const ctx = document.getElementById('visitors-chart');
        if (!ctx) return;

        // Sample data for visitors over time
        const labels = [];
        const data = [];

        // Generate last 30 days of data
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

            // Generate random visitor count between 20 and 80
            data.push(Math.floor(Math.random() * 60) + 20);
        }

        // Create the chart and store it in state
        if (this.state.charts.visitorsChart) {
            this.state.charts.visitorsChart.destroy();
        }

        this.state.charts.visitorsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Visitors',
                    data: data,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    },

    // Create top pages chart
    createPagesChart: function() {
        const ctx = document.getElementById('pages-chart');
        if (!ctx) return;

        // Sample data for top pages
        const data = {
            labels: ['Home', 'RSVP', 'Journey', 'Game Day', 'Family'],
            datasets: [{
                label: 'Page Views',
                data: [1245, 986, 742, 651, 248],
                backgroundColor: [
                    '#2563eb',
                    '#3b82f6',
                    '#60a5fa',
                    '#93c5fd',
                    '#bfdbfe'
                ],
                borderWidth: 0
            }]
        };

        // Create the chart and store it in state
        if (this.state.charts.pagesChart) {
            this.state.charts.pagesChart.destroy();
        }

        this.state.charts.pagesChart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    },

    // Create traffic sources chart
    createSourcesChart: function() {
        const ctx = document.getElementById('sources-chart');
        if (!ctx) return;

        // Sample data for traffic sources
        const data = {
            labels: ['Direct', 'Email', 'Social', 'Search', 'Referral'],
            datasets: [{
                data: [45, 25, 15, 10, 5],
                backgroundColor: [
                    '#2563eb',
                    '#f97316',
                    '#10b981',
                    '#ef4444',
                    '#8b5cf6'
                ],
                borderWidth: 0
            }]
        };

        // Create the chart and store it in state
        if (this.state.charts.sourcesChart) {
            this.state.charts.sourcesChart.destroy();
        }

        this.state.charts.sourcesChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                },
                cutout: '70%'
            }
        });
    },

    // Create devices breakdown chart
    createDevicesChart: function() {
        const ctx = document.getElementById('devices-chart');
        if (!ctx) return;

        // Sample data for devices
        const data = {
            labels: ['Mobile', 'Desktop', 'Tablet'],
            datasets: [{
                data: [65, 30, 5],
                backgroundColor: [
                    '#2563eb',
                    '#f97316',
                    '#10b981'
                ],
                borderWidth: 0
            }]
        };

        // Create the chart and store it in state
        if (this.state.charts.devicesChart) {
            this.state.charts.devicesChart.destroy();
        }

        this.state.charts.devicesChart = new Chart(ctx, {
            type: 'pie',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    },

    // Load Firebase usage data
    loadFirebaseData: function() {
        console.log('Loading Firebase data...');

        // Set sample Firebase usage data
        document.getElementById('db-reads-card').querySelector('.stat-value').innerHTML = '12,456';
        document.getElementById('db-writes-card').querySelector('.stat-value').innerHTML = '3,872';
        document.getElementById('function-calls-card').querySelector('.stat-value').innerHTML = '1,245';
        document.getElementById('storage-used-card').querySelector('.stat-value').innerHTML = '128 MB';

        // Create Firebase charts
        this.createFirebaseCharts();
    },

    // Create Firebase charts
    createFirebaseCharts: function() {
        const dbOpsCtx = document.getElementById('db-ops-chart');
        if (dbOpsCtx) {
            // Destroy existing chart if it exists
            if (this.state.charts.dbOpsChart) {
                this.state.charts.dbOpsChart.destroy();
            }

            // Create and store the new chart
            this.state.charts.dbOpsChart = new Chart(dbOpsCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [
                        {
                            label: 'Reads',
                            data: [1200, 1900, 3000, 5000, 8000, 12456],
                            borderColor: '#2563eb',
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true
                        },
                        {
                            label: 'Writes',
                            data: [800, 1200, 1800, 2400, 3000, 3872],
                            borderColor: '#f97316',
                            backgroundColor: 'rgba(249, 115, 22, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        const functionExecCtx = document.getElementById('function-exec-chart');
        if (functionExecCtx) {
            // Destroy existing chart if it exists
            if (this.state.charts.functionExecChart) {
                this.state.charts.functionExecChart.destroy();
            }

            // Create and store the new chart
            this.state.charts.functionExecChart = new Chart(functionExecCtx, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [
                        {
                            label: 'Function Executions',
                            data: [200, 350, 500, 750, 900, 1245],
                            backgroundColor: '#10b981',
                            borderWidth: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    },

    // Load email notification data
    loadEmailData: function() {
        console.log('Loading email data...');

        // Set sample email data
        document.getElementById('emails-sent-card').querySelector('.stat-value').innerHTML = '156';
        document.getElementById('delivery-rate-card').querySelector('.stat-value').innerHTML = '99.4%';
        document.getElementById('open-rate-card').querySelector('.stat-value').innerHTML = '68.2%';
        document.getElementById('click-rate-card').querySelector('.stat-value').innerHTML = '42.3%';

        // Create email charts
        this.createEmailCharts();
    },

    // Create email charts
    createEmailCharts: function() {
        const activityCtx = document.getElementById('email-activity-chart');
        if (activityCtx) {
            // Destroy existing chart if it exists
            if (this.state.charts.emailActivityChart) {
                this.state.charts.emailActivityChart.destroy();
            }

            // Create and store the new chart
            this.state.charts.emailActivityChart = new Chart(activityCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [
                        {
                            label: 'Emails Sent',
                            data: [12, 19, 32, 45, 48, 56],
                            borderColor: '#2563eb',
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        const performanceCtx = document.getElementById('email-performance-chart');
        if (performanceCtx) {
            // Destroy existing chart if it exists
            if (this.state.charts.emailPerformanceChart) {
                this.state.charts.emailPerformanceChart.destroy();
            }

            // Create and store the new chart
            this.state.charts.emailPerformanceChart = new Chart(performanceCtx, {
                type: 'bar',
                data: {
                    labels: ['Delivered', 'Opened', 'Clicked'],
                    datasets: [
                        {
                            label: 'Percentage',
                            data: [99.4, 68.2, 42.3],
                            backgroundColor: ['#10b981', '#f97316', '#2563eb'],
                            borderWidth: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
        }
    },

    // Load GitHub repository data
    loadGitHubData: function() {
        console.log('Loading GitHub data...');

        // Set sample GitHub data
        document.getElementById('commits-card').querySelector('.stat-value').innerHTML = '128';
        document.getElementById('branches-card').querySelector('.stat-value').innerHTML = '3';
        document.getElementById('contributors-card').querySelector('.stat-value').innerHTML = '2';
        document.getElementById('last-commit-card').querySelector('.stat-value').innerHTML = '2 days ago';

        // Load recent commits
        this.loadRecentCommits();
    },

    // Load recent commits
    loadRecentCommits: function() {
        const commitsTableBody = document.getElementById('commits-table-body');
        if (!commitsTableBody) return;

        // Prepare headers for GitHub API
        const headers = {};
        if (this.state.apiKeys.github) {
            headers.Authorization = `token ${this.state.apiKeys.github}`;
        }

        // Fetch recent commits from GitHub API
        fetch('https://api.github.com/repos/JSB2010/Eli-Barkin-Be-Mitzvah-Website/commits', { headers })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(commits => {
                if (!commits || commits.length === 0) {
                    commitsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No commits found</td></tr>';
                    return;
                }

                // Clear the table
                commitsTableBody.innerHTML = '';

                // Add the commits to the table (limit to 5)
                const maxCommits = Math.min(commits.length, 5);
                for (let i = 0; i < maxCommits; i++) {
                    const commit = commits[i];
                    const date = new Date(commit.commit.author.date);
                    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${formattedDate}</td>
                        <td>${commit.commit.author.name}</td>
                        <td>${commit.commit.message}</td>
                        <td>${commit.sha.substring(0, 7)}</td>
                    `;

                    commitsTableBody.appendChild(row);
                }

                // Update GitHub stats
                this.updateGitHubStats(commits);
            })
            .catch(error => {
                console.error('Error fetching commits:', error);
                commitsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Error loading commits</td></tr>';
            });
    },

    // Update GitHub stats based on commit data
    updateGitHubStats: function(commits) {
        if (!commits || commits.length === 0) return;

        // Update total commits count
        const commitsCard = document.getElementById('commits-card');
        if (commitsCard) {
            // We don't know the total count from the API response, so we'll use the count we have
            commitsCard.querySelector('.stat-value').innerHTML = commits.length + '+';
        }

        // Update last commit time
        const lastCommitCard = document.getElementById('last-commit-card');
        if (lastCommitCard && commits[0]) {
            const lastCommitDate = new Date(commits[0].commit.author.date);
            const now = new Date();
            const diffTime = Math.abs(now - lastCommitDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            let timeAgo;
            if (diffDays > 0) {
                timeAgo = diffDays + (diffDays === 1 ? ' day' : ' days') + ' ago';
            } else {
                timeAgo = diffHours + (diffHours === 1 ? ' hour' : ' hours') + ' ago';
            }

            lastCommitCard.querySelector('.stat-value').innerHTML = timeAgo;
        }

        // Get unique contributors
        const contributorsSet = new Set();
        commits.forEach(commit => {
            // Use optional chaining for cleaner code
            if (commit?.author?.login) {
                contributorsSet.add(commit.author.login);
            } else if (commit?.commit?.author?.name) {
                contributorsSet.add(commit.commit.author.name);
            }
        });

        // Update contributors count
        const contributorsCard = document.getElementById('contributors-card');
        if (contributorsCard) {
            contributorsCard.querySelector('.stat-value').innerHTML = contributorsSet.size;
        }
    },

    // Load Cloudflare analytics
    loadCloudflareData: function() {
        console.log('Loading Cloudflare data...');

        // Set sample Cloudflare data
        document.getElementById('bandwidth-card').querySelector('.stat-value').innerHTML = '2.4 GB';
        document.getElementById('requests-card').querySelector('.stat-value').innerHTML = '15,782';
        document.getElementById('cache-rate-card').querySelector('.stat-value').innerHTML = '94.2%';
        document.getElementById('performance-score-card').querySelector('.stat-value').innerHTML = '98/100';

        // Create Cloudflare charts
        this.createCloudflareCharts();
    },

    // Create Cloudflare charts
    createCloudflareCharts: function() {
        const trafficCtx = document.getElementById('traffic-chart');
        if (trafficCtx) {
            // Destroy existing chart if it exists
            if (this.state.charts.trafficChart) {
                this.state.charts.trafficChart.destroy();
            }

            // Create and store the new chart
            this.state.charts.trafficChart = new Chart(trafficCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [
                        {
                            label: 'Requests',
                            data: [1200, 2500, 5000, 8000, 12000, 15782],
                            borderColor: '#2563eb',
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        const statusCodesCtx = document.getElementById('status-codes-chart');
        if (statusCodesCtx) {
            // Destroy existing chart if it exists
            if (this.state.charts.statusCodesChart) {
                this.state.charts.statusCodesChart.destroy();
            }

            // Create and store the new chart
            this.state.charts.statusCodesChart = new Chart(statusCodesCtx, {
                type: 'doughnut',
                data: {
                    labels: ['200 OK', '304 Not Modified', '404 Not Found', 'Other'],
                    datasets: [
                        {
                            data: [85, 10, 3, 2],
                            backgroundColor: ['#10b981', '#f97316', '#ef4444', '#8b5cf6'],
                            borderWidth: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    },
                    cutout: '70%'
                }
            });
        }
    },

    // Load Google Sheets integration data
    loadSheetsData: function() {
        console.log('Loading Sheets data...');

        // Set sample Sheets data
        document.getElementById('sheet-rows-card').querySelector('.stat-value').innerHTML = '324';
        document.getElementById('last-sync-card').querySelector('.stat-value').innerHTML = '2 hours ago';
        document.getElementById('sync-status-card').querySelector('.stat-value').innerHTML = '<span class="status-indicator online"><i class="fas fa-circle"></i> Synced</span>';
        document.getElementById('api-quota-card').querySelector('.stat-value').innerHTML = '98.5%';

        // Load sync history
        this.loadSyncHistory();
    },

    // Load sync history
    loadSyncHistory: function() {
        const syncHistoryBody = document.getElementById('sync-history-body');
        if (!syncHistoryBody) return;

        // Sample sync history data
        const syncHistory = [
            { date: new Date(Date.now() - 2 * 60 * 60 * 1000), status: 'Success', records: 324, duration: '3.2s' },
            { date: new Date(Date.now() - 26 * 60 * 60 * 1000), status: 'Success', records: 320, duration: '3.1s' },
            { date: new Date(Date.now() - 50 * 60 * 60 * 1000), status: 'Success', records: 318, duration: '3.0s' },
            { date: new Date(Date.now() - 74 * 60 * 60 * 1000), status: 'Warning', records: 315, duration: '4.5s' },
            { date: new Date(Date.now() - 98 * 60 * 60 * 1000), status: 'Success', records: 312, duration: '3.1s' }
        ];

        // Clear the table
        syncHistoryBody.innerHTML = '';

        // Add the sync history to the table
        syncHistory.forEach(sync => {
            const formattedDate = sync.date.toLocaleDateString() + ' ' + sync.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>
                    <span class="status-indicator ${sync.status === 'Success' ? 'online' : 'warning'}">
                        <i class="fas fa-circle"></i> ${sync.status}
                    </span>
                </td>
                <td>${sync.records}</td>
                <td>${sync.duration}</td>
            `;

            syncHistoryBody.appendChild(row);
        });
    },

    // Load system logs
    loadSystemLogs: function() {
        console.log('Loading system logs...');

        // Sample log data
        this.state.logs = [
            { timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), level: 'info', source: 'Firebase', message: 'RSVP submission received' },
            { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), level: 'info', source: 'Sheets', message: 'Sync completed successfully' },
            { timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), level: 'info', source: 'Brevo', message: 'Email notification sent' },
            { timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), level: 'warning', source: 'Firebase', message: 'High read operations detected' },
            { timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), level: 'error', source: 'Sheets', message: 'API quota exceeded' },
            { timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), level: 'info', source: 'Firebase', message: 'RSVP submission received' },
            { timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), level: 'info', source: 'Cloudflare', message: 'Cache purged' },
            { timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000), level: 'warning', source: 'Brevo', message: 'Email delivery delayed' },
            { timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), level: 'info', source: 'Firebase', message: 'RSVP submission received' },
            { timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000), level: 'error', source: 'Firebase', message: 'Function execution failed' }
        ];

        // Filter and display logs
        this.filterLogs();
    },

    // Filter logs based on selected level
    filterLogs: function() {
        const logsTableBody = document.getElementById('logs-table-body');
        if (!logsTableBody) return;

        // Filter logs based on selected level
        let filteredLogs = [];
        switch (this.state.logFilter) {
            case 'error':
                filteredLogs = this.state.logs.filter(log => log.level === 'error');
                break;
            case 'warning':
                filteredLogs = this.state.logs.filter(log => log.level === 'error' || log.level === 'warning');
                break;
            case 'info':
                filteredLogs = this.state.logs.filter(log => log.level === 'error' || log.level === 'warning' || log.level === 'info');
                break;
            default:
                filteredLogs = this.state.logs;
        }

        // Clear the table
        logsTableBody.innerHTML = '';

        if (filteredLogs.length === 0) {
            logsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No logs found</td></tr>';
            return;
        }

        // Get paginated logs
        const startIndex = (this.state.currentLogPage - 1) * this.state.logsPerPage;
        const endIndex = startIndex + this.state.logsPerPage;
        const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

        // Add the logs to the table
        paginatedLogs.forEach(log => {
            const formattedDate = log.timestamp.toLocaleDateString() + ' ' + log.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            const row = document.createElement('tr');
            // Determine status indicator class based on log level
            let statusClass = 'online';
            if (log.level === 'error') {
                statusClass = 'offline';
            } else if (log.level === 'warning') {
                statusClass = 'warning';
            }

            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>
                    <span class="status-indicator ${statusClass}">
                        <i class="fas fa-circle"></i> ${log.level}
                    </span>
                </td>
                <td>${log.source}</td>
                <td>${log.message}</td>
            `;

            logsTableBody.appendChild(row);
        });

        // Update pagination
        this.updateLogsPagination(filteredLogs.length);
    },

    // Update logs pagination
    updateLogsPagination: function(totalLogs) {
        const paginationContainer = document.getElementById('logs-pagination');
        if (!paginationContainer) return;

        // Calculate total pages
        const totalPages = Math.ceil(totalLogs / this.state.logsPerPage);

        // Clear pagination container
        paginationContainer.innerHTML = '';

        // Create pagination elements
        const paginationInfo = document.createElement('div');
        paginationInfo.className = 'pagination-info';
        paginationInfo.textContent = `Showing ${Math.min(totalLogs, this.state.logsPerPage)} of ${totalLogs} logs`;

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        // Previous button
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-btn';
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.disabled = this.state.currentLogPage === 1;
        prevButton.addEventListener('click', () => {
            if (this.state.currentLogPage > 1) {
                this.state.currentLogPage--;
                this.filterLogs();
            }
        });

        // Next button
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-btn';
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.disabled = this.state.currentLogPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (this.state.currentLogPage < totalPages) {
                this.state.currentLogPage++;
                this.filterLogs();
            }
        });

        // Add buttons to container
        buttonContainer.appendChild(prevButton);
        buttonContainer.appendChild(nextButton);

        // Add elements to pagination container
        const paginationButtons = document.createElement('div');
        paginationButtons.className = 'pagination-buttons';
        paginationButtons.appendChild(paginationInfo);
        paginationButtons.appendChild(buttonContainer);

        paginationContainer.appendChild(paginationButtons);
    }
};

// Initialize the dashboard when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the Sysadmin Dashboard
    SysadminDashboard.init();
});
