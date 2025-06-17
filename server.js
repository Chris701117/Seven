// server.js (最終完整版 - 整合進階結構管理、SQLite 使用者系統與 Facebook API)
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
app.set('trust proxy', 1); // <--- 請加上這一行
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

// 在 server.js 中，替換掉舊的登入 API
app.post('/api/auth/login', (req, res) => {
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

// --- ✅ 核心工具箱 (Tools) ---
const tools = {
  // --- 網站內容與結構管理 ---
  getWebsiteTitle: async () => { /* ... 程式碼省略，與上一版相同 ... */ },
  updateWebsiteTitle: async ({ newTitle }) => { /* ... 程式碼省略，與上一版相同 ... */ },
  getNavigationMenu: async () => {
    try {
      const { data } = await octokit.repos.getContent({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: 'navigation.json' });
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      return JSON.stringify({ success: true, menu: JSON.parse(content) });
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

  // --- 使用者與權限管理 ---
  createPermissionGroup: async ({ roleName }) => { /* ... 程式碼省略，與上一版相同 ... */ },
  createUserAccount: async ({ username, password, roleName }) => { /* ... 程式碼省略，與上一版相同 ... */ },
  addLoginIpRestriction: async ({ ipAddress, description }) => { /* ... 程式碼省略，與上一版相同 ... */ },
  listUsers: async () => { /* ... 程式碼省略，與上一版相同 ... */ },

  // --- Facebook 整合工具 ---
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
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist','public','index.html')));

// --- 伺服器啟動 ---
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));