# TODO - Hide Admin Button on Android

## Task: Hide Admin button in POS mode for Android app

### Steps:
- [x] 1. Analyze POS.jsx to find Admin button location
- [x] 2. Import Capacitor from @capacitor/core
- [x] 3. Add isAndroid detection function
- [x] 4. Modify Admin button condition to hide on Android

### File edited:
- frontend/src/pages/POS/POS.jsx

### Changes made:
1. Added import: `import { Capacitor } from '@capacitor/core';`
2. Added isAndroid detection function (IIFE) that checks:
   - Capacitor.getPlatform() === 'android'
   - Capacitor.isNativePlatform()
   - window.Capacitor
   - navigator.userAgent
3. Changed Admin button condition from `{isAdmin && ...}` to `{isAdmin && !isAndroid && ...}`


