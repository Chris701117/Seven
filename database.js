// database.js (更穩健的更新版本)
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

function initializeDb() {
  db.serialize(() => {
    // 建立需要的資料表
    db.run(`CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL)`);
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role_id INTEGER, FOREIGN KEY (role_id) REFERENCES roles (id))`);
    db.run(`CREATE TABLE IF NOT EXISTS ip_rules (id INTEGER PRIMARY KEY, ip_address TEXT UNIQUE NOT NULL, description TEXT)`);

    // 檢查並建立預設的 '管理員' 權限組
    db.get('SELECT id FROM roles WHERE name = ?', ['管理員'], (err, row) => {
      if (err) return console.error("查詢 '管理員' 角色時出錯:", err);
      if (!row) {
        db.run('INSERT INTO roles (name) VALUES (?)', ['管理員'], function(err) {
          if (err) return console.error("建立 '管理員' 角色時出錯:", err);
          // 建立角色後，設定 admin 帳號
          setupDefaultAdmin(this.lastID);
        });
      } else {
        // 如果角色已存在，直接設定 admin 帳號
        setupDefaultAdmin(row.id);
      }
    });
  });
}

// 強制設定/更新預設管理員的函式
async function setupDefaultAdmin(adminRoleId) {
    const adminUsername = 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        console.warn("⚠️ 警告：未在環境變數中設定 ADMIN_PASSWORD。將無法建立或更新 admin 帳號的密碼。");
        return;
    }
    
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    db.get('SELECT id FROM users WHERE username = ?', [adminUsername], (err, row) => {
        if (err) return console.error("查詢 admin 使用者時出錯:", err);

        if (row) {
            // 如果 admin 帳號已存在，就強制更新他的密碼
            db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [hashedPassword, row.id], (updateErr) => {
                if (updateErr) console.error("更新 admin 密碼失敗:", updateErr);
                else console.log("✅ 偵測到 admin 帳號，已強制將其密碼更新為環境變數中的最新版本。");
            });
        } else {
            // 如果 admin 帳號不存在，就建立一個新的
            db.run(`INSERT INTO users (username, password_hash, role_id) VALUES (?, ?, ?)`, 
                [adminUsername, hashedPassword, adminRoleId],
                (insertErr) => {
                    if(insertErr) console.error('建立預設管理員失敗:', insertErr);
                    else console.log(`✅ 預設管理員 'admin' 已建立。`);
                }
            );
        }
    });
}

export default db;