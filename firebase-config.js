// Firebase configuration
// Note: This API key is restricted to this domain and specific Firebase services
// It can only be used for Firebase Authentication and Firestore from approved domains
// This is safe to include in client-side code as it has proper security rules and restrictions
const firebaseConfig = {
  apiKey: "AIzaSyBgAXectfPhAr3HqASJCewnfQJnGnfGAK8",
  authDomain: "eli-barkin-be-mitzvah.firebaseapp.com",
  projectId: "eli-barkin-be-mitzvah",
  storageBucket: "eli-barkin-be-mitzvah.firebasestorage.app",
  messagingSenderId: "1058445082947",
  appId: "1:1058445082947:web:8ab0696d5782e63ddaeff6",
  measurementId: "G-QQBCYHVB9C"
};

/**
 * Improved Firebase initialization that works reliably across all browsers
 * This uses a hybrid approach with both synchronous and asynchronous initialization
 */

// Global state to track initialization
window.firebaseState = {
  initialized: false,
  initializing: false,
  error: null
};

// Detect browser type for browser-specific handling
const isChromium = !!window.chrome;
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
console.log(`Firebase config - Browser detection: Chrome/Chromium: ${isChromium}, Safari: ${isSafari}`);

// Synchronous initialization - always try this first
function initializeFirebaseSync() {
  if (window.firebaseState.initialized || window.firebaseState.initializing) return true;

  console.log('Attempting synchronous Firebase initialization');
  window.firebaseState.initializing = true;

  try {
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK not loaded');
      window.firebaseState.initializing = false;
      return false;
    }

    // Initialize Firebase if not already initialized
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
      console.log('Firebase initialized synchronously');
    } else {
      console.log('Firebase already initialized');
    }

    // Initialize Firestore with special handling for Chrome
    if (!window.db && typeof firebase.firestore === 'function') {
      window.db = firebase.firestore();

      // For Chrome, we need to ensure settings are applied correctly
      if (isChromium && !isSafari) {
        try {
          // Apply settings that work better in Chrome
          window.db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            ignoreUndefinedProperties: true
          });
          console.log('Applied Chrome-specific Firestore settings');
        } catch (settingsError) {
          console.warn('Could not apply Chrome-specific settings:', settingsError);
        }
      }

      console.log('Firestore initialized synchronously');
    }

    // Initialize Analytics if available
    if (!window.analytics && firebase.analytics) {
      window.analytics = firebase.analytics();
      console.log('Analytics initialized synchronously');
    }

    window.firebaseState.initialized = true;
    window.firebaseState.initializing = false;

    // Dispatch event for other scripts
    document.dispatchEvent(new CustomEvent('firebase-ready'));

    return true;
  } catch (error) {
    console.error('Error in synchronous Firebase initialization:', error);
    window.firebaseState.error = error;
    window.firebaseState.initializing = false;
    return false;
  }
}

// Asynchronous initialization - use this as a backup
function initializeFirebaseAsync() {
  if (window.firebaseState.initialized) return Promise.resolve(window.db);
  if (window.firebaseState.initializing) {
    console.log('Firebase initialization already in progress');
    return new Promise((resolve) => {
      document.addEventListener('firebase-ready', () => resolve(window.db), { once: true });
    });
  }

  console.log('Starting asynchronous Firebase initialization');
  window.firebaseState.initializing = true;

  return new Promise((resolve, reject) => {
    try {
      // Check if Firebase is available
      if (typeof firebase === 'undefined') {
        const error = new Error('Firebase SDK not loaded');
        window.firebaseState.error = error;
        window.firebaseState.initializing = false;
        reject(error);
        return;
      }

      // Initialize Firebase if not already initialized
      if (!firebase.apps || firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized asynchronously');
      } else {
        console.log('Using existing Firebase app');
      }

      // Initialize Firestore with special handling for Chrome
      if (!window.db) {
        window.db = firebase.firestore();

        // For Chrome, we need to ensure settings are applied correctly
        if (isChromium && !isSafari) {
          try {
            // Apply settings that work better in Chrome
            window.db.settings({
              cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
              ignoreUndefinedProperties: true
            });
            console.log('Applied Chrome-specific Firestore settings (async)');
          } catch (settingsError) {
            console.warn('Could not apply Chrome-specific settings (async):', settingsError);
          }
        }

        console.log('Firestore initialized asynchronously');
      }

      // Initialize Analytics if available
      if (firebase.analytics && !window.analytics) {
        window.analytics = firebase.analytics();
        console.log('Analytics initialized asynchronously');
      }

      // For Chrome, we'll skip the connection test as it can cause issues
      if (isChromium && !isSafari) {
        console.log('Skipping connection test for Chrome');
        window.firebaseState.initialized = true;
        window.firebaseState.initializing = false;

        // Dispatch event for other scripts
        document.dispatchEvent(new CustomEvent('firebase-ready'));

        resolve(window.db);
      } else {
        // Test Firestore connection for non-Chrome browsers
        window.db.collection('guestList').limit(1).get()
          .then(() => {
            console.log('Firestore connection test successful');
            window.firebaseState.initialized = true;
            window.firebaseState.initializing = false;

            // Dispatch event for other scripts
            document.dispatchEvent(new CustomEvent('firebase-ready'));

            resolve(window.db);
          })
          .catch(error => {
            console.error('Error testing Firestore connection:', error);
            // Still consider Firebase initialized even if the test fails
            window.firebaseState.initialized = true;
            window.firebaseState.initializing = false;

            // Dispatch event for other scripts
            document.dispatchEvent(new CustomEvent('firebase-ready'));

            resolve(window.db);
          });
      }
    } catch (error) {
      console.error('Error in asynchronous Firebase initialization:', error);
      window.firebaseState.error = error;
      window.firebaseState.initializing = false;
      reject(new Error('Firebase initialization failed: ' + (error.message || 'Unknown error')));
    }
  });
}

// Helper function to check if Firebase is ready
window.isFirebaseReady = function() {
  return window.firebaseState.initialized && window.db !== undefined;
};

// Helper function to wait for Firebase to be ready
window.waitForFirebase = function() {
  if (window.firebaseState.initialized) {
    return Promise.resolve(window.db);
  }

  return new Promise((resolve) => {
    document.addEventListener('firebase-ready', () => resolve(window.db), { once: true });

    // Also set a timeout to prevent infinite waiting
    setTimeout(() => {
      if (!window.firebaseState.initialized) {
        console.log('Firebase initialization timeout, forcing initialization');
        initializeFirebaseSync();
        resolve(window.db);
      }
    }, 5000);
  });
};

// For backward compatibility
window.firebaseInitialized = Promise.resolve();
window.firestoreInitialized = Promise.resolve(window.db);

// Try synchronous initialization first
const syncInitSuccessful = initializeFirebaseSync();

// If synchronous init failed, try asynchronous initialization
if (!syncInitSuccessful) {
  console.log('Synchronous initialization unsuccessful, falling back to asynchronous');
  initializeFirebaseAsync().catch(error => {
    console.error('Both synchronous and asynchronous initialization failed:', error);
  });
}

// Add a final safety check that runs after a delay
setTimeout(() => {
  if (!window.firebaseState.initialized) {
    console.log('Firebase not initialized after timeout, forcing initialization');
    initializeFirebaseSync();

    // If still not initialized, try one more time with a direct approach
    if (!window.firebaseState.initialized && typeof firebase !== 'undefined') {
      console.log('Final attempt to initialize Firebase');
      try {
        // Direct initialization without any fancy logic
        if (!firebase.apps || firebase.apps.length === 0) {
          firebase.initializeApp(firebaseConfig);
        }

        if (!window.db) {
          window.db = firebase.firestore();
        }

        window.firebaseState.initialized = true;
        document.dispatchEvent(new CustomEvent('firebase-ready'));
        console.log('Final initialization attempt completed');
      } catch (error) {
        console.error('Final initialization attempt failed:', error);
      }
    }
  }
}, 2000);

// Add an extra safety check specifically for Chrome
if (isChromium && !isSafari) {
  setTimeout(() => {
    console.log('Chrome-specific safety check running');
    if (!window.db && typeof firebase !== 'undefined') {
      try {
        window.db = firebase.firestore();
        window.firebaseState.initialized = true;
        document.dispatchEvent(new CustomEvent('firebase-ready'));
        console.log('Chrome safety check: Firestore initialized');
      } catch (error) {
        console.error('Chrome safety check failed:', error);
      }
    }
  }, 3000);
}
