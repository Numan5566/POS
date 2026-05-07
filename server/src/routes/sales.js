const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// Helper to generate professional invoice numbers (e.g., INV-171498124)
function generateInvoiceNumber() {
  return `INV-${Date.now().toString().slice(-8)}`;
}

// 1. Process a POS Sale / Checkout (Atomically handles stock deduction and debt ledger updates)
router.post('/', verifyToken, async (req, res) => {
  const { customer_id, items, subtotal, discount, tax, net_amount, payment_method, cash_received, cash_change } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cannot complete checkout with empty cart.' });
  }

  const client = await db.getPool().connect();

  try {
    await client.query('BEGIN');

    // Validate stock and collect product details
    for (const item of items) {
      const prodRes = await client.query('SELECT name, stock_quantity FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      if (prodRes.rowCount === 0) {
        throw new Error(`Product ID ${item.product_id} not found in catalog.`);
      }

      const product = prodRes.rows[0];
      if (product.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for product: ${product.name}. Available: ${product.stock_quantity}, requested: ${item.quantity}`);
      }

      // Deduct Stock
      await client.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    // Handle Customer Debt/Ledger balance update if payment method is 'Debt'
    if (payment_method === 'Debt' && customer_id) {
      await client.query('UPDATE customers SET debt_balance = debt_balance + $1 WHERE id = $2', [parseFloat(net_amount), customer_id]);
    }

    const invoiceNumber = generateInvoiceNumber();

    // Insert Sale record
    const saleRes = await client.query(`
      INSERT INTO sales (invoice_number, user_id, customer_id, subtotal, discount, tax, net_amount, payment_method, cash_received, cash_change)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      invoiceNumber,
      req.user.id,
      customer_id || null,
      parseFloat(subtotal),
      parseFloat(discount || 0),
      parseFloat(tax || 0),
      parseFloat(net_amount),
      payment_method,
      cash_received ? parseFloat(cash_received) : null,
      cash_change ? parseFloat(cash_change) : null,
    ]);

    const completedSale = saleRes.rows[0];

    // Insert Sale Items
    for (const item of items) {
      await client.query(`
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        completedSale.id,
        item.product_id,
        item.quantity,
        parseFloat(item.unit_price),
        parseFloat(item.total_price),
      ]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Checkout completed successfully!',
      invoice: {
        ...completedSale,
        items,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Checkout Transaction Rolled Back:', err.message);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 2. Fetch All Sales Transactions (With customer names & cashiers)
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, c.name as customer_name, u.username as cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch sales error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve sales logs.' });
  }
});

// 3. Get Sale Details (Includes Invoice metadata and full item lists)
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const saleRes = await db.query(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone, u.username as cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `, [id]);

    if (saleRes.rowCount === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const itemsRes = await db.query(`
      SELECT si.*, p.name as product_name, p.barcode
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = $1
    `, [id]);

    res.json({
      ...saleRes.rows[0],
      items: itemsRes.rows,
    });
  } catch (err) {
    console.error('Fetch sale details error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve invoice details.' });
  }
});

// 4. Analytics & Dashboard Reports (Calculates revenue, product volume, and net profit margins!)
router.get('/analytics/reports', verifyToken, async (req, res) => {
  try {
    // A. Financial Summary Cards
    const summaryRes = await db.query(`
      SELECT 
        COALESCE(SUM(s.net_amount), 0) as total_revenue,
        COALESCE(SUM(s.discount), 0) as total_discounts,
        COUNT(s.id) as total_sales_count
      FROM sales s
    `);
    
    // Calculate Cost of Goods Sold (COGS) and Gross Profit
    const profitRes = await db.query(`
      SELECT 
        COALESCE(SUM(si.quantity * p.purchase_price), 0) as total_cogs
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
    `);

    const lowStockCountRes = await db.query('SELECT COUNT(*) FROM products WHERE stock_quantity <= min_stock_alert');
    const customersCountRes = await db.query('SELECT COUNT(*) FROM customers');

    const total_revenue = parseFloat(summaryRes.rows[0].total_revenue);
    const total_cogs = parseFloat(profitRes.rows[0].total_cogs);
    const gross_profit = total_revenue - total_cogs;

    const summaryCards = {
      totalRevenue: total_revenue,
      totalSalesCount: parseInt(summaryRes.rows[0].total_sales_count),
      grossProfit: gross_profit,
      lowStockCount: parseInt(lowStockCountRes.rows[0].count),
      totalCustomers: parseInt(customersCountRes.rows[0].count),
    };

    // B. Payment Method Distribution
    const paymentMethodsRes = await db.query(`
      SELECT payment_method, COUNT(*)::int as count, SUM(net_amount)::float as amount
      FROM sales
      GROUP BY payment_method
    `);

    // C. Daily Sales Trend (Past 10 Days)
    const dailyTrendRes = await db.query(`
      SELECT 
        TO_CHAR(s.created_at, 'YYYY-MM-DD') as date,
        COALESCE(SUM(s.net_amount), 0)::float as revenue,
        COALESCE(SUM(s.net_amount - (
          SELECT SUM(si.quantity * p.purchase_price)
          FROM sale_items si
          LEFT JOIN products p ON si.product_id = p.id
          WHERE si.sale_id = s.id
        )), 0)::float as profit
      FROM sales s
      WHERE s.created_at >= NOW() - INTERVAL '10 days'
      GROUP BY TO_CHAR(s.created_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `);

    // D. Top Selling Products (Top 5 by volume)
    const topProductsRes = await db.query(`
      SELECT 
        p.name as product_name,
        SUM(si.quantity)::int as units_sold,
        SUM(si.total_price)::float as sales_value
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      GROUP BY p.name
      ORDER BY units_sold DESC
      LIMIT 5
    `);

    res.json({
      summaries: summaryCards,
      paymentDistribution: paymentMethodsRes.rows,
      dailyTrend: dailyTrendRes.rows,
      topProducts: topProductsRes.rows,
    });
  } catch (err) {
    console.error('Analytics fetch error:', err.message);
    res.status(500).json({ error: 'Failed to compile business reports.' });
  }
});

module.exports = router;
