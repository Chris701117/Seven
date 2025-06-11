import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import cors from 'cors';
import OpenAI from 'openai';
import { Octokit } from '@octokit/rest';
import fetch from 'node-fetch'; // 用於 web-search 的例子

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));

// Init OpenAI & GitHub
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER = process.env.GITHUB_OWNER!;
const REPO  = process.env.GITHUB_REPO!;
const BRANCH= process.env.GITHUB_BRANCH || 'main';

// 定義工具 (tool= function calling schema)
const tools = [
  {
    name: 'web_search',
    description: '用於搜尋最新網頁資訊',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query']
    }
  },
  {
    name: 'edit_file',
    description: '更新 GitHub 專案中文件內容',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        newContent: { type: 'string' }
      },
      required: ['filePath','newContent']
    }
  },
  {
    name: 'run_command',
    description: '在伺服器上執行指定的 shell 命令（謹慎授權）',
    parameters: {
      type: 'object',
      properties: { command: { type: 'string' } },
      required: ['command']
    }
  }
];

// Helper: 執行 web search
async function doWebSearch(query:string) {
  const resp = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
  const data = await resp.json();
  return data.AbstractText || '找不到相關結果';
}

// Helper: 更新 GitHub 檔案
async function doEditFile(filePath:string, newContent:string) {
  const { data } = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path: filePath, ref: BRANCH });
  const sha = Array.isArray(data) ? data[0].sha : data.sha;
  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER, repo: REPO, path: filePath,
    message: `AI 更新 ${filePath}`, content: Buffer.from(newContent,'utf8').toString('base64'),
    sha, branch: BRANCH
  });
}

// **新**：Responses API Endpoint
app.post('/api/agent/respond', async (req, res) => {
  const { messages } = req.body;

  // 第一次呼叫 model
  let response = await openai.responses.create({
    model: 'gpt-4o-mini', // 或你有權限的模型
    messages: [{ role: 'system', content: '你是一個能執行各種工具的智能代理。' }, ...messages],
    tools
  });

  // 如果 model 要呼叫工具
  if (response.choices[0].tool) {
    const { tool, arguments: argsJson } = response.choices[0];
    const args = JSON.parse(argsJson!);

    let toolResult = '';
    if (tool === 'web_search') {
      toolResult = await doWebSearch(args.query);
    } else if (tool === 'edit_file') {
      await doEditFile(args.filePath, args.newContent);
      toolResult = `已更新檔案 ${args.filePath}`;
    } else if (tool === 'run_command') {
      // 謹慎：production 不要開放
      const { execSync } = await import('child_process');
      try { toolResult = execSync(args.command).toString(); }
      catch(e) { toolResult = `執行失敗：${e.message}`; }
    }

    // 再送一次給 model，讓它把結果跟用戶對話串起來
    response = await openai.responses.create({
      model: 'gpt-4o-mini',
      messages: [
        ...messages,
        { role: 'assistant', content: null, tool, arguments: argsJson },
        { role: 'tool', name: tool, content: toolResult }
      ]
    });
  }

  // 最後輸出 model 的回答
  res.json({ messages: [ response.choices[0].message?.content || '' ] });
});

// 靜態 & SPA fallback
app.use(express.static(path.join(__dirname,'dist','public')));
app.get(/^\/(?!api\/).*/, (_,r) => r.sendFile(path.join(__dirname,'dist','public','index.html')));

app.listen(process.env.PORT||3000, () => console.log('✅ Server running'));
