const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'campus-trading.db');

const dbExists = fs.existsSync(dbPath);
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    seller TEXT NOT NULL,
    status TEXT DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    buyer TEXT NOT NULL,
    seller TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending',
    return_reason TEXT,
    return_status TEXT DEFAULT 'none',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  if (!dbExists) {
    const sampleProducts = [
      { name: '高等数学教材', price: 25.00, description: '二手教材，保存完好', seller: 'seller1' },
      { name: '篮球', price: 50.00, description: '九成新篮球', seller: 'seller1' },
      { name: '台灯', price: 35.00, description: 'LED护眼台灯', seller: 'seller2' },
      { name: '耳机', price: 120.00, description: '蓝牙耳机，音质好', seller: 'seller2' }
    ];

    const insertProduct = db.prepare('INSERT INTO products (name, price, description, seller) VALUES (?, ?, ?, ?)');
    sampleProducts.forEach(p => {
      insertProduct.run(p.name, p.price, p.description, p.seller);
    });
    insertProduct.finalize();

    console.log('数据库初始化完成！');
  }
});

module.exports = db;
