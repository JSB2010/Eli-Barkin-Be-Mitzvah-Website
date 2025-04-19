// Animation handler for optimized animations
document.addEventListener('DOMContentLoaded', function() {
    // Handle fade-in animations
    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(element => {
        // Use Intersection Observer to trigger animations when elements come into view
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // Unobserve after animation is triggered
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        observer.observe(element);
    });
    
    // Handle pulse animations
    function pulsateElements() {
        const elements = document.querySelectorAll('.pulse');
        elements.forEach(el => {
            el.style.opacity = '1';
            setTimeout(() => {
                el.style.opacity = '0.8';
            }, 1000);
        });
    }
    
    // Start pulse animation if elements exist
    const pulseElements = document.querySelectorAll('.pulse');
    if (pulseElements.length > 0) {
        pulsateElements();
        setInterval(pulsateElements, 2000);
    }
});
