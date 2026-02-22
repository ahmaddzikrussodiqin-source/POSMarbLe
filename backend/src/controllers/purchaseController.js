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

      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Purchase items are required' });
      }

      // Validate all items have required fields
      for (const item of items) {
        if (!item.ingredient_id || !item.quantity || item.quantity <= 0 || !item.unit_price || item.unit_price <= 0) {
          return res.status(400).json({ error: 'Each item must have ingredient_id, quantity ( > 0), and unit_price ( > 0)' });
        }
      }

      const createdPurchases = [];

      // Process each purchase item
      for (const item of items) {
        // Get ingredient details
        const [ingredients] = await query(
          'SELECT * FROM ingredients WHERE id = ?',
          [item.ingredient_id]
        );

        if (!ingredients || ingredients.length === 0) {
          return res.status(404).json({ error: `Ingredient with ID ${item.ingredient_id} not found` });
        }

        const ingredient = ingredients[0];
        // unit_price is treated as total price for the quantity purchased
        const totalPrice = parseFloat(item.unit_price);

        // Generate purchase number
        const purchaseNumber = purchaseController.generatePurchaseNumber();

        // Insert purchase record
        const [purchaseResult] = await query(
          `INSERT INTO purchases (purchase_number, ingredient_id, ingredient_name, quantity, unit, unit_price, total_price, created_by, notes) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            purchaseNumber,
            item.ingredient_id,
            ingredient.name,
            parseFloat(item.quantity),
            ingredient.unit,
            parseFloat(item.unit_price),
            totalPrice,
            userId,
            notes || null
          ]
        );

        // Update ingredient stock (add to existing stock)
        const newStock = (ingredient.stock || 0) + parseFloat(item.quantity);
        await query(
          'UPDATE ingredients SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newStock, item.ingredient_id]
        );

        // Get the created purchase
        const [newPurchases] = await query(
          'SELECT * FROM purchases WHERE id = ?',
          [purchaseResult.insertId]
        );

        if (newPurchases && newPurchases.length > 0) {
          createdPurchases.push(newPurchases[0]);
        }
      }

      // Save database after all purchases
      saveDatabase();

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
      const { start_date, end_date, ingredient_id, limit = 50, offset = 0 } = req.query;
      
      let sql = `
        SELECT p.*, u.name as created_by_name 
        FROM purchases p 
        LEFT JOIN users u ON p.created_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (start_date && end_date) {
        sql += ' AND DATE(p.created_at) >= DATE(?) AND DATE(p.created_at) <= DATE(?)';
        params.push(start_date, end_date);
      } else if (start_date) {
        sql += ' AND DATE(p.created_at) >= DATE(?)';
        params.push(start_date);
      } else if (end_date) {
        sql += ' AND DATE(p.created_at) <= DATE(?)';
        params.push(end_date);
      }

      if (ingredient_id) {
        sql += ' AND p.ingredient_id = ?';
        params.push(ingredient_id);
      }

      sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const [purchases] = await query(sql, params);

      // Get total count
      let countSql = `SELECT COUNT(*) as count FROM purchases p WHERE 1=1`;
      const countParams = [];
      
      if (start_date && end_date) {
        countSql += ' AND DATE(p.created_at) >= DATE(?) AND DATE(p.created_at) <= DATE(?)';
        countParams.push(start_date, end_date);
      } else if (start_date) {
        countSql += ' AND DATE(p.created_at) >= DATE(?)';
        countParams.push(start_date);
      } else if (end_date) {
        countSql += ' AND DATE(p.created_at) <= DATE(?)';
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
      const today = new Date().toISOString().split('T')[0];
      
      const [purchases] = await query(
        `SELECT p.*, u.name as created_by_name 
         FROM purchases p 
         LEFT JOIN users u ON p.created_by = u.id 
         WHERE DATE(p.created_at) = ?
         ORDER BY p.created_at DESC`,
        [today]
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

      const [purchases] = await query(
        `SELECT p.*, u.name as created_by_name 
         FROM purchases p 
         LEFT JOIN users u ON p.created_by = u.id 
         WHERE p.id = ?`,
        [id]
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

      const [existing] = await query('SELECT * FROM purchases WHERE id = ?', [id]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Purchase not found' });
      }

      const purchase = existing[0];

      // Restore ingredient stock
      const [ingredients] = await query('SELECT * FROM ingredients WHERE id = ?', [purchase.ingredient_id]);
      if (ingredients && ingredients.length > 0) {
        const currentStock = ingredients[0].stock || 0;
        const newStock = Math.max(0, currentStock - purchase.quantity);
        await query(
          'UPDATE ingredients SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newStock, purchase.ingredient_id]
        );
      }

      // Delete purchase record
      await query('DELETE FROM purchases WHERE id = ?', [id]);
      
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
