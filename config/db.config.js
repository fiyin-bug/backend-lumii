import sqlite3 from "sqlite3";
import path from "path";

let db;

// Vercel serverless
if (process.env.VERCEL) {
  console.log("Running in Vercel serverless: using /tmp SQLite");
  const dbPath = path.join("/tmp", "database.sqlite");

  db = new sqlite3.Database(dbPath);
} else {
  // Local dev
  const dbPath = path.join(process.cwd(), "database.sqlite");
  db = new sqlite3.Database(dbPath);
}

function init() {
  // Core order table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT,
      email TEXT,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      shipping_address TEXT,
      cart_items TEXT,
      total_amount INTEGER,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Payment records used by verifyPaymentStatus
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE,
      paystack_id TEXT,
      amount INTEGER,
      currency TEXT,
      status TEXT,
      gateway_response TEXT,
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Lightweight runtime migration for existing databases
  db.all(`PRAGMA table_info(orders)`, [], (err, columns = []) => {
    if (err) {
      console.error('DB migration check failed for orders:', err.message);
      return;
    }

    const names = new Set(columns.map((c) => c.name));

    if (!names.has('created_at')) {
      db.run(`ALTER TABLE orders ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    }

    if (!names.has('updated_at')) {
      db.run(`ALTER TABLE orders ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    }
  });
}

init();

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export default { run, get };
