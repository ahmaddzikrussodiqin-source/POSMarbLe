const { query, saveDatabase } = require('../config/database');

const purchaseController = {
  // Generate purchase number
  generatePurchaseNumber: () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PRCH${year}${month}${day}${random}`;
  },

  // Create bulk purchase (multiple ingredients at once)
  createBulkPurchase: async (req, res) => {
    try {
      const { items, notes } = req.body;
      const userId = req.user.id;

      console.log('=== CREATE BULK PURCHASE START ===');
      console.log('Request body:', JSON.stringify({ items, notes }));
      console.log('User ID:', userId);

      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Purchase items are required' });
      }

      // Validate all items have required fields and belong to user
      for (const item of items) {
        console.log('Validating item:', item);
        if (!item.ingredient_id || !item.quantity || item.quantity <= 0 || !item.unit_price || item.unit_price <= 0) {
          console.log('Validation failed for item:', item);
          return res.status(400).json({ error: 'Each item must have ingredient_id, quantity ( > 0), and unit_price ( > 0)' });
        }
        
        // Verify ingredient belongs to user
        const [ingCheck] = await query(
          'SELECT id FROM ingredients WHERE id = ? AND user_id = ?',
          [item.ingredient_id, userId]
        );
        if (!ingCheck || ingCheck.length === 0) {
          return res.status(400).json({ error: `Ingredient not found or does not belong to user` });
        }
      }

      const createdPurchases = [];

      // Process each purchase item
      for (const item of items) {
        console.log('Processing purchase item:', item);
        
        // Get ingredient details
        const [ingredients] = await query(
          'SELECT * FROM ingredients WHERE id = ? AND user_id = ?',
          [item.ingredient_id, userId]
        );

        console.log('Found ingredients:', ingredients);

        if (!ingredients || ingredients.length === 0) {
          return res.status(404).json({ error: `Ingredient with ID ${item.ingredient_id} not found` });
        }

        const ingredient = ingredients[0];
        console.log('Current ingredient stock:', ingredient.stock, 'unit:', ingredient.unit);
        
        // unit_price is treated as total price for the quantity purchased
        const totalPrice = parseFloat(item.unit_price);
        const quantity = parseFloat(item.quantity);

        console.log('Parsed values - quantity:', quantity, 'totalPrice:', totalPrice);

        // Generate purchase number
        const purchaseNumber = purchaseController.generatePurchaseNumber();

        // Insert purchase record with user_id
        const [purchaseResult] = await query(
          `INSERT INTO purchases (user_id, purchase_number, ingredient_id, ingredient_name, quantity, unit, unit_price, total_price, created_by, notes) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            purchaseNumber,
            item.ingredient_id,
            ingredient.name,
            quantity,
            ingredient.unit,
            parseFloat(item.unit_price),
            totalPrice,
            userId,
            notes || null
          ]
        );

        console.log('Purchase insert result:', purchaseResult);

        // Update ingredient stock (add to existing stock)
        const currentStock = parseFloat(ingredient.stock) || 0;
        const newStock = currentStock + quantity;
        console.log('Updating stock - current:', currentStock, 'adding:', quantity, 'new:', newStock);
        
        try {
          const [updateResult] = await query(
            'UPDATE ingredients SET stock = ? WHERE id = ? AND user_id = ?',
            [newStock, item.ingredient_id, userId]
          );
          console.log('Stock update result:', updateResult);
          
          // Verify the update
          const [verifyStock] = await query(
            'SELECT stock FROM ingredients WHERE id = ? AND user_id = ?',
            [item.ingredient_id, userId]
          );
          console.log('Verified stock after update:', verifyStock);
        } catch (updateError) {
          console.error('Error updating stock:', updateError);
          throw updateError;
        }

        // Get the created purchase
        const [newPurchases] = await query(
          'SELECT * FROM purchases WHERE id = ? AND user_id = ?',
          [purchaseResult.insertId, userId]
        );

        if (newPurchases && newPurchases.length > 0) {
          createdPurchases.push(newPurchases[0]);
        }
      }

      // Save database after all purchases (for SQLite)
      saveDatabase();

      console.log('=== CREATE BULK PURCHASE SUCCESS ===');
      console.log('Created purchases count:', createdPurchases.length);

      res.status(201).json({
        message: `Successfully created ${createdPurchases.length} purchase(s)`,
        purchases: createdPurchases
      });
    } catch (error) {
      console.error('Create bulk purchase error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all purchases with filters
  getAll: async (req, res) => {
    try {
      const userId = req.user.id;
      const { start_date, end_date, ingredient_id, limit = 50, offset = 0 } = req.query;
      
      // Use simple DATE comparison - more compatible with both SQLite and MySQL
      console.log('Purchase filter received:', { start_date, end_date, ingredient_id });
      
      let sql = `
        SELECT p.*, u.name as created_by_name 
        FROM purchases p 
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.user_id = ?
      `;
      const params = [userId];

      // Use simple DATE comparison - more compatible with both SQLite and MySQL
      if (start_date && end_date) {
        sql += ' AND DATE(p.created_at) >= ? AND DATE(p.created_at) <= ?';
        params.push(start_date, end_date);
        console.log('Date range filter:', start_date, 'to', end_date);
      } else if (start_date) {
        sql += ' AND DATE(p.created_at) >= ?';
        params.push(start_date);
      } else if (end_date) {
        sql += ' AND DATE(p.created_at) <= ?';
        params.push(end_date);
      }

      if (ingredient_id) {
        sql += ' AND p.ingredient_id = ?';
        params.push(ingredient_id);
      }

      sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      console.log('Executing SQL:', sql);
      console.log('With params:', params);
      
      const [purchases] = await query(sql, params);
      
      console.log('Found purchases:', purchases.length);
      if (purchases.length > 0) {
        console.log('First purchase created_at:', purchases[0].created_at);
        console.log('Last purchase created_at:', purchases[purchases.length - 1].created_at);
      }

      // Get total count - use simple DATE comparison for SQLite/MySQL compatibility
      let countSql = `SELECT COUNT(*) as count FROM purchases p WHERE p.user_id = ?`;
      const countParams = [userId];
      
      if (start_date && end_date) {
        countSql += ' AND DATE(p.created_at) >= ? AND DATE(p.created_at) <= ?';
        countParams.push(start_date, end_date);
      } else if (start_date) {
        countSql += ' AND DATE(p.created_at) >= ?';
        countParams.push(start_date);
      } else if (end_date) {
        countSql += ' AND DATE(p.created_at) <= ?';
        countParams.push(end_date);
      }

      if (ingredient_id) {
        countSql += ' AND p.ingredient_id = ?';
        countParams.push(ingredient_id);
      }

      const [totalCount] = await query(countSql, countParams);

      res.json({
        purchases: purchases || [],
        total: totalCount[0]?.count || 0
      });
    } catch (error) {
      console.error('Get purchases error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get today's purchases
  getTodayPurchases: async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Format date in local timezone (not UTC) to match frontend
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      const [purchases] = await query(
        `SELECT p.*, u.name as created_by_name 
         FROM purchases p 
         LEFT JOIN users u ON p.created_by = u.id 
         WHERE DATE(p.created_at) = ? AND p.user_id = ?
         ORDER BY p.created_at DESC`,
        [todayStr, userId]
      );

      res.json(purchases || []);
    } catch (error) {
      console.error('Get today purchases error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get purchase by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const [purchases] = await query(
        `SELECT p.*, u.name as created_by_name 
         FROM purchases p 
         LEFT JOIN users u ON p.created_by = u.id 
         WHERE p.id = ? AND p.user_id = ?`,
        [id, userId]
      );

      if (!purchases || purchases.length === 0) {
        return res.status(404).json({ error: 'Purchase not found' });
      }

      res.json(purchases[0]);
    } catch (error) {
      console.error('Get purchase error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete purchase (and restore ingredient stock)
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const [existing] = await query('SELECT * FROM purchases WHERE id = ? AND user_id = ?', [id, userId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Purchase not found' });
      }

      const purchase = existing[0];

      // Restore ingredient stock
      const [ingredients] = await query('SELECT * FROM ingredients WHERE id = ? AND user_id = ?', [purchase.ingredient_id, userId]);
      if (ingredients && ingredients.length > 0) {
        const currentStock = ingredients[0].stock || 0;
        const newStock = Math.max(0, currentStock - purchase.quantity);
        await query(
          'UPDATE ingredients SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
          [newStock, purchase.ingredient_id, userId]
        );
      }

      // Delete purchase record
      await query('DELETE FROM purchases WHERE id = ? AND user_id = ?', [id, userId]);
      
      // Save database
      saveDatabase();

      res.json({ message: 'Purchase deleted successfully' });
    } catch (error) {
      console.error('Delete purchase error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = purchaseController;
