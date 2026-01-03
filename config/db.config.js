const sqlite3 = require("sqlite3");
const path = require("path");

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
      status TEXT DEFAULT 'pending'
    )
  `);
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

module.exports = { run, get };
