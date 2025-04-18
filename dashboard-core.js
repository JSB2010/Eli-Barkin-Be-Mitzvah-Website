// Global variables for dashboard functionality
let db;
let allSubmissions = [];
let filteredSubmissions = [];
let allGuests = [];
let filteredGuests = [];

// Initialize Firebase when the script loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard core script loaded and DOM ready');

    // Initialize Firestore
    try {
        db = firebase.firestore();
        console.log('Firestore initialized successfully');
    } catch (error) {
        console.error('Error initializing Firestore:', error);
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `<p><i class="fas fa-exclamation-triangle"></i> Error: Could not connect to database. ${error.message}</p>`;
        }
    }
});

// Fetch submissions from Firestore
function fetchSubmissions() {
    console.log('fetchSubmissions called');

    const loadingElement = document.getElementById('loading');
    const tableContainer = document.getElementById('table-container');

    if (!loadingElement) {
        console.error('Loading element not found');
        return;
    }

    loadingElement.style.display = 'block';

    if (tableContainer) {
        tableContainer.style.display = 'none';
    }

    if (!db) {
        console.error('Firestore database is not available');
        loadingElement.innerHTML = '<p><i class="fas fa-exclamation-triangle"></i> Error: Database connection not available.</p>';
        return;
    }

    console.log('Fetching from sheetRsvps collection...');

    db.collection('sheetRsvps').orderBy('submittedAt', 'desc').get()
        .then((querySnapshot) => {
            console.log('Query successful, received', querySnapshot.size, 'documents');

            allSubmissions = querySnapshot.docs.map(doc => {
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

            console.log('Processed submissions data:', allSubmissions.length, 'items');

            // Process the data
            processSubmissions();
        })
        .catch((error) => {
            console.error('Error fetching submissions:', error);
            loadingElement.innerHTML = `<p><i class="fas fa-exclamation-triangle"></i> Error loading data: ${error.message}</p>`;
        });
}

// Fetch guest list from Firestore
function fetchGuestList() {
    console.log('fetchGuestList called');

    if (!db) {
        console.error('Firestore database is not available for guest list');
        return;
    }

    console.log('Fetching from guestList collection...');

    db.collection('guestList').get()
        .then((querySnapshot) => {
            console.log('Guest list query successful, received', querySnapshot.size, 'documents');

            allGuests = querySnapshot.docs.map(doc => {
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

            console.log('Processed guest list data:', allGuests.length, 'items');

            // Process the guest list
            processGuestList();
        })
        .catch((error) => {
            console.error('Error fetching guest list:', error);
        });
}

// Process submissions data
function processSubmissions() {
    console.log('Processing submissions...');

    const loadingElement = document.getElementById('loading');
    const tableContainer = document.getElementById('table-container');
    const submissionsBody = document.getElementById('submissions-body');

    if (allSubmissions.length === 0) {
        console.log('No submissions found');
        if (loadingElement) {
            loadingElement.innerHTML = '<p>No submissions found.</p>';
            loadingElement.style.display = 'block';
        }
        return;
    }

    // Apply filters (simplified for now)
    filteredSubmissions = [...allSubmissions];

    // Update statistics
    updateStats();

    // Display submissions in table
    if (submissionsBody) {
        submissionsBody.innerHTML = '';

        filteredSubmissions.forEach(submission => {
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

    // Show table
    if (loadingElement) loadingElement.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';
}

// Process guest list data
function processGuestList() {
    console.log('Processing guest list...');

    if (allGuests.length === 0) {
        console.log('No guests found in the guest list');
        return;
    }

    // Apply filters (simplified for now)
    filteredGuests = [...allGuests];

    // Update guest list statistics
    updateGuestListStats();

    // Display guest list
    displayGuestList();
}

// Update statistics
function updateStats() {
    console.log('Updating statistics...');

    const totalSubmissions = allSubmissions.length;
    const attendingCount = allSubmissions.filter(submission => submission.attending === 'yes').length;
    const notAttendingCount = allSubmissions.filter(submission => submission.attending === 'no').length;

    // Calculate total guests
    const totalGuests = allSubmissions
        .filter(submission => submission.attending === 'yes')
        .reduce((total, submission) => total + (submission.guestCount || 1), 0);

    // Calculate response rate
    const responseRate = Math.round((totalSubmissions / 300) * 100); // Assuming 300 expected invites

    // Calculate percentages
    const attendingPercent = totalSubmissions > 0 ? Math.round((attendingCount / totalSubmissions) * 100) : 0;
    const notAttendingPercent = totalSubmissions > 0 ? Math.round((notAttendingCount / totalSubmissions) * 100) : 0;

    // Calculate average party size
    const avgPartySize = attendingCount > 0
        ? (totalGuests / attendingCount).toFixed(1)
        : '0.0';

    // Get the latest RSVP
    const latestRsvp = allSubmissions.length > 0 ? allSubmissions[0] : {};

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
}

// Display guest list
function displayGuestList() {
    const guestListBody = document.getElementById('guest-list-body');
    if (!guestListBody) return;

    guestListBody.innerHTML = '';

    if (filteredGuests.length === 0) {
        const noDataRow = document.createElement('tr');
        noDataRow.innerHTML = `<td colspan="7" style="text-align: center;">No guests found</td>`;
        guestListBody.appendChild(noDataRow);
        return;
    }

    // Create table rows
    filteredGuests.forEach(guest => {
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
            <td>No limit</td>
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
}

// Make functions globally available
window.fetchSubmissions = fetchSubmissions;
window.fetchGuestList = fetchGuestList;
