const { onRequest } = require('firebase-functions/v2/https');

/**
 * Simple test function to verify that v2 functions are working
 */
exports.testV2Function = onRequest({
  minInstances: 0,
  maxInstances: 1,
  memory: '256MiB',
  timeoutSeconds: 60,
  region: 'us-central1'
}, async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Firebase Functions v2 is working!',
    timestamp: new Date().toISOString()
  });
});
