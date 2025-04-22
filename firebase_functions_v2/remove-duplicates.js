const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

/**
 * HTTP endpoint to identify and remove duplicate guests in the guestList collection
 */
exports.removeDuplicateGuestsV2 = onRequest({
  minInstances: 0,
  maxInstances: 1,
  memory: '256MiB',
  timeoutSeconds: 300,
  region: 'us-central1'
}, async (req, res) => {
  try {
    console.log('Starting duplicate guest removal process');

    // Get all guests from Firestore
    const db = admin.firestore();
    const guestListRef = db.collection('guestList');
    const snapshot = await guestListRef.get();

    if (snapshot.empty) {
      console.log('No guests found in the database');
      return res.status(200).json({
        success: true,
        message: 'No guests found in the database'
      });
    }

    console.log(`Found ${snapshot.size} guests in the database`);

    // Create a map to track guests by name
    const guestsByName = new Map();
    const duplicates = [];

    // First pass: identify duplicates
    snapshot.forEach(doc => {
      const guest = doc.data();
      const name = guest.name;

      if (!name) {
        console.log(`Guest with ID ${doc.id} has no name, skipping`);
        return;
      }

      if (!guestsByName.has(name)) {
        // First occurrence of this name
        guestsByName.set(name, {
          id: doc.id,
          data: guest,
          count: 1,
          docs: [doc.id]
        });
      } else {
        // Duplicate found
        const existing = guestsByName.get(name);
        existing.count++;
        existing.docs.push(doc.id);
        guestsByName.set(name, existing);

        // Add to duplicates list
        if (existing.count === 2) {
          duplicates.push(name);
        }
      }
    });

    console.log(`Found ${duplicates.length} guests with duplicates`);

    if (duplicates.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No duplicate guests found'
      });
    }

    // Second pass: remove duplicates
    let removedCount = 0;
    const batch = db.batch();
    const maxBatchSize = 500; // Firestore batch limit
    let currentBatchSize = 0;

    for (const name of duplicates) {
      const guest = guestsByName.get(name);
      console.log(`Processing duplicates for ${name}, found ${guest.count} entries`);

      // Keep the first document (oldest) and remove the rest
      // Sort by creation time if available, otherwise just keep the first one we found
      const docsToRemove = guest.docs.slice(1);

      for (const docId of docsToRemove) {
        batch.delete(guestListRef.doc(docId));
        removedCount++;
        currentBatchSize++;

        // If batch is full, commit it and start a new one
        if (currentBatchSize >= maxBatchSize) {
          console.log(`Committing batch of ${currentBatchSize} deletions`);
          await batch.commit();
          currentBatchSize = 0;
        }
      }
    }

    // Commit any remaining operations
    if (currentBatchSize > 0) {
      console.log(`Committing final batch of ${currentBatchSize} deletions`);
      await batch.commit();
    }

    console.log(`Successfully removed ${removedCount} duplicate guest entries`);

    return res.status(200).json({
      success: true,
      message: `Successfully removed ${removedCount} duplicate guest entries`,
      details: {
        totalGuests: snapshot.size,
        uniqueGuests: guestsByName.size,
        duplicatesFound: duplicates.length,
        entriesRemoved: removedCount
      }
    });

  } catch (error) {
    console.error('Error removing duplicate guests:', error);
    return res.status(500).json({
      success: false,
      message: `Error: ${error.message}`
    });
  }
});
