const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, saveDatabase } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_this_in_production';

const authController = {
  // Register new user (public)
  register: async (req, res) => {
    try {
      const { username, password, name } = req.body;

      if (!username || !password || !name) {
        return res.status(400).json({ error: 'Username, password, and name are required' });
      }

      // Check if username already exists
      const [existing] = await query('SELECT * FROM users WHERE username = ?', [username]);
      if (existing && existing.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Default role is 'cashier'
      const [result] = await query(
        'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, name, 'cashier']
      );

      const userId = result.insertId;

      // Create default nota_settings for the new user
      await query(
        'INSERT INTO nota_settings (user_id, shop_name, footer_text) VALUES (?, ?, ?)',
        [userId, name + "'s Store", 'Terima kasih telah belanja di toko kami!']
      );

      // Save database after inserting
      saveDatabase();

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: userId,
          username,
          name,
          role: 'cashier'
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Login
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const [users] = await query(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (!users || users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get current user
  getCurrentUser: async (req, res) => {
    try {
      res.json({ user: req.user });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      const [users] = await query('SELECT * FROM users WHERE id = ?', [userId]);
      const user = users[0];

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = authController;

