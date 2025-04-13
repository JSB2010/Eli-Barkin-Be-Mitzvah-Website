document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const dashboardContainer = document.getElementById('dashboard-container');
    const loadingElement = document.getElementById('loading');
    const tableContent = document.getElementById('table-content');
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

    // Fetch data from Formcarry API
    fetchSubmissions();

    // Fetch submissions from Formcarry API
    function fetchSubmissions() {
        loadingElement.style.display = 'block';
        dashboardContainer.classList.add('hidden');

        // Formcarry API endpoint with form ID
        fetch('https://formcarry.com/api/submissions?formId=C6atiqnXy-0', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_FORMCARRY_API_KEY' // Replace with your actual API key
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch data from Formcarry');
            }
            return response.json();
        })
        .then(data => {
            // Process the submissions
            if (data?.data) {
                allSubmissions = data.data.map(submission => {
                    // Format the submission data
                    return {
                        id: submission.id,
                        name: submission.payload.name || '',
                        email: submission.payload.email || '',
                        phone: submission.payload.phone || '',
                        attending: submission.payload.attending || '',
                        guestCount: submission.payload.guestCount || 1,
                        additionalGuests: extractAdditionalGuests(submission.payload),
                        submittedAt: new Date(submission.created_at)
                    };
                });

                // Process and display the data
                processSubmissions();
            } else {
                // No submissions found
                loadingElement.textContent = 'No submissions found.';
            }
        })
        .catch(error => {
            console.error('Error fetching submissions:', error);
            loadingElement.textContent = 'Error loading submissions. Please try again.';
        });
    }

    // Extract additional guest names from submission data
    function extractAdditionalGuests(data) {
        const guests = [];
        const guestCount = parseInt(data.guestCount) || 1;

        // Loop through potential guest name fields
        for (let i = 2; i <= guestCount; i++) {
            const guestName = data[`guestName${i}`];
            if (guestName) {
                guests.push(guestName);
            }
        }

        return guests;
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

        // Show dashboard
        loadingElement.style.display = 'none';
        dashboardContainer.classList.remove('hidden');
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
            .reduce((total, submission) => total + (parseInt(submission.guestCount) || 1), 0);

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

        // Attendance breakdown chart
        const attendingCount = allSubmissions.filter(submission => submission.attending === 'yes').length;
        const notAttendingCount = allSubmissions.filter(submission => submission.attending === 'no').length;

        // Create and render the attendance chart (Chart.js will attach it to the canvas)
        new Chart(attendanceChartCanvas, {
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

        // Create and render the timeline chart (Chart.js will attach it to the canvas)
        new Chart(timelineChartCanvas, {
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
        tableContent.innerHTML = '';

        // Create table
        const table = document.createElement('table');

        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = ['Date', 'Name', 'Email', 'Phone', 'Attending', 'Guest Count', 'Additional Guests'];

        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');

        // Calculate pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedSubmissions = filteredSubmissions.slice(startIndex, endIndex);

        if (paginatedSubmissions.length === 0) {
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = `<td colspan="7" style="text-align: center;">No submissions found</td>`;
            tbody.appendChild(noDataRow);

            // Clear pagination
            paginationContainer.innerHTML = '';
        } else {
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

                tbody.appendChild(row);
            });

            // Create pagination
            createPagination();
        }

        table.appendChild(tbody);
        tableContent.appendChild(table);
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
