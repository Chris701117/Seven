import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import cors from 'cors';
import OpenAI from 'openai';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'chris';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Zxc777';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync(ADMIN_PASSWORD, 10);

// ✅ 初始化新版 OpenAI SDK v4
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ✅ 中介軟體
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

// ✅ 簡易登入 API
function simpleAuth(req, res) {
  const { username, password } = req.body;

  const attempts = req.session.loginAttempts || 0;
  if (attempts >= 5) {
    return res.status(429).json({ success: false, message: '嘗試次數過多，請稍後再試' });
  }

  const passwordMatch = username === ADMIN_USERNAME && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);

  if (passwordMatch) {
    req.session.loginAttempts = 0;
    req.session.user = { username: ADMIN_USERNAME };
    req.session.userId = 1;
    return res.status(200).json({ success: true, username: ADMIN_USERNAME, userId: 1 });
  } else {
    req.session.loginAttempts = attempts + 1;
    return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
  }
}

// 支援兩種路徑，避免前端路徑不一致
app.post('/api/login', simpleAuth);
app.post('/api/auth/login', simpleAuth);

app.get('/api/auth/me', (req, res) => {
  if (req.session.user) {
    res.json({ username: req.session.user.username, userId: req.session.userId });
  } else {
    res.status(401).json({ message: '未登入' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// ✅ Chat 聊天 API
app.post('/api/agent/chat', async (req, res) => {
  const { messages } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '你是一個能協助操作網站內容的 AI 助理。' },
        ...messages,
      ],
    });

    const reply = completion.choices[0]?.message?.content || '⚠️ 無回應';
    res.json({ messages: [reply] });
  } catch (error) {
    console.error('❌ Chat Error:', error.message);
    res.status(500).json({ messages: ['❌ 發生錯誤'] });
  }
});

// ✅ 新增控制網站元件的 API
app.post('/api/agent-command', (req, res) => {
  const { message } = req.body;
  console.log('🧠 Agent 指令內容：', message);

  if (message.includes('修改首頁標題為')) {
    const newTitle = message.split('修改首頁標題為')[1].trim();
    console.log('✅ 模擬修改首頁標題為：', newTitle);
  }

  res.json({ success: true });
});

// ✅ 提供靜態檔案 (前端 build 結果)
app.use(express.static(path.join(__dirname, 'dist', 'public')));

// ✅ 所有其他路由指向 index.html (SPA 用)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'public', 'index.html'));
});

// ✅ 啟動伺服器
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
