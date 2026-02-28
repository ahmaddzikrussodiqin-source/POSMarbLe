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
let dbInitPromise = null;

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
  // If already initializing, wait for it
  if (dbInitPromise) {
    return dbInitPromise;
  }
  
  // If already initialized, return existing db
  if (db && SQL) {
    return db;
  }
  
  // Create new initialization promise
  dbInitPromise = (async () => {
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
  })();
  
  return dbInitPromise;
};

// Helper to run queries based on database type
const query = async (sql, params = []) => {
  if (useSQLite) {
    try {
      // Ensure db is initialized (with race condition protection)
      await useSQLiteAsync();
      
      // Convert undefined values to null for SQLite
      const safeParams = params.map(p => p === undefined ? null : p);
      
      console.log('SQLite Query:', sql.substring(0, 100), 'Params:', safeParams);
      
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
          // Handle case where results is empty (INSERT doesn't return rows)
          const firstResult = results.length > 0 ? results[0] : {};
          return [{ insertId, ...firstResult }];
        }
        // Safe fallback - always return an object with insertId
        return [{ insertId: undefined }];
      }
      
      return [results];
    } catch (error) {
      console.error('SQLite query error:', error);
      console.error('Failed SQL:', sql);
      console.error('Failed Params:', params);
      throw error;
    }
  } else {
    try {
      const [results] = await pool.query(sql, params);
      return [results];
    } catch (error) {
      console.error('MySQL query error:', error);
      console.error('Failed SQL:', sql);
      console.error('Failed Params:', params);
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
    console.log('Starting database initialization...');
    console.log('Using SQLite:', useSQLite);
    
    if (useSQLite) {
      // Initialize sql.js first
      await useSQLiteAsync();
      
      console.log('Initializing SQLite tables...');
      
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
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          image_url TEXT,
          sort_order INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          category_id INTEGER,
          image_url TEXT,
          stock INTEGER DEFAULT 0,
          is_available INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS ingredients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          unit TEXT DEFAULT 'gram',
          stock REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
          user_id INTEGER NOT NULL,
          order_number TEXT UNIQUE NOT NULL,
          total_amount REAL NOT NULL,
          payment_method TEXT DEFAULT 'cash',
          payment_status TEXT DEFAULT 'paid',
          status TEXT DEFAULT 'completed',
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
          user_id INTEGER NOT NULL,
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
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Nota settings table for receipt/invoice configuration
      db.run(`
        CREATE TABLE IF NOT EXISTS nota_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE NOT NULL,
          shop_name TEXT DEFAULT 'Toko Saya',
          address TEXT,
          phone TEXT,
          footer_text TEXT DEFAULT 'Terima kasih telah belanja di toko kami!',
          show_logo INTEGER DEFAULT 1,
          show_qr_code INTEGER DEFAULT 0,
          tax_rate REAL DEFAULT 0,
          currency TEXT DEFAULT 'IDR',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      console.log('SQLite database tables initialized successfully');

      // Migration: Add user_id column to ingredients table if it doesn't exist
      try {
        const tableInfo = db.exec("PRAGMA table_info(ingredients)");
        const hasUserId = tableInfo[0]?.values.some(col => col[1] === 'user_id');
        if (!hasUserId) {
          console.log('Migrating: Adding user_id column to ingredients table...');
          db.run('ALTER TABLE ingredients ADD COLUMN user_id INTEGER DEFAULT 1');
          db.run('UPDATE ingredients SET user_id = 1 WHERE user_id IS NULL');
          console.log('Migration complete: user_id column added to ingredients');
        } else {
          console.log('Migration: ingredients table already has user_id column');
        }
      } catch (migrationError) {
        console.log('Migration check/error for ingredients:', migrationError.message);
      }

      // Migration: Add user_id column to categories table if it doesn't exist
      try {
        const tableInfo = db.exec("PRAGMA table_info(categories)");
        const hasUserId = tableInfo[0]?.values.some(col => col[1] === 'user_id');
        if (!hasUserId) {
          console.log('Migrating: Adding user_id column to categories table...');
          db.run('ALTER TABLE categories ADD COLUMN user_id INTEGER DEFAULT 1');
          db.run('UPDATE categories SET user_id = 1 WHERE user_id IS NULL');
          console.log('Migration complete: user_id column added to categories');
        } else {
          console.log('Migration: categories table already has user_id column');
        }
      } catch (migrationError) {
        console.log('Migration check/error for categories:', migrationError.message);
      }

      // Migration: Add user_id column to products table if it doesn't exist
      try {
        const tableInfo = db.exec("PRAGMA table_info(products)");
        const hasUserId = tableInfo[0]?.values.some(col => col[1] === 'user_id');
        if (!hasUserId) {
          console.log('Migrating: Adding user_id column to products table...');
          db.run('ALTER TABLE products ADD COLUMN user_id INTEGER DEFAULT 1');
          db.run('UPDATE products SET user_id = 1 WHERE user_id IS NULL');
          console.log('Migration complete: user_id column added to products');
        } else {
          console.log('Migration: products table already has user_id column');
        }
      } catch (migrationError) {
        console.log('Migration check/error for products:', migrationError.message);
      }

      // Migration: Add user_id column to orders table if it doesn't exist
      try {
        const tableInfo = db.exec("PRAGMA table_info(orders)");
        const hasUserId = tableInfo[0]?.values.some(col => col[1] === 'user_id');
        if (!hasUserId) {
          console.log('Migrating: Adding user_id column to orders table...');
          db.run('ALTER TABLE orders ADD COLUMN user_id INTEGER DEFAULT 1');
          db.run('UPDATE orders SET user_id = 1 WHERE user_id IS NULL');
          console.log('Migration complete: user_id column added to orders');
        } else {
          console.log('Migration: orders table already has user_id column');
        }
      } catch (migrationError) {
        console.log('Migration check/error for orders:', migrationError.message);
      }

      // Migration: Add user_id column to purchases table if it doesn't exist
      try {
        const tableInfo = db.exec("PRAGMA table_info(purchases)");
        const hasUserId = tableInfo[0]?.values.some(col => col[1] === 'user_id');
        if (!hasUserId) {
          console.log('Migrating: Adding user_id column to purchases table...');
          db.run('ALTER TABLE purchases ADD COLUMN user_id INTEGER DEFAULT 1');
          db.run('UPDATE purchases SET user_id = 1 WHERE user_id IS NULL');
          console.log('Migration complete: user_id column added to purchases');
        } else {
          console.log('Migration: purchases table already has user_id column');
        }
      } catch (migrationError) {
        console.log('Migration check/error for purchases:', migrationError.message);
      }

      // Migration: Add user_id column to nota_settings table if it doesn't exist (SQLite)
      try {
        const tableInfo = db.exec("PRAGMA table_info(nota_settings)");
        const hasUserId = tableInfo[0]?.values.some(col => col[1] === 'user_id');
        if (!hasUserId) {
          console.log('Migrating: Adding user_id column to nota_settings table...');
          db.run('ALTER TABLE nota_settings ADD COLUMN user_id INTEGER DEFAULT 1');
          db.run('UPDATE nota_settings SET user_id = 1 WHERE user_id IS NULL');
          console.log('Migration complete: user_id column added to nota_settings');
        } else {
          console.log('Migration: nota_settings table already has user_id column');
        }
      } catch (migrationError) {
        console.log('Migration check/error for nota_settings:', migrationError.message);
      }

      // Migration: Add logo column to nota_settings table if it doesn't exist (SQLite)
      try {
        const tableInfo = db.exec("PRAGMA table_info(nota_settings)");
        const hasLogo = tableInfo[0]?.values.some(col => col[1] === 'logo');
        if (!hasLogo) {
          console.log('Migrating: Adding logo column to nota_settings table...');
          db.run('ALTER TABLE nota_settings ADD COLUMN logo TEXT');
          console.log('Migration complete: logo column added to nota_settings');
        } else {
          console.log('Migration: nota_settings table already has logo column');
        }
      } catch (migrationError) {
        console.log('Migration check/error for nota_settings logo:', migrationError.message);
      }

      // Create default admin user if not exists
      try {
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
        } else {
          console.log('Default admin user already exists');
        }
      } catch (userError) {
        console.error('Error creating default admin user:', userError.message);
      }
      
      // Save database after initialization
      try {
        saveDatabase();
        console.log('Database saved successfully after initialization');
      } catch (saveError) {
        console.error('Error saving database:', saveError.message);
      }
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
          user_id INT NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          image_url VARCHAR(255),
          sort_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) NOT NULL,
          category_id INT,
          image_url VARCHAR(255),
          stock INT DEFAULT 0,
          is_available BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS ingredients (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          name VARCHAR(100) NOT NULL,
          unit VARCHAR(20) DEFAULT 'gram',
          stock DECIMAL(10, 2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
          user_id INT NOT NULL,
          order_number VARCHAR(50) UNIQUE NOT NULL,
          total_amount DECIMAL(10, 2) NOT NULL,
          payment_method ENUM('cash', 'qris', 'debit') DEFAULT 'cash',
          payment_status ENUM('pending', 'paid', 'cancelled') DEFAULT 'paid',
          status ENUM('pending', 'completed', 'cancelled') DEFAULT 'completed',
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          product_id INT,
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
          user_id INT NOT NULL,
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
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Nota settings table for receipt/invoice configuration
      await connection.query(`
        CREATE TABLE IF NOT EXISTS nota_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT UNIQUE NOT NULL,
          shop_name VARCHAR(100) DEFAULT 'Toko Saya',
          address VARCHAR(255),
          phone VARCHAR(20),
          footer_text VARCHAR(255) DEFAULT 'Terima kasih telah belanja di toko kami!',
          show_logo BOOLEAN DEFAULT TRUE,
          show_qr_code BOOLEAN DEFAULT FALSE,
          tax_rate DECIMAL(5,2) DEFAULT 0,
          currency VARCHAR(10) DEFAULT 'IDR',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Migration: Add user_id column to ingredients table if it doesn't exist (MySQL)
      try {
        const [columns] = await connection.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'ingredients' AND COLUMN_NAME = 'user_id'
        `);
        if (columns.length === 0) {
          console.log('Migrating MySQL: Adding user_id column to ingredients table...');
          await connection.query('ALTER TABLE ingredients ADD COLUMN user_id INT DEFAULT 1');
          await connection.query('UPDATE ingredients SET user_id = 1 WHERE user_id IS NULL');
          console.log('Migration complete: user_id column added to ingredients (MySQL)');
        } else {
          console.log('Migration: MySQL ingredients table already has user_id column');
        }
      } catch (migrationError) {
        console.log('Migration check/error for MySQL ingredients:', migrationError.message);
      }

      // Migration: Add user_id column to categories table if it doesn't exist (MySQL)
      try {
        const [columns] = await connection.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'categories' AND COLUMN_NAME = 'user_id'
        `);
        if (columns.length === 0) {
          console.log('Migrating MySQL: Adding user_id column to categories table...');
          await connection.query('ALTER TABLE categories ADD COLUMN user_id INT DEFAULT 1');
          await connection.query('UPDATE categories SET user_id = 1 WHERE user_id IS NULL');
          console.log('Migration complete: user_id column added to categories (MySQL)');
        } else {
          console.log('Migration: MySQL categories table already has user_id column');
        }
      } catch (migrationError) {
        console.log('Migration check/error for MySQL categories:', migrationError.message);
      }

      // Migration: Add user_id column to products table if it doesn't exist (MySQL)
      try {
        const [columns] = await connection.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'user_id'
        `);
        if (columns.length === 0) {
          console.log('Migrating MySQL: Adding user_id column to products table...');
          await connection.query('ALTER TABLE products ADD COLUMN user_id INT DEFAULT 1');
          await connection.query('UPDATE products SET user_id = 1 WHERE user_id IS NULL');
          console.log('Migration complete: user_id column added to products (MySQL)');
        } else {
          console.log('Migration: MySQL products table already has user_id column');
        }
      } catch (migrationError) {
        console.log('Migration check/error for MySQL products:', migrationError.message);
      }

      // Migration: Add user_id column to orders table if it doesn't exist (MySQL)
      try {
        const [columns] = await connection.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'orders' AND COLUMN_NAME = 'user_id'
        `);
        if (columns.length === 0) {
          console.log('Migrating MySQL: Adding user_id column to orders table...');
          await connection.query('ALTER TABLE orders ADD COLUMN user_id INT DEFAULT 1');
          await connection.query('UPDATE orders SET user_id = 1 WHERE user_id IS NULL');
          console.log('Migration complete: user_id column added to orders (MySQL)');
        } else {
          console.log('Migration: MySQL orders table already has user_id column');
        }
      } catch (migrationError) {
        console.log('Migration check/error for MySQL orders:', migrationError.message);
      }

      // Migration: Add user_id column to purchases table if it doesn't exist (MySQL)
      try {
        const [columns] = await connection.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'purchases' AND COLUMN_NAME = 'user_id'
        `);
        if (columns.length === 0) {
          console.log('Migrating MySQL: Adding user_id column to purchases table...');
          await connection.query('ALTER TABLE purchases ADD COLUMN user_id INT DEFAULT 1');
          await connection.query('UPDATE purchases SET user_id = 1 WHERE user_id IS NULL');
          console.log('Migration complete: user_id column added to purchases (MySQL)');
        } else {
          console.log('Migration: MySQL purchases table already has user_id column');
        }
      } catch (migrationError) {
        console.log('Migration check/error for MySQL purchases:', migrationError.message);
      }

      // Migration: Add user_id column to nota_settings table if it doesn't exist (MySQL)
      try {
        const [columns] = await connection.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'nota_settings' AND COLUMN_NAME = 'user_id'
        `);
        if (columns.length === 0) {
          console.log('Migrating MySQL: Adding user_id column to nota_settings table...');
          await connection.query('ALTER TABLE nota_settings ADD COLUMN user_id INT DEFAULT 1');
          await connection.query('UPDATE nota_settings SET user_id = 1 WHERE user_id IS NULL');
          console.log('Migration complete: user_id column added to nota_settings (MySQL)');
        } else {
          console.log('Migration: MySQL nota_settings table already has user_id column');
        }
      } catch (migrationError) {
        console.log('Migration check/error for MySQL nota_settings:', migrationError.message);
      }

      // Migration: Add logo column to nota_settings table if it doesn't exist (MySQL)
      try {
        const [columns] = await connection.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'nota_settings' AND COLUMN_NAME = 'logo'
        `);
        if (columns.length === 0) {
          console.log('Migrating MySQL: Adding logo column to nota_settings table...');
          await connection.query('ALTER TABLE nota_settings ADD COLUMN logo TEXT');
          console.log('Migration complete: logo column added to nota_settings (MySQL)');
        } else {
          console.log('Migration: MySQL nota_settings table already has logo column');
        }
      } catch (migrationError) {
        console.log('Migration check/error for MySQL nota_settings logo:', migrationError.message);
      }

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
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
};

module.exports = { pool, db, query, initDatabase, useSQLite, saveDatabase };
