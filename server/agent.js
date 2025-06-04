import express from 'express';
import { config } from 'dotenv';
import { OpenAI } from 'openai';

config(); // 載入 .env

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post('/chat', async (req, res) => {
  const { messages } = req.body;

  try {
    const response = await openai.beta.threads.createAndRun({
      assistant_id: process.env.ASSISTANT_ID,
      thread: { messages },
    });

    const runId = response.id;
    let status = 'in_progress';
    let finalMessages = [];

    while (status !== 'completed') {
      const runStatus = await openai.beta.threads.runs.retrieve(response.thread_id, runId);
      status = runStatus.status;
      await new Promise((r) => setTimeout(r, 1000));
    }

    const messagesRes = await openai.beta.threads.messages.list(response.thread_id);
    finalMessages = messagesRes.data.map((msg) => msg.content[0].text.value);

    res.json({ messages: finalMessages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Agent 回覆失敗' });
  }
});

export default router;
