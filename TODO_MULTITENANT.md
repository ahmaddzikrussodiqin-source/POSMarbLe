# TODO - Multi-Tenant Database Implementation

## Phase 1: Database Schema Update
- [x] 1.1 Modify database.js - Add user_id column to tables
  - categories table
  - products table
  - ingredients table
  - orders table
  - order_items table
  - purchases table
  - nota_settings table

## Phase 2: Authentication & Middleware
- [x] 2.1 Modify authController.js - Set user_id when user registers
- [x] 2.2 Modify middleware/auth.js - Pass user_id in request

## Phase 3: Controller Updates (Filter by user_id)
- [x] 3.1 categoryController.js - Add user_id to all queries
- [x] 3.2 productController.js - Add user_id to all queries
- [x] 3.3 orderController.js - Add user_id to all queries
- [x] 3.4 ingredientController.js - Add user_id to all queries
- [x] 3.5 purchaseController.js - Add user_id to all queries
- [x] 3.6 reportController.js - Add user_id to all queries
- [x] 3.7 notaController.js - Add user_id to all queries

## Phase 4: Route Updates
- [x] 4.1 products.js - Add authenticateToken to GET routes
- [x] 4.2 categories.js - Add authenticateToken to GET routes
- [x] 4.3 ingredients.js - Add authenticateToken to GET routes
- [x] 4.4 nota.js - Add authenticateToken to GET route

## IMPORTANT: Next Steps
- [ ] Delete existing SQLite database (backend/posmarble.db) - schema changed!
- [ ] Restart backend server
- [ ] Test registration - new user gets their own data
- [ ] Test login and data isolation

