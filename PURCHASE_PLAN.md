# Task Plan: Purchase Feature with Multiple Purchases and Report Tracking

## Information Gathered

### Current System Analysis:
1. **Orders System**: Complete - tracks sales with order_number, items, payment methods
2. **Ingredients System**: Has basic ingredient management with `purchaseStock` function that only adds quantity without tracking price or purchase history
3. **Reports**: Currently only tracks sales (money in), no purchase (money out) tracking
4. **Admin Dashboard**: Has a "Pembelian" tab that allows single ingredient purchase at a time, no bulk purchase, no price tracking

### Database Tables:
- `users`, `categories`, `products`, `ingredients`, `product_ingredients` - exist
- `orders`, `order_items` - exist
- **Missing**: `purchases` table to track purchase history with prices

### Key Files to Modify:
- `backend/src/config/database.js` - Add purchases table
- `backend/src/controllers/purchaseController.js` - New file for purchase logic
- `backend/src/routes/purchases.js` - New file for purchase routes
- `backend/src/controllers/reportController.js` - Add purchase tracking
- `frontend/src/services/api.js` - Add purchase API endpoints
- `frontend/src/pages/Admin/AdminDashboard.jsx` - Add bulk purchase UI

## Plan

### Phase 1: Backend - Database & Purchase Controller

1. **Add purchases table to database.js**:
   - Add table: `purchases` with fields:
     - id, purchase_number, ingredient_id, ingredient_name
     - quantity, unit_price, total_price
     - created_by, created_at

2. **Create purchaseController.js**:
   - `generatePurchaseNumber()` - Generate PRCH-YYMMDD-XXXX format
   - `createBulkPurchase()` - Handle multiple ingredients purchase at once
   - `getAllPurchases()` - Get purchase history with filters
   - `getTodayPurchases()` - Get today's purchases

3. **Create purchases.js routes**:
   - POST /purchases (bulk create)
   - GET /purchases (list with filters)
   - GET /purchases/today (today's purchases)

### Phase 2: Backend - Report Controller Updates

4. **Update reportController.js**:
   - Add `getPurchaseSummary()` - Total purchases (money out)
   - Update `getSalesSummary()` to include purchase data
   - Add `getFinancialSummary()` - Money in (sales), Money out (purchases), Profit

### Phase 3: Frontend - API & UI Updates

5. **Update frontend/src/services/api.js**:
   - Add `purchasesAPI` with:
     - createBulkPurchase(data)
     - getAll(params)
     - getToday()

6. **Update AdminDashboard.jsx**:
   - Create new "Pembelian" tab UI with bulk purchase form
   - Add ability to select multiple ingredients, quantity, and unit price
   - Add purchase history table showing all purchases with prices
   - Update dashboard to show money in (sales) and money out (purchases)
   - Update reports to display both income and expenses

### Phase 4: Testing & Integration

7. **Test the complete flow**:
   - Create bulk purchase with multiple ingredients and prices
   - Verify ingredient stock is updated correctly
   - Verify purchase history is recorded with prices
   - Verify reports show both sales and purchases

## Dependent Files to Edit

1. backend/src/config/database.js
2. backend/src/controllers/purchaseController.js (new)
3. backend/src/routes/purchases.js (new)
4. backend/src/controllers/reportController.js
5. backend/src/index.js (register new route)
6. frontend/src/services/api.js
7. frontend/src/pages/Admin/AdminDashboard.jsx

## Followup Steps

After implementation:
1. Test bulk purchase functionality
2. Verify purchase price is saved correctly
3. Check that reports show money in (sales) and money out (purchases)
4. Ensure ingredient stock is properly updated

