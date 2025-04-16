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

// Function to log initialization steps
function logInitStep(message, error = null) {
  const timestamp = new Date().toISOString();
  if (error) {
    console.error(`[${timestamp}] ${message}`, error);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

// Initialize Firebase with robust error handling
try {
  // Check if Firebase SDK is loaded
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK is not loaded');
  }

  logInitStep('Firebase SDK is loaded');

  // Initialize Firebase app
  if (firebase.apps.length === 0) {
    logInitStep('Initializing Firebase app');
    firebase.initializeApp(firebaseConfig);
    logInitStep('Firebase app initialized successfully');
  } else {
    logInitStep('Firebase app already initialized');
  }

  // Initialize Firestore
  let db = null;
  try {
    if (typeof firebase.firestore === 'function') {
      logInitStep('Initializing Firestore');
      db = firebase.firestore();
      logInitStep('Firestore initialized successfully');
    } else {
      logInitStep('Firestore is not available');
    }
  } catch (firestoreError) {
    logInitStep('Error initializing Firestore', firestoreError);
  }

  // Initialize Analytics if available
  let analytics = null;
  try {
    if (typeof firebase.analytics === 'function') {
      logInitStep('Initializing Analytics');
      analytics = firebase.analytics();
      logInitStep('Analytics initialized successfully');
    } else {
      logInitStep('Analytics is not available');
    }
  } catch (analyticsError) {
    logInitStep('Error initializing Analytics', analyticsError);
  }

  // Export instances for use in other files
  window.db = db;
  window.analytics = analytics;

  // Log Firebase version if available
  if (firebase.SDK_VERSION) {
    logInitStep(`Firebase SDK version: ${firebase.SDK_VERSION}`);
  }

  logInitStep('Firebase initialization complete');
} catch (error) {
  logInitStep('Critical error initializing Firebase', error);

  // Display error message
  setTimeout(() => {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> Error initializing Firebase: ${error.message}. Please refresh the page and try again.`;
      errorMessage.style.display = 'block';
    } else {
      alert(`Error initializing Firebase: ${error.message}. Please refresh the page and try again.`);
    }
  }, 1000); // Small delay to ensure DOM is ready
}
