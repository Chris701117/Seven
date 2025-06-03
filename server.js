import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ 解析 JSON 請求 body
app.use(express.json());

// ✅ 簡易登入 API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'chris' && password === 'Zxc777') {
    return res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
  }
});

// 提供靜態檔案 (前端 build 結果)
app.use(express.static(path.join(__dirname, 'dist', 'public')));

// 所有其他路由指向 index.html (SPA 用)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
