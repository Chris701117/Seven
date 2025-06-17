// server.js (最終、完整、已修復版)
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
app.set('trust proxy', 1); // 為了在 Render 上取得正確 IP
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { sameSite: 'lax' },
}));

// --- API Client 初始化 ---
const openai  = new OpenAI({ apiKey: OPENAI_API_KEY });
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// --- ✅ 身份驗證 API (已修正為 Turso/libsql 的 async/await 語法) ---
app.post(['/api/auth/login', '/api/login'], async (req, res) => {
  try {
    const userIp = req.ip;

    // 步驟 1: 撈取所有 IP 規則 (使用 await db.execute)
    const ipRulesResult = await db.execute("SELECT ip_address FROM ip_rules");
    const allowedIps = ipRulesResult.rows.map(row => row.ip_address);

    // 步驟 2: 如果有設定規則，就進行比對
    if (allowedIps.length > 0 && !allowedIps.includes(userIp)) {
      console.warn(`登入被阻擋：來源 IP ${userIp} 不在白名單中。`);
      return res.status(403).json({ success: false, message: '此 IP 位址不被允許登入' });
    }

    // 步驟 3: IP 檢查通過，進行帳號密碼驗證
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
  // 網站內容與結構管理
  getWebsiteTitle: async () => {
    try {
      const { data } = await octokit.repos.getContent({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: 'site-config.json' });
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      const config = JSON.parse(content);
      return JSON.stringify({ success: true, title: config.title });
    } catch (error) { return JSON.stringify({ success: false, error: "找不到設定檔或讀取失敗" }); }
  },
  updateWebsiteTitle: async ({ newTitle }) => {
    try {
      const { data: fileData } = await octokit.repos.getContent({ owner: GITHUB_OWNER, repo: GITCHUB_REPO, path: 'site-config.json' });
      const newConfig = { title: newTitle };
      const newContent = Buffer.from(JSON.stringify(newConfig, null, 2)).toString('base64');
      await octokit.repos.createOrUpdateFileContents({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: 'site-config.json', message: `AI Agent 🚀 更新網站標題為 "${newTitle}"`, content: newContent, sha: fileData.sha, branch: GITHUB_BRANCH });
      return JSON.stringify({ success: true, message: `標題已成功更新為 "${newTitle}"` });
    } catch (error) { return JSON.stringify({ success: false, error: "更新標題失敗" }); }
  },
  getNavigationMenu: async () => { /* ... 與上一版相同 ... */ },
  updateNavigationMenu: async ({ menuItems }) => { /* ... 與上一版相同 ... */ },
  // 使用者與權限管理
  createPermissionGroup: async ({ roleName }) => {
    return db.execute({ sql: "INSERT INTO roles (name) VALUES (?)", args: [roleName] })
      .then(result => JSON.stringify({ success: true, roleId: result.lastInsertRowid, roleName }))
      .catch(err => JSON.stringify({ success: false, error: '建立權限組失敗，可能名稱已存在。' }));
  },
  createUserAccount: async ({ username, password, roleName }) => {
    const roleResult = await db.execute({ sql: "SELECT id FROM roles WHERE name = ?", args: [roleName] });
    if (roleResult.rows.length === 0) return JSON.stringify({ success: false, error: `找不到名為 "${roleName}" 的權限組。` });
    const roleId = roleResult.rows[0].id;
    const hashedPassword = await bcrypt.hash(password, 10);
    return db.execute({ sql: "INSERT INTO users (username, password_hash, role_id) VALUES (?, ?, ?)", args: [username, hashedPassword, roleId] })
      .then(result => JSON.stringify({ success: true, userId: result.lastInsertRowid, username }))
      .catch(err => JSON.stringify({ success: false, error: '建立使用者失敗，可能名稱已存在。' }));
  },
  addLoginIpRestriction: async ({ ipAddress, description }) => { /* ... 與上一版相同 ... */ },
  listUsers: async () => { /* ... 與上一版相同 ... */ },
  // Facebook 整合
  postToFacebookPage: async ({ message, link }) => { /* ... 與上一版相同 ... */ },
  getFacebookLatestPostInsights: async () => { /* ... 與上一版相同 ... */ },
};

// --- ✅ 聊天 API 與輪詢邏輯 ---
app.post('/api/agent/chat', async (req, res) => {
  if (!req.session.user) return res.status(403).json({ error: '未授權，請先登入' });
  
  const { message, threadId: clientThreadId } = req.body;
  try {
    const threadId = clientThreadId || (await openai.beta.threads.create()).id;
    await openai.beta.threads.messages.create(threadId, { role: 'user', content: message });
    const run = await openai.beta.threads.runs.create(threadId, { assistant_id: ASSISTANT_ID });
    await handleRunPolling(res, threadId, run.id);
  } catch (err) { res.status(500).json({ error: '與 AI 助理溝通時發生錯誤' }); }
});

async function handleRunPolling(res, threadId, runId) {
  let currentRun = await openai.beta.threads.runs.retrieve(threadId, runId);
  while (['queued', 'in_progress'].includes(currentRun.status)) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    currentRun = await openai.beta.threads.runs.retrieve(threadId, runId);
  }

  if (currentRun.status === 'requires_action') {
    const toolOutputs = await Promise.all(currentRun.required_action.submit_tool_outputs.tool_calls.map(async (toolCall) => {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      if (tools[functionName]) {
        const output = await tools[functionName](args);
        return { tool_call_id: toolCall.id, output };
      }
      return { tool_call_id: toolCall.id, output: JSON.stringify({ success: false, error: `工具 ${functionName} 不存在` }) };
    }));
    const runAfterTools = await openai.beta.threads.runs.submitToolOutputs(threadId, runId, { tool_outputs: toolOutputs });
    return handleRunPolling(res, threadId, runAfterTools.id);
  }
  
  if (currentRun.status === 'completed') {
    const messages = await openai.beta.threads.messages.list(threadId, { order: 'desc', limit: 1 });
    res.json({ threadId, message: messages.data[0]?.content[0]?.['text']?.value || "我沒有任何回應。" });
  } else {
    res.status(500).json({ error: `AI 執行失敗，狀態為: ${currentRun.status}` });
  }
}

// --- ✅ 靜態檔案服務 ---
app.use(express.static(path.join(__dirname, 'dist','public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist','public','index.html'));
});

// --- 伺服器啟動 ---
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));