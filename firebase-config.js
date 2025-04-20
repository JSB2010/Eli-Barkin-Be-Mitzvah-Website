// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBgAXectfPhAr3HqASJCewnfQJnGnfGAK8",
  authDomain: "eli-barkin-be-mitzvah.firebaseapp.com",
  projectId: "eli-barkin-be-mitzvah",
  storageBucket: "eli-barkin-be-mitzvah.firebasestorage.app",
  messagingSenderId: "1058445082947",
  appId: "1:1058445082947:web:8ab0696d5782e63ddaeff6",
  measurementId: "G-QQBCYHVB9C"
};

// Create a promise to track Firebase initialization
window.firebaseInitialized = new Promise((resolve, reject) => {
  // Check if Firebase is already loaded
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded. Make sure Firebase scripts are included before this file.');
    reject(new Error('Firebase SDK not loaded'));
    return;
  }

  // Initialize Firebase
  console.log('Initializing Firebase...');
  try {
    // Check if Firebase is already initialized
    if (firebase.apps && firebase.apps.length > 0) {
      console.log('Firebase already initialized, using existing app');
      resolve(firebase.apps[0]);
    } else {
      // Initialize new Firebase app
      const app = firebase.initializeApp(firebaseConfig);
      console.log('Firebase initialized successfully');
      resolve(app);
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    reject(error);
  }
});

// Get Firestore instance
console.log('Setting up Firestore...');
window.firestoreInitialized = window.firebaseInitialized.then(app => {
  console.log('Getting Firestore instance...');
  try {
    const db = firebase.firestore();
    console.log('Firestore instance created successfully');

    // Export the db for use in other files
    window.db = db;

    // Test Firestore connection
    console.log('Testing Firestore connection...');
    return db.collection('guestList').limit(1).get()
      .then(snapshot => {
        console.log('Firestore connection successful, found', snapshot.size, 'documents');
        return db;
      })
      .catch(error => {
        console.error('Error testing Firestore connection:', error);
        if (error.code === 'permission-denied') {
          console.error('Permission denied error. User may not be authenticated or lacks permissions.');
        }
        // Still return the db even if the test fails
        return db;
      });
  } catch (error) {
    console.error('Error creating Firestore instance:', error);
    throw error;
  }
}).catch(error => {
  console.error('Failed to initialize Firestore:', error);
  return null;
});

// Initialize Analytics if available
window.firebaseInitialized.then(app => {
  if (firebase.analytics) {
    try {
      const analytics = firebase.analytics();
      console.log('Firebase Analytics initialized');
      window.analytics = analytics;
      return analytics;
    } catch (error) {
      console.error('Error initializing Firebase Analytics:', error);
      return null;
    }
  }
  return null;
}).catch(error => {
  console.error('Failed to initialize Analytics:', error);
  return null;
});

// Provide a helper function to check if Firebase is ready
window.isFirebaseReady = function() {
  return window.db !== undefined && window.db !== null;
};

// Notify when Firebase is ready
window.firestoreInitialized.then(() => {
  console.log('Firebase and Firestore are fully initialized and ready to use');
  // Dispatch a custom event that other scripts can listen for
  document.dispatchEvent(new CustomEvent('firebase-ready'));
}).catch(error => {
  console.error('Firebase initialization failed:', error);
});

