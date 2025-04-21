// RSVP Dashboard System - Completely isolated namespace
const RSVPSystem = {
    // Debug mode
    DEBUG_MODE: true,

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
        debugLog: []
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
        if (!debugLogElement) return;

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
    },

    // Initialize debug panel controls
    initDebugControls: function() {
        const clearDebugBtn = document.getElementById('clear-debug');
        const toggleDebugBtn = document.getElementById('toggle-debug');
        const debugPanel = document.querySelector('.debug-panel');

        if (clearDebugBtn) {
            clearDebugBtn.addEventListener('click', () => {
                this.debug.clear();
            });
        }

        if (toggleDebugBtn && debugPanel) {
            toggleDebugBtn.addEventListener('click', () => {
                const debugContent = debugPanel.querySelector('.debug-content');
                if (debugContent) {
                    if (debugContent.style.display === 'none') {
                        debugContent.style.display = 'block';
                        toggleDebugBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide';
                    } else {
                        debugContent.style.display = 'none';
                        toggleDebugBtn.innerHTML = '<i class="fas fa-eye"></i> Show';
                    }
                }
            });
        }
    },

    // Initialize the system
    init: function() {
        this.debug.info('RSVP System initializing...');

        // Initialize debug panel controls
        this.initDebugControls();

        // Initialize Firestore
        try {
            this.state.db = firebase.firestore();
            this.debug.info('Firestore initialized successfully');
        } catch (error) {
            this.debug.error('Error initializing Firestore:', error);
            this.showError('Could not connect to database: ' + error.message);
        }

        // Set up event listeners
        this.setupEventListeners();

        console.log('RSVP System initialized');
    },

    // Set up event listeners
    setupEventListeners: function() {
        // Set up sorting for guest list
        const guestListHeaders = document.querySelectorAll('#guest-list-container th.sortable');
        guestListHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-sort');
                if (column) {
                    // Toggle sort direction if same column is clicked again
                    if (this.state.guestSortColumn === column) {
                        this.state.guestSortDirection = this.state.guestSortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        this.state.guestSortColumn = column;
                        this.state.guestSortDirection = 'asc';
                    }

                    // Update sort indicators
                    guestListHeaders.forEach(h => {
                        const sortIcon = h.querySelector('.sort-icon');
                        if (sortIcon) {
                            if (h.getAttribute('data-sort') === this.state.guestSortColumn) {
                                sortIcon.textContent = this.state.guestSortDirection === 'asc' ? '↑' : '↓';
                                sortIcon.classList.add('active');
                            } else {
                                sortIcon.textContent = '↕';
                                sortIcon.classList.remove('active');
                            }
                        }
                    });

                    // Reset to first page and refresh
                    this.state.guestListPage = 1;
                    this.processGuestList();
                }
            });
        });

        // Set up sorting for submissions
        const submissionHeaders = document.querySelectorAll('#table-container th.sortable');
        submissionHeaders.forEach(header => {
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

                    // Update sort indicators
                    submissionHeaders.forEach(h => {
                        const sortIcon = h.querySelector('.sort-icon');
                        if (sortIcon) {
                            if (h.getAttribute('data-sort') === this.state.sortColumn) {
                                sortIcon.textContent = this.state.sortDirection === 'asc' ? '↑' : '↓';
                                sortIcon.classList.add('active');
                            } else {
                                sortIcon.textContent = '↕';
                                sortIcon.classList.remove('active');
                            }
                        }
                    });

                    // Reset to first page and refresh
                    this.state.currentPage = 1;
                    this.processSubmissions();
                }
            });
        });

        // Set up search for guest list
        const guestSearchBox = document.getElementById('guest-search-box');
        if (guestSearchBox) {
            guestSearchBox.addEventListener('input', (e) => {
                this.state.guestSearchTerm = e.target.value.toLowerCase();
                this.state.guestListPage = 1; // Reset to first page
                this.processGuestList();
            });
        }

        // Set up search for submissions
        const searchBox = document.getElementById('search-box');
        if (searchBox) {
            searchBox.addEventListener('input', (e) => {
                this.state.searchTerm = e.target.value.toLowerCase();
                this.state.currentPage = 1; // Reset to first page
                this.processSubmissions();
            });
        }

        // Set up response filter for guest list
        const responseFilter = document.getElementById('response-filter');
        if (responseFilter) {
            responseFilter.addEventListener('change', (e) => {
                this.state.responseFilter = e.target.value;
                this.state.guestListPage = 1; // Reset to first page
                this.processGuestList();
            });
        }

        // Set up filter for submissions
        const filterDropdown = document.getElementById('filter-dropdown');
        if (filterDropdown) {
            filterDropdown.addEventListener('change', (e) => {
                this.state.submissionFilter = e.target.value;
                this.state.currentPage = 1; // Reset to first page
                this.processSubmissions();
            });
        }

        // Set up export for guest list
        const exportGuestListBtn = document.getElementById('export-guest-list-btn');
        if (exportGuestListBtn) {
            exportGuestListBtn.addEventListener('click', () => {
                this.exportGuestListToCSV();
            });
        }

        // Set up export for submissions
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportSubmissionsToCSV();
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

        // Set up add guest form submission
        const addGuestSubmitBtn = document.getElementById('add-guest-submit');
        if (addGuestSubmitBtn) {
            addGuestSubmitBtn.addEventListener('click', () => {
                this.submitAddGuestForm();
            });
        }

        // Set up logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                firebase.auth().signOut().then(() => {
                    console.log('User signed out');
                    document.getElementById('login-section').classList.remove('hidden');
                    document.getElementById('dashboard-section').classList.add('hidden');
                }).catch((error) => {
                    console.error('Error signing out:', error);
                });
            });
        }

        // Set up view details buttons for submissions
        document.addEventListener('click', (e) => {
            if (e.target.closest('.view-details')) {
                const button = e.target.closest('.view-details');
                const submissionId = button.getAttribute('data-id');
                if (submissionId) {
                    this.showSubmissionDetails(submissionId);
                }
            }
        });

        // Set up view details buttons for guest list
        document.addEventListener('click', (e) => {
            if (e.target.closest('.view-guest-details')) {
                const button = e.target.closest('.view-guest-details');
                const guestId = button.getAttribute('data-id');
                if (guestId) {
                    this.showGuestDetails(guestId);
                }
            }
        });

        // Set up modal close buttons
        const modalCloseButtons = document.querySelectorAll('.modal-close');
        modalCloseButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Close modal when clicking outside of it
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
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
        this.debug.error('Error:', message);

        // Add error to debug log with stack trace
        try {
            throw new Error(message);
        } catch (e) {
            this.debug.error('Stack trace:', e.stack);
        }
    },

    // Fetch submissions from Firestore
    fetchSubmissions: function() {
        this.debug.info('RSVPSystem.fetchSubmissions called');

        this.showLoading();

        const tableContainer = document.getElementById('table-container');
        if (tableContainer) {
            tableContainer.style.display = 'none';
        }

        if (!this.state.db) {
            const errorMsg = 'Database connection not available';
            this.debug.error(errorMsg);
            this.showError(errorMsg);
            return;
        }

        this.debug.info('Fetching from sheetRsvps collection...');

        // Add timestamp to track how long the query takes
        const startTime = new Date().getTime();

        this.state.db.collection('sheetRsvps').orderBy('submittedAt', 'desc').get()
            .then((querySnapshot) => {
                const endTime = new Date().getTime();
                const queryTime = endTime - startTime;

                this.debug.info(`Query successful, received ${querySnapshot.size} documents in ${queryTime}ms`);

                this.state.submissions = querySnapshot.docs.map(doc => {
                    const data = doc.data() || {};
                    let submittedDate;

                    try {
                        submittedDate = data.submittedAt?.toDate() || new Date();
                    } catch (e) {
                        this.debug.warn(`Error converting timestamp for doc: ${doc.id}`, e);
                        submittedDate = new Date();
                    }

                    return {
                        id: doc.id,
                        ...data,
                        submittedAt: submittedDate
                    };
                });

                this.debug.info(`Processed submissions data: ${this.state.submissions.length} items`);

                // Log the first submission for debugging
                if (this.state.submissions.length > 0) {
                    this.debug.debug('First submission sample:', this.state.submissions[0]);
                }

                // Process the data
                this.processSubmissions();
            })
            .catch((error) => {
                this.debug.error('Error fetching submissions:', error);
                this.showError('Error loading data: ' + error.message);
            });
    },

    // Fetch guest list from Firestore
    fetchGuestList: function() {
        this.debug.info('RSVPSystem.fetchGuestList called');

        if (!this.state.db) {
            const errorMsg = 'Firestore database is not available for guest list';
            this.debug.error(errorMsg);
            this.showError(errorMsg);
            return;
        }

        this.debug.info('Fetching from guestList collection...');

        // Add timestamp to track how long the query takes
        const startTime = new Date().getTime();

        this.state.db.collection('guestList').get()
            .then((querySnapshot) => {
                const endTime = new Date().getTime();
                const queryTime = endTime - startTime;

                this.debug.info(`Guest list query successful, received ${querySnapshot.size} documents in ${queryTime}ms`);

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

                this.debug.info(`Processed guest list data: ${this.state.guests.length} items`);

                // Log the first guest for debugging
                if (this.state.guests.length > 0) {
                    this.debug.debug('First guest sample:', this.state.guests[0]);
                }

                // Process the guest list
                this.processGuestList();
            })
            .catch((error) => {
                this.debug.error('Error fetching guest list:', error);
                this.showError('Error loading guest list: ' + error.message);
            });
    },

    // Process submissions data
    processSubmissions: function() {
        // Refactored to reduce cognitive complexity
        console.log('Processing submissions...');

        this.prepareSubmissionsData();
        this.filterAndSortSubmissions();
        this.renderSubmissionsTable();
    },

    // Helper method to prepare submissions data
    prepareSubmissionsData: function() {
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

        // Apply search filter
        this.filterSubmissionsBySearchTerm();
    },

    // Helper method to filter submissions by search term
    filterSubmissionsBySearchTerm: function() {
        if (this.state.searchTerm) {
            this.state.filteredSubmissions = this.state.submissions.filter(submission => {
                return (
                    submission.name?.toLowerCase().includes(this.state.searchTerm) ||
                    submission.email?.toLowerCase().includes(this.state.searchTerm) ||
                    submission.phone?.toLowerCase().includes(this.state.searchTerm)
                );
            });
        } else {
            this.state.filteredSubmissions = [...this.state.submissions];
        }

        // Apply dropdown filter
        if (this.state.submissionFilter && this.state.submissionFilter !== 'all') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            this.state.filteredSubmissions = this.state.filteredSubmissions.filter(submission => {
                switch (this.state.submissionFilter) {
                    case 'attending':
                        return submission.attending === 'yes';
                    case 'not-attending':
                        return submission.attending === 'no';
                    case 'recent':
                        return submission.submittedAt >= oneWeekAgo;
                    case 'large-party':
                        return (submission.guestCount || 1) >= 4;
                    default:
                        return true;
                }
            });
        }
    },

    // Helper method to filter and sort submissions
    filterAndSortSubmissions: function() {
        // Apply sorting
        if (this.state.sortColumn) {
            this.applySorting();
        }
    },

    // Helper method to apply sorting
    applySorting: function() {
        this.state.filteredSubmissions.sort((a, b) => {
            let valueA, valueB;

            // Get the values to compare based on the sort column
                switch (this.state.sortColumn) {
                    case 'date':
                        valueA = a.submittedAt || new Date(0);
                        valueB = b.submittedAt || new Date(0);
                        break;
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
                    case 'attending':
                        valueA = a.attending === 'yes' ? 1 : 0;
                        valueB = b.attending === 'yes' ? 1 : 0;
                        break;
                    case 'guestCount':
                        valueA = a.guestCount || 1;
                        valueB = b.guestCount || 1;
                        break;
                    default:
                        valueA = a[this.state.sortColumn] || '';
                        valueB = b[this.state.sortColumn] || '';
                }

                // Compare the values
                if (valueA instanceof Date && valueB instanceof Date) {
                    const comparison = valueA.getTime() - valueB.getTime();
                    return this.state.sortDirection === 'asc' ? comparison : -comparison;
                } else if (typeof valueA === 'string' && typeof valueB === 'string') {
                    const comparison = valueA.localeCompare(valueB);
                    return this.state.sortDirection === 'asc' ? comparison : -comparison;
                } else {
                    const comparison = valueA - valueB;
                    return this.state.sortDirection === 'asc' ? comparison : -comparison;
                }
            });
        }

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

                    // Format adult and child guests
                    const adultGuests = submission.adultGuests || [];
                    const childGuests = submission.childGuests || [];
                    const adultGuestsStr = adultGuests.length > 0 ? adultGuests.join(', ') : 'None';
                    const childGuestsStr = childGuests.length > 0 ? childGuests.join(', ') : 'None';

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
                        <td>${submission.adultCount || 0}</td>
                        <td>${submission.childCount || 0}</td>
                        <td>
                            <div class="guest-names-cell">
                                ${adultGuests.length > 0 ?
                                    `<div class="guest-category"><span class="guest-category-label">Adults:</span> ${adultGuestsStr}</div>` : ''}
                                ${childGuests.length > 0 ?
                                    `<div class="guest-category"><span class="guest-category-label">Children:</span> ${childGuestsStr}</div>` : ''}
                                ${adultGuests.length === 0 && childGuests.length === 0 ? 'None' : ''}
                            </div>
                        </td>
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

        // Update guest response status based on submissions
        this.updateGuestResponseStatus();

        // Apply search filter
        if (this.state.guestSearchTerm) {
            this.state.filteredGuests = this.state.guests.filter(guest => {
                return (
                    guest.name?.toLowerCase().includes(this.state.guestSearchTerm) ||
                    guest.email?.toLowerCase().includes(this.state.guestSearchTerm) ||
                    guest.phone?.toLowerCase().includes(this.state.guestSearchTerm)
                );
            });
        } else {
            this.state.filteredGuests = [...this.state.guests];
        }

        // Apply response filter
        if (this.state.responseFilter && this.state.responseFilter !== 'all') {
            this.state.filteredGuests = this.state.filteredGuests.filter(guest => {
                switch (this.state.responseFilter) {
                    case 'responded':
                        return guest.hasResponded;
                    case 'not-responded':
                        return !guest.hasResponded;
                    case 'attending':
                        return guest.hasResponded && guest.response === 'attending';
                    case 'not-attending':
                        return guest.hasResponded && guest.response === 'declined';
                    default:
                        return true;
                }
            });
        }

        // Apply sorting
        if (this.state.guestSortColumn) {
            this.state.filteredGuests.sort((a, b) => {
                let valueA, valueB;

                // Get the values to compare based on the sort column
                switch (this.state.guestSortColumn) {
                    case 'name':
                        valueA = a.name || '';
                        valueB = b.name || '';
                        break;
                    case 'status':
                        valueA = a.hasResponded ? 1 : 0;
                        valueB = b.hasResponded ? 1 : 0;
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
                        // Determine if guests are out-of-town (not from Colorado)
                        const isOutOfTownA = a.address && a.address.state &&
                                            a.address.state.toUpperCase() !== 'CO' &&
                                            a.address.state.toUpperCase() !== 'COLORADO';
                        const isOutOfTownB = b.address && b.address.state &&
                                            b.address.state.toUpperCase() !== 'CO' &&
                                            b.address.state.toUpperCase() !== 'COLORADO';
                        valueA = isOutOfTownA ? 1 : 0;
                        valueB = isOutOfTownB ? 1 : 0;
                        break;
                    default:
                        valueA = a[this.state.guestSortColumn] || '';
                        valueB = b[this.state.guestSortColumn] || '';
                }

                // Compare the values
                if (typeof valueA === 'string' && typeof valueB === 'string') {
                    const comparison = valueA.localeCompare(valueB);
                    return this.state.guestSortDirection === 'asc' ? comparison : -comparison;
                } else {
                    const comparison = valueA - valueB;
                    return this.state.guestSortDirection === 'asc' ? comparison : -comparison;
                }
            });
        }

        // Update guest list statistics
        this.updateGuestListStats();

        // Display guest list
        this.displayGuestList();
    },

    // Update guest response status based on submissions
    updateGuestResponseStatus: function() {
        // Skip if no submissions or guests
        if (!this.state.submissions.length || !this.state.guests.length) return;

        // Create a map of submissions by name for quick lookup
        const submissionsByName = new Map();
        this.state.submissions.forEach(submission => {
            if (submission.name) {
                submissionsByName.set(submission.name.toLowerCase(), submission);
            }
        });

        // Update guest response status based on matching submissions
        this.state.guests.forEach(guest => {
            if (guest.name) {
                const matchingSubmission = submissionsByName.get(guest.name.toLowerCase());
                if (matchingSubmission) {
                    // Update guest response status
                    guest.hasResponded = true;
                    guest.response = matchingSubmission.attending === 'yes' ? 'attending' : 'declined';
                    guest.actualGuestCount = matchingSubmission.guestCount || 1;
                    guest.additionalGuests = matchingSubmission.additionalGuests || [];
                    guest.email = matchingSubmission.email || guest.email;
                    guest.phone = matchingSubmission.phone || guest.phone;
                    guest.submittedAt = matchingSubmission.submittedAt;
                }
            }
        });
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

            // Determine if guest is out-of-town (not from Colorado)
            const isOutOfTown = guest.address && guest.address.state &&
                                guest.address.state.toUpperCase() !== 'CO' &&
                                guest.address.state.toUpperCase() !== 'COLORADO';

            // Create location badge
            const locationBadge = isOutOfTown ?
                `<span class="location-badge out-of-town"><i class="fas fa-plane"></i> Out-of-Town</span>` :
                `<span class="location-badge local"><i class="fas fa-home"></i> Local</span>`;

            row.innerHTML = `
                <td>${guest.name || ''}</td>
                <td>${responseStatus}</td>
                <td>${rsvpResponse}</td>
                <td>${guest.hasResponded ? (guest.actualGuestCount || 0) : '-'}</td>
                <td>${locationBadge}</td>
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
        if (window.ageBreakdownChart instanceof Chart) {
            window.ageBreakdownChart.destroy();
        }
        if (window.outOfTownEventsChart instanceof Chart) {
            window.outOfTownEventsChart.destroy();
        }

        // Get chart canvases
        const attendanceChartCanvas = document.getElementById('attendance-chart');
        const timelineChartCanvas = document.getElementById('timeline-chart');
        const ageBreakdownChartCanvas = document.getElementById('age-breakdown-chart');
        const outOfTownEventsChartCanvas = document.getElementById('out-of-town-events-chart');

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

        // Age breakdown chart
        if (ageBreakdownChartCanvas && this.state.submissions.length > 0) {
            console.log('Creating age breakdown chart');

            // Calculate adult and child counts from attending submissions
            const attendingSubmissions = this.state.submissions.filter(s => s.attending === 'yes');

            let totalAdults = 0;
            let totalChildren = 0;

            attendingSubmissions.forEach(submission => {
                totalAdults += submission.adultCount || 0;
                totalChildren += submission.childCount || 0;
            });

            window.ageBreakdownChart = new Chart(ageBreakdownChartCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['Adults', 'Children'],
                    datasets: [{
                        data: [totalAdults, totalChildren],
                        backgroundColor: ['#1e88e5', '#4caf50'],
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

        // Response rate chart
        const responseRateAnalyticsElem = document.getElementById('response-rate-analytics');
        if (responseRateAnalyticsElem && this.state.guests.length > 0) {
            console.log('Creating response rate analytics');

            // Calculate response rate
            const totalGuests = this.state.guests.length;
            const respondedCount = this.state.guests.filter(guest => guest.hasResponded).length;
            const notRespondedCount = totalGuests - respondedCount;

            const respondedPercentage = Math.round((respondedCount / totalGuests) * 100);
            const notRespondedPercentage = 100 - respondedPercentage;

            // Create the HTML content
            responseRateAnalyticsElem.innerHTML = `
                <div class="response-rate-container">
                    <div class="response-rate-bar">
                        <div class="responded-bar" style="width: ${respondedPercentage}%" title="${respondedCount} Responded (${respondedPercentage}%)"></div>
                        <div class="not-responded-bar" style="width: ${notRespondedPercentage}%" title="${notRespondedCount} Not Responded (${notRespondedPercentage}%)"></div>
                    </div>
                    <div class="response-rate-text">
                        <span class="responded-text">${respondedPercentage}% Responded</span>
                    </div>
                </div>
            `;
        }

        // Attendance prediction chart
        const attendancePredictionAnalyticsElem = document.getElementById('attendance-prediction-analytics');
        if (attendancePredictionAnalyticsElem && this.state.guests.length > 0) {
            console.log('Creating attendance prediction analytics');

            // Calculate current attendance numbers
            const totalGuests = this.state.guests.length;
            const respondedCount = this.state.guests.filter(guest => guest.hasResponded).length;
            const attendingCount = this.state.guests.filter(guest => guest.response === 'attending').length;

            // Calculate attendance rate among those who responded
            const attendanceRate = respondedCount > 0 ? attendingCount / respondedCount : 0;

            // Predict final attendance based on current rate
            const predictedAttendance = Math.round(totalGuests * attendanceRate);

            // Calculate a range (±10%)
            const lowerBound = Math.max(0, Math.round(predictedAttendance * 0.9));
            const upperBound = Math.round(predictedAttendance * 1.1);

            // Create the HTML content
            attendancePredictionAnalyticsElem.innerHTML = `
                <div class="prediction-container">
                    <div class="prediction-value">${predictedAttendance} Guests</div>
                    <div class="prediction-range">Range: ${lowerBound} - ${upperBound}</div>
                </div>
            `;
        }

        // Out-of-town events chart
        if (outOfTownEventsChartCanvas && this.state.submissions.length > 0) {
            console.log('Creating out-of-town events chart');

            // Calculate out-of-town event stats
            const attendingSubmissions = this.state.submissions.filter(s => s.attending === 'yes');

            // Count out-of-town guests
            let outOfTownCount = 0;
            let fridayDinnerCount = 0;
            let sundayBrunchCount = 0;

            attendingSubmissions.forEach(submission => {
                // Check if guest is out-of-town based on state
                const isOutOfTown = submission.isOutOfTown ||
                                   (submission.address && submission.address.state &&
                                    submission.address.state.toUpperCase() !== 'CO' &&
                                    submission.address.state.toUpperCase() !== 'COLORADO');

                if (isOutOfTown) {
                    // Count total out-of-town guests
                    outOfTownCount += submission.guestCount || 1;

                    // Count event attendance
                    if (submission.fridayDinner === 'yes') {
                        fridayDinnerCount += submission.guestCount || 1;
                    }

                    if (submission.sundayBrunch === 'yes') {
                        sundayBrunchCount += submission.guestCount || 1;
                    }
                }
            });

            // Update the out-of-town stats in the UI
            const outOfTownCountElem = document.getElementById('out-of-town-count');
            const fridayDinnerCountElem = document.getElementById('friday-dinner-count');
            const sundayBrunchCountElem = document.getElementById('sunday-brunch-count');

            if (outOfTownCountElem) outOfTownCountElem.textContent = outOfTownCount;
            if (fridayDinnerCountElem) fridayDinnerCountElem.textContent = fridayDinnerCount;
            if (sundayBrunchCountElem) sundayBrunchCountElem.textContent = sundayBrunchCount;

            // Create the chart
            window.outOfTownEventsChart = new Chart(outOfTownEventsChartCanvas, {
                type: 'bar',
                data: {
                    labels: ['Out-of-Town Guests', 'Friday Dinner', 'Sunday Brunch'],
                    datasets: [{
                        data: [outOfTownCount, fridayDinnerCount, sundayBrunchCount],
                        backgroundColor: ['#1e88e5', '#f97316', '#10b981'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    return `${label}: ${value} guests`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
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
        // Refactored to reduce cognitive complexity
        console.log('Updating activity section...');

        this.updateLatestRSVP();
        this.updateResponseStats();
        this.updateAttendanceChart();
    },

    // Helper method to update latest RSVP
    updateLatestRSVP: function() {
        console.log('Updating latest RSVP with', this.state.submissions.length, 'submissions');

        // Update latest RSVP info
        if (this.state.submissions.length > 0) {
            const latestRsvp = this.state.submissions[0]; // Submissions are already sorted by date desc
            console.log('Latest RSVP:', latestRsvp);

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
        } else {
            // No submissions yet
            const latestRsvpNameElem = document.getElementById('latest-rsvp-name');
            const latestRsvpTimeElem = document.getElementById('latest-rsvp-time');

            if (latestRsvpNameElem) {
                latestRsvpNameElem.textContent = 'No RSVPs yet';
            }

            if (latestRsvpTimeElem) {
                latestRsvpTimeElem.textContent = '';
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

        // Update age distribution
        const ageDistributionElem = document.getElementById('age-distribution');
        console.log('Age distribution element:', ageDistributionElem);

        if (ageDistributionElem && this.state.submissions.length > 0) {
            // Calculate adult and child counts from attending submissions
            const attendingSubmissions = this.state.submissions.filter(s => s.attending === 'yes');
            console.log('Attending submissions:', attendingSubmissions.length);

            let totalAdults = 0;
            let totalChildren = 0;

            attendingSubmissions.forEach(submission => {
                console.log('Submission adult/child counts:', submission.adultCount, submission.childCount);
                totalAdults += submission.adultCount || 0;
                totalChildren += submission.childCount || 0;
            });

            console.log('Total adults:', totalAdults, 'Total children:', totalChildren);

            const totalGuests = totalAdults + totalChildren;
            const adultPercentage = totalGuests > 0 ? Math.round((totalAdults / totalGuests) * 100) : 0;
            const childPercentage = totalGuests > 0 ? Math.round((totalChildren / totalGuests) * 100) : 0;

            console.log('Adult percentage:', adultPercentage, 'Child percentage:', childPercentage);

            // Create the HTML content
            const htmlContent = `
                <div class="distribution-bar">
                    <div class="adults-bar" style="width: ${adultPercentage}%" title="${totalAdults} Adults (${adultPercentage}%)"></div>
                    <div class="children-bar" style="width: ${childPercentage}%" title="${totalChildren} Children (${childPercentage}%)"></div>
                </div>
                <div class="distribution-text">
                    <span class="adults-text">${totalAdults} Adults</span> /
                    <span class="children-text">${totalChildren} Children</span>
                </div>
            `;

            console.log('Setting HTML content:', htmlContent);
            ageDistributionElem.innerHTML = htmlContent;
        }

        // Update response rate chart
        const responseRateElem = document.getElementById('response-rate-chart');
        if (responseRateElem && this.state.guests.length > 0) {
            // Calculate response rate
            const totalGuests = this.state.guests.length;
            const respondedCount = this.state.guests.filter(guest => guest.hasResponded).length;
            const notRespondedCount = totalGuests - respondedCount;

            const respondedPercentage = Math.round((respondedCount / totalGuests) * 100);
            const notRespondedPercentage = 100 - respondedPercentage;

            // Create the HTML content
            responseRateElem.innerHTML = `
                <div class="response-rate-container">
                    <div class="response-rate-bar">
                        <div class="responded-bar" style="width: ${respondedPercentage}%" title="${respondedCount} Responded (${respondedPercentage}%)"></div>
                        <div class="not-responded-bar" style="width: ${notRespondedPercentage}%" title="${notRespondedCount} Not Responded (${notRespondedPercentage}%)"></div>
                    </div>
                    <div class="response-rate-text">
                        <span class="responded-text">${respondedPercentage}% Responded</span>
                    </div>
                </div>
            `;
        }

        // Update attendance prediction
        const attendancePredictionElem = document.getElementById('attendance-prediction');
        if (attendancePredictionElem && this.state.guests.length > 0) {
            // Calculate current attendance numbers
            const totalGuests = this.state.guests.length;
            const respondedCount = this.state.guests.filter(guest => guest.hasResponded).length;
            const attendingCount = this.state.guests.filter(guest => guest.response === 'attending').length;
            // Removed unused variable

            // Calculate attendance rate among those who responded
            const attendanceRate = respondedCount > 0 ? attendingCount / respondedCount : 0;

            // Predict final attendance based on current rate
            const predictedAttendance = Math.round(totalGuests * attendanceRate);

            // Calculate a range (±10%)
            const lowerBound = Math.max(0, Math.round(predictedAttendance * 0.9));
            const upperBound = Math.round(predictedAttendance * 1.1);

            // Create the HTML content
            attendancePredictionElem.innerHTML = `
                <div class="prediction-container">
                    <div class="prediction-value">${predictedAttendance} Guests</div>
                    <div class="prediction-range">Range: ${lowerBound} - ${upperBound}</div>
                </div>
            `;
        }
    },

    // Export guest list to CSV
    exportGuestListToCSV: function() {
        console.log('Exporting guest list to CSV...');

        if (this.state.filteredGuests.length === 0) {
            alert('No guest data to export');
            return;
        }

        // Define CSV headers
        const headers = [
            'Name',
            'Email',
            'Phone',
            'Status',
            'Response',
            'Actual Guest Count',
            'Additional Guests',
            'Address',
            'Submitted Date'
        ];

        // Convert guest data to CSV rows
        const rows = this.state.filteredGuests.map(guest => {
            // Format address
            const address = guest.address ?
                `${guest.address.line1 || ''} ${guest.address.line2 || ''} ${guest.address.city || ''} ${guest.address.state || ''} ${guest.address.zip || ''}`.trim() :
                '';

            // Format additional guests
            const additionalGuests = guest.additionalGuests ? guest.additionalGuests.join(', ') : '';

            // Format date
            const submittedDate = guest.submittedAt ?
                guest.submittedAt.toLocaleDateString() + ' ' + guest.submittedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                '';

            return [
                guest.name || '',
                guest.email || '',
                guest.phone || '',
                guest.hasResponded ? 'Responded' : 'Not Responded',
                this.formatGuestResponse(guest.response),
                guest.hasResponded ? (guest.actualGuestCount || 0) : '',
                additionalGuests,
                address,
                submittedDate
            ];
        });

        // Generate CSV content
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
        document.body.appendChild(link);

        // Trigger download and clean up
        link.click();
        document.body.removeChild(link);

        // Show success message
        this.showExportSuccess('guest-list');
    },

    // Export submissions to CSV
    exportSubmissionsToCSV: function() {
        console.log('Exporting submissions to CSV...');

        if (this.state.filteredSubmissions.length === 0) {
            alert('No submission data to export');
            return;
        }

        // Define CSV headers
        const headers = [
            'Date',
            'Name',
            'Email',
            'Phone',
            'Attending',
            'Guest Count',
            'Additional Guests'
        ];

        // Convert submission data to CSV rows
        const rows = this.state.filteredSubmissions.map(submission => {
            // Format date
            const submissionDate = submission.submittedAt ?
                submission.submittedAt.toLocaleDateString() + ' ' + submission.submittedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                '';

            // Format additional guests
            const additionalGuests = submission.additionalGuests ? submission.additionalGuests.join(', ') : '';

            return [
                submissionDate,
                submission.name || '',
                submission.email || '',
                submission.phone || '',
                submission.attending === 'yes' ? 'Yes' : 'No',
                submission.guestCount || 1,
                additionalGuests
            ];
        });

        // Generate CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `rsvp-submissions-${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.display = 'none';
        document.body.appendChild(link);

        // Trigger download and clean up
        link.click();
        document.body.removeChild(link);

        // Show success message
        this.showExportSuccess('submissions');
    },

    // Show export success message
    showExportSuccess: function(type) {
        const containerId = type === 'guest-list' ? 'guest-list-container' : 'table-container';
        const container = document.getElementById(containerId);
        if (!container) return;

        // Create success message element
        const successMessage = document.createElement('div');
        successMessage.className = 'export-success';
        successMessage.innerHTML = '<i class="fas fa-check-circle"></i> Export successful!';

        // Add to container
        const actionsContainer = container.querySelector('.guest-list-actions, .table-actions');
        if (actionsContainer) {
            // Remove any existing success message
            const existingMessage = actionsContainer.querySelector('.export-success');
            if (existingMessage) {
                actionsContainer.removeChild(existingMessage);
            }

            actionsContainer.appendChild(successMessage);

            // Remove after 3 seconds
            setTimeout(() => {
                if (successMessage.parentNode === actionsContainer) {
                    actionsContainer.removeChild(successMessage);
                }
            }, 3000);
        }
    },

    // Sync with Google Sheet
    syncWithGoogleSheet: function() {
        console.log('Syncing with Google Sheet...');

        // Get the sync button and update its state
        const syncButton = document.getElementById('sync-sheet-btn');
        if (syncButton) {
            // Disable the button and show loading state
            syncButton.disabled = true;
            syncButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        }

        // Update sync status in the activity section
        const syncStatusElem = document.getElementById('sync-status');
        if (syncStatusElem) {
            syncStatusElem.textContent = 'Syncing with Google Sheet...';
            syncStatusElem.className = 'activity-status status-pending';
        }

        // Call the Cloud Function to sync with Google Sheet
        const functionUrl = 'https://us-central1-eli-barkin-be-mitzvah.cloudfunctions.net/manualSyncSheetChanges';

        fetch(functionUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Sync response:', data);

                if (data.success) {
                    // Update sync status
                    if (syncStatusElem) {
                        syncStatusElem.textContent = 'Sync completed successfully';
                        syncStatusElem.className = 'activity-status status-success';
                    }

                    // Update last sync time
                    const lastSyncTimeElem = document.getElementById('last-sync-time');
                    if (lastSyncTimeElem) {
                        const now = new Date();
                        const formattedTime = now.toLocaleDateString() + ' ' +
                                           now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        lastSyncTimeElem.textContent = formattedTime;
                    }

                    // Show success message
                    this.showSyncSuccess();

                    // Refresh the data
                    this.fetchGuestList();
                    this.fetchSubmissions();
                } else {
                    // Show error
                    if (syncStatusElem) {
                        syncStatusElem.textContent = `Sync failed: ${data.message || 'Unknown error'}`;
                        syncStatusElem.className = 'activity-status status-error';
                    }
                    this.showSyncError(data.message || 'Unknown error');
                }
            })
            .catch(error => {
                console.error('Error syncing with Google Sheet:', error);

                // Update sync status
                if (syncStatusElem) {
                    syncStatusElem.textContent = `Sync failed: ${error.message}`;
                    syncStatusElem.className = 'activity-status status-error';
                }

                // Show error message
                this.showSyncError(error.message);
            })
            .finally(() => {
                // Re-enable the sync button
                if (syncButton) {
                    syncButton.disabled = false;
                    syncButton.innerHTML = '<i class="fas fa-sync-alt"></i> Sync with Google Sheet';
                }
            });
    },

    // Show sync success message
    showSyncSuccess: function() {
        // Create success message element
        const successMessage = document.createElement('div');
        successMessage.className = 'sync-success notification';
        successMessage.innerHTML = '<i class="fas fa-check-circle"></i> Sync with Google Sheet successful!';

        // Add to body
        document.body.appendChild(successMessage);

        // Remove after 3 seconds
        setTimeout(() => {
            if (successMessage.parentNode === document.body) {
                document.body.removeChild(successMessage);
            }
        }, 3000);
    },

    // Show sync error message
    showSyncError: function(message) {
        // Create error message element
        const errorMessage = document.createElement('div');
        errorMessage.className = 'sync-error notification';
        errorMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Sync failed: ${message}`;

        // Add to body
        document.body.appendChild(errorMessage);

        // Remove after 5 seconds
        setTimeout(() => {
            if (errorMessage.parentNode === document.body) {
                document.body.removeChild(errorMessage);
            }
        }, 5000);
    },

    // Format guest response for display
    formatGuestResponse: function(response) {
        if (response === 'attending') {
            return 'Attending';
        } else if (response === 'declined') {
            return 'Not Attending';
        } else {
            return '';
        }
    },

    // Show add guest modal
    showAddGuestModal: function() {
        console.log('Showing add guest modal');

        // Get the modal
        const modal = document.getElementById('add-guest-modal');
        if (!modal) return;

        // Clear the form
        const form = document.getElementById('add-guest-form');
        if (form) form.reset();

        // Clear any error messages
        const errorElement = document.getElementById('add-guest-error');
        if (errorElement) errorElement.style.display = 'none';

        // Show the modal
        modal.style.display = 'block';
    },

    // Submit add guest form
    submitAddGuestForm: function() {
        console.log('Submitting add guest form');

        // Get form values
        const name = document.getElementById('guest-name').value.trim();
        const addressLine1 = document.getElementById('guest-address-line1').value.trim();
        const addressLine2 = document.getElementById('guest-address-line2').value.trim();
        const city = document.getElementById('guest-city').value.trim();
        const state = document.getElementById('guest-state').value.trim();
        const zip = document.getElementById('guest-zip').value.trim();
        const country = document.getElementById('guest-country').value.trim();
        const email = document.getElementById('guest-email').value.trim();
        const phone = document.getElementById('guest-phone').value.trim();

        // Validate form
        if (!name) {
            this.showAddGuestError('Please enter a name');
            return;
        }

        // Show loading state
        const submitButton = document.getElementById('add-guest-submit');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        }

        // Clear any error messages
        this.clearAddGuestError();

        // Create guest object
        const guest = {
            name: name,
            address: {
                line1: addressLine1,
                line2: addressLine2,
                city: city,
                state: state,
                zip: zip,
                country: country
            },
            email: email,
            phone: phone,
            hasResponded: false,
            createdAt: new Date()
        };

        // Call Cloud Function to add guest to Google Sheet
        const addGuestFunction = firebase.functions().httpsCallable('addGuestToSheet');

        addGuestFunction(guest)
            .then(result => {
                console.log('Add guest result:', result);

                if (result.data?.success) {
                    // Close the modal
                    const modal = document.getElementById('add-guest-modal');
                    if (modal) modal.style.display = 'none';

                    // Show success message
                    this.showAddGuestSuccess();

                    // Refresh the guest list
                    this.fetchGuestList();
                } else {
                    // Show error message
                    this.showAddGuestError(result.data.message || 'Failed to add guest');
                }
            })
            .catch(error => {
                console.error('Error adding guest:', error);
                this.showAddGuestError(error.message || 'An error occurred');
            })
            .finally(() => {
                // Reset button state
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Add Guest';
                }
            });
    },

    // Show add guest error
    showAddGuestError: function(message) {
        const errorElement = document.getElementById('add-guest-error');
        if (errorElement) {
            errorElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
            errorElement.style.display = 'flex';
        }
    },

    // Clear add guest error
    clearAddGuestError: function() {
        const errorElement = document.getElementById('add-guest-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    },

    // Show add guest success message
    showAddGuestSuccess: function() {
        // Create success message element
        const successMessage = document.createElement('div');
        successMessage.className = 'sync-success notification';
        successMessage.innerHTML = '<i class="fas fa-check-circle"></i> Guest added successfully!';

        // Add to body
        document.body.appendChild(successMessage);

        // Remove after 3 seconds
        setTimeout(() => {
            if (successMessage.parentNode === document.body) {
                document.body.removeChild(successMessage);
            }
        }, 3000);
    },

    // Show submission details in modal
    showSubmissionDetails: function(submissionId) {
        console.log('Showing submission details for ID:', submissionId);

        // Find the submission
        const submission = this.state.submissions.find(s => s.id === submissionId);
        if (!submission) {
            console.error('Submission not found with ID:', submissionId);
            return;
        }

        // Get the modal elements
        const modal = document.getElementById('rsvp-modal');
        const modalBody = document.getElementById('modal-body');
        const modalTitle = modal.querySelector('.modal-title');

        if (!modal || !modalBody) return;

        // Set the modal title
        if (modalTitle) {
            modalTitle.textContent = `RSVP Details: ${submission.name || 'Unknown'}`;
        }

        // Format date
        const submissionDate = submission.submittedAt;
        const formattedDate = submissionDate ?
            submissionDate.toLocaleDateString() + ' ' + submissionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
            'Unknown';

        // Get adult and child guests
        const adultGuests = submission.adultGuests || [];
        const childGuests = submission.childGuests || [];

        // Determine if guest is out-of-town (not from Colorado)
        const isOutOfTown = submission.isOutOfTown || false;

        // Create the content
        const content = `
            <div class="modal-details">
                <div class="detail-group">
                    <div class="detail-item">
                        <span class="detail-label">Submission Date:</span>
                        <span class="detail-value">${formattedDate}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${submission.name || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${submission.email || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phone:</span>
                        <span class="detail-value">${submission.phone || 'Not provided'}</span>
                    </div>
                </div>

                <div class="detail-group">
                    <div class="detail-item">
                        <span class="detail-label">Attending:</span>
                        <span class="detail-value status-badge ${submission.attending === 'yes' ? 'status-attending' : 'status-not-attending'}">
                            ${submission.attending === 'yes' ? '<i class="fas fa-check-circle"></i> Yes' : '<i class="fas fa-times-circle"></i> No'}
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total Guest Count:</span>
                        <span class="detail-value">${submission.guestCount || 1}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Adult Count:</span>
                        <span class="detail-value">${submission.adultCount || 0}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Child Count:</span>
                        <span class="detail-value">${submission.childCount || 0}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Adult Guests:</span>
                        <div class="detail-value">
                            ${this.renderGuestList(adultGuests)}
                        </div>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Child Guests:</span>
                        <div class="detail-value">
                            ${this.renderGuestList(childGuests)}
                        </div>
                    </div>
                    ${isOutOfTown && submission.attending === 'yes' ? `
                    <div class="detail-item">
                        <span class="detail-label">Location:</span>
                        <span class="detail-value">
                            <span class="location-badge out-of-town"><i class="fas fa-plane"></i> Out-of-Town Guest</span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Out-of-Town Events:</span>
                        <div class="detail-value">
                            <div class="out-of-town-events">
                                <div class="event-item">
                                    <span class="event-name">Friday Night Dinner at Linger:</span>
                                    <span class="event-response ${submission.fridayDinner === 'yes' ? 'attending' : 'not-attending'}">
                                        ${submission.fridayDinner === 'yes' ?
                                            '<i class="fas fa-check-circle"></i> Attending' :
                                            '<i class="fas fa-times-circle"></i> Not Attending'}
                                    </span>
                                </div>
                                <div class="event-item">
                                    <span class="event-name">Sunday Brunch at Eli's Home:</span>
                                    <span class="event-response ${submission.sundayBrunch === 'yes' ? 'attending' : 'not-attending'}">
                                        ${submission.sundayBrunch === 'yes' ?
                                            '<i class="fas fa-check-circle"></i> Attending' :
                                            '<i class="fas fa-times-circle"></i> Not Attending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Set the content
        modalBody.innerHTML = content;

        // Show the modal
        modal.style.display = 'block';
    },

    // Helper method to render guest list
    renderGuestList: function(guests) {
        if (guests.length > 0) {
            const listItems = guests.map(guest => `<li>${guest}</li>`).join('');
            return `<ul class="guest-list">${listItems}</ul>`;
        }
        return 'None';
    },

    // Show guest details in modal
    showGuestDetails: function(guestId) {
        // Refactored to reduce cognitive complexity
        console.log('Showing guest details for ID:', guestId);

        const guest = this.findGuestById(guestId);
        if (!guest) return;

        this.displayGuestDetailsInModal(guest);
    },

    // Helper method to find guest by ID
    findGuestById: function(guestId) {
        const guest = this.state.guests.find(g => g.id === guestId);
        if (!guest) {
            console.error('Guest not found with ID:', guestId);
            return;
        }

        // Get the modal elements
        const modal = document.getElementById('guest-modal');
        const modalBody = document.getElementById('guest-modal-body');
        const modalTitle = modal.querySelector('.modal-title');

        if (!modal || !modalBody) return;

        // Set the modal title
        if (modalTitle) {
            modalTitle.textContent = `Guest Details: ${guest.name || 'Unknown'}`;
        }

        // Format address
        let formattedAddress = 'Not provided';
        if (guest.address) {
            const addressParts = [];
            if (guest.address.line1) addressParts.push(guest.address.line1);
            if (guest.address.line2) addressParts.push(guest.address.line2);

            const cityStateZip = [];
            if (guest.address.city) cityStateZip.push(guest.address.city);
            if (guest.address.state) cityStateZip.push(guest.address.state);
            if (guest.address.zip) cityStateZip.push(guest.address.zip);

            if (cityStateZip.length > 0) addressParts.push(cityStateZip.join(', '));
            if (guest.address.country) addressParts.push(guest.address.country);

            if (addressParts.length > 0) {
                formattedAddress = addressParts.join('<br>');
            }
        }

        // Get adult and child guests
        const adultGuests = guest.adultGuests || [];
        const childGuests = guest.childGuests || [];

        // Format submission date
        const submissionDate = guest.submittedAt;
        const formattedDate = submissionDate ?
            submissionDate.toLocaleDateString() + ' ' + submissionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
            'Not submitted';

        // Determine if guest is out-of-town (not from Colorado)
        const isOutOfTown = guest.address && guest.address.state &&
                            guest.address.state.toUpperCase() !== 'CO' &&
                            guest.address.state.toUpperCase() !== 'COLORADO';

        // Get out-of-town event responses
        const fridayDinner = guest.fridayDinner === 'yes' ? 'Yes' : 'No';
        const sundayBrunch = guest.sundayBrunch === 'yes' ? 'Yes' : 'No';

        // Create the content
        const content = `
            <div class="modal-details">
                <div class="detail-group">
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${guest.name || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${guest.email || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phone:</span>
                        <span class="detail-value">${guest.phone || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Address:</span>
                        <span class="detail-value address">${formattedAddress}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Location:</span>
                        <span class="detail-value">
                            ${isOutOfTown ?
                                '<span class="location-badge out-of-town"><i class="fas fa-plane"></i> Out-of-Town Guest</span>' :
                                '<span class="location-badge local"><i class="fas fa-home"></i> Local Guest</span>'}
                        </span>
                    </div>
                </div>

                <div class="detail-group">
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value response-status ${guest.hasResponded ? 'status-responded' : 'status-not-responded'}">
                            ${guest.hasResponded ?
                                '<i class="fas fa-check-circle"></i> Responded' :
                                '<i class="fas fa-clock"></i> Pending'}
                        </span>
                    </div>
                    ${guest.hasResponded ? `
                    <div class="detail-item">
                        <span class="detail-label">Response:</span>
                        <span class="detail-value status-badge ${this.getResponseStatusClass(guest.response)}">
                            ${this.formatGuestResponse(guest.response)}
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total Guest Count:</span>
                        <span class="detail-value">${guest.actualGuestCount || 0}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Adult Count:</span>
                        <span class="detail-value">${guest.adultCount || 0}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Child Count:</span>
                        <span class="detail-value">${guest.childCount || 0}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Adult Guests:</span>
                        <div class="detail-value">
                            ${this.renderGuestList(adultGuests)}
                        </div>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Child Guests:</span>
                        <div class="detail-value">
                            ${this.renderGuestList(childGuests)}
                        </div>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Submission Date:</span>
                        <span class="detail-value">${formattedDate}</span>
                    </div>
                    ${isOutOfTown && guest.hasResponded && guest.response === 'attending' ? `
                    <div class="detail-item">
                        <span class="detail-label">Out-of-Town Events:</span>
                        <div class="detail-value">
                            <div class="out-of-town-events">
                                <div class="event-item">
                                    <span class="event-name">Friday Night Dinner at Linger:</span>
                                    <span class="event-response ${guest.fridayDinner === 'yes' ? 'attending' : 'not-attending'}">
                                        ${guest.fridayDinner === 'yes' ?
                                            '<i class="fas fa-check-circle"></i> Attending' :
                                            '<i class="fas fa-times-circle"></i> Not Attending'}
                                    </span>
                                </div>
                                <div class="event-item">
                                    <span class="event-name">Sunday Brunch at Eli's Home:</span>
                                    <span class="event-response ${guest.sundayBrunch === 'yes' ? 'attending' : 'not-attending'}">
                                        ${guest.sundayBrunch === 'yes' ?
                                            '<i class="fas fa-check-circle"></i> Attending' :
                                            '<i class="fas fa-times-circle"></i> Not Attending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    ` : ''}
                </div>
            </div>
        `;

        // Set the content
        modalBody.innerHTML = content;

        // Show the modal
        modal.style.display = 'block';
    },

    // Helper method to get response status class
    getResponseStatusClass: function(response) {
        return response === 'attending' ? 'status-attending' : 'status-not-attending';
    },

    // Helper method to format guest response
    formatGuestResponse: function(response) {
        if (response === 'attending') {
            return '<i class="fas fa-check-circle"></i> Attending';
        } else if (response === 'declined') {
            return '<i class="fas fa-times-circle"></i> Not Attending';
        }
        return 'Unknown';
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
