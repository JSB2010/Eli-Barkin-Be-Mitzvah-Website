// Initialize Firestore
let db;

// Wait for Firebase to initialize
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase if not already initialized
    if (typeof firebase !== 'undefined') {
        // Initialize Firestore
        db = firebase.firestore();
        console.log('Firestore initialized');
    } else {
        console.error('Firebase SDK not found');
    }
});

// Function to search for guests in Firestore
async function searchGuests(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    try {
        if (!db) {
            console.error('Firestore not initialized');
            return [];
        }
        
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

// Function to get a guest by ID
async function getGuestById(guestId) {
    if (!guestId) return null;
    
    try {
        if (!db) {
            console.error('Firestore not initialized');
            return null;
        }
        
        const guestDoc = await db.collection('guestList').doc(guestId).get();
        
        if (!guestDoc.exists) {
            console.log('No guest found with ID:', guestId);
            return null;
        }
        
        const guest = guestDoc.data();
        guest.id = guestDoc.id;
        return guest;
    } catch (error) {
        console.error('Error getting guest by ID:', error);
        return null;
    }
}

// Function to update a guest's RSVP status
async function updateGuestRsvp(guestId, rsvpData) {
    if (!guestId) return false;
    
    try {
        if (!db) {
            console.error('Firestore not initialized');
            return false;
        }
        
        await db.collection('guestList').doc(guestId).update({
            hasResponded: true,
            response: rsvpData.attending ? 'attending' : 'declined',
            actualGuestCount: rsvpData.attending ? rsvpData.guestCount : 0,
            additionalGuests: rsvpData.additionalGuests || [],
            email: rsvpData.email || '',
            phone: rsvpData.phone || '',
            submittedAt: firebase.firestore.Timestamp.fromDate(new Date())
        });
        
        return true;
    } catch (error) {
        console.error('Error updating guest RSVP:', error);
        return false;
    }
}
