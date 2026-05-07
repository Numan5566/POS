const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// 1. User Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Please provide both username and password.' });
  }

  try {
    const userRes = await db.query('SELECT * FROM users WHERE username = $1', [username.toLowerCase().trim()]);
    if (userRes.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'super_secret_pos_key_2026_987654321_abcdef',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// 2. Register User (Admin Only, unless no users exist in system yet)
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    // Check if any users exist
    const countRes = await db.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(countRes.rows[0].count);

    // If users exist, we require admin authentication to create another user
    if (userCount > 0) {
      // Manual verification of token inside registration if users exist
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Access denied. Admin authorization required to register users.' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_pos_key_2026_987654321_abcdef');
        if (decoded.role !== 'admin') {
          return res.status(403).json({ error: 'Forbidden. Only administrators can register new users.' });
        }
      } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
      }
    }

    // Check if username is taken
    const userExistRes = await db.query('SELECT 1 FROM users WHERE username = $1', [username.toLowerCase().trim()]);
    if (userExistRes.rowCount > 0) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // If first user, force admin role
    const finalRole = userCount === 0 ? 'admin' : (role || 'cashier');

    const newUserRes = await db.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
      [username.toLowerCase().trim(), hashedPassword, finalRole]
    );

    res.status(201).json({
      message: 'User registered successfully!',
      user: newUserRes.rows[0],
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// 3. Verify Token
router.get('/verify', verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// 4. Get List of Users (Admin only)
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const usersRes = await db.query('SELECT id, username, role, created_at FROM users ORDER BY username ASC');
    res.json(usersRes.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

module.exports = router;
