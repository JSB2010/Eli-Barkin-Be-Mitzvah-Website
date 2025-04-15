// RSVP Guest Search Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Debug functionality
    const debugButton = document.getElementById('debugButton');
    const debugOutput = document.getElementById('debugOutput');
    
    if (debugButton && debugOutput) {
        debugButton.addEventListener('click', async function() {
            debugOutput.style.display = 'block';
            debugOutput.textContent = 'Checking guestList collection...';
            
            try {
                // Check if Firebase is initialized
                if (typeof firebase === 'undefined') {
                    debugOutput.textContent = 'Error: Firebase SDK not found';
                    return;
                }
                
                // Get Firestore instance
                const db = firebase.firestore();
                
                // Get the guestList collection
                const snapshot = await db.collection('guestList').get();
                
                if (snapshot.empty) {
                    debugOutput.textContent = 'No documents found in guestList collection';
                    return;
                }
                
                let result = `Found ${snapshot.size} documents in guestList collection:\n\n`;
                
                // Show the first 5 documents
                let count = 0;
                snapshot.forEach(doc => {
                    if (count < 5) {
                        const data = doc.data();
                        result += `Document ID: ${doc.id}\n`;
                        result += `Name: ${data.name || 'N/A'}\n`;
                        result += `Email: ${data.email || 'N/A'}\n`;
                        result += `Phone: ${data.phone || 'N/A'}\n`;
                        result += `Has Responded: ${data.hasResponded ? 'Yes' : 'No'}\n`;
                        result += `\n----------------------------\n\n`;
                        count++;
                    }
                });
                
                if (snapshot.size > 5) {
                    result += `... and ${snapshot.size - 5} more documents`;
                }
                
                debugOutput.textContent = result;
            } catch (error) {
                debugOutput.textContent = `Error: ${error.message}`;
                console.error('Error checking guestList collection:', error);
            }
        });
    }

    // Get DOM elements
    const nameInput = document.getElementById('name');
    const autocompleteResults = document.getElementById('autocompleteResults');
    const additionalFields = document.getElementById('additionalFields');
    const submitButtonContainer = document.getElementById('submitButtonContainer');
    const guestFoundInfo = document.getElementById('guestFoundInfo');
    const guestCategoryElement = document.getElementById('guestCategory');
    const guestMaxCountElement = document.getElementById('guestMaxCount');
    const guestCountInput = document.getElementById('guestCount');

    // Variables to store selected guest data
    let selectedGuest = null;

    // Function to handle name input
    async function handleNameInput() {
        const searchTerm = nameInput.value.trim();
        
        // Clear previous results
        autocompleteResults.innerHTML = '';
        
        // Hide additional fields if search term is empty
        if (searchTerm.length < 2) {
            autocompleteResults.style.display = 'none';
            return;
        }
        
        try {
            // Search for guests
            const results = await searchGuests(searchTerm);
            
            if (results.length > 0) {
                // Display results
                results.forEach(guest => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'autocomplete-item';
                    resultItem.textContent = guest.name;
                    resultItem.addEventListener('click', () => selectGuest(guest));
                    autocompleteResults.appendChild(resultItem);
                });
                
                autocompleteResults.style.display = 'block';
            } else {
                autocompleteResults.style.display = 'none';
            }
        } catch (error) {
            console.error('Error searching guests:', error);
        }
    }

    // Function to select a guest
    function selectGuest(guest) {
        selectedGuest = guest;
        nameInput.value = guest.name;
        autocompleteResults.style.display = 'none';
        
        // Update guest info display
        guestCategoryElement.textContent = guest.category ? `Category: ${guest.category}` : '';
        guestMaxCountElement.textContent = `Maximum Guests: ${guest.maxAllowedGuests || 1}`;
        guestFoundInfo.style.display = 'block';
        
        // Set max value for guest count
        guestCountInput.max = guest.maxAllowedGuests || 1;
        
        // Show additional fields
        additionalFields.style.display = 'block';
        submitButtonContainer.style.display = 'block';
        
        // Pre-fill email and phone if available
        if (guest.email) document.getElementById('email').value = guest.email;
        if (guest.phone) document.getElementById('phone').value = guest.phone;
    }

    // Add event listeners
    if (nameInput) {
        nameInput.addEventListener('input', handleNameInput);
        nameInput.addEventListener('focus', handleNameInput);
    }

    // Handle form submission to update guest data
    const rsvpForm = document.getElementById('rsvpForm');
    if (rsvpForm) {
        rsvpForm.addEventListener('submit', async function(e) {
            // Don't prevent default here, as firebase-rsvp.js will handle that
            
            // If we have a selected guest, update their record
            if (selectedGuest && selectedGuest.id) {
                try {
                    const db = firebase.firestore();
                    const guestRef = db.collection('guestList').doc(selectedGuest.id);
                    
                    // Get form data
                    const attending = document.querySelector('input[name="attending"]:checked').value === 'yes';
                    const guestCount = parseInt(document.getElementById('guestCount').value) || 1;
                    const email = document.getElementById('email').value;
                    const phone = document.getElementById('phone').value;
                    
                    // Collect additional guest names
                    const additionalGuests = [];
                    if (guestCount > 1) {
                        for (let i = 2; i <= guestCount; i++) {
                            const guestNameField = document.getElementById(`guestName${i}`);
                            if (guestNameField) {
                                additionalGuests.push(guestNameField.value);
                            }
                        }
                    }
                    
                    // Update guest record
                    await guestRef.update({
                        hasResponded: true,
                        response: attending ? 'attending' : 'declined',
                        actualGuestCount: attending ? guestCount : 0,
                        additionalGuests: additionalGuests,
                        email: email,
                        phone: phone,
                        submittedAt: firebase.firestore.Timestamp.fromDate(new Date())
                    });
                    
                    console.log('Guest record updated successfully');
                } catch (error) {
                    console.error('Error updating guest record:', error);
                }
            }
        });
    }
});

// Function to search for guests in Firestore
async function searchGuests(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    try {
        const db = firebase.firestore();
        const guestListRef = db.collection('guestList');
        
        // Convert search term to lowercase for case-insensitive search
        const searchTermLower = searchTerm.toLowerCase();
        
        // Get all guests (we'll filter client-side)
        const snapshot = await guestListRef.get();
        
        if (snapshot.empty) {
            console.log('No guests found in database');
            return [];
        }
        
        // Filter guests whose names contain the search term
        const results = [];
        snapshot.forEach(doc => {
            const guest = doc.data();
            guest.id = doc.id; // Add document ID to the guest object
            
            if (guest.name && guest.name.toLowerCase().includes(searchTermLower)) {
                results.push(guest);
            }
        });
        
        return results;
    } catch (error) {
        console.error('Error searching guests:', error);
        return [];
    }
}
