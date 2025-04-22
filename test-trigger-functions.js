const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Test data for a regular RSVP
const testRsvpData = {
  name: 'Jesse Strassburger',
  email: 'test@example.com',
  phone: '555-123-4567',
  attending: 'yes',
  guestCount: 2,
  adultGuests: ['Jesse Strassburger', 'Guest Two'],
  childGuests: [],
  additionalGuests: ['Guest Two'],
  state: 'CO',
  isOutOfTown: false,
  submittedAt: admin.firestore.FieldValue.serverTimestamp()
};

// Test data for an out-of-town RSVP
const testOutOfTownRsvpData = {
  name: 'Jesse Strassburger',
  email: 'outoftown@example.com',
  phone: '555-987-6543',
  attending: 'yes',
  guestCount: 2,
  adultGuests: ['Jesse Strassburger', 'Guest Two'],
  childGuests: [],
  additionalGuests: ['Guest Two'],
  state: 'NY',
  isOutOfTown: true,
  fridayDinner: 'yes',
  sundayBrunch: 'yes',
  submittedAt: admin.firestore.FieldValue.serverTimestamp()
};

// Function to create a test RSVP
async function createTestRsvp() {
  try {
    // Create a test RSVP in the sheetRsvps collection
    const testRsvpRef = db.collection('sheetRsvps').doc('test-rsvp-' + Date.now());
    await testRsvpRef.set(testRsvpData);

    console.log(`Created test RSVP with ID: ${testRsvpRef.id}`);
    return testRsvpRef;
  } catch (error) {
    console.error('Error creating test RSVP:', error);
    throw error;
  }
}

// Function to create a test out-of-town RSVP
async function createTestOutOfTownRsvp() {
  try {
    const testRsvpRef = db.collection('sheetRsvps').doc('test-outoftown-' + Date.now());
    await testRsvpRef.set(testOutOfTownRsvpData);

    console.log(`Created test out-of-town RSVP with ID: ${testRsvpRef.id}`);
    return testRsvpRef;
  } catch (error) {
    console.error('Error creating test out-of-town RSVP:', error);
    throw error;
  }
}

// Function to update a test RSVP
async function updateTestRsvp(testRsvpRef) {
  try {
    await testRsvpRef.update({
      guestCount: 3,
      additionalGuests: ['Guest Two', 'Guest Three'],
      adultGuests: ['Jesse Strassburger', 'Guest Two', 'Guest Three'],
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Updated test RSVP with ID: ${testRsvpRef.id}`);
  } catch (error) {
    console.error('Error updating test RSVP:', error);
    throw error;
  }
}

// Function to update a test out-of-town RSVP
async function updateTestOutOfTownRsvp(testRsvpRef) {
  try {
    await testRsvpRef.update({
      fridayDinner: 'no',
      sundayBrunch: 'yes',
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Updated test out-of-town RSVP with ID: ${testRsvpRef.id}`);
  } catch (error) {
    console.error('Error updating test out-of-town RSVP:', error);
    throw error;
  }
}

// Function to delete a test RSVP
async function deleteTestRsvp(testRsvpRef) {
  try {
    await testRsvpRef.delete();
    console.log(`Deleted test RSVP with ID: ${testRsvpRef.id}`);
  } catch (error) {
    console.error('Error deleting test RSVP:', error);
    throw error;
  }
}

// Main function to run the tests
async function runTests() {
  try {
    // Test regular RSVP flow
    console.log('Testing regular RSVP flow...');
    const rsvpRef = await createTestRsvp();

    // Wait for functions to trigger
    console.log('Waiting for functions to trigger...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Update the RSVP
    await updateTestRsvp(rsvpRef);

    // Wait for functions to trigger
    console.log('Waiting for functions to trigger...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete the RSVP
    await deleteTestRsvp(rsvpRef);

    // Test out-of-town RSVP flow
    console.log('\nTesting out-of-town RSVP flow...');
    const outOfTownRsvpRef = await createTestOutOfTownRsvp();

    // Wait for functions to trigger
    console.log('Waiting for functions to trigger...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Update the out-of-town RSVP
    await updateTestOutOfTownRsvp(outOfTownRsvpRef);

    // Wait for functions to trigger
    console.log('Waiting for functions to trigger...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete the out-of-town RSVP
    await deleteTestRsvp(outOfTownRsvpRef);

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error running tests:', error);
  } finally {
    // Terminate the Firebase Admin app
    await admin.app().delete();
    process.exit(0);
  }
}

// Run the tests
runTests();
