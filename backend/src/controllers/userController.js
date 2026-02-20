const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const userController = {
  // Get all users
  getAll: async (req, res) => {
    try {
      const [users] = await query(
        'SELECT id, username, name, role, created_at, updated_at FROM users ORDER BY name ASC'
      );
      res.json(users || []);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get user by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const [users] = await query(
        'SELECT id, username, name, role, created_at, updated_at FROM users WHERE id = ?',
        [id]
      );
      
      if (!users || users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(users[0]);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create user
  create: async (req, res) => {
    try {
      const { username, password, name, role } = req.body;
      
      if (!username || !password || !name) {
        return res.status(400).json({ error: 'Username, password, and name are required' });
      }

      // Check if username already exists
      const [existing] = await query('SELECT * FROM users WHERE username = ?', [username]);
      if (existing && existing.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const [result] = await query(
        'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, name, role || 'cashier']
      );

      const [newUser] = await query(
        'SELECT id, username, name, role, created_at, updated_at FROM users WHERE id = ?',
        [result.insertId]
      );
      
      res.status(201).json(newUser[0]);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update user
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { username, name, role } = req.body;

      const [existing] = await query('SELECT * FROM users WHERE id = ?', [id]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if username already exists for other users
      if (username) {
        const [usernameExists] = await query(
          'SELECT * FROM users WHERE username = ? AND id != ?',
          [username, id]
        );
        if (usernameExists && usernameExists.length > 0) {
          return res.status(400).json({ error: 'Username already exists' });
        }
      }

      await query(
        `UPDATE users 
         SET username = COALESCE(?, username), 
             name = COALESCE(?, name), 
             role = COALESCE(?, role)
         WHERE id = ?`,
        [username, name, role, id]
      );

      const [updatedUser] = await query(
        'SELECT id, username, name, role, created_at, updated_at FROM users WHERE id = ?',
        [id]
      );
      
      res.json(updatedUser[0]);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete user
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      const [existing] = await query('SELECT * FROM users WHERE id = ?', [id]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      await query('DELETE FROM users WHERE id = ?', [id]);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Reset user password (admin only)
  resetPassword: async (req, res) => {
    try {
      const { id } = req.params;
      const { new_password } = req.body;

      if (!new_password) {
        return res.status(400).json({ error: 'New password is required' });
      }

      const [existing] = await query('SELECT * FROM users WHERE id = ?', [id]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const hashedPassword = await bcrypt.hash(new_password, 10);
      await query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = userController;

