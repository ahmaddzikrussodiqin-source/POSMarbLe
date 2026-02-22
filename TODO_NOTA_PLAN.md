# Plan: Menyesuaikan Tampilan Nota POS dengan Nota Management

## Task Understanding
User wants the receipt (nota) displayed in POS (Kasir) when clicking "Bayar Sekarang" to match the receipt configuration from the Admin ManagementNota settings.

## Information Gathered

### 1. Current POS Receipt (POS.jsx - lines 447-530)
- Hardcoded receipt modal showing:
  - Success header with gradient background
  - Order number
  - Items list with quantities and prices
  - Subtotal (showing only total_amount)
  - Tax: "Rp 0" (hardcoded as 0%)
  - Total amount
  - Payment method
  - Footer: "POSMarbLe" and "Harapan terbaik untuk hari Anda!" (hardcoded)

### 2. Admin Nota Settings (AdminDashboard.jsx - lines 580-700)
- Configurable nota settings:
  - shop_name: 'POSMarbLe' (default)
  - address: ''
  - phone: ''
  - footer_text: 'Terima kasih telah belanja di toko kami!'
  - show_logo: true
  - show_qr_code: false
  - tax_rate: 0
  - currency: 'IDR'

### 3. Backend notaController.js
- Endpoints: GET /nota, PUT /nota, POST /nota/reset
- Storage: JSON file at backend/data/nota.json
- Frontend API already has notaAPI ready to use

## Plan

### Step 1: Fetch Nota Settings in POS
- Add state for notaSettings in POS.jsx
- Load nota settings on component mount using notaAPI.get()
- Add notaAPI to the imports

### Step 2: Modify Receipt Modal to Use Nota Settings
- Replace hardcoded values with notaSettings values:
  - Shop name (instead of hardcoded "POSMarbLe")
  - Address and phone (if configured)
  - Footer text (instead of hardcoded "Harapan terbaik untuk hari Anda!")
  - Show/hide logo based on settings
  - Show/hide QR code based on settings
  - Calculate and display tax based on tax_rate setting

### Step 3: Format Currency Based on Settings
- Use currency setting from notaSettings
- Format currency accordingly (IDR, USD, etc.)

## Files to Modify
1. **frontend/src/pages/POS/POS.jsx**
   - Import notaAPI from services/api
   - Add notaSettings state
   - Fetch nota settings on mount
   - Modify receipt modal to use settings

## Dependent Files
- None (all required files already exist)

## Follow-up Steps
- Test the changes by:
  1. Going to Admin > Nota tab and modifying settings
  2. Making a purchase in POS
  3. Verifying the receipt matches the configured settings

