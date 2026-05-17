import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import oracledb from 'oracledb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initializePool, getConnection, closePool } from './db.js';
import gstExportRoutes from './routes/gstExports.js';
import onboardingRoutes from './routes/onboarding.js';

dotenv.config();

// ✅ FIX: Auto-convert Oracle CLOBs to plain JS strings
// Without this, setting_value (CLOB type) returns LOB objects → '[object Object]'
oracledb.fetchAsString = [oracledb.CLOB];

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = '1d';

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

// Initialize database pool on startup
await initializePool();

// Routes
app.use('/api/onboarding', onboardingRoutes);

const createToken = (user) => {
  return jwt.sign(
    {
      id: user.ID,
      name: user.NAME,
      email: user.EMAIL,
      role: user.ROLE
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const formatUserResponse = (row, token) => ({
  user_id: row.ID,
  name: row.NAME,
  email: row.EMAIL,
  role: row.ROLE,
  token
});

import { authenticateToken } from './middleware/auth.js';

// ==================== AUTH API ====================

app.post('/api/auth/register', async (req, res) => {
  let connection;
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    connection = await getConnection();

    const existing = await connection.execute(
      `SELECT ID FROM users WHERE LOWER(EMAIL) = LOWER(:email)`,
      { email },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (existing.rows && existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    await connection.execute(
      `INSERT INTO users (NAME, EMAIL, PASSWORD, ORGANIZATION, ROLE, CREATED_AT)
       VALUES (:name, :email, :password_hash, NULL, :role, SYSDATE)`,
      {
        name,
        email,
        password_hash,
        role: role && (role.toLowerCase() === 'admin' || role.toLowerCase() === 'staff') ? role : 'Admin' // Default to Admin for new owners
      },
      { autoCommit: true }
    );

    const result = await connection.execute(
      `SELECT ID, NAME, EMAIL, ROLE FROM users WHERE LOWER(EMAIL) = LOWER(:email)`,
      { email },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const user = result.rows[0];
    const token = createToken(user);
    res.status(201).json(formatUserResponse(user, token));
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    res.status(500).json({ message: 'Registration failed', details: error.message });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    connection = await getConnection();

    const result = await connection.execute(
      `SELECT ID, NAME, EMAIL, PASSWORD, ROLE FROM users WHERE LOWER(EMAIL) = LOWER(:email)`,
      { email },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const user = result.rows?.[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    let isValid = false;
    const storedPassword = user.PASSWORD || '';

    if (/^\$2[aby]\$/.test(storedPassword)) {
      isValid = await bcrypt.compare(password, storedPassword);
    } else {
      isValid = storedPassword === password;
      if (isValid) {
        const newHash = await bcrypt.hash(password, 10);
        await connection.execute(
          `UPDATE users SET PASSWORD = :password WHERE ID = :id`,
          { password: newHash, id: user.ID },
          { autoCommit: true }
        );
      }
    }

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = createToken(user);
    res.status(200).json(formatUserResponse(user, token));
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ message: 'Login failed', details: error.message });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// Apply authentication middleware to all routes below (except auth routes above)
app.use('/api/suppliers', authenticateToken);
app.use('/api/products', authenticateToken);
app.use('/api/customers', authenticateToken);
app.use('/api/purchases', authenticateToken);
app.use('/api/purchase-return', authenticateToken);
app.use('/api/purchase-returns', authenticateToken);
app.use('/api/sales', authenticateToken);
app.use('/api/sales/return', authenticateToken);
app.use('/api/stock-report', authenticateToken);
app.use('/api/export', authenticateToken);
app.use('/api/exports', authenticateToken);
app.use('/api/dashboard', authenticateToken);
app.use('/api/settings', authenticateToken);  // ✅ FIX: Settings requires authentication

// Register GST Export routes
app.use('/api/exports', gstExportRoutes);

// ==================== SUPPLIERS API ====================

// GET /api/suppliers - Fetch suppliers (supports ?search= and ?q=)
app.get('/api/suppliers', async (req, res) => {
  let connection;
  try {
    const { search, q } = req.query;
    const searchTerm = q || search;
    const userId = req.user.id;
    connection = await getConnection();
    
    let query = `SELECT supplier_id, supplier_name, gst_number, phone_number, email_id FROM suppliers WHERE is_active = 1 AND user_id = :userId`;
    const binds = { userId };
    
    if (searchTerm) {
      query += ` AND (UPPER(supplier_name) LIKE :q OR UPPER(gst_number) LIKE :q)`;
      binds.q = `%${searchTerm.toUpperCase()}%`;
    }
    
    query += ` ORDER BY supplier_name FETCH FIRST 10 ROWS ONLY`;
    
    const result = await connection.execute(query, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error('❌ Supplier fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch suppliers', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.get('/api/suppliers/search', async (req, res) => {
  let connection;
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(200).json({ success: true, data: [] });
    }

    connection = await getConnection();
    const userId = req.user.id;
    const searchTerm = `%${q.toUpperCase()}%`;
    const result = await connection.execute(
      `SELECT supplier_id, supplier_name, gst_number, phone_number, email_id 
       FROM suppliers 
       WHERE (UPPER(supplier_name) LIKE :q OR UPPER(gst_number) LIKE :q) 
       AND is_active = 1 AND user_id = :userId`,
      { q: searchTerm, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error('❌ Supplier search error:', error.message);
    res.status(500).json({ error: 'Search failed', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// POST /api/suppliers - Create a new supplier
app.post('/api/suppliers', async (req, res) => {
  let connection;
  try {
    const { supplier_name, gst_number, phone_number, email_id } = req.body;

    if (!supplier_name || !supplier_name.trim()) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    connection = await getConnection();
    const userId = req.user.id;

    // Check if supplier already exists (by name or GST) PER USER
    const existingCheck = await connection.execute(
      `SELECT supplier_id FROM suppliers 
       WHERE (UPPER(supplier_name) = UPPER(:name) 
       OR (gst_number IS NOT NULL AND gst_number = :gst))
       AND user_id = :userId`,
      { 
        name: supplier_name.trim(),
        gst: gst_number || null,
        userId
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (existingCheck.rows && existingCheck.rows.length > 0) {
      // Return existing supplier
      const supplierId = existingCheck.rows[0].SUPPLIER_ID;
      const result = await connection.execute(
        `SELECT supplier_id, supplier_name, gst_number, phone_number, email_id 
         FROM suppliers WHERE supplier_id = :id AND user_id = :userId`,
        { id: supplierId, userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      await connection.close();
      return res.status(200).json({ 
        success: true, 
        data: result.rows[0],
        isNew: false 
      });
    }

    // Create new supplier
    const insertResult = await connection.execute(
      `INSERT INTO suppliers (supplier_name, gst_number, phone_number, email_id, is_active, created_at, user_id)
       VALUES (:name, :gst, :phone, :email, 1, SYSDATE, :userId)`,
      {
        name: supplier_name.trim(),
        gst: gst_number || null,
        phone: phone_number || null,
        email: email_id || null,
        userId
      },
      { autoCommit: true }
    );

    // Get the inserted supplier ID
    const idResult = await connection.execute(
      `SELECT supplier_id FROM suppliers WHERE supplier_name = :name AND user_id = :userId ORDER BY created_at DESC FETCH FIRST 1 ROW ONLY`,
      { name: supplier_name.trim(), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const supplierId = idResult.rows[0].SUPPLIER_ID;
    console.log('✅ New supplier created:', supplierId);

    // Fetch the created supplier
    const result = await connection.execute(
      `SELECT supplier_id, supplier_name, gst_number, phone_number, email_id 
       FROM suppliers WHERE supplier_id = :id AND user_id = :userId`,
      { id: supplierId, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    await connection.close();
    
    res.status(201).json({ 
      success: true, 
      data: result.rows[0],
      isNew: true,
      message: `New supplier '${supplier_name}' created successfully`
    });
  } catch (error) {
    console.error('❌ Supplier creation error:', error.message);
    if (connection) await connection.close();
    res.status(500).json({ error: 'Failed to create supplier', details: error.message });
  }
});

// GET /api/purchases/suppliers-list/all - Fetch all suppliers with aggregated stats for the directory
app.get('/api/purchases/suppliers-list/all', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const userId = req.user.id;
    const result = await connection.execute(
      `SELECT 
        s.supplier_id AS "id", 
        s.supplier_name AS "name", 
        s.phone_number AS "phone", 
        s.gst_number AS "gst", 
        s.email_id AS "email",
        NVL((SELECT COUNT(DISTINCT p.purchase_id) 
             FROM purchases p 
             WHERE p.supplier_id = s.supplier_id AND p.user_id = s.user_id), 0) AS "totalPurchases",
        NVL((SELECT COUNT(DISTINCT pr.return_id) 
             FROM purchase_returns pr 
             JOIN purchases p ON pr.purchase_id = p.purchase_id 
             WHERE p.supplier_id = s.supplier_id AND pr.user_id = s.user_id), 0) AS "totalReturns",
        NVL((SELECT SUM(pi.total_amount) 
             FROM purchase_items pi 
             JOIN purchases p ON pi.purchase_id = p.purchase_id 
             WHERE p.supplier_id = s.supplier_id AND pi.user_id = s.user_id), 0) AS "totalPurchaseValue",
        NVL((SELECT SUM(pr.total_refund) 
             FROM purchase_returns pr 
             JOIN purchases p ON pr.purchase_id = p.purchase_id 
             WHERE p.supplier_id = s.supplier_id AND pr.user_id = s.user_id), 0) AS "totalReturnValue",
        (SELECT MAX(created_at) 
         FROM (
           SELECT created_at FROM purchases WHERE supplier_id = s.supplier_id AND user_id = s.user_id
           UNION ALL
           SELECT pr.created_at 
           FROM purchase_returns pr 
           JOIN purchases p ON pr.purchase_id = p.purchase_id 
           WHERE p.supplier_id = s.supplier_id AND pr.user_id = s.user_id
         )) AS "lastTransaction"
       FROM suppliers s
       WHERE s.is_active = 1 AND s.user_id = :userId
       ORDER BY s.supplier_name`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error('❌ Suppliers list fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch suppliers stats', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// GET /api/purchases/supplier-ledger/:supplierId - Fetch transaction ledger for a specific supplier
app.get('/api/purchases/supplier-ledger/:supplierId', async (req, res) => {
  let connection;
  try {
    const { supplierId } = req.params;
    const userId = req.user.id;
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT * FROM (
         SELECT 
           'PURCHASE' AS "type", 
           p.purchase_id AS "id",
           p.purchase_id AS "purchaseId",
           p.invoice_number AS "invoiceNumber", 
           NVL((SELECT SUM(total_amount) FROM purchase_items WHERE purchase_id = p.purchase_id AND user_id = :userId), 0) AS "total",
           p.created_at AS "date",
           'PAID' AS "paymentStatus",
           p.notes AS "notes"
         FROM purchases p
         WHERE p.supplier_id = :sid AND p.user_id = :userId
         
         UNION ALL
         
         SELECT 
           'RETURN' AS "type", 
           pr.return_id AS "id",
           pr.purchase_id AS "purchaseId",
           pr.return_number AS "invoiceNumber", 
           pr.total_refund AS "total",
           pr.created_at AS "date",
           'PAID' AS "paymentStatus",
           pr.notes AS "notes"
         FROM purchase_returns pr
         JOIN purchases p ON pr.purchase_id = p.purchase_id
         WHERE p.supplier_id = :sid AND pr.user_id = :userId
       ) ORDER BY "date" DESC`,
      { sid: parseInt(supplierId), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error('❌ Supplier ledger fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch supplier ledger', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==================== PRODUCTS API ====================

// GET /api/products/search - Dedicated search endpoint for autocomplete
app.get('/api/products/search', async (req, res) => {
  let connection;
  try {
    const { q, search } = req.query;
    const searchTerm = q || search;
    if (!searchTerm) {
      return res.status(200).json({ success: true, data: [] });
    }

    connection = await getConnection();
    const userId = req.user.id;
    const result = await connection.execute(
      `SELECT p.product_id, p.product_name, p.hsn_code, p.quantity, p.purchase_price, p.sale_price, p.gst_rate,
              s.supplier_name
       FROM products p
       LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id AND s.user_id = p.user_id
       WHERE (UPPER(p.product_name) LIKE :q OR UPPER(p.hsn_code) LIKE :q)
       AND p.is_active = 1 AND p.user_id = :userId
       ORDER BY p.product_name 
       FETCH FIRST 10 ROWS ONLY`,
      { q: `%${searchTerm.toUpperCase()}%`, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error('❌ Product search error:', error.message);
    res.status(500).json({ error: 'Search failed', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// GET /api/products - Fetch products (supports ?search=, ?q=, and ?keyword=)
app.get('/api/products', async (req, res) => {
  let connection;
  try {
    const { search, keyword, q, category } = req.query;
    const searchTerm = q || search || keyword;
    const userId = req.user.id;
    connection = await getConnection();
    
    let query = `
      SELECT p.product_id, p.product_name, p.hsn_code, p.quantity, p.purchase_price, p.sale_price, p.gst_rate, p.supplier_id,
             s.supplier_name
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id AND s.user_id = p.user_id
      WHERE p.is_active = 1 AND p.user_id = :userId
    `;
    const binds = { userId };

    if (searchTerm) {
      query += ` AND (UPPER(p.product_name) LIKE :searchTerm OR UPPER(p.hsn_code) LIKE :searchTerm)`;
      binds.searchTerm = `%${searchTerm.toUpperCase()}%`;
    }

    query += ` ORDER BY p.product_name FETCH FIRST 20 ROWS ONLY`;

    const result = await connection.execute(query, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error('❌ Product fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// POST /api/products - Create a new product
app.post('/api/products', async (req, res) => {
  let connection;
  try {
    const { product_name, hsn_code, purchase_price, sale_price, gst_rate, supplier_id } = req.body;
    if (!product_name) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    connection = await getConnection();
    const userId = req.user.id;

    const existing = await connection.execute(
      `SELECT product_id, product_name, hsn_code, quantity, purchase_price, sale_price, gst_rate, supplier_id
       FROM products
       WHERE LOWER(product_name) = LOWER(:name) AND is_active = 1 AND user_id = :userId`,
      { name: product_name.trim(), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (existing.rows && existing.rows.length > 0) {
      await connection.close();
      return res.status(409).json({ 
        error: 'Duplicate product name', 
        message: `A product with name '${product_name}' already exists. Please use a different name or update the existing product.`,
        existingProduct: existing.rows[0]
      });
    }

    const result = await connection.execute(
      `INSERT INTO products (product_id, product_name, hsn_code, supplier_id, purchase_price, sale_price, gst_rate, quantity, is_active, created_at, updated_at, user_id)
       VALUES (product_seq.NEXTVAL, :name, :hsn, :supplier_id, :purchase_price, :sale_price, :gst_rate, 0, 1, SYSDATE, SYSDATE, :userId)
       RETURNING product_id INTO :out_id`,
      {
        name: product_name.trim(),
        hsn: hsn_code ? String(hsn_code).trim() : null,
        supplier_id: supplier_id ? parseInt(supplier_id) : null,
        purchase_price: purchase_price != null ? parseFloat(purchase_price) : 0,
        sale_price: sale_price != null ? parseFloat(sale_price) : (purchase_price != null ? parseFloat(purchase_price) * 1.2 : 0),
        gst_rate: gst_rate != null ? parseFloat(gst_rate) : 18,
        userId,
        out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      },
      { autoCommit: true }
    );

    const newProductId = result.outBinds.out_id[0];
    const productResult = await connection.execute(
      `SELECT product_id, product_name, hsn_code, quantity, purchase_price, sale_price, gst_rate, supplier_id
       FROM products
       WHERE product_id = :id AND user_id = :userId`,
      { id: newProductId, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    await connection.close();
    res.status(201).json({ success: true, isNew: true, data: productResult.rows[0], message: `Product '${product_name}' created successfully` });
  } catch (error) {
    console.error('❌ Product creation error:', error.message);
    if (connection) await connection.close();
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
});

// PUT /api/products/:productId - Update an existing product
app.put('/api/products/:productId', async (req, res) => {
  let connection;
  try {
    const { productId } = req.params;
    // Accept both snake_case and camelCase field names
    const body = req.body;
    const product_name  = body.product_name  || body.productName;
    const hsn_code      = body.hsn_code      || body.hsnCode      || null;
    const purchase_price = body.purchase_price != null ? body.purchase_price : (body.costPrice != null ? body.costPrice : 0);
    const sale_price    = body.sale_price    != null ? body.sale_price    : (body.sellingPrice != null ? body.sellingPrice : 0);
    const gst_rate      = body.gst_rate      != null ? body.gst_rate      : (body.gstRate != null ? body.gstRate : 18);
    const supplier_id   = body.supplier_id   || body.supplierId   || null;
    const userId = req.user.id;
    connection = await getConnection();
    
    // Check for duplicate product name (excluding current product) PER USER
    const existing = await connection.execute(
      `SELECT product_id, product_name 
       FROM products 
       WHERE LOWER(product_name) = LOWER(:name) 
         AND product_id != :id 
         AND is_active = 1 AND user_id = :userId`,
      { name: product_name.trim(), id: parseInt(productId), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (existing.rows && existing.rows.length > 0) {
      await connection.close();
      return res.status(409).json({ 
        error: 'Duplicate product name', 
        message: `Another product with name '${product_name}' already exists. Please use a different name.`
      });
    }
    
    await connection.execute(
      `UPDATE products 
       SET product_name = :name, 
           hsn_code = :hsn, 
           purchase_price = :purchase_price, 
           sale_price = :sale_price, 
           gst_rate = :gst_rate, 
           supplier_id = :supplier_id, 
           updated_at = SYSDATE 
       WHERE product_id = :id AND user_id = :userId`,
      {
        id: parseInt(productId),
        name: product_name.trim(),
        hsn: hsn_code ? String(hsn_code).trim() : null,
        purchase_price: parseFloat(purchase_price),
        sale_price: parseFloat(sale_price),
        gst_rate: parseFloat(gst_rate),
        supplier_id: supplier_id ? parseInt(supplier_id) : null,
        userId
      },
      { autoCommit: true }
    );
    
    await connection.close();
    res.status(200).json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    console.error('❌ Product update error:', error.message);
    if (connection) await connection.close();
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
});

// DELETE /api/products/:productId - Deactivate a product
app.delete('/api/products/:productId', async (req, res) => {
  let connection;
  try {
    const { productId } = req.params;
    connection = await getConnection();
    
    await connection.execute(
      `UPDATE products SET is_active = 0, updated_at = SYSDATE WHERE product_id = :id AND user_id = :userId`,
      { id: parseInt(productId), userId: req.user.id },
      { autoCommit: true }
    );
    
    await connection.close();
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('❌ Product delete error:', error.message);
    if (connection) await connection.close();
    res.status(500).json({ error: 'Failed to delete product', details: error.message });
  }
});

// PATCH /api/products/:productId/stock - Quick stock adjustment
app.patch('/api/products/:productId/stock', async (req, res) => {
  let connection;
  try {
    const { productId } = req.params;
    const { mode, adjustment } = req.body;
    
    connection = await getConnection();
    
    let query;
    const userId = req.user.id;
    if (mode === 'set') {
      query = `UPDATE products SET quantity = :val, updated_at = SYSDATE WHERE product_id = :id AND user_id = :userId`;
    } else {
      query = `UPDATE products SET quantity = quantity + :val, updated_at = SYSDATE WHERE product_id = :id AND user_id = :userId`;
    }
    
    await connection.execute(query, { val: parseFloat(adjustment), id: parseInt(productId), userId }, { autoCommit: true });
    
    await connection.close();
    res.status(200).json({ success: true, message: 'Stock updated successfully' });
  } catch (error) {
    console.error('❌ Stock update error:', error.message);
    if (connection) await connection.close();
    res.status(500).json({ error: 'Failed to update stock', details: error.message });
  }
});

// GET /api/products/:supplierId - Get products by supplier
app.get('/api/products/supplier/:supplierId', async (req, res) => {
  let connection;
  try {
    const userId = req.user.id;
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT product_id, product_name, hsn_code, quantity, purchase_price, sale_price, gst_rate 
       FROM products 
       WHERE supplier_id = :supplierId AND is_active = 1 AND user_id = :userId
       ORDER BY product_name`,
      { supplierId: parseInt(supplierId), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error('❌ Product search error:', error.message);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==================== CUSTOMERS API ====================

// GET /api/customers - Fetch all customers with basic aggregates PER USER
app.get('/api/customers', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const userId = req.user.id;
    const result = await connection.execute(
      `SELECT c.customer_id, c.customer_name, c.phone_number, c.email_id, c.gst_number, c.city,
              NVL((SELECT SUM(total_amount) FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id 
                   WHERE s.customer_id = c.customer_id AND s.user_id = :userId AND si.user_id = :userId), 0) AS total_sales,
              NVL((SELECT SUM(total_refund) FROM sale_returns sr JOIN sales s ON sr.sale_id = s.sale_id 
                   WHERE s.customer_id = c.customer_id AND s.user_id = :userId AND sr.user_id = :userId), 0) AS total_returns
       FROM customers c
       WHERE c.is_active = 1 AND c.user_id = :userId
       ORDER BY c.customer_name`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error('❌ Customer fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch customers', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// GET /api/customers/phone/:phone - Get customer by phone PER USER
app.get('/api/customers/phone/:phone', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { phone } = req.params;
    const userId = req.user.id;
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT customer_id, customer_name, phone_number, email_id, gst_number, city 
       FROM customers 
       WHERE phone_number = :phone AND is_active = 1 AND user_id = :userId`,
      { phone, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const customer = result.rows && result.rows[0];
    res.status(200).json({ 
      success: true, 
      data: customer || null,
      found: customer ? true : false 
    });
  } catch (error) {
    console.error('❌ Customer search error:', error.message);
    res.status(500).json({ error: 'Failed to fetch customer', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// GET /api/customers/:customerId - Fetch complete customer details PER USER
app.get('/api/customers/:customerId', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { customerId } = req.params;
    const userId = req.user.id;
    connection = await getConnection();
    
    // 1. Fetch customer details
    const customerResult = await connection.execute(
      `SELECT customer_id, customer_name, phone_number, email_id, gst_number, city
       FROM customers
       WHERE customer_id = :customerId AND is_active = 1 AND user_id = :userId`,
      { customerId: parseInt(customerId), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!customerResult.rows || customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const customer = customerResult.rows[0];

    // 2. Fetch sales invoices
    const salesResult = await connection.execute(
      `SELECT s.sale_id, s.invoice_number, s.invoice_date,
              NVL((SELECT SUM(total_amount) FROM sale_items WHERE sale_id = s.sale_id AND user_id = :userId), 0) AS total_amount,
              NVL((SELECT SUM(cgst_amount + sgst_amount + igst_amount) FROM sale_items WHERE sale_id = s.sale_id AND user_id = :userId), 0) AS gst_amount,
              (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.sale_id AND user_id = :userId) AS number_of_items
       FROM sales s
       WHERE s.customer_id = :customerId AND s.user_id = :userId
       ORDER BY s.invoice_date DESC, s.created_at DESC`,
      { customerId: parseInt(customerId), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // 3. Fetch sales returns
    const returnsResult = await connection.execute(
      `SELECT sr.return_id, sr.return_number, sr.return_date, sr.total_refund,
              NVL((SELECT SUM(cgst_amount + sgst_amount + igst_amount) FROM sale_return_items WHERE return_id = sr.return_id AND user_id = :userId), 0) AS gst_reversed,
              s.invoice_number
       FROM sale_returns sr
       JOIN sales s ON sr.sale_id = s.sale_id AND s.user_id = sr.user_id
       WHERE s.customer_id = :customerId AND sr.user_id = :userId
       ORDER BY sr.return_date DESC, sr.created_at DESC`,
      { customerId: parseInt(customerId), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const sales = salesResult.rows || [];
    const returns = returnsResult.rows || [];

    const totalSales = sales.reduce((sum, sale) => sum + sale.TOTAL_AMOUNT, 0);
    const totalReturns = returns.reduce((sum, ret) => sum + ret.TOTAL_REFUND, 0);
    const netRevenue = totalSales - totalReturns;

    const formattedSales = sales.map(s => ({
      invoiceId: s.SALE_ID,
      invoiceNumber: s.INVOICE_NUMBER,
      date: s.INVOICE_DATE,
      totalAmount: s.TOTAL_AMOUNT,
      gstAmount: s.GST_AMOUNT,
      numberOfItems: s.NUMBER_OF_ITEMS
    }));

    const formattedReturns = returns.map(r => ({
      returnId: r.RETURN_ID,
      returnNumber: r.RETURN_NUMBER,
      date: r.RETURN_DATE,
      totalRefund: r.TOTAL_REFUND,
      gstReversed: r.GST_REVERSED,
      invoiceNumber: r.INVOICE_NUMBER
    }));

    res.status(200).json({
      success: true,
      data: {
        customer: {
          id: customer.CUSTOMER_ID,
          name: customer.CUSTOMER_NAME,
          phone: customer.PHONE_NUMBER,
          email: customer.EMAIL_ID,
          gstin: customer.GST_NUMBER,
          city: customer.CITY
        },
        summary: {
          totalSales,
          totalReturns,
          netRevenue
        },
        sales: formattedSales,
        returns: formattedReturns
      }
    });

  } catch (error) {
    console.error('❌ Customer history fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch customer history', details: error.message });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// ==================== PURCHASE API ====================

// POST /api/purchases - Create a new purchase (with atomicity)
app.post('/api/purchases', async (req, res) => {
  let connection;
  try {
    const { 
      supplier_id, 
      supplierName, 
      supplierGST, 
      supplierPhone, 
      supplierEmail,
      invoice_number, 
      invoice_date, 
      items, 
      is_igst, 
      notes 
    } = req.body;

    console.log('📥 Robust Purchase Request:', req.body);

    // Validations
    if (!supplierName && !supplier_id) {
       return res.status(400).json({ error: 'Supplier Name or ID is required' });
    }
    if (!invoice_number) return res.status(400).json({ error: 'Invoice Number is required' });
    if (!items || items.length === 0) return res.status(400).json({ error: 'At least one item is required' });

    connection = await getConnection();
    const userId = req.user.id;

    // 0. Check for duplicate invoice number for this user
    const dupInvoice = await connection.execute(
      `SELECT purchase_id FROM purchases WHERE UPPER(invoice_number) = UPPER(:inv) AND user_id = :userId`,
      { inv: invoice_number.trim(), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (dupInvoice.rows && dupInvoice.rows.length > 0) {
      await connection.close();
      return res.status(409).json({ error: `Invoice number '${invoice_number}' already exists. Please use a unique invoice number.` });
    }

    // 1. Resolve Supplier PER USER
    let finalSupplierId = supplier_id;
    if (!finalSupplierId) {
      // First try to find by name
      const existingSup = await connection.execute(
        `SELECT supplier_id FROM suppliers WHERE UPPER(supplier_name) = UPPER(:name) AND user_id = :userId`,
        { name: supplierName.trim(), userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (existingSup.rows && existingSup.rows.length > 0) {
        finalSupplierId = existingSup.rows[0].SUPPLIER_ID;
      } else {
        // If GSTIN is provided, check if another supplier already owns it
        if (supplierGST) {
          const gstOwner = await connection.execute(
            `SELECT supplier_id FROM suppliers WHERE gst_number = :gst AND user_id = :userId`,
            { gst: supplierGST.trim(), userId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          if (gstOwner.rows && gstOwner.rows.length > 0) {
            // Reuse the supplier that already has this GSTIN
            finalSupplierId = gstOwner.rows[0].SUPPLIER_ID;
            console.log(`♻️ Reusing supplier with GSTIN ${supplierGST}: ID ${finalSupplierId}`);
          }
        }

        if (!finalSupplierId) {
          const sResult = await connection.execute(
            `INSERT INTO suppliers (supplier_name, gst_number, phone_number, email_id, is_active, created_at, user_id) 
             VALUES (:name, :gst, :phone, :email, 1, SYSDATE, :userId) 
             RETURNING supplier_id INTO :out_id`,
            {
              name: supplierName.trim(),
              gst: supplierGST || null,
              phone: supplierPhone || null,
              email: supplierEmail || null,
              userId,
              out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            }
          );
          console.log(`✅ Auto-created new supplier: ${supplierName.trim()}`);
          finalSupplierId = sResult.outBinds.out_id[0];
        }
      }
    }

    // Update existing supplier's contact info if provided — but only update GSTIN
    // if it isn't already taken by a different supplier
    if (finalSupplierId && (supplierGST || supplierPhone || supplierEmail)) {
      let safeGST = supplierGST || null;
      if (safeGST) {
        const gstConflict = await connection.execute(
          `SELECT supplier_id FROM suppliers 
           WHERE gst_number = :gst AND user_id = :userId AND supplier_id != :sid`,
          { gst: safeGST, userId, sid: finalSupplierId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (gstConflict.rows && gstConflict.rows.length > 0) {
          console.warn(`⚠️ GSTIN ${safeGST} belongs to another supplier — skipping GSTIN update`);
          safeGST = null; // Skip updating GSTIN to avoid ORA-00001
        }
      }
      await connection.execute(
        `UPDATE suppliers 
         SET gst_number   = CASE WHEN :gst IS NOT NULL AND :gst != '' THEN :gst ELSE gst_number END, 
             phone_number = CASE WHEN :phone IS NOT NULL AND :phone != '' THEN :phone ELSE phone_number END, 
             email_id     = CASE WHEN :email IS NOT NULL AND :email != '' THEN :email ELSE email_id END
         WHERE supplier_id = :sid AND user_id = :userId`,
        {
          gst: safeGST,
          phone: supplierPhone || null,
          email: supplierEmail || null,
          sid: finalSupplierId,
          userId
        }
      );
    }

    // 1.5 Calculate totals for GST columns
    let calcTotalTaxable = 0;
    let calcTotalCGST = 0;
    let calcTotalSGST = 0;
    let calcTotalIGST = 0;
    let calcTotalInvoice = 0;
    
    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const gstRate = parseFloat(item.gst_rate) || 0;
      const taxable = qty * price;
      
      let cgst = 0, sgst = 0, igst = 0;
      if (is_igst === 1 || item.is_igst) {
        igst = (taxable * gstRate) / 100;
      } else {
        cgst = (taxable * (gstRate / 2)) / 100;
        sgst = (taxable * (gstRate / 2)) / 100;
      }
      
      calcTotalTaxable += taxable;
      calcTotalCGST += cgst;
      calcTotalSGST += sgst;
      calcTotalIGST += igst;
      calcTotalInvoice += taxable + cgst + sgst + igst;
    }

    // 2. Insert Purchase Header
    const purchaseResult = await connection.execute(
      `INSERT INTO purchases (
         supplier_id, invoice_number, invoice_date, payment_method, notes, user_id,
         total_taxable_value, total_cgst, total_sgst, total_igst, total_value
       ) 
       VALUES (
         :supplier_id, :invoice_number, TO_DATE(:invoice_date, 'YYYY-MM-DD'), :payment_method, :notes, :userId,
         :taxable, :cgst, :sgst, :igst, :total
       ) 
       RETURNING purchase_id INTO :out_id`,
      {
        supplier_id: finalSupplierId,
        invoice_number: invoice_number.trim(),
        invoice_date: invoice_date || new Date().toISOString().split('T')[0],
        payment_method: req.body.paymentMethod || 'CASH',
        notes: notes || null,
        userId,
        taxable: calcTotalTaxable,
        cgst: calcTotalCGST,
        sgst: calcTotalSGST,
        igst: calcTotalIGST,
        total: calcTotalInvoice,
        out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      }
    );
    const purchaseId = purchaseResult.outBinds.out_id[0];

    // 3. Process Items
    for (const item of items) {
      let productId = item.product_id;
      
      // Resolve/Create Product PER USER
      if (!productId) {
         const existingProd = await connection.execute(
           `SELECT product_id FROM products WHERE UPPER(product_name) = UPPER(:name) AND is_active = 1 AND user_id = :userId`,
           { name: item.product_name.trim(), userId },
           { outFormat: oracledb.OUT_FORMAT_OBJECT }
         );
         if (existingProd.rows && existingProd.rows.length > 0) {
           productId = existingProd.rows[0].PRODUCT_ID;
         } else {
           try {
             const pResult = await connection.execute(
               `INSERT INTO products (product_name, hsn_code, supplier_id, purchase_price, sale_price, gst_rate, quantity, user_id) 
                VALUES (:name, :hsn, :sid, :purchase_price, :sale_price, :gst, 0, :userId) 
                RETURNING product_id INTO :out_id`,
               {
                 name: item.product_name.trim(),
                 hsn: item.hsn_code || null,
                 sid: finalSupplierId,
                 purchase_price: parseFloat(item.unit_price) || 0,
                 sale_price: (parseFloat(item.unit_price) || 0) * 1.2,
                 gst: parseFloat(item.gst_rate) || 18,
                 userId,
                 out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
               }
             );
             productId = pResult.outBinds.out_id[0];
           } catch (insertErr) {
             // ORA-00001: duplicate — another request created it; fetch the existing one
             if (insertErr.errorNum === 1) {
               const retryProd = await connection.execute(
                 `SELECT product_id FROM products WHERE UPPER(product_name) = UPPER(:name) AND is_active = 1 AND user_id = :userId`,
                 { name: item.product_name.trim(), userId },
                 { outFormat: oracledb.OUT_FORMAT_OBJECT }
               );
               if (retryProd.rows && retryProd.rows.length > 0) {
                 productId = retryProd.rows[0].PRODUCT_ID;
               } else {
                 throw insertErr; // Give up — rethrow
               }
             } else {
               throw insertErr;
             }
           }
         }
      }

      // GST Calculation
      const qty = parseFloat(item.quantity) || 0;
      if (qty <= 0) throw new Error(`Quantity for ${item.product_name} must be > 0`);
      
      const price = parseFloat(item.unit_price) || 0;
      const gstRate = parseFloat(item.gst_rate) || 0;
      const taxable = qty * price;
      let cgst = 0, sgst = 0, igst = 0;

      if (is_igst === 1 || item.is_igst) {
        igst = (taxable * gstRate) / 100;
      } else {
        cgst = (taxable * (gstRate / 2)) / 100;
        sgst = (taxable * (gstRate / 2)) / 100;
      }
      const total = taxable + cgst + sgst + igst;

      // Insert Purchase Item
      await connection.execute(
        `INSERT INTO purchase_items 
         (purchase_id, product_id, quantity, unit_price, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, user_id) 
         VALUES (:pid, :prod_id, :qty, :price, :taxable, :cgst, :sgst, :igst, :total, :userId)`,
        {
          pid: purchaseId,
          prod_id: productId,
          qty,
          price,
          taxable,
          cgst,
          sgst,
          igst,
          total,
          userId
        }
      );

      // 4. Update Stock and HSN (if provided) PER USER
      await connection.execute(
        `UPDATE products SET 
           quantity = quantity + :qty, 
           purchase_price = :price,
           hsn_code = CASE WHEN :hsn IS NOT NULL AND :hsn != '' THEN :hsn ELSE hsn_code END,
           updated_at = SYSDATE 
         WHERE product_id = :id AND user_id = :userId`,
        { qty, price, hsn: item.hsn_code || null, id: productId, userId }
      );
    }

    await connection.commit();
    res.status(201).json({ 
      success: true, 
      purchase_id: purchaseId, 
      message: 'Purchase saved successfully and stock updated' 
    });

  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (e) { console.error('Rollback failed:', e); }
    }
    console.error('❌ Robust Purchase error:', error.message);
    // ORA-00001: unique constraint violated — give a friendly message
    if (error.errorNum === 1) {
      return res.status(409).json({ error: 'Duplicate data detected: a record with this invoice number, supplier GSTIN, or product name already exists. Please check your entries.' });
    }
    res.status(500).json({ error: error.message || 'Failed to create purchase' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error('Close failed:', e); }
    }
  }
});

// GET /api/purchases - Fetch all purchases
app.get('/api/purchases', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const userId = req.user.id;
    const result = await connection.execute(
      `SELECT p.purchase_id, p.invoice_number, p.invoice_date, p.created_at, p.notes, p.payment_method,
              s.supplier_name,
              NVL((SELECT SUM(total_amount) FROM purchase_items WHERE purchase_id = p.purchase_id AND user_id = :userId), 0) AS total_amount
       FROM purchases p
       LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id AND s.user_id = p.user_id
       WHERE p.user_id = :userId
       ORDER BY p.created_at DESC`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error('❌ Purchase fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch purchases', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// GET /api/purchases/returns - Fetch all purchase returns
app.get('/api/purchases/returns', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const userId = req.user.id;
    const result = await connection.execute(
      `SELECT pr.return_id, pr.purchase_id, pr.return_number, pr.return_date, pr.notes, pr.created_at,
              pr.total_refund, pr.tax_refund,
              p.invoice_number AS original_invoice, s.supplier_name,
              'RETURNED' AS status
       FROM purchase_returns pr
       JOIN purchases p ON pr.purchase_id = p.purchase_id AND p.user_id = pr.user_id
       LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id AND s.user_id = p.user_id
       WHERE pr.user_id = :userId
       ORDER BY NVL(pr.return_date, pr.created_at) DESC, pr.created_at DESC`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error('❌ Purchase returns fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch purchase returns', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// GET /api/purchases/:purchaseId - Fetch specific purchase details with items
app.get('/api/purchases/:purchaseId', async (req, res) => {
  let connection;
  try {
    const { purchaseId } = req.params;
    const userId = req.user.id;
    connection = await getConnection();
    
    const purchaseResult = await connection.execute(
      `SELECT p.purchase_id, p.supplier_id, p.invoice_number, p.invoice_date, p.notes, p.created_at, p.payment_method,
              s.supplier_name, s.gst_number AS supplier_gst, s.phone_number AS supplier_phone
       FROM purchases p
       LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id AND s.user_id = p.user_id
       WHERE p.purchase_id = :id AND p.user_id = :userId`,
      { id: parseInt(purchaseId), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!purchaseResult.rows || purchaseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const itemsResult = await connection.execute(
      `SELECT pi.item_id, pi.product_id, pro.product_name, pro.hsn_code, pi.quantity, pi.unit_price, pi.taxable_amount, pi.cgst_amount, pi.sgst_amount, pi.igst_amount, pi.total_amount, pro.gst_rate
       FROM purchase_items pi
       JOIN products pro ON pi.product_id = pro.product_id AND pro.user_id = pi.user_id
       WHERE pi.purchase_id = :id AND pi.user_id = :userId`,
      { id: parseInt(purchaseId), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.status(200).json({ 
      success: true, 
      data: {
        ...purchaseResult.rows[0],
        items: itemsResult.rows || []
      }
    });
  } catch (error) {
    console.error('❌ Purchase detail fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch purchase details', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// GET /api/purchase-returns/:returnId - Fetch specific return details with items
app.get('/api/purchase-returns/:returnId', async (req, res) => {
  let connection;
  try {
    const { returnId } = req.params;
    const userId = req.user.id;
    connection = await getConnection();
    
    const returnResult = await connection.execute(
      `SELECT 
        pr.return_id, pr.purchase_id, pr.return_number, pr.return_date, 
        pr.notes, pr.total_refund, pr.tax_refund, pr.created_at,
        p.invoice_number AS original_invoice, 
        s.supplier_name, s.gst_number AS supplier_gst,
        (SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END 
         FROM purchase_items WHERE purchase_id = p.purchase_id AND igst_amount > 0 AND user_id = :userId) AS is_igst
       FROM purchase_returns pr
       JOIN purchases p ON pr.purchase_id = p.purchase_id AND p.user_id = pr.user_id
       LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id AND s.user_id = p.user_id
       WHERE pr.return_id = :id AND pr.user_id = :userId`,
      { id: parseInt(returnId), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!returnResult.rows || returnResult.rows.length === 0) {
      return res.status(404).json({ error: 'Return not found' });
    }

    const itemsResult = await connection.execute(
      `SELECT 
        pri.product_id, pri.quantity, pri.unit_price, pri.refund_amount, pri.tax_amount,
        pro.product_name, pro.hsn_code,
        CASE WHEN pi.igst_amount > 0 THEN pri.tax_amount ELSE 0 END AS igst_amount,
        CASE WHEN pi.igst_amount = 0 THEN pri.tax_amount / 2 ELSE 0 END AS cgst_amount,
        CASE WHEN pi.igst_amount = 0 THEN pri.tax_amount / 2 ELSE 0 END AS sgst_amount,
        (pri.refund_amount + pri.tax_amount) AS total_amount
       FROM purchase_return_items pri
       JOIN products pro ON pri.product_id = pro.product_id AND pro.user_id = pri.user_id
       JOIN purchase_returns pr ON pri.return_id = pr.return_id AND pr.user_id = pri.user_id
       JOIN purchase_items pi ON pr.purchase_id = pi.purchase_id AND pri.product_id = pi.product_id AND pi.user_id = pri.user_id
       WHERE pri.return_id = :id AND pri.user_id = :userId`,
      { id: parseInt(returnId), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.status(200).json({ 
      success: true, 
      data: {
        ...returnResult.rows[0],
        items: itemsResult.rows || []
      }
    });
  } catch (error) {
    console.error('❌ Return detail fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch return details', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==================== SALES API ====================

// GET /api/sales/customers/search - Must be BEFORE /api/sales/:saleId to avoid route conflict
app.get('/api/sales/customers/search', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { q } = req.query;
    const userId = req.user.id;
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT customer_id, customer_name, phone_number AS customer_phone,
              email_id AS customer_email, gst_number AS customer_gst,
              (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.customer_id AND s.user_id = c.user_id) AS total_orders
       FROM customers c
       WHERE is_active = 1 AND LOWER(customer_name) LIKE LOWER(:query) AND user_id = :userId
       ORDER BY customer_name
       FETCH FIRST 10 ROWS ONLY`,
      { query: `%${q || ''}%`, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error('❌ Customer search error:', error.message);
    res.status(500).json({ error: 'Failed to search customers', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// GET /api/sales/customers/validate - Must be BEFORE /api/sales/:saleId
app.get('/api/sales/customers/validate', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { name, gst, phone } = req.query;
    const userId = req.user.id;
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT customer_id
       FROM customers
       WHERE is_active = 1 AND user_id = :userId
         AND (LOWER(customer_name) = LOWER(:name)
              OR phone_number = :phone
              OR gst_number = :gst)
       FETCH FIRST 1 ROW ONLY`,
      {
        name: name || null,
        phone: phone || null,
        gst: gst || null,
        userId
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(200).json({
      success: true,
      status: result.rows && result.rows.length > 0 ? 'known' : 'new'
    });
  } catch (error) {
    console.error('❌ Customer validate error:', error.message);
    res.status(500).json({ error: 'Failed to validate customer', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// GET /api/sales/customers/products - Must be BEFORE /api/sales/:saleId
app.get('/api/sales/customers/products', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { customerName, customerGST, customerPhone } = req.query;
    const userId = req.user.id;
    connection = await getConnection();
    const customer = await connection.execute(
      `SELECT customer_id FROM customers
       WHERE is_active = 1 AND user_id = :userId
         AND (LOWER(customer_name) = LOWER(:name)
              OR phone_number = :phone
              OR gst_number = :gst)
       FETCH FIRST 1 ROW ONLY`,
      {
        name: customerName || null,
        phone: customerPhone || null,
        gst: customerGST || null,
        userId
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!customer.rows || customer.rows.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }
    const customerId = customer.rows[0].CUSTOMER_ID;
    const productsResult = await connection.execute(
      `SELECT DISTINCT p.product_id, p.product_name, p.hsn_code, p.sale_price, p.gst_rate
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.sale_id AND s.user_id = si.user_id
       JOIN products p ON si.product_id = p.product_id AND p.user_id = si.user_id
       WHERE s.customer_id = :customerId
         AND p.is_active = 1 AND si.user_id = :userId`,
      { customerId, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(200).json({ success: true, data: productsResult.rows || [] });
  } catch (error) {
    console.error('❌ Customer products error:', error.message);
    res.status(500).json({ error: 'Failed to fetch customer products', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// POST /api/sales - Create a new sale PER USER
app.post('/api/sales', authenticateToken, async (req, res) => {
  let connection;
  try {
    const {
      customer_id,
      invoice_number,
      invoice_date,
      saleDate,          // frontend may send saleDate instead of invoice_date
      items,
      is_igst,
      notes,
      customerName,
      customerGSTIN,
      customerPhone,
      customerEmail,
      customerCity,
      orderType,
      discount,
      paymentMethod
    } = req.body;

    console.log('📥 Sale Request:', req.body);

    if ((!customer_id && !customerName && !customerPhone && !customerGSTIN) || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (orderType === 'RETURN') {
      return res.status(400).json({ error: 'Sale return is not supported through this endpoint' });
    }

    connection = await getConnection();
    const userId = req.user.id;

    let finalCustomerId = customer_id;
    if (!finalCustomerId) {
      const customerCheck = await connection.execute(
        `SELECT customer_id FROM customers
         WHERE is_active = 1 AND user_id = :userId
           AND (LOWER(customer_name) = LOWER(:name)
                OR phone_number = :phone
                OR gst_number = :gst)`,
        {
          name: customerName ? customerName.trim() : null,
          phone: customerPhone || null,
          gst: customerGSTIN || null,
          userId
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (customerCheck.rows && customerCheck.rows.length > 0) {
        finalCustomerId = customerCheck.rows[0].CUSTOMER_ID;
      }
    }

    if (!finalCustomerId) {
      const customerInsert = await connection.execute(
        `INSERT INTO customers
         (customer_id, customer_name, phone_number, email_id, gst_number, city, is_active, created_at, updated_at, user_id)
         VALUES (customer_seq.NEXTVAL, :name, :phone, :email, :gst, :city, 1, SYSDATE, SYSDATE, :userId)
         RETURNING customer_id INTO :out_id`,
        {
          name: customerName ? customerName.trim() : 'Walk-in',
          phone: customerPhone || null,
          email: customerEmail || null,
          gst: customerGSTIN || null,
          city: customerCity || null,
          userId,
          out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        },
        { autoCommit: true }
      );

      finalCustomerId = customerInsert.outBinds.out_id[0];
    }

    const invoiceNumber = invoice_number?.trim() || `SALE-${Date.now()}`;
    // Accept saleDate (frontend field name) or invoice_date (backend field name)
    const finalSaleDate = invoice_date || saleDate || new Date().toISOString().split('T')[0];

    // Calculate totals for GST columns
    let calcTotalTaxable = 0;
    let calcTotalCGST = 0;
    let calcTotalSGST = 0;
    let calcTotalIGST = 0;
    let calcTotalInvoice = 0;
    
    for (const item of items) {
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unit_price ?? item.sellingPrice ?? 0);
      const gstRate = parseFloat(item.gst_rate ?? item.gstRate ?? 0);
      const itemIsIGST = item.is_igst || item.isIGST || is_igst || false;
      
      const taxable = quantity * unitPrice;
      let cgst = 0, sgst = 0, igst = 0;
      
      if (itemIsIGST) {
        igst = (taxable * gstRate) / 100;
      } else {
        cgst = (taxable * (gstRate / 2)) / 100;
        sgst = (taxable * (gstRate / 2)) / 100;
      }
      
      calcTotalTaxable += taxable;
      calcTotalCGST += cgst;
      calcTotalSGST += sgst;
      calcTotalIGST += igst;
      calcTotalInvoice += taxable + cgst + sgst + igst;
    }
    
    // Determine invoice type based on customer GSTIN
    let invoiceType = 'B2B';
    if (!customerGSTIN || customerGSTIN.length !== 15) {
      // For B2C, check if inter-state and value > 2.5L
      invoiceType = 'B2CS'; // Default to B2CS
    }
    
    // Get customer's state code from GSTIN (first 2 digits) or default
    const posStateCode = customerGSTIN ? customerGSTIN.substring(0, 2) : null;

    await connection.execute(
      `INSERT INTO sales (customer_id, invoice_number, invoice_date, payment_method, notes, created_at,
                          invoice_type, pos_state_code, is_reverse_charge, 
                          total_taxable_value, total_cgst, total_sgst, total_igst, 
                          round_off, total_invoice_value, is_active, user_id)
       VALUES (:customer_id, :invoice_number, TO_DATE(:invoice_date, 'YYYY-MM-DD'), :payment_method, :notes, SYSDATE,
               :invoice_type, :pos_state_code, 0,
               :total_taxable_value, :total_cgst, :total_sgst, :total_igst,
               0, :total_invoice_value, 1, :userId)`,
      {
        customer_id: finalCustomerId,
        invoice_number: invoiceNumber,
        invoice_date: finalSaleDate,
        payment_method: paymentMethod || 'CASH',
        notes: notes || null,
        invoice_type: invoiceType,
        pos_state_code: posStateCode,
        total_taxable_value: calcTotalTaxable,
        total_cgst: calcTotalCGST,
        total_sgst: calcTotalSGST,
        total_igst: calcTotalIGST,
        userId,
        total_invoice_value: calcTotalInvoice
      }
    );

    const idResult = await connection.execute(
      `SELECT sale_id FROM sales WHERE invoice_number = :invoice_number AND user_id = :userId ORDER BY created_at DESC FETCH FIRST 1 ROW ONLY`,
      { invoice_number: invoiceNumber, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const saleId = idResult.rows[0].SALE_ID;
    console.log('✅ Sale created:', saleId);

    let totalAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    const discountAmt = parseFloat(discount || 0);

    for (const item of items) {
      let productId = item.product_id || item.product || item.productId;
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unit_price ?? item.sellingPrice ?? 0);
      const gstRate = parseFloat(item.gst_rate ?? item.gstRate ?? 0);
      const itemIsIGST = item.is_igst || item.isIGST || false;
      const itemName = (item.product_name || item.productName || '').trim();
      const itemHSN = item.hsn_code || item.hsnCode || null;

      if (quantity <= 0) {
        return res.status(400).json({ error: `Quantity must be > 0 for item "${itemName || productId}"` });
      }

      // ── Resolve product by name if no ID was provided PER USER ──────────────────────
      if (!productId && itemName) {
        const existingProd = await connection.execute(
          `SELECT product_id FROM products WHERE UPPER(product_name) = UPPER(:name) AND is_active = 1 AND user_id = :userId`,
          { name: itemName, userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (existingProd.rows && existingProd.rows.length > 0) {
          productId = existingProd.rows[0].PRODUCT_ID;
          console.log(`🔍 Matched product by name "${itemName}" → ID ${productId}`);
        } else {
          // Create a new product inline PER USER
          const pInsert = await connection.execute(
            `INSERT INTO products (product_name, hsn_code, purchase_price, sale_price, gst_rate, quantity, is_active, created_at, user_id)
             VALUES (:name, :hsn, :purchase_price, :sale_price, :gst, 0, 1, SYSDATE, :userId)
             RETURNING product_id INTO :out_id`,
            {
              name: itemName,
              hsn: itemHSN,
              purchase_price: unitPrice,
              sale_price: unitPrice,
              gst: gstRate || 18,
              userId,
              out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            }
          );
          productId = pInsert.outBinds.out_id[0];
          console.log(`✅ Auto-created new product "${itemName}" → ID ${productId}`);
        }
      }

      if (!productId) {
        return res.status(400).json({ error: 'Each item must include a valid product ID or product name' });
      }

      const stockCheck = await connection.execute(
        `SELECT quantity FROM products WHERE product_id = :id AND is_active = 1 AND user_id = :userId`,
        { id: parseInt(productId), userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!stockCheck.rows || stockCheck.rows.length === 0) {
        return res.status(400).json({ error: `Product ${productId} not found` });
      }

      const currentStock = stockCheck.rows[0].QUANTITY;
      // Only check stock for sales (new products have 0 stock — allow it)
      if (currentStock < quantity && currentStock > 0) {
        return res.status(400).json({
          error: `Insufficient stock for "${itemName || productId}". Available: ${currentStock}, Requested: ${quantity}`
        });
      }

      const taxable = quantity * unitPrice;
      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;

      if (itemIsIGST || is_igst) {
        igstAmount = (taxable * gstRate) / 100;
      } else {
        cgstAmount = (taxable * (gstRate / 2)) / 100;
        sgstAmount = (taxable * (gstRate / 2)) / 100;
      }

      const total = taxable + cgstAmount + sgstAmount + igstAmount;

      await connection.execute(
        `INSERT INTO sale_items
         (sale_id, product_id, quantity, unit_price, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, user_id)
         VALUES (:sale_id, :product_id, :quantity, :unit_price, :taxable, :cgst, :sgst, :igst, :total, :userId)`,
        {
          sale_id: saleId,
          product_id: parseInt(productId),
          quantity,
          unit_price: unitPrice,
          taxable,
          cgst: cgstAmount,
          sgst: sgstAmount,
          igst: igstAmount,
          total,
          userId
        }
      );

      await connection.execute(
        `UPDATE products SET quantity = quantity - :qty WHERE product_id = :id AND user_id = :userId`,
        { qty: quantity, id: parseInt(productId), userId }
      );

      totalAmount += total;
      totalCGST += cgstAmount;
      totalSGST += sgstAmount;
      totalIGST += igstAmount;
    }

    await connection.commit();
    console.log('✅ Sale transaction committed');

    const grandTotal = totalAmount - discountAmt;

    res.status(201).json({
      success: true,
      data: {
        sale_id: saleId,
        invoice_number: invoiceNumber,
        invoiceNumber: invoiceNumber,   // alias for frontend
        customer_id: finalCustomerId,
        saleDate: finalSaleDate,
        grandTotal: grandTotal,         // for frontend success banner
        subtotal: totalAmount - totalCGST - totalSGST - totalIGST,
        totalCGST, totalSGST, totalIGST,
        discount: discountAmt,
        paymentMethod: paymentMethod || 'CASH',
        isIGST: is_igst || false,
        customerName: customerName || null,
        summary: {
          total_amount: totalAmount,
          cgst_total: totalCGST,
          sgst_total: totalSGST,
          igst_total: totalIGST
        }
      }
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('❌ Rollback error:', rollbackError.message);
      }
    }
    console.error('❌ Sale creation error:', error.message);
    res.status(500).json({ error: 'Failed to create sale', details: error.message });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// GET /api/sales - Fetch all sales with aggregated totals PER USER
app.get('/api/sales', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const userId = req.user.id;
    const result = await connection.execute(
      `SELECT
         s.sale_id,
         s.customer_id,
         s.invoice_number,
         s.invoice_date,
         s.payment_method,
         s.status,
         s.notes,
         s.created_at,
         c.customer_name,
         NVL(agg.subtotal, 0)    AS subtotal,
         NVL(agg.total_cgst, 0)  AS total_cgst,
         NVL(agg.total_sgst, 0)  AS total_sgst,
         NVL(agg.total_igst, 0)  AS total_igst,
         NVL(agg.total_cgst, 0) + NVL(agg.total_sgst, 0) + NVL(agg.total_igst, 0) AS total_tax,
         NVL(agg.grand_total, 0) AS grand_total
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.customer_id AND c.user_id = s.user_id
       LEFT JOIN (
         SELECT
           sale_id,
           SUM(taxable_amount) AS subtotal,
           SUM(cgst_amount)    AS total_cgst,
           SUM(sgst_amount)    AS total_sgst,
           SUM(igst_amount)    AS total_igst,
           SUM(total_amount)   AS grand_total
         FROM sale_items
         WHERE user_id = :userId
         GROUP BY sale_id
       ) agg ON s.sale_id = agg.sale_id
       WHERE s.user_id = :userId
       ORDER BY s.invoice_date DESC, s.created_at DESC`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error('❌ Sale fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch sales', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// GET /api/sales/return/lookup — fetch sale for return form PER USER
app.get('/api/sales/return/lookup', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { invoice_number, sale_id } = req.query;
    if (!invoice_number && !sale_id) {
      return res.status(400).json({ error: 'Provide invoice_number or sale_id' });
    }
    const userId = req.user.id;
    connection = await getConnection();
    const saleQuery = invoice_number
      ? `SELECT s.sale_id, s.invoice_number, s.invoice_date, s.status, s.payment_method, s.notes,
                c.customer_name, c.gst_number AS customer_gst, c.phone_number AS customer_phone
         FROM sales s LEFT JOIN customers c ON s.customer_id = c.customer_id AND c.user_id = s.user_id
         WHERE s.invoice_number = :ref AND s.user_id = :userId`
      : `SELECT s.sale_id, s.invoice_number, s.invoice_date, s.status, s.payment_method, s.notes,
                c.customer_name, c.gst_number AS customer_gst, c.phone_number AS customer_phone
         FROM sales s LEFT JOIN customers c ON s.customer_id = c.customer_id AND c.user_id = s.user_id
         WHERE s.sale_id = :ref AND s.user_id = :userId`;
    const saleResult = await connection.execute(saleQuery, { ref: invoice_number || parseInt(sale_id), userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (!saleResult.rows || saleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const sale = saleResult.rows[0];
    if (sale.STATUS === 'FULLY_RETURNED') {
      return res.status(400).json({ error: 'This invoice has already been fully returned' });
    }
    const itemsResult = await connection.execute(
      `SELECT si.item_id, si.product_id, p.product_name, p.hsn_code, p.gst_rate,
              si.quantity AS qty_sold, si.unit_price, si.taxable_amount,
              si.cgst_amount, si.sgst_amount, si.igst_amount, si.total_amount,
              NVL((SELECT SUM(sri.quantity) FROM sale_return_items sri
                   JOIN sale_returns sr ON sri.return_id = sr.return_id AND sr.user_id = sri.user_id
                   WHERE sr.sale_id = si.sale_id AND sri.product_id = si.product_id AND sr.user_id = :userId), 0) AS qty_returned
       FROM sale_items si JOIN products p ON si.product_id = p.product_id AND p.user_id = si.user_id
       WHERE si.sale_id = :sid AND si.user_id = :userId`,
      { sid: sale.SALE_ID, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const items = itemsResult.rows.map(row => ({
      item_id: row.ITEM_ID, product_id: row.PRODUCT_ID, product_name: row.PRODUCT_NAME,
      hsn_code: row.HSN_CODE, gst_rate: row.GST_RATE, qty_sold: row.QTY_SOLD,
      qty_returned: row.QTY_RETURNED, qty_returnable: row.QTY_SOLD - row.QTY_RETURNED,
      unit_price: row.UNIT_PRICE, cgst_amount: row.CGST_AMOUNT, sgst_amount: row.SGST_AMOUNT,
      igst_amount: row.IGST_AMOUNT, total_amount: row.TOTAL_AMOUNT,
    }));
    const isIGST = items.some(i => i.igst_amount > 0);
    res.status(200).json({ success: true, data: { sale_id: sale.SALE_ID, invoice_number: sale.INVOICE_NUMBER, invoice_date: sale.INVOICE_DATE, status: sale.STATUS || 'ACTIVE', payment_method: sale.PAYMENT_METHOD, customer_name: sale.CUSTOMER_NAME, customer_gst: sale.CUSTOMER_GST, customer_phone: sale.CUSTOMER_PHONE, is_igst: isIGST, items } });
  } catch (error) {
    console.error('❌ Return lookup error:', error.message);
    res.status(500).json({ error: 'Failed to fetch invoice', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// GET /api/sales/returns — list of all sale returns PER USER
app.get('/api/sales/returns', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const userId = req.user.id;
    const result = await connection.execute(
      `SELECT sr.return_id, sr.return_number, sr.return_date, sr.total_refund,
              sr.is_igst, sr.notes, sr.created_at, s.sale_id, s.invoice_number, c.customer_name
       FROM sale_returns sr JOIN sales s ON sr.sale_id = s.sale_id AND s.user_id = sr.user_id
       LEFT JOIN customers c ON s.customer_id = c.customer_id AND c.user_id = s.user_id
       WHERE sr.user_id = :userId
       ORDER BY sr.created_at DESC`,
      { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error('❌ Sale returns list error:', error.message);
    res.status(500).json({ error: 'Failed to fetch returns', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// GET /api/sales/:saleId - Fetch sale details PER USER
app.get('/api/sales/:saleId', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { saleId } = req.params;
    const userId = req.user.id;
    connection = await getConnection();

    const saleResult = await connection.execute(
      `SELECT s.sale_id, s.customer_id, s.invoice_number, s.invoice_date, s.notes, s.created_at,
              c.customer_name, c.phone_number AS customer_phone, c.email_id AS customer_email,
              c.gst_number AS customer_gst, c.city AS customer_city
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.customer_id AND c.user_id = s.user_id
       WHERE s.sale_id = :saleId AND s.user_id = :userId`,
      { saleId: parseInt(saleId), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!saleResult.rows || saleResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Sale not found' });
    }

    const itemsResult = await connection.execute(
      `SELECT si.item_id, si.product_id, si.quantity, si.unit_price, si.taxable_amount, si.cgst_amount,
              si.sgst_amount, si.igst_amount, si.total_amount,
              p.product_name, p.hsn_code, p.sale_price, p.gst_rate
       FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.product_id AND p.user_id = si.user_id
       WHERE si.sale_id = :saleId AND si.user_id = :userId`,
      { saleId: parseInt(saleId), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.status(200).json({
      success: true,
      data: {
        ...saleResult.rows[0],
        products: itemsResult.rows || [],
        items: itemsResult.rows || []
      }
    });
  } catch (error) {
    console.error('❌ Sale detail fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch sale details', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// NOTE: /api/sales/customers/* routes are intentionally defined BEFORE /api/sales/:saleId
// to avoid Express route conflict where :saleId would match 'customers' as an ID.

// ==================== PURCHASE RETURN API ====================

// GET /api/purchase-return/lookup - Search or Fetch purchase details for returns
// GET /api/purchase-return/lookup - Search or Fetch purchase details for returns PER USER
app.get('/api/purchase-return/lookup', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { invoice_number, purchase_id, search } = req.query;
    const queryTerm = search || invoice_number;

    if (!queryTerm && !purchase_id) {
      return res.status(400).json({ error: 'Search term (Invoice/Name/Phone) or Purchase ID is required' });
    }

    connection = await getConnection();

    // 1. If we have a specific purchase_id, fetch full details with items
    if (purchase_id) {
      const pResult = await connection.execute(
        `SELECT p.purchase_id, p.invoice_number, p.invoice_date, p.notes, p.status,
                s.supplier_id, s.supplier_name, s.gst_number, s.phone_number, s.email_id,
                NVL((SELECT SUM(total_amount) FROM purchase_items WHERE purchase_id = p.purchase_id AND user_id = :userId), 0) AS total_original_amount
         FROM purchases p
         JOIN suppliers s ON p.supplier_id = s.supplier_id AND s.user_id = p.user_id
         WHERE p.purchase_id = :pid AND p.user_id = :userId`,
        { pid: parseInt(purchase_id), userId: req.user.id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (pResult.rows.length === 0) {
        return res.status(404).json({ error: 'Purchase not found' });
      }
      
      const purchase = pResult.rows[0];

      const itemsResult = await connection.execute(
        `SELECT pi.item_id, pi.product_id, pi.quantity AS qty_purchased,
                pi.unit_price, pi.taxable_amount, pi.cgst_amount, pi.sgst_amount, pi.igst_amount, pi.total_amount,
                pi.returned_qty,
                pr.product_name, pr.hsn_code, pr.gst_rate
         FROM purchase_items pi
         JOIN products pr ON pi.product_id = pr.product_id AND pr.user_id = pi.user_id
         WHERE pi.purchase_id = :pid AND pi.user_id = :userId`,
        { pid: purchase.PURCHASE_ID, userId: req.user.id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const items = itemsResult.rows.map(item => {
        const qty_purchased = Number(item.QTY_PURCHASED) || 0;
        const qty_returned = Number(item.RETURNED_QTY) || 0;
        return {
          ...item,
          qty_returnable: Math.max(0, qty_purchased - qty_returned)
        };
      });

      return res.json({ success: true, data: { purchase, items } });
    }

    // 2. Otherwise, perform a broad search across invoice_number, supplier_name, or phone_number
    const searchResult = await connection.execute(
      `SELECT p.purchase_id, p.invoice_number, p.invoice_date, p.status,
              s.supplier_name, s.phone_number,
              (SELECT SUM(total_amount) FROM purchase_items WHERE purchase_id = p.purchase_id AND user_id = :userId) as total_amount
       FROM purchases p
       JOIN suppliers s ON p.supplier_id = s.supplier_id AND s.user_id = p.user_id
       WHERE (LOWER(p.invoice_number) LIKE LOWER(:q)
          OR LOWER(s.supplier_name) LIKE LOWER(:q)
          OR s.phone_number LIKE :q)
       AND p.user_id = :userId
       ORDER BY p.invoice_date DESC
       FETCH FIRST 10 ROWS ONLY`,
      { q: `%${queryTerm}%`, userId: req.user.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({ success: true, data: searchResult.rows || [] });

  } catch (error) {
    console.error('❌ Purchase Return Lookup Error:', error);
    res.status(500).json({ error: 'Failed to lookup purchase', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});


// POST /api/purchase-return - Consolidated and Enhanced Logic
// POST /api/purchase-return - Consolidated and Enhanced Logic PER USER
app.post('/api/purchase-return', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { purchase_id, items, notes, return_date } = req.body;

    console.log('📥 Purchase Return Request:', JSON.stringify(req.body, null, 2));

    if (!purchase_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Purchase ID and at least one item are required' });
    }

    if (!notes || !notes.trim()) {
      return res.status(400).json({ error: 'Reason for return is required' });
    }

    connection = await getConnection();

    // Verify purchase exists and get status
    const purchaseResult = await connection.execute(
      `SELECT purchase_id, status FROM purchases WHERE purchase_id = :id AND user_id = :userId`,
      { id: purchase_id, userId: req.user.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!purchaseResult.rows || purchaseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase record not found' });
    }
    
    if (purchaseResult.rows[0].STATUS === 'FULLY_RETURNED') {
      return res.status(400).json({ error: 'This purchase has already been fully returned' });
    }

    // Generate Return Number
    const returnNumber = await generatePurchaseReturnNumber(connection);
    const finalReturnDate = return_date || new Date().toISOString().split('T')[0];

    let totalReturnRefund = 0;
    let totalReturnTax = 0;

    // First validate all quantities before starting the transaction
    const originalItemsResult = await connection.execute(
      `SELECT pi.product_id, pi.quantity, pi.returned_qty, pi.unit_price, p.gst_rate, p.product_name
       FROM purchase_items pi
       JOIN products p ON pi.product_id = p.product_id AND p.user_id = pi.user_id
       WHERE pi.purchase_id = :id AND pi.user_id = :userId`,
      { id: purchase_id, userId: req.user.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const originalItems = originalItemsResult.rows;

    for (const returnItem of items) {
      const original = originalItems.find(row => row.PRODUCT_ID === parseInt(returnItem.product_id));
      if (!original) {
        throw new Error(`Product ID ${returnItem.product_id} not found in original purchase`);
      }
      
      const availableQty = (original.QUANTITY || 0) - (original.RETURNED_QTY || 0);
      if (returnItem.quantity > availableQty) {
        throw new Error(`Cannot return ${returnItem.quantity} for product '${original.PRODUCT_NAME}'. Only ${availableQty} available.`);
      }
      if (returnItem.quantity <= 0) {
        throw new Error(`Return quantity for '${original.PRODUCT_NAME}' must be greater than zero`);
      }
    }

    // Start Transaction Logic
    // 1. Insert Purchase Return Header
    await connection.execute(
      `INSERT INTO purchase_returns (purchase_id, return_number, return_date, notes, created_at, user_id)
       VALUES (:pid, :rnum, TO_DATE(:rdate, 'YYYY-MM-DD'), :notes, SYSDATE, :userId)`,
      {
        pid: purchase_id,
        rnum: returnNumber,
        rdate: finalReturnDate,
        notes: notes.trim(),
        userId: req.user.id
      }
    );

    const idResult = await connection.execute(
      `SELECT return_id FROM purchase_returns WHERE return_number = :rnum AND user_id = :userId ORDER BY created_at DESC FETCH FIRST 1 ROW ONLY`,
      { rnum: returnNumber, userId: req.user.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const returnId = idResult.rows[0].RETURN_ID;

    // 2. Process Items
    for (const item of items) {
      const original = originalItems.find(row => row.PRODUCT_ID === parseInt(item.product_id));
      const qty = parseFloat(item.quantity);
      const price = parseFloat(original.UNIT_PRICE);
      const gstRate = parseFloat(original.GST_RATE);
      
      const refund = qty * price;
      const tax = (refund * gstRate) / 100;
      
      totalReturnRefund += refund;
      totalReturnTax += tax;

      // Insert Return Item
      await connection.execute(
        `INSERT INTO purchase_return_items (return_id, product_id, quantity, unit_price, refund_amount, tax_amount, gst_rate, user_id)
         VALUES (:rid, :pid, :qty, :price, :refund, :tax, :gst, :userId)`,
        {
          rid: returnId,
          pid: item.product_id,
          qty: qty,
          price: price,
          refund: refund,
          tax: tax,
          gst: gstRate,
          userId: req.user.id
        }
      );

      // Update Purchase Item Returned Quantity
      await connection.execute(
        `UPDATE purchase_items SET returned_qty = NVL(returned_qty, 0) + :qty 
         WHERE purchase_id = :pid AND product_id = :prod_id AND user_id = :userId`,
        { qty: qty, pid: purchase_id, prod_id: item.product_id, userId: req.user.id }
      );

      // Deduct from Inventory
      await connection.execute(
        `UPDATE products SET quantity = quantity - :qty, updated_at = SYSDATE 
         WHERE product_id = :id AND user_id = :userId`,
        { qty: qty, id: item.product_id, userId: req.user.id }
      );
    }

    // 3. Update Return Header with Totals
    await connection.execute(
      `UPDATE purchase_returns SET total_refund = :total, tax_refund = :tax WHERE return_id = :rid AND user_id = :userId`,
      { total: totalReturnRefund + totalReturnTax, tax: totalReturnTax, rid: returnId, userId: req.user.id }
    );

    // 4. Update Overall Purchase Status
    const statusCheck = await connection.execute(
      `SELECT SUM(quantity) as total_qty, SUM(returned_qty) as total_returned
       FROM purchase_items WHERE purchase_id = :pid AND user_id = :userId`,
      { pid: purchase_id, userId: req.user.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    const { TOTAL_QTY, TOTAL_RETURNED } = statusCheck.rows[0];
    const newStatus = TOTAL_RETURNED >= TOTAL_QTY ? 'FULLY_RETURNED' : 'PARTIALLY_RETURNED';
    
    await connection.execute(
      `UPDATE purchases SET status = :status, updated_at = SYSDATE WHERE purchase_id = :pid AND user_id = :userId`,
      { status: newStatus, pid: purchase_id, userId: req.user.id }
    );

    await connection.commit();
    console.log(`✅ Purchase Return Processed: ${returnNumber} | Refund: ₹${(totalReturnRefund + totalReturnTax).toFixed(2)}`);

    res.status(201).json({
      success: true,
      message: 'Purchase return processed successfully',
      data: {
        return_id: returnId,
        return_number: returnNumber,
        total_refund: totalReturnRefund + totalReturnTax,
        status: newStatus
      }
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ Purchase Return Error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to process purchase return' });
  } finally {
    if (connection) await connection.close();
  }
});


// ==================== SALE RETURN API ====================

// ── Helper: generate return number e.g. RET-2026-0042 ────────────────────────
async function generateReturnNumber(connection) {
  const seqResult = await connection.execute(
    `SELECT sale_return_num_seq.NEXTVAL AS seq FROM dual`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const seq = seqResult.rows[0].SEQ;
  const year = new Date().getFullYear();
  return `RET-${year}-${String(seq).padStart(4, '0')}`;
}

// ── Helper: generate purchase return number e.g. PRET-2026-0042 ───────────────
async function generatePurchaseReturnNumber(connection) {
  const seqResult = await connection.execute(
    `SELECT purchase_return_num_seq.NEXTVAL AS seq FROM dual`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const seq = seqResult.rows[0].SEQ;
  const year = new Date().getFullYear();
  return `PRET-${year}-${String(seq).padStart(4, '0')}`;
}





// POST /api/sales/return — create a sale return PER USER
app.post('/api/sales/return', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { invoice_number, sale_id, return_date, notes, items } = req.body;

    console.log('📥 Sale Return Request:', JSON.stringify(req.body, null, 2));

    // ── Basic validation ──────────────────────────────────────────────────────
    if (!invoice_number && !sale_id) {
      return res.status(400).json({ error: 'Provide invoice_number or sale_id' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required for return' });
    }
    for (const it of items) {
      if (!it.product_id) return res.status(400).json({ error: 'Each item must have a product_id' });
      if (!it.quantity || it.quantity <= 0) {
        return res.status(400).json({ error: `Return quantity must be > 0 for product ${it.product_id}` });
      }
    }

    const userId = req.user.id;
    connection = await getConnection();

    // ── Resolve sale PER USER ──────────────────────────────────────────────────────────
    const saleResult = await connection.execute(
      invoice_number
        ? `SELECT sale_id, invoice_number, invoice_date, status
           FROM sales WHERE invoice_number = :ref AND user_id = :userId`
        : `SELECT sale_id, invoice_number, invoice_date, status
           FROM sales WHERE sale_id = :ref AND user_id = :userId`,
      { ref: invoice_number || parseInt(sale_id), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!saleResult.rows || saleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const sale = saleResult.rows[0];
    const finalSaleId = sale.SALE_ID;

    if (sale.STATUS === 'FULLY_RETURNED') {
      await connection.close();
      return res.status(400).json({ error: 'Invoice has already been fully returned' });
    }

    // ── Fetch original sale items PER USER ──────────────────────────────────────────
    const originalResult = await connection.execute(
      `SELECT
         si.product_id,
         si.quantity         AS qty_sold,
         si.unit_price,
         si.cgst_amount      AS orig_cgst,
         si.sgst_amount      AS orig_sgst,
         si.igst_amount      AS orig_igst,
         p.gst_rate,
         NVL((
           SELECT SUM(sri.quantity)
           FROM sale_return_items sri
           JOIN sale_returns sr ON sri.return_id = sr.return_id AND sr.user_id = sri.user_id
           WHERE sr.sale_id = si.sale_id AND sri.product_id = si.product_id AND sr.user_id = :userId
         ), 0) AS qty_already_returned
       FROM sale_items si
       JOIN products p ON si.product_id = p.product_id AND p.user_id = si.user_id
       WHERE si.sale_id = :sid AND si.user_id = :userId`,
      { sid: finalSaleId, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const originalMap = {};
    for (const row of originalResult.rows) {
      originalMap[row.PRODUCT_ID] = row;
    }

    // Determine tax type from original items
    const isIGST = originalResult.rows.some(r => (r.ORIG_IGST || 0) > 0);

    // ── Validate all return items ─────────────────────────────────────────
    for (const it of items) {
      const orig = originalMap[parseInt(it.product_id)];
      if (!orig) {
        await connection.close();
        return res.status(400).json({ error: `Product ${it.product_id} was not in the original invoice` });
      }
      const returnable = orig.QTY_SOLD - orig.QTY_ALREADY_RETURNED;
      if (returnable <= 0) {
        await connection.close();
        return res.status(400).json({ error: `Product ${it.product_id} has no remaining quantity to return` });
      }
      if (it.quantity > returnable) {
        await connection.close();
        return res.status(400).json({
          error: `Return quantity (${it.quantity}) exceeds returnable quantity (${returnable}) for product ${it.product_id}`
        });
      }
    }

    // ── Generate return number ────────────────────────────────────────────
    const returnNumber = await generateReturnNumber(connection);
    const finalReturnDate = return_date || new Date().toISOString().split('T')[0];

    // ── Calculate GST reversal totals ─────────────────────────────────────
    let totalRefund = 0;
    let totalSubtotal = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    const processedItems = items.map(it => {
      const orig = originalMap[parseInt(it.product_id)];
      const returnQty = parseFloat(it.quantity);
      const unitPrice = parseFloat(orig.UNIT_PRICE || 0);
      const gstRate   = parseFloat(orig.GST_RATE || 0);
      const taxable   = Math.round(returnQty * unitPrice * 100) / 100;

      let cgst = 0, sgst = 0, igst = 0;
      if (isIGST) {
        igst = Math.round((taxable * gstRate / 100) * 100) / 100;
      } else {
        cgst = Math.round((taxable * (gstRate / 2) / 100) * 100) / 100;
        sgst = Math.round((taxable * (gstRate / 2) / 100) * 100) / 100;
      }
      const lineTotal = taxable + cgst + sgst + igst;

      totalSubtotal += taxable;
      totalCGST     += cgst;
      totalSGST     += sgst;
      totalIGST     += igst;
      totalRefund   += lineTotal;

      return { ...it, product_id: parseInt(it.product_id), quantity: returnQty, unitPrice, taxable, cgst, sgst, igst, lineTotal };
    });

    totalRefund   = Math.round(totalRefund   * 100) / 100;
    totalSubtotal = Math.round(totalSubtotal * 100) / 100;
    totalCGST     = Math.round(totalCGST     * 100) / 100;
    totalSGST     = Math.round(totalSGST     * 100) / 100;
    totalIGST     = Math.round(totalIGST     * 100) / 100;

    // ── Insert sale_returns header PER USER ────────────────────────────────────────
    await connection.execute(
      `INSERT INTO sale_returns
         (sale_id, return_number, return_date, total_refund, is_igst, notes, created_at, user_id)
       VALUES
         (:sale_id, :rnum, TO_DATE(:rdate,'YYYY-MM-DD'), :refund, :is_igst, :notes, SYSDATE, :userId)`,
      {
        sale_id:  finalSaleId,
        rnum:     returnNumber,
        rdate:    finalReturnDate,
        refund:   totalRefund,
        is_igst:  isIGST ? 1 : 0,
        notes:    notes || null,
        userId
      }
    );

    const returnIdResult = await connection.execute(
      `SELECT return_id FROM sale_returns
       WHERE sale_id = :sid AND user_id = :userId ORDER BY created_at DESC FETCH FIRST 1 ROW ONLY`,
      { sid: finalSaleId, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const returnId = returnIdResult.rows[0].RETURN_ID;
    console.log('✅ Return header created:', returnId, returnNumber);

    // ── Insert return items + restore stock PER USER ───────────────────────────────
    for (const it of processedItems) {
      await connection.execute(
        `INSERT INTO sale_return_items
           (return_id, product_id, quantity, unit_price,
            taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, user_id)
         VALUES
           (:rid, :pid, :qty, :uprice, :taxable, :cgst, :sgst, :igst, :total, :userId)`,
        {
          rid:     returnId,
          pid:     it.product_id,
          qty:     it.quantity,
          uprice:  it.unitPrice,
          taxable: it.taxable,
          cgst:    it.cgst,
          sgst:    it.sgst,
          igst:    it.igst,
          total:   it.lineTotal,
          userId
        }
      );

      // Restore stock PER USER
      await connection.execute(
        `UPDATE products SET quantity = quantity + :qty, updated_at = SYSDATE
         WHERE product_id = :id AND user_id = :userId`,
        { qty: it.quantity, id: it.product_id, userId }
      );
    }

    // ── Update sale status PER USER ────────────────────────────────────────────────
    // Check if all items are now fully returned
    const statusCheck = await connection.execute(
      `SELECT
         si.product_id,
         si.quantity AS qty_sold,
         NVL((
           SELECT SUM(sri.quantity)
           FROM sale_return_items sri
           JOIN sale_returns sr ON sri.return_id = sr.return_id AND sr.user_id = sri.user_id
           WHERE sr.sale_id = si.sale_id AND sri.product_id = si.product_id AND sr.user_id = :userId
         ), 0) AS qty_returned
       FROM sale_items si
       WHERE si.sale_id = :sid AND si.user_id = :userId`,
      { sid: finalSaleId, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const fullyReturned = statusCheck.rows.every(r => r.QTY_RETURNED >= r.QTY_SOLD);
    const newStatus = fullyReturned ? 'FULLY_RETURNED' : 'PARTIALLY_RETURNED';
    await connection.execute(
      `UPDATE sales SET status = :status, updated_at = SYSDATE WHERE sale_id = :sid AND user_id = :userId`,
      { status: newStatus, sid: finalSaleId, userId }
    );

    await connection.commit();
    console.log(`✅ Sale return committed — ${returnNumber} | Status → ${newStatus}`);

    res.status(201).json({
      success: true,
      data: {
        return_id:      returnId,
        return_number:  returnNumber,
        sale_id:        finalSaleId,
        invoice_number: sale.INVOICE_NUMBER,
        return_date:    finalReturnDate,
        is_igst:        isIGST,
        invoice_status: newStatus,
        totals: {
          subtotal:    totalSubtotal,
          cgst:        totalCGST,
          sgst:        totalSGST,
          igst:        totalIGST,
          total_tax:   totalCGST + totalSGST + totalIGST,
          total_refund: totalRefund
        },
        items: processedItems.map(i => ({
          product_id:     i.product_id,
          quantity:       i.quantity,
          unit_price:     i.unitPrice,
          taxable_amount: i.taxable,
          cgst_amount:    i.cgst,
          sgst_amount:    i.sgst,
          igst_amount:    i.igst,
          total_amount:   i.lineTotal
        }))
      }
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) { /* ignore */ }
    }
    console.error('❌ Sale return error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to create sale return', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});


// GET /api/sales/returns/:returnId - Fetch return details PER USER
app.get('/api/sales/returns/:returnId', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { returnId } = req.params;
    const userId = req.user.id;
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT sr.return_id, sr.return_number, sr.return_date, sr.total_refund, sr.notes,
              s.invoice_number, c.customer_name
       FROM sale_returns sr
       JOIN sales s ON sr.sale_id = s.sale_id AND s.user_id = sr.user_id
       LEFT JOIN customers c ON s.customer_id = c.customer_id AND c.user_id = s.user_id
       WHERE sr.return_id = :returnId AND sr.user_id = :userId`,
      { returnId: parseInt(returnId), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Return not found' });
    }

    const itemsResult = await connection.execute(
      `SELECT sri.item_id, sri.product_id, sri.quantity, sri.unit_price, sri.taxable_amount, sri.cgst_amount,
              sri.sgst_amount, sri.igst_amount, sri.total_amount,
              p.product_name, p.hsn_code, p.gst_rate
       FROM sale_return_items sri
       LEFT JOIN products p ON sri.product_id = p.product_id AND p.user_id = sri.user_id
       WHERE sri.return_id = :returnId AND sri.user_id = :userId`,
      { returnId: parseInt(returnId), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.status(200).json({
      success: true,
      data: {
        ...result.rows[0],
        products: itemsResult.rows || [],
        items: itemsResult.rows || []
      }
    });
  } catch (error) {
    console.error('❌ Sale return detail fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch return details', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==================== STOCK REPORT API ====================

// GET /api/stock-report - Fetch stock report
// GET /api/stock-report - Fetch stock report PER USER
app.get('/api/stock-report', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const userId = req.user.id;
    const result = await connection.execute(
      `SELECT p.product_id, p.product_name, p.hsn_code, p.quantity, p.purchase_price, p.sale_price, 
              p.gst_rate, s.supplier_name
       FROM products p
       LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id AND s.user_id = p.user_id
       WHERE p.is_active = 1 AND p.user_id = :userId
       ORDER BY p.product_name`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error('❌ Stock report error:', error.message);
    res.status(500).json({ error: 'Failed to fetch stock report', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==================== EXPORT API ====================

// GET /api/export - Export purchase data
// GET /api/export - Export purchase data PER USER
app.get('/api/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await getConnection();
    const result = await connection.execute(
      `SELECT s.supplier_name, s.gst_number, p.hsn_code, p.product_name, 
              pi.quantity, pi.unit_price, pi.cgst_amount, pi.sgst_amount, pi.total_amount, 
              pur.invoice_date
       FROM purchase_items pi
       JOIN purchases pur ON pi.purchase_id = pur.purchase_id AND pur.user_id = pi.user_id
       JOIN suppliers s ON pur.supplier_id = s.supplier_id AND s.user_id = pur.user_id
       JOIN products p ON pi.product_id = p.product_id AND p.user_id = pi.user_id
       WHERE pi.user_id = :userId
       ORDER BY pur.invoice_date DESC`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    await connection.close();

    // Format CSV
    const headers = ['Supplier Name', 'GST Number', 'HSN Code', 'Product Name', 'Quantity', 'Unit Price', 'CGST', 'SGST', 'Total', 'Date'];
    const rows = result.rows.map(row => [
      row.SUPPLIER_NAME, row.GST_NUMBER, row.HSN_CODE, row.PRODUCT_NAME,
      row.QUANTITY, row.UNIT_PRICE, row.CGST_AMOUNT, row.SGST_AMOUNT, row.TOTAL_AMOUNT, row.INVOICE_DATE
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="purchase_export.csv"');
    res.send(csv);
  } catch (error) {
    console.error('❌ Export error:', error.message);
    res.status(500).json({ error: 'Failed to export data', details: error.message });
  }
});

// ==================== DASHBOARD API ====================
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const userId = req.user.id;
    const filter = req.query.filter || 'all'; // 'mtd', 'ytd', 'all'

    let dateFilterSaleItems = '';
    let dateFilterPurchaseItems = '';
    let dateFilterSales = '';
    let dateFilterPurchases = '';
    const binds = { userId };

    if (filter === 'mtd') {
      dateFilterSaleItems = ` AND EXISTS (SELECT 1 FROM sales s WHERE s.sale_id = si.sale_id AND s.user_id = si.user_id AND TRUNC(s.invoice_date, 'MM') = TRUNC(SYSDATE, 'MM'))`;
      dateFilterPurchaseItems = ` AND EXISTS (SELECT 1 FROM purchases p WHERE p.purchase_id = pi.purchase_id AND p.user_id = pi.user_id AND TRUNC(p.invoice_date, 'MM') = TRUNC(SYSDATE, 'MM'))`;
      dateFilterSales = ` AND TRUNC(s.invoice_date, 'MM') = TRUNC(SYSDATE, 'MM')`;
      dateFilterPurchases = ` AND TRUNC(p.invoice_date, 'MM') = TRUNC(SYSDATE, 'MM')`;
    } else if (filter === 'ytd') {
      dateFilterSaleItems = ` AND EXISTS (SELECT 1 FROM sales s WHERE s.sale_id = si.sale_id AND s.user_id = si.user_id AND EXTRACT(YEAR FROM s.invoice_date) = EXTRACT(YEAR FROM SYSDATE))`;
      dateFilterPurchaseItems = ` AND EXISTS (SELECT 1 FROM purchases p WHERE p.purchase_id = pi.purchase_id AND p.user_id = pi.user_id AND EXTRACT(YEAR FROM p.invoice_date) = EXTRACT(YEAR FROM SYSDATE))`;
      dateFilterSales = ` AND EXTRACT(YEAR FROM s.invoice_date) = EXTRACT(YEAR FROM SYSDATE)`;
      dateFilterPurchases = ` AND EXTRACT(YEAR FROM p.invoice_date) = EXTRACT(YEAR FROM SYSDATE)`;
    }

    const [revenueResult, expensesResult, inventoryResult, lowStockResult, lowStockItemsResult,
           salesCountResult, purchasesCountResult, saleReturnsResult, purchaseReturnsResult,
           customersResult, suppliersResult, categoryResult, recentProductsResult,
           monthlySalesResult, monthlyPurchasesResult] = await Promise.all([
      connection.execute(`SELECT NVL(SUM(si.total_amount), 0) as totalRevenue FROM sale_items si WHERE si.user_id = :userId${dateFilterSaleItems}`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(`SELECT NVL(SUM(pi.total_amount), 0) as totalExpenses FROM purchase_items pi WHERE pi.user_id = :userId${dateFilterPurchaseItems}`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(`SELECT NVL(SUM(quantity * purchase_price), 0) as inventoryValue, NVL(SUM(quantity), 0) as quantityInHand, COUNT(*) as totalItems FROM products WHERE is_active = 1 AND user_id = :userId`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(`SELECT COUNT(*) as lowStockCount FROM products WHERE is_active = 1 AND quantity <= 10 AND user_id = :userId`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(`SELECT product_name, quantity, hsn_code FROM products WHERE is_active = 1 AND quantity <= 10 AND user_id = :userId ORDER BY quantity ASC FETCH FIRST 5 ROWS ONLY`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(`SELECT COUNT(*) as totalSales FROM sales s WHERE s.user_id = :userId${dateFilterSales}`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(`SELECT COUNT(*) as totalPurchases FROM purchases p WHERE p.user_id = :userId${dateFilterPurchases}`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(`SELECT COUNT(*) as totalSaleReturns FROM sale_returns WHERE user_id = :userId`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(`SELECT COUNT(*) as totalPurchaseReturns FROM purchase_returns WHERE user_id = :userId`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(`SELECT COUNT(*) as totalCustomers FROM customers WHERE user_id = :userId`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(`SELECT COUNT(*) as totalSuppliers FROM suppliers WHERE is_active = 1 AND user_id = :userId`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(`SELECT NVL(s.supplier_name, 'Unknown') as "_id", COUNT(*) as count FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id AND s.user_id = p.user_id WHERE p.is_active = 1 AND p.user_id = :userId GROUP BY NVL(s.supplier_name, 'Unknown') ORDER BY count DESC`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(`SELECT product_id as "_id", product_name, hsn_code as sku, quantity, purchase_price, sale_price FROM products WHERE is_active = 1 AND user_id = :userId ORDER BY NVL(updated_at, created_at) DESC FETCH FIRST 5 ROWS ONLY`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(`SELECT TO_CHAR(s.invoice_date, 'MON') as month, EXTRACT(MONTH FROM s.invoice_date) as monthNum, EXTRACT(YEAR FROM s.invoice_date) as year, NVL(SUM(si.total_amount), 0) as totalSales FROM sales s JOIN sale_items si ON s.sale_id = si.sale_id AND si.user_id = s.user_id WHERE s.user_id = :userId AND s.invoice_date >= ADD_MONTHS(TRUNC(SYSDATE, 'MM'), -11) GROUP BY TO_CHAR(s.invoice_date, 'MON'), EXTRACT(MONTH FROM s.invoice_date), EXTRACT(YEAR FROM s.invoice_date) ORDER BY year, monthNum`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(`SELECT TO_CHAR(p.invoice_date, 'MON') as month, EXTRACT(MONTH FROM p.invoice_date) as monthNum, EXTRACT(YEAR FROM p.invoice_date) as year, NVL(SUM(pi.total_amount), 0) as totalPurchases FROM purchases p JOIN purchase_items pi ON p.purchase_id = pi.purchase_id AND pi.user_id = p.user_id WHERE p.user_id = :userId AND p.invoice_date >= ADD_MONTHS(TRUNC(SYSDATE, 'MM'), -11) GROUP BY TO_CHAR(p.invoice_date, 'MON'), EXTRACT(MONTH FROM p.invoice_date), EXTRACT(YEAR FROM p.invoice_date) ORDER BY year, monthNum`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
    ]);

    // Build 12-month chart array
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      last12Months.push({ month: d.toLocaleString('en', { month: 'short' }).toUpperCase(), year: d.getFullYear(), monthNum: d.getMonth() + 1, sales: 0, purchases: 0 });
    }
    (monthlySalesResult.rows || []).forEach(r => {
      const e = last12Months.find(m => m.month === String(r.MONTH).toUpperCase() && m.year === Number(r.YEAR));
      if (e) e.sales = Number(r.TOTALSALES) || 0;
    });
    (monthlyPurchasesResult.rows || []).forEach(r => {
      const e = last12Months.find(m => m.month === String(r.MONTH).toUpperCase() && m.year === Number(r.YEAR));
      if (e) e.purchases = Number(r.TOTALPURCHASES) || 0;
    });

    const totalRevenue = Number(revenueResult.rows[0]?.TOTALREVENUE) || 0;
    const totalExpenses = Number(expensesResult.rows[0]?.TOTALEXPENSES) || 0;

    res.status(200).json({
      totalRevenue,
      totalExpenses,
      totalProfit: totalRevenue - totalExpenses,
      inventoryValue: Number(inventoryResult.rows[0]?.INVENTORYVALUE) || 0,
      quantityInHand: Number(inventoryResult.rows[0]?.QUANTITYINHAND) || 0,
      totalItems: Number(inventoryResult.rows[0]?.TOTALITEMS) || 0,
      lowStockCount: Number(lowStockResult.rows[0]?.LOWSTOCKCOUNT) || 0,
      lowStockItems: (lowStockItemsResult.rows || []).map(r => ({ product_name: r.PRODUCT_NAME, quantity: Number(r.QUANTITY), hsn_code: r.HSN_CODE })),
      totalSales: Number(salesCountResult.rows[0]?.TOTALSALES) || 0,
      totalPurchases: Number(purchasesCountResult.rows[0]?.TOTALPURCHASES) || 0,
      totalSaleReturns: Number(saleReturnsResult.rows[0]?.TOTALSALERETURNS) || 0,
      totalPurchaseReturns: Number(purchaseReturnsResult.rows[0]?.TOTALPURCHASERETURNS) || 0,
      totalReturns: (Number(saleReturnsResult.rows[0]?.TOTALSALERETURNS) || 0) + (Number(purchaseReturnsResult.rows[0]?.TOTALPURCHASERETURNS) || 0),
      totalCustomers: Number(customersResult.rows[0]?.TOTALCUSTOMERS) || 0,
      totalSuppliers: Number(suppliersResult.rows[0]?.TOTALSUPPLIERS) || 0,
      categoryDistribution: (categoryResult.rows || []).map(r => ({ _id: r['_id'], count: Number(r.COUNT) })),
      recentProducts: (recentProductsResult.rows || []).map(p => ({ _id: p['_id'], product_name: p.PRODUCT_NAME, sku: p.SKU, quantity: Number(p.QUANTITY), purchase_price: Number(p.PURCHASE_PRICE), sale_price: Number(p.SALE_PRICE) })),
      monthlyChart: last12Months.map(m => ({ month: m.month, sales: m.sales, purchases: m.purchases })),
      filter
    });
  } catch (error) {
    console.error('❌ Dashboard stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch dashboard stats', details: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==================== SETTINGS API ====================


// GET /api/settings - Get all settings
app.get('/api/settings', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const userId = req.user.id;
    
    const result = await connection.execute(
      `SELECT setting_key, setting_value, setting_group FROM settings WHERE user_id = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    // Build response object from scratch (no references to Oracle objects)
    const response = {
      business: {},
      tax: {},
      invoice: {},
      notifications: {}
    };
    
    const rowCount = result.rows ? result.rows.length : 0;
    console.log(`📊 Found ${rowCount} settings`);
    
    if (result.rows && result.rows.length > 0) {
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows[i];
        
        // Handle both object and array row formats
        let group, key, value;
        
        if (Array.isArray(row)) {
          // Array format: [key, value, group]
          key = String(row[0] || '');
          value = row[1];
          group = String(row[2] || 'general');
        } else {
          // Object format
          group = String(row.SETTING_GROUP || row.setting_group || 'general');
          key = String(row.SETTING_KEY || row.setting_key || '');
          value = row.SETTING_VALUE || row.setting_value;
        }
        
        // Convert value to plain string (handle LOBs)
        if (value !== null && value !== undefined) {
          // If it's a LOB object, convert to string properly
          if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
            // Check if it's a CLOB/LOB - try to read it
            if (value.toFixed) {
              // It's a number object
              value = value.toString();
            } else if (typeof value.toString === 'function') {
              const strValue = value.toString();
              // If toString returns [object Object], it's not a simple value
              if (strValue === '[object Object]') {
                // Skip this value or set to empty string
                value = '';
              } else {
                value = strValue;
              }
            } else {
              value = '';
            }
          }
          // Try to parse JSON
          if (typeof value === 'string') {
            // Handle boolean strings
            if (value.toLowerCase() === 'true') {
              value = true;
            } else if (value.toLowerCase() === 'false') {
              value = false;
            } else if (value.startsWith('{') || value.startsWith('[')) {
              // Try to parse JSON objects/arrays
              try {
                value = JSON.parse(value);
              } catch (e) {
                // Keep as string
              }
            } else if (!isNaN(value) && value.trim() !== '') {
              // Try to parse numbers
              const numValue = Number(value);
              if (!isNaN(numValue)) {
                value = numValue;
              }
            }
          }
        }
        
        // Remove group prefix from key
        const prefix = group + '_';
        const cleanKey = key.startsWith(prefix) ? key.substring(prefix.length) : key;
        
        if (response[group]) {
          response[group][cleanKey] = value;
        }
        
        // Debug: log first few values
        if (i < 3) {
          console.log(`  Setting ${i}: group=${group}, key=${cleanKey}, type=${typeof value}, value=${JSON.stringify(value)}`);
        }
      }
    }
    
    console.log('✅ Settings fetched:', 
      'business:' + Object.keys(response.business).length + ', ' +
      'tax:' + Object.keys(response.tax).length + ', ' +
      'invoice:' + Object.keys(response.invoice).length + ', ' +
      'notifications:' + Object.keys(response.notifications).length
    );
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Settings fetch error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch settings', details: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        // Ignore
      }
    }
  }
});

// POST /api/settings/:group - Save settings for a group
app.post('/api/settings/:group', async (req, res) => {
  let connection;
  try {
    const { group } = req.params;
    const settingsData = req.body;

    // ✅ FIX: Backend GSTIN validation
    if (group === 'business' && settingsData.gstin) {
      const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[0-9A-Z]{1}[0-9A-Z]{1}$/;
      if (!GSTIN_REGEX.test(settingsData.gstin.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid GSTIN format. Expected format: 27AABCU9603R1ZX'
        });
      }
    }

    // ✅ FIX: Backend business name validation
    if (group === 'business' && (!settingsData.businessName || settingsData.businessName.trim().length < 2)) {
      return res.status(400).json({
        success: false,
        message: 'Business name is required and must be at least 2 characters'
      });
    }
    
    console.log(`💾 Saving ${group} settings:`, Object.keys(settingsData).join(', '));
    
    connection = await getConnection();
    const userId = req.user.id;
    
    let savedCount = 0;
    
    // Update or insert each setting PER USER
    for (const [key, value] of Object.entries(settingsData)) {
      // Skip internal React properties or functions
      if (key.startsWith('_') || typeof value === 'function') continue;
      
      const settingKey = `${group}_${key}`;
      const settingValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      console.log(`  📝 ${settingKey} = ${settingValue.substring(0, 50)}${settingValue.length > 50 ? '...' : ''}`);
      
      // Try to update first PER USER
      const updateResult = await connection.execute(
        `UPDATE settings SET setting_value = :val, updated_at = SYSDATE WHERE setting_key = :k AND user_id = :userId`,
        { k: settingKey, val: settingValue, userId }
      );
      
      // If no rows updated, insert new PER USER
      if (updateResult.rowsAffected === 0) {
        await connection.execute(
          `INSERT INTO settings (setting_key, setting_value, setting_group, updated_at, user_id) 
           VALUES (:k, :val, :grp, SYSDATE, :userId)`,
          { k: settingKey, val: settingValue, grp: group, userId }
        );
        console.log(`  ➕ Inserted new setting: ${settingKey}`);
      } else {
        console.log(`  🔄 Updated setting: ${settingKey}`);
      }
      savedCount++;
    }
    
    await connection.commit();
    console.log(`✅ Saved ${savedCount} settings for ${group}`);
    res.status(200).json({ success: true, message: `Saved ${savedCount} settings successfully` });
  } catch (error) {
    console.error('❌ Settings save error:', error.message);
    res.status(500).json({ error: 'Failed to save settings', details: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        // Ignore close errors
      }
    }
  }
});

// PUT /api/settings/:group - Update settings (alias for POST with UPSERT)
app.put('/api/settings/:group', async (req, res) => {
  let connection;
  try {
    const { group } = req.params;
    const settingsData = req.body;

    // ✅ FIX: Backend GSTIN validation
    if (group === 'business' && settingsData.gstin) {
      const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[0-9A-Z]{1}[0-9A-Z]{1}$/;
      if (!GSTIN_REGEX.test(settingsData.gstin.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid GSTIN format. Expected format: 27AABCU9603R1ZX'
        });
      }
    }
    
    console.log(`💾 Updating ${group} settings (PUT):`, Object.keys(settingsData).join(', '));
    
    connection = await getConnection();
    const userId = req.user.id;
    
    let savedCount = 0;
    
    // Update or insert each setting (UPSERT) PER USER
    for (const [key, value] of Object.entries(settingsData)) {
      // Skip internal React properties or functions
      if (key.startsWith('_') || typeof value === 'function') continue;
      
      const settingKey = `${group}_${key}`;
      const settingValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      console.log(`  📝 ${settingKey} = ${settingValue.substring(0, 50)}${settingValue.length > 50 ? '...' : ''}`);
      
      // Try to update first PER USER
      const updateResult = await connection.execute(
        `UPDATE settings SET setting_value = :val, updated_at = SYSDATE WHERE setting_key = :k AND user_id = :userId`,
        { k: settingKey, val: settingValue, userId }
      );
      
      // If no rows updated, insert new PER USER
      if (updateResult.rowsAffected === 0) {
        await connection.execute(
          `INSERT INTO settings (setting_key, setting_value, setting_group, updated_at, user_id) 
           VALUES (:k, :val, :grp, SYSDATE, :userId)`,
          { k: settingKey, val: settingValue, grp: group, userId }
        );
        console.log(`  ➕ Inserted new setting: ${settingKey}`);
      } else {
        console.log(`  🔄 Updated setting: ${settingKey}`);
      }
      savedCount++;
    }
    
    await connection.commit();
    console.log(`✅ Updated ${savedCount} settings for ${group}`);
    res.status(200).json({ success: true, message: `Updated ${savedCount} settings successfully` });
  } catch (error) {
    console.error('❌ Settings update error:', error.message);
    res.status(500).json({ error: 'Failed to update settings', details: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        // Ignore close errors
      }
    }
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ==================== START SERVER ====================

const startServer = (port, attempts = 0) => {
  if (attempts > 10) {
    console.error('❌ Could not find available port. Giving up.');
    process.exit(1);
  }

  const server = app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📊 API Base URL: http://localhost:${port}/api`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`⚠️ Port ${port} is already in use. Trying port ${nextPort}...`);
      startServer(nextPort, attempts + 1);
      return;
    }
    console.error('❌ Server error:', error);
    process.exit(1);
  });
};

startServer(parseInt(PORT, 10));

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️  Shutting down...');
  await closePool();
  process.exit(0);
});
