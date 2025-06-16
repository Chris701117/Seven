// database.js
import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('資料庫連接失敗:', err.message);
  } else {
    console.log('✅ 成功連接到 SQLite 資料庫.');
    initializeDb();
  }
});

async function initializeDb() {
  db.serialize(async () => {
    // 建立權限組 (Roles) 資料表
    db.run(`CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )`);

    // 建立使用者 (Users) 資料表
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role_id INTEGER,
      FOREIGN KEY (role_id) REFERENCES roles (id)
    )`);

    // 建立 IP 規則 (ip_rules) 資料表
    db.run(`CREATE TABLE IF NOT EXISTS ip_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT UNIQUE NOT NULL,
        description TEXT
    )`);

    // --- 初始化預設資料 ---
    // 檢查並建立預設的 '管理員' 權限組
    db.get('SELECT id FROM roles WHERE name = ?', ['管理員'], (err, row) => {
      if (!row) {
        db.run('INSERT INTO roles (name) VALUES (?)', ['管理員'], function(err) {
          if (err) return console.error(err.message);
          const adminRoleId = this.lastID;
          // 建立預設的 admin 帳號
          createDefaultAdmin(adminRoleId);
        });
      } else {
        const adminRoleId = row.id;
        createDefaultAdmin(adminRoleId);
      }
    });
  });
}

function createDefaultAdmin(adminRoleId) {
    // 檢查 admin 使用者是否已存在
    db.get('SELECT id FROM users WHERE username = ?', ['admin'], async (err, row) => {
        if (!row) {
            const defaultPassword = process.env.ADMIN_PASSWORD || 'supersecret';
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);
            db.run(`INSERT INTO users (username, password_hash, role_id) VALUES (?, ?, ?)`, 
                ['admin', hashedPassword, adminRoleId],
                (err) => {
                    if(err) console.error('建立預設管理員失敗:', err.message);
                    else console.log(`✅ 預設管理員 'admin' 已建立。請記得在 Render 環境變數中設定 ADMIN_PASSWORD 以確保安全！`);
                }
            );
        }
    });
}

export default db;