// server.js
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
  PORT = 3000
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

/** 簡易聊天 API (略) **/
app.post('/api/agent/chat', async (req, res) => {
  /* 你現有的 chat/completions 邏輯 */
});

/** 新增：讀取檔案內容 **/
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
    const sha = Array.isArray(data) ? data[0].sha : data.sha;
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    res.json({ sha, content });
  } catch (err) {
    console.error('file-fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** 新增：更新檔案內容 **/
app.post('/api/agent/file-edit', async (req, res) => {
  const { filePath, content, sha } = req.body;
  if (!filePath || !content || !sha) {
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
