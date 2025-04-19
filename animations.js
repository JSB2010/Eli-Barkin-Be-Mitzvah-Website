/**
 * Enhanced animations and visual effects for Eli's Be Mitzvah website
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS (Animate On Scroll)
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: false,
            mirror: true
        });
    }

    // Parallax effect for hero sections - DISABLED
    function parallaxScroll() {
        // Function disabled to improve performance and cross-device compatibility
        return;
    }

    // Page transitions completely disabled
    function addPageTransitions() {
        // Function completely disabled to prevent blue flash when navigating
        console.log('Page transitions disabled to prevent blue overlay');
        // No event listeners or transitions added
    }

    // Add subtle hover effects to buttons and cards
    function enhanceInteractiveElements() {
        // Add hover effect to buttons
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-3px)';
                this.style.boxShadow = '0 7px 14px rgba(0, 0, 0, 0.2)';
            });

            btn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '';
            });
        });

        // Add hover effect to cards
        const cards = document.querySelectorAll('.info-card, .sport-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px)';
                this.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.15)';
            });

            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '';
            });
        });
    }

    // Initialize all animation features
    function initAnimations() {
        // Add event listeners for parallax effect
        window.addEventListener('scroll', parallaxScroll);
        window.addEventListener('resize', parallaxScroll);

        // Initialize page transitions
        addPageTransitions();

        // Enhance interactive elements
        enhanceInteractiveElements();

        // Initial parallax calculation
        parallaxScroll();
    }

    // Run all animation initializations
    initAnimations();
});
