// database.js (Turso 雲端資料庫版本)
import { createClient } from '@libsql/client';
import bcrypt from 'bcrypt';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 程式啟動時，檢查並建立資料表
async function initializeDb() {
  try {
    await db.batch([
      `CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role_id INTEGER, FOREIGN KEY (role_id) REFERENCES roles (id))`,
      `CREATE TABLE IF NOT EXISTS ip_rules (id INTEGER PRIMARY KEY, ip_address TEXT UNIQUE NOT NULL, description TEXT)`
    ]);
    console.log("✅ 資料表結構已確認。");
    await setupDefaultAdmin();
  } catch (e) {
    console.error("資料庫初始化失敗:", e);
  }
}

async function setupDefaultAdmin() {
  // 檢查 '管理員' 角色是否存在，不存在則建立
  let { rows: roleRows } = await db.execute({ sql: "SELECT id FROM roles WHERE name = ?", args: ["管理員"] });
  let adminRoleId;

  if (roleRows.length === 0) {
    const result = await db.execute({ sql: "INSERT INTO roles (name) VALUES (?)", args: ["管理員"] });
    adminRoleId = result.lastInsertRowid;
    console.log("✅ 預設 '管理員' 角色已建立。");
  } else {
    adminRoleId = roleRows[0].id;
  }

  // 檢查 'admin' 使用者是否存在，不存在則建立
  const { rows: userRows } = await db.execute({ sql: "SELECT id FROM users WHERE username = ?", args: ["admin"] });
  if (userRows.length === 0) {
    const defaultPassword = 'supersecretpassword123'; // 使用一個更安全的預設密碼
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    await db.execute({
      sql: "INSERT INTO users (username, password_hash, role_id) VALUES (?, ?, ?)",
      args: ["admin", hashedPassword, adminRoleId]
    });
    console.log(`✅ 預設管理員 'admin' 已建立，預設密碼為: ${defaultPassword}`);
  } else {
    console.log("✅ 預設管理員 'admin' 已存在。");
  }
}

// 立即執行初始化
initializeDb();

export default db;