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

      // Calculate total amount
      let totalAmount = 0;
      for (const item of items) {
        totalAmount += item.price * item.quantity;
      }

      console.log('[Order] Total amount:', totalAmount);

      // Generate order number
      const orderNumber = orderController.generateOrderNumber();
      console.log('[Order] Order number:', orderNumber);

      // Insert order
      const [orderResult] = await query(
        `INSERT INTO orders (order_number, total_amount, payment_method, status, created_by) 
         VALUES (?, ?, ?, 'completed', ?)`,
        [orderNumber, totalAmount, payment_method || 'cash', userId]
      );

      const orderId = orderResult.insertId;
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

        // Update product stock (for products without ingredients)
        await query(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.id]
        );

        // Update ingredient stock - reduce ingredients used for this product
        const [productIngredients] = await query(
          'SELECT ingredient_id, quantity_required FROM product_ingredients WHERE product_id = ?',
          [item.id]
        );

        for (const pi of productIngredients) {
          await query(
            'UPDATE ingredients SET stock = stock - ? WHERE id = ?',
            [pi.quantity_required * item.quantity, pi.ingredient_id]
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
         WHERE o.id = ?`,
        [orderId]
      );

      const [orderItems] = await query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [orderId]
      );

      console.log('[Order] Order created successfully:', orderNumber);

      res.status(201).json({
        ...orders[0],
        items: orderItems
      });
    } catch (error) {
      console.error('Create order error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
  },

  // Get all orders
  getAll: async (req, res) => {
    try {
      const { date, status, limit = 50, offset = 0 } = req.query;
      
      let sql = `
        SELECT o.*, u.name as created_by_name 
        FROM orders o 
        LEFT JOIN users u ON o.created_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (date) {
        sql += ' AND DATE(o.created_at) = ?';
        params.push(date);
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
      console.error('Get orders error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get order by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;

      const [orders] = await query(
        `SELECT o.*, u.name as created_by_name 
         FROM orders o 
         LEFT JOIN users u ON o.created_by = u.id 
         WHERE o.id = ?`,
        [id]
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
      const today = new Date().toISOString().split('T')[0];
      
      const [orders] = await query(
        `SELECT o.*, u.name as created_by_name 
         FROM orders o 
         LEFT JOIN users u ON o.created_by = u.id 
         WHERE DATE(o.created_at) = ? AND o.status = 'completed'
         ORDER BY o.created_at DESC`,
        [today]
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

      const [existing] = await query('SELECT * FROM orders WHERE id = ?', [id]);
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
          // Restore product stock
          await query(
            'UPDATE products SET stock = stock + ? WHERE id = ?',
            [item.quantity, item.product_id]
          );

          // Restore ingredient stock
          const [productIngredients] = await query(
            'SELECT ingredient_id, quantity_required FROM product_ingredients WHERE product_id = ?',
            [item.product_id]
          );

          for (const pi of productIngredients) {
            await query(
              'UPDATE ingredients SET stock = stock + ? WHERE id = ?',
              [pi.quantity_required * item.quantity, pi.ingredient_id]
            );
          }
        }
      }

      // Update order status
      await query(
        'UPDATE orders SET status = ?, payment_status = ? WHERE id = ?',
        ['cancelled', 'cancelled', id]
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

