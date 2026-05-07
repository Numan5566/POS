const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// 1. Get All Customers
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM customers ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch customers error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve customers.' });
  }
});

// 2. Add New Customer
router.post('/', verifyToken, async (req, res) => {
  const { name, phone, email, debt_balance } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }

  try {
    // Check phone duplication if phone is provided
    if (phone) {
      const checkExist = await db.query('SELECT name FROM customers WHERE phone = $1', [phone.trim()]);
      if (checkExist.rowCount > 0) {
        return res.status(400).json({ error: `Phone number already registered to customer: ${checkExist.rows[0].name}` });
      }
    }

    const result = await db.query(
      'INSERT INTO customers (name, phone, email, debt_balance) VALUES ($1, $2, $3, $4) RETURNING *',
      [
        name.trim(),
        phone ? phone.trim() : null,
        email ? email.trim().toLowerCase() : null,
        parseFloat(debt_balance || 0.00),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create customer error:', err.message);
    res.status(500).json({ error: 'Failed to create customer.' });
  }
});

// 3. Update Customer Details
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, debt_balance } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }

  try {
    if (phone) {
      const checkExist = await db.query('SELECT name FROM customers WHERE phone = $1 AND id <> $2', [phone.trim(), id]);
      if (checkExist.rowCount > 0) {
        return res.status(400).json({ error: `Phone number already registered to customer: ${checkExist.rows[0].name}` });
      }
    }

    const result = await db.query(
      'UPDATE customers SET name = $1, phone = $2, email = $3, debt_balance = $4 WHERE id = $5 RETURNING *',
      [
        name.trim(),
        phone ? phone.trim() : null,
        email ? email.trim().toLowerCase() : null,
        parseFloat(debt_balance || 0.00),
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update customer error:', err.message);
    res.status(500).json({ error: 'Failed to update customer.' });
  }
});

// 4. Record Debt Payment (Customer pays down their credit ledger)
router.post('/:id/pay-debt', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Please specify a positive payment amount.' });
  }

  try {
    const custRes = await db.query('SELECT debt_balance, name FROM customers WHERE id = $1', [id]);
    if (custRes.rowCount === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const currentBalance = parseFloat(custRes.rows[0].debt_balance);
    const updatedBalance = currentBalance - parseFloat(amount);

    const updateRes = await db.query(
      'UPDATE customers SET debt_balance = $1 WHERE id = $2 RETURNING *',
      [updatedBalance, id]
    );

    res.json({
      message: `Successfully recorded payment of Rs. ${parseFloat(amount).toFixed(2)} for ${custRes.rows[0].name}.`,
      customer: updateRes.rows[0],
    });
  } catch (err) {
    console.error('Record debt payment error:', err.message);
    res.status(500).json({ error: 'Database transaction error.' });
  }
});

// 5. Get Customer Sales History
router.get('/:id/sales', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM sales WHERE customer_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch customer sales error:', err.message);
    res.status(500).json({ error: 'Failed to fetch customer purchase history.' });
  }
});

// 6. Delete Customer (Admin Only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    res.json({ message: 'Customer deleted successfully!', customer: result.rows[0] });
  } catch (err) {
    console.error('Delete customer error:', err.message);
    res.status(500).json({ error: 'Failed to delete customer.' });
  }
});

module.exports = router;
