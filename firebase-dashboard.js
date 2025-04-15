// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Dashboard elements
    const syncSheetBtn = document.getElementById('sync-sheet-btn');
    const toggleGuestListBtn = document.getElementById('toggle-guest-list-btn');
    const toggleSubmissionsBtn = document.getElementById('toggle-submissions-btn');
    const guestListContainer = document.getElementById('guest-list-container');
    const tableContainer = document.getElementById('table-container');

    // Toggle sections
    if (toggleGuestListBtn) {
        toggleGuestListBtn.addEventListener('click', function() {
            if (guestListContainer.classList.contains('hidden')) {
                guestListContainer.classList.remove('hidden');
                toggleGuestListBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Guest List';
            } else {
                guestListContainer.classList.add('hidden');
                toggleGuestListBtn.innerHTML = '<i class="fas fa-eye"></i> Show Guest List';
            }
        });
    }

    if (toggleSubmissionsBtn) {
        toggleSubmissionsBtn.addEventListener('click', function() {
            if (tableContainer.classList.contains('hidden')) {
                tableContainer.classList.remove('hidden');
                toggleSubmissionsBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Submissions';
            } else {
                tableContainer.classList.add('hidden');
                toggleSubmissionsBtn.innerHTML = '<i class="fas fa-eye"></i> Show Submissions';
            }
        });
    }
    // Get DOM elements
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const logoutBtn = document.getElementById('logout-btn');
    const loadingElement = document.getElementById('loading');
    // tableContainer is already defined above
    const submissionsBody = document.getElementById('submissions-body');
    const totalSubmissionsElement = document.getElementById('total-submissions');
    const attendingCountElement = document.getElementById('attending-count');
    const notAttendingCountElement = document.getElementById('not-attending-count');
    const totalGuestsElement = document.getElementById('total-guests');
    const searchBox = document.getElementById('search-box');
    const filterDropdown = document.getElementById('filter-dropdown');
    const exportBtn = document.getElementById('export-btn');
    const paginationContainer = document.getElementById('pagination');

    // Store submissions data
    let allSubmissions = [];
    let filteredSubmissions = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentSort = { field: 'submittedAt', direction: 'desc' };
    const EXPECTED_TOTAL_INVITES = 300; // Approximate number of expected invites

    // Store guest list data
    let allGuests = [];
    let filteredGuests = [];
    let guestListPage = 1;
    let guestListSort = { field: 'name', direction: 'asc' };
    let guestCategories = new Set(); // Unique categories

    // Handle login form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const submitButton = loginForm.querySelector('button[type="submit"]');

        // Validate inputs
        if (!email || !password) {
            errorMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> Please enter both email and password`;
            errorMessage.style.display = 'block';
            return;
        }

        // Show loading state
        submitButton.classList.add('loading');

        // Clear previous error messages
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';

        // Add a small delay to show the loading state (better UX)
        setTimeout(() => {
            // Sign in with Firebase Authentication
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Login successful

                    // Store login state in session storage
                    try {
                        sessionStorage.setItem('rsvp_dashboard_logged_in', 'true');
                    } catch (e) {
                        console.warn('Could not save login state to session storage', e);
                    }

                    // Show dashboard
                    loginSection.style.display = 'none';
                    dashboardSection.style.display = 'block';

                    // Reset form
                    loginForm.reset();

                    // Fetch RSVP submissions
                    fetchSubmissions();
                })
                .catch((error) => {
                    console.error('Login error:', error);

                    // Show appropriate error message
                    let errorMsg = 'Invalid email or password';

                    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                        errorMsg = 'Invalid email or password. Please try again.';
                    } else if (error.code === 'auth/too-many-requests') {
                        errorMsg = 'Too many failed login attempts. Please try again later.';
                    } else if (error.code === 'auth/network-request-failed') {
                        errorMsg = 'Network error. Please check your internet connection.';
                    } else if (error.message) {
                        errorMsg = error.message;
                    }

                    errorMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${errorMsg}`;
                    errorMessage.style.display = 'block';
                })
                .finally(() => {
                    // Remove loading state
                    submitButton.classList.remove('loading');
                });
        }, 500); // Small delay for better UX
    });

    // Handle logout
    logoutBtn.addEventListener('click', function() {
        // Show loading state
        logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
        logoutBtn.disabled = true;

        firebase.auth().signOut()
            .then(() => {
                // Logout successful, show login form
                dashboardSection.style.display = 'none';
                loginSection.style.display = 'block';

                // Clear session storage
                try {
                    sessionStorage.removeItem('rsvp_dashboard_logged_in');
                } catch (e) {
                    console.warn('Could not clear session storage', e);
                }
            })
            .catch((error) => {
                console.error('Logout error:', error);
                alert('Error signing out. Please try again.');
            })
            .finally(() => {
                // Reset the logout button
                logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                logoutBtn.disabled = false;
            });
    });

    // Check if Firebase Auth is available
    if (!firebase.auth) {
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'none';
        document.body.innerHTML = '<div style="text-align: center; padding: 2rem;"><h2>Error</h2><p>Firebase Authentication is not available. Please check your Firebase configuration.</p></div>';
        return;
    }

    // Set persistence to SESSION (survives page refreshes but not closing the browser tab)
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION)
        .catch((error) => {
            console.error('Error setting auth persistence:', error);
        });

    // Check if user is already logged in
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in, show dashboard
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';

            // Fetch RSVP submissions and guest list
            fetchSubmissions();
            fetchGuestList();
        } else {
            // User is signed out, show login form
            dashboardSection.style.display = 'none';

            // Add a subtle animation to the login container
            setTimeout(() => {
                const loginContainer = document.querySelector('.login-container');
                if (loginContainer) {
                    loginContainer.style.opacity = '0';
                    loginContainer.style.transform = 'translateY(20px)';

                    setTimeout(() => {
                        loginContainer.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                        loginContainer.style.opacity = '1';
                        loginContainer.style.transform = 'translateY(0)';
                    }, 50);
                }
            }, 100);
            loginSection.style.display = 'block';
        }
    });

    // Fetch submissions from Firestore
    function fetchSubmissions() {
        loadingElement.style.display = 'block';
        tableContainer.style.display = 'none';

        // Check if Firestore is available
        if (!db) {
            loadingElement.innerHTML = '<p><i class="fas fa-exclamation-triangle"></i> Error: Firestore database is not available. Please check your Firebase configuration.</p>';
            return;
        }

        // Add retry functionality
        let retryCount = 0;
        const maxRetries = 5; // Increase max retries from 3 to 5

        function attemptFetch() {
            db.collection('sheetRsvps').orderBy('submittedAt', 'desc').get()
                .then((querySnapshot) => {
                    allSubmissions = querySnapshot.docs.map(doc => {
                        // Safely extract data
                        const data = doc.data() || {};
                        let submittedDate;

                        // Safely convert timestamp
                        try {
                            submittedDate = data.submittedAt?.toDate() || new Date();
                        } catch (e) {
                            console.warn('Error converting timestamp for doc:', doc.id, e);
                            submittedDate = new Date();
                        }

                        return {
                            id: doc.id,
                            ...data,
                            submittedAt: submittedDate
                        };
                    });

                    // Process submissions
                    processSubmissions();

                    // If we have data, store it in localStorage as a backup
                    if (allSubmissions.length > 0) {
                        try {
                            // Store only essential data to avoid storage limits
                            const essentialData = allSubmissions.map(s => ({
                                id: s.id,
                                name: s.name,
                                email: s.email,
                                attending: s.attending,
                                guestCount: s.guestCount,
                                submittedAt: s.submittedAt.getTime() // Store as timestamp
                            }));
                            localStorage.setItem('sheet_rsvp_backup_data', JSON.stringify(essentialData));
                        } catch (e) {
                            console.warn('Could not save backup data to localStorage', e);
                        }
                    }
                })
                .catch((error) => {
                    console.error('Error fetching submissions:', error);

                    // Check if it's a network error
                    const isNetworkError = error.code === 'unavailable' ||
                                          error.message.includes('network') ||
                                          error.message.includes('connection') ||
                                          error.name === 'FirebaseError';

                    if (retryCount < maxRetries) {
                        // Retry with exponential backoff
                        retryCount++;
                        // Longer delay for network errors
                        const delay = Math.pow(2, retryCount) * (isNetworkError ? 1500 : 1000); // 3s, 6s, 12s, 24s, 48s for network errors

                        // Show more detailed error message
                        loadingElement.innerHTML = `
                            <div class="loading-spinner"></div>
                            <p>${isNetworkError ? 'Network connection issue' : 'Error connecting to database'}.
                               Retrying in ${Math.round(delay/1000)} seconds... (Attempt ${retryCount}/${maxRetries})</p>
                            <p class="error-details">${error.message || 'Unknown error'}</p>
                        `;

                        setTimeout(attemptFetch, delay);
                    } else {
                        // Max retries reached, try to load from backup
                        loadingElement.innerHTML = `
                            <p><i class="fas fa-exclamation-triangle"></i> Error loading submissions from server after ${maxRetries} attempts.</p>
                            <p class="error-details">${error.message || 'Unknown error'}</p>
                            <button id="retry-fetch-btn" class="btn secondary"><i class="fas fa-sync-alt"></i> Try Again</button>
                        `;

                        // Add event listener to retry button
                        const retryButton = document.getElementById('retry-fetch-btn');
                        if (retryButton) {
                            retryButton.addEventListener('click', function() {
                                retryCount = 0; // Reset retry count
                                loadingElement.innerHTML = `
                                    <div class="loading-spinner"></div>
                                    <p>Retrying connection...</p>
                                `;
                                setTimeout(attemptFetch, 1000);
                            });
                        }

                        try {
                            const backupData = localStorage.getItem('sheet_rsvp_backup_data');
                            if (backupData) {
                                const parsedData = JSON.parse(backupData);
                                // Convert timestamp back to Date objects
                                allSubmissions = parsedData.map(item => ({
                                    ...item,
                                    submittedAt: new Date(item.submittedAt)
                                }));

                                loadingElement.innerHTML += '<p><i class="fas fa-info-circle"></i> Loaded data from local backup.</p>';
                                processSubmissions();
                            } else {
                                loadingElement.innerHTML += '<p>No backup data available.</p>';
                            }
                        } catch (e) {
                            console.error('Error loading from backup:', e);
                            loadingElement.innerHTML += '<p>Could not load backup data.</p>';
                        }
                    }
                });
        }

        // Start the fetch process
        attemptFetch();
    }

    // Fetch guest list from Firestore
    function fetchGuestList() {
        // Check if Firestore is available
        if (!db) {
            console.error('Firestore database is not available');
            return;
        }

        // Add retry functionality
        let retryCount = 0;
        const maxRetries = 5;

        function attemptGuestFetch() {
            // Get guest list from Firestore
            db.collection('guestList').get()
                .then((querySnapshot) => {
                    allGuests = querySnapshot.docs.map(doc => {
                        const data = doc.data() || {};
                        return {
                            id: doc.id,
                            name: data.name || '',
                            category: data.category || '',
                            maxAllowedGuests: data.maxAllowedGuests || 1,
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

                    // Extract unique categories
                    allGuests.forEach(guest => {
                        if (guest.category) {
                            guestCategories.add(guest.category);
                        }
                    });

                    // Process guest list
                    processGuestList();
                })
                .catch((error) => {
                    console.error('Error fetching guest list:', error);

                    // Check if it's a network error
                    const isNetworkError = error.code === 'unavailable' ||
                                          error.message.includes('network') ||
                                          error.message.includes('connection') ||
                                          error.name === 'FirebaseError';

                    if (retryCount < maxRetries) {
                        // Retry with exponential backoff
                        retryCount++;
                        // Longer delay for network errors
                        const delay = Math.pow(2, retryCount) * (isNetworkError ? 1500 : 1000);

                        console.log(`Retrying guest list fetch in ${Math.round(delay/1000)} seconds... (Attempt ${retryCount}/${maxRetries})`);
                        setTimeout(attemptGuestFetch, delay);
                    } else {
                        console.error(`Failed to fetch guest list after ${maxRetries} attempts`);
                    }
                });
        }

        // Start the fetch process
        attemptGuestFetch();
    }

    // Process and display guest list
    function processGuestList() {
        if (allGuests.length === 0) {
            console.log('No guests found in the guest list');
            return;
        }

        // Apply filters to guest list
        applyGuestListFilters();

        // Update guest list stats
        updateGuestListStats();

        // Create category charts
        createCategoryCharts();

        // Display guest list table
        displayGuestList();

        // Populate category filter dropdown
        populateCategoryFilter();
    }

    // Process and display submissions
    function processSubmissions() {
        if (allSubmissions.length === 0) {
            loadingElement.innerHTML = '<p>No submissions found.</p>';
            loadingElement.style.display = 'block';
            return;
        }

        // Apply filters
        applyFilters();

        // Update stats
        updateStats();

        // Create charts
        createCharts();

        // Display submissions table
        displaySubmissions();

        // Update activity section
        updateActivitySection();

        // Show table
        loadingElement.style.display = 'none';
        tableContainer.style.display = 'block';
    }

    // Apply guest list filters
    function applyGuestListFilters() {
        const searchTerm = document.getElementById('guest-search-box')?.value?.toLowerCase() || '';
        const categoryFilter = document.getElementById('category-filter')?.value || 'all';
        const responseFilter = document.getElementById('response-filter')?.value || 'all';

        filteredGuests = allGuests.filter(guest => {
            // Apply category filter
            if (categoryFilter !== 'all' && guest.category !== categoryFilter) return false;

            // Apply response filter
            if (responseFilter === 'responded' && !guest.hasResponded) return false;
            if (responseFilter === 'not-responded' && guest.hasResponded) return false;
            if (responseFilter === 'attending' && guest.response !== 'attending') return false;
            if (responseFilter === 'not-attending' && guest.response !== 'declined') return false;

            // Apply search term
            if (searchTerm) {
                const searchFields = [
                    guest.name || '',
                    guest.email || '',
                    guest.phone || '',
                    guest.category || '',
                    (guest.additionalGuests || []).join(' ')
                ].map(field => field.toLowerCase());

                return searchFields.some(field => field.includes(searchTerm));
            }

            return true;
        });

        // Sort guests based on current sort
        sortGuestList(guestListSort.field, guestListSort.direction);

        // Reset pagination
        guestListPage = 1;
        displayGuestList();
    }

    // Apply search and filters
    function applyFilters() {
        const searchTerm = searchBox.value.toLowerCase();
        const filterValue = filterDropdown.value;
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        filteredSubmissions = allSubmissions.filter(submission => {
            // Apply attendance filter
            if (filterValue === 'attending' && submission.attending !== 'yes') return false;
            if (filterValue === 'not-attending' && submission.attending !== 'no') return false;

            // Apply recent filter (last 7 days)
            if (filterValue === 'recent' && submission.submittedAt < oneWeekAgo) return false;

            // Apply large party filter (4 or more guests)
            if (filterValue === 'large-party' &&
                (submission.attending !== 'yes' || (submission.guestCount || 1) < 4)) return false;

            // Apply search term
            if (searchTerm) {
                const searchFields = [
                    submission.name || '',
                    submission.email || '',
                    submission.phone || '',
                    (submission.additionalGuests || []).join(' ')
                ].map(field => field.toLowerCase());

                return searchFields.some(field => field.includes(searchTerm));
            }

            return true;
        });

        // Sort submissions based on current sort
        sortSubmissions(currentSort.field, currentSort.direction);

        // Update pagination
        currentPage = 1;
        displaySubmissions();
    }

    // Update guest list statistics
    function updateGuestListStats() {
        const totalGuests = allGuests.length;
        const respondedCount = allGuests.filter(guest => guest.hasResponded).length;
        const notRespondedCount = totalGuests - respondedCount;
        const attendingCount = allGuests.filter(guest => guest.response === 'attending').length;
        const notAttendingCount = allGuests.filter(guest => guest.response === 'declined').length;

        // Calculate percentages
        const respondedPercent = totalGuests > 0 ? ((respondedCount / totalGuests) * 100).toFixed(1) : 0;
        const notRespondedPercent = totalGuests > 0 ? ((notRespondedCount / totalGuests) * 100).toFixed(1) : 0;
        const attendingPercent = respondedCount > 0 ? ((attendingCount / respondedCount) * 100).toFixed(1) : 0;
        const notAttendingPercent = respondedCount > 0 ? ((notAttendingCount / respondedCount) * 100).toFixed(1) : 0;

        // Update DOM elements
        document.getElementById('total-guests-count').textContent = totalGuests;
        document.getElementById('responded-count').textContent = respondedCount;
        document.getElementById('not-responded-count').textContent = notRespondedCount;
        document.getElementById('attending-guests-count').textContent = attendingCount;
        document.getElementById('not-attending-guests-count').textContent = notAttendingCount;

        // Update percentage texts
        document.getElementById('responded-percent').textContent = `${respondedPercent}% of total`;
        document.getElementById('not-responded-percent').textContent = `${notRespondedPercent}% of total`;
        document.getElementById('attending-guests-percent').textContent = `${attendingPercent}% of responded`;
        document.getElementById('not-attending-guests-percent').textContent = `${notAttendingPercent}% of responded`;
    }

    // Update statistics
    function updateStats() {
        const totalSubmissions = allSubmissions.length;
        const attendingCount = allSubmissions.filter(submission => submission.attending === 'yes').length;
        const notAttendingCount = allSubmissions.filter(submission => submission.attending === 'no').length;

        // Calculate total guests (sum of guest counts for attending submissions)
        const totalGuests = allSubmissions
            .filter(submission => submission.attending === 'yes')
            .reduce((total, submission) => total + (submission.guestCount || 1), 0);

        // Calculate average party size
        const avgPartySize = attendingCount > 0
            ? (totalGuests / attendingCount).toFixed(1)
            : 0;

        // Calculate response rate
        const responseRate = ((totalSubmissions / EXPECTED_TOTAL_INVITES) * 100).toFixed(1);

        // Find latest RSVP
        let latestRsvp = { name: '-', submittedAt: null };
        if (allSubmissions.length > 0) {
            latestRsvp = allSubmissions.reduce((latest, current) =>
                current.submittedAt > (latest.submittedAt || new Date(0)) ? current : latest, {});
        }

        // Calculate percentages
        const attendingPercent = totalSubmissions > 0
            ? ((attendingCount / totalSubmissions) * 100).toFixed(1)
            : 0;
        const notAttendingPercent = totalSubmissions > 0
            ? ((notAttendingCount / totalSubmissions) * 100).toFixed(1)
            : 0;

        // Update DOM elements
        totalSubmissionsElement.textContent = totalSubmissions;
        attendingCountElement.textContent = attendingCount;
        notAttendingCountElement.textContent = notAttendingCount;
        totalGuestsElement.textContent = totalGuests;

        // Update subtext elements
        document.getElementById('total-submissions-percent').textContent =
            `${responseRate}% of expected invites`;
        document.getElementById('attending-percent').textContent =
            `${attendingPercent}% of responses`;
        document.getElementById('not-attending-percent').textContent =
            `${notAttendingPercent}% of responses`;
        document.getElementById('avg-party-size').textContent =
            `Avg party size: ${avgPartySize}`;
        document.getElementById('response-rate').textContent =
            `${responseRate}%`;

        // Update latest RSVP info
        if (latestRsvp.submittedAt) {
            const formattedDate = latestRsvp.submittedAt.toLocaleDateString();
            document.getElementById('latest-rsvp').textContent = latestRsvp.name || 'Unknown';
            document.getElementById('latest-rsvp-time').textContent =
                `Submitted on ${formattedDate}`;
        }
    }

    // Update activity section
    function updateActivitySection() {
        // Update latest RSVP
        if (allSubmissions.length > 0) {
            // Find latest RSVP
            const latestRsvp = allSubmissions.reduce((latest, current) =>
                current.submittedAt > (latest.submittedAt || new Date(0)) ? current : latest, {});

            // Update latest RSVP card
            const latestRsvpName = document.getElementById('latest-rsvp-name');
            const latestRsvpTime = document.getElementById('latest-rsvp-time');

            if (latestRsvpName && latestRsvpTime && latestRsvp.name) {
                latestRsvpName.textContent = latestRsvp.name;

                try {
                    const formattedDate = latestRsvp.submittedAt.toLocaleDateString() + ' ' +
                                        latestRsvp.submittedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    latestRsvpTime.textContent = formattedDate;
                } catch (e) {
                    latestRsvpTime.textContent = 'Unknown date';
                }
            }
        }

        // Update last sync time
        const lastSyncTime = localStorage.getItem('last_sync_time');
        const lastSyncTimeElement = document.getElementById('last-sync-time');
        const syncStatusElement = document.getElementById('sync-status');

        if (lastSyncTimeElement && lastSyncTime) {
            lastSyncTimeElement.textContent = new Date(parseInt(lastSyncTime)).toLocaleString();
            syncStatusElement.textContent = 'Last synchronized with Google Sheet';
        }

        // Update response trend
        const responseTrendElement = document.getElementById('response-trend');
        if (responseTrendElement && allSubmissions.length > 0) {
            // Get submissions from the last 7 days
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            const recentSubmissions = allSubmissions.filter(s => s.submittedAt > oneWeekAgo);
            const recentCount = recentSubmissions.length;

            if (recentCount > 0) {
                const attendingCount = recentSubmissions.filter(s => s.attending === 'yes').length;
                const attendingPercent = Math.round((attendingCount / recentCount) * 100);

                responseTrendElement.innerHTML = `
                    <span class="status-badge ${attendingPercent >= 70 ? 'status-attending' : 'status-not-attending'}">
                        ${attendingPercent}% Attending
                    </span>
                    <span>(${recentCount} responses)</span>
                `;
            } else {
                responseTrendElement.textContent = 'No recent responses';
            }
        }
    }

    // Create category charts for guest list
    function createCategoryCharts() {
        // Clear existing charts
        const categoryResponseChartCanvas = document.getElementById('category-response-chart');
        const categoryDistributionChartCanvas = document.getElementById('category-distribution-chart');

        // Destroy existing charts if they exist
        if (window.categoryResponseChart instanceof Chart) {
            window.categoryResponseChart.destroy();
        }
        if (window.categoryDistributionChart instanceof Chart) {
            window.categoryDistributionChart.destroy();
        }

        // Get unique categories
        const categories = Array.from(guestCategories).sort();

        // Skip if no categories
        if (categories.length === 0) {
            return;
        }

        // Calculate response rates by category
        const categoryStats = categories.map(category => {
            const categoryGuests = allGuests.filter(guest => guest.category === category);
            const totalInCategory = categoryGuests.length;
            const respondedInCategory = categoryGuests.filter(guest => guest.hasResponded).length;
            const attendingInCategory = categoryGuests.filter(guest => guest.response === 'attending').length;
            const notAttendingInCategory = categoryGuests.filter(guest => guest.response === 'declined').length;

            return {
                category,
                total: totalInCategory,
                responded: respondedInCategory,
                notResponded: totalInCategory - respondedInCategory,
                attending: attendingInCategory,
                notAttending: notAttendingInCategory,
                responseRate: totalInCategory > 0 ? (respondedInCategory / totalInCategory) * 100 : 0
            };
        });

        // Sort by response rate (highest first)
        categoryStats.sort((a, b) => b.responseRate - a.responseRate);

        // Create response rate chart
        window.categoryResponseChart = new Chart(categoryResponseChartCanvas, {
            type: 'bar',
            data: {
                labels: categoryStats.map(stat => stat.category),
                datasets: [{
                    label: 'Response Rate (%)',
                    data: categoryStats.map(stat => stat.responseRate.toFixed(1)),
                    backgroundColor: '#4caf50',
                    borderColor: '#388e3c',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Response Rate (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Guest Category'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const index = context.dataIndex;
                                const stats = categoryStats[index];
                                return [
                                    `Response Rate: ${stats.responseRate.toFixed(1)}%`,
                                    `Responded: ${stats.responded}/${stats.total}`,
                                    `Attending: ${stats.attending}`,
                                    `Not Attending: ${stats.notAttending}`
                                ];
                            }
                        }
                    }
                }
            }
        });

        // Create category distribution chart
        window.categoryDistributionChart = new Chart(categoryDistributionChartCanvas, {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    data: categories.map(category => {
                        return allGuests.filter(guest => guest.category === category).length;
                    }),
                    backgroundColor: [
                        '#1e88e5', '#ff9800', '#4caf50', '#f44336', '#9c27b0',
                        '#3f51b5', '#e91e63', '#009688', '#ff5722', '#607d8b'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} guests (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Create charts
    function createCharts() {
        // Clear existing charts
        const attendanceChartCanvas = document.getElementById('attendance-chart');
        const timelineChartCanvas = document.getElementById('timeline-chart');
        const guestCountChartCanvas = document.getElementById('guest-count-chart');
        const cumulativeGuestsChartCanvas = document.getElementById('cumulative-guests-chart');

        // Destroy existing charts if they exist
        if (window.attendanceChart instanceof Chart) {
            window.attendanceChart.destroy();
        }
        if (window.timelineChart instanceof Chart) {
            window.timelineChart.destroy();
        }
        if (window.guestCountChart instanceof Chart) {
            window.guestCountChart.destroy();
        }
        if (window.cumulativeGuestsChart instanceof Chart) {
            window.cumulativeGuestsChart.destroy();
        }

        // Attendance breakdown chart
        const attendingCount = allSubmissions.filter(submission => submission.attending === 'yes').length;
        const notAttendingCount = allSubmissions.filter(submission => submission.attending === 'no').length;

        window.attendanceChart = new Chart(attendanceChartCanvas, {
            type: 'pie',
            data: {
                labels: ['Attending', 'Not Attending'],
                datasets: [{
                    data: [attendingCount, notAttendingCount],
                    backgroundColor: ['#1e88e5', '#ff9800'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
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

        // Submissions timeline chart
        const submissionDates = {};
        allSubmissions.forEach(submission => {
            const date = submission.submittedAt.toLocaleDateString();
            submissionDates[date] = (submissionDates[date] || 0) + 1;
        });

        // Sort dates chronologically
        const sortedDates = Object.keys(submissionDates).sort((a, b) => new Date(a) - new Date(b));
        const submissionCounts = sortedDates.map(date => submissionDates[date]);

        // Calculate cumulative counts
        const cumulativeCounts = [];
        let runningTotal = 0;
        submissionCounts.forEach(count => {
            runningTotal += count;
            cumulativeCounts.push(runningTotal);
        });

        window.timelineChart = new Chart(timelineChartCanvas, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Daily Submissions',
                    data: submissionCounts,
                    borderColor: '#1e88e5',
                    backgroundColor: 'rgba(30, 136, 229, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }, {
                    label: 'Cumulative Submissions',
                    data: cumulativeCounts,
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        },
                        title: {
                            display: true,
                            text: 'Daily Submissions'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            precision: 0
                        },
                        title: {
                            display: true,
                            text: 'Cumulative Submissions'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                }
            }
        });

        // Guest count distribution chart
        const guestCountDistribution = {};
        allSubmissions
            .filter(submission => submission.attending === 'yes')
            .forEach(submission => {
                const count = submission.guestCount || 1;
                guestCountDistribution[count] = (guestCountDistribution[count] || 0) + 1;
            });

        const guestCounts = Object.keys(guestCountDistribution).sort((a, b) => parseInt(a) - parseInt(b));
        const guestCountValues = guestCounts.map(count => guestCountDistribution[count]);

        window.guestCountChart = new Chart(guestCountChartCanvas, {
            type: 'bar',
            data: {
                labels: guestCounts.map(count => `${count} ${parseInt(count) === 1 ? 'Guest' : 'Guests'}`),
                datasets: [{
                    label: 'Number of Parties',
                    data: guestCountValues,
                    backgroundColor: '#4caf50',
                    borderColor: '#388e3c',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        },
                        title: {
                            display: true,
                            text: 'Number of Parties'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Party Size'
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

        // Cumulative guests chart
        // First, sort submissions by date
        const sortedSubmissions = [...allSubmissions]
            .filter(submission => submission.attending === 'yes')
            .sort((a, b) => a.submittedAt - b.submittedAt);

        // Group by date and calculate cumulative guests
        const guestsByDate = {};
        let cumulativeGuests = 0;

        sortedSubmissions.forEach(submission => {
            const date = submission.submittedAt.toLocaleDateString();
            const guestCount = submission.guestCount || 1;
            cumulativeGuests += guestCount;
            guestsByDate[date] = cumulativeGuests;
        });

        const guestDates = Object.keys(guestsByDate).sort((a, b) => new Date(a) - new Date(b));
        const guestTotals = guestDates.map(date => guestsByDate[date]);

        window.cumulativeGuestsChart = new Chart(cumulativeGuestsChartCanvas, {
            type: 'line',
            data: {
                labels: guestDates,
                datasets: [{
                    label: 'Total Confirmed Guests',
                    data: guestTotals,
                    borderColor: '#ff9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        },
                        title: {
                            display: true,
                            text: 'Cumulative Guest Count'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Total Guests: ${context.raw}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Display submissions in table
    function displaySubmissions() {
        submissionsBody.innerHTML = '';

        // Calculate pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedSubmissions = filteredSubmissions.slice(startIndex, endIndex);

        if (paginatedSubmissions.length === 0) {
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = `<td colspan="7" style="text-align: center;">No submissions found</td>`;
            submissionsBody.appendChild(noDataRow);

            // Clear pagination
            paginationContainer.innerHTML = '';
            return;
        }

        // Create table rows
        paginatedSubmissions.forEach(submission => {
            const row = document.createElement('tr');

            // Format date
            const submissionDate = submission.submittedAt;
            const formattedDate = submissionDate.toLocaleDateString() + ' ' +
                                 submissionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            // Format additional guests
            const additionalGuests = submission.additionalGuests || [];
            const formattedGuests = additionalGuests.join(', ');

            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${submission.name || ''}</td>
                <td>${submission.email || ''}</td>
                <td>${submission.phone || ''}</td>
                <td>
                    <span class="status-badge ${submission.attending === 'yes' ? 'status-attending' : 'status-not-attending'}">
                        ${submission.attending === 'yes' ? '<i class="fas fa-check-circle"></i> Yes' : '<i class="fas fa-times-circle"></i> No'}
                    </span>
                </td>
                <td>${submission.guestCount || 1}</td>
                <td>${formattedGuests}</td>
                <td>
                    <button class="btn-icon view-details" data-id="${submission.id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;

            submissionsBody.appendChild(row);
        });

        // Create pagination
        createPagination();
    }

    // Populate category filter dropdown
    function populateCategoryFilter() {
        const categoryFilter = document.getElementById('category-filter');
        if (!categoryFilter) return;

        // Clear existing options except the first one (All Categories)
        while (categoryFilter.options.length > 1) {
            categoryFilter.remove(1);
        }

        // Add categories to dropdown
        const categories = Array.from(guestCategories).sort();
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });

        // Add event listener to filter dropdown
        categoryFilter.addEventListener('change', applyGuestListFilters);

        // Add event listener to response filter dropdown
        const responseFilter = document.getElementById('response-filter');
        if (responseFilter) {
            responseFilter.addEventListener('change', applyGuestListFilters);
        }

        // Add event listener to search box
        const guestSearchBox = document.getElementById('guest-search-box');
        if (guestSearchBox) {
            guestSearchBox.addEventListener('input', applyGuestListFilters);
        }
    }

    // Display guest list in table
    function displayGuestList() {
        const guestListBody = document.getElementById('guest-list-body');
        if (!guestListBody) return;

        guestListBody.innerHTML = '';

        // Calculate pagination
        const startIndex = (guestListPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedGuests = filteredGuests.slice(startIndex, endIndex);

        if (paginatedGuests.length === 0) {
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = `<td colspan="7" style="text-align: center;">No guests found</td>`;
            guestListBody.appendChild(noDataRow);

            // Clear pagination
            const paginationContainer = document.getElementById('guest-list-pagination');
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }
            return;
        }

        // Create table rows
        paginatedGuests.forEach(guest => {
            const row = document.createElement('tr');

            // Determine response status
            const responseStatus = guest.hasResponded ?
                `<span class="response-status status-responded"><i class="fas fa-check-circle"></i> Responded</span>` :
                `<span class="response-status status-not-responded"><i class="fas fa-clock"></i> Pending</span>`;

            // Determine RSVP response
            let rsvpResponse = '-';
            if (guest.hasResponded) {
                if (guest.response === 'attending') {
                    rsvpResponse = `<span class="status-badge status-attending"><i class="fas fa-check-circle"></i> Attending</span>`;
                } else if (guest.response === 'declined') {
                    rsvpResponse = `<span class="status-badge status-not-attending"><i class="fas fa-times-circle"></i> Not Attending</span>`;
                }
            }

            // Format category
            const category = guest.category ?
                `<span class="category-badge">${guest.category}</span>` :
                '-';

            row.innerHTML = `
                <td>${guest.name || ''}</td>
                <td>${category}</td>
                <td>${guest.maxAllowedGuests || 1}</td>
                <td>${responseStatus}</td>
                <td>${rsvpResponse}</td>
                <td>${guest.hasResponded ? (guest.actualGuestCount || 0) : '-'}</td>
                <td>
                    <button class="btn-icon view-guest-details" data-id="${guest.id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;

            guestListBody.appendChild(row);
        });

        // Create pagination
        createGuestListPagination();

        // Add event listeners to view buttons
        const viewButtons = document.querySelectorAll('.view-guest-details');
        viewButtons.forEach(button => {
            button.addEventListener('click', function() {
                const guestId = this.getAttribute('data-id');
                showGuestDetails(guestId);
            });
        });
    }

    // Create pagination for guest list
    function createGuestListPagination() {
        const paginationContainer = document.getElementById('guest-list-pagination');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = '';

        const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);

        if (totalPages <= 1) {
            return;
        }

        // Previous button
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '&laquo;';
        prevButton.disabled = guestListPage === 1;
        prevButton.addEventListener('click', () => {
            if (guestListPage > 1) {
                guestListPage--;
                displayGuestList();
            }
        });
        paginationContainer.appendChild(prevButton);

        // Page buttons
        const maxButtons = 5;
        const startPage = Math.max(1, guestListPage - Math.floor(maxButtons / 2));
        const endPage = Math.min(totalPages, startPage + maxButtons - 1);

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.classList.toggle('active', i === guestListPage);
            pageButton.addEventListener('click', () => {
                guestListPage = i;
                displayGuestList();
            });
            paginationContainer.appendChild(pageButton);
        }

        // Next button
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '&raquo;';
        nextButton.disabled = guestListPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (guestListPage < totalPages) {
                guestListPage++;
                displayGuestList();
            }
        });
        paginationContainer.appendChild(nextButton);
    }

    // Show guest details in modal
    function showGuestDetails(guestId) {
        const guest = allGuests.find(g => g.id === guestId);
        if (!guest) return;

        const modalBody = document.getElementById('guest-modal-body');
        const modal = document.getElementById('guest-modal');

        if (!modalBody || !modal) return;

        // Format address
        let addressHtml = '';
        if (guest.address) {
            const addr = guest.address;
            const addressParts = [];

            if (addr.line1) addressParts.push(addr.line1);
            if (addr.line2) addressParts.push(addr.line2);

            const cityStateZip = [];
            if (addr.city) cityStateZip.push(addr.city);
            if (addr.state) cityStateZip.push(addr.state);
            if (addr.zip) cityStateZip.push(addr.zip);

            if (cityStateZip.length > 0) {
                addressParts.push(cityStateZip.join(', '));
            }

            if (addr.country) addressParts.push(addr.country);

            if (addressParts.length > 0) {
                addressHtml = addressParts.join('<br>');
            }
        }

        // Format submission date
        let submittedDate = 'Not submitted yet';
        if (guest.submittedAt) {
            submittedDate = guest.submittedAt.toLocaleDateString() + ' ' +
                          guest.submittedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        // Format additional guests
        let additionalGuestsHtml = '';
        if (guest.hasResponded && guest.additionalGuests && guest.additionalGuests.length > 0) {
            additionalGuestsHtml = `
                <div class="detail-group">
                    <div class="detail-label">Additional Guests:</div>
                    <div class="detail-value">
                        <ul style="margin: 0; padding-left: 20px;">
                            ${guest.additionalGuests.map(g => `<li>${g}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        // Build modal content
        modalBody.innerHTML = `
            <div class="detail-group">
                <div class="detail-label">Name:</div>
                <div class="detail-value">${guest.name || '-'}</div>
            </div>
            ${guest.category ? `
            <div class="detail-group">
                <div class="detail-label">Category:</div>
                <div class="detail-value"><span class="category-badge">${guest.category}</span></div>
            </div>
            ` : ''}
            <div class="detail-group">
                <div class="detail-label">Contact Information:</div>
                <div class="detail-value">
                    ${guest.email ? `Email: ${guest.email}<br>` : ''}
                    ${guest.phone ? `Phone: ${guest.phone}` : ''}
                    ${!guest.email && !guest.phone ? 'No contact information' : ''}
                </div>
            </div>
            ${addressHtml ? `
            <div class="detail-group">
                <div class="detail-label">Address:</div>
                <div class="detail-value">${addressHtml}</div>
            </div>
            ` : ''}
            <div class="detail-group">
                <div class="detail-label">RSVP Status:</div>
                <div class="detail-value">
                    ${guest.hasResponded ?
                        `<span class="response-status status-responded"><i class="fas fa-check-circle"></i> Responded</span>` :
                        `<span class="response-status status-not-responded"><i class="fas fa-clock"></i> Pending Response</span>`}
                </div>
            </div>
            ${guest.hasResponded ? `
            <div class="detail-group">
                <div class="detail-label">Attending:</div>
                <div class="detail-value">
                    ${guest.response === 'attending' ?
                        `<span class="status-badge status-attending"><i class="fas fa-check-circle"></i> Yes</span>` :
                        `<span class="status-badge status-not-attending"><i class="fas fa-times-circle"></i> No</span>`}
                </div>
            </div>
            ` : ''}
            ${guest.hasResponded && guest.response === 'attending' ? `
            <div class="detail-group">
                <div class="detail-label">Guest Count:</div>
                <div class="detail-value">${guest.actualGuestCount || 1} of ${guest.maxAllowedGuests || 1} maximum</div>
            </div>
            ` : ''}
            ${additionalGuestsHtml}
            <div class="detail-group">
                <div class="detail-label">Submission Date:</div>
                <div class="detail-value">${submittedDate}</div>
            </div>
        `;

        // Show modal
        modal.style.display = 'flex';

        // Add event listener to close button
        const closeButtons = modal.querySelectorAll('.modal-close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        });

        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Create pagination buttons
    function createPagination() {
        paginationContainer.innerHTML = '';

        const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);

        if (totalPages <= 1) {
            return;
        }

        // Previous button
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '&laquo;';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                displaySubmissions();
            }
        });
        paginationContainer.appendChild(prevButton);

        // Page buttons
        const maxButtons = 5;
        const startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        const endPage = Math.min(totalPages, startPage + maxButtons - 1);

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.classList.toggle('active', i === currentPage);
            pageButton.addEventListener('click', () => {
                currentPage = i;
                displaySubmissions();
            });
            paginationContainer.appendChild(pageButton);
        }

        // Next button
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '&raquo;';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                displaySubmissions();
            }
        });
        paginationContainer.appendChild(nextButton);
    }

    // Sort guest list
    function sortGuestList(field, direction) {
        guestListSort = { field, direction };

        filteredGuests.sort((a, b) => {
            let valueA, valueB;

            // Handle different field types
            switch (field) {
                case 'name':
                    valueA = a.name || '';
                    valueB = b.name || '';
                    break;
                case 'category':
                    valueA = a.category || '';
                    valueB = b.category || '';
                    break;
                case 'maxAllowedGuests':
                    valueA = a.maxAllowedGuests || 0;
                    valueB = b.maxAllowedGuests || 0;
                    break;
                case 'actualGuestCount':
                    valueA = a.actualGuestCount || 0;
                    valueB = b.actualGuestCount || 0;
                    break;
                case 'hasResponded':
                    valueA = a.hasResponded ? 1 : 0;
                    valueB = b.hasResponded ? 1 : 0;
                    break;
                case 'response':
                    valueA = a.response || '';
                    valueB = b.response || '';
                    break;
                default:
                    valueA = a[field] || '';
                    valueB = b[field] || '';
            }

            // Compare values based on direction
            if (typeof valueA === 'string' && typeof valueB === 'string') {
                return direction === 'asc' ?
                    valueA.localeCompare(valueB) :
                    valueB.localeCompare(valueA);
            } else {
                return direction === 'asc' ?
                    (valueA - valueB) :
                    (valueB - valueA);
            }
        });
    }

    // Sort submissions by field
    function sortSubmissions(field, direction) {
        currentSort = { field, direction };

        // Helper function to get the value to sort by
        function getSortValue(submission, fieldName) {
            // Handle date fields
            if (fieldName === 'date' || fieldName === 'submittedAt') {
                return submission.submittedAt;
            }

            // Handle other fields
            let value = submission[fieldName];

            // Handle string comparisons
            if (typeof value === 'string') {
                return value.toLowerCase();
            }

            // Handle null/undefined values
            return value === undefined || value === null ? '' : value;
        }

        // Helper function to compare values
        function compareValues(a, b, isAscending) {
            if (a < b) {
                return isAscending ? -1 : 1;
            }
            if (a > b) {
                return isAscending ? 1 : -1;
            }
            return 0;
        }

        // Sort the submissions
        filteredSubmissions.sort((a, b) => {
            const valueA = getSortValue(a, field);
            const valueB = getSortValue(b, field);
            return compareValues(valueA, valueB, direction === 'asc');
        });

        displaySubmissions();
    }

    // Add event listeners for sortable columns
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', function() {
            const field = this.dataset.sort;
            let direction = 'asc';

            // Toggle direction if already sorted by this field
            if (currentSort.field === field) {
                direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            }

            // Update sort indicators
            document.querySelectorAll('th.sortable').forEach(el => {
                el.classList.remove('sort-asc', 'sort-desc');
            });

            this.classList.add(`sort-${direction}`);

            // Sort submissions
            sortSubmissions(field, direction);
        });
    });

    // Handle search and filter changes
    searchBox.addEventListener('input', applyFilters);
    filterDropdown.addEventListener('change', applyFilters);

    // Get modal elements
    const modal = document.getElementById('rsvp-modal');
    const modalBody = document.getElementById('modal-body');
    const modalCloseButtons = document.querySelectorAll('.modal-close');

    // Close modal when clicking close button or outside the modal
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Handle view details button clicks
    document.addEventListener('click', function(e) {
        if (e.target.closest('.view-details')) {
            const button = e.target.closest('.view-details');
            const submissionId = button.dataset.id;
            const submission = allSubmissions.find(s => s.id === submissionId);

            if (submission) {
                // Format submission details
                const formattedDate = submission.submittedAt.toLocaleDateString() + ' ' +
                                     submission.submittedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const additionalGuests = (submission.additionalGuests || []).join(', ');

                // Create modal content
                modalBody.innerHTML = `
                    <div class="detail-group">
                        <div class="detail-label">Name</div>
                        <div class="detail-value">${submission.name || 'Not provided'}</div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Email</div>
                        <div class="detail-value">${submission.email || 'Not provided'}</div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Phone</div>
                        <div class="detail-value">${submission.phone || 'Not provided'}</div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Status</div>
                        <div class="detail-value">
                            <span class="status-badge ${submission.attending === 'yes' ? 'status-attending' : 'status-not-attending'}">
                                ${submission.attending === 'yes' ? '<i class="fas fa-check-circle"></i> Attending' : '<i class="fas fa-times-circle"></i> Not Attending'}
                            </span>
                        </div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Guest Count</div>
                        <div class="detail-value">${submission.guestCount || 1} ${(submission.guestCount || 1) === 1 ? 'person' : 'people'}</div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Additional Guests</div>
                        <div class="detail-value">${additionalGuests || 'None'}</div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Submitted</div>
                        <div class="detail-value">${formattedDate}</div>
                    </div>
                `;

                // Show modal
                modal.style.display = 'flex';
            }
        }
    });

    // Add event listener to export guest list button
    const exportGuestListBtn = document.getElementById('export-guest-list-btn');
    if (exportGuestListBtn) {
        exportGuestListBtn.addEventListener('click', function() {
            // Store original button text and disable button during export
            const originalButtonText = exportGuestListBtn.innerHTML;
            exportGuestListBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            exportGuestListBtn.disabled = true;

            try {
                // Check if there are guests to export
                if (filteredGuests.length === 0) {
                    alert('No guest data to export. Please adjust your filters if needed.');
                    exportGuestListBtn.innerHTML = originalButtonText;
                    exportGuestListBtn.disabled = false;
                    return;
                }

                // Create CSV content
                let csvContent = 'data:text/csv;charset=utf-8,';

                // Add headers
                csvContent += 'Name,Category,Max Guests,Has Responded,Response,Actual Guests,Email,Phone,Address,Additional Guests\n';

                // Add rows
                filteredGuests.forEach(guest => {
                    // Format address
                    let address = '';
                    if (guest.address) {
                        const addr = guest.address;
                        const addressParts = [];

                        if (addr.line1) addressParts.push(addr.line1);
                        if (addr.line2) addressParts.push(addr.line2);

                        const cityStateZip = [];
                        if (addr.city) cityStateZip.push(addr.city);
                        if (addr.state) cityStateZip.push(addr.state);
                        if (addr.zip) cityStateZip.push(addr.zip);

                        if (cityStateZip.length > 0) {
                            addressParts.push(cityStateZip.join(', '));
                        }

                        if (addr.country) addressParts.push(addr.country);

                        address = addressParts.join(', ');
                    }

                    // Format additional guests
                    const additionalGuests = Array.isArray(guest.additionalGuests) ?
                        guest.additionalGuests.join(', ') : '';

                    // Format CSV row and handle commas in fields
                    const row = [
                        `"${(guest.name || '').replace(/"/g, '""')}"`,
                        `"${(guest.category || '').replace(/"/g, '""')}"`,
                        guest.maxAllowedGuests || 1,
                        guest.hasResponded ? 'Yes' : 'No',
                        `"${(guest.response || '').replace(/"/g, '""')}"`,
                        guest.actualGuestCount || 0,
                        `"${(guest.email || '').replace(/"/g, '""')}"`,
                        `"${(guest.phone || '').replace(/"/g, '""')}"`,
                        `"${address.replace(/"/g, '""')}"`,
                        `"${additionalGuests.replace(/"/g, '""')}"`
                    ].join(',');

                    csvContent += row + '\n';
                });

                // Create download link
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement('a');
                link.setAttribute('href', encodedUri);

                // Create a more descriptive filename
                const today = new Date().toISOString().split('T')[0];
                const count = filteredGuests.length;
                const filename = `guest-list-${count}-records-${today}.csv`;

                link.setAttribute('download', filename);
                document.body.appendChild(link);

                // Trigger download
                link.click();

                // Clean up
                document.body.removeChild(link);

                // Show success message
                const successMessage = document.createElement('div');
                successMessage.className = 'export-success';
                successMessage.innerHTML = `<i class="fas fa-check-circle"></i> Exported ${count} records successfully`;
                document.querySelector('.guest-list-actions').appendChild(successMessage);

                // Remove success message after 3 seconds
                setTimeout(() => {
                    if (successMessage.parentNode) {
                        successMessage.parentNode.removeChild(successMessage);
                    }
                }, 3000);

            } catch (error) {
                console.error('Export error:', error);
                alert('There was an error exporting the data. Please try again.');
            } finally {
                // Restore button state
                exportGuestListBtn.innerHTML = originalButtonText;
                exportGuestListBtn.disabled = false;
            }
        });
    }

    // Handle sync with Google Sheet button
    if (syncSheetBtn) {
        syncSheetBtn.addEventListener('click', function() {
            // Store original button text and disable button during sync
            const originalButtonText = syncSheetBtn.innerHTML;
            syncSheetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
            syncSheetBtn.disabled = true;

            // Call the manual sync function
            fetch('https://us-central1-eli-barkin-be-mitzvah.cloudfunctions.net/manualSyncSheetChanges')
                .then(response => response.json())
                .then(data => {
                    console.log('Sync response:', data);

                    if (data.success) {
                        // Show success message
                        const successMessage = document.createElement('div');
                        successMessage.className = 'export-success';
                        successMessage.innerHTML = `<i class="fas fa-check-circle"></i> Synced successfully`;
                        syncSheetBtn.parentNode.appendChild(successMessage);

                        // Remove success message after 3 seconds
                        setTimeout(() => {
                            if (successMessage.parentNode) {
                                successMessage.parentNode.removeChild(successMessage);
                            }
                        }, 3000);

                        // Store sync time
                        localStorage.setItem('last_sync_time', Date.now().toString());

                        // Refresh the data
                        fetchSubmissions();
                        fetchGuestList();
                    } else {
                        alert('Error syncing with Google Sheet: ' + (data.message || 'Unknown error'));
                    }
                })
                .catch(error => {
                    console.error('Error syncing with Google Sheet:', error);
                    alert('Error syncing with Google Sheet. Please try again.');
                })
                .finally(() => {
                    // Restore button state
                    syncSheetBtn.innerHTML = originalButtonText;
                    syncSheetBtn.disabled = false;
                });
        });
    }

    // Handle export to CSV
    exportBtn.addEventListener('click', function() {
        // Store original button text and disable button during export
        const originalButtonText = exportBtn.innerHTML;
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
        exportBtn.disabled = true;

        try {
            // Check if there are submissions to export
            if (filteredSubmissions.length === 0) {
                alert('No data to export. Please adjust your filters if needed.');
                exportBtn.innerHTML = originalButtonText;
                exportBtn.disabled = false;
                return;
            }

            // Create CSV content
            let csvContent = 'data:text/csv;charset=utf-8,';

            // Add headers
            csvContent += 'Date,Name,Email,Phone,Attending,Guest Count,Additional Guests\n';

            // Add rows
            filteredSubmissions.forEach(submission => {
                // Format date safely
                let formattedDate = '';
                try {
                    formattedDate = submission.submittedAt.toLocaleDateString() + ' ' +
                                    submission.submittedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                } catch (e) {
                    formattedDate = 'Unknown Date';
                }

                // Safely get additional guests
                const additionalGuests = Array.isArray(submission.additionalGuests)
                    ? submission.additionalGuests.join(', ')
                    : '';

                // Format CSV row and handle commas in fields
                const row = [
                    `"${formattedDate.replace(/"/g, '""')}"`,
                    `"${(submission.name || '').replace(/"/g, '""')}"`,
                    `"${(submission.email || '').replace(/"/g, '""')}"`,
                    `"${(submission.phone || '').replace(/"/g, '""')}"`,
                    `"${submission.attending === 'yes' ? 'Yes' : 'No'}"`,
                    submission.guestCount || 1,
                    `"${additionalGuests.replace(/"/g, '""')}"`
                ].join(',');

                csvContent += row + '\n';
            });

            // Create download link
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);

            // Create a more descriptive filename
            const today = new Date().toISOString().split('T')[0];
            const count = filteredSubmissions.length;
            const filename = `rsvp-submissions-${count}-records-${today}.csv`;

            link.setAttribute('download', filename);
            document.body.appendChild(link);

            // Trigger download
            link.click();

            // Clean up
            document.body.removeChild(link);

            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'export-success';
            successMessage.innerHTML = `<i class="fas fa-check-circle"></i> Exported ${count} records successfully`;
            document.querySelector('.table-actions').appendChild(successMessage);

            // Remove success message after 3 seconds
            setTimeout(() => {
                if (successMessage.parentNode) {
                    successMessage.parentNode.removeChild(successMessage);
                }
            }, 3000);

        } catch (error) {
            console.error('Export error:', error);
            alert('There was an error exporting the data. Please try again.');
        } finally {
            // Restore button state
            exportBtn.innerHTML = originalButtonText;
            exportBtn.disabled = false;
        }
    });
});
