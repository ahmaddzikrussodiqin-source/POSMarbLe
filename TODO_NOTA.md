# Plan: Mengubah Tombol Menu menjadi Nota di Admin Sidebar

## Status: ✅ SELESAI

## Information Gathered

1. **AdminDashboard.jsx**: Contains sidebar with tabs including 'menu' (id: 'menu', label: 'Menu', icon: '📋')
2. Previously, clicking 'Menu' tab showed a modal with POS workflow information (showMenuModal)
3. No existing Nota-related functionality in the codebase - created from scratch
4. Created backend API endpoints for storing Nota settings

## Completed Steps

### Step 1: Create Backend Nota Controller ✅
- Created `backend/src/controllers/notaController.js`
- Handles CRUD operations for Nota settings (shop_name, address, phone, footer_text, etc.)
- Uses file-based storage (JSON) for simplicity

### Step 2: Create Backend Nota Routes ✅
- Created `backend/src/routes/nota.js`
- Defined API endpoints: GET /nota, PUT /nota, POST /nota/reset

### Step 3: Register Nota Routes ✅
- Updated `backend/src/routes/app.js` to include nota routes

### Step 4: Add Nota API to Frontend ✅
- Updated `frontend/src/services/api.js` to add notaAPI

### Step 5: Update Admin Dashboard ✅
- Changed sidebar tab from 'menu' to 'nota'
- Created Nota tab view with form to edit Nota settings:
  - Shop Name
  - Address
  - Phone Number
  - Footer Text
  - Show Logo toggle
  - Show QR Code toggle
  - Tax Rate
  - Currency
- Added live preview of the Nota
- Added Reset to Default button
- Removed old 'menu' modal functionality from Admin Dashboard

## Files Modified/Created

1. **Created**: `backend/src/controllers/notaController.js` (new)
2. **Created**: `backend/src/routes/nota.js` (new)
3. **Modified**: `backend/src/index.js` - added nota routes
4. **Modified**: `frontend/src/services/api.js` - added notaAPI
5. **Modified**: `frontend/src/pages/Admin/AdminDashboard.jsx` - added Nota tab

