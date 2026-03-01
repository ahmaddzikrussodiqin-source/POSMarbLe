const { query, saveDatabase } = require('../config/database');

// Helper function to calculate product stock based on ingredients
const calculateProductStock = async (productId, userId) => {
  // Get all ingredients for this product
  const [productIngredients] = await query(
    `SELECT pi.ingredient_id, pi.quantity_required, i.stock as available_stock
     FROM product_ingredients pi
     JOIN ingredients i ON pi.ingredient_id = i.id
     WHERE pi.product_id = ? AND i.user_id = ?`,
    [productId, userId]
  );

  // If no ingredients defined, use the product's own stock
  if (!productIngredients || productIngredients.length === 0) {
    return null;
  }

  // Calculate minimum possible products based on each ingredient
  let minStock = Infinity;
  for (const ing of productIngredients) {
    if (ing.quantity_required > 0) {
      const possibleCount = Math.floor(ing.available_stock / ing.quantity_required);
      minStock = Math.min(minStock, possibleCount);
    }
  }

  // If no valid calculation possible, return 0
  if (minStock === Infinity || minStock === 0) {
    return 0;
  }

  return minStock;
};

const productController = {
  // Get all products
  getAll: async (req, res) => {
    try {
      const userId = req.user.id;
      const { category_id, available } = req.query;
      
      let sql = `
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.user_id = ?
      `;
      const params = [userId];

      if (category_id) {
        sql += ' AND p.category_id = ?';
        params.push(category_id);
      }

      if (available !== undefined) {
        sql += ' AND p.is_available = ?';
        params.push(available === 'true' ? 1 : 0);
      }

      sql += ' ORDER BY p.name ASC';

      const [products] = await query(sql, params);

      // Calculate stock based on ingredients for each product
      const productsWithCalculatedStock = await Promise.all(
        products.map(async (product) => {
          const calculatedStock = await calculateProductStock(product.id, userId);
          // If calculated stock exists (product has ingredients), use it; otherwise use original stock
          return {
            ...product,
            calculated_stock: calculatedStock !== null ? calculatedStock : product.stock,
            has_ingredients: calculatedStock !== null
          };
        })
      );

      res.json(productsWithCalculatedStock || []);
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get product by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const [products] = await query(
        `SELECT p.*, c.name as category_name 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.id = ? AND p.user_id = ?`,
        [id, userId]
      );
      
      if (!products || products.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const product = products[0];
      const calculatedStock = await calculateProductStock(id, userId);
      
      // Add calculated stock info
      product.calculated_stock = calculatedStock !== null ? calculatedStock : product.stock;
      product.has_ingredients = calculatedStock !== null;

      // Also get the ingredients for this product
      const [ingredients] = await query(
        `SELECT pi.*, i.name, i.unit, i.stock as ingredient_stock
         FROM product_ingredients pi
         JOIN ingredients i ON pi.ingredient_id = i.id
         WHERE pi.product_id = ? AND i.user_id = ?`,
        [id, userId]
      );
      product.ingredients = ingredients || [];
      
      res.json(product);
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create product
  create: async (req, res) => {
    try {
      const userId = req.user.id;
      const { name, description, price, category_id, image_url, stock, is_available, ingredients } = req.body;
      
      if (!name || !price) {
        return res.status(400).json({ error: 'Product name and price are required' });
      }

      // Validate price is within reasonable range
      const priceValue = parseFloat(price);
      if (isNaN(priceValue) || priceValue < 0) {
        return res.status(400).json({ error: 'Price must be a valid positive number' });
      }
      if (priceValue > 999999999999) {
        return res.status(400).json({ error: 'Price is too large (max: 999,999,999,999)' });
      }

      // Validate image_url is not too large (base64 limit ~1MB for safety)
      if (image_url && image_url.length > 1000000) {
        return res.status(400).json({ error: 'Image is too large (max size: ~1MB)' });
      }

      // Ensure numeric values are properly converted
      const categoryIdValue = category_id ? parseInt(category_id) : null;
      const stockValue = stock ? parseInt(stock) : 0;
      const isAvailableValue = is_available !== false ? 1 : 0;

      // If ingredients are provided, validate them
      if (ingredients && ingredients.length > 0) {
        // Validate that all ingredients have required fields and belong to user
        for (const ing of ingredients) {
          if (!ing.ingredient_id || !ing.quantity_required) {
            return res.status(400).json({ error: 'Each ingredient must have ingredient_id and quantity_required' });
          }
          // Verify ingredient belongs to user
          const [ingCheck] = await query('SELECT id FROM ingredients WHERE id = ? AND user_id = ?', [ing.ingredient_id, userId]);
          if (!ingCheck || ingCheck.length === 0) {
            return res.status(400).json({ error: 'Ingredient not found or does not belong to user' });
          }
        }
      }

      // Insert the product
      const [result] = await query(
        `INSERT INTO products (user_id, name, description, price, category_id, image_url, stock, is_available) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, name, description || null, priceValue, categoryIdValue, image_url || null, stockValue, isAvailableValue]
      );

      const productId = result.insertId;

      // Insert product ingredients if provided
      if (ingredients && ingredients.length > 0) {
        for (const ing of ingredients) {
          const ingId = parseInt(ing.ingredient_id);
          const qty = parseFloat(ing.quantity_required);
          await query(
            `INSERT INTO product_ingredients (product_id, ingredient_id, quantity_required) 
             VALUES (?, ?, ?)`,
            [productId, ingId, qty]
          );
        }
      }

      // Save database after inserting product and ingredients
      saveDatabase();

      const [newProduct] = await query('SELECT * FROM products WHERE id = ?', [productId]);
      
      // Get the ingredients for the new product
      const [productIngredients] = await query(
        `SELECT pi.*, i.name, i.unit, i.stock as ingredient_stock
         FROM product_ingredients pi
         JOIN ingredients i ON pi.ingredient_id = i.id
         WHERE pi.product_id = ?`,
        [productId]
      );
      
      newProduct[0].ingredients = productIngredients || [];
      
      res.status(201).json(newProduct[0]);
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update product
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { name, description, price, category_id, image_url, stock, is_available } = req.body;

      const [existing] = await query('SELECT * FROM products WHERE id = ? AND user_id = ?', [id, userId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Validate price if provided
      if (price !== undefined && price !== null) {
        const priceValue = parseFloat(price);
        if (isNaN(priceValue) || priceValue < 0) {
          return res.status(400).json({ error: 'Price must be a valid positive number' });
        }
        if (priceValue > 999999999999) {
          return res.status(400).json({ error: 'Price is too large (max: 999,999,999,999)' });
        }
      }

      // Validate image_url is not too large if provided
      if (image_url && image_url.length > 1000000) {
        return res.status(400).json({ error: 'Image is too large (max size: ~1MB)' });
      }

      await query(
        `UPDATE products 
         SET name = COALESCE(?, name), 
             description = COALESCE(?, description), 
             price = COALESCE(?, price),
             category_id = COALESCE(?, category_id),
             image_url = COALESCE(?, image_url),
             stock = COALESCE(?, stock),
             is_available = COALESCE(?, is_available)
         WHERE id = ? AND user_id = ?`,
        [name, description, price, category_id, image_url, stock, is_available, id, userId]
      );

      const [updatedProduct] = await query('SELECT * FROM products WHERE id = ?', [id]);
      saveDatabase();
      res.json(updatedProduct[0]);
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete product
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const [existing] = await query('SELECT * FROM products WHERE id = ? AND user_id = ?', [id, userId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      await query('DELETE FROM products WHERE id = ? AND user_id = ?', [id, userId]);
      saveDatabase();
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update stock
  updateStock: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { stock } = req.body;

      if (stock === undefined) {
        return res.status(400).json({ error: 'Stock value is required' });
      }

      const [existing] = await query('SELECT * FROM products WHERE id = ? AND user_id = ?', [id, userId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      await query('UPDATE products SET stock = ? WHERE id = ? AND user_id = ?', [stock, id, userId]);
      
      const [updatedProduct] = await query('SELECT * FROM products WHERE id = ?', [id]);
      saveDatabase();
      res.json(updatedProduct[0]);
    } catch (error) {
      console.error('Update stock error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = productController;

