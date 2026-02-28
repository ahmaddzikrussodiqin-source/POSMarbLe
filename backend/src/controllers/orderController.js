const { query, useSQLite, db, saveDatabase } = require('../config/database');

const orderController = {
  // Generate order number
  generateOrderNumber: () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD${year}${month}${day}${random}`;
  },

  // Create new order
  create: async (req, res) => {
    try {
      const { items, payment_method, notes } = req.body;
      const userId = req.user.id;

      console.log('[Order] Creating order - userId:', userId, 'items:', items?.length, 'payment_method:', payment_method);

      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Order items are required' });
      }

      // Verify all products belong to the user
      for (const item of items) {
        const [productCheck] = await query(
          'SELECT id FROM products WHERE id = ? AND user_id = ?',
          [item.id, userId]
        );
        if (!productCheck || productCheck.length === 0) {
          return res.status(400).json({ error: `Product "${item.name}" not found or does not belong to user` });
        }
      }

      // Calculate total amount
      let totalAmount = 0;
      for (const item of items) {
        totalAmount += item.price * item.quantity;
      }

      console.log('[Order] Total amount:', totalAmount);

      // Generate order number
      const orderNumber = orderController.generateOrderNumber();
      console.log('[Order] Order number:', orderNumber);

      // Insert order with user_id
      const [orderResult] = await query(
        `INSERT INTO orders (user_id, order_number, total_amount, payment_method, status, created_by) 
         VALUES (?, ?, ?, ?, 'completed', ?)`,
        [userId, orderNumber, totalAmount, payment_method || 'cash', userId]
      );

      // Handle case where insertId might be undefined
      const orderId = orderResult?.insertId;
      if (!orderId) {
        console.error('[Order] Failed to get insertId from orderResult:', orderResult);
        return res.status(500).json({ error: 'Failed to create order: could not retrieve order ID' });
      }
      console.log('[Order] Order created with ID:', orderId);

      // Insert order items
      for (const item of items) {
        const subtotal = item.price * item.quantity;
        console.log('[Order] Adding item:', item.name, 'qty:', item.quantity);
        
        await query(
          `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, item.id, item.name, item.price, item.quantity, subtotal]
        );

        // Update product stock (for products without ingredients) - only for user's products
        await query(
          'UPDATE products SET stock = stock - ? WHERE id = ? AND user_id = ?',
          [item.quantity, item.id, userId]
        );

        // Update ingredient stock - reduce ingredients used for this product (only user's ingredients)
        const [productIngredients] = await query(
          `SELECT pi.ingredient_id, pi.quantity_required 
           FROM product_ingredients pi
           JOIN products p ON pi.product_id = p.id
           WHERE pi.product_id = ? AND p.user_id = ?`,
          [item.id, userId]
        );

        for (const pi of productIngredients) {
          await query(
            'UPDATE ingredients SET stock = stock - ? WHERE id = ? AND user_id = ?',
            [pi.quantity_required * item.quantity, pi.ingredient_id, userId]
          );
        }
      }

      // Save database for SQLite - IMPORTANT: persist order data
      if (useSQLite) {
        saveDatabase();
        console.log('[Order] Database saved for SQLite');
      }

      // Get complete order with items
      const [orders] = await query(
        `SELECT o.*, u.name as created_by_name 
         FROM orders o 
         LEFT JOIN users u ON o.created_by = u.id 
         WHERE o.id = ? AND o.user_id = ?`,
        [orderId, userId]
      );

      if (!orders || orders.length === 0) {
        console.error('[Order] Order not found after creation, orderId:', orderId);
        return res.status(500).json({ error: 'Order created but could not be retrieved' });
      }

      const [orderItems] = await query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [orderId]
      );

      console.log('[Order] Order created successfully:', orderNumber);

      res.status(201).json({
        ...orders[0],
        items: orderItems || []
      });
    } catch (error) {
      console.error('[Order] Create order error:', error);
      console.error('[Order] Error stack:', error.stack);
      res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
  },

  // Get all orders
  getAll: async (req, res) => {
    try {
      // Validate user exists in request
      if (!req.user || !req.user.id) {
        console.error('[Order] getAll: req.user or req.user.id is missing:', req.user);
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const userId = req.user.id;
      const { date, start_date, end_date, status, limit = 50, offset = 0 } = req.query;
      
      let sql = `
        SELECT o.*, u.name as created_by_name 
        FROM orders o 
        LEFT JOIN users u ON o.created_by = u.id
        WHERE o.user_id = ?
      `;
      const params = [userId];

      if (date) {
        sql += ' AND DATE(o.created_at) = ?';
        params.push(date);
      }

      if (start_date) {
        sql += ' AND DATE(o.created_at) >= ?';
        params.push(start_date);
      }

      if (end_date) {
        sql += ' AND DATE(o.created_at) <= ?';
        params.push(end_date);
      }

      if (status) {
        sql += ' AND o.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const [orders] = await query(sql, params);

      // Get items for each order
      for (let order of orders) {
        const [items] = await query(
          'SELECT * FROM order_items WHERE order_id = ?',
          [order.id]
        );
        order.items = items;
      }

      res.json(orders || []);
    } catch (error) {
      console.error('[Order] Get orders error:', error);
      console.error('[Order] Error stack:', error.stack);
      res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
  },

  // Get order by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const [orders] = await query(
        `SELECT o.*, u.name as created_by_name 
         FROM orders o 
         LEFT JOIN users u ON o.created_by = u.id 
         WHERE o.id = ? AND o.user_id = ?`,
        [id, userId]
      );

      if (!orders || orders.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const [items] = await query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [id]
      );

      res.json({
        ...orders[0],
        items
      });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get today's orders (for POS dashboard)
  getTodayOrders: async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Format date in local timezone (not UTC) to match frontend
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      const [orders] = await query(
        `SELECT o.*, u.name as created_by_name 
         FROM orders o 
         LEFT JOIN users u ON o.created_by = u.id 
         WHERE DATE(o.created_at) = ? AND o.user_id = ? AND o.status = 'completed'
         ORDER BY o.created_at DESC`,
        [todayStr, userId]
      );

      // Get items for each order
      for (let order of orders || []) {
        const [items] = await query(
          'SELECT * FROM order_items WHERE order_id = ?',
          [order.id]
        );
        order.items = items;
      }

      res.json(orders || []);
    } catch (error) {
      console.error('Get today orders error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Cancel order
  cancel: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const [existing] = await query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [id, userId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (existing[0].status === 'cancelled') {
        return res.status(400).json({ error: 'Order already cancelled' });
      }

      // Restore stock
      const [items] = await query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [id]
      );

      for (const item of items) {
        if (item.product_id) {
          // Restore product stock - only for user's products
          await query(
            'UPDATE products SET stock = stock + ? WHERE id = ? AND user_id = ?',
            [item.quantity, item.product_id, userId]
          );

          // Restore ingredient stock - only for user's ingredients
          const [productIngredients] = await query(
            `SELECT pi.ingredient_id, pi.quantity_required 
             FROM product_ingredients pi
             JOIN products p ON pi.product_id = p.id
             WHERE pi.product_id = ? AND p.user_id = ?`,
            [item.product_id, userId]
          );

          for (const pi of productIngredients) {
            await query(
              'UPDATE ingredients SET stock = stock + ? WHERE id = ? AND user_id = ?',
              [pi.quantity_required * item.quantity, pi.ingredient_id, userId]
            );
          }
        }
      }

      // Update order status
      await query(
        'UPDATE orders SET status = ?, payment_status = ? WHERE id = ? AND user_id = ?',
        ['cancelled', 'cancelled', id, userId]
      );

      // Save database for SQLite - persist cancellation
      if (useSQLite) {
        saveDatabase();
      }

      res.json({ message: 'Order cancelled successfully' });
    } catch (error) {
      console.error('Cancel order error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = orderController;
