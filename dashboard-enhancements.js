// Dashboard Enhancements
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the dashboard enhancements
    DashboardEnhancements.init();
});

const DashboardEnhancements = {
    // Configuration
    config: {
        animationDuration: 300,
        chartColors: {
            primary: '#2563eb',
            secondary: '#f97316',
            success: '#10b981',
            danger: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
            light: '#f3f4f6',
            dark: '#1f2937'
        }
    },

    // Initialize the dashboard enhancements
    init: function() {
        console.log('Initializing dashboard enhancements...');

        // Add event listeners
        this.setupEventListeners();

        // Initialize components
        this.initializeComponents();

        // Add keyboard shortcuts
        this.setupKeyboardShortcuts();
    },

    // Set up event listeners
    setupEventListeners: function() {
        // Add refresh button functionality
        const refreshBtn = document.getElementById('refresh-data-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                // Show loading indicator
                if (typeof RSVPSystem !== 'undefined') {
                    RSVPSystem.showLoading();

                    // Show toast notification
                    if (typeof ToastSystem !== 'undefined') {
                        ToastSystem.info('Refreshing data...', 'Please wait');
                    }

                    // Refresh data
                    setTimeout(function() {
                        if (typeof RSVPSystem.fetchSubmissions === 'function') {
                            RSVPSystem.fetchSubmissions();
                        }

                        if (typeof RSVPSystem.fetchGuestList === 'function') {
                            RSVPSystem.fetchGuestList();
                        }
                    }, 500);
                }
            });
        }

        // Add export buttons functionality
        const exportRsvpsBtn = document.getElementById('export-rsvps-btn');
        if (exportRsvpsBtn) {
            exportRsvpsBtn.addEventListener('click', function() {
                DashboardEnhancements.exportToCSV('guests');
            });
        }

        const exportGuestListBtn = document.getElementById('export-guest-list-btn');
        if (exportGuestListBtn) {
            exportGuestListBtn.addEventListener('click', function() {
                DashboardEnhancements.exportToCSV('guests');
            });
        }
    },

    // Initialize components
    initializeComponents: function() {
        // Initialize tooltips
        this.initTooltips();

        // Initialize modals
        this.initModals();
    },

    // Initialize tooltips - completely rewritten to avoid any DOM measurement issues
    initTooltips: function() {
        try {
            // Check if we're on the RSVP dashboard
            const isRsvpDashboard = window.location.pathname.includes('rsvp-dashboard') ||
                                   document.title.includes('RSVP Dashboard');

            // Use a different approach for RSVP dashboard
            if (isRsvpDashboard) {
                console.log('Using special tooltip handling for RSVP dashboard');
                this.initTooltipsForRsvpDashboard();
                return;
            }

            // Regular tooltip initialization for other pages
            const tooltipElements = document.querySelectorAll('[data-tooltip]');
            if (tooltipElements.length === 0) {
                console.log('No tooltip elements found, skipping tooltip initialization');
                return;
            }

            console.log(`Initializing ${tooltipElements.length} tooltips`);

            // Create a single tooltip element that will be reused
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.style.position = 'absolute';
            tooltip.style.zIndex = '9999';
            tooltip.style.opacity = '0';
            tooltip.style.visibility = 'hidden';
            document.body.appendChild(tooltip);

            tooltipElements.forEach(element => {
                if (!element) return;

                const tooltipText = element.getAttribute('data-tooltip');
                if (!tooltipText) return;

                // Show tooltip on hover
                element.addEventListener('mouseenter', function() {
                    try {
                        // Set tooltip content
                        tooltip.textContent = tooltipText;

                        // Position the tooltip - use fixed positioning to avoid layout issues
                        const rect = element.getBoundingClientRect();

                        // Fixed dimensions to avoid measuring
                        const tooltipWidth = 200;
                        const tooltipHeight = 40;

                        // Position in the middle above the element
                        tooltip.style.left = (rect.left + (rect.width / 2) - (tooltipWidth / 2)) + 'px';
                        tooltip.style.top = (rect.top - tooltipHeight - 10) + 'px';
                        tooltip.style.width = tooltipWidth + 'px';
                        tooltip.style.height = 'auto';

                        // Make it visible
                        tooltip.style.opacity = '1';
                        tooltip.style.visibility = 'visible';
                    } catch (error) {
                        console.error('Error showing tooltip:', error);
                    }
                });

                // Hide tooltip on mouse leave
                element.addEventListener('mouseleave', function() {
                    try {
                        tooltip.style.opacity = '0';
                        tooltip.style.visibility = 'hidden';
                    } catch (error) {
                        console.error('Error hiding tooltip:', error);
                    }
                });
            });
        } catch (error) {
            console.error('Error initializing tooltips:', error);
        }
    },

    // Special tooltip initialization for RSVP dashboard
    initTooltipsForRsvpDashboard: function() {
        try {
            // Find all elements with data-tooltip attribute
            const tooltipElements = document.querySelectorAll('[data-tooltip]');
            if (tooltipElements.length === 0) return;

            console.log(`Setting up ${tooltipElements.length} tooltips for RSVP dashboard`);

            // Instead of using a shared tooltip element, we'll use title attributes
            // This uses the browser's native tooltip functionality which is more reliable
            tooltipElements.forEach(element => {
                if (!element) return;

                const tooltipText = element.getAttribute('data-tooltip');
                if (!tooltipText) return;

                // Set the title attribute which will show as a native browser tooltip
                element.setAttribute('title', tooltipText);

                // Add a special class to style these elements
                element.classList.add('has-native-tooltip');
            });

            // Add a style for the tooltip elements if needed
            const styleElement = document.createElement('style');
            styleElement.textContent = `
                .has-native-tooltip {
                    cursor: help;
                    border-bottom: 1px dotted #ccc;
                }
            `;
            document.head.appendChild(styleElement);

            console.log('RSVP dashboard tooltips initialized using native browser tooltips');
        } catch (error) {
            console.error('Error initializing RSVP dashboard tooltips:', error);
        }
    },

    // Initialize modals
    initModals: function() {
        // Find all modal triggers
        const modalTriggers = document.querySelectorAll('[data-modal]');

        modalTriggers.forEach(trigger => {
            const modalId = trigger.getAttribute('data-modal');
            const modal = document.getElementById(modalId);

            if (modal) {
                // Open modal on click
                trigger.addEventListener('click', function() {
                    modal.style.display = 'block';
                    document.body.style.overflow = 'hidden';

                    // Add animation class
                    setTimeout(() => {
                        modal.classList.add('show');
                    }, 10);
                });

                // Close modal on close button click
                const closeButtons = modal.querySelectorAll('.modal-close');
                closeButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        modal.classList.remove('show');

                        // Hide modal after animation
                        setTimeout(() => {
                            modal.style.display = 'none';
                            document.body.style.overflow = '';
                        }, DashboardEnhancements.config.animationDuration);
                    });
                });

                // Close modal on outside click
                modal.addEventListener('click', function(e) {
                    if (e.target === modal) {
                        modal.classList.remove('show');

                        // Hide modal after animation
                        setTimeout(() => {
                            modal.style.display = 'none';
                            document.body.style.overflow = '';
                        }, DashboardEnhancements.config.animationDuration);
                    }
                });
            }
        });
    },

    // Set up keyboard shortcuts
    setupKeyboardShortcuts: function() {
        document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + R: Refresh data
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                const refreshBtn = document.getElementById('refresh-data-btn');
                if (refreshBtn) {
                    refreshBtn.click();
                }
            }

            // Esc: Close modal
            if (e.key === 'Escape') {
                const visibleModal = document.querySelector('.modal.show');
                if (visibleModal) {
                    const closeBtn = visibleModal.querySelector('.modal-close');
                    if (closeBtn) {
                        closeBtn.click();
                    }
                }
            }
        });
    },

    // Export data to CSV with improved data merging
    exportToCSV: async function(type) {
        if (typeof RSVPSystem === 'undefined' || !RSVPSystem.state) {
            if (typeof ToastSystem !== 'undefined') {
                ToastSystem.error('RSVP System not initialized', 'Export Failed');
            }
            return;
        }

        try {
            // Show loading notification
            if (typeof ToastSystem !== 'undefined') {
                ToastSystem.info('Preparing export...', 'Export in Progress');
            }

            // Get merged data like the dashboard does
            const mergedData = await this.getMergedGuestData();

            if (mergedData.length === 0) {
                if (typeof ToastSystem !== 'undefined') {
                    ToastSystem.warning('No data to export', 'Export Failed');
                }
                return;
            }

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
            const filename = `guest_list_complete_${timestamp}.csv`;

            // CSV Headers - comprehensive export
            const headers = [
                'Name',
                'Email',
                'Phone',
                'Responding',
                'Attending',
                'Number of Adults',
                'Number of Children',
                'Names of Adults',
                'Names of Children',
                'Category',
                'Address',
                'City',
                'State',
                'Zip',
                'Submitted At'
            ];

            // Generate CSV content
            let csvContent = headers.join(',') + '\n';

            mergedData.forEach(guest => {
                // Extract and format data
                const name = this.escapeCsvValue(guest.name || '');
                const email = this.escapeCsvValue(guest.email || '');
                const phone = this.escapeCsvValue(guest.phone || '');

                // Use the merged data (now accurate like the dashboard)
                const responding = guest.hasResponded ? 'Yes' : 'No';
                const attending = guest.response === 'attending' ? 'Yes' : (guest.response === 'declined' ? 'No' : '');

                // Use RSVP submission data if available
                let adultCount = guest.adultCount || 0;
                let childCount = guest.childCount || 0;
                let adultGuests = '';
                let childGuests = '';

                // Format adult guest names
                if (Array.isArray(guest.adultGuests) && guest.adultGuests.length > 0) {
                    adultGuests = guest.adultGuests.filter(name => name && name.trim()).join('; ');
                } else if (guest.hasResponded && guest.actualGuestCount > 0) {
                    adultGuests = name;
                    if (adultCount === 0) adultCount = 1;
                }

                // Format child guest names
                if (Array.isArray(guest.childGuests) && guest.childGuests.length > 0) {
                    childGuests = guest.childGuests.filter(name => name && name.trim()).join('; ');
                }

                // If no specific breakdown but have total count, estimate
                if (adultCount === 0 && childCount === 0 && guest.actualGuestCount > 0) {
                    const additionalGuests = guest.additionalGuests || [];
                    if (additionalGuests.length > 0) {
                        const childNames = additionalGuests.filter(name =>
                            name && (name.toLowerCase().includes('child') ||
                                    name.toLowerCase().includes('kid') ||
                                    name.toLowerCase().includes('jr') ||
                                    name.toLowerCase().includes('baby'))
                        );
                        const adultNames = additionalGuests.filter(name =>
                            name && !childNames.includes(name)
                        );

                        adultCount = 1 + adultNames.length;
                        childCount = childNames.length;
                        adultGuests = [name, ...adultNames].join('; ');
                        childGuests = childNames.join('; ');
                    } else {
                        adultCount = 1;
                        adultGuests = name;
                    }
                }

                // Format address
                const address = guest.address || {};
                const addressLine = this.escapeCsvValue(address.line1 || '');
                const city = this.escapeCsvValue(address.city || '');
                const state = this.escapeCsvValue(address.state || '');
                const zip = this.escapeCsvValue(address.zip || '');

                // Format submitted date
                let submittedAt = '';
                if (guest.submittedAt) {
                    try {
                        submittedAt = guest.submittedAt.toLocaleString();
                    } catch (e) {
                        submittedAt = 'Invalid Date';
                    }
                }

                // Create CSV row
                const row = [
                    name,
                    email,
                    phone,
                    responding,
                    attending,
                    adultCount,
                    childCount,
                    this.escapeCsvValue(adultGuests),
                    this.escapeCsvValue(childGuests),
                    this.escapeCsvValue(guest.category || ''),
                    addressLine,
                    city,
                    state,
                    zip,
                    this.escapeCsvValue(submittedAt)
                ];

                csvContent += row.join(',') + '\n';
            });

            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Show success notification
            if (typeof ToastSystem !== 'undefined') {
                ToastSystem.success(`${mergedData.length} complete guest records exported successfully`, 'Export Complete');
            }

        } catch (error) {
            console.error('Export error:', error);
            if (typeof ToastSystem !== 'undefined') {
                ToastSystem.error(`Export failed: ${error.message}`, 'Export Failed');
            }
        }
    },

    // Get merged guest data (combines guestList and sheetRsvps like the dashboard)
    getMergedGuestData: async function() {
        if (!RSVPSystem.state.db) {
            throw new Error('Database not available');
        }

        try {
            // Fetch both collections like the dashboard does
            const [guestSnapshot, rsvpSnapshot] = await Promise.all([
                RSVPSystem.state.db.collection('guestList').get(),
                RSVPSystem.state.db.collection('sheetRsvps').get()
            ]);

            // Process RSVP submissions into a map by name (like the dashboard does)
            const submissionsByName = new Map();
            rsvpSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.name) {
                    submissionsByName.set(data.name.toLowerCase(), {
                        id: doc.id,
                        ...data,
                        submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt)
                    });
                }
            });

            // Process guests and merge with RSVP submission data
            const guests = [];
            guestSnapshot.forEach(doc => {
                const guestData = doc.data();
                const guest = {
                    id: doc.id,
                    name: guestData.name || '',
                    category: guestData.category || '',
                    hasResponded: guestData.hasResponded || false,
                    response: guestData.response || '',
                    actualGuestCount: guestData.actualGuestCount || 0,
                    additionalGuests: guestData.additionalGuests || [],
                    email: guestData.email || '',
                    phone: guestData.phone || '',
                    address: guestData.address || {},
                    submittedAt: guestData.submittedAt ? new Date(guestData.submittedAt.seconds * 1000) : null
                };

                // Merge with RSVP submission data if available (like the dashboard does)
                if (guest.name) {
                    const matchingSubmission = submissionsByName.get(guest.name.toLowerCase());
                    if (matchingSubmission) {
                        guest.hasResponded = true;
                        guest.response = matchingSubmission.attending === 'yes' ? 'attending' : 'declined';
                        guest.actualGuestCount = matchingSubmission.guestCount || 1;
                        guest.additionalGuests = matchingSubmission.additionalGuests || [];
                        guest.email = matchingSubmission.email || guest.email;
                        guest.phone = matchingSubmission.phone || guest.phone;
                        guest.submittedAt = matchingSubmission.submittedAt;

                        // Store additional RSVP details for better export
                        guest.adultCount = matchingSubmission.adultCount || 0;
                        guest.childCount = matchingSubmission.childCount || 0;
                        guest.adultGuests = matchingSubmission.adultGuests || [];
                        guest.childGuests = matchingSubmission.childGuests || [];
                    }
                }

                guests.push(guest);
            });

            // Sort by name
            guests.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            return guests;

        } catch (error) {
            console.error('Error fetching merged guest data:', error);
            throw error;
        }
    },

    // Escape CSV value
    escapeCsvValue: function(value) {
        if (value === null || value === undefined) {
            return '';
        }

        value = String(value);

        // If the value contains a comma, double quote, or newline, wrap it in double quotes
        if (value.includes(',') || value.includes('"') || value.includes('\\n') || value.includes('\\r')) {
            // Replace double quotes with two double quotes
            value = value.replace(/"/g, '""');
            // Wrap in double quotes
            value = `"${value}"`;
        }

        return value;
    },

    // Show a confirmation dialog
    confirm: function(message, callback) {
        // Create confirmation modal if it doesn't exist
        let confirmModal = document.getElementById('confirm-modal');

        if (!confirmModal) {
            confirmModal = document.createElement('div');
            confirmModal.id = 'confirm-modal';
            confirmModal.className = 'modal';

            confirmModal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3 class="modal-title">Confirmation</h3>
                        <button type="button" class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p id="confirm-message"></p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn secondary modal-close">Cancel</button>
                        <button type="button" id="confirm-ok" class="btn primary">Confirm</button>
                    </div>
                </div>
            `;

            document.body.appendChild(confirmModal);

            // Close modal on close button click
            const closeButtons = confirmModal.querySelectorAll('.modal-close');
            closeButtons.forEach(button => {
                button.addEventListener('click', function() {
                    confirmModal.style.display = 'none';
                });
            });

            // Close modal on outside click
            confirmModal.addEventListener('click', function(e) {
                if (e.target === confirmModal) {
                    confirmModal.style.display = 'none';
                }
            });
        }

        // Set message
        const messageElement = confirmModal.querySelector('#confirm-message');
        if (messageElement) {
            messageElement.textContent = message;
        }

        // Set confirm button action
        const confirmButton = confirmModal.querySelector('#confirm-ok');
        if (confirmButton) {
            // Remove previous event listeners
            const newConfirmButton = confirmButton.cloneNode(true);
            confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

            // Add new event listener
            newConfirmButton.addEventListener('click', function() {
                confirmModal.style.display = 'none';
                if (typeof callback === 'function') {
                    callback();
                }
            });
        }

        // Show modal
        confirmModal.style.display = 'block';
    }
};
