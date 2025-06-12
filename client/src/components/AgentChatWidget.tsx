// client/src/components/AgentChatWidget.tsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function AgentChatWidget() {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 開啟視窗自動聚焦
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // 送出訊息給 Chat API
  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMsgs = [...messages, { role: 'user', content: input }];
    setMessages(newMsgs);
    const userText = input;
    setInput('');

    try {
      // 1) 呼叫 chat endpoint
      const chatRes = await axios.post('/api/agent/chat', {
        messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
      });
      const reply = chatRes.data.messages?.[0] || '⚠️ 無回應';

      // 2) 嘗試解析是否為檔案操作指令
      if (reply.startsWith('PATCH ') || reply.startsWith('EDIT ')) {
        // 簡單範例：AI 會回「PATCH path/to/file.tsx <新內容>」
        const parts = reply.split(' ');
        const filePath = parts[1];
        const newContent = reply.slice(reply.indexOf('<') + 1, reply.lastIndexOf('>'));
        // 先抓取舊的 sha
        const fetchRes = await axios.get('/api/agent/file-fetch', { params: { path: filePath } });
        const { sha, content: oldContent } = fetchRes.data;
        // 產生 patch：這裡我們直接用「整個檔案新內容」
        const updated = oldContent.replace(/<h1>.*<\/h1>/, `<h1>${newContent}</h1>`);
        // 呼叫 file-edit
        await axios.post('/api/agent/file-edit', {
          filePath, content: updated, sha
        });
        setMessages([...newMsgs, { role: 'assistant', content: `✅ 已更新 ${filePath}` }]);
      } else {
        // 一般對話
        setMessages([...newMsgs, { role: 'assistant', content: reply }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '❌ 發生錯誤，請稍後重試' }
      ]);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setOpen(v => !v)}
        className="bg-blue-600 text-white px-4 py-2 rounded-full shadow"
      >
        AI Agent
      </button>

      {open && (
        <div className="bg-white w-80 h-96 border rounded shadow-lg flex flex-col mt-2">
          {/* 訊息列表 */}
          <div className="flex-1 p-3 overflow-y-auto text-sm space-y-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === 'user'
                  ? 'text-right text-gray-800'
                  : 'text-left text-blue-600'
                }
              >
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
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1 border px-2 py-1 rounded focus:outline-none focus:ring"
              placeholder="輸入訊息，按 Enter 送出..."
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="bg-blue-500 text-white px-3 py-1 rounded disabled:opacity-50"
            >
              送出
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
