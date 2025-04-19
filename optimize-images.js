/**
 * Image optimization script for Eli's Be Mitzvah website
 *
 * This script uses the Intersection Observer API to lazy load images
 * and provides responsive image loading based on device size.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize lazy loading for images
    initLazyLoading();

    // Initialize responsive images
    initResponsiveImages();
});

/**
 * Initialize lazy loading for images
 */
function initLazyLoading() {
    // Check if Intersection Observer is supported
    if ('IntersectionObserver' in window) {
        const lazyImages = document.querySelectorAll('img[data-src], source[data-srcset]');

        const imageObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    const lazyImage = entry.target;

                    if (lazyImage.dataset.src) {
                        lazyImage.src = lazyImage.dataset.src;
                        lazyImage.removeAttribute('data-src');
                    }

                    if (lazyImage.dataset.srcset) {
                        lazyImage.srcset = lazyImage.dataset.srcset;
                        lazyImage.removeAttribute('data-srcset');
                    }

                    // Add a fade-in effect
                    lazyImage.classList.add('loaded');

                    // Stop observing the image
                    observer.unobserve(lazyImage);
                }
            });
        }, {
            rootMargin: '100px 0px', // Start loading images when they're 100px from entering the viewport
            threshold: 0.01 // Trigger when at least 1% of the image is visible
        });

        lazyImages.forEach(function(lazyImage) {
            imageObserver.observe(lazyImage);
        });
    } else {
        // Fallback for browsers that don't support Intersection Observer
        loadAllImages();
    }
}

/**
 * Fallback function to load all images immediately
 */
function loadAllImages() {
    const lazyImages = document.querySelectorAll('img[data-src], source[data-srcset]');

    lazyImages.forEach(function(lazyImage) {
        if (lazyImage.dataset.src) {
            lazyImage.src = lazyImage.dataset.src;
            lazyImage.removeAttribute('data-src');
        }

        if (lazyImage.dataset.srcset) {
            lazyImage.srcset = lazyImage.dataset.srcset;
            lazyImage.removeAttribute('data-srcset');
        }

        lazyImage.classList.add('loaded');
    });
}

/**
 * Initialize responsive images - Modified to use static backgrounds on index page
 */
function initResponsiveImages() {
    // Find all elements with the responsive-bg class
    const responsiveBgs = document.querySelectorAll('.responsive-bg');

    // Set the appropriate background image based on screen size - only once at load
    function setResponsiveBackgrounds() {
        const width = window.innerWidth;

        responsiveBgs.forEach(function(element) {
            // Skip elements that already have a background image set in CSS
            if (element.classList.contains('hero') || element.classList.contains('rsvp-hero')) {
                // For hero sections, we're using the CSS background to avoid scrolling issues
                return;
            }

            let bgImage;

            // Choose the appropriate image based on screen width
            if (width <= 480) {
                bgImage = element.dataset.bgSmall;
            } else if (width <= 1024) {
                bgImage = element.dataset.bgMedium || element.dataset.bgSmall;
            } else {
                bgImage = element.dataset.bgLarge || element.dataset.bgMedium || element.dataset.bgSmall;
            }

            // Set the background image if available
            if (bgImage) {
                element.style.backgroundImage = `url('${bgImage}')`;
            }
        });
    }

    // Run only once on load - no resize listener to prevent scrolling issues
    setResponsiveBackgrounds();
}

/**
 * Add a blur-up effect to images
 * This should be called after images are loaded
 */
function addBlurUpEffect() {
    const blurUpImages = document.querySelectorAll('.blur-up');

    blurUpImages.forEach(function(image) {
        // Create a low-quality placeholder
        const placeholder = new Image();
        placeholder.src = image.dataset.placeholder;
        placeholder.classList.add('blur-up-placeholder');

        // Insert the placeholder before the image
        image.parentNode.insertBefore(placeholder, image);

        // Load the high-quality image
        const highQuality = new Image();
        highQuality.src = image.dataset.src;
        highQuality.classList.add('blur-up-high');

        // When the high-quality image is loaded, fade it in
        highQuality.onload = function() {
            image.parentNode.insertBefore(highQuality, image);

            // Add a class to start the transition
            setTimeout(function() {
                highQuality.classList.add('loaded');
                placeholder.classList.add('hidden');
            }, 100);

            // Remove the placeholder after transition
            setTimeout(function() {
                if (placeholder.parentNode) {
                    placeholder.parentNode.removeChild(placeholder);
                }
            }, 500);
        };

        // Remove the original image
        image.parentNode.removeChild(image);
    });
}

/**
 * Convert an image to WebP format if supported
 * This is a client-side check - ideally, WebP versions would be pre-generated on the server
 */
function checkWebPSupport() {
    const webpImages = document.querySelectorAll('img[data-webp]');

    // Check if browser supports WebP
    const webpSupported = document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');

    if (webpSupported) {
        webpImages.forEach(function(image) {
            // If WebP is supported, use the WebP version
            if (image.dataset.webp) {
                image.src = image.dataset.webp;
            }
        });
    }
}

// Run WebP check after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    checkWebPSupport();
});
