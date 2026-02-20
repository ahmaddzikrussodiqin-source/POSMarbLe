const { query } = require('../config/database');

const ingredientController = {
  // Get all ingredients
  getAll: async (req, res) => {
    try {
      const [ingredients] = await query('SELECT * FROM ingredients ORDER BY name ASC');
      res.json(ingredients || []);
    } catch (error) {
      console.error('Get ingredients error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get ingredient by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const [ingredients] = await query('SELECT * FROM ingredients WHERE id = ?', [id]);
      
      if (!ingredients || ingredients.length === 0) {
        return res.status(404).json({ error: 'Ingredient not found' });
      }
      
      res.json(ingredients[0]);
    } catch (error) {
      console.error('Get ingredient error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create ingredient
  create: async (req, res) => {
    try {
      const { name, unit, stock } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Ingredient name is required' });
      }

      const [result] = await query(
        `INSERT INTO ingredients (name, unit, stock) 
         VALUES (?, ?, ?)`,
        [name, unit || 'gram', stock || 0]
      );

      const [newIngredient] = await query('SELECT * FROM ingredients WHERE id = ?', [result.insertId]);
      res.status(201).json(newIngredient[0]);
    } catch (error) {
      console.error('Create ingredient error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update ingredient
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, unit, stock } = req.body;

      const [existing] = await query('SELECT * FROM ingredients WHERE id = ?', [id]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Ingredient not found' });
      }

      await query(
        `UPDATE ingredients 
         SET name = COALESCE(?, name), 
             unit = COALESCE(?, unit),
             stock = COALESCE(?, stock)
         WHERE id = ?`,
        [name, unit, stock, id]
      );

      const [updatedIngredient] = await query('SELECT * FROM ingredients WHERE id = ?', [id]);
      res.json(updatedIngredient[0]);
    } catch (error) {
      console.error('Update ingredient error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete ingredient
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const [existing] = await query('SELECT * FROM ingredients WHERE id = ?', [id]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Ingredient not found' });
      }

      await query('DELETE FROM ingredients WHERE id = ?', [id]);
      res.json({ message: 'Ingredient deleted successfully' });
    } catch (error) {
      console.error('Delete ingredient error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update stock (replace value)
  updateStock: async (req, res) => {
    try {
      const { id } = req.params;
      const { stock } = req.body;

      if (stock === undefined) {
        return res.status(400).json({ error: 'Stock value is required' });
      }

      const [existing] = await query('SELECT * FROM ingredients WHERE id = ?', [id]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Ingredient not found' });
      }

      await query('UPDATE ingredients SET stock = ? WHERE id = ?', [stock, id]);
      
      const [updatedIngredient] = await query('SELECT * FROM ingredients WHERE id = ?', [id]);
      res.json(updatedIngredient[0]);
    } catch (error) {
      console.error('Update stock error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Purchase stock (add to existing stock)
  purchaseStock: async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity } = req.body;

      if (quantity === undefined || quantity <= 0) {
        return res.status(400).json({ error: 'Valid quantity is required' });
      }

      const [existing] = await query('SELECT * FROM ingredients WHERE id = ?', [id]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Ingredient not found' });
      }

      const currentStock = existing[0].stock || 0;
      const newStock = currentStock + parseFloat(quantity);

      await query('UPDATE ingredients SET stock = ? WHERE id = ?', [newStock, id]);
      
      const [updatedIngredient] = await query('SELECT * FROM ingredients WHERE id = ?', [id]);
      res.json({
        ...updatedIngredient[0],
        previous_stock: currentStock,
        added_quantity: parseFloat(quantity),
        new_stock: newStock,
      });
    } catch (error) {
      console.error('Purchase stock error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get product ingredients
  getProductIngredients: async (req, res) => {
    try {
      const { productId } = req.params;
      const [ingredients] = await query(
        `SELECT pi.*, i.name, i.unit, i.stock as ingredient_stock
         FROM product_ingredients pi
         JOIN ingredients i ON pi.ingredient_id = i.id
         WHERE pi.product_id = ?`,
        [productId]
      );
      res.json(ingredients || []);
    } catch (error) {
      console.error('Get product ingredients error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Set product ingredients
  setProductIngredients: async (req, res) => {
    try {
      const { productId } = req.params;
      const { ingredients } = req.body; // Array of { ingredient_id, quantity_required }

      // Delete existing product ingredients
      await query('DELETE FROM product_ingredients WHERE product_id = ?', [productId]);

      // Insert new product ingredients
      if (ingredients && ingredients.length > 0) {
        for (const ing of ingredients) {
          await query(
            `INSERT INTO product_ingredients (product_id, ingredient_id, quantity_required) 
             VALUES (?, ?, ?)`,
            [productId, ing.ingredient_id, ing.quantity_required]
          );
        }
      }

      // Return updated product ingredients
      const [productIngredients] = await query(
        `SELECT pi.*, i.name, i.unit, i.stock as ingredient_stock
         FROM product_ingredients pi
         JOIN ingredients i ON pi.ingredient_id = i.id
         WHERE pi.product_id = ?`,
        [productId]
      );
      
      res.json(productIngredients || []);
    } catch (error) {
      console.error('Set product ingredients error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = ingredientController;

