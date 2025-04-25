// Script to reset test users' RSVP status
// This will:
// 1. Update the guestList collection to mark them as not having responded
// 2. Delete their entries from the sheetRsvps collection

// Test users to reset
const testUsers = [
  "Jacob Barkin",
  "Hagen Zuzu Barkin",
  "Alton Barkin",
  "Jesse Strassburger"
];

// Use the Firebase config from the main app
// This script will be loaded after firebase-config.js which defines firebaseConfig

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Function to reset a user's RSVP status
async function resetUser(userName) {
  console.log(`Resetting RSVP status for: ${userName}`);

  try {
    // Step 1: Update guestList entry
    const guestListQuery = await db.collection('guestList')
      .where('name', '==', userName)
      .get();

    if (!guestListQuery.empty) {
      const guestDoc = guestListQuery.docs[0];
      console.log(`Found guest in guestList with ID: ${guestDoc.id}`);

      // Update the guest to mark as not having responded
      await guestDoc.ref.update({
        hasResponded: false,
        response: '',
        actualGuestCount: 0,
        adultCount: 0,
        childCount: 0,
        adultGuests: [],
        childGuests: [],
        additionalGuests: [],
        submittedAt: null
      });

      console.log(`Updated guestList entry for ${userName}`);
    } else {
      console.log(`No guestList entry found for ${userName}`);
    }

    // Step 2: Delete sheetRsvps entry
    const rsvpQuery = await db.collection('sheetRsvps')
      .where('name', '==', userName)
      .get();

    if (!rsvpQuery.empty) {
      const rsvpDoc = rsvpQuery.docs[0];
      console.log(`Found RSVP in sheetRsvps with ID: ${rsvpDoc.id}`);

      // Delete the RSVP entry
      await rsvpDoc.ref.delete();

      console.log(`Deleted sheetRsvps entry for ${userName}`);
    } else {
      console.log(`No sheetRsvps entry found for ${userName}`);
    }

    return `Successfully reset RSVP status for ${userName}`;
  } catch (error) {
    console.error(`Error resetting ${userName}:`, error);
    return `Error resetting ${userName}: ${error.message}`;
  }
}

// Process all test users
async function resetAllTestUsers() {
  const results = [];

  for (const user of testUsers) {
    const result = await resetUser(user);
    results.push(result);
  }

  // Display results
  console.log("Reset Results:");
  results.forEach(result => console.log(`- ${result}`));

  // Update the UI with results
  const resultsContainer = document.getElementById('results-container');
  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <h3>Reset Results:</h3>
      <ul>
        ${results.map(result => `<li>${result}</li>`).join('')}
      </ul>
      <p>You can now go back to the <a href="rsvp.html">RSVP page</a> and test with these users.</p>
    `;
    resultsContainer.classList.remove('hidden');
  }
}

// Add event listener to the reset button
document.addEventListener('DOMContentLoaded', function() {
  const resetButton = document.getElementById('reset-button');
  if (resetButton) {
    resetButton.addEventListener('click', resetAllTestUsers);
  }
});
