// server.js (最終完整修復版)
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

// --- ✅ 身份驗證 API (使用資料庫並檢查 IP，並統一登入路徑) ---
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
  // 網站內容與結構管理
  getWebsiteTitle: async () => {
    try {
      const { data } = await octokit.repos.getContent({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: 'site-config.json' });
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      return JSON.stringify(JSON.parse(content));
    } catch (error) { return JSON.stringify({ success: false, error: "讀取網站標題失敗" }); }
  },
  updateWebsiteTitle: async ({ newTitle }) => {
    try {
      const { data } = await octokit.repos.getContent({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: 'site-config.json' });
      const newContent = Buffer.from(JSON.stringify({ title: newTitle }, null, 2)).toString('base64');
      await octokit.repos.createOrUpdateFileContents({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: 'site-config.json', message: `AI Agent 🚀 更新網站標題`, content: newContent, sha: data.sha });
      return JSON.stringify({ success: true, message: `標題已更新為 "${newTitle}"` });
    } catch (error) { return JSON.stringify({ success: false, error: '更新網站標題失敗' }); }
  },
  getNavigationMenu: async () => {
    try {
      const { data } = await octokit.repos.getContent({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: 'navigation.json' });
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      return JSON.stringify(JSON.parse(content));
    } catch (error) { return JSON.stringify({ success: false, error: "讀取導覽列設定失敗" }); }
  },
  updateNavigationMenu: async ({ menuItems }) => {
    try {
      const { data } = await octokit.repos.getContent({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: 'navigation.json' });
      const newContent = Buffer.from(JSON.stringify(menuItems, null, 2)).toString('base64');
      await octokit.repos.createOrUpdateFileContents({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: 'navigation.json', message: `AI Agent 🚀 更新導覽列結構`, content: newContent, sha: data.sha });
      return JSON.stringify({ success: true, message: '導覽列已更新' });
    } catch (error) { return JSON.stringify({ success: false, error: '更新導覽列失敗' }); }
  },
  // 使用者與權限管理
  createPermissionGroup: async ({ roleName }) => { /* ... 內容不變，可參考先前版本 ... */ },
  createUserAccount: async ({ username, password, roleName }) => { /* ... 內容不變 ... */ },
  addLoginIpRestriction: async ({ ipAddress, description }) => { /* ... 內容不變 ... */ },
  listUsers: async () => { /* ... 內容不變 ... */ },
  // Facebook 整合
  postToFacebookPage: async ({ message, link }) => { /* ... 內容不變 ... */ },
  getFacebookLatestPostInsights: async () => { /* ... 內容不變 ... */ },
};


// --- ✅ 聊天 API (已加入前端請求驗證) ---
app.post('/api/agent/chat', async (req, res) => {
  if (!req.session.user) {
    return res.status(403).json({ error: '未授權，請先登入' });
  }

  const { message, threadId: clientThreadId } = req.body;

  // --- ✅ 新增的防呆機制 ---
  if (!message || typeof message !== 'string' || message.trim() === '') {
    console.error('[AGENT-ERROR] 請求無效: 前端發來的請求 body 中缺少 "message" 字串。');
    return res.status(400).json({ error: '請求的格式不正確，必須包含 "message" 欄位。' });
  }
  // --- 防呆機制結束 ---

  let threadId = clientThreadId;
  
  try {
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
    }
    
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
    });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID,
    });

    await handleRunPolling(res, threadId, run.id);

  } catch (err) {
    console.error('[AGENT-ERROR] /api/agent/chat 主處理流程發生嚴重錯誤:', err);
    res.status(500).json({ error: '與 AI 助理溝通時發生嚴重錯誤' });
  }
});

async function handleRunPolling(res, threadId, runId) {
    // ... 內容不變，可參考先前版本 ...
}


// --- ✅ 靜態檔案服務 ---
app.use(express.static(path.join(__dirname, 'dist','public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist','public','index.html'));
});


// --- 伺服器啟動 ---
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));