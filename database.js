// database.js (最終優化版)
import { createClient } from '@libsql/client';
import bcrypt from 'bcrypt';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function initializeDb() {
  try {
    await db.batch([
      `CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role_id INTEGER, FOREIGN KEY (role_id) REFERENCES roles (id))`,
      `CREATE TABLE IF NOT EXISTS ip_rules (id INTEGER PRIMARY KEY, ip_address TEXT UNIQUE NOT NULL, description TEXT)`,
      `CREATE TABLE IF NOT EXISTS scheduled_posts (id INTEGER PRIMARY KEY, platform TEXT NOT NULL, content TEXT NOT NULL, status TEXT DEFAULT 'pending', scheduled_time DATETIME NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS project_tasks (id INTEGER PRIMARY KEY, task_name TEXT NOT NULL, project_name TEXT NOT NULL, due_date DATE NOT NULL, assignee TEXT, status TEXT DEFAULT 'todo')`
    ]);
    console.log("✅ 資料表結構已確認。");
    await setupDefaultAdmin();
  } catch (e) {
    console.error("資料庫初始化失敗:", e);
  }
}

async function setupDefaultAdmin() {
  try {
    let { rows: roleRows } = await db.execute({ sql: "SELECT id FROM roles WHERE name = ?", args: ["管理員"] });
    let adminRoleId;
    if (roleRows.length === 0) {
      const result = await db.execute({ sql: "INSERT INTO roles (name) VALUES (?)", args: ["管理員"] });
      adminRoleId = result.lastInsertRowid;
    } else {
      adminRoleId = roleRows[0].id;
    }
    const { rows: userRows } = await db.execute({ sql: "SELECT id FROM users WHERE username = ?", args: ["admin"] });
    if (userRows.length === 0) {
      const defaultPassword = 'supersecretpassword123'; 
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      await db.execute({ sql: "INSERT INTO users (username, password_hash, role_id) VALUES (?, ?, ?)", args: ["admin", hashedPassword, adminRoleId] });
      console.log(`✅ 預設管理員 'admin' 已建立。`);
    } else {
      console.log("✅ 預設管理員 'admin' 已存在。");
    }
  } catch(e) {
      console.error("設定預設管理員時失敗:", e);
  }
}

initializeDb();
export { db };