 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/server.js b/server.js
index ec4a60a96697f13a483aee1e46438cd3d28450f0..3d1de76e8fef9f6e8c2be4431fd511c34b9a805e 100644
--- a/server.js
+++ b/server.js
@@ -1,54 +1,76 @@
 import 'dotenv/config';
 import express from 'express';
+import session from 'express-session';
 import path from 'path';
 import { fileURLToPath } from 'url';
 import OpenAI from 'openai';
 
 const __filename = fileURLToPath(import.meta.url);
 const __dirname = path.dirname(__filename);
 
 const app = express();
 const PORT = process.env.PORT || 3000;
 const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
 
 // ✅ 初始化新版 OpenAI SDK v4
 const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
 
 // ✅ 中介軟體
 app.use(express.json());
+app.use(
+  session({
+    secret: 'seven-secret',
+    resave: false,
+    saveUninitialized: false,
+  })
+);
 
 // ✅ 簡易登入 API
 app.post('/api/login', (req, res) => {
   const { username, password } = req.body;
   if (username === 'chris' && password === 'Zxc777') {
+    req.session.user = { username };
     return res.status(200).json({ success: true });
   } else {
     return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
   }
 });
 
+app.get('/api/auth/me', (req, res) => {
+  if (req.session.user) {
+    return res.json(req.session.user);
+  }
+  res.status(401).json({ message: '未登入' });
+});
+
+app.post('/api/logout', (req, res) => {
+  req.session.destroy(() => {
+    res.json({ success: true });
+  });
+});
+
 // ✅ Chat 聊天 API
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
   } catch (error) {
     console.error('❌ Chat Error:', error.message);
     res.status(500).json({ messages: ['❌ 發生錯誤'] });
   }
 });
 
 // ✅ 新增控制網站元件的 API
 app.post('/api/agent-command', (req, res) => {
   const { message } = req.body;
   console.log('🧠 Agent 指令內容：', message);
 
EOF
)