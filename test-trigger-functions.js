const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Create a test RSVP document
async function createTestRsvp() {
  try {
    // Create a test RSVP in the sheetRsvps collection
    const testRsvpRef = db.collection('sheetRsvps').doc('test-rsvp-' + Date.now());
    await testRsvpRef.set({
      name: 'Jesse Strassburger',
      email: 'test@example.com',
      phone: '555-123-4567',
      attending: 'yes',
      guestCount: 2,
      adultCount: 2,
      childCount: 0,
      adultGuests: ['Jesse Strassburger', 'Guest Strassburger'],
      childGuests: [],
      fridayDinner: 'yes',
      sundayBrunch: 'yes',
      submittedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Created test RSVP with ID: ${testRsvpRef.id}`);
    
    // Wait for 5 seconds to allow the trigger functions to execute
    console.log('Waiting for trigger functions to execute...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Update the test RSVP to trigger the update function
    await testRsvpRef.update({
      attending: 'no',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Updated test RSVP with ID: ${testRsvpRef.id}`);
    
    // Wait for 5 seconds to allow the trigger functions to execute
    console.log('Waiting for trigger functions to execute...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Delete the test RSVP
    await testRsvpRef.delete();
    
    console.log(`Deleted test RSVP with ID: ${testRsvpRef.id}`);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error creating test RSVP:', error);
  } finally {
    // Terminate the Firebase Admin app
    await admin.app().delete();
  }
}

// Run the test
createTestRsvp();
