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
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));

// OpenAI 初始
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// GitHub Octokit 初始
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER  = process.env.GITHUB_OWNER;
const REPO   = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH || 'main';

// 檔案編輯 Endpoint
app.post('/api/agent/file-edit', async (req, res) => {
  const { filePath, patch } = req.body;  
  // patch: AI 回傳的完整檔案新內容或 diff
  try {
    // 1. 先取得目前檔案的 SHA
    const { data: fileData } = await octokit.repos.getContent({
      owner: OWNER, repo: REPO, path: filePath, ref: BRANCH
    });
    const sha = Array.isArray(fileData) ? fileData[0].sha : fileData.sha;

    // 2. 更新檔案
    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      message: `AI agent 更新 ${filePath}`,
      content: Buffer.from(patch).toString('base64'),
      sha,
      branch: BRANCH,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('File edit error', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 其餘 API 路由 (login / chat / agent-command / 靜態檔案...)
// ...

app.listen(process.env.PORT || 3000, ()=>console.log('✅ Server running'));
