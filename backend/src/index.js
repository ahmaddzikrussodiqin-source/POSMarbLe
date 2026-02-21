require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const ingredientRoutes = require('./routes/ingredients');
const purchaseRoutes = require('./routes/purchases');
const appRoutes = require('./routes/app');
const { initDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');

// Debug: Log key environment variables in index.js
console.log('[index.js] PORT:', PORT);
console.log('[index.js] NODE_ENV:', process.env.NODE_ENV);
console.log('[index.js] DB_HOST:', process.env.DB_HOST);
console.log('[index.js] USE_SQLITE:', process.env.USE_SQLITE);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes - MUST BE REGISTERED BEFORE catch-all handler
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/app', appRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'POSMarbLe API is running' });
});

// Serve static files from frontend dist directory
// Check multiple locations for Railway deployment
const possiblePaths = [
  path.join(__dirname, '../frontend-dist'),        // backend/frontend-dist
  path.join(__dirname, '../../frontend-dist'),      // frontend-dist (root)
  path.join(__dirname, '../../frontend/dist'),      // frontend/dist
  path.join(process.cwd(), '../frontend-dist'),    // from app directory
  path.join(process.cwd(), 'frontend-dist'),      // from app directory
  '/app/frontend-dist',                            // Railway absolute path
  '/app/frontend/dist'                             // Railway absolute path
];

let staticPath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
    staticPath = p;
    console.log('Found static files at:', staticPath);
    break;
  }
}

// Fallback - use first path
if (!staticPath) {
  staticPath = possiblePaths[0];
  console.log('Static path (fallback):', staticPath);
}

// Always serve static files in production
app.use(express.static(staticPath));

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Catch all handler: send back index.html for any non-API routes
// This handles client-side routing - MUST BE REGISTERED LAST
app.get('*', (req, res) => {
  // Don't interfere with API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

