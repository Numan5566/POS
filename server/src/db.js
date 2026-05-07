const { Pool, Client } = require('pg');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
};

const targetDb = process.env.DB_NAME || 'pos_db';

let pool;

async function initDatabase() {
  // 1. Connect to default 'postgres' database to ensure our target database exists
  const defaultClient = new Client({
    ...dbConfig,
    database: 'postgres',
  });

  try {
    await defaultClient.connect();
    const res = await defaultClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [targetDb]);
    
    if (res.rowCount === 0) {
      console.log(`Database '${targetDb}' does not exist. Creating it now...`);
      // Create database cannot run inside a transaction, must be run on a simple connection
      await defaultClient.query(`CREATE DATABASE ${targetDb}`);
      console.log(`Database '${targetDb}' created successfully!`);
    } else {
      console.log(`Database '${targetDb}' already exists.`);
    }
  } catch (err) {
    console.error('Error checking/creating database:', err.message);
    console.log('Ensure your PostgreSQL service is running and credentials in .env are correct.');
  } finally {
    await defaultClient.end();
  }

  // 2. Initialize connection pool to the target database
  pool = new Pool({
    ...dbConfig,
    database: targetDb,
  });

  // 3. Create tables if they do not exist
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database pool.');

    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'cashier',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT
      )
    `);

    // Products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        barcode VARCHAR(100) UNIQUE NOT NULL,
        purchase_price DECIMAL(10, 2) NOT NULL,
        retail_price DECIMAL(10, 2) NOT NULL,
        stock_quantity INT DEFAULT 0,
        min_stock_alert INT DEFAULT 5,
        category_id INT REFERENCES categories(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Customers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(20) UNIQUE,
        email VARCHAR(100),
        debt_balance DECIMAL(10, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sales table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        discount DECIMAL(10, 2) DEFAULT 0.00,
        tax DECIMAL(10, 2) DEFAULT 0.00,
        net_amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        cash_received DECIMAL(10, 2),
        cash_change DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sale items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INT REFERENCES sales(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id) ON DELETE SET NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL
      )
    `);

    // Settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        store_name VARCHAR(100) DEFAULT 'My Store',
        store_phone VARCHAR(50) DEFAULT '123-456-7890',
        store_address TEXT DEFAULT '123 Main St',
        receipt_footer TEXT DEFAULT 'Thank you for shopping with us!',
        tax_rate DECIMAL(5, 2) DEFAULT 0.00
      )
    `);

    await client.query('COMMIT');
    client.release();
    console.log('Database tables verified/created successfully.');
  } catch (err) {
    console.error('Error during database table initialization:', err.message);
  }
}

// Export a query function and the pool
module.exports = {
  initDatabase,
  query: (text, params) => {
    if (!pool) {
      pool = new Pool({
        ...dbConfig,
        database: targetDb,
      });
    }
    return pool.query(text, params);
  },
  getPool: () => pool,
};
