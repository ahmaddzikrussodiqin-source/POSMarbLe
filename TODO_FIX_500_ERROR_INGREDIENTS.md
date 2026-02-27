# Fix 500 Error - Adding Stock (Ingredients)

## Task: Fix "server responded with a status of 500" error when adding stock (tambah bahan)

### Steps:
1. [x] Analyze codebase and understand the issue
2. [x] Fix reportController.js - Replace MySQL-specific date functions with SQLite-compatible alternatives
3. [x] Fix purchaseController.js - Replace MySQL-specific date functions with SQLite-compatible alternatives

### Issue Summary:
- Error occurs when pressing "Tambah Bahan" (Add Ingredient) and clicking Save
- Server returns 500 Internal Server Error
- Multiple endpoints also fail: orders, financial-summary, sales-summary, ingredients

### Root Cause Found:
The backend uses MySQL-specific SQL functions that don't work with SQLite:
- `DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)` - Not SQLite compatible
- `DATE_ADD(..., INTERVAL ? HOUR)` - Not SQLite compatible

### Changes Made:
1. **reportController.js**:
   - Replaced `DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)` with JavaScript date calculation
   - Replaced `DATE('now')` with JavaScript date string

2. **purchaseController.js**:
   - Replaced `DATE_ADD(..., INTERVAL ? HOUR)` with simple `DATE()` comparison
   - Removed parameter ( timezone_offsetsimplified for SQLite/MySQL compatibility)

