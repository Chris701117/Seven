// database.js (最終強制更新版)
import { createClient } from '@libsql/client';
import bcrypt from 'bcrypt';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initializeDb() {
  try {
    await db.batch([
      `CREATE TABLE IF NOT EXISTS roles (...)`,
      `CREATE TABLE IF NOT EXISTS users (...)`,
      `CREATE TABLE IF NOT EXISTS ip_rules (...)`,
      // ✅ 新增：排程貼文資料表
      `CREATE TABLE IF NOT EXISTS scheduled_posts (
        id INTEGER PRIMARY KEY,
        platform TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        scheduled_time DATETIME NOT NULL
      )`,
      // ✅ 新增：專案任務資料表
      `CREATE TABLE IF NOT EXISTS project_tasks (
        id INTEGER PRIMARY KEY,
        task_name TEXT NOT NULL,
        project_name TEXT NOT NULL,
        due_date DATE NOT NULL,
        assignee TEXT,
        status TEXT DEFAULT 'todo'
      )`
    ]);
    console.log("✅ 資料表結構已確認 (包含新表格)。");
    await setupDefaultAdmin();
  } catch (e) {
    console.error("資料庫初始化失敗:", e);
  }
}

async function setupDefaultAdmin() {
  const adminUsername = 'admin';
  const defaultPassword = 'supersecretpassword123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  let { rows: roleRows } = await db.execute({ sql: "SELECT id FROM roles WHERE name = ?", args: ["管理員"] });
  let adminRoleId = roleRows[0]?.id;

  if (!adminRoleId) {
    const result = await db.execute({ sql: "INSERT INTO roles (name) VALUES (?)", args: ["管理員"] });
    adminRoleId = result.lastInsertRowid;
  }

  const { rows: userRows } = await db.execute({ sql: "SELECT id FROM users WHERE username = ?", args: [adminUsername] });
  if (userRows.length > 0) {
    // 如果 admin 存在，強制更新密碼
    await db.execute({ sql: "UPDATE users SET password_hash = ? WHERE username = ?", args: [hashedPassword, adminUsername] });
    console.log(`✅ 偵測到 admin 帳號，已強制將其密碼更新為最新的預設值。`);
  } else {
    // 如果 admin 不存在，建立他
    await db.execute({ sql: "INSERT INTO users (username, password_hash, role_id) VALUES (?, ?, ?)", args: [adminUsername, hashedPassword, adminRoleId] });
    console.log(`✅ 預設管理員 'admin' 已建立，密碼已設定。`);
  }
}

initializeDb();
export default db;