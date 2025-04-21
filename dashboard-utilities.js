// Dashboard Utilities Script
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    const db = firebase.firestore();

    // Get utility elements
    const syncSheetToFirebaseBtn = document.getElementById('sync-sheet-to-firebase-btn');
    const syncFirebaseToSheetBtn = document.getElementById('sync-firebase-to-sheet-btn');
    const syncMasterSheetBtn = document.getElementById('sync-master-sheet-btn');
    const resetTestUsersBtn = document.getElementById('reset-test-users-btn');
    const refreshDataBtnUtil = document.getElementById('refresh-data-btn-util');
    const addGuestBtnUtil = document.getElementById('add-guest-btn-util');
    const exportGuestListBtn = document.getElementById('export-guest-list-btn');
    const exportRsvpsBtn = document.getElementById('export-rsvps-btn');
    const backupDatabaseBtn = document.getElementById('backup-database-btn');

    // Get utility results elements
    const utilityResults = document.getElementById('utility-results');
    const utilityResultsTitle = document.getElementById('utility-results-title');
    const utilityResultsContent = document.getElementById('utility-results-content');
    const closeUtilityResults = document.getElementById('close-utility-results');

    // Test users to reset
    const testUsers = [
        "Jacob Barkin",
        "Hagen Zuzu Barkin",
        "Alton Barkin"
    ];

    // Function to show utility results
    function showUtilityResults(title, content, isError = false) {
        utilityResultsTitle.textContent = title;
        utilityResultsContent.innerHTML = content;
        utilityResults.classList.remove('hidden');

        if (isError) {
            utilityResultsTitle.style.color = 'var(--danger)';
        } else {
            utilityResultsTitle.style.color = 'var(--primary-blue-dark)';
        }

        // Scroll to results
        utilityResults.scrollIntoView({ behavior: 'smooth' });
    }

    // Function to hide utility results
    function hideUtilityResults() {
        utilityResults.classList.add('hidden');
    }

    // Function to reset a test user's RSVP status
    async function resetUser(userName) {
        try {
            // Step 1: Update guestList entry
            const guestListQuery = await db.collection('guestList')
                .where('name', '==', userName)
                .get();

            let guestUpdated = false;
            if (!guestListQuery.empty) {
                const guestDoc = guestListQuery.docs[0];

                // Update the guest to mark as not having responded
                await guestDoc.ref.update({
                    hasResponded: false,
                    response: '',
                    actualGuestCount: 0,
                    adultCount: 0,
                    childCount: 0,
                    adultGuests: [],
                    childGuests: [],
                    additionalGuests: [],
                    submittedAt: null
                });

                guestUpdated = true;
            }

            // Step 2: Delete sheetRsvps entry
            const rsvpQuery = await db.collection('sheetRsvps')
                .where('name', '==', userName)
                .get();

            let rsvpDeleted = false;
            if (!rsvpQuery.empty) {
                const rsvpDoc = rsvpQuery.docs[0];

                // Delete the RSVP entry
                await rsvpDoc.ref.delete();

                rsvpDeleted = true;
            }

            return {
                name: userName,
                success: true,
                guestUpdated,
                rsvpDeleted,
                message: `Successfully reset RSVP status for ${userName}`
            };
        } catch (error) {
            console.error(`Error resetting ${userName}:`, error);
            return {
                name: userName,
                success: false,
                error: error.message,
                message: `Error resetting ${userName}: ${error.message}`
            };
        }
    }

    // Function to reset all test users
    async function resetAllTestUsers() {
        const results = [];

        for (const user of testUsers) {
            const result = await resetUser(user);
            results.push(result);
        }

        // Format results for display
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;

        let resultsHTML = `
            <div class="results-summary">
                <p><strong>${successCount}</strong> of ${results.length} users reset successfully.</p>
                ${failCount > 0 ? `<p class="error-text">${failCount} errors occurred.</p>` : ''}
            </div>
            <div class="results-details">
                <h4>Details:</h4>
                <ul class="results-list">
                    ${results.map(result => `
                        <li class="result-item ${result.success ? 'success' : 'error'}">
                            <div class="result-icon">
                                <i class="fas ${result.success ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                            </div>
                            <div class="result-content">
                                <div class="result-title">${result.name}</div>
                                <div class="result-message">${result.message}</div>
                                ${result.success ?
                                    `<div class="result-details">
                                        ${result.guestUpdated ? '<span class="detail-badge success">Guest Updated</span>' : '<span class="detail-badge warning">Guest Not Found</span>'}
                                        ${result.rsvpDeleted ? '<span class="detail-badge success">RSVP Deleted</span>' : '<span class="detail-badge warning">No RSVP Found</span>'}
                                    </div>` :
                                    ''}
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div class="results-footer">
                <p>You can now test the RSVP process with these users again.</p>
                <button id="refresh-after-reset" class="btn primary"><i class="fas fa-sync-alt"></i> Refresh Dashboard Data</button>
            </div>
        `;

        showUtilityResults('Reset Test Users Results', resultsHTML, failCount > 0);

        // Add event listener to refresh button
        document.getElementById('refresh-after-reset').addEventListener('click', function() {
            // Call the existing refresh function from the dashboard
            if (typeof refreshData === 'function') {
                refreshData();
            } else if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
            hideUtilityResults();
        });
    }

    // Function to sync Google Sheet to Firebase
    async function syncSheetToFirebase() {
        try {
            showUtilityResults('Syncing Google Sheet to Firebase', `
                <div class="loading-indicator">
                    <div class="loading-spinner"></div>
                    <p>Syncing data from Google Sheet to Firebase...</p>
                </div>
            `);

            // Call the Cloud Function
            const syncFunction = firebase.functions().httpsCallable('manualSyncSheetChanges');
            const result = await syncFunction();

            // Display results
            if (result.data && result.data.success) {
                showUtilityResults('Sync Completed Successfully', `
                    <div class="success-message">
                        <i class="fas fa-check-circle"></i>
                        <div class="message-content">
                            <p>${result.data.message}</p>
                            <p>Synced ${result.data.syncedCount || 0} guests from Google Sheet to Firebase.</p>
                        </div>
                    </div>
                    <div class="results-footer">
                        <button id="refresh-after-sync" class="btn primary"><i class="fas fa-sync-alt"></i> Refresh Dashboard Data</button>
                    </div>
                `);

                // Add event listener to refresh button
                document.getElementById('refresh-after-sync').addEventListener('click', function() {
                    if (typeof refreshData === 'function') {
                        refreshData();
                    } else if (typeof loadDashboardData === 'function') {
                        loadDashboardData();
                    }
                    hideUtilityResults();
                });
            } else {
                throw new Error(result.data.message || 'Unknown error occurred');
            }
        } catch (error) {
            console.error('Error syncing sheet to Firebase:', error);
            showUtilityResults('Sync Error', `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <div class="message-content">
                        <p>Failed to sync Google Sheet to Firebase.</p>
                        <p class="error-details">${error.message}</p>
                    </div>
                </div>
                <div class="results-footer">
                    <button id="try-sync-again" class="btn primary"><i class="fas fa-redo"></i> Try Again</button>
                </div>
            `, true);

            // Add event listener to try again button
            document.getElementById('try-sync-again').addEventListener('click', function() {
                syncSheetToFirebase();
            });
        }
    }

    // Function to export guest list to CSV
    async function exportGuestList() {
        try {
            showUtilityResults('Exporting Guest List', `
                <div class="loading-indicator">
                    <div class="loading-spinner"></div>
                    <p>Preparing guest list for export...</p>
                </div>
            `);

            // Get all guests from Firestore
            const guestListSnapshot = await db.collection('guestList').get();

            if (guestListSnapshot.empty) {
                throw new Error('No guests found in the database');
            }

            // Convert to array of guest objects
            const guests = [];
            guestListSnapshot.forEach(doc => {
                const data = doc.data();
                guests.push({
                    id: doc.id,
                    name: data.name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    city: data.city || '',
                    state: data.state || '',
                    zip: data.zip || '',
                    category: data.category || '',
                    hasResponded: data.hasResponded || false,
                    response: data.response || '',
                    adultCount: data.adultCount || 0,
                    childCount: data.childCount || 0,
                    actualGuestCount: data.actualGuestCount || 0,
                    submittedAt: data.submittedAt ? new Date(data.submittedAt).toLocaleString() : ''
                });
            });

            // Create CSV content
            const headers = [
                'Name', 'Email', 'Phone', 'Address', 'City', 'State', 'Zip', 'Category',
                'Has Responded', 'Response', 'Adult Count', 'Child Count', 'Total Guests', 'Submitted At'
            ];

            let csvContent = headers.join(',') + '\n';

            guests.forEach(guest => {
                const row = [
                    `"${guest.name}"`,
                    `"${guest.email}"`,
                    `"${guest.phone}"`,
                    `"${guest.address}"`,
                    `"${guest.city}"`,
                    `"${guest.state}"`,
                    `"${guest.zip}"`,
                    `"${guest.category}"`,
                    guest.hasResponded,
                    `"${guest.response}"`,
                    guest.adultCount,
                    guest.childCount,
                    guest.actualGuestCount,
                    `"${guest.submittedAt}"`
                ];
                csvContent += row.join(',') + '\n';
            });

            // Create and download the CSV file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `guest-list-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Show success message
            showUtilityResults('Export Completed Successfully', `
                <div class="success-message">
                    <i class="fas fa-check-circle"></i>
                    <div class="message-content">
                        <p>Guest list exported successfully!</p>
                        <p>Exported ${guests.length} guests to CSV file.</p>
                    </div>
                </div>
                <div class="export-details">
                    <h4>Export Summary:</h4>
                    <ul>
                        <li>Total Guests: ${guests.length}</li>
                        <li>Responded: ${guests.filter(g => g.hasResponded).length}</li>
                        <li>Not Responded: ${guests.filter(g => !g.hasResponded).length}</li>
                    </ul>
                </div>
            `);

        } catch (error) {
            console.error('Error exporting guest list:', error);
            showUtilityResults('Export Error', `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <div class="message-content">
                        <p>Failed to export guest list.</p>
                        <p class="error-details">${error.message}</p>
                    </div>
                </div>
                <div class="results-footer">
                    <button id="try-export-again" class="btn primary"><i class="fas fa-redo"></i> Try Again</button>
                </div>
            `, true);

            // Add event listener to try again button
            document.getElementById('try-export-again').addEventListener('click', function() {
                exportGuestList();
            });
        }
    }

    // Function to export RSVP submissions to CSV
    async function exportRsvpSubmissions() {
        try {
            showUtilityResults('Exporting RSVP Submissions', `
                <div class="loading-indicator">
                    <div class="loading-spinner"></div>
                    <p>Preparing RSVP submissions for export...</p>
                </div>
            `);

            // Get all RSVP submissions from Firestore
            const rsvpSnapshot = await db.collection('sheetRsvps').get();

            if (rsvpSnapshot.empty) {
                throw new Error('No RSVP submissions found in the database');
            }

            // Convert to array of RSVP objects
            const rsvps = [];
            rsvpSnapshot.forEach(doc => {
                const data = doc.data();
                rsvps.push({
                    id: doc.id,
                    name: data.name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    attending: data.attending || '',
                    adultCount: data.adultCount || 0,
                    childCount: data.childCount || 0,
                    totalGuests: data.totalGuests || 0,
                    adultGuests: Array.isArray(data.adultGuests) ? data.adultGuests.join(', ') : '',
                    childGuests: Array.isArray(data.childGuests) ? data.childGuests.join(', ') : '',
                    submittedAt: data.submittedAt ? new Date(data.submittedAt).toLocaleString() : ''
                });
            });

            // Create CSV content
            const headers = [
                'Name', 'Email', 'Phone', 'Attending', 'Adult Count', 'Child Count', 'Total Guests',
                'Adult Guests', 'Child Guests', 'Submitted At'
            ];

            let csvContent = headers.join(',') + '\n';

            rsvps.forEach(rsvp => {
                const row = [
                    `"${rsvp.name}"`,
                    `"${rsvp.email}"`,
                    `"${rsvp.phone}"`,
                    `"${rsvp.attending}"`,
                    rsvp.adultCount,
                    rsvp.childCount,
                    rsvp.totalGuests,
                    `"${rsvp.adultGuests}"`,
                    `"${rsvp.childGuests}"`,
                    `"${rsvp.submittedAt}"`
                ];
                csvContent += row.join(',') + '\n';
            });

            // Create and download the CSV file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `rsvp-submissions-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Show success message
            showUtilityResults('Export Completed Successfully', `
                <div class="success-message">
                    <i class="fas fa-check-circle"></i>
                    <div class="message-content">
                        <p>RSVP submissions exported successfully!</p>
                        <p>Exported ${rsvps.length} submissions to CSV file.</p>
                    </div>
                </div>
                <div class="export-details">
                    <h4>Export Summary:</h4>
                    <ul>
                        <li>Total Submissions: ${rsvps.length}</li>
                        <li>Attending: ${rsvps.filter(r => r.attending === 'Yes').length}</li>
                        <li>Not Attending: ${rsvps.filter(r => r.attending === 'No').length}</li>
                        <li>Total Guests: ${rsvps.reduce((sum, r) => sum + r.totalGuests, 0)}</li>
                    </ul>
                </div>
            `);

        } catch (error) {
            console.error('Error exporting RSVP submissions:', error);
            showUtilityResults('Export Error', `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <div class="message-content">
                        <p>Failed to export RSVP submissions.</p>
                        <p class="error-details">${error.message}</p>
                    </div>
                </div>
                <div class="results-footer">
                    <button id="try-export-again" class="btn primary"><i class="fas fa-redo"></i> Try Again</button>
                </div>
            `, true);

            // Add event listener to try again button
            document.getElementById('try-export-again').addEventListener('click', function() {
                exportRsvpSubmissions();
            });
        }
    }

    // Function to sync Firebase to Google Sheet
    async function syncFirebaseToSheet() {
        try {
            showUtilityResults('Syncing Firebase to Google Sheet', `
                <div class="loading-indicator">
                    <div class="loading-spinner"></div>
                    <p>Syncing data from Firebase to Google Sheet...</p>
                </div>
            `);

            // Call the Cloud Function
            const syncFunction = firebase.functions().httpsCallable('manualUpdateAllRsvps');
            const result = await syncFunction();

            // Display results
            if (result.data && result.data.success) {
                showUtilityResults('Sync Completed Successfully', `
                    <div class="success-message">
                        <i class="fas fa-check-circle"></i>
                        <div class="message-content">
                            <p>${result.data.message}</p>
                            <p>Updated ${result.data.updatedCount || 0} submissions in the Google Sheet.</p>
                        </div>
                    </div>
                    <div class="results-footer">
                        <button id="refresh-after-sync" class="btn primary"><i class="fas fa-sync-alt"></i> Refresh Dashboard Data</button>
                    </div>
                `);

                // Add event listener to refresh button
                document.getElementById('refresh-after-sync').addEventListener('click', function() {
                    if (typeof refreshData === 'function') {
                        refreshData();
                    } else if (typeof loadDashboardData === 'function') {
                        loadDashboardData();
                    }
                    hideUtilityResults();
                });
            } else {
                throw new Error(result.data.message || 'Unknown error occurred');
            }
        } catch (error) {
            console.error('Error syncing Firebase to sheet:', error);
            showUtilityResults('Sync Error', `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <div class="message-content">
                        <p>Failed to sync Firebase to Google Sheet.</p>
                        <p class="error-details">${error.message}</p>
                    </div>
                </div>
                <div class="results-footer">
                    <button id="try-sync-again" class="btn primary"><i class="fas fa-redo"></i> Try Again</button>
                </div>
            `, true);

            // Add event listener to try again button
            document.getElementById('try-sync-again').addEventListener('click', function() {
                syncFirebaseToSheet();
            });
        }
    }

    // Function to sync Master Sheet with RSVP data
    async function syncMasterSheet() {
        try {
            showUtilityResults('Syncing Master Sheet with RSVP Data', `
                <div class="loading-indicator">
                    <div class="loading-spinner"></div>
                    <p>Updating master sheet with RSVP data...</p>
                </div>
            `);

            // Call the Cloud Function
            const syncFunction = firebase.functions().httpsCallable('manualUpdateMasterSheet');
            const result = await syncFunction();

            // Display results
            if (result.data && result.data.success) {
                showUtilityResults('Sync Completed Successfully', `
                    <div class="success-message">
                        <i class="fas fa-check-circle"></i>
                        <div class="message-content">
                            <p>${result.data.message}</p>
                            <p>Updated ${result.data.updatedCount || 0} RSVPs in the master sheet.</p>
                        </div>
                    </div>
                    ${result.data.errors && result.data.errors.length > 0 ? `
                    <div class="export-details">
                        <h4>Sync Issues (${result.data.errors.length}):</h4>
                        <ul>
                            ${result.data.errors.map(error => `<li>${error}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    <div class="results-footer">
                        <button id="refresh-after-master-sync" class="btn primary"><i class="fas fa-sync-alt"></i> Refresh Dashboard Data</button>
                    </div>
                `);

                // Add event listener to refresh button
                document.getElementById('refresh-after-master-sync').addEventListener('click', function() {
                    if (typeof refreshData === 'function') {
                        refreshData();
                    } else if (typeof loadDashboardData === 'function') {
                        loadDashboardData();
                    }
                    hideUtilityResults();
                });
            } else {
                throw new Error(result.data?.message || 'Unknown error occurred');
            }
        } catch (error) {
            console.error('Error syncing master sheet:', error);
            showUtilityResults('Sync Error', `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <div class="message-content">
                        <p>Failed to sync master sheet with RSVP data.</p>
                        <p class="error-details">${error.message}</p>
                    </div>
                </div>
                <div class="results-footer">
                    <button id="try-master-sync-again" class="btn primary"><i class="fas fa-redo"></i> Try Again</button>
                </div>
            `, true);

            // Add event listener to try again button
            document.getElementById('try-master-sync-again').addEventListener('click', function() {
                syncMasterSheet();
            });
        }
    }

    // Function to backup the entire database
    async function backupDatabase() {
        try {
            showUtilityResults('Creating Database Backup', `
                <div class="loading-indicator">
                    <div class="loading-spinner"></div>
                    <p>Preparing database backup...</p>
                </div>
            `);

            // Collections to backup
            const collections = ['guestList', 'sheetRsvps'];
            const backup = {};

            // Fetch all collections
            for (const collection of collections) {
                const snapshot = await db.collection(collection).get();
                backup[collection] = [];

                snapshot.forEach(doc => {
                    backup[collection].push({
                        id: doc.id,
                        data: doc.data()
                    });
                });
            }

            // Convert to JSON and create a downloadable file
            const jsonContent = JSON.stringify(backup, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `rsvp-database-backup-${new Date().toISOString().split('T')[0]}.json`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Show success message
            showUtilityResults('Backup Completed Successfully', `
                <div class="success-message">
                    <i class="fas fa-check-circle"></i>
                    <div class="message-content">
                        <p>Database backup created successfully!</p>
                        <p>Backup file has been downloaded to your computer.</p>
                    </div>
                </div>
                <div class="export-details">
                    <h4>Backup Summary:</h4>
                    <ul>
                        ${collections.map(collection => `
                            <li>${collection}: ${backup[collection].length} documents</li>
                        `).join('')}
                        <li>Total Size: ${Math.round(jsonContent.length / 1024)} KB</li>
                    </ul>
                </div>
            `);

        } catch (error) {
            console.error('Error creating database backup:', error);
            showUtilityResults('Backup Error', `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <div class="message-content">
                        <p>Failed to create database backup.</p>
                        <p class="error-details">${error.message}</p>
                    </div>
                </div>
                <div class="results-footer">
                    <button id="try-backup-again" class="btn primary"><i class="fas fa-redo"></i> Try Again</button>
                </div>
            `, true);

            // Add event listener to try again button
            document.getElementById('try-backup-again').addEventListener('click', function() {
                backupDatabase();
            });
        }
    }

    // Get main dashboard buttons
    const exportGuestListBtnMain = document.getElementById('export-guest-list-btn-main');
    const exportRsvpsBtnMain = document.getElementById('export-rsvps-btn-main');

    // Add event listeners to buttons
    if (syncSheetToFirebaseBtn) {
        syncSheetToFirebaseBtn.addEventListener('click', syncSheetToFirebase);
    }

    if (syncFirebaseToSheetBtn) {
        syncFirebaseToSheetBtn.addEventListener('click', syncFirebaseToSheet);
    }

    if (syncMasterSheetBtn) {
        syncMasterSheetBtn.addEventListener('click', syncMasterSheet);
    }

    if (resetTestUsersBtn) {
        resetTestUsersBtn.addEventListener('click', resetAllTestUsers);
    }

    if (exportGuestListBtn) {
        exportGuestListBtn.addEventListener('click', exportGuestList);
    }

    if (exportGuestListBtnMain) {
        exportGuestListBtnMain.addEventListener('click', exportGuestList);
    }

    if (exportRsvpsBtn) {
        exportRsvpsBtn.addEventListener('click', exportRsvpSubmissions);
    }

    if (exportRsvpsBtnMain) {
        exportRsvpsBtnMain.addEventListener('click', exportRsvpSubmissions);
    }

    if (backupDatabaseBtn) {
        backupDatabaseBtn.addEventListener('click', backupDatabase);
    }

    if (refreshDataBtnUtil) {
        refreshDataBtnUtil.addEventListener('click', function() {
            if (typeof refreshData === 'function') {
                refreshData();
            } else if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        });
    }

    if (addGuestBtnUtil) {
        addGuestBtnUtil.addEventListener('click', function() {
            const addGuestModal = document.getElementById('add-guest-modal');
            if (addGuestModal) {
                addGuestModal.style.display = 'block';
            }
        });
    }

    if (closeUtilityResults) {
        closeUtilityResults.addEventListener('click', hideUtilityResults);
    }

    // Add additional CSS for utility results
    const style = document.createElement('style');
    style.textContent = `
        .loading-indicator {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            padding: 1.5rem;
        }

        .loading-spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-left: 4px solid var(--primary-blue);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }

        .results-summary {
            margin-bottom: 1.5rem;
            padding: 1rem;
            background-color: var(--light-blue);
            border-radius: var(--border-radius-sm);
        }

        .results-details {
            margin-bottom: 1.5rem;
        }

        .results-list {
            list-style: none;
            padding: 0;
            margin: 1rem 0;
        }

        .result-item {
            display: flex;
            gap: 1rem;
            padding: 1rem;
            border-radius: var(--border-radius-sm);
            margin-bottom: 0.75rem;
            background-color: var(--light-gray);
        }

        .result-item.success {
            border-left: 4px solid var(--success);
        }

        .result-item.error {
            border-left: 4px solid var(--danger);
        }

        .result-icon {
            font-size: 1.5rem;
            display: flex;
            align-items: center;
        }

        .result-item.success .result-icon {
            color: var(--success);
        }

        .result-item.error .result-icon {
            color: var(--danger);
        }

        .result-content {
            flex-grow: 1;
        }

        .result-title {
            font-weight: 600;
            margin-bottom: 0.25rem;
        }

        .result-message {
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
        }

        .result-details {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }

        .detail-badge {
            display: inline-flex;
            align-items: center;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .detail-badge.success {
            background-color: var(--success-light);
            color: var(--success);
        }

        .detail-badge.warning {
            background-color: var(--warning-light);
            color: var(--warning);
        }

        .results-footer {
            margin-top: 1.5rem;
            padding-top: 1rem;
            border-top: 1px solid var(--medium-gray);
        }

        .success-message, .error-message {
            display: flex;
            gap: 1rem;
            padding: 1.5rem;
            border-radius: var(--border-radius-sm);
            margin-bottom: 1rem;
        }

        .success-message {
            background-color: var(--success-light);
            color: var(--success);
        }

        .error-message {
            background-color: var(--danger-light);
            color: var(--danger);
        }

        .success-message i, .error-message i {
            font-size: 2rem;
        }

        .message-content {
            flex-grow: 1;
        }

        .error-details {
            margin-top: 0.5rem;
            padding: 0.5rem;
            background-color: rgba(0, 0, 0, 0.05);
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.85rem;
        }

        .error-text {
            color: var(--danger);
        }

        .export-details {
            margin-top: 1.5rem;
            padding: 1.25rem;
            background-color: var(--light-gray);
            border-radius: var(--border-radius-sm);
            border-left: 4px solid var(--info);
        }

        .export-details h4 {
            margin-top: 0;
            margin-bottom: 1rem;
            font-size: 1.1rem;
            color: var(--dark-gray);
            font-weight: 600;
        }

        .export-details ul {
            margin: 0;
            padding-left: 1.5rem;
        }

        .export-details li {
            margin-bottom: 0.5rem;
            line-height: 1.5;
        }
    `;
    document.head.appendChild(style);
});
