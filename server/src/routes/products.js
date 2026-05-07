const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// 1. Get All Products (Includes joins for Category and support for search filters)
router.get('/', verifyToken, async (req, res) => {
  const { search, category_id } = req.query;
  let queryText = `
    SELECT p.*, c.name as category_name 
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
  `;
  const queryParams = [];

  const conditions = [];
  if (search) {
    queryParams.push(`%${search.trim()}%`);
    conditions.push(`(p.name ILIKE $${queryParams.length} OR p.barcode LIKE $${queryParams.length})`);
  }
  if (category_id) {
    queryParams.push(parseInt(category_id));
    conditions.push(`p.category_id = $${queryParams.length}`);
  }

  if (conditions.length > 0) {
    queryText += ` WHERE ` + conditions.join(' AND ');
  }

  queryText += ` ORDER BY p.name ASC`;

  try {
    const result = await db.query(queryText, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch products error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve products.' });
  }
});

// 2. Get Low Stock Products (Less than min_stock_alert)
router.get('/low-stock', verifyToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.stock_quantity <= p.min_stock_alert
      ORDER BY p.stock_quantity ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch low stock error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve low stock products.' });
  }
});

// 3. Get Product By Barcode (Highly optimized checkout lookup)
router.get('/barcode/:barcode', verifyToken, async (req, res) => {
  const { barcode } = req.params;
  try {
    const result = await db.query(`
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.barcode = $1
    `, [barcode.trim()]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product with this barcode not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch barcode error:', err.message);
    res.status(500).json({ error: 'Database search error.' });
  }
});

// 4. Add New Product (Admin Only)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { name, barcode, purchase_price, retail_price, stock_quantity, min_stock_alert, category_id } = req.body;

  if (!name || !barcode || purchase_price === undefined || retail_price === undefined) {
    return res.status(400).json({ error: 'Please supply name, barcode, purchase price, and retail price.' });
  }

  try {
    // Check barcode duplication
    const checkBarcode = await db.query('SELECT name FROM products WHERE barcode = $1', [barcode.trim()]);
    if (checkBarcode.rowCount > 0) {
      return res.status(400).json({ error: `Barcode already in use by product: ${checkBarcode.rows[0].name}` });
    }

    const result = await db.query(`
      INSERT INTO products (name, barcode, purchase_price, retail_price, stock_quantity, min_stock_alert, category_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      name.trim(),
      barcode.trim(),
      parseFloat(purchase_price),
      parseFloat(retail_price),
      parseInt(stock_quantity || 0),
      parseInt(min_stock_alert || 5),
      category_id ? parseInt(category_id) : null,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add product error:', err.message);
    res.status(500).json({ error: 'Failed to add product to catalog.' });
  }
});

// 5. Update Product (Admin Only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, barcode, purchase_price, retail_price, stock_quantity, min_stock_alert, category_id } = req.body;

  if (!name || !barcode || purchase_price === undefined || retail_price === undefined) {
    return res.status(400).json({ error: 'Please supply name, barcode, purchase price, and retail price.' });
  }

  try {
    // Check barcode duplication
    const checkBarcode = await db.query('SELECT name FROM products WHERE barcode = $1 AND id <> $2', [barcode.trim(), id]);
    if (checkBarcode.rowCount > 0) {
      return res.status(400).json({ error: `Barcode already in use by another product: ${checkBarcode.rows[0].name}` });
    }

    const result = await db.query(`
      UPDATE products 
      SET name = $1, barcode = $2, purchase_price = $3, retail_price = $4, stock_quantity = $5, min_stock_alert = $6, category_id = $7
      WHERE id = $8
      RETURNING *
    `, [
      name.trim(),
      barcode.trim(),
      parseFloat(purchase_price),
      parseFloat(retail_price),
      parseInt(stock_quantity || 0),
      parseInt(min_stock_alert || 5),
      category_id ? parseInt(category_id) : null,
      id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update product error:', err.message);
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

// 6. Delete Product (Admin Only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ message: 'Product deleted successfully!', product: result.rows[0] });
  } catch (err) {
    console.error('Delete product error:', err.message);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

module.exports = router;
