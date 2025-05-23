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
                DashboardEnhancements.exportToCSV('rsvps');
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

    // Export data to CSV
    exportToCSV: function(type) {
        if (typeof RSVPSystem === 'undefined' || !RSVPSystem.state) {
            if (typeof ToastSystem !== 'undefined') {
                ToastSystem.error('RSVP System not initialized', 'Export Failed');
            }
            return;
        }

        let data = [];
        let filename = '';
        let headers = [];

        if (type === 'rsvps') {
            data = RSVPSystem.state.submissions || [];
            filename = 'rsvp-submissions-' + new Date().toISOString().split('T')[0] + '.csv';
            headers = ['Name', 'Email', 'Phone', 'Response', 'Guest Count', 'Additional Guests', 'Submitted At'];
        } else if (type === 'guests') {
            data = RSVPSystem.state.guests || [];
            filename = 'guest-list-' + new Date().toISOString().split('T')[0] + '.csv';
            headers = ['Name', 'Email', 'Phone', 'Status', 'Response', 'Guest Count', 'Additional Guests', 'Address', 'City', 'State', 'Zip', 'Category'];
        }

        if (data.length === 0) {
            if (typeof ToastSystem !== 'undefined') {
                ToastSystem.warning('No data to export', 'Export Failed');
            }
            return;
        }

        // Process data
        let csvContent = headers.join(',') + '\\n';

        data.forEach(item => {
            let row = [];

            if (type === 'rsvps') {
                row = [
                    this.escapeCsvValue(item.name || ''),
                    this.escapeCsvValue(item.email || ''),
                    this.escapeCsvValue(item.phone || ''),
                    this.escapeCsvValue(item.response || ''),
                    item.guestCount || 0,
                    this.escapeCsvValue((item.additionalGuests || []).join(', ')),
                    item.submittedAt ? new Date(item.submittedAt).toLocaleString() : ''
                ];
            } else if (type === 'guests') {
                row = [
                    this.escapeCsvValue(item.name || ''),
                    this.escapeCsvValue(item.email || ''),
                    this.escapeCsvValue(item.phone || ''),
                    item.hasResponded ? 'Responded' : 'Not Responded',
                    item.hasResponded ? (item.response === 'yes' ? 'Attending' : 'Not Attending') : '',
                    item.actualGuestCount || 0,
                    this.escapeCsvValue((item.additionalGuests || []).join(', ')),
                    this.escapeCsvValue(item.address?.line1 || ''),
                    this.escapeCsvValue(item.address?.city || ''),
                    this.escapeCsvValue(item.address?.state || ''),
                    this.escapeCsvValue(item.address?.zip || ''),
                    this.escapeCsvValue(item.category || '')
                ];
            }

            csvContent += row.join(',') + '\\n';
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
            ToastSystem.success(`${data.length} records exported successfully`, 'Export Complete');
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
