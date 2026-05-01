document.addEventListener("DOMContentLoaded", () => {
    // Scroll down button functionality
    const startJourneyBtn = document.getElementById('start-journey');
    startJourneyBtn.addEventListener('click', () => {
        const firstPhase = document.getElementById('phase-1');
        firstPhase.scrollIntoView({ behavior: 'smooth' });
    });

    // Intersection Observer for scroll animations (Scrollytelling)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.2 // Trigger when 20% of the element is visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Check if user prefers reduced motion
                const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                
                if (!prefersReducedMotion) {
                    entry.target.classList.remove('hidden');
                }
                // Once revealed, no need to observe again (optional)
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Select all elements to animate
    const hiddenElements = document.querySelectorAll('.hidden');
    
    // Ensure fallback for reduced motion immediately
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        hiddenElements.forEach(el => el.classList.remove('hidden'));
    } else {
        hiddenElements.forEach(el => observer.observe(el));
    }
    
    // Accessibility: make tooltips focusable via keyboard
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(tooltip => {
        tooltip.setAttribute('tabindex', '0');
        
        // Add ARIA attributes
        tooltip.setAttribute('aria-describedby', 'tooltip-content');
        
        // Ensure enter/space can toggle or show it (CSS handles hover/focus mainly, but good for robust a11y)
        tooltip.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                tooltip.focus();
            }
        });
    });
});
