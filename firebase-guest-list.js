// Firebase Guest List Management
// This file handles the guest list collection in Firebase

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if Firebase is initialized
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not found. Make sure firebase-config.js is loaded first.');
        return;
    }

    // Reference to the guest list collection
    const guestListCollection = firebase.firestore().collection('guestList');

    // Export the collection reference for use in other files
    window.guestListCollection = guestListCollection;

    /**
     * Search for a guest by name
     * @param {string} name - The name to search for
     * @returns {Promise<Array>} - Array of matching guests
     */
    window.searchGuest = async function(name) {
        if (!name || name.trim().length < 2) {
            return [];
        }

        const searchName = name.trim().toLowerCase();
        
        try {
            // Search for guests where name contains the search term
            // Note: Firestore doesn't support native contains/substring queries
            // So we'll fetch all guests and filter client-side for now
            // For production with large lists, consider using a search service like Algolia
            const snapshot = await guestListCollection.get();
            
            const results = [];
            snapshot.forEach(doc => {
                const guest = doc.data();
                const guestName = (guest.name || '').toLowerCase();
                
                if (guestName.includes(searchName)) {
                    results.push({
                        id: doc.id,
                        ...guest
                    });
                }
            });
            
            return results;
        } catch (error) {
            console.error('Error searching for guest:', error);
            return [];
        }
    };

    /**
     * Update a guest's RSVP status
     * @param {string} guestId - The guest document ID
     * @param {Object} rsvpData - The RSVP data
     * @returns {Promise<boolean>} - Success status
     */
    window.updateGuestRsvp = async function(guestId, rsvpData) {
        try {
            await guestListCollection.doc(guestId).update({
                hasResponded: true,
                response: rsvpData.attending,
                actualGuestCount: rsvpData.guestCount,
                additionalGuests: rsvpData.additionalGuests || [],
                submittedAt: firebase.firestore.Timestamp.fromDate(new Date()),
                email: rsvpData.email,
                phone: rsvpData.phone
            });
            return true;
        } catch (error) {
            console.error('Error updating guest RSVP:', error);
            return false;
        }
    };

    /**
     * Get all guests with their RSVP status
     * @returns {Promise<Array>} - Array of all guests with RSVP status
     */
    window.getAllGuests = async function() {
        try {
            const snapshot = await guestListCollection.get();
            const guests = [];
            
            snapshot.forEach(doc => {
                guests.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return guests;
        } catch (error) {
            console.error('Error getting all guests:', error);
            return [];
        }
    };
});
