import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Configuration, OpenAIApi } from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ✅ 初始化 OpenAI API
const configuration = new Configuration({ apiKey: OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

// ✅ 中介軟體
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

// ✅ Chat 聊天 API
app.post('/api/agent/chat', async (req, res) => {
  const { messages } = req.body;

  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: '你是一個能協助操作網站內容的 AI 助理。' },
        ...messages,
      ],
    });

    const reply = completion.data.choices[0].message?.content || '⚠️ 無回應';

    res.json({ messages: [reply] });
  } catch (error) {
    console.error('❌ Chat Error:', error.message);
    res.status(500).json({ messages: ['❌ 發生錯誤'] });
  }
});

// ✅ 新增控制網站元件的 API
app.post('/api/agent-command', (req, res) => {
  const { message } = req.body;

  // 簡單範例：當 agent 收到特定字串，就修改首頁標題（此處你可改為觸發某個狀態或變數）
  console.log('🧠 Agent 指令內容：', message);

  if (message.includes('修改首頁標題為')) {
    const newTitle = message.split('修改首頁標題為')[1].trim();
    // 👉 你可以在這裡觸發 WebSocket、寫入 JSON、修改 DOM 等
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
