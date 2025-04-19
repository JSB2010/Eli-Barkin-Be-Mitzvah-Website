/**
 * Enhanced analytics and monitoring for Eli's Be Mitzvah website
 */

// Initialize analytics and monitoring when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize performance monitoring
    initPerformanceMonitoring();
    
    // Initialize error monitoring
    initErrorMonitoring();
    
    // Track user interactions
    trackUserInteractions();
    
    // Track page performance metrics
    trackPagePerformance();
});

/**
 * Initialize performance monitoring
 */
function initPerformanceMonitoring() {
    // Check if the Performance API is available
    if (window.performance && window.performance.timing) {
        // Wait for the window load event to ensure all resources are loaded
        window.addEventListener('load', function() {
            // Wait a bit to ensure timing data is available
            setTimeout(function() {
                // Calculate and log performance metrics
                const perfData = calculatePerformanceMetrics();
                
                // Log to console in development
                console.log('Performance metrics:', perfData);
                
                // Send to Google Analytics
                if (window.gtag) {
                    gtag('event', 'performance_metrics', {
                        'page_load_time': perfData.pageLoadTime,
                        'dom_load_time': perfData.domLoadTime,
                        'first_contentful_paint': perfData.firstContentfulPaint
                    });
                }
            }, 0);
        });
    }
}

/**
 * Calculate performance metrics using the Performance API
 */
function calculatePerformanceMetrics() {
    const timing = window.performance.timing;
    const navigationStart = timing.navigationStart;
    
    // Calculate various timing metrics
    const pageLoadTime = timing.loadEventEnd - navigationStart;
    const domLoadTime = timing.domContentLoadedEventEnd - navigationStart;
    
    // Get First Contentful Paint if available
    let firstContentfulPaint = 0;
    const paintEntries = performance.getEntriesByType('paint');
    if (paintEntries.length > 0) {
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
            firstContentfulPaint = fcpEntry.startTime;
        }
    }
    
    return {
        pageLoadTime,
        domLoadTime,
        firstContentfulPaint,
        timestamp: new Date().toISOString()
    };
}

/**
 * Initialize error monitoring
 */
function initErrorMonitoring() {
    // Global error handler
    window.addEventListener('error', function(event) {
        const errorDetails = {
            message: event.message,
            source: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error ? event.error.stack : null,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        // Log to console in development
        console.error('Captured error:', errorDetails);
        
        // Send to Google Analytics
        if (window.gtag) {
            gtag('event', 'javascript_error', {
                'error_message': errorDetails.message,
                'error_source': errorDetails.source,
                'error_line': errorDetails.lineno,
                'page_url': errorDetails.url
            });
        }
        
        // Optionally, you could send this to a server endpoint or a service like Sentry
        // sendErrorToServer(errorDetails);
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', function(event) {
        const errorDetails = {
            message: event.reason ? (event.reason.message || 'Unhandled Promise Rejection') : 'Unhandled Promise Rejection',
            stack: event.reason ? event.reason.stack : null,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        // Log to console in development
        console.error('Unhandled Promise Rejection:', errorDetails);
        
        // Send to Google Analytics
        if (window.gtag) {
            gtag('event', 'promise_error', {
                'error_message': errorDetails.message,
                'page_url': errorDetails.url
            });
        }
    });
}

/**
 * Track user interactions
 */
function trackUserInteractions() {
    // Track clicks on important elements
    trackElementClicks('a', 'link_click');
    trackElementClicks('button', 'button_click');
    trackElementClicks('.btn', 'button_click');
    trackElementClicks('form', 'form_submit', 'submit');
    
    // Track scroll depth
    trackScrollDepth();
    
    // Track time spent on page
    trackTimeOnPage();
}

/**
 * Track clicks on specific elements
 */
function trackElementClicks(selector, eventName, eventType = 'click') {
    const elements = document.querySelectorAll(selector);
    
    elements.forEach(element => {
        element.addEventListener(eventType, function(event) {
            // For forms, we want to track before the form submits
            if (eventType === 'submit') {
                // Don't prevent default for forms
            } else {
                // For normal clicks, we can delay a bit to ensure the event is sent
                const href = element.getAttribute('href');
                if (href && href.indexOf('#') !== 0 && href.indexOf('javascript:') !== 0) {
                    // It's a link that navigates away
                }
            }
            
            // Get element details for tracking
            const elementDetails = {
                text: element.innerText || element.value || '',
                id: element.id || '',
                class: element.className || '',
                type: element.type || '',
                href: element.href || ''
            };
            
            // Send to Google Analytics
            if (window.gtag) {
                gtag('event', eventName, {
                    'element_text': elementDetails.text.substring(0, 100),
                    'element_id': elementDetails.id,
                    'element_class': elementDetails.class,
                    'element_type': elementDetails.type,
                    'element_href': elementDetails.href
                });
            }
        });
    });
}

/**
 * Track scroll depth
 */
function trackScrollDepth() {
    // Track scroll milestones (25%, 50%, 75%, 90%, 100%)
    const milestones = [25, 50, 75, 90, 100];
    const trackedMilestones = {};
    
    // Function to calculate scroll percentage
    function getScrollPercent() {
        const h = document.documentElement;
        const b = document.body;
        const st = 'scrollTop';
        const sh = 'scrollHeight';
        return (h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight) * 100;
    }
    
    // Listen for scroll events
    window.addEventListener('scroll', function() {
        const scrollPercent = Math.round(getScrollPercent());
        
        // Check each milestone
        milestones.forEach(milestone => {
            if (scrollPercent >= milestone && !trackedMilestones[milestone]) {
                trackedMilestones[milestone] = true;
                
                // Send to Google Analytics
                if (window.gtag) {
                    gtag('event', 'scroll_depth', {
                        'scroll_percent': milestone,
                        'page_url': window.location.href,
                        'page_title': document.title
                    });
                }
            }
        });
    });
}

/**
 * Track time spent on page
 */
function trackTimeOnPage() {
    // Track time intervals (10s, 30s, 60s, 120s, 300s)
    const intervals = [10, 30, 60, 120, 300];
    const trackedIntervals = {};
    
    // Start time
    const startTime = new Date();
    
    // Function to check time spent
    function checkTimeSpent() {
        const currentTime = new Date();
        const secondsSpent = Math.floor((currentTime - startTime) / 1000);
        
        // Check each interval
        intervals.forEach(interval => {
            if (secondsSpent >= interval && !trackedIntervals[interval]) {
                trackedIntervals[interval] = true;
                
                // Send to Google Analytics
                if (window.gtag) {
                    gtag('event', 'time_on_page', {
                        'time_seconds': interval,
                        'page_url': window.location.href,
                        'page_title': document.title
                    });
                }
            }
        });
    }
    
    // Check every 5 seconds
    setInterval(checkTimeSpent, 5000);
    
    // Also track when user leaves the page
    window.addEventListener('beforeunload', function() {
        const currentTime = new Date();
        const secondsSpent = Math.floor((currentTime - startTime) / 1000);
        
        // Send to Google Analytics
        if (window.gtag) {
            gtag('event', 'page_exit', {
                'time_seconds': secondsSpent,
                'page_url': window.location.href,
                'page_title': document.title
            });
        }
    });
}

/**
 * Track page performance metrics
 */
function trackPagePerformance() {
    // Check if the Performance API is available
    if (window.performance && window.performance.getEntriesByType) {
        window.addEventListener('load', function() {
            // Wait a bit to ensure all resources are loaded
            setTimeout(function() {
                // Get resource timing entries
                const resources = window.performance.getEntriesByType('resource');
                
                // Calculate total page weight
                let totalBytes = 0;
                let slowestResource = null;
                let slowestTime = 0;
                
                resources.forEach(resource => {
                    // Some resources don't have transferSize
                    if (resource.transferSize) {
                        totalBytes += resource.transferSize;
                    }
                    
                    // Track slowest resource
                    if (resource.duration > slowestTime) {
                        slowestTime = resource.duration;
                        slowestResource = resource;
                    }
                });
                
                // Convert to KB
                const totalKB = Math.round(totalBytes / 1024);
                
                // Log to console in development
                console.log('Page weight:', totalKB, 'KB');
                console.log('Number of resources:', resources.length);
                console.log('Slowest resource:', slowestResource);
                
                // Send to Google Analytics
                if (window.gtag) {
                    gtag('event', 'page_weight', {
                        'total_kb': totalKB,
                        'resource_count': resources.length,
                        'page_url': window.location.href
                    });
                    
                    if (slowestResource) {
                        gtag('event', 'slowest_resource', {
                            'resource_url': slowestResource.name,
                            'load_time': Math.round(slowestResource.duration),
                            'page_url': window.location.href
                        });
                    }
                }
            }, 1000);
        });
    }
}
