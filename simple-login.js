// Simple login script for RSVP dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('Simple login script loaded');

    // Get DOM elements
    const loginForm = document.getElementById('login-form');
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const errorMessage = document.getElementById('error-message');

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
                    dashboardSection.style.display = 'block';
                }

                // Reset form
                loginForm.reset();

                // Load dashboard data
                console.log('Loading dashboard data after successful login');

                // Use a small delay to ensure the RSVP system is fully initialized
                setTimeout(function() {
                    if (typeof fetchSubmissions === 'function') {
                        console.log('Calling fetchSubmissions...');
                        fetchSubmissions();
                    } else {
                        console.error('fetchSubmissions function is not available');
                    }

                    if (typeof fetchGuestList === 'function') {
                        console.log('Calling fetchGuestList...');
                        fetchGuestList();
                    } else {
                        console.error('fetchGuestList function is not available');
                    }
                }, 500);
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
                        dashboardSection.style.display = 'none';
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
                dashboardSection.style.display = 'block';
            }

            // Load dashboard data
            console.log('Auth state changed - Loading dashboard data');

            // Use a small delay to ensure the RSVP system is fully initialized
            setTimeout(function() {
                if (typeof fetchSubmissions === 'function') {
                    console.log('Auth state changed - Calling fetchSubmissions...');
                    fetchSubmissions();
                } else {
                    console.error('Auth state changed - fetchSubmissions function is not available');
                }

                if (typeof fetchGuestList === 'function') {
                    console.log('Auth state changed - Calling fetchGuestList...');
                    fetchGuestList();
                } else {
                    console.error('Auth state changed - fetchGuestList function is not available');
                }
            }, 500);
        } else {
            // User is signed out
            if (dashboardSection && loginSection) {
                dashboardSection.style.display = 'none';
                loginSection.style.display = 'block';
            }
        }
    });

    // Helper functions
    function showError(message) {
        if (errorMessage) {
            errorMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
            errorMessage.classList.add('visible');
            errorMessage.style.display = 'flex';
            errorMessage.style.opacity = '1';
            errorMessage.style.height = 'auto';
        }
        console.error('Error:', message);
    }

    function hideError() {
        if (errorMessage) {
            errorMessage.classList.remove('visible');
            errorMessage.style.display = 'none';
            errorMessage.style.opacity = '0';
            errorMessage.style.height = '0';
            errorMessage.innerHTML = '';
        }
    }
});
