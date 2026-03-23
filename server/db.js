const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite DB
const dbPath = path.resolve(__dirname, 'feirai.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

// Initialize Schema
function initDb() {
    db.serialize(() => {
        // Products
        db.run(`CREATE TABLE IF NOT EXISTS Product (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            brand TEXT,
            unit TEXT
        )`);

        // Upgrade existing DB
        db.run('ALTER TABLE Product ADD COLUMN brand TEXT', (err) => {});

        // Places (Supermarkets)
        db.run(`CREATE TABLE IF NOT EXISTS Place (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            location TEXT,
            lat REAL,
            lng REAL
        )`);

        // Upgrade existing DB if needed (ignoring error if column already exists)
        db.run('ALTER TABLE Place ADD COLUMN lat REAL', (err) => {});
        db.run('ALTER TABLE Place ADD COLUMN lng REAL', (err) => {});

        // Shopping Runs
        db.run(`CREATE TABLE IF NOT EXISTS ShoppingRun (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            total_amount REAL NOT NULL
        )`);

        // Shopping Items
        db.run(`CREATE TABLE IF NOT EXISTS ShoppingItem (
            id TEXT PRIMARY KEY,
            run_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            place_id TEXT NOT NULL,
            price REAL NOT NULL,
            quantity REAL NOT NULL,
            FOREIGN KEY(run_id) REFERENCES ShoppingRun(id),
            FOREIGN KEY(product_id) REFERENCES Product(id),
            FOREIGN KEY(place_id) REFERENCES Place(id)
        )`);
    });
}

// Utility Promises for SQLite
const dbRun = (query, params = []) => new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
        if (err) reject(err);
        else resolve(this);
    });
});

const dbAll = (query, params = []) => new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

const dbGet = (query, params = []) => new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

module.exports = { db, dbRun, dbAll, dbGet };
