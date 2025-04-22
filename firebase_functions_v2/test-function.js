const { onRequest } = require('firebase-functions/v2/https');

/**
 * Simple test function to verify that v2 functions are working
 */
exports.testV2Function = onRequest({
  minInstances: 0,
  maxInstances: 1,
  memory: '256MiB',
  timeoutSeconds: 60,
  region: 'us-central1',
  cors: true // Enable CORS for all origins
}, async (req, res) => {
  // Set CORS headers manually for better browser compatibility
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Firebase Functions v2 is working!',
    timestamp: new Date().toISOString()
  });
});
