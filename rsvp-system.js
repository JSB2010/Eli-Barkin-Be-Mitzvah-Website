// RSVP Dashboard System - Completely isolated namespace
const RSVPSystem = {
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
        expectedInvites: 300
    },

    // Initialize the system
    init: function() {
        console.log('RSVP System initializing...');

        // Initialize Firestore
        try {
            this.state.db = firebase.firestore();
            console.log('Firestore initialized successfully');
        } catch (error) {
            console.error('Error initializing Firestore:', error);
            this.showError('Could not connect to database: ' + error.message);
        }

        // Set up event listeners
        this.setupEventListeners();

        console.log('RSVP System initialized');
    },

    // Set up event listeners
    setupEventListeners: function() {
        // Add event listeners for pagination, sorting, filtering, etc.
        // This will be implemented in the next steps
    },

    // Show loading state
    showLoading: function() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = '<div class="loading-spinner"></div><p>Loading data...</p>';
            loadingElement.style.display = 'block';
        }
    },

    // Show error message
    showError: function(message) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `<p><i class="fas fa-exclamation-triangle"></i> Error: ${message}</p>`;
            loadingElement.style.display = 'block';
        }
        console.error('Error:', message);
    },

    // Fetch submissions from Firestore
    fetchSubmissions: function() {
        console.log('RSVPSystem.fetchSubmissions called');

        this.showLoading();

        const tableContainer = document.getElementById('table-container');
        if (tableContainer) {
            tableContainer.style.display = 'none';
        }

        if (!this.state.db) {
            this.showError('Database connection not available');
            return;
        }

        console.log('Fetching from sheetRsvps collection...');

        this.state.db.collection('sheetRsvps').orderBy('submittedAt', 'desc').get()
            .then((querySnapshot) => {
                console.log('Query successful, received', querySnapshot.size, 'documents');

                this.state.submissions = querySnapshot.docs.map(doc => {
                    const data = doc.data() || {};
                    let submittedDate;

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

                console.log('Processed submissions data:', this.state.submissions.length, 'items');

                // Process the data
                this.processSubmissions();
            })
            .catch((error) => {
                console.error('Error fetching submissions:', error);
                this.showError('Error loading data: ' + error.message);
            });
    },

    // Fetch guest list from Firestore
    fetchGuestList: function() {
        console.log('RSVPSystem.fetchGuestList called');

        if (!this.state.db) {
            console.error('Firestore database is not available for guest list');
            return;
        }

        console.log('Fetching from guestList collection...');

        this.state.db.collection('guestList').get()
            .then((querySnapshot) => {
                console.log('Guest list query successful, received', querySnapshot.size, 'documents');

                this.state.guests = querySnapshot.docs.map(doc => {
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

                console.log('Processed guest list data:', this.state.guests.length, 'items');

                // Process the guest list
                this.processGuestList();
            })
            .catch((error) => {
                console.error('Error fetching guest list:', error);
            });
    },

    // Process submissions data
    processSubmissions: function() {
        console.log('Processing submissions...');

        const loadingElement = document.getElementById('loading');
        const tableContainer = document.getElementById('table-container');
        const submissionsBody = document.getElementById('submissions-body');
        const paginationContainer = document.getElementById('pagination');

        if (this.state.submissions.length === 0) {
            console.log('No submissions found');
            if (loadingElement) {
                loadingElement.innerHTML = '<p>No submissions found.</p>';
                loadingElement.style.display = 'block';
            }

            // Clear pagination
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }

            return;
        }

        // Apply filters (simplified for now)
        this.state.filteredSubmissions = [...this.state.submissions];

        // Update statistics
        this.updateStats();

        // Create charts
        this.createCharts();

        // Update activity section
        this.updateActivitySection();

        // Display submissions in table
        if (submissionsBody) {
            submissionsBody.innerHTML = '';

            // Get paginated submissions
            const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
            const endIndex = startIndex + this.state.itemsPerPage;
            const paginatedSubmissions = this.state.filteredSubmissions.slice(startIndex, endIndex);

            if (paginatedSubmissions.length === 0) {
                const noDataRow = document.createElement('tr');
                noDataRow.innerHTML = `<td colspan="8" style="text-align: center;">No submissions found</td>`;
                submissionsBody.appendChild(noDataRow);
            } else {
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
            }
        }

        // Create pagination
        this.createSubmissionsPagination();

        // Show table
        if (loadingElement) loadingElement.style.display = 'none';
        if (tableContainer) tableContainer.style.display = 'block';
    },

    // Create pagination for submissions
    createSubmissionsPagination: function() {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = '';

        // Add items per page dropdown
        const itemsPerPageContainer = document.createElement('div');
        itemsPerPageContainer.className = 'items-per-page';
        itemsPerPageContainer.innerHTML = `
            <label for="submissions-items-per-page">Show:</label>
            <select id="submissions-items-per-page" class="items-per-page-select">
                <option value="10" ${this.state.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                <option value="25" ${this.state.itemsPerPage === 25 ? 'selected' : ''}>25</option>
                <option value="50" ${this.state.itemsPerPage === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${this.state.itemsPerPage === 100 ? 'selected' : ''}>100</option>
            </select>
            <span>entries</span>
        `;
        paginationContainer.appendChild(itemsPerPageContainer);

        // Add event listener to items per page dropdown
        const itemsPerPageSelect = document.getElementById('submissions-items-per-page');
        if (itemsPerPageSelect) {
            itemsPerPageSelect.addEventListener('change', (e) => {
                this.state.itemsPerPage = parseInt(e.target.value, 10);
                this.state.currentPage = 1; // Reset to first page
                this.processSubmissions();
            });
        }

        // Calculate total pages
        const totalPages = Math.ceil(this.state.filteredSubmissions.length / this.state.itemsPerPage);

        // Create pagination buttons container
        const paginationButtons = document.createElement('div');
        paginationButtons.className = 'pagination-buttons';

        // Add pagination info
        const paginationInfo = document.createElement('div');
        paginationInfo.className = 'pagination-info';
        const startItem = Math.min((this.state.currentPage - 1) * this.state.itemsPerPage + 1, this.state.filteredSubmissions.length);
        const endItem = Math.min(this.state.currentPage * this.state.itemsPerPage, this.state.filteredSubmissions.length);
        paginationInfo.textContent = `Showing ${startItem} to ${endItem} of ${this.state.filteredSubmissions.length} entries`;
        paginationButtons.appendChild(paginationInfo);

        // Add buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        // Previous button
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-btn';
        prevButton.disabled = this.state.currentPage === 1;
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i> Previous';
        prevButton.addEventListener('click', () => {
            if (this.state.currentPage > 1) {
                this.state.currentPage--;
                this.processSubmissions();
            }
        });
        buttonContainer.appendChild(prevButton);

        // Page buttons
        const maxButtons = 5;
        let startPage = Math.max(1, this.state.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        // Adjust if we're near the end
        if (endPage - startPage + 1 < maxButtons && startPage > 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = 'pagination-btn' + (i === this.state.currentPage ? ' active' : '');
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                this.state.currentPage = i;
                this.processSubmissions();
            });
            buttonContainer.appendChild(pageButton);
        }

        // Next button
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-btn';
        nextButton.disabled = this.state.currentPage === totalPages;
        nextButton.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
        nextButton.addEventListener('click', () => {
            if (this.state.currentPage < totalPages) {
                this.state.currentPage++;
                this.processSubmissions();
            }
        });
        buttonContainer.appendChild(nextButton);

        paginationButtons.appendChild(buttonContainer);
        paginationContainer.appendChild(paginationButtons);
    },

    // Process guest list data
    processGuestList: function() {
        console.log('Processing guest list...');

        if (this.state.guests.length === 0) {
            console.log('No guests found in the guest list');
            return;
        }

        // Apply filters (simplified for now)
        this.state.filteredGuests = [...this.state.guests];

        // Update guest list statistics
        this.updateGuestListStats();

        // Display guest list
        this.displayGuestList();
    },

    // Update statistics
    updateStats: function() {
        console.log('Updating statistics...');

        const totalSubmissions = this.state.submissions.length;
        const attendingCount = this.state.submissions.filter(submission => submission.attending === 'yes').length;
        const notAttendingCount = this.state.submissions.filter(submission => submission.attending === 'no').length;

        // Calculate total guests
        const totalGuests = this.state.submissions
            .filter(submission => submission.attending === 'yes')
            .reduce((total, submission) => total + (submission.guestCount || 1), 0);

        // Calculate response rate
        const responseRate = Math.round((totalSubmissions / this.state.expectedInvites) * 100);

        // Calculate percentages
        const attendingPercent = totalSubmissions > 0 ? Math.round((attendingCount / totalSubmissions) * 100) : 0;
        const notAttendingPercent = totalSubmissions > 0 ? Math.round((notAttendingCount / totalSubmissions) * 100) : 0;

        // Calculate average party size
        const avgPartySize = attendingCount > 0
            ? (totalGuests / attendingCount).toFixed(1)
            : '0.0';

        // Get the latest RSVP
        const latestRsvp = this.state.submissions.length > 0 ? this.state.submissions[0] : {};

        // Update DOM elements with null checks
        const elements = {
            'total-submissions': totalSubmissions,
            'attending-count': attendingCount,
            'not-attending-count': notAttendingCount,
            'total-guests': totalGuests,
            'total-submissions-percent': `${responseRate}% of expected invites`,
            'attending-percent': `${attendingPercent}% of responses`,
            'not-attending-percent': `${notAttendingPercent}% of responses`,
            'avg-party-size': `Avg party size: ${avgPartySize}`,
            'response-rate': `${responseRate}%`
        };

        // Update all elements with null checks
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        // Update latest RSVP info
        if (latestRsvp.submittedAt) {
            const formattedDate = latestRsvp.submittedAt.toLocaleDateString();

            const latestRsvpNameElem = document.getElementById('latest-rsvp-name');
            const latestRsvpTimeElem = document.getElementById('latest-rsvp-time');

            if (latestRsvpNameElem) latestRsvpNameElem.textContent = latestRsvp.name || 'Unknown';
            if (latestRsvpTimeElem) latestRsvpTimeElem.textContent = `Submitted on ${formattedDate}`;
        }
    },

    // Update guest list statistics
    updateGuestListStats: function() {
        const totalGuests = this.state.guests.length;
        const respondedCount = this.state.guests.filter(guest => guest.hasResponded).length;
        const notRespondedCount = totalGuests - respondedCount;
        const attendingCount = this.state.guests.filter(guest => guest.response === 'attending').length;
        const notAttendingCount = this.state.guests.filter(guest => guest.response === 'declined').length;

        // Calculate percentages
        const respondedPercent = totalGuests > 0 ? ((respondedCount / totalGuests) * 100).toFixed(1) : 0;
        const notRespondedPercent = totalGuests > 0 ? ((notRespondedCount / totalGuests) * 100).toFixed(1) : 0;
        const attendingPercent = respondedCount > 0 ? ((attendingCount / respondedCount) * 100).toFixed(1) : 0;
        const notAttendingPercent = respondedCount > 0 ? ((notAttendingCount / respondedCount) * 100).toFixed(1) : 0;

        // Update DOM elements with null checks
        const elements = {
            'total-guests-count': totalGuests,
            'responded-count': respondedCount,
            'not-responded-count': notRespondedCount,
            'attending-guests-count': attendingCount,
            'not-attending-guests-count': notAttendingCount,
            'responded-percent': `${respondedPercent}% of total`,
            'not-responded-percent': `${notRespondedPercent}% of total`,
            'attending-guests-percent': `${attendingPercent}% of responded`,
            'not-attending-guests-percent': `${notAttendingPercent}% of responded`
        };

        // Update all elements with null checks
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    },

    // Display guest list
    displayGuestList: function() {
        const guestListBody = document.getElementById('guest-list-body');
        const paginationContainer = document.getElementById('guest-list-pagination');
        if (!guestListBody) return;

        guestListBody.innerHTML = '';

        // Get paginated guests
        const startIndex = (this.state.guestListPage - 1) * this.state.itemsPerPage;
        const endIndex = startIndex + this.state.itemsPerPage;
        const paginatedGuests = this.state.filteredGuests.slice(startIndex, endIndex);

        if (paginatedGuests.length === 0) {
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = `<td colspan="5" style="text-align: center;">No guests found</td>`;
            guestListBody.appendChild(noDataRow);

            // Clear pagination
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

            row.innerHTML = `
                <td>${guest.name || ''}</td>
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
        this.createGuestListPagination();
    },

    // Create pagination for guest list
    createGuestListPagination: function() {
        const paginationContainer = document.getElementById('guest-list-pagination');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = '';

        // Add items per page dropdown
        const itemsPerPageContainer = document.createElement('div');
        itemsPerPageContainer.className = 'items-per-page';
        itemsPerPageContainer.innerHTML = `
            <label for="guest-items-per-page">Show:</label>
            <select id="guest-items-per-page" class="items-per-page-select">
                <option value="10" ${this.state.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                <option value="25" ${this.state.itemsPerPage === 25 ? 'selected' : ''}>25</option>
                <option value="50" ${this.state.itemsPerPage === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${this.state.itemsPerPage === 100 ? 'selected' : ''}>100</option>
            </select>
            <span>entries</span>
        `;
        paginationContainer.appendChild(itemsPerPageContainer);

        // Add event listener to items per page dropdown
        const itemsPerPageSelect = document.getElementById('guest-items-per-page');
        if (itemsPerPageSelect) {
            itemsPerPageSelect.addEventListener('change', (e) => {
                this.state.itemsPerPage = parseInt(e.target.value, 10);
                this.state.guestListPage = 1; // Reset to first page
                this.displayGuestList();
            });
        }

        // Calculate total pages
        const totalPages = Math.ceil(this.state.filteredGuests.length / this.state.itemsPerPage);

        // Create pagination buttons container
        const paginationButtons = document.createElement('div');
        paginationButtons.className = 'pagination-buttons';

        // Add pagination info
        const paginationInfo = document.createElement('div');
        paginationInfo.className = 'pagination-info';
        const startItem = Math.min((this.state.guestListPage - 1) * this.state.itemsPerPage + 1, this.state.filteredGuests.length);
        const endItem = Math.min(this.state.guestListPage * this.state.itemsPerPage, this.state.filteredGuests.length);
        paginationInfo.textContent = `Showing ${startItem} to ${endItem} of ${this.state.filteredGuests.length} entries`;
        paginationButtons.appendChild(paginationInfo);

        // Add buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        // Previous button
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-btn';
        prevButton.disabled = this.state.guestListPage === 1;
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i> Previous';
        prevButton.addEventListener('click', () => {
            if (this.state.guestListPage > 1) {
                this.state.guestListPage--;
                this.displayGuestList();
            }
        });
        buttonContainer.appendChild(prevButton);

        // Page buttons
        const maxButtons = 5;
        let startPage = Math.max(1, this.state.guestListPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        // Adjust if we're near the end
        if (endPage - startPage + 1 < maxButtons && startPage > 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = 'pagination-btn' + (i === this.state.guestListPage ? ' active' : '');
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                this.state.guestListPage = i;
                this.displayGuestList();
            });
            buttonContainer.appendChild(pageButton);
        }

        // Next button
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-btn';
        nextButton.disabled = this.state.guestListPage === totalPages;
        nextButton.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
        nextButton.addEventListener('click', () => {
            if (this.state.guestListPage < totalPages) {
                this.state.guestListPage++;
                this.displayGuestList();
            }
        });
        buttonContainer.appendChild(nextButton);

        paginationButtons.appendChild(buttonContainer);
        paginationContainer.appendChild(paginationButtons);
    },

    // Create charts
    createCharts: function() {
        console.log('Creating charts...');

        // Clear existing charts
        if (window.attendanceChart instanceof Chart) {
            window.attendanceChart.destroy();
        }
        if (window.timelineChart instanceof Chart) {
            window.timelineChart.destroy();
        }

        // Get chart canvases
        const attendanceChartCanvas = document.getElementById('attendance-chart');
        const timelineChartCanvas = document.getElementById('timeline-chart');

        // Attendance breakdown chart
        const attendingCount = this.state.submissions.filter(submission => submission.attending === 'yes').length;
        const notAttendingCount = this.state.submissions.filter(submission => submission.attending === 'no').length;

        if (attendanceChartCanvas) {
            console.log('Creating attendance chart');
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
        }

        // Submissions timeline chart
        if (timelineChartCanvas && this.state.submissions.length > 0) {
            console.log('Creating timeline chart');

            const submissionDates = {};
            this.state.submissions.forEach(submission => {
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
        }
    },

    // Update activity section
    updateActivitySection: function() {
        console.log('Updating activity section...');

        // Update latest RSVP
        if (this.state.submissions.length > 0) {
            const latestRsvp = this.state.submissions[0]; // Submissions are already sorted by date desc
            const latestRsvpNameElem = document.getElementById('latest-rsvp-name');
            const latestRsvpTimeElem = document.getElementById('latest-rsvp-time');

            if (latestRsvpNameElem) {
                latestRsvpNameElem.textContent = latestRsvp.name || 'Unknown';
            }

            if (latestRsvpTimeElem && latestRsvp.submittedAt) {
                const formattedDate = latestRsvp.submittedAt.toLocaleDateString() + ' ' +
                                     latestRsvp.submittedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                latestRsvpTimeElem.textContent = `Submitted on ${formattedDate}`;
            }
        }

        // Update last sync time
        const lastSyncTimeElem = document.getElementById('last-sync-time');
        const syncStatusElem = document.getElementById('sync-status');

        if (lastSyncTimeElem) {
            const now = new Date();
            const formattedTime = now.toLocaleDateString() + ' ' +
                               now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            lastSyncTimeElem.textContent = formattedTime;
        }

        if (syncStatusElem) {
            syncStatusElem.textContent = 'Data loaded successfully';
            syncStatusElem.className = 'activity-status status-success';
        }

        // Update response trend
        const responseTrendElem = document.getElementById('response-trend');
        if (responseTrendElem && this.state.submissions.length > 0) {
            // Calculate trend based on last 7 days
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            const recentSubmissions = this.state.submissions.filter(s => s.submittedAt >= oneWeekAgo);
            const trendText = recentSubmissions.length > 0 ?
                `${recentSubmissions.length} new in last 7 days` :
                'No new responses in last 7 days';

            responseTrendElem.textContent = trendText;
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing RSVP System');
    RSVPSystem.init();
});

// Expose functions globally for the login script
window.fetchSubmissions = function() {
    console.log('Global fetchSubmissions called, delegating to RSVPSystem');
    RSVPSystem.fetchSubmissions();
};

window.fetchGuestList = function() {
    console.log('Global fetchGuestList called, delegating to RSVPSystem');
    RSVPSystem.fetchGuestList();
};
