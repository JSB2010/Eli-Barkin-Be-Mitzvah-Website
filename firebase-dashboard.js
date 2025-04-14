// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const logoutBtn = document.getElementById('logout-btn');
    const loadingElement = document.getElementById('loading');
    const tableContainer = document.getElementById('table-container');
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

            // Fetch RSVP submissions
            fetchSubmissions();
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
        const maxRetries = 3;

        function attemptFetch() {
            db.collection('rsvps').orderBy('submittedAt', 'desc').get()
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
                            localStorage.setItem('rsvp_backup_data', JSON.stringify(essentialData));
                        } catch (e) {
                            console.warn('Could not save backup data to localStorage', e);
                        }
                    }
                })
                .catch((error) => {
                    console.error('Error fetching submissions:', error);

                    if (retryCount < maxRetries) {
                        // Retry with exponential backoff
                        retryCount++;
                        const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s

                        loadingElement.innerHTML = `
                            <div class="loading-spinner"></div>
                            <p>Connection issue. Retrying in ${delay/1000} seconds... (Attempt ${retryCount}/${maxRetries})</p>
                        `;

                        setTimeout(attemptFetch, delay);
                    } else {
                        // Max retries reached, try to load from backup
                        loadingElement.innerHTML = '<p><i class="fas fa-exclamation-triangle"></i> Error loading submissions from server.</p>';

                        try {
                            const backupData = localStorage.getItem('rsvp_backup_data');
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
                                loadingElement.innerHTML += '<p>No backup data available. Please try again later.</p>';
                            }
                        } catch (e) {
                            console.error('Error loading from backup:', e);
                            loadingElement.innerHTML += '<p>Could not load backup data. Please try refreshing the page.</p>';
                        }
                    }
                });
        }

        // Start the fetch process
        attemptFetch();
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

        // Show table
        loadingElement.style.display = 'none';
        tableContainer.style.display = 'block';
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
