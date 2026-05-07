const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// 1. Get POS Settings (Always returns a single configuration row)
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM settings LIMIT 1');
    if (result.rowCount === 0) {
      // Seed default settings row if missing
      const seedRes = await db.query(`
        INSERT INTO settings (store_name, store_phone, store_address, receipt_footer, tax_rate)
        VALUES ('Grand Supermarket', '0300-1234567', 'Main Boulevard, Sector G, Lahore', 'Thank you for shopping! Powered by NumanPOS', 0.00)
        RETURNING *
      `);
      return res.json(seedRes.rows[0]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch settings error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve settings.' });
  }
});

// 2. Update POS Settings (Admin Only)
router.put('/', verifyToken, requireAdmin, async (req, res) => {
  const { store_name, store_phone, store_address, receipt_footer, tax_rate } = req.body;

  try {
    const checkSettings = await db.query('SELECT id FROM settings LIMIT 1');
    let result;

    if (checkSettings.rowCount === 0) {
      result = await db.query(`
        INSERT INTO settings (store_name, store_phone, store_address, receipt_footer, tax_rate)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [store_name, store_phone, store_address, receipt_footer, parseFloat(tax_rate || 0)]);
    } else {
      const id = checkSettings.rows[0].id;
      result = await db.query(`
        UPDATE settings
        SET store_name = $1, store_phone = $2, store_address = $3, receipt_footer = $4, tax_rate = $5
        WHERE id = $6
        RETURNING *
      `, [store_name, store_phone, store_address, receipt_footer, parseFloat(tax_rate || 0), id]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update settings error:', err.message);
    res.status(500).json({ error: 'Failed to update system settings.' });
  }
});

module.exports = router;
