// utils/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database (creates chat.db if not exists)
const dbPath = path.resolve(__dirname, '../chat.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initDB();
  }
});

function initDB() {
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room TEXT,
    username TEXT,
    text TEXT,
    time TEXT,
    avatar TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    avatar TEXT
  )`);
}

function saveMessage(username, text, room, avatar, time, callback) {
  const sql = `INSERT INTO messages (username, text, room, avatar, time) VALUES (?, ?, ?, ?, ?)`;
  db.run(sql, [username, text, room, avatar, time], function(err) {
    if (err) {
      console.error('Error saving message:', err.message);
      if (callback) callback(null);
    } else {
      // this.lastID contains the id of the last inserted row
      if (callback) callback(this.lastID);
    }
  });
}

function getRoomMessages(room, callback) {
  // Get last 50 messages
  const sql = `SELECT * FROM messages WHERE room = ? ORDER BY id DESC LIMIT 50`;
  db.all(sql, [room], (err, rows) => {
    if (err) {
      console.error('Error getting messages:', err.message);
      callback([]);
    } else {
      // Return in chronological order (oldest first)
      callback(rows.reverse());
    }
  });
}

function updateMessage(id, text) {
  const sql = `UPDATE messages SET text = ? WHERE id = ?`;
  db.run(sql, [text, id], (err) => {
    if (err) console.error('Error updating message:', err.message);
  });
}

function deleteMessage(id) {
  const sql = `DELETE FROM messages WHERE id = ?`;
  db.run(sql, [id], (err) => {
    if (err) console.error('Error deleting message:', err.message);
  });
}

// User Auth Functions
function createUser(username, password, avatar, callback) {
  const sql = `INSERT INTO users (username, password, avatar) VALUES (?, ?, ?)`;
  db.run(sql, [username, password, avatar], function(err) {
    callback(err, this ? this.lastID : null);
  });
}

function findUserByUsername(username, callback) {
  const sql = `SELECT * FROM users WHERE username = ?`;
  db.get(sql, [username], (err, row) => {
    callback(err, row);
  });
}

function updateUserAvatar(id, avatar, callback) {
  const sql = `UPDATE users SET avatar = ? WHERE id = ?`;
  db.run(sql, [avatar, id], (err) => {
    callback(err);
  });
}

module.exports = {
  saveMessage,
  getRoomMessages,
  updateMessage,
  deleteMessage,
  createUser,
  findUserByUsername,
  updateUserAvatar
};
