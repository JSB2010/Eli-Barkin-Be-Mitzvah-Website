// Global variables for dashboard functionality
let db;
let allSubmissions = [];
let filteredSubmissions = [];
let allGuests = [];
let filteredGuests = [];

// Initialize Firebase when the script loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard core script loaded and DOM ready');
    
    // Debug: Check if elements exist in the DOM
    const statsElements = [
        'response-rate', 'total-guests-count', 'responded-count', 
        'not-responded-count', 'attending-guests-count', 'not-attending-guests-count'
    ];
    
    statsElements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`Element ${id} exists in DOM:`, element ? true : false);
        if (element) {
            console.log(`  - Current value:`, element.textContent);
        }
    });

    // Initialize Firestore
    try {
        db = firebase.firestore();
        console.log('Firestore initialized successfully');
        
        // Fetch both data sets and let the updateAllDashboardStats handle statistics
        fetchGuestList();
        fetchSubmissions();
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
            
            // Attempt to update all dashboard stats
            updateAllDashboardStats();
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
            
            // Attempt to update all dashboard stats
            updateAllDashboardStats();
        })
        .catch((error) => {
            console.error('Error fetching guest list:', error);
        });
}

// Function to update all dashboard statistics
function updateAllDashboardStats() {
    console.log('Updating all dashboard statistics');
    
    // Make sure both data sets are loaded
    if (allGuests.length > 0 && allSubmissions.length > 0) {
        // Update guest list statistics first
        updateGuestListStats();
        // Then update submission stats which might depend on guest counts
        updateStats();
        
        // Direct element update as a final measure
        setTimeout(forceUpdateDashboardStats, 500);
        
        console.log('All dashboard statistics updated successfully');
    } else {
        console.log('Cannot update all stats - missing data', {
            guestsLoaded: allGuests.length > 0,
            submissionsLoaded: allSubmissions.length > 0
        });
    }
}

// Direct DOM manipulation as a fallback
function forceUpdateDashboardStats() {
    console.log('Forcing direct update of dashboard statistics elements');
    
    if (allGuests.length === 0) {
        console.warn('No guest data available for force update');
        return;
    }
    
    // Calculate key statistics
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
    
    // Calculate response rate correctly
    const responseRate = totalGuests > 0 ? Math.round((respondedCount / totalGuests) * 100) : 0;
    
    // Direct DOM updates with error handling
    try {
        // Response Rate
        const responseRateElem = document.getElementById('response-rate');
        if (responseRateElem) responseRateElem.textContent = `${responseRate}%`;
        
        // Total Guests
        const totalGuestsElem = document.getElementById('total-guests-count');
        if (totalGuestsElem) totalGuestsElem.textContent = totalGuests;
        
        // Responded
        const respondedElem = document.getElementById('responded-count');
        if (respondedElem) respondedElem.textContent = respondedCount;
        
        // Responded Percent
        const respondedPercentElem = document.getElementById('responded-percent');
        if (respondedPercentElem) respondedPercentElem.textContent = `${respondedPercent}% of total`;
        
        // Not Responded
        const notRespondedElem = document.getElementById('not-responded-count');
        if (notRespondedElem) notRespondedElem.textContent = notRespondedCount;
        
        // Not Responded Percent
        const notRespondedPercentElem = document.getElementById('not-responded-percent');
        if (notRespondedPercentElem) notRespondedPercentElem.textContent = `${notRespondedPercent}% of total`;
        
        // Attending
        const attendingElem = document.getElementById('attending-guests-count');
        if (attendingElem) attendingElem.textContent = attendingCount;
        
        // Attending Percent
        const attendingPercentElem = document.getElementById('attending-guests-percent');
        if (attendingPercentElem) attendingPercentElem.textContent = `${attendingPercent}% of responded`;
        
        // Not Attending
        const notAttendingElem = document.getElementById('not-attending-guests-count');
        if (notAttendingElem) notAttendingElem.textContent = notAttendingCount;
        
        // Not Attending Percent
        const notAttendingPercentElem = document.getElementById('not-attending-guests-percent');
        if (notAttendingPercentElem) notAttendingPercentElem.textContent = `${notAttendingPercent}% of responded`;
        
        console.log('Force update completed successfully with values:', {
            responseRate,
            totalGuests,
            respondedCount,
            notRespondedCount,
            attendingCount,
            notAttendingCount
        });
    } catch (error) {
        console.error('Error during force update:', error);
    }
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

    // Update statistics - make sure updateGuestListStats is also called if guests are loaded
    if (allGuests.length > 0) {
        updateGuestListStats();
    }
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
    
    // If submissions have been loaded, refresh stats with new guest count
    if (allSubmissions.length > 0) {
        updateStats();
    }

    // Display guest list
    displayGuestList();
}

// Update statistics
function updateStats() {
    console.log('Starting updateStats with:', { 
        totalSubmissions: allSubmissions.length,
        totalGuests: allGuests.length
    });

    const totalSubmissions = allSubmissions.length;
    const attendingCount = allSubmissions.filter(submission => submission.attending === 'yes').length;
    const notAttendingCount = allSubmissions.filter(submission => submission.attending === 'no').length;

    // Calculate total guests
    const totalGuests = allSubmissions
        .filter(submission => submission.attending === 'yes')
        .reduce((total, submission) => total + (parseInt(submission.guestCount) || 1), 0);

    // Use guest list stats for response rate calculation
    const totalGuestCount = allGuests.length;
    const respondedCount = allGuests.filter(guest => guest.hasResponded).length;
    // Response rate is the percentage of guests who have responded
    const responseRate = totalGuestCount > 0 ? Math.round((respondedCount / totalGuestCount) * 100) : 0;

    console.log('Stats calculated:', {
        totalSubmissions,
        attendingCount,
        notAttendingCount,
        totalGuests,
        totalGuestCount,
        respondedCount,
        responseRate
    });

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
        'total-submissions-percent': `${responseRate}% of total guests`,
        'attending-percent': `${attendingPercent}% of responses`,
        'not-attending-percent': `${notAttendingPercent}% of responses`,
        'avg-party-size': `Avg party size: ${avgPartySize}`,
        'response-rate': `${responseRate}%`
    };

    // Update all elements with null checks and log results
    console.log('Attempting to update elements with IDs from updateStats:', Object.keys(elements));
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            console.log(`Updated element ${id} with value ${value}`);
        } else {
            console.warn(`Element with ID ${id} not found in the document`);
        }
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

// Fix the response rate calculation in updateGuestListStats
function updateGuestListStats() {
    console.log('Starting updateGuestListStats with:', { 
        totalGuests: allGuests.length, 
        allSubmissions: allSubmissions.length 
    });
    
    const totalGuests = allGuests.length;
    // Check if hasResponded field exists and is being used correctly
    console.log('Sample guest data:', allGuests.length > 0 ? {
        firstGuest: allGuests[0],
        hasRespondedField: allGuests[0].hasResponded,
        responseField: allGuests[0].response
    } : 'No guests available');
    
    // Count directly with detailed logging
    let respondedCount = 0;
    let attendingCount = 0;
    let notAttendingCount = 0;
    
    allGuests.forEach((guest, index) => {
        if (guest.hasResponded) {
            respondedCount++;
            if (guest.response === 'attending') {
                attendingCount++;
            } else if (guest.response === 'declined') {
                notAttendingCount++;
            }
        }
    });
    
    console.log(`Direct count: ${respondedCount} responded out of ${totalGuests} total`);
    
    // Alternative calculation using filter
    const respondedCountFilter = allGuests.filter(guest => guest.hasResponded).length;
    const attendingCountFilter = allGuests.filter(guest => guest.response === 'attending').length;
    const notAttendingCountFilter = allGuests.filter(guest => guest.response === 'declined').length;
    
    console.log('Filter count comparison:', {
        respondedCount,
        respondedCountFilter,
        attendingCount,
        attendingCountFilter,
        notAttendingCount,
        notAttendingCountFilter
    });
    
    // Use the direct count numbers
    const notRespondedCount = totalGuests - respondedCount;

    // Calculate percentages
    const respondedPercent = totalGuests > 0 ? ((respondedCount / totalGuests) * 100).toFixed(1) : 0;
    const notRespondedPercent = totalGuests > 0 ? ((notRespondedCount / totalGuests) * 100).toFixed(1) : 0;
    const attendingPercent = respondedCount > 0 ? ((attendingCount / respondedCount) * 100).toFixed(1) : 0;
    const notAttendingPercent = respondedCount > 0 ? ((notAttendingCount / respondedCount) * 100).toFixed(1) : 0;

    // Calculate response rate - this is the percentage of guests who have responded
    const responseRate = totalGuests > 0 ? Math.round((respondedCount / totalGuests) * 100) : 0;

    console.log('Guest stats calculated:', {
        totalGuests,
        respondedCount,
        notRespondedCount,
        attendingCount,
        notAttendingCount,
        responseRate
    });

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
        'not-attending-guests-percent': `${notAttendingPercent}% of responded`,
        'response-rate': `${responseRate}%`
    };

    // Update all elements with null checks and log results
    console.log('Attempting to update elements with IDs:', Object.keys(elements));
    
    // Double check that key elements exist
    const keyElements = ['response-rate', 'total-guests-count', 'responded-count'];
    keyElements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`Key element check - ${id} exists:`, element ? true : false);
    });
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            // Log the previous value to see if it's being overwritten
            const previousValue = element.textContent;
            element.textContent = value;
            console.log(`Updated element ${id} from "${previousValue}" to "${value}"`);
        } else {
            console.warn(`Element with ID ${id} not found in the document`);
        }
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

// Final initialization - run after everything else has loaded
window.addEventListener('load', function() {
    console.log('Window fully loaded, running final stats update check');
    
    // Wait a short time for any other scripts to complete
    setTimeout(function() {
        // Check if data is loaded
        if (allGuests.length > 0) {
            console.log('Running final forced update with', allGuests.length, 'guests');
            forceUpdateDashboardStats();
        } else {
            console.warn('No guest data available for final update');
            
            // Check if our script is being properly loaded and executed
            console.log('Checking document state and script execution:');
            console.log('- document.readyState:', document.readyState);
            console.log('- dashboard-core.js present:', !!window.fetchGuestList);
            
            // Try to fetch data again if needed
            if (typeof db !== 'undefined' && db) {
                console.log('Attempting to fetch guest data again...');
                fetchGuestList();
            }
        }
    }, 1000);
});

// Make functions globally available
window.fetchSubmissions = fetchSubmissions;
window.fetchGuestList = fetchGuestList;
