const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const db = require('./database');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = 3000;

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products WHERE status = "available"', (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

app.post('/api/products', (req, res) => {
  const { name, price, description, seller } = req.body;
  db.run(
    'INSERT INTO products (name, price, description, seller) VALUES (?, ?, ?, ?)',
    [name, price, description, seller],
    function(err) {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ id: this.lastID, name, price, description, seller, status: 'available' });
    }
  );
});

app.put('/api/products/:id', (req, res) => {
  const { name, price, description } = req.body;
  db.run(
    'UPDATE products SET name = ?, price = ?, description = ? WHERE id = ?',
    [name, price, description, req.params.id],
    function(err) {
      if (err) res.status(500).json({ error: err.message });
      else if (this.changes === 0) res.status(404).json({ error: 'Product not found' });
      else res.json({ message: 'Product updated successfully' });
    }
  );
});

app.delete('/api/products/:id', (req, res) => {
  db.run(
    'DELETE FROM products WHERE id = ?',
    [req.params.id],
    function(err) {
      if (err) res.status(500).json({ error: err.message });
      else if (this.changes === 0) res.status(404).json({ error: 'Product not found' });
      else res.json({ message: 'Product deleted successfully' });
    }
  );
});

app.get('/api/products/seller/:seller', (req, res) => {
  db.all('SELECT * FROM products WHERE seller = ?', [req.params.seller], (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

app.post('/api/orders', (req, res) => {
  const { product_id, buyer, seller, quantity = 1 } = req.body;
  
  db.run(
    'INSERT INTO orders (product_id, buyer, seller, quantity) VALUES (?, ?, ?, ?)',
    [product_id, buyer, seller, quantity],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const message = `买家 ${buyer} 购买了 ${quantity} 件您的商品！`;
      db.run(
        'INSERT INTO notifications (recipient, message, type) VALUES (?, ?, ?)',
        [seller, message, 'order'],
        (notifErr) => {
          if (!notifErr) {
            io.emit('notification', { recipient: seller, message, type: 'order' });
          }
          res.json({ id: this.lastID, product_id, buyer, seller, quantity, status: 'pending' });
        }
      );
    }
  );
});

app.get('/api/orders/seller/:seller', (req, res) => {
  db.all(
    `SELECT o.*, p.name as product_name, p.price 
     FROM orders o 
     JOIN products p ON o.product_id = p.id 
     WHERE o.seller = ? 
     ORDER BY o.created_at DESC`,
    [req.params.seller],
    (err, rows) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json(rows);
    }
  );
});

app.get('/api/orders/buyer/:buyer', (req, res) => {
  db.all(
    `SELECT o.*, p.name as product_name, p.price 
     FROM orders o 
     JOIN products p ON o.product_id = p.id 
     WHERE o.buyer = ? 
     ORDER BY o.created_at DESC`,
    [req.params.buyer],
    (err, rows) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json(rows);
    }
  );
});

app.post('/api/orders/:id/return', (req, res) => {
  const { reason } = req.body;
  const orderId = req.params.id;
  
  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    
    db.run(
      'UPDATE orders SET return_reason = ?, return_status = "requested" WHERE id = ?',
      [reason, orderId],
      function(updateErr) {
        if (updateErr) {
          res.status(500).json({ error: updateErr.message });
          return;
        }
        
        const message = `买家 ${order.buyer} 申请退货！`;
        db.run(
          'INSERT INTO notifications (recipient, message, type) VALUES (?, ?, ?)',
          [order.seller, message, 'return'],
          (notifErr) => {
            if (!notifErr) {
              io.emit('notification', { recipient: order.seller, message, type: 'return' });
            }
            res.json({ message: 'Return request submitted successfully' });
          }
        );
      }
    );
  });
});

app.put('/api/orders/:id/return/approve', (req, res) => {
  const orderId = req.params.id;
  
  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    
    db.run(
      'UPDATE orders SET return_status = "approved" WHERE id = ?',
      [orderId],
      function(updateErr) {
        if (updateErr) {
          res.status(500).json({ error: updateErr.message });
          return;
        }
        
        db.run(
          'UPDATE products SET status = "available" WHERE id = ?',
          [order.product_id],
          (productErr) => {
            const message = `卖家已同意您的退货申请！`;
            db.run(
              'INSERT INTO notifications (recipient, message, type) VALUES (?, ?, ?)',
              [order.buyer, message, 'return_approved'],
              (notifErr) => {
                if (!notifErr) {
                  io.emit('notification', { recipient: order.buyer, message, type: 'return_approved' });
                }
                res.json({ message: 'Return approved successfully' });
              }
            );
          }
        );
      }
    );
  });
});

app.put('/api/orders/:id/return/reject', (req, res) => {
  const orderId = req.params.id;
  
  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    
    db.run(
      'UPDATE orders SET return_status = "rejected" WHERE id = ?',
      [orderId],
      function(updateErr) {
        if (updateErr) {
          res.status(500).json({ error: updateErr.message });
          return;
        }
        
        const message = `卖家拒绝了您的退货申请。`;
        db.run(
          'INSERT INTO notifications (recipient, message, type) VALUES (?, ?, ?)',
          [order.buyer, message, 'return_rejected'],
          (notifErr) => {
            if (!notifErr) {
              io.emit('notification', { recipient: order.buyer, message, type: 'return_rejected' });
            }
            res.json({ message: 'Return rejected successfully' });
          }
        );
      }
    );
  });
});

app.put('/api/orders/:id/cancel', (req, res) => {
  const orderId = req.params.id;
  
  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    
    if (order.return_status !== 'none') {
      res.status(400).json({ error: '该订单已有退货申请，无法取消' });
      return;
    }
    
    db.run(
      'UPDATE orders SET status = "cancelled" WHERE id = ?',
      [orderId],
      function(updateErr) {
        if (updateErr) {
          res.status(500).json({ error: updateErr.message });
          return;
        }
        
        db.run(
          'UPDATE products SET status = "available" WHERE id = ?',
          [order.product_id],
          (productErr) => {
            const message = `买家 ${order.buyer} 取消了订单！`;
            db.run(
              'INSERT INTO notifications (recipient, message, type) VALUES (?, ?, ?)',
              [order.seller, message, 'order_cancelled'],
              (notifErr) => {
                if (!notifErr) {
                  io.emit('notification', { recipient: order.seller, message, type: 'order_cancelled' });
                }
                res.json({ message: 'Order cancelled successfully' });
              }
            );
          }
        );
      }
    );
  });
});

app.get('/api/notifications/:recipient', (req, res) => {
  db.all(
    'SELECT * FROM notifications WHERE recipient = ? ORDER BY created_at DESC',
    [req.params.recipient],
    (err, rows) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json(rows);
    }
  );
});

app.put('/api/notifications/:id/read', (req, res) => {
  db.run(
    'UPDATE notifications SET read = 1 WHERE id = ?',
    [req.params.id],
    function(err) {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ message: 'Notification marked as read' });
    }
  );
});

app.delete('/api/notifications/:id', (req, res) => {
  db.run(
    'DELETE FROM notifications WHERE id = ?',
    [req.params.id],
    function(err) {
      if (err) res.status(500).json({ error: err.message });
      else if (this.changes === 0) res.status(404).json({ error: 'Notification not found' });
      else res.json({ message: 'Notification deleted successfully' });
    }
  );
});

app.put('/api/orders/:id/ship', (req, res) => {
  const orderId = req.params.id;
  
  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    
    if (order.status === 'shipped') {
      res.status(400).json({ error: '订单已发货' });
      return;
    }
    
    if (order.status === 'cancelled') {
      res.status(400).json({ error: '订单已取消，无法发货' });
      return;
    }
    
    db.run(
      'UPDATE orders SET status = "shipped" WHERE id = ?',
      [orderId],
      function(updateErr) {
        if (updateErr) {
          res.status(500).json({ error: updateErr.message });
          return;
        }
        
        const message = `您的订单已发货！`;
        db.run(
          'INSERT INTO notifications (recipient, message, type) VALUES (?, ?, ?)',
          [order.buyer, message, 'order_shipped'],
          (notifErr) => {
            if (!notifErr) {
              io.emit('notification', { recipient: order.buyer, message, type: 'order_shipped' });
            }
            res.json({ message: 'Order shipped successfully' });
          }
        );
      }
    );
  });
});

app.put('/api/orders/:id/update', (req, res) => {
  const orderId = req.params.id;
  const { product_id, quantity } = req.body;
  
  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    
    if (order.status === 'shipped') {
      res.status(400).json({ error: '订单已发货，无法修改' });
      return;
    }
    
    if (order.status === 'cancelled') {
      res.status(400).json({ error: '订单已取消，无法修改' });
      return;
    }
    
    if (order.return_status !== 'none') {
      res.status(400).json({ error: '该订单已有退货申请，无法修改' });
      return;
    }
    
    db.run(
      'UPDATE orders SET product_id = ?, quantity = ? WHERE id = ?',
      [product_id, quantity, orderId],
      function(updateErr) {
        if (updateErr) {
          res.status(500).json({ error: updateErr.message });
          return;
        }
        
        db.get('SELECT name as product_name FROM products WHERE id = ?', [product_id], (productErr, product) => {
          const message = `买家 ${order.buyer} 修改了订单商品为 ${product ? product.product_name : '未知商品'}，数量为 ${quantity} 件`;
          db.run(
            'INSERT INTO notifications (recipient, message, type) VALUES (?, ?, ?)',
            [order.seller, message, 'order_updated'],
            (notifErr) => {
              if (!notifErr) {
                io.emit('notification', { recipient: order.seller, message, type: 'order_updated' });
              }
              res.json({ message: 'Order updated successfully' });
            }
          );
        });
      }
    );
  });
});

app.put('/api/products/:id/remove', (req, res) => {
  const productId = req.params.id;
  
  db.run(
    'UPDATE products SET status = "sold" WHERE id = ?',
    [productId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json({ message: 'Product removed successfully' });
    }
  );
});

app.put('/api/products/:id/reactivate', (req, res) => {
  const productId = req.params.id;
  
  db.run(
    'UPDATE products SET status = "available" WHERE id = ?',
    [productId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json({ message: 'Product reactivated successfully' });
    }
  );
});

io.on('connection', (socket) => {
  console.log('用户已连接:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('用户已断开连接:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`买家端: http://localhost:${PORT}/buyer.html`);
  console.log(`卖家端: http://localhost:${PORT}/seller.html`);
});
