// Version configuration for POSMarbLe App
// This file contains version-related constants used throughout the app

export const APP_VERSION = '1.00.0';
export const APP_NAME = 'POSMarbLe';
export const APP_BUILD_NUMBER = '1';

// Version comparison helper
export const compareVersions = (current, latest) => {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;
    
    if (currentPart < latestPart) return -1; // Update available
    if (currentPart > latestPart) return 1;  // Current is newer
  }
  
  return 0; // Same version
};

export default {
  APP_VERSION,
  APP_NAME,
  APP_BUILD_NUMBER,
  compareVersions,
};

