const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_change_this_in_production');
    
    // Validate decoded token has userId
    if (!decoded || !decoded.userId) {
      console.error('[Auth] Token decoded but userId is missing:', decoded);
      return res.status(403).json({ error: 'Invalid token: user ID missing' });
    }
    
    // Get user from database
    const [users] = await query(
      'SELECT id, username, name, role FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!users || users.length === 0) {
      console.error('[Auth] User not found for ID:', decoded.userId);
      return res.status(401).json({ error: 'User not found' });
    }

    // Validate user data
    const user = users[0];
    if (!user.id) {
      console.error('[Auth] User data corrupted:', user);
      return res.status(500).json({ error: 'User data is corrupted' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth] Token verification error:', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticateToken, requireAdmin };
