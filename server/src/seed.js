const bcrypt = require('bcryptjs');
const db = require('./db');

async function seedDatabase() {
  console.log('Seeding database with professional mock data...');
  
  try {
    // 1. Initialize tables first
    await db.initDatabase();

    // 2. Seed Default Users
    console.log('Seeding Users...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const cashierPassword = await bcrypt.hash('cashier123', 10);

    await db.query(`
      INSERT INTO users (username, password, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (username) DO NOTHING
    `, ['admin', adminPassword, 'admin']);

    await db.query(`
      INSERT INTO users (username, password, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (username) DO NOTHING
    `, ['cashier', cashierPassword, 'cashier']);

    // 3. Seed Categories
    console.log('Seeding Categories...');
    const beverageRes = await db.query(`
      INSERT INTO categories (name, description)
      VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, ['Beverages', 'Soft drinks, juices, energy drinks, mineral water']);
    const beverageId = beverageRes.rows[0].id;

    const snackRes = await db.query(`
      INSERT INTO categories (name, description)
      VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, ['Snacks & Confectionery', 'Chips, biscuits, chocolates, candies']);
    const snackId = snackRes.rows[0].id;

    const groceryRes = await db.query(`
      INSERT INTO categories (name, description)
      VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, ['Grocery Essentials', 'Cooking oil, flour, sugar, lentils, tea, soaps, detergents']);
    const groceryId = groceryRes.rows[0].id;

    // 4. Seed Products
    console.log('Seeding Products...');
    const mockProducts = [
      { name: 'Coca Cola Can 250ml', barcode: '111111', purchase_price: 85.00, retail_price: 100.00, stock_quantity: 60, min_stock_alert: 10, category_id: beverageId },
      { name: 'Pepsi Bottle 1.5L', barcode: '121212', purchase_price: 160.00, retail_price: 190.00, stock_quantity: 25, min_stock_alert: 5, category_id: beverageId },
      { name: 'Lays Masala Large', barcode: '222222', purchase_price: 120.00, retail_price: 150.00, stock_quantity: 45, min_stock_alert: 8, category_id: snackId },
      { name: 'Oreo Biscuit Family Pack', barcode: '232323', purchase_price: 75.00, retail_price: 90.00, stock_quantity: 35, min_stock_alert: 6, category_id: snackId },
      { name: 'National Tomato Ketchup', barcode: '333333', purchase_price: 290.00, retail_price: 340.00, stock_quantity: 3, min_stock_alert: 5, category_id: groceryId }, // Low stock product
      { name: 'Ariel Detergent Powder 1kg', barcode: '444444', purchase_price: 520.00, retail_price: 610.00, stock_quantity: 18, min_stock_alert: 5, category_id: groceryId },
      { name: 'Tapal Danedar Tea 430g', barcode: '555555', purchase_price: 430.00, retail_price: 490.00, stock_quantity: 12, min_stock_alert: 4, category_id: groceryId },
    ];

    for (const prod of mockProducts) {
      await db.query(`
        INSERT INTO products (name, barcode, purchase_price, retail_price, stock_quantity, min_stock_alert, category_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (barcode) DO UPDATE SET 
          name = EXCLUDED.name,
          purchase_price = EXCLUDED.purchase_price,
          retail_price = EXCLUDED.retail_price,
          stock_quantity = EXCLUDED.stock_quantity,
          min_stock_alert = EXCLUDED.min_stock_alert,
          category_id = EXCLUDED.category_id
      `, [prod.name, prod.barcode, prod.purchase_price, prod.retail_price, prod.stock_quantity, prod.min_stock_alert, prod.category_id]);
    }

    // 5. Seed Customers
    console.log('Seeding Customers...');
    await db.query(`
      INSERT INTO customers (name, phone, email, debt_balance)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (phone) DO NOTHING
    `, ['Walk-in Customer', null, null, 0.00]);

    await db.query(`
      INSERT INTO customers (name, phone, email, debt_balance)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (phone) DO NOTHING
    `, ['Muhammad Numan', '03123456789', 'numan@example.com', 1250.00]);

    await db.query(`
      INSERT INTO customers (name, phone, email, debt_balance)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (phone) DO NOTHING
    `, ['Ali Raza', '03219876543', 'ali@example.com', 0.00]);

    // 6. Seed Settings
    console.log('Seeding Settings...');
    const checkSet = await db.query('SELECT COUNT(*) FROM settings');
    if (parseInt(checkSet.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO settings (store_name, store_phone, store_address, receipt_footer, tax_rate)
        VALUES ('Grand Supermarket', '0300-1234567', 'Main Boulevard, Sector G, Lahore', 'Thank you for shopping! Powered by NumanPOS', 0.00)
      `);
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during seeding database:', err.message);
    process.exit(1);
  }
}

seedDatabase();
