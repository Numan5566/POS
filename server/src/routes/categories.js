const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// 1. Get All Categories
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch categories error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
});

// 2. Add New Category
router.post('/', verifyToken, async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    const checkExist = await db.query('SELECT 1 FROM categories WHERE LOWER(name) = LOWER($1)', [name.trim()]);
    if (checkExist.rowCount > 0) {
      return res.status(400).json({ error: 'Category with this name already exists.' });
    }

    const result = await db.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name.trim(), description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create category error:', err.message);
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// 3. Update Category (Admin Only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    const checkExist = await db.query(
      'SELECT 1 FROM categories WHERE LOWER(name) = LOWER($1) AND id <> $2',
      [name.trim(), id]
    );
    if (checkExist.rowCount > 0) {
      return res.status(400).json({ error: 'Another category with this name already exists.' });
    }

    const result = await db.query(
      'UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name.trim(), description || '', id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update category error:', err.message);
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

// 4. Delete Category (Admin Only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    res.json({ message: 'Category deleted successfully!', category: result.rows[0] });
  } catch (err) {
    console.error('Delete category error:', err.message);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

module.exports = router;
