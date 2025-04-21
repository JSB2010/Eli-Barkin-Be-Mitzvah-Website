// RSVP Dashboard Charts Fix
document.addEventListener('DOMContentLoaded', function() {
    console.log('RSVP Dashboard Charts Fix loaded');

    // Wait for the main dashboard scripts to load
    setTimeout(initializeChartFixes, 1000);
});

function initializeChartFixes() {
    console.log('Initializing chart fixes');

    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded, waiting...');
        setTimeout(initializeChartFixes, 1000);
        return;
    }

    // Set Chart.js defaults to avoid DOM measurement issues
    // Note: Chart.platform.disableCSSInjection was removed in Chart.js v4.x
    // Using the new configuration approach instead
    Chart.defaults.plugins.tooltip.enabled = true;
    Chart.defaults.plugins.legend.display = true;

    // Add a global chart configuration to avoid common issues
    Chart.defaults.font.family = "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.plugins.tooltip.enabled = true;
    Chart.defaults.plugins.legend.display = true;

    // Add event listener for tab changes to redraw charts
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            setTimeout(function() {
                if (window.attendanceChart) window.attendanceChart.update();
                if (window.timelineChart) window.timelineChart.update();
                if (window.guestCountChart) window.guestCountChart.update();
                if (window.cumulativeGuestsChart) window.cumulativeGuestsChart.update();
                if (window.categoryResponseChart) window.categoryResponseChart.update();
                if (window.categoryDistributionChart) window.categoryDistributionChart.update();

                console.log('Charts updated after tab change');
            }, 100);
        });
    });

    // Add a resize handler to redraw charts when window is resized
    window.addEventListener('resize', function() {
        if (window.attendanceChart) window.attendanceChart.resize();
        if (window.timelineChart) window.timelineChart.resize();
        if (window.guestCountChart) window.guestCountChart.resize();
        if (window.cumulativeGuestsChart) window.cumulativeGuestsChart.resize();
        if (window.categoryResponseChart) window.categoryResponseChart.resize();
        if (window.categoryDistributionChart) window.categoryDistributionChart.resize();
    });

    // Override the createCharts function to fix issues
    const originalCreateCharts = window.createCharts;
    if (typeof originalCreateCharts === 'function') {
        window.createCharts = function() {
            console.log('Running enhanced createCharts function');

            try {
                // Call the original function
                originalCreateCharts.apply(this, arguments);

                // Additional fixes after the original charts are created
                fixChartRendering();
            } catch (error) {
                console.error('Error in enhanced createCharts:', error);
                // Fallback to creating basic charts
                createBasicCharts();
            }
        };
    } else {
        console.warn('Original createCharts function not found, adding our own');
        window.createCharts = createBasicCharts;
    }

    // Add a fix for the category charts
    const originalCreateCategoryCharts = window.createCategoryCharts;
    if (typeof originalCreateCategoryCharts === 'function') {
        window.createCategoryCharts = function() {
            console.log('Running enhanced createCategoryCharts function');

            try {
                // Call the original function
                originalCreateCategoryCharts.apply(this, arguments);

                // Additional fixes after the original charts are created
                fixCategoryChartRendering();
            } catch (error) {
                console.error('Error in enhanced createCategoryCharts:', error);
                // Fallback to creating basic category charts
                createBasicCategoryCharts();
            }
        };
    }

    // If data is already loaded, refresh the charts
    if (window.allSubmissions && window.allSubmissions.length > 0) {
        console.log('Data already loaded, refreshing charts');
        if (typeof window.createCharts === 'function') {
            window.createCharts();
        }
        if (typeof window.createCategoryCharts === 'function') {
            window.createCategoryCharts();
        }
    }
}

// Fix chart rendering issues
function fixChartRendering() {
    console.log('Applying chart rendering fixes');

    // Force redraw of all charts
    setTimeout(function() {
        if (window.attendanceChart) window.attendanceChart.update();
        if (window.timelineChart) window.timelineChart.update();
        if (window.guestCountChart) window.guestCountChart.update();
        if (window.cumulativeGuestsChart) window.cumulativeGuestsChart.update();

        console.log('Charts updated after fix');
    }, 100);
}

// Fix category chart rendering issues
function fixCategoryChartRendering() {
    console.log('Applying category chart rendering fixes');

    // Force redraw of category charts
    setTimeout(function() {
        if (window.categoryResponseChart) window.categoryResponseChart.update();
        if (window.categoryDistributionChart) window.categoryDistributionChart.update();

        console.log('Category charts updated after fix');
    }, 100);
}

// Create basic charts as a fallback
function createBasicCharts() {
    console.log('Creating basic charts as fallback');

    // Check if we have data and chart elements
    if (!window.allSubmissions || !Array.isArray(window.allSubmissions)) {
        console.error('No submission data available for charts');
        return;
    }

    // Get chart canvases
    const attendanceChartCanvas = document.getElementById('attendance-chart');
    const timelineChartCanvas = document.getElementById('timeline-chart');

    // Destroy existing charts
    if (window.attendanceChart instanceof Chart) {
        window.attendanceChart.destroy();
    }
    if (window.timelineChart instanceof Chart) {
        window.timelineChart.destroy();
    }
    if (window.guestCountChart instanceof Chart) {
        window.guestCountChart.destroy();
    }
    if (window.cumulativeGuestsChart instanceof Chart) {
        window.cumulativeGuestsChart.destroy();
    }

    // Create basic attendance chart
    if (attendanceChartCanvas) {
        const attendingCount = window.allSubmissions.filter(s => s.attending === 'yes').length;
        const notAttendingCount = window.allSubmissions.filter(s => s.attending === 'no').length;

        window.attendanceChart = new Chart(attendanceChartCanvas, {
            type: 'pie',
            data: {
                labels: ['Attending', 'Not Attending'],
                datasets: [{
                    data: [attendingCount, notAttendingCount],
                    backgroundColor: ['#1e88e5', '#ff9800']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Create basic timeline chart
    if (timelineChartCanvas) {
        // Group submissions by date
        const submissionsByDate = {};
        window.allSubmissions.forEach(submission => {
            const date = submission.submittedAt.toLocaleDateString();
            submissionsByDate[date] = (submissionsByDate[date] || 0) + 1;
        });

        const dates = Object.keys(submissionsByDate).sort((a, b) => new Date(a) - new Date(b));
        const counts = dates.map(date => submissionsByDate[date]);

        window.timelineChart = new Chart(timelineChartCanvas, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Submissions',
                    data: counts,
                    borderColor: '#1e88e5',
                    backgroundColor: 'rgba(30, 136, 229, 0.1)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
}

// Create basic category charts as a fallback
function createBasicCategoryCharts() {
    console.log('Creating basic category charts as fallback');

    // Check if we have data and chart elements
    if (!window.allGuests || !Array.isArray(window.allGuests)) {
        console.error('No guest data available for category charts');
        return;
    }

    // Get chart canvases
    const categoryDistributionChartCanvas = document.getElementById('category-distribution-chart');

    // Destroy existing charts
    if (window.categoryResponseChart instanceof Chart) {
        window.categoryResponseChart.destroy();
    }
    if (window.categoryDistributionChart instanceof Chart) {
        window.categoryDistributionChart.destroy();
    }

    // Create basic category distribution chart
    if (categoryDistributionChartCanvas) {
        // Get unique categories
        const categories = [...new Set(window.allGuests.map(guest => guest.category).filter(Boolean))];

        // Count guests in each category
        const categoryCounts = categories.map(category => {
            return window.allGuests.filter(guest => guest.category === category).length;
        });

        window.categoryDistributionChart = new Chart(categoryDistributionChartCanvas, {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    data: categoryCounts,
                    backgroundColor: [
                        '#1e88e5', '#ff9800', '#4caf50', '#f44336', '#9c27b0',
                        '#3f51b5', '#e91e63', '#009688', '#ff5722', '#607d8b'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }
}
