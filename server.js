// server.js (最終、完整、統一版)
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
      await octokit.repos.createOrUpdateFileContents({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: 'site-config.json', message: `AI Agent 🚀 更新網站標題`, content: newContent, sha: data.sha, branch: GITHUB_BRANCH });
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
      await octokit.repos.createOrUpdateFileContents({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: 'navigation.json', message: `AI Agent 🚀 更新導覽列結構`, content: newContent, sha: data.sha, branch: GITHUB_BRANCH });
      return JSON.stringify({ success: true, message: '導覽列已更新' });
    } catch (error) { return JSON.stringify({ success: false, error: '更新導覽列失敗' }); }
  },
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
  addLoginIpRestriction: async ({ ipAddress, description }) => {
    return db.execute({ sql: 'INSERT INTO ip_rules (ip_address, description) VALUES (?, ?)', args: [ipAddress, description || ''] })
        .then(() => JSON.stringify({ success: true, ipAddress }))
        .catch(() => JSON.stringify({ success: false, error: "新增 IP 失敗，可能已存在。" }));
  },
  listUsers: async () => {
    return db.execute("SELECT u.id, u.username, r.name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id")
        .then(result => JSON.stringify({ success: true, users: result.rows }))
        .catch(() => JSON.stringify({ success: false, error: "查詢使用者列表失敗。" }));
  },
  postToFacebookPage: async ({ message, link }) => {
    if (!FACEBOOK_PAGE_ID || !FACEBOOK_PAGE_ACCESS_TOKEN) return JSON.stringify({ success: false, error: "Facebook API 未在環境變數中設定" });
    try {
      await axios.post(`https://graph.facebook.com/${FACEBOOK_PAGE_ID}/feed`, { message, link, access_token: FACEBOOK_PAGE_ACCESS_TOKEN });
      return JSON.stringify({ success: true, message: "已成功發布貼文到 Facebook" });
    } catch (error) { return JSON.stringify({ success: false, error: "發布到 Facebook 失敗" }); }
  },
  getFacebookLatestPostInsights: async () => {
    if (!FACEBOOK_PAGE_ID || !FACEBOOK_PAGE_ACCESS_TOKEN) return JSON.stringify({ success: false, error: "Facebook API 未在環境變數中設定" });
    try {
      const postsUrl = `https://graph.facebook.com/${FACEBOOK_PAGE_ID}/posts?limit=1&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`;
      const postsRes = await axios.get(postsUrl);
      const latestPostId = postsRes.data.data[0]?.id;
      if (!latestPostId) return JSON.stringify({ success: false, error: "找不到任何貼文" });
      const insightsUrl = `https://graph.facebook.com/${latestPostId}/insights?metric=post_impressions_unique,post_engaged_users,post_reactions_by_type_total&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`;
      const insightsRes = await axios.get(insightsUrl);
      const insights = insightsRes.data.data.reduce((acc, metric) => ({ ...acc, [metric.name]: metric.values[0].value }), {});
      return JSON.stringify({ success: true, insights });
    } catch (error) { return JSON.stringify({ success: false, error: "撈取 Facebook 數據失敗" }); }
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
  try {
    let currentRun = await openai.beta.threads.runs.retrieve(threadId, runId);
    let attempts = 0;
    while (['queued', 'in_progress'].includes(currentRun.status) && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      attempts++;
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
      res.status(500).json({ error: `AI 執行失敗，最終狀態為: ${currentRun.status}` });
    }
  } catch (error) {
    console.error('[POLLING-ERROR] handleRunPolling 函式發生嚴重錯誤:', error);
    res.status(500).json({ error: '處理 AI 回應時發生嚴重錯誤。' });
  }
}

// --- ✅ 靜態檔案服務 (最終統一版) ---
// 假設 dist 資料夾與 server.js 位於同一層級
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// 所有未匹配的 GET 請求都導向 index.html
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