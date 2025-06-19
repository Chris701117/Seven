// server.js (最終、完整、自我進化版)
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
import fs from 'fs/promises';

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
  EDITABLE_FILE_EXTENSIONS, // 新增：可編輯的檔案類型
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
  // 營運與行銷
  postToFacebookPage: async ({ message, link }) => { /* ... */ },
  getFacebookLatestPostInsights: async () => { /* ... */ },
  generateSocialMediaPost: async ({ platform, topic, tone }) => { /* ... */ },
  createScheduledPost: async ({ platform, content, scheduled_time }) => { /* ... */ },
  createProjectTask: async ({ task_name, project_name, due_date, assignee }) => { /* ... */ },
  getProjectGanttChart: async ({ project_name }) => { /* ... */ },
  analyzeMarketingFunnel: async ({ start_date, end_date }) => { /* ... */ },
  findUntappedKeywords: async ({ limit = 10 }) => { /* ... */ },
  generateContentFromTopic: async ({ topic, platforms }) => { /* ... */ },
  createContentCalendar: async () => { /* ... */ },
  // 遊戲營運
  planGameEvent: async ({ eventName, startTime, endTime, targetAudience, rewardMechanism }) => { /* ... */ },
  getEventPerformanceReport: async ({ eventName }) => { /* ... */ },
  segmentPlayersByBehavior: async ({ segmentDescription }) => { /* ... */ },
  sendTargetedPushNotification: async ({ segmentId, messageTitle, messageBody }) => { /* ... */ },
  getRealtimeGameMetrics: async () => { /* ... */ },

  // --- ✅ 新增：賦予 AI 完整的專案讀寫能力 ---
  listFiles: async ({ directoryPath }) => {
    console.log(`AGENT ACTION: 正在列出目錄 "${directoryPath}" 中的檔案`);
    try {
      const projectRoot = path.resolve(__dirname);
      const absolutePath = path.resolve(projectRoot, directoryPath);
      if (!absolutePath.startsWith(projectRoot)) {
        throw new Error("存取被拒絕：禁止查詢專案目錄外的路徑。");
      }
      const files = await fs.readdir(absolutePath);
      return JSON.stringify({ success: true, files: files });
    } catch (error) {
      return JSON.stringify({ success: false, error: `讀取目錄失敗: ${error.message}` });
    }
  },
  readFileContent: async ({ filePath }) => {
    console.log(`AGENT ACTION: 正在讀取檔案 "${filePath}"`);
    try {
      const projectRoot = path.resolve(__dirname);
      const absolutePath = path.resolve(projectRoot, filePath);
      if (!absolutePath.startsWith(projectRoot)) {
        throw new Error("存取被拒絕：禁止讀取專案目錄外的檔案。");
      }
      const content = await fs.readFile(absolutePath, 'utf8');
      return JSON.stringify({ success: true, filePath, content });
    } catch (error) {
      return JSON.stringify({ success: false, error: `讀取檔案失敗: ${error.message}` });
    }
  },
  updateFileContent: async ({ filePath, newContent }) => {
    console.log(`AGENT ACTION: 正在更新檔案 "${filePath}"`);
    try {
      const projectRoot = path.resolve(__dirname);
      const absolutePath = path.resolve(projectRoot, filePath);
      if (!absolutePath.startsWith(projectRoot)) {
        throw new Error("存取被拒絕：禁止修改專案目錄外的檔案。");
      }
      const allowedExtensions = (EDITABLE_FILE_EXTENSIONS || '').split(',');
      const fileExtension = path.extname(filePath);
      if (!allowedExtensions.includes(fileExtension)) {
          throw new Error(`不允許修改此檔案類型 (${fileExtension})。`);
      }
      await fs.writeFile(absolutePath, newContent, 'utf8');
      return JSON.stringify({ success: true, message: `檔案 "${filePath}" 已成功更新。請記得手動將變更推送到 GitHub 以完成部署。` });
    } catch (error) {
      return JSON.stringify({ success: false, error: `更新檔案時發生錯誤: ${error.message}` });
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