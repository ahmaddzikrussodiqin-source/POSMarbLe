const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, saveDatabase } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_this_in_production';

const authController = {
  // Register new user (public)
  register: async (req, res) => {
    try {
      const { username, password, name } = req.body;

      console.log('[Register] Attempting registration for username:', username);

      if (!username || !password || !name) {
        return res.status(400).json({ error: 'Username, password, and name are required' });
      }

      // Check if username already exists
      console.log('[Register] Checking for existing username...');
      const [existing] = await query('SELECT * FROM users WHERE username = ?', [username]);
      if (existing && existing.length > 0) {
        console.log('[Register] Username already exists:', username);
        return res.status(400).json({ error: 'Username already exists' });
      }

      console.log('[Register] Hashing password...');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Default role is 'admin' for all new users
      console.log('[Register] Inserting user into database...');
      const [result] = await query(
        'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, name, 'admin']
      );

      console.log('[Register] User inserted, result:', result);
      const userId = result.insertId;

      console.log('[Register] User ID:', userId);

      // Create default nota_settings for the new user
      // Wrap in try-catch to prevent failure here from breaking registration
      try {
        console.log('[Register] Creating default nota_settings...');
        await query(
          'INSERT INTO nota_settings (user_id, shop_name, footer_text) VALUES (?, ?, ?)',
          [userId, name + "'s Store", 'Terima kasih telah belanja di toko kami!']
        );
        console.log('[Register] nota_settings created successfully');
      } catch (notaError) {
        console.error('[Register] Warning: Failed to create nota_settings:', notaError);
        // Continue anyway - nota_settings can be created later
      }

      // Save database after inserting (important for SQLite)
      console.log('[Register] Saving database...');
      saveDatabase();
      console.log('[Register] Database saved successfully');

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: userId,
          username,
          name,
          role: 'admin'
        }
      });
    } catch (error) {
      console.error('[Register] Full error:', error);
      console.error('[Register] Error stack:', error.stack);
      res.status(500).json({ error: 'Internal server error: ' + error.message });
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

