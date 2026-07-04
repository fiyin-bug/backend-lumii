import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.config.js';

function parseJsonField(value, fallback = []) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    description: row.description,
    price: Number(row.price || 0),
    currency: row.currency,
    images: parseJsonField(row.images, []),
    category: row.category,
    inventory: { stock: Number(row.inventory_stock || 0) },
    tags: parseJsonField(row.tags, []),
    active: !!row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizePrice(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

export async function listProducts(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '24', 10), 1), 100);
    const offset = (page - 1) * limit;

    const filters = [];
    const params = [];

    if (req.query.category) {
      filters.push('category = ?');
      params.push(req.query.category);
    }
    if (req.query.active !== undefined) {
      filters.push('active = ?');
      params.push(req.query.active === 'true' ? 1 : 0);
    }
    if (req.query.q) {
      filters.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${req.query.q}%`, `%${req.query.q}%`);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    // Sorting
    let order = 'ORDER BY created_at DESC';
    if (req.query.sort === 'price:asc') order = 'ORDER BY price ASC';
    if (req.query.sort === 'price:desc') order = 'ORDER BY price DESC';

    const totalRow = await db.get(`SELECT COUNT(*) as total FROM products ${where}`, params);
    const total = totalRow ? totalRow.total : 0;

    const sql = `SELECT * FROM products ${where} ${order} LIMIT ? OFFSET ?`;
    const rows = await new Promise((resolve, reject) => {
      db.all(sql, [...params, limit, offset], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    const items = rows.map(parseRow);

    return res.json({ success: true, data: { items, total, page, limit } });
  } catch (err) {
    console.error('List products error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getProduct(req, res) {
  try {
    const id = req.params.id;
    const row = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: parseRow(row) });
  } catch (err) {
    console.error('Get product error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function createProduct(req, res) {
  try {
    const body = req.body || {};
    const errors = {};
    if (!body.name) errors.name = 'required';
    if (body.price == null || Number(body.price) < 0) errors.price = 'must be >= 0';
    if (!body.category) errors.category = 'required';
    if (Object.keys(errors).length) return res.status(400).json({ success: false, errors });

    const id = uuidv4();
    const images = JSON.stringify(Array.isArray(body.images) ? body.images : []);
    const tags = JSON.stringify(Array.isArray(body.tags) ? body.tags : []);
    const inventoryStock = Number((body.inventory && body.inventory.stock) || 0);
    const price = normalizePrice(body.price);

    await db.run(`INSERT INTO products (id,name,sku,description,price,currency,images,category,inventory_stock,tags,active) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [
      id, body.name, body.sku || null, body.description || null, price, body.currency || 'NGN', images, body.category, inventoryStock, tags, body.active ? 1 : 0
    ]);

    const created = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    return res.status(201).json({ success: true, data: parseRow(created) });
  } catch (err) {
    console.error('Create product error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateProduct(req, res) {
  try {
    const id = req.params.id;
    const existing = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    const body = req.body || {};
    const newRow = {
      name: body.name ?? existing.name,
      sku: body.sku ?? existing.sku,
      description: body.description ?? existing.description,
      price: body.price === undefined ? existing.price : normalizePrice(body.price),
      currency: body.currency ?? existing.currency,
      images: JSON.stringify(Array.isArray(body.images) ? body.images : parseJsonField(existing.images, [])),
      category: body.category ?? existing.category,
      inventory_stock: body.inventory && body.inventory.stock !== undefined ? Number(body.inventory.stock) : existing.inventory_stock,
      tags: JSON.stringify(Array.isArray(body.tags) ? body.tags : parseJsonField(existing.tags, [])),
      active: body.active === undefined ? existing.active : (body.active ? 1 : 0),
    };

    await db.run(`UPDATE products SET name=?,sku=?,description=?,price=?,currency=?,images=?,category=?,inventory_stock=?,tags=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`, [
      newRow.name, newRow.sku, newRow.description, newRow.price, newRow.currency, newRow.images, newRow.category, newRow.inventory_stock, newRow.tags, newRow.active, id
    ]);

    const updated = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    return res.json({ success: true, data: parseRow(updated) });
  } catch (err) {
    console.error('Update product error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteProduct(req, res) {
  try {
    const id = req.params.id;
    const existing = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    await db.run('DELETE FROM products WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete product error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export default { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
