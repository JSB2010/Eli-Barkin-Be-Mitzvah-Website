// RSVP Counter functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize counters for adult and child counts
    initializeCounter('adultCount', 0, 20); // Min 0, Max 20
    initializeCounter('childCount', 0, 20); // Min 0, Max 20
    
    // Function to initialize a counter with plus/minus buttons
    function initializeCounter(inputId, min, max) {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        // Create container to wrap the input
        const container = document.createElement('div');
        container.className = 'number-input-container';
        
        // Insert container before input
        input.parentNode.insertBefore(container, input);
        
        // Move input inside container
        container.appendChild(input);
        
        // Create minus button
        const minusButton = document.createElement('button');
        minusButton.type = 'button';
        minusButton.className = 'number-input-button minus';
        minusButton.innerHTML = '−'; // Using minus sign
        minusButton.setAttribute('aria-label', 'Decrease');
        
        // Create plus button
        const plusButton = document.createElement('button');
        plusButton.type = 'button';
        plusButton.className = 'number-input-button plus';
        plusButton.innerHTML = '+';
        plusButton.setAttribute('aria-label', 'Increase');
        
        // Add buttons to container
        container.insertBefore(minusButton, input);
        container.appendChild(plusButton);
        
        // Update button states based on current value
        function updateButtonStates() {
            const value = parseInt(input.value) || 0;
            minusButton.disabled = value <= min;
            plusButton.disabled = value >= max;
        }
        
        // Initialize button states
        updateButtonStates();
        
        // Add event listeners for buttons
        minusButton.addEventListener('click', function() {
            const currentValue = parseInt(input.value) || 0;
            if (currentValue > min) {
                input.value = currentValue - 1;
                updateButtonStates();
                // Trigger change event to update guest fields
                input.dispatchEvent(new Event('change'));
            }
        });
        
        plusButton.addEventListener('click', function() {
            const currentValue = parseInt(input.value) || 0;
            if (currentValue < max) {
                input.value = currentValue + 1;
                updateButtonStates();
                // Trigger change event to update guest fields
                input.dispatchEvent(new Event('change'));
            }
        });
        
        // Listen for manual input changes
        input.addEventListener('input', updateButtonStates);
        input.addEventListener('change', updateButtonStates);
    }
});
