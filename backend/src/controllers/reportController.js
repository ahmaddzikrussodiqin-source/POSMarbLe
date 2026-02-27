const { query, useSQLite } = require('../config/database');

const reportController = {
  // Get sales summary
  getSalesSummary: async (req, res) => {
    try {
      const userId = req.user.id;
      const { start_date, end_date } = req.query;
      
      // Build WHERE clause based on filters
      const conditions = ["user_id = ?", "status = 'completed'"];
      const params = [userId];

      if (start_date && end_date) {
        conditions.push("DATE(created_at) BETWEEN ? AND ?");
        params.push(start_date, end_date);
      } else if (start_date) {
        conditions.push("DATE(created_at) >= ?");
        params.push(start_date);
      } else if (end_date) {
        conditions.push("DATE(created_at) <= ?");
        params.push(end_date);
      }

      const whereClause = conditions.join(' AND ');

      // Get total sales
      const [totalSales] = await query(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE ${whereClause}`,
        params
      );

      // Get total orders
      const [totalOrders] = await query(
        `SELECT COUNT(*) as count FROM orders WHERE ${whereClause}`,
        params
      );

      // Get average order value
      const [avgOrder] = await query(
        `SELECT COALESCE(AVG(total_amount), 0) as average FROM orders WHERE ${whereClause}`,
        params
      );

      // Get sales by payment method
      const [salesByPayment] = await query(
        `SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total 
         FROM orders WHERE ${whereClause}
         GROUP BY payment_method`,
        params
      );

      res.json({
        total_sales: totalSales[0]?.total || 0,
        total_orders: totalOrders[0]?.count || 0,
        average_order: avgOrder[0]?.average || 0,
        sales_by_payment: salesByPayment || []
      });
    } catch (error) {
      console.error('Get sales summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get daily sales
  getDailySales: async (req, res) => {
    try {
      const userId = req.user.id;
      const { days = 30 } = req.query;
      
      const [sales] = await query(
        `SELECT DATE(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as total 
         FROM orders 
         WHERE user_id = ? AND status = 'completed' AND created_at >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [userId, parseInt(days)]
      );

      res.json(sales || []);
    } catch (error) {
      console.error('Get daily sales error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get best selling products
  getBestSellingProducts: async (req, res) => {
    try {
      const userId = req.user.id;
      const { limit = 10, start_date, end_date } = req.query;
      
      let whereClause = 'o.user_id = ? AND o.status = ?';
      let params = [userId, 'completed'];

      if (start_date && end_date) {
        whereClause += ' AND DATE(o.created_at) BETWEEN ? AND ?';
        params.push(start_date, end_date);
      }

      const [products] = await query(
        `SELECT oi.product_id, oi.product_name, 
                SUM(oi.quantity) as total_quantity, 
                SUM(oi.subtotal) as total_sales 
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE ${whereClause}
         GROUP BY oi.product_id, oi.product_name
         ORDER BY total_quantity DESC
         LIMIT ?`,
        [...params, parseInt(limit)]
      );

      res.json(products || []);
    } catch (error) {
      console.error('Get best selling products error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get hourly sales (for today)
  getHourlySales: async (req, res) => {
    try {
      const userId = req.user.id;
      const [sales] = await query(
        `SELECT HOUR(created_at) as hour, COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as total 
         FROM orders 
         WHERE user_id = ? AND status = 'completed' AND DATE(created_at) = DATE('now')
         GROUP BY HOUR(created_at)
         ORDER BY hour ASC`,
        [userId]
      );

      // Fill in missing hours
      const hourlyData = [];
      for (let i = 0; i < 24; i++) {
        const existing = sales?.find(s => s.hour === i);
        hourlyData.push({
          hour: i,
          orders: existing ? existing.orders : 0,
          total: existing ? existing.total : 0
        });
      }

      res.json(hourlyData);
    } catch (error) {
      console.error('Get hourly sales error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get top cashiers
  getTopCashiers: async (req, res) => {
    try {
      const userId = req.user.id;
      const { limit = 5 } = req.query;
      
      // Get cashiers who have orders for this user
      const [cashiers] = await query(
        `SELECT u.id, u.name, COUNT(o.id) as total_orders, COALESCE(SUM(o.total_amount), 0) as total_sales 
         FROM users u
         LEFT JOIN orders o ON u.id = o.created_by AND o.user_id = ? AND o.status = 'completed'
         WHERE u.role = 'cashier' AND (o.user_id = ? OR o.user_id IS NULL)
         GROUP BY u.id, u.name
         ORDER BY total_sales DESC
         LIMIT ?`,
        [userId, userId, parseInt(limit)]
      );

      res.json(cashiers || []);
    } catch (error) {
      console.error('Get top cashiers error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get purchase summary (money out)
  getPurchaseSummary: async (req, res) => {
    try {
      const userId = req.user.id;
      const { start_date, end_date } = req.query;
      
      // Build WHERE clause based on filters
      const conditions = ["user_id = ?"];
      const params = [userId];

      if (start_date && end_date) {
        conditions.push("DATE(created_at) BETWEEN ? AND ?");
        params.push(start_date, end_date);
      } else if (start_date) {
        conditions.push("DATE(created_at) >= ?");
        params.push(start_date);
      } else if (end_date) {
        conditions.push("DATE(created_at) <= ?");
        params.push(end_date);
      }

      const whereClause = conditions.join(' AND ');

      // Get total purchases
      const [totalPurchases] = await query(
        `SELECT COALESCE(SUM(total_price), 0) as total FROM purchases WHERE ${whereClause}`,
        params
      );

      // Get total purchase count
      const [totalCount] = await query(
        `SELECT COUNT(*) as count FROM purchases WHERE ${whereClause}`,
        params
      );

      // Get purchases by ingredient
      const [purchasesByIngredient] = await query(
        `SELECT ingredient_id, ingredient_name, 
                SUM(quantity) as total_quantity, 
                COALESCE(SUM(total_price), 0) as total 
         FROM purchases 
         WHERE ${whereClause}
         GROUP BY ingredient_id, ingredient_name
         ORDER BY total DESC`,
        params
      );

      res.json({
        total_purchases: totalPurchases[0]?.total || 0,
        total_count: totalCount[0]?.count || 0,
        purchases_by_ingredient: purchasesByIngredient || []
      });
    } catch (error) {
      console.error('Get purchase summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get financial summary (money in vs money out)
  getFinancialSummary: async (req, res) => {
    try {
      const userId = req.user.id;
      const { start_date, end_date } = req.query;
      
      // Build WHERE clause for sales
      const salesConditions = ["user_id = ?", "status = 'completed'"];
      const salesParams = [userId];

      // Build WHERE clause for purchases
      const purchaseConditions = ["user_id = ?"];
      const purchaseParams = [userId];

      if (start_date && end_date) {
        salesConditions.push("DATE(created_at) BETWEEN ? AND ?");
        salesParams.push(start_date, end_date);
        
        purchaseConditions.push("DATE(created_at) BETWEEN ? AND ?");
        purchaseParams.push(start_date, end_date);
      } else if (start_date) {
        salesConditions.push("DATE(created_at) >= ?");
        salesParams.push(start_date);
        
        purchaseConditions.push("DATE(created_at) >= ?");
        purchaseParams.push(start_date);
      } else if (end_date) {
        salesConditions.push("DATE(created_at) <= ?");
        salesParams.push(end_date);
        
        purchaseConditions.push("DATE(created_at) <= ?");
        purchaseParams.push(end_date);
      }

      const salesWhereClause = salesConditions.join(' AND ');
      const purchaseWhereClause = purchaseConditions.join(' AND ');

      // Get total sales (money in)
      const [totalSales] = await query(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE ${salesWhereClause}`,
        salesParams
      );

      // Get total purchases (money out)
      const [totalPurchases] = await query(
        `SELECT COALESCE(SUM(total_price), 0) as total FROM purchases WHERE ${purchaseWhereClause}`,
        purchaseParams
      );

      // Calculate profit
      const moneyIn = totalSales[0]?.total || 0;
      const moneyOut = totalPurchases[0]?.total || 0;
      const profit = moneyIn - moneyOut;

      res.json({
        money_in: moneyIn,
        money_out: moneyOut,
        profit: profit,
        profit_margin: moneyIn > 0 ? ((profit / moneyIn) * 100).toFixed(2) : 0
      });
    } catch (error) {
      console.error('Get financial summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get daily purchases
  getDailyPurchases: async (req, res) => {
    try {
      const userId = req.user.id;
      const { days = 30 } = req.query;
      
      const [purchases] = await query(
        `SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(total_price), 0) as total 
         FROM purchases 
         WHERE user_id = ? AND created_at >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [userId, parseInt(days)]
      );

      res.json(purchases || []);
    } catch (error) {
      console.error('Get daily purchases error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = reportController;

