// Simple login script for RSVP dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    try {
        if (typeof firebase !== 'undefined' && typeof firebase.firestore === 'function') {
            // Initialize Firestore
            const db = firebase.firestore();

            // Make window.db available globally
            if (!window.db) {
                window.db = db;
                console.log('Global window.db set');
            }

            // Initialize RSVPSystem if available
            if (typeof RSVPSystem !== 'undefined' && RSVPSystem.state) {
                RSVPSystem.state.db = db;
                console.log('Set RSVPSystem.state.db');
            }
        }
    } catch (error) {
        console.error('Error initializing Firebase:', error);
    }

    // Get DOM elements
    const loginForm = document.getElementById('login-form');
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const errorMessage = document.getElementById('login-error-message');

    if (!loginForm) {
        console.error('Login form not found');
        return;
    }

    // Handle form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Login form submitted');

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const submitButton = loginForm.querySelector('button[type="submit"]');

        // Basic validation
        if (!email || !password) {
            showError('Please enter both email and password');
            return;
        }

        // Show loading state
        if (submitButton) {
            submitButton.classList.add('loading');
        }

        // Clear previous errors
        hideError();

        console.log('Attempting to sign in with:', email);

        // Sign in with Firebase
        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log('Login successful:', userCredential.user.uid);

                // Show dashboard
                if (loginSection && dashboardSection) {
                    loginSection.style.display = 'none';
                    dashboardSection.classList.remove('hidden');
                }

                // Reset form
                loginForm.reset();

                // Load dashboard data
                console.log('Loading dashboard data after successful login');

                // Use a small delay to ensure the RSVP system is fully initialized
                setTimeout(function() {
                    if (typeof RSVPSystem !== 'undefined' && typeof RSVPSystem.initDashboard === 'function') {
                        console.log('Calling RSVPSystem.initDashboard...');
                        RSVPSystem.initDashboard();
                    } else if (typeof fetchSubmissions === 'function' && typeof fetchGuestList === 'function') {
                        console.log('Calling individual fetch functions...');
                        fetchSubmissions();
                        fetchGuestList();
                    } else {
                        console.error('Dashboard initialization functions are not available');
                    }
                }, 1000);
            })
            .catch((error) => {
                console.error('Login error:', error.code, error.message);

                let errorMsg = 'Login failed. Please check your email and password.';

                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    errorMsg = 'Invalid email or password. Please try again.';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMsg = 'Too many failed login attempts. Please try again later.';
                } else if (error.code === 'auth/network-request-failed') {
                    errorMsg = 'Network error. Please check your internet connection.';
                }

                showError(errorMsg);
            })
            .finally(() => {
                // Remove loading state
                if (submitButton) {
                    submitButton.classList.remove('loading');
                }
            });
    });

    // Handle logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            console.log('Logout button clicked');

            // Show loading state
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
            logoutBtn.disabled = true;

            firebase.auth().signOut()
                .then(() => {
                    console.log('Logout successful');

                    // Show login form
                    if (dashboardSection && loginSection) {
                        dashboardSection.classList.add('hidden');
                        loginSection.style.display = 'block';
                    }
                })
                .catch((error) => {
                    console.error('Logout error:', error);
                    alert('Error signing out. Please try again.');
                })
                .finally(() => {
                    // Reset logout button
                    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                    logoutBtn.disabled = false;
                });
        });
    }

    // Check if user is already logged in
    firebase.auth().onAuthStateChanged(function(user) {
        console.log('Auth state changed:', user ? 'User logged in' : 'No user');

        if (user) {
            // User is signed in
            if (loginSection && dashboardSection) {
                loginSection.style.display = 'none';
                dashboardSection.classList.remove('hidden');

                // Initialize RSVPSystem if available
                if (typeof RSVPSystem !== 'undefined' && typeof RSVPSystem.initDashboard === 'function') {
                    console.log('Initializing dashboard from auth state change');
                    setTimeout(() => {
                        RSVPSystem.initDashboard();
                    }, 500);
                }
            }

            // Load dashboard data
            console.log('Auth state changed - Loading dashboard data');

            // Use a longer delay to ensure the RSVP system is fully initialized
            // Also add retry logic in case the system isn't ready yet
            let retryCount = 0;
            const maxRetries = 5;
            const retryDelay = 1000; // 1 second

            function tryLoadData() {
                if (typeof RSVPSystem !== 'undefined' && RSVPSystem.state && RSVPSystem.state.db) {
                    // Use the new initDashboard function if available
                    if (typeof RSVPSystem.initDashboard === 'function') {
                        RSVPSystem.initDashboard();
                    } else {
                        // Fall back to individual fetch functions
                        RSVPSystem.fetchSubmissions();
                        RSVPSystem.fetchGuestList();
                    }
                } else if (typeof fetchSubmissions === 'function' && typeof fetchGuestList === 'function') {
                    // Use global fetch functions
                    fetchSubmissions();
                    fetchGuestList();
                } else {
                    // Retry if we haven't reached the maximum number of retries
                    retryCount++;
                    if (retryCount < maxRetries) {
                        setTimeout(tryLoadData, retryDelay);
                    } else {
                        alert('Error: Could not initialize the dashboard. Please try refreshing the page.');
                    }
                }
            }

            // Start the retry process after a short delay
            setTimeout(tryLoadData, 1000);
        } else {
            // User is signed out
            console.log('Auth state changed - User is signed out');

            // Show login form
            if (dashboardSection && loginSection) {
                dashboardSection.classList.add('hidden');
                loginSection.style.display = 'block';
            }
        }
    });

    // Helper functions
    function showError(message) {
        if (errorMessage) {
            errorMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
            // Use a small timeout to ensure the display change happens before other style changes
            setTimeout(() => {
                errorMessage.classList.add('visible');
            }, 10);
        }
        console.error('Error:', message);
    }

    function hideError() {
        if (errorMessage) {
            errorMessage.classList.remove('visible');
            // Clear the content after the transition completes
            setTimeout(() => {
                if (!errorMessage.classList.contains('visible')) {
                    errorMessage.innerHTML = '';
                }
            }, 300); // Match the transition duration in CSS
        }
    }
});
