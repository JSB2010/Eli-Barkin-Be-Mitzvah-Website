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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firestore instance
const db = firebase.firestore();

// Initialize Analytics if available
let analytics = null;
if (firebase.analytics) {
  analytics = firebase.analytics();
}

// Export the db for use in other files
window.db = db;
window.analytics = analytics;
