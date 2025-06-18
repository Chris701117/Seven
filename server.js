// server.js (最終、完整、遊戲營運中心版)
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
  // --- 網站基礎管理 ---
  getWebsiteTitle: async () => { /* ... */ },
  updateWebsiteTitle: async ({ newTitle }) => { /* ... */ },
  getNavigationMenu: async () => { /* ... */ },
  updateNavigationMenu: async ({ menuItems }) => { /* ... */ },
  createPermissionGroup: async ({ roleName }) => { /* ... */ },
  createUserAccount: async ({ username, password, roleName }) => { /* ... */ },
  addLoginIpRestriction: async ({ ipAddress, description }) => { /* ... */ },
  listUsers: async () => { /* ... */ },
  
  // --- 社群與營銷工具 ---
  postToFacebookPage: async ({ message, link }) => { /* ... */ },
  getFacebookLatestPostInsights: async () => { /* ... */ },
  generateSocialMediaPost: async ({ platform, topic, tone = '中性的' }) => { /* ... */ },
  createScheduledPost: async ({ platform, content, scheduled_time }) => { /* ... */ },
  createProjectTask: async ({ task_name, project_name, due_date, assignee }) => { /* ... */ },
  getProjectGanttChart: async ({ project_name }) => { /* ... */ },
  analyzeMarketingFunnel: async ({ start_date, end_date }) => { /* ... */ },
  findUntappedKeywords: async ({ limit = 10 }) => { /* ... */ },
  generateContentFromTopic: async ({ topic, platforms }) => { /* ... */ },
  createContentCalendar: async () => { return JSON.stringify({ success: false, error: "此功能尚在開發中。" }) },

  // --- ✅ 新增：遊戲營運核心工具 ---
  planGameEvent: async ({ eventName, startTime, endTime, targetAudience, rewardMechanism }) => {
    console.log(`AGENT ACTION: 正在規劃新的遊戲活動 "${eventName}"`);
    // 在真實世界中，這裡會將活動細節寫入 `game_events` 資料表
    try {
      // 模擬寫入資料庫
      await db.execute({
          sql: "INSERT INTO project_tasks (task_name, project_name, due_date, status) VALUES (?, ?, ?, 'todo')",
          args: [`規劃活動 - ${eventName}`, '遊戲活動', endTime.split('T')[0]]
      });
      return JSON.stringify({ success: true, eventId: Math.floor(Math.random() * 1000), message: `已成功建立活動「${eventName}」的規劃。` });
    } catch(err) {
      return JSON.stringify({ success: false, error: "規劃遊戲活動時資料庫出錯。" });
    }
  },

  getEventPerformanceReport: async ({ eventName }) => {
    console.log(`AGENT ACTION: 正在分析活動 "${eventName}" 的成效`);
    // 在真實世界中，這裡會從多個資料表（玩家紀錄、儲值紀錄）撈取數據並計算
    // 我們此處用紙上談兵的方式模擬結果
    return JSON.stringify({
      success: true,
      report: {
        eventName: eventName,
        participants: 12500,
        totalRevenueContribution: 8500, // unit: USD
        newUserConversion: 320,
        conclusion: "活動成功吸引大量玩家參與，但營收貢獻未達預期。建議未來可針對參與者進行後續的再行銷活動，以提升長期價值。"
      }
    });
  },

  segmentPlayersByBehavior: async ({ segmentDescription }) => {
    console.log(`AGENT ACTION: 正在根據描述分群玩家: "${segmentDescription}"`);
    // 在真實世界中，這裡會解析 `segmentDescription` 並轉換為複雜的 SQL 查詢
    // 我們此處用紙上談兵的方式模擬結果
    const segmentId = `seg_${new Date().getTime()}`;
    const playerCount = Math.floor(Math.random() * 100) + 50;
    return JSON.stringify({
      success: true,
      segmentId: segmentId,
      playerCount: playerCount,
      message: `已根據您的描述，成功圈選出 ${playerCount} 位符合條件的玩家。分群 ID 為 ${segmentId}。`
    });
  },

  sendTargetedPushNotification: async ({ segmentId, messageTitle, messageBody }) => {
    console.log(`AGENT ACTION: 正在對分群 ${segmentId} 發送推播`);
    // 在真實世界中，這裡會串接 Firebase Cloud Messaging 或其他推播服務的 API
    // 我們此處用紙上談兵的方式模擬結果
    if (!segmentId.startsWith('seg_')) {
      return JSON.stringify({ success: false, error: "提供了無效的分群 ID。" });
    }
    return JSON.stringify({
      success: true,
      deliveryId: `push_${new Date().getTime()}`,
      message: `已成功向分群 ${segmentId} 的玩家們排程發送標題為「${messageTitle}」的推播訊息。`
    });
  },

  getRealtimeGameMetrics: async () => {
    console.log(`AGENT ACTION: 正在取得即時遊戲數據`);
    // 在真實世界中，這裡會串接您遊戲後端的即時數據 API
    // 我們此處用紙上談兵的方式模擬結果
    return JSON.stringify({
      success: true,
      metrics: {
        ccu: Math.floor(Math.random() * 500) + 1200, // Concurrent Users
        dau: Math.floor(Math.random() * 2000) + 8000, // Daily Active Users
        grossRevenueToday: Math.floor(Math.random() * 10000) + 25000, // unit: USD
        timestamp: new Date().toISOString()
      }
    });
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