const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin with application default credentials
try {
  admin.initializeApp({
    projectId: 'eli-barkin-be-mitzvah'
  });
  console.log('Initialized Firebase Admin with project ID');
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  process.exit(1);
}

// Create a service account key file
async function createServiceAccountKey() {
  try {
    // Get the project ID
    const projectId = admin.app().options.projectId;
    console.log(`Project ID: ${projectId}`);
    
    // Create a temporary service account for testing
    const serviceAccount = {
      type: 'service_account',
      project_id: projectId,
      private_key_id: 'test-key-id',
      private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1GB4t7NXp98C3SC6dVMvDuictGeurT8jNbvJZHtCSuYEvu\nNMoSfm76oqFvAp8Gy0iz5sxjZmSnXyCdPEovGhLa0VzMaQ8s+CLOyS56YyCFGeJZ\n-----END PRIVATE KEY-----\n',
      client_email: `firebase-adminsdk-test@${projectId}.iam.gserviceaccount.com`,
      client_id: '123456789',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-test%40${projectId}.iam.gserviceaccount.com`,
      universe_domain: 'googleapis.com'
    };
    
    // Write the service account key to a file
    fs.writeFileSync('serviceAccountKey.json', JSON.stringify(serviceAccount, null, 2));
    console.log('Service account key file created successfully');
  } catch (error) {
    console.error('Error creating service account key:', error);
  } finally {
    // Clean up
    await admin.app().delete();
  }
}

createServiceAccountKey();
