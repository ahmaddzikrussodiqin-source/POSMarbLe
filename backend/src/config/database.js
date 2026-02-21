const mysql = require('mysql2/promise');
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Debug: Log environment variables
console.log('Environment variables:');
console.log('USE_SQLITE:', process.env.USE_SQLITE);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_HOST:', process.env.MYSQL_HOST || process.env.DB_HOST || '(not set)');
console.log('DB_USER:', process.env.MYSQL_USER || process.env.DB_USER || '(not set)');
console.log('DB_PASSWORD:', process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD ? '(set)' : '(not set)');
console.log('DB_NAME:', process.env.MYSQL_DATABASE || process.env.DB_NAME || '(not set)');

const useSQLite = process.env.USE_SQLITE === 'true' && process.env.NODE_ENV !== 'production';

let pool;
let db;
let SQL;

// Initialize MySQL pool if not using SQLite
if (!useSQLite) {
  // Support both Railway MySQL variable names and custom DB_ variables
  const dbHost = process.env.MYSQL_HOST || process.env.DB_HOST;
  const dbUser = process.env.MYSQL_USER || process.env.DB_USER;
  const dbPassword = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD;
  const dbName = process.env.MYSQL_DATABASE || process.env.DB_NAME;
  
  pool = mysql.createPool({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

const useSQLiteAsync = async () => {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  
  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../../posmarble.db');
  
  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  console.log('Using SQLite database at:', dbPath);
  return db;
};

// Helper to run queries based on database type
const query = async (sql, params = []) => {
  if (useSQLite) {
    try {
      // Ensure db is initialized
      if (!db) {
        await useSQLiteAsync();
      }
      
      // Convert undefined values to null for SQLite
      const safeParams = params.map(p => p === undefined ? null : p);
      
      const stmt = db.prepare(sql);
      if (safeParams.length > 0) {
        stmt.bind(safeParams);
      }
      
      const results = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(row);
      }
      stmt.free();
      
      // For INSERT statements, get the last insert rowid
      if (sql.trim().toUpperCase().startsWith('INSERT')) {
        const lastIdResult = db.exec("SELECT last_insert_rowid() as insertId");
        if (lastIdResult.length > 0 && lastIdResult[0].values.length > 0) {
          const insertId = lastIdResult[0].values[0][0];
          return [{ insertId, ...results[0] }];
        }
        return [{ insertId: results.length > 0 ? results[0].id : undefined }];
      }
      
      return [results];
    } catch (error) {
      console.error('SQLite query error:', error);
      throw error;
    }
  } else {
    try {
      const [results] = await pool.query(sql, params);
      return [results];
    } catch (error) {
      console.error('MySQL query error:', error);
      throw error;
    }
  }
};

// Save SQLite database to file
const saveDatabase = () => {
  if (useSQLite && db) {
    const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../../posmarble.db');
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
};

// Initialize database tables
const initDatabase = async () => {
  try {
    if (useSQLite) {
      // Initialize sql.js first
      await useSQLiteAsync();
      
      // SQLite initialization
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'cashier',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          image_url TEXT,
          sort_order INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          category_id INTEGER,
          image_url TEXT,
          stock INTEGER DEFAULT 0,
          is_available INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS ingredients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          unit TEXT DEFAULT 'gram',
          stock REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS product_ingredients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          ingredient_id INTEGER NOT NULL,
          quantity_required REAL NOT NULL,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_number TEXT UNIQUE NOT NULL,
          total_amount REAL NOT NULL,
          payment_method TEXT DEFAULT 'cash',
          payment_status TEXT DEFAULT 'paid',
          status TEXT DEFAULT 'completed',
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          unit_price REAL NOT NULL,
          quantity INTEGER NOT NULL,
          subtotal REAL NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
        )
      `);

      // Purchases table for tracking ingredient purchases (money out)
      db.run(`
        CREATE TABLE IF NOT EXISTS purchases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          purchase_number TEXT UNIQUE NOT NULL,
          ingredient_id INTEGER NOT NULL,
          ingredient_name TEXT NOT NULL,
          quantity REAL NOT NULL,
          unit TEXT NOT NULL,
          unit_price REAL NOT NULL,
          total_price REAL NOT NULL,
          created_by INTEGER,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      console.log('SQLite database tables initialized successfully');

      // Create default admin user if not exists
      const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
      stmt.bind(['admin']);
      const adminExists = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        db.run(
          'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
          ['admin', hashedPassword, 'Administrator', 'admin']
        );
        console.log('Default admin user created (username: admin, password: admin123)');
      }
      
      // Save database after initialization
      saveDatabase();
    } else {
      // MySQL initialization
      const connection = await pool.getConnection();
      
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(100) NOT NULL,
          role ENUM('admin', 'cashier') DEFAULT 'cashier',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          image_url VARCHAR(255),
          sort_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) NOT NULL,
          category_id INT,
          image_url VARCHAR(255),
          stock INT DEFAULT 0,
          is_available BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS ingredients (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          unit VARCHAR(20) DEFAULT 'gram',
          stock DECIMAL(10, 2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS product_ingredients (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          ingredient_id INT NOT NULL,
          quantity_required DECIMAL(10, 2) NOT NULL,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_number VARCHAR(50) UNIQUE NOT NULL,
          total_amount DECIMAL(10, 2) NOT NULL,
          payment_method ENUM('cash', 'qris', 'debit') DEFAULT 'cash',
          payment_status ENUM('pending', 'paid', 'cancelled') DEFAULT 'paid',
          status ENUM('pending', 'completed', 'cancelled') DEFAULT 'completed',
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          product_id INT NOT NULL,
          product_name VARCHAR(100) NOT NULL,
          unit_price DECIMAL(10, 2) NOT NULL,
          quantity INT NOT NULL,
          subtotal DECIMAL(10, 2) NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
        )
      `);

      // Purchases table for tracking ingredient purchases (money out)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS purchases (
          id INT AUTO_INCREMENT PRIMARY KEY,
          purchase_number VARCHAR(50) UNIQUE NOT NULL,
          ingredient_id INT NOT NULL,
          ingredient_name VARCHAR(100) NOT NULL,
          quantity DECIMAL(10, 2) NOT NULL,
          unit VARCHAR(20) NOT NULL,
          unit_price DECIMAL(10, 2) NOT NULL,
          total_price DECIMAL(10, 2) NOT NULL,
          created_by INT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      console.log('MySQL database tables initialized successfully');
      
      const [users] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);
      if (users.length === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await connection.query(
          'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
          ['admin', hashedPassword, 'Administrator', 'admin']
        );
        console.log('Default admin user created (username: admin, password: admin123)');
      }
      
      connection.release();
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

module.exports = { pool, db, query, initDatabase, useSQLite, saveDatabase };

