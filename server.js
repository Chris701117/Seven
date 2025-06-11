// server.js
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import cors from 'cors';
import OpenAI from 'openai';
import { Octokit } from '@octokit/rest';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// ✅ Middleware
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { sameSite: 'lax' }
}));

// ✅ OpenAI SDK v4
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ GitHub Octokit
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER  = process.env.GITHUB_OWNER;
const REPO   = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH || 'main';

// — 简易登入 / Session 验证 —
// 简易登录接口
function simpleAuth(req, res) {
  const { username, password } = req.body;
  if (username === 'chris' && password === 'Zxc777') {
    req.session.user = { username };
    req.session.userId = 1;
    return res.json({ success: true, username, userId: 1 });
  }
  return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
}
app.post('/api/login', simpleAuth);
app.post('/api/auth/login', simpleAuth);

// 获取当前用户
app.get('/api/auth/me', (req, res) => {
  if (req.session.user) {
    return res.json({ username: req.session.user.username, userId: req.session.userId });
  }
  res.status(401).json({ message: '未登入' });
});

// 登出
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// — Chat API —
app.post('/api/agent/chat', async (req, res) => {
  const { messages } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4', // 改成 gpt-4 或您有權限的模型
      messages: [
        { role: 'system', content: '你是一個能協助操作網站內容的 AI 助理。' },
        ...messages,
      ],
    });
    const reply = completion.choices[0]?.message?.content || '⚠️ 無回應';
    res.json({ messages: [reply] });
  } catch (err) {
    console.error('❌ Chat Error:', err);
    res.status(500).json({ messages: ['❌ 發生錯誤'] });
  }
});

// — Agent Command (元件控制示例) —
app.post('/api/agent-command', (req, res) => {
  const { message } = req.body;
  console.log('🧠 Agent 指令內容：', message);
  // 在這裡可以觸發 WebSocket、修改資料庫、寫檔等
  res.json({ success: true });
});

// — File Edit Endpoint —
// 讓 AI 直接修改 GitHub 上指定檔案
app.post('/api/agent/file-edit', async (req, res) => {
  const { filePath, patch } = req.body;
  try {
    // 1. 取得檔案 SHA
    const { data: fileData } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      ref: BRANCH,
    });
    const sha = Array.isArray(fileData) ? fileData[0].sha : fileData.sha;

    // 2. push 新內容
    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      message: `AI agent 更新 ${filePath}`,
      content: Buffer.from(patch, 'utf8').toString('base64'),
      sha,
      branch: BRANCH,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('File edit error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// — Static & SPA Fallback —
// 提供前端打包檔案
app.use(express.static(path.join(__dirname, 'dist', 'public')));

// SPA Fallback：非 /api 路由都回傳 index.html
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'public', 'index.html'));
});

// — 啟動 Server —
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
