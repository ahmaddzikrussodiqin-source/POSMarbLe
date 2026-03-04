# Printer Selection Feature Plan

## Information Gathered

### Current Implementation Analysis:
1. **Current Printing Method**: The app uses `window.print()` which opens a browser print dialog - works for thermal printers connected via USB/Network
2. **Platform**: React web app wrapped in Capacitor for Android
3. **Current Header**: Located in POS.jsx, shows logo "POSMarbLe" and "Point of Sale" text on the left
4. **Tech Stack**: React + Capacitor + Vite + TailwindCSS

### Key Observations:
- No existing printer functionality in the codebase
- The app uses browser-based printing which requires manual printer selection each time
- For Android thermal printers (like Bluetooth ESC/POS printers), we need native Bluetooth integration

## Plan

### Step 1: Update Header with Printer Button
- Add a printer icon button in the header section (left side, next to POSMarbLe logo)
- Display current selected printer name or "Pilih Printer" if none selected
- Show a dropdown/modal to select printer

### Step 2: Implement Printer Selection Modal
- Create a modal that shows:
  - Option to use browser print (default)
  - List of detected Bluetooth printers (using Web Bluetooth API)
  - Option to remember printer selection

### Step 3: Implement Web Bluetooth Printer Connection
- Use Web Bluetooth API to scan for nearby Bluetooth devices
- Filter for devices that support Serial Port Profile (SPP) or BLE
- Connect and send ESC/POS commands to selected printer

### Step 4: Save Printer Preference
- Store selected printer info in localStorage
- Auto-load saved printer on app start

### Step 5: Modify Print Functions
- Update `handlePrint` and `handlePrintAllTodaySales` functions
- Send to selected Bluetooth printer if connected, otherwise use browser print

## Files to Modify

1. `frontend/src/pages/POS/POS.jsx` - Add printer selection UI and logic
2. `frontend/src/services/printerService.js` - New file for Bluetooth printer service
3. `frontend/package.json` - Add any required dependencies

## Implementation Details

### Web Bluetooth API Approach:
- Use navigator.bluetooth.requestDevice() to scan for printers
- Connect via GATT server
- Send ESC/POS commands via Bluetooth characteristic

### ESC/POS Commands for Thermal Printers:
- Initialize printer: ESC @ 
- Bold on: ESC E 1
- Bold off: ESC E 0
- Center align: ESC a 1
- Left align: ESC a 0
- Cut paper: GS V 66 0

## Follow-up Steps

1. Install any required dependencies
2. Test on Android device with Bluetooth thermal printer
3. Build new APK with updated code

