const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// For Vercel serverless functions, use SQLite in /tmp directory
// Note: Data won't persist between function calls in serverless
if (process.env.VERCEL) {
  console.log('Using Vercel-compatible SQLite database in /tmp');
  const dbPath = path.join('/tmp', 'lumis-database.sqlite');
  var db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening Vercel database:', err.message);
    } else {
      console.log('Connected to Vercel SQLite database.');
      initializeTables();
    }
  });
} else if (process.env.NODE_ENV === 'production') {
  // For Railway or other production deployments
  console.log('Using in-memory SQLite database for production deployment');
  var db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
      console.error('Error opening in-memory database:', err.message);
    } else {
      console.log('Connected to in-memory SQLite database.');
      initializeTables();
    }
  });
} else {
  // Local development with file-based database
  const dbPath = path.join(__dirname, '..', 'database.sqlite');
  var db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to SQLite database.');
      initializeTables();
    }
  });
}

// Initialize database tables
function initializeTables() {
  // Orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      shipping_address TEXT NOT NULL, -- JSON string
      cart_items TEXT NOT NULL, -- JSON string
      total_amount INTEGER NOT NULL, -- Amount in kobo
      status TEXT DEFAULT 'pending', -- pending, paid, failed, cancelled
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Payments table
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE NOT NULL,
      paystack_id TEXT,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'NGN',
      status TEXT NOT NULL, -- success, failed, abandoned
      gateway_response TEXT,
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reference) REFERENCES orders (reference)
    )
  `);

  console.log('Database tables initialized.');
}

// Promisify database operations for async/await
const dbAsync = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  },

  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
};

module.exports = dbAsync;
