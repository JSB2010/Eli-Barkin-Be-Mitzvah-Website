// Cloudflare Cache Purge Script
document.addEventListener('DOMContentLoaded', function() {
    // Add a button to the dashboard actions
    const dashboardActions = document.querySelector('.dashboard-actions');
    if (dashboardActions) {
        const purgeButton = document.createElement('button');
        purgeButton.type = 'button';
        purgeButton.id = 'purge-cache-btn';
        purgeButton.className = 'btn info';
        purgeButton.innerHTML = '<i class="fas fa-sync-alt"></i> Purge Cache';
        
        // Add click event listener
        purgeButton.addEventListener('click', function() {
            purgeCacheAndReload();
        });
        
        // Add button to dashboard actions
        dashboardActions.appendChild(purgeButton);
    }
    
    // Function to purge cache and reload
    function purgeCacheAndReload() {
        // Show loading toast
        if (typeof ToastSystem !== 'undefined') {
            ToastSystem.info('Purging cache and reloading...', 'Please wait');
        }
        
        // Add a timestamp parameter to force a cache miss
        const timestamp = new Date().getTime();
        
        // Create a list of resources to reload with cache-busting
        const resourcesToReload = [
            'rsvp-dashboard.html',
            'rsvp-system-minimal.js',
            'simple-login.js',
            'modern-dashboard.css',
            'toast-notifications.js',
            'dashboard-enhancements.js'
        ];
        
        // Preload resources with cache-busting
        const preloadPromises = resourcesToReload.map(resource => {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', `${resource}?t=${timestamp}`, true);
                xhr.onload = function() {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        reject();
                    }
                };
                xhr.onerror = reject;
                xhr.send();
            });
        });
        
        // When all resources are preloaded, reload the page
        Promise.all(preloadPromises)
            .then(() => {
                // Show success toast
                if (typeof ToastSystem !== 'undefined') {
                    ToastSystem.success('Cache purged successfully', 'Reloading page...');
                }
                
                // Reload the page with cache-busting
                setTimeout(() => {
                    window.location.href = `rsvp-dashboard.html?t=${timestamp}`;
                }, 1000);
            })
            .catch(() => {
                // Show error toast
                if (typeof ToastSystem !== 'undefined') {
                    ToastSystem.error('Failed to purge cache', 'Please try again');
                }
            });
    }
});
