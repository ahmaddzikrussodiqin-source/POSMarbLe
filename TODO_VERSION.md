# TODO: Version Display and Update Notification

## Plan:
1. Update frontend/package.json version to 1.00.0
2. Create version config file at frontend/src/config/version.js
3. Add app version API endpoint in backend (backend/src/routes/app.js)
4. Create VersionBadge component (displays version in bottom right)
5. Create UpdateNotification component (checks and notifies about updates)
6. Add appVersionAPI to frontend/src/services/api.js
7. Update App.jsx to integrate components with Capacitor detection
8. Register new backend route in index.js

## Status: COMPLETED ✅
- [x] Update frontend/package.json version to 1.00.0
- [x] Create frontend/src/config/version.js
- [x] Create backend/src/routes/app.js with version endpoint
- [x] Update backend/src/index.js to register app routes
- [x] Create frontend/src/components/VersionBadge.jsx
- [x] Create frontend/src/components/UpdateNotification.jsx
- [x] Update frontend/src/services/api.js with appVersionAPI
- [x] Update frontend/src/App.jsx to integrate components
- [x] Add @capacitor/core to dependencies (moved from devDependencies)

