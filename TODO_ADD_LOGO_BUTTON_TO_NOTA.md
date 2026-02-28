# TODO - Add Logo Change Button to Receipt View

## Status: COMPLETED

## Problem
When viewing a receipt (nota), the user wants to be able to change the logo, but there's no button to change the logo in the receipt view.

## Solution
Added an "Edit Nota" button to the Receipt Modal in POS.jsx that:
1. Appears only for admin users
2. Navigates to Admin Dashboard with the Nota tab pre-selected via query parameter

## Completed Steps
- [x] 1. Add edit button to receipt modal in POS.jsx
- [x] 2. Make the edit functionality open the Admin Nota settings tab directly

## Files Modified
1. frontend/src/pages/POS/POS.jsx - Added "Edit Nota" button
2. frontend/src/pages/Admin/AdminDashboard.jsx - Added useSearchParams and query parameter handling

## Notes
- Feature "Logo Toko" already exists in Nota tab in Admin Dashboard
- Frontend has been rebuilt and deployed to backend/frontend-dist
