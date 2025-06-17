// server.js (超級詳細日誌版)
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
  OPENAI_API_KEY, ASSISTANT_ID, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH = 'main',
  SESSION_SECRET = 'secret-key', PORT = 3000,
  FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN,
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

// --- 身份驗證 API ---
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
    if (userResult.rows.length === 0) return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
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


// --- 核心工具箱 (Tools) ---
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


// --- ✅ 全新升級的聊天 API (加入大量日誌) ---
app.post('/api/agent/chat', async (req, res) => {
  // 步驟 1: 埋下我們的「金絲雀」日誌
  console.log(`[CANARY] /api/agent/chat route handler was hit at ${new Date().toISOString()}`);

  if (!req.session.user) {
    console.error('[AGENT-ERROR] 未授權的請求被阻擋。');
    return res.status(403).json({ error: '未授權，請先登入' });
  }
  console.log('[AGENT-LOG] 身份驗證通過。');

  const { message, threadId: clientThreadId } = req.body;
  let threadId = clientThreadId;

  try {
    if (!threadId) {
      console.log('[AGENT-LOG] 沒有提供 threadId，正在建立新的 thread...');
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      console.log(`[AGENT-LOG] 新 thread 已建立: ${threadId}`);
    } else {
      console.log(`[AGENT-LOG] 正在使用已有的 thread: ${threadId}`);
    }

    console.log(`[AGENT-LOG] 正在將使用者訊息加入 thread: "${message}"`);
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
    });
    console.log('[AGENT-LOG] 訊息加入成功。');

    console.log('[AGENT-LOG] 正在建立 run...');
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID,
    });
    console.log(`[AGENT-LOG] Run 已建立: ${run.id}，狀態: ${run.status}`);

    // 直接將 run 的初始狀態和 threadId 回傳給 polling 函式
    await handleRunPolling(res, threadId, run.id);

  } catch (err) {
    console.error('[AGENT-ERROR] /api/agent/chat 主處理流程發生嚴重錯誤:', err);
    res.status(500).json({ error: '與 AI 助理溝通時發生嚴重錯誤' });
  }
});

async function handleRunPolling(res, threadId, runId) {
  try {
    console.log(`[POLLING-LOG] 開始輪詢 Run ID: ${runId}`);
    let currentRun = await openai.beta.threads.runs.retrieve(threadId, runId);
    let attempts = 0;

    while (['queued', 'in_progress'].includes(currentRun.status) && attempts < 20) { // 增加一個嘗試次數上限，避免無限迴圈
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log(`[POLLING-LOG] 正在檢查 Run 狀態... (第 ${++attempts} 次)`);
      currentRun = await openai.beta.threads.runs.retrieve(threadId, runId);
      console.log(`[POLLING-LOG] 目前 Run 狀態: ${currentRun.status}`);
    }

    if (currentRun.status === 'requires_action') {
      console.log('[POLLING-LOG] Run 需要執行工具 (requires_action)。');
      const toolOutputs = await Promise.all(currentRun.required_action.submit_tool_outputs.tool_calls.map(async (toolCall) => {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        if (tools[functionName]) {
          const output = await tools[functionName](args);
          return { tool_call_id: toolCall.id, output };
        }
        return { tool_call_id: toolCall.id, output: JSON.stringify({ success: false, error: `工具 ${functionName} 不存在` }) };
      }));
      console.log('[POLLING-LOG] 工具執行完畢，正在將結果回傳給 OpenAI...');
      const runAfterTools = await openai.beta.threads.runs.submitToolOutputs(threadId, runId, { tool_outputs: toolOutputs });
      return handleRunPolling(res, threadId, runAfterTools.id);
    }
    
    if (currentRun.status === 'completed') {
      console.log('[POLLING-LOG] Run 已完成 (completed)。正在取得最終訊息...');
      const messages = await openai.beta.threads.messages.list(threadId, { order: 'desc', limit: 1 });
      const finalMessage = messages.data[0]?.content[0]?.['text']?.value || "我沒有任何回應。";
      console.log(`[POLLING-LOG] 成功取得回覆: "${finalMessage}"`);
      res.json({ threadId, message: finalMessage });
    } else {
      console.error(`[POLLING-ERROR] Run 最終狀態失敗或超時: ${currentRun.status}`);
      res.status(500).json({ error: `AI 執行失敗，最終狀態為: ${currentRun.status}` });
    }
  } catch (error) {
    console.error('[POLLING-ERROR] handleRunPolling 函式發生嚴重錯誤:', error);
    res.status(500).json({ error: '處理 AI 回應時發生嚴重錯誤。' });
  }
}

// --- 靜態檔案服務 ---
app.use(express.static(path.join(__dirname, 'dist','public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist','public','index.html'));
});

// --- 伺服器啟動 ---
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));