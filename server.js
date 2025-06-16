// server.js (已合併登入功能和 GitHub 檔案編輯功能)
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import cors from 'cors';
import OpenAI from 'openai';
import { Octokit } from '@octokit/rest';

const {
  OPENAI_API_KEY,
  GITHUB_TOKEN,
  GITHUB_OWNER,
  GITHUB_REPO,
  GITHUB_BRANCH = 'main',
  SESSION_SECRET = 'secret-key',
  PORT = 3000,
  // 為了安全性，我們將從環境變數讀取帳號密碼
  ADMIN_USERNAME = 'chris',
  ADMIN_PASSWORD = 'Zxc777'
} = process.env;

// 環境變數檢查
if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');
if (!GITHUB_TOKEN)   throw new Error('Missing GITHUB_TOKEN');
if (!GITHUB_OWNER)   throw new Error('Missing GITHUB_OWNER');
if (!GITHUB_REPO)    throw new Error('Missing GITHUB_REPO');

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { sameSite: 'lax' },
}));

// OpenAI & Octokit 初始化
const openai  = new OpenAI({ apiKey: OPENAI_API_KEY });
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// --- ✅ 登入/登出/身份驗證 API (從舊版還原) ---
function simpleAuth(req, res) {
  const { username, password } = req.body;
  
  // 檢查前端送來的帳號密碼是否與環境變數中設定的相符
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.user = { username };
    // 您可以根據需要自訂 user ID
    req.session.userId = 1; 
    return res.status(200).json({ success: true, username, userId: req.session.userId });
  } else {
    return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
  }
}

// 支援多種可能的登入路徑
app.post('/api/login', simpleAuth);
app.post('/api/auth/login', simpleAuth);

// 檢查登入狀態
app.get('/api/auth/me', (req, res) => {
  if (req.session.user) {
    res.json({ username: req.session.user.username, userId: req.session.userId });
  } else {
    res.status(401).json({ message: '未登入' });
  }
});

// 登出
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: '登出失敗' });
    }
    res.json({ success: true });
  });
});
// --- 登入功能區塊結束 ---


/** 簡易聊天 API **/
app.post('/api/agent/chat', async (req, res) => {
    // 這裡使用您新版的 chat/completions 邏輯
    const { messages } = req.body;
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: '你是一個能協助操作網站內容的 AI 助理。' },
                ...messages
            ]
        });
        const reply = completion.choices[0]?.message?.content || '⚠️ 無回應';
        res.json({ messages: [reply] });
    } catch(err) {
        console.error('Chat error:', err);
        res.status(500).json({ error: err.message });
    }
});


/** 讀取檔案內容 **/
app.get('/api/agent/file-fetch', async (req, res) => {
  const filePath = String(req.query.path || '');
  if (!filePath) return res.status(400).json({ error: '需要 path 參數' });

  try {
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      ref: GITHUB_BRANCH,
    });
    // @ts-ignore
    const sha = Array.isArray(data) ? data[0].sha : data.sha;
    // @ts-ignore
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    res.json({ sha, content });
  } catch (err) {
    console.error('file-fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** 更新檔案內容 **/
app.post('/api/agent/file-edit', async (req, res) => {
  const { filePath, content, sha } = req.body;
  if (!filePath || content === undefined || !sha) {
    return res.status(400).json({ error: '需要 filePath、content、sha 三個參數' });
  }

  try {
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      message: `AI Agent 🚀 更新 ${filePath}`,
      content: Buffer.from(content, 'utf8').toString('base64'),
      sha,
      branch: GITHUB_BRANCH,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('file-edit error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 靜態檔案 & SPA fallback
app.use(express.static(path.join(__dirname, 'dist','public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist','public','index.html'));
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));