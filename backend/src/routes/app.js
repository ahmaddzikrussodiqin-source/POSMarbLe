const express = require('express');
const router = express.Router();

// App version configuration - update this when releasing new versions
const APP_VERSION = '1.00.0';
const APP_NAME = 'POSMarbLe';
const APP_BUILD_NUMBER = '1';
const UPDATE_URL = 'https://play.google.com/store/apps/details?id=id.posmarble.app';
const MIN_VERSION = '1.00.0'; // Minimum version required

// Get app version info
router.get('/version', (req, res) => {
  res.json({
    version: APP_VERSION,
    buildNumber: APP_BUILD_NUMBER,
    name: APP_NAME,
    updateUrl: UPDATE_URL,
    minVersion: MIN_VERSION,
    releaseNotes: 'Perbaikan bug dan peningkatan performa',
    forceUpdate: false,
  });
});

// Check if update is needed
router.post('/check-update', (req, res) => {
  const { currentVersion } = req.body;
  
  const currentParts = (currentVersion || '0.0.0').split('.').map(Number);
  const latestParts = APP_VERSION.split('.').map(Number);
  
  let needsUpdate = false;
  let forced = false;
  
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const current = currentParts[i] || 0;
    const latest = latestParts[i] || 0;
    
    if (current < latest) {
      needsUpdate = true;
      // Check if it's a major version that requires forced update
      if (i === 0) forced = true;
      break;
    }
    if (current > latest) {
      needsUpdate = false;
      break;
    }
  }
  
  // Check minimum version
  const minParts = MIN_VERSION.split('.').map(Number);
  for (let i = 0; i < minParts.length; i++) {
    const current = currentParts[i] || 0;
    if (current < minParts[i]) {
      needsUpdate = true;
      forced = true;
      break;
    }
  }
  
  res.json({
    needsUpdate,
    forced,
    latestVersion: APP_VERSION,
    updateUrl: UPDATE_URL,
    releaseNotes: 'Perbaikan bug dan peningkatan performa',
  });
});

module.exports = router;

