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

    // Handle login form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Clear previous error messages
        errorMessage.textContent = '';

        // Sign in with Firebase Authentication
        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Login successful, show dashboard
                loginSection.style.display = 'none';
                dashboardSection.style.display = 'block';

                // Fetch RSVP submissions
                fetchSubmissions();
            })
            .catch((error) => {
                // Show error message
                errorMessage.textContent = error.message || 'Invalid email or password';
            });
    });

    // Handle logout
    logoutBtn.addEventListener('click', function() {
        firebase.auth().signOut()
            .then(() => {
                // Logout successful, show login form
                dashboardSection.style.display = 'none';
                loginSection.style.display = 'block';
            })
            .catch((error) => {
                console.error('Logout error:', error);
            });
    });

    // Check if Firebase Auth is available
    if (!firebase.auth) {
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'none';
        document.body.innerHTML = '<div style="text-align: center; padding: 2rem;"><h2>Error</h2><p>Firebase Authentication is not available. Please check your Firebase configuration.</p></div>';
        return;
    }

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
            loginSection.style.display = 'block';
        }
    });

    // Fetch submissions from Firestore
    function fetchSubmissions() {
        loadingElement.style.display = 'block';
        tableContainer.style.display = 'none';

        // Check if Firestore is available
        if (!db) {
            loadingElement.textContent = 'Error: Firestore database is not available. Please check your Firebase configuration.';
            return;
        }

        db.collection('rsvps').orderBy('submittedAt', 'desc').get()
            .then((querySnapshot) => {
                allSubmissions = querySnapshot.docs.map(doc => {
                    return {
                        id: doc.id,
                        ...doc.data(),
                        // Convert Firestore timestamp to JavaScript Date
                        submittedAt: doc.data().submittedAt?.toDate() || new Date()
                    };
                });

                // Process submissions
                processSubmissions();
            })
            .catch((error) => {
                console.error('Error fetching submissions:', error);
                loadingElement.textContent = 'Error loading submissions. Please try again.';
            });
    }

    // Process and display submissions
    function processSubmissions() {
        if (allSubmissions.length === 0) {
            loadingElement.textContent = 'No submissions found.';
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

        filteredSubmissions = allSubmissions.filter(submission => {
            // Apply attendance filter
            if (filterValue === 'attending' && submission.attending !== 'yes') return false;
            if (filterValue === 'not-attending' && submission.attending !== 'no') return false;

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

        // Update DOM elements
        totalSubmissionsElement.textContent = totalSubmissions;
        attendingCountElement.textContent = attendingCount;
        notAttendingCountElement.textContent = notAttendingCount;
        totalGuestsElement.textContent = totalGuests;
    }

    // Create charts
    function createCharts() {
        // Clear existing charts
        const attendanceChartCanvas = document.getElementById('attendance-chart');
        const timelineChartCanvas = document.getElementById('timeline-chart');

        // Destroy existing charts if they exist
        if (window.attendanceChart instanceof Chart) {
            window.attendanceChart.destroy();
        }
        if (window.timelineChart instanceof Chart) {
            window.timelineChart.destroy();
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

        window.timelineChart = new Chart(timelineChartCanvas, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Submissions',
                    data: submissionCounts,
                    borderColor: '#1e88e5',
                    backgroundColor: 'rgba(30, 136, 229, 0.1)',
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
                <td>${submission.attending === 'yes' ? 'Yes' : 'No'}</td>
                <td>${submission.guestCount || 1}</td>
                <td>${formattedGuests}</td>
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

    // Handle search and filter changes
    searchBox.addEventListener('input', applyFilters);
    filterDropdown.addEventListener('change', applyFilters);

    // Handle export to CSV
    exportBtn.addEventListener('click', function() {
        // Create CSV content
        let csvContent = 'data:text/csv;charset=utf-8,';

        // Add headers
        csvContent += 'Date,Name,Email,Phone,Attending,Guest Count,Additional Guests\n';

        // Add rows
        filteredSubmissions.forEach(submission => {
            const formattedDate = submission.submittedAt.toLocaleDateString() + ' ' +
                                 submission.submittedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            const additionalGuests = (submission.additionalGuests || []).join(', ');

            // Format CSV row and handle commas in fields
            const row = [
                formattedDate,
                `"${(submission.name || '').replace(/"/g, '""')}"`,
                `"${(submission.email || '').replace(/"/g, '""')}"`,
                `"${(submission.phone || '').replace(/"/g, '""')}"`,
                submission.attending === 'yes' ? 'Yes' : 'No',
                submission.guestCount || 1,
                `"${additionalGuests.replace(/"/g, '""')}"`
            ].join(',');

            csvContent += row + '\n';
        });

        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `rsvp-submissions-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);

        // Trigger download
        link.click();

        // Clean up
        document.body.removeChild(link);
    });
});
