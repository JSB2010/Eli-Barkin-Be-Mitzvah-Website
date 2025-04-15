// Guest List Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const loadingElement = document.getElementById('loading');
    const tableContainer = document.getElementById('table-container');
    const guestsBody = document.getElementById('guests-body');
    const searchBox = document.getElementById('search-box');
    const filterDropdown = document.getElementById('filter-dropdown');
    const exportBtn = document.getElementById('export-btn');
    const pagination = document.getElementById('pagination');
    const guestModal = document.getElementById('guest-modal');
    const modalBody = document.getElementById('modal-body');
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    const importBtn = document.getElementById('import-btn');
    const sheetIdInput = document.getElementById('sheet-id');
    const clearExistingCheckbox = document.getElementById('clear-existing');
    const importStatus = document.getElementById('import-status');

    // Stats elements
    const totalGuestsElement = document.getElementById('total-guests');
    const respondedCountElement = document.getElementById('responded-count');
    const notRespondedCountElement = document.getElementById('not-responded-count');
    const attendingCountElement = document.getElementById('attending-count');
    const notAttendingCountElement = document.getElementById('not-attending-count');
    const confirmedGuestsElement = document.getElementById('confirmed-guests');

    // State
    let allGuests = [];
    let filteredGuests = [];
    let currentPage = 1;
    const pageSize = 20;
    let currentSort = { field: 'name', direction: 'asc' };

    // Initialize Firebase Auth
    const auth = firebase.auth();

    // Check authentication state
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            loginSection.style.display = 'none';
            dashboardSection.classList.remove('hidden');
            loadGuestData();
        } else {
            // User is signed out
            loginSection.style.display = 'block';
            dashboardSection.classList.add('hidden');
        }
    });

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const email = loginForm.email.value;
            const password = loginForm.password.value;
            const submitButton = loginForm.querySelector('button[type="submit"]');
            const spinner = submitButton.querySelector('.spinner');

            // Show spinner
            submitButton.disabled = true;
            spinner.style.display = 'inline-block';

            // Sign in with email and password
            auth.signInWithEmailAndPassword(email, password)
                .catch(error => {
                    console.error('Login error:', error);
                    alert(`Login failed: ${error.message}`);
                })
                .finally(() => {
                    // Hide spinner
                    submitButton.disabled = false;
                    spinner.style.display = 'none';
                });
        });
    }

    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            auth.signOut().catch(error => {
                console.error('Logout error:', error);
            });
        });
    }

    // Load guest data
    async function loadGuestData() {
        loadingElement.style.display = 'flex';
        tableContainer.classList.add('hidden');

        try {
            // Check if guest list collection is available
            if (!window.guestListCollection) {
                throw new Error('Guest list collection not available');
            }

            // Get all guests
            allGuests = await window.getAllGuests();

            // Process guest data
            processGuestData();

        } catch (error) {
            console.error('Error loading guest data:', error);
            loadingElement.innerHTML = `
                <p>Error loading guest data: ${error.message}</p>
                <p>Please try refreshing the page.</p>
            `;
        }
    }

    // Process guest data
    function processGuestData() {
        if (allGuests.length === 0) {
            loadingElement.innerHTML = '<p>No guests found. Import your guest list to get started.</p>';
            return;
        }

        // Apply filters
        applyFilters();

        // Update stats
        updateStats();

        // Create charts
        createCharts();

        // Display guest table
        displayGuests();

        // Show table
        loadingElement.style.display = 'none';
        tableContainer.classList.remove('hidden');
    }

    // Apply search and filters
    function applyFilters() {
        const searchTerm = searchBox.value.toLowerCase();
        const filterValue = filterDropdown.value;

        filteredGuests = allGuests.filter(guest => {
            // Search filter
            const nameMatch = (guest.name || '').toLowerCase().includes(searchTerm);
            const emailMatch = (guest.email || '').toLowerCase().includes(searchTerm);
            const phoneMatch = (guest.phone || '').toLowerCase().includes(searchTerm);
            const categoryMatch = (guest.category || '').toLowerCase().includes(searchTerm);

            const searchMatch = nameMatch || emailMatch || phoneMatch || categoryMatch;

            // Status filter
            let statusMatch = true;

            switch (filterValue) {
                case 'responded':
                    statusMatch = guest.hasResponded === true;
                    break;
                case 'not-responded':
                    statusMatch = guest.hasResponded !== true;
                    break;
                case 'attending':
                    statusMatch = guest.hasResponded === true && guest.response === 'yes';
                    break;
                case 'not-attending':
                    statusMatch = guest.hasResponded === true && guest.response === 'no';
                    break;
                default:
                    statusMatch = true;
            }

            return searchMatch && statusMatch;
        });

        // Sort guests
        sortGuests();

        // Reset to first page when filtering
        currentPage = 1;
    }

    // Sort guests
    function sortGuests() {
        const { field, direction } = currentSort;

        filteredGuests.sort((a, b) => {
            let valueA = a[field];
            let valueB = b[field];

            // Handle special cases
            if (field === 'status') {
                valueA = a.hasResponded ? 1 : 0;
                valueB = b.hasResponded ? 1 : 0;
            } else if (field === 'response') {
                valueA = a.response === 'yes' ? 1 : (a.response === 'no' ? 0 : -1);
                valueB = b.response === 'yes' ? 1 : (b.response === 'no' ? 0 : -1);
            } else if (field === 'maxGuests') {
                valueA = a.maxAllowedGuests || 0;
                valueB = b.maxAllowedGuests || 0;
            } else if (field === 'guestCount') {
                valueA = a.actualGuestCount || 0;
                valueB = b.actualGuestCount || 0;
            }

            // Handle null/undefined values
            if (valueA === null || valueA === undefined) valueA = '';
            if (valueB === null || valueB === undefined) valueB = '';

            // Compare values
            if (typeof valueA === 'string' && typeof valueB === 'string') {
                return direction === 'asc'
                    ? valueA.localeCompare(valueB)
                    : valueB.localeCompare(valueA);
            } else {
                return direction === 'asc'
                    ? valueA - valueB
                    : valueB - valueA;
            }
        });
    }

    // Update stats
    function updateStats() {
        // Calculate stats
        const totalGuests = allGuests.length;
        const respondedCount = allGuests.filter(guest => guest.hasResponded).length;
        const notRespondedCount = totalGuests - respondedCount;
        const attendingCount = allGuests.filter(guest => guest.hasResponded && guest.response === 'yes').length;
        const notAttendingCount = allGuests.filter(guest => guest.hasResponded && guest.response === 'no').length;

        // Calculate confirmed guests (sum of actual guest counts for attending guests)
        const confirmedGuests = allGuests
            .filter(guest => guest.hasResponded && guest.response === 'yes')
            .reduce((sum, guest) => sum + (guest.actualGuestCount || 1), 0);

        // Calculate average party size
        const avgPartySize = attendingCount > 0
            ? (confirmedGuests / attendingCount).toFixed(1)
            : '0.0';

        // Calculate percentages
        const respondedPercent = totalGuests > 0
            ? ((respondedCount / totalGuests) * 100).toFixed(1)
            : 0;
        const notRespondedPercent = totalGuests > 0
            ? ((notRespondedCount / totalGuests) * 100).toFixed(1)
            : 0;
        const attendingPercent = respondedCount > 0
            ? ((attendingCount / respondedCount) * 100).toFixed(1)
            : 0;
        const notAttendingPercent = respondedCount > 0
            ? ((notAttendingCount / respondedCount) * 100).toFixed(1)
            : 0;

        // Update DOM elements
        totalGuestsElement.textContent = totalGuests;
        respondedCountElement.textContent = respondedCount;
        notRespondedCountElement.textContent = notRespondedCount;
        attendingCountElement.textContent = attendingCount;
        notAttendingCountElement.textContent = notAttendingCount;
        confirmedGuestsElement.textContent = confirmedGuests;

        // Update subtext elements
        document.getElementById('total-guests-subtext').textContent =
            `Invited parties`;
        document.getElementById('responded-percent').textContent =
            `${respondedPercent}% of total`;
        document.getElementById('not-responded-percent').textContent =
            `${notRespondedPercent}% of total`;
        document.getElementById('attending-percent').textContent =
            `${attendingPercent}% of responses`;
        document.getElementById('not-attending-percent').textContent =
            `${notAttendingPercent}% of responses`;
        document.getElementById('avg-party-size').textContent =
            `Avg party size: ${avgPartySize}`;
    }

    // Create charts
    function createCharts() {
        // Clear existing charts
        const responseChartCanvas = document.getElementById('response-chart');
        const categoryChartCanvas = document.getElementById('category-chart');

        // Destroy existing charts if they exist
        if (window.responseChart instanceof Chart) {
            window.responseChart.destroy();
        }
        if (window.categoryChart instanceof Chart) {
            window.categoryChart.destroy();
        }

        // Response status chart
        const respondedCount = allGuests.filter(guest => guest.hasResponded).length;
        const notRespondedCount = allGuests.length - respondedCount;

        window.responseChart = new Chart(responseChartCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Responded', 'Not Responded'],
                datasets: [{
                    data: [respondedCount, notRespondedCount],
                    backgroundColor: ['#3498db', '#e74c3c'],
                    borderWidth: 0
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

        // Category chart
        const categories = {};
        const categoryResponded = {};

        // Count guests by category
        allGuests.forEach(guest => {
            const category = guest.category || 'Uncategorized';
            categories[category] = (categories[category] || 0) + 1;

            if (guest.hasResponded) {
                categoryResponded[category] = (categoryResponded[category] || 0) + 1;
            }
        });

        // Prepare data for chart
        const categoryLabels = Object.keys(categories);
        const categoryTotals = categoryLabels.map(cat => categories[cat]);
        const categoryRespondedData = categoryLabels.map(cat => categoryResponded[cat] || 0);
        const categoryNotRespondedData = categoryLabels.map(cat => categories[cat] - (categoryResponded[cat] || 0));

        window.categoryChart = new Chart(categoryChartCanvas, {
            type: 'bar',
            data: {
                labels: categoryLabels,
                datasets: [
                    {
                        label: 'Responded',
                        data: categoryRespondedData,
                        backgroundColor: '#3498db',
                        borderWidth: 0
                    },
                    {
                        label: 'Not Responded',
                        data: categoryNotRespondedData,
                        backgroundColor: '#e74c3c',
                        borderWidth: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Display guests table
    function displayGuests() {
        // Clear table
        guestsBody.innerHTML = '';

        // Calculate pagination
        const totalPages = Math.ceil(filteredGuests.length / pageSize);
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, filteredGuests.length);
        const currentGuests = filteredGuests.slice(startIndex, endIndex);

        // Add guests to table
        currentGuests.forEach(guest => {
            const row = document.createElement('tr');

            // Format status badge
            let statusBadge = '';
            if (guest.hasResponded) {
                statusBadge = '<span class="status-badge status-responded"><i class="fas fa-check-circle"></i> Responded</span>';
            } else {
                statusBadge = '<span class="status-badge status-not-responded"><i class="fas fa-times-circle"></i> Not Responded</span>';
            }

            // Format response badge
            let responseBadge = '';
            if (guest.hasResponded) {
                if (guest.response === 'yes') {
                    responseBadge = '<span class="status-badge status-attending"><i class="fas fa-check-circle"></i> Attending</span>';
                } else {
                    responseBadge = '<span class="status-badge status-not-attending"><i class="fas fa-times-circle"></i> Not Attending</span>';
                }
            } else {
                responseBadge = '<span>-</span>';
            }

            row.innerHTML = `
                <td>${guest.name || ''}</td>
                <td>${guest.email || ''}</td>
                <td>${guest.phone || ''}</td>
                <td>${guest.category || ''}</td>
                <td>${guest.maxAllowedGuests || 1}</td>
                <td>${statusBadge}</td>
                <td>${responseBadge}</td>
                <td>${guest.hasResponded ? (guest.actualGuestCount || 1) : '-'}</td>
                <td>
                    <button class="btn-icon view-details" data-id="${guest.id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;

            guestsBody.appendChild(row);
        });

        // Add event listeners to view details buttons
        const viewDetailsButtons = document.querySelectorAll('.view-details');
        viewDetailsButtons.forEach(button => {
            button.addEventListener('click', function() {
                const guestId = this.getAttribute('data-id');
                const guest = allGuests.find(g => g.id === guestId);
                if (guest) {
                    showGuestDetails(guest);
                }
            });
        });

        // Update pagination
        updatePagination(totalPages);
    }

    // Update pagination
    function updatePagination(totalPages) {
        pagination.innerHTML = '';

        if (totalPages <= 1) {
            return;
        }

        // Previous button
        const prevButton = document.createElement('button');
        prevButton.className = `page-btn ${currentPage === 1 ? 'disabled' : ''}`;
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                displayGuests();
            }
        });
        pagination.appendChild(prevButton);

        // Page buttons
        const maxButtons = 5;
        const startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        const endPage = Math.min(totalPages, startPage + maxButtons - 1);

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                currentPage = i;
                displayGuests();
            });
            pagination.appendChild(pageButton);
        }

        // Next button
        const nextButton = document.createElement('button');
        nextButton.className = `page-btn ${currentPage === totalPages ? 'disabled' : ''}`;
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                displayGuests();
            }
        });
        pagination.appendChild(nextButton);
    }

    // Show guest details
    function showGuestDetails(guest) {
        // Format date
        let submittedDate = 'Not submitted';
        if (guest.submittedAt) {
            if (guest.submittedAt.toDate) {
                // Firestore Timestamp
                submittedDate = guest.submittedAt.toDate().toLocaleString();
            } else if (guest.submittedAt.seconds) {
                // Firestore Timestamp in seconds
                submittedDate = new Date(guest.submittedAt.seconds * 1000).toLocaleString();
            } else {
                // Regular Date object
                submittedDate = new Date(guest.submittedAt).toLocaleString();
            }
        }

        // Format additional guests
        let additionalGuestsHtml = '';
        if (guest.additionalGuests && guest.additionalGuests.length > 0) {
            additionalGuestsHtml = `
                <div class="detail-row">
                    <div class="detail-label">Additional Guests:</div>
                    <div class="detail-value">
                        <ul>
                            ${guest.additionalGuests.map(g => `<li>${g}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        // Format notes
        let notesHtml = '';
        if (guest.notes) {
            notesHtml = `
                <div class="detail-row">
                    <div class="detail-label">Notes:</div>
                    <div class="detail-value">${guest.notes}</div>
                </div>
            `;
        }

        // Update modal content
        modalBody.innerHTML = `
            <div class="detail-row">
                <div class="detail-label">Name:</div>
                <div class="detail-value">${guest.name || ''}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Email:</div>
                <div class="detail-value">${guest.email || ''}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Phone:</div>
                <div class="detail-value">${guest.phone || ''}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Category:</div>
                <div class="detail-value">${guest.category || ''}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Max Guests:</div>
                <div class="detail-value">${guest.maxAllowedGuests || 1}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Status:</div>
                <div class="detail-value">
                    ${guest.hasResponded
                        ? '<span class="status-badge status-responded"><i class="fas fa-check-circle"></i> Responded</span>'
                        : '<span class="status-badge status-not-responded"><i class="fas fa-times-circle"></i> Not Responded</span>'}
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Response:</div>
                <div class="detail-value">
                    ${guest.hasResponded
                        ? (guest.response === 'yes'
                            ? '<span class="status-badge status-attending"><i class="fas fa-check-circle"></i> Attending</span>'
                            : '<span class="status-badge status-not-attending"><i class="fas fa-times-circle"></i> Not Attending</span>')
                        : '-'}
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Guest Count:</div>
                <div class="detail-value">${guest.hasResponded ? (guest.actualGuestCount || 1) : '-'}</div>
            </div>
            ${additionalGuestsHtml}
            <div class="detail-row">
                <div class="detail-label">Submitted At:</div>
                <div class="detail-value">${submittedDate}</div>
            </div>
            ${notesHtml}
        `;

        // Show modal
        guestModal.style.display = 'block';
    }

    // Close modal
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', function() {
            guestModal.style.display = 'none';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === guestModal) {
            guestModal.style.display = 'none';
        }
    });

    // Search box
    if (searchBox) {
        searchBox.addEventListener('input', function() {
            applyFilters();
            displayGuests();
        });
    }

    // Filter dropdown
    if (filterDropdown) {
        filterDropdown.addEventListener('change', function() {
            applyFilters();
            displayGuests();
        });
    }

    // Sort table
    const sortableHeaders = document.querySelectorAll('th.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const field = this.getAttribute('data-sort');

            // Toggle direction if same field, otherwise default to asc
            if (currentSort.field === field) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.field = field;
                currentSort.direction = 'asc';
            }

            // Update sort indicators
            sortableHeaders.forEach(h => {
                h.classList.remove('sorted-asc', 'sorted-desc');
            });

            this.classList.add(`sorted-${currentSort.direction}`);

            // Apply sort and update display
            sortGuests();
            displayGuests();
        });
    });

    // Export to CSV
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            // Prepare CSV content
            const headers = [
                'Name', 'Email', 'Phone', 'Category', 'Max Guests',
                'Has Responded', 'Response', 'Guest Count', 'Additional Guests',
                'Submitted At', 'Notes'
            ];

            const rows = allGuests.map(guest => {
                return [
                    guest.name || '',
                    guest.email || '',
                    guest.phone || '',
                    guest.category || '',
                    guest.maxAllowedGuests || 1,
                    guest.hasResponded ? 'Yes' : 'No',
                    guest.hasResponded ? (guest.response === 'yes' ? 'Attending' : 'Not Attending') : '',
                    guest.hasResponded ? (guest.actualGuestCount || 1) : '',
                    (guest.additionalGuests || []).join(', '),
                    guest.submittedAt ? (guest.submittedAt.toDate ? guest.submittedAt.toDate().toLocaleString() : new Date(guest.submittedAt).toLocaleString()) : '',
                    guest.notes || ''
                ];
            });

            // Convert to CSV
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `guest-list-${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.display = 'none';

            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Import from Google Sheets
    if (importBtn) {
        importBtn.addEventListener('click', async function() {
            const clearExisting = clearExistingCheckbox.checked;

            // Show loading state
            importBtn.disabled = true;
            importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';
            importStatus.className = 'import-status';
            importStatus.textContent = 'Importing guest list...';
            importStatus.style.display = 'block';

            try {
                // Call the Cloud Function to import guest list
                const response = await fetch('https://us-central1-eli-barkin-be-mitzvah.cloudfunctions.net/importGuestList', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        clearExisting
                    })
                });

                const result = await response.json();

                if (result.success) {
                    importStatus.className = 'import-status success';
                    importStatus.innerHTML = `<i class="fas fa-check-circle"></i> ${result.message}`;

                    // Reload guest data
                    setTimeout(() => {
                        loadGuestData();
                    }, 1500);
                } else {
                    throw new Error(result.message || 'Import failed');
                }
            } catch (error) {
                console.error('Import error:', error);
                importStatus.className = 'import-status error';
                importStatus.innerHTML = `<i class="fas fa-exclamation-circle"></i> Import failed: ${error.message}`;
            } finally {
                // Reset button state
                importBtn.disabled = false;
                importBtn.innerHTML = '<i class="fas fa-file-import"></i> Import Guest List';
            }
        });
    }
});
