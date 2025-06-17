// server.js (最終、完整、動態路徑偵測版)
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
import fs from 'fs'; // 匯入檔案系統模組

// --- (此處省略環境變數、Express App 初始化、API Client 初始化、身份驗證 API、Tools、聊天 API 等所有不需變動的程式碼) ---
// ...
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const app = express();
// ...
// ... 所有 API routes 和 tools 物件 ...
// ...

// --- ✅ 靜態檔案服務 (動態路徑偵測) ---
// 建立一個可能的路徑列表
const possibleDistPaths = [
  path.join(__dirname, 'dist'),      // 假設 dist 與 server.js 同層 (例如在 src 內)
  path.join(__dirname, '..', 'dist') // 假設 dist 在 server.js 的上一層 (在專案根目錄)
];

let distPath = null;

// 依序檢查哪個路徑是有效的
for (const p of possibleDistPaths) {
  const indexPath = path.join(p, 'index.html');
  console.log(`[PATH-DEBUG] 正在檢查路徑: ${indexPath}`);
  if (fs.existsSync(indexPath)) {
    distPath = p;
    console.log(`[PATH-DEBUG] ✅ 找到可用的前端檔案路徑: ${distPath}`);
    break;
  }
}

if (distPath) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // 如果所有路徑都找不到，在日誌中留下致命錯誤
  const errorMessage = "[PATH-ERROR] 致命錯誤：在所有可能的路徑中都找不到 dist/index.html！請檢查您的建置流程與檔案結構。";
  console.error(errorMessage);
  // 同時讓網站顯示錯誤，方便除錯
  app.get('*', (req, res) => {
    res.status(500).send(errorMessage);
  });
}


// --- 伺服器啟動 ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));