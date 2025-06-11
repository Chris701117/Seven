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
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { sameSite: 'lax' }
}));

// 環境變數檢查
const { OPENAI_API_KEY, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = process.env;
if (!OPENAI_API_KEY)  throw new Error('Missing OPENAI_API_KEY');
if (!GITHUB_TOKEN)    throw new Error('Missing GITHUB_TOKEN');
if (!GITHUB_OWNER)    throw new Error('Missing GITHUB_OWNER');
if (!GITHUB_REPO)     throw new Error('Missing GITHUB_REPO');
const BRANCH = GITHUB_BRANCH || 'main';

// OpenAI 客戶端
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// GitHub Octokit
const octokit = new Octokit({ auth: GITHUB_TOKEN });
const OWNER  = process.env.GITHUB_OWNER;
const REPO   = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH || 'main';

// 簡易登入
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
app.get('/api/auth/me', (req, res) => {
  if (req.session.user) {
    return res.json({ username: req.session.user.username, userId: req.session.userId });
  }
  res.status(401).json({ message: '未登入' });
});
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// Chat API
app.post('/api/agent/chat', async (req, res) => {
  const { messages } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
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

// Component control 範例
app.post('/api/agent-command', (req, res) => {
  console.log('🧠 Agent 指令內容：', req.body.message);
  res.json({ success: true });
});

// 檔案修改 API
app.post('/api/agent/file-edit', async (req, res) => {
  const { filePath, newContent } = req.body;
  try {
    // 1. 取 SHA
    const { data: fileData } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      ref: BRANCH
    });
    const sha = Array.isArray(fileData) ? fileData[0].sha : fileData.sha;

    // 2. 更新檔案
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      message: `AI agent update ${filePath}`,
      content: Buffer.from(newContent, 'utf8').toString('base64'),
      sha,
      branch: BRANCH
    });

    res.json({ success: true });
  } catch (err) {
    console.error('❌ File edit error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 靜態檔案 & SPA fallback
app.use(express.static(path.join(__dirname, 'dist', 'public')));
app.get(/^\/(?!api\/).*/, (req, res) =>
  res.sendFile(path.join(__dirname, 'dist', 'public', 'index.html'))
);

// 啟動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
