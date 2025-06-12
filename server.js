// server.js
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import cors from 'cors';
import OpenAI from 'openai';
import { Octokit } from '@octokit/rest';

//
// ———— 环境变量检查 ————
const {
  OPENAI_API_KEY,
  GITHUB_TOKEN,
  GITHUB_OWNER,
  GITHUB_REPO,
  GITHUB_BRANCH = 'main',
  SESSION_SECRET = 'secret-key'
} = process.env;

if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');
if (!GITHUB_TOKEN)   throw new Error('Missing GITHUB_TOKEN');
if (!GITHUB_OWNER)   throw new Error('Missing GITHUB_OWNER');
if (!GITHUB_REPO)    throw new Error('Missing GITHUB_REPO');

//
// ———— 准备 Express ————
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const app        = express();
const PORT       = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

//
// ———— OpenAI & GitHub 客户端 ————
const openai  = new OpenAI({ apiKey: OPENAI_API_KEY });
const octokit = new Octokit({ auth: GITHUB_TOKEN });

//
// ———— 简易聊天接口 ————
app.post('/api/agent/chat', async (req, res) => {
  const { messages } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '你是一個能協助操作網站內容的 AI 助理。' },
        ...messages
      ],
    });
    const reply = completion.choices?.[0]?.message?.content ?? '⚠️ 無回應';
    return res.json({ messages: [reply] });
  } catch (err) {
    console.error('❌ Chat Error:', err);
    return res.status(500).json({ messages: ['❌ 發生錯誤'] });
  }
});

//
// ———— 文件编辑接口 ————
app.post('/api/agent/file-edit', async (req, res) => {
  const { filePath, newContent } = req.body;
  try {
    // 1. 读原文件获取 sha
    const { data: fileData } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      ref: GITHUB_BRANCH,
    });
    const sha = Array.isArray(fileData) ? fileData[0].sha : fileData.sha;

    // 2. 更新文件
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      message: `AI Agent 更新 ${filePath}`,
      content: Buffer.from(newContent, 'utf-8').toString('base64'),
      sha,
      branch: GITHUB_BRANCH,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('File edit error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

//
// ———— 提供靜態檔案（前端 build） & SPA fallback ————
app.use(express.static(path.join(__dirname, 'dist', 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'public', 'index.html'));
});

//
// ———— 启动 ————
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
