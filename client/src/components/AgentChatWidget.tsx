// client/src/components/AgentChatWidget.tsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function AgentChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // 送文字訊息給後端
  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');

    // 呼叫 chat API
    const chatRes = await axios.post('/api/agent/chat', { messages: newMsgs });
    const reply = chatRes.data.messages[0];
    setMessages([...newMsgs, { role: 'assistant', content: reply }]);
  };

  // AI 回答中有 PATCH 指令 (假設 GPT 回一段 JSON 或特定格式)
  const tryPatch = async (assistantContent: string) => {
    /**
     * 假設 AI 回:
     * {
     *   "action": "editFile",
     *   "filePath": "client/src/pages/Home.tsx",
     *   "newContent": "<h1>七七七後台</h1> ..."
     * }
     */
    try {
      const payload = JSON.parse(assistantContent);
      if (payload.action === 'editFile') {
        await axios.post('/api/agent/file-edit', {
          filePath: payload.filePath,
          newContent: payload.newContent,
        });
        // 成功訊息
        setMessages(msgs => [...msgs, { role: 'assistant', content: '✅ 檔案已更新到 GitHub！' }]);
      }
    } catch {
      // 忽略非 JSON 回答
    }
  };

  const onSend = async () => {
    await sendMessage();
    const last = messages[messages.length - 1]?.content || '';
    await tryPatch(last);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setOpen(o => !o)}
        className="bg-blue-600 text-white px-4 py-2 rounded-full shadow"
      >
        AI Agent
      </button>

      {open && (
        <div className="bg-white w-80 h-96 border rounded shadow-lg flex flex-col mt-2">
          {/* 訊息列表 */}
          <div className="flex-1 p-3 overflow-y-auto text-sm space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left text-blue-600'}>
                {m.content}
              </div>
            ))}
          </div>
          {/* 輸入區 */}
          <div className="p-2 border-t flex space-x-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSend()}
              className="flex-1 border px-2 py-1 rounded focus:outline-none"
              placeholder="輸入訊息，按 Enter 送出..."
            />
            <button onClick={onSend} className="bg-blue-500 text-white px-3 py-1 rounded" disabled={!input.trim()}>
              送出
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
