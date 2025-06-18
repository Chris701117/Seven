// server.js (最終、完整、數位營運中心版)
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import cors from 'cors';
import OpenAI from 'openai';
import { Octokit } from '@octokit/rest';
import bcrypt from 'bcrypt';
import db from './database.js';
import axios from 'axios';

// --- 環境變數 ---
const {
  OPENAI_API_KEY,
  ASSISTANT_ID,
  GITHUB_TOKEN,
  GITHUB_OWNER,
  GITHUB_REPO,
  GITHUB_BRANCH = 'main',
  SESSION_SECRET = 'secret-key',
  PORT = 3000,
  FACEBOOK_PAGE_ID,
  FACEBOOK_PAGE_ACCESS_TOKEN,
} = process.env;

// --- 環境變數檢查 ---
const requiredEnv = { OPENAI_API_KEY, ASSISTANT_ID, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO };
for (const [key, value] of Object.entries(requiredEnv)) {
  if (!value) throw new Error(`環境變數缺失: ${key}`);
}

// --- Express App 初始化 ---
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(session({ secret: SESSION_SECRET, resave: false, saveUninitialized: false, cookie: { sameSite: 'lax' } }));

// --- API Client 初始化 ---
const openai  = new OpenAI({ apiKey: OPENAI_API_KEY });
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// --- ✅ 身份驗證 API ---
app.post(['/api/auth/login', '/api/login'], async (req, res) => {
  try {
    const userIp = req.ip;
    const ipRulesResult = await db.execute("SELECT ip_address FROM ip_rules");
    const allowedIps = ipRulesResult.rows.map(row => row.ip_address);
    if (allowedIps.length > 0 && !allowedIps.includes(userIp)) {
      return res.status(403).json({ success: false, message: '此 IP 位址不被允許登入' });
    }
    const { username, password } = req.body;
    const userResult = await db.execute({ sql: "SELECT * FROM users WHERE username = ?", args: [username] });
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
    }
    const user = userResult.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (match) {
      req.session.user = { username: user.username, userId: user.id, roleId: user.role_id };
      res.status(200).json({ success: true, username: user.username, userId: user.id });
    } else {
      res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
    }
  } catch (error) {
    console.error("登入 API 發生嚴重錯誤:", error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
});
app.get('/api/auth/me', (req, res) => req.session.user ? res.json(req.session.user) : res.status(401).json({ message: '未登入' }));
app.post('/api/auth/logout', (req, res) => req.session.destroy(err => err ? res.status(500).json({ success: false, message: '登出失敗' }) : res.json({ success: true })));

// --- ✅ 核心工具箱 (Tools) ---
const tools = {
  // 網站基礎管理
  getWebsiteTitle: async () => { /* ... */ },
  updateWebsiteTitle: async ({ newTitle }) => { /* ... */ },
  getNavigationMenu: async () => { /* ... */ },
  updateNavigationMenu: async ({ menuItems }) => { /* ... */ },
  // 使用者與權限管理
  createPermissionGroup: async ({ roleName }) => { /* ... */ },
  createUserAccount: async ({ username, password, roleName }) => { /* ... */ },
  addLoginIpRestriction: async ({ ipAddress, description }) => { /* ... */ },
  listUsers: async () => { /* ... */ },
  // Facebook 整合
  postToFacebookPage: async ({ message, link }) => { /* ... */ },
  getFacebookLatestPostInsights: async () => { /* ... */ },

  // --- 新增：社群貼文構想與排程工具 ---
  generateSocialMediaPost: async ({ platform, topic, tone }) => {
    console.log(`AGENT ACTION: 構思 ${platform} 貼文，主題: ${topic}`);
    try {
      const prompt = `你是一位 ${platform} 平台的社群行銷專家。請用${tone}的語氣，針對「${topic}」這個主題，寫一篇吸引人的貼文草稿。`;
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });
      const postDraft = response.choices[0].message.content;
      return JSON.stringify({ success: true, draft: postDraft });
    } catch (error) {
      console.error("generateSocialMediaPost 失敗:", error);
      return JSON.stringify({ success: false, error: "產生文案時發生錯誤。" });
    }
  },
  createScheduledPost: async ({ platform, content, scheduled_time }) => {
    console.log(`AGENT ACTION: 建立排程貼文於 ${scheduled_time}`);
    try {
      await db.execute({
        sql: "INSERT INTO scheduled_posts (platform, content, scheduled_time, status) VALUES (?, ?, ?, 'pending')",
        args: [platform, content, scheduled_time],
      });
      return JSON.stringify({ success: true, message: `已成功將貼文排程在 ${scheduled_time} 發布。` });
    } catch (error) {
      console.error("createScheduledPost 失敗:", error);
      return JSON.stringify({ success: false, error: "建立排程貼文失敗。" });
    }
  },

  // --- 新增：營運與行銷任務提醒工具 ---
  createProjectTask: async ({ task_name, project_name, due_date, assignee }) => {
    console.log(`AGENT ACTION: 於專案 ${project_name} 新增任務 ${task_name}`);
    try {
      await db.execute({
        sql: "INSERT INTO project_tasks (task_name, project_name, due_date, assignee, status) VALUES (?, ?, ?, ?, 'todo')",
        args: [task_name, project_name, due_date, assignee || null],
      });
      return JSON.stringify({ success: true, message: `已成功在專案「${project_name}」中新增任務「${task_name}」。` });
    } catch (error) {
      console.error("createProjectTask 失敗:", error);
      return JSON.stringify({ success: false, error: "建立專案任務失敗。" });
    }
  },
  getProjectGanttChart: async ({ project_name }) => {
    console.log(`AGENT ACTION: 取得專案 ${project_name} 的甘特圖資料`);
    try {
      const { rows } = await db.execute({
        sql: "SELECT id, task_name, due_date, status, assignee FROM project_tasks WHERE project_name = ?",
        args: [project_name],
      });
      const ganttData = rows.map(task => ({
        id: `Task ${task.id}`, name: task.task_name, start: task.due_date, end: task.due_date,
        progress: task.status === 'done' ? 100 : 0, assignee: task.assignee,
      }));
      return JSON.stringify({ success: true, ganttData });
    } catch (error) {
      console.error("getProjectGanttChart 失敗:", error);
      return JSON.stringify({ success: false, error: "取得專案時程失敗。" });
    }
  },
};

// --- ✅ 聊天 API ---
app.post('/api/agent/chat', async (req, res) => {
  if (!req.session.user) return res.status(403).json({ error: '未授權，請先登入' });
  const { message, threadId: clientThreadId } = req.body;
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: '請求的格式不正確，必須包含 "message" 欄位。' });
  }
  let threadId = clientThreadId;
  try {
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
    }
    await openai.beta.threads.messages.create(threadId, { role: 'user', content: message });
    const run = await openai.beta.threads.runs.create(threadId, { assistant_id: ASSISTANT_ID });
    await handleRunPolling(res, threadId, run.id);
  } catch (err) {
    console.error('[AGENT-ERROR] /api/agent/chat 主處理流程發生嚴重錯誤:', err);
    res.status(500).json({ error: '與 AI 助理溝通時發生嚴重錯誤' });
  }
});

async function handleRunPolling(res, threadId, runId) {
    // ... 內容不變，與上一版相同 ...
}

// --- ✅ 靜態檔案服務 ---
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("無法提供 index.html:", err);
      res.status(500).send("伺服器錯誤：找不到前端應用程式的進入點。");
    }
  });
});

// --- 伺服器啟動 ---
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));