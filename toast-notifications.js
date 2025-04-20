// Toast Notification System
const ToastSystem = {
    // Configuration
    config: {
        duration: 5000, // Default duration in milliseconds
        position: 'bottom-right', // Default position
        maxToasts: 5 // Maximum number of toasts to show at once
    },
    
    // Initialize the toast system
    init: function() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    },
    
    // Show a toast notification
    show: function(options) {
        // Initialize if not already initialized
        if (!document.getElementById('toast-container')) {
            this.init();
        }
        
        const container = document.getElementById('toast-container');
        
        // Default options
        const defaults = {
            title: '',
            message: '',
            type: 'info', // info, success, error, warning
            duration: this.config.duration,
            dismissible: true
        };
        
        // Merge options with defaults
        const settings = { ...defaults, ...options };
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${settings.type}`;
        
        // Set icon based on type
        let icon = '';
        switch (settings.type) {
            case 'success':
                icon = '<i class="fas fa-check-circle toast-icon"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle toast-icon"></i>';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle toast-icon"></i>';
                break;
            case 'info':
            default:
                icon = '<i class="fas fa-info-circle toast-icon"></i>';
                break;
        }
        
        // Create toast content
        toast.innerHTML = `
            ${icon}
            <div class="toast-content">
                ${settings.title ? `<div class="toast-title">${settings.title}</div>` : ''}
                <div class="toast-message">${settings.message}</div>
            </div>
            ${settings.dismissible ? '<button type="button" class="toast-close">&times;</button>' : ''}
        `;
        
        // Add to container
        container.appendChild(toast);
        
        // Limit the number of toasts
        const toasts = container.querySelectorAll('.toast');
        if (toasts.length > this.config.maxToasts) {
            container.removeChild(toasts[0]);
        }
        
        // Add click event to close button
        if (settings.dismissible) {
            const closeBtn = toast.querySelector('.toast-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.dismiss(toast);
                });
            }
        }
        
        // Auto dismiss after duration
        if (settings.duration > 0) {
            setTimeout(() => {
                this.dismiss(toast);
            }, settings.duration);
        }
        
        return toast;
    },
    
    // Dismiss a toast
    dismiss: function(toast) {
        if (!toast) return;
        
        // Add dismissing class for animation
        toast.classList.add('dismissing');
        
        // Remove after animation completes
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    },
    
    // Show a success toast
    success: function(message, title = 'Success', options = {}) {
        return this.show({
            title,
            message,
            type: 'success',
            ...options
        });
    },
    
    // Show an error toast
    error: function(message, title = 'Error', options = {}) {
        return this.show({
            title,
            message,
            type: 'error',
            ...options
        });
    },
    
    // Show a warning toast
    warning: function(message, title = 'Warning', options = {}) {
        return this.show({
            title,
            message,
            type: 'warning',
            ...options
        });
    },
    
    // Show an info toast
    info: function(message, title = 'Information', options = {}) {
        return this.show({
            title,
            message,
            type: 'info',
            ...options
        });
    },
    
    // Clear all toasts
    clear: function() {
        const container = document.getElementById('toast-container');
        if (container) {
            container.innerHTML = '';
        }
    }
};

// Initialize the toast system when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    ToastSystem.init();
});
