// server.js (最終修復版 - 整合所有功能並修正登入路徑)
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
app.post(['/api/auth/login', '/api/login'], (req, res) => { // *** 這就是最終的修正 ***
  console.log('--- [DEBUG] New Login Attempt ---');
  const userIp = req.ip;
  console.log(`[DEBUG] Requesting User IP: ${userIp}`);

  db.all("SELECT ip_address FROM ip_rules", [], (err, rules) => {
    if (err) {
      console.error("[DEBUG] 查詢 IP 規則時出錯:", err);
      return res.status(500).json({ success: false, message: '伺服器內部錯誤' });
    }

    const allowedIps = rules.map(rule => rule.ip_address);
    console.log(`[DEBUG] Allowed IPs from DB: [${allowedIps.join(', ')}]`);

    if (allowedIps.length > 0 && !allowedIps.includes(userIp)) {
      console.warn(`[DEBUG] LOGIN BLOCKED: IP ${userIp} not in whitelist.`);
      return res.status(403).json({ success: false, message: '此 IP 位址不被允許登入' });
    }
    console.log(`[DEBUG] IP Check Passed.`);

    const { username, password } = req.body;
    console.log(`[DEBUG] Attempting login for user: ${username}`);

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        console.error('[DEBUG] 查詢使用者時出錯:', err);
        return res.status(500).json({ success: false, message: '伺服器錯誤' });
      }
      if (!user) {
        console.warn(`[DEBUG] LOGIN FAILED: User '${username}' not found.`);
        return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
      }
      
      console.log(`[DEBUG] User '${username}' found in DB. Comparing password...`);
      const match = await bcrypt.compare(password, user.password_hash);
      console.log(`[DEBUG] Password comparison result (match): ${match}`);
      
      if (match) {
        console.log(`[DEBUG] LOGIN SUCCESS: Password matches for user '${username}'.`);
        req.session.user = { username: user.username, userId: user.id, roleId: user.role_id };
        res.status(200).json({ success: true, username: user.username, userId: user.id });
      } else {
        console.warn(`[DEBUG] LOGIN FAILED: Password does not match for user '${username}'.`);
        res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
      }
    });
  });
});
app.get('/api/auth/me', (req, res) => req.session.user ? res.json(req.session.user) : res.status(401).json({ message: '未登入' }));
app.post('/api/auth/logout', (req, res) => req.session.destroy(err => err ? res.status(500).json({ success: false, message: '登出失敗' }) : res.json({ success: true })));


// --- ✅ 核心工具箱 (Tools) ---
const tools = {
  getWebsiteTitle: async () => { /* ... 內容不變 ... */ },
  updateWebsiteTitle: async ({ newTitle }) => { /* ... 內容不變 ... */ },
  getNavigationMenu: async () => { /* ... 內容不變 ... */ },
  updateNavigationMenu: async ({ menuItems }) => { /* ... 內容不變 ... */ },
  createPermissionGroup: async ({ roleName }) => { /* ... 內容不變 ... */ },
  createUserAccount: async ({ username, password, roleName }) => { /* ... 內容不變 ... */ },
  addLoginIpRestriction: async ({ ipAddress, description }) => { /* ... 內容不變 ... */ },
  listUsers: async () => { /* ... 內容不變 ... */ },
  postToFacebookPage: async ({ message, link }) => { /* ... 內容不變 ... */ },
  getFacebookLatestPostInsights: async () => { /* ... 內容不變 ... */ },
};

// --- ✅ 聊天 API 與輪詢邏輯 ---
app.post('/api/agent/chat', async (req, res) => {
    // ... 內容不變 ...
});
async function handleRunPolling(res, threadId, runId) {
    // ... 內容不變 ...
}

// --- ✅ 靜態檔案服務 ---
app.use(express.static(path.join(__dirname, 'dist','public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist','public','index.html'));
});

// --- 伺服器啟動 ---
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));