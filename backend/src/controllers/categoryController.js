const { query, saveDatabase } = require('../config/database');

const categoryController = {
  // Get all categories
  getAll: async (req, res) => {
    try {
      const userId = req.user.id;
      const [categories] = await query(
        'SELECT * FROM categories WHERE user_id = ? AND is_active = 1 ORDER BY sort_order ASC, name ASC',
        [userId]
      );
      res.json(categories || []);
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get category by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const [categories] = await query(
        'SELECT * FROM categories WHERE id = ? AND user_id = ?', 
        [id, userId]
      );
      
      if (!categories || categories.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      res.json(categories[0]);
    } catch (error) {
      console.error('Get category error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create category
  create: async (req, res) => {
    try {
      const userId = req.user.id;
      const { name, description, image_url, sort_order } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
      }

      const [result] = await query(
        'INSERT INTO categories (user_id, name, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?)',
        [userId, name, description || null, image_url || null, sort_order || 0]
      );

      const [newCategory] = await query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
      saveDatabase();
      res.status(201).json(newCategory[0]);
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update category
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { name, description, image_url, sort_order, is_active } = req.body;

      const [existing] = await query('SELECT * FROM categories WHERE id = ? AND user_id = ?', [id, userId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      await query(
        `UPDATE categories 
         SET name = COALESCE(?, name), 
             description = COALESCE(?, description), 
             image_url = COALESCE(?, image_url),
             sort_order = COALESCE(?, sort_order),
             is_active = COALESCE(?, is_active)
         WHERE id = ? AND user_id = ?`,
        [name, description, image_url, sort_order, is_active, id, userId]
      );

      const [updatedCategory] = await query('SELECT * FROM categories WHERE id = ?', [id]);
      saveDatabase();
      res.json(updatedCategory[0]);
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete category
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const [existing] = await query('SELECT * FROM categories WHERE id = ? AND user_id = ?', [id, userId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      await query('DELETE FROM categories WHERE id = ? AND user_id = ?', [id, userId]);
      saveDatabase();
      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = categoryController;

