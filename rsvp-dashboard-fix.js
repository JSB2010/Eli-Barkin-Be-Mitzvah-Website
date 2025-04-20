/**
 * Special fix script for RSVP dashboard
 * This script prevents the common JavaScript errors on the RSVP dashboard page
 */

// Execute immediately when the script loads
(function() {
    console.log('RSVP Dashboard Fix: Initializing...');
    
    // Create a global error handler to catch and log errors
    window.addEventListener('error', function(event) {
        console.error('Global error caught:', event.error);
        
        // Log additional information about the error
        if (event.error && event.error.stack) {
            console.error('Error stack:', event.error.stack);
        }
        
        // Prevent the error from propagating if it's one of the known errors
        if (event.error && event.error.message) {
            const errorMsg = event.error.message.toLowerCase();
            
            // Check for known error patterns
            if (errorMsg.includes('null is not an object') && 
                (errorMsg.includes('nav.contains') || errorMsg.includes('offsetwidth'))) {
                console.log('Prevented known error from propagating:', event.error.message);
                event.preventDefault();
                return true; // Prevents the error from propagating
            }
        }
    }, true); // Use capturing phase to catch errors early
    
    // Function to safely initialize tooltips using native browser tooltips
    function initNativeTooltips() {
        try {
            // Find all elements with data-tooltip attribute
            const tooltipElements = document.querySelectorAll('[data-tooltip]');
            if (tooltipElements.length === 0) return;
            
            console.log(`Setting up ${tooltipElements.length} native tooltips`);
            
            // Use title attributes for tooltips (browser native)
            tooltipElements.forEach(element => {
                if (!element) return;
                
                const tooltipText = element.getAttribute('data-tooltip');
                if (!tooltipText) return;
                
                // Set the title attribute which will show as a native browser tooltip
                element.setAttribute('title', tooltipText);
                
                // Add a special class to style these elements
                element.classList.add('has-native-tooltip');
            });
            
            // Add a style for the tooltip elements
            const styleElement = document.createElement('style');
            styleElement.textContent = `
                .has-native-tooltip {
                    cursor: help;
                    border-bottom: 1px dotted #ccc;
                }
                
                /* Hide any custom tooltips that might be created */
                .tooltip {
                    display: none !important;
                }
            `;
            document.head.appendChild(styleElement);
            
            console.log('Native tooltips initialized');
        } catch (error) {
            console.error('Error initializing native tooltips:', error);
        }
    }
    
    // Function to safely patch problematic functions
    function patchProblematicFunctions() {
        try {
            // If DashboardEnhancements exists, patch its initTooltips method
            if (typeof DashboardEnhancements !== 'undefined') {
                console.log('Patching DashboardEnhancements.initTooltips');
                
                // Save the original method if we need to restore it
                DashboardEnhancements._originalInitTooltips = DashboardEnhancements.initTooltips;
                
                // Replace with our safe version
                DashboardEnhancements.initTooltips = function() {
                    console.log('Using safe tooltip initialization');
                    initNativeTooltips();
                };
            }
            
            console.log('Function patching complete');
        } catch (error) {
            console.error('Error patching functions:', error);
        }
    }
    
    // Function to run when DOM is ready
    function onDOMReady() {
        console.log('DOM ready, applying RSVP dashboard fixes');
        
        // Initialize native tooltips
        initNativeTooltips();
        
        // Patch problematic functions
        patchProblematicFunctions();
        
        console.log('RSVP Dashboard Fix: All fixes applied');
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDOMReady);
    } else {
        // DOM is already ready, run immediately
        onDOMReady();
    }
})();
