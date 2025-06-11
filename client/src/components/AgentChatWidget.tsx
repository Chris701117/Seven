import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function AgentChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // 呼叫聊天 API
  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMsgs = [...messages, { role: 'user', content: input }];
    setMessages(newMsgs);
    const userContent = input;
    setInput('');

    try {
      // 1. Chat
      const chatRes = await axios.post('/api/agent/chat', {
        messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
      });
      const reply = chatRes.data.messages[0];

      // 2. 檔案修改（若回覆中包含特定指令，可解析並呼叫此 API）
      // 範例：當使用者或 Agent 回文中包含 "PATCH filePath\n<new-content>"，自動執行檔案修改
      if (reply.startsWith('PATCH ')) {
        const [_, pathAndContent] = reply.split('PATCH ');
        const [filePath, ...contentLines] = pathAndContent.split('\n');
        const newContent = contentLines.join('\n');
        await axios.post('/api/agent/file-edit', { filePath, newContent });
      }

      // 3. 更新對話
      setMessages([
        ...newMsgs,
        { role: 'assistant', content: reply }
      ]);
    } catch (err) {
      console.error('❌ Chat error', err);
      setMessages([
        ...newMsgs,
        { role: 'assistant', content: '❌ 發生錯誤，請稍後再試' }
      ]);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setOpen(o => !o)}
        className="bg-blue-600 text-white px-4 py-2 rounded-full shadow"
      >
        AI 助理
      </button>

      {open && (
        <div className="bg-white w-80 h-96 border rounded shadow-lg flex flex-col mt-2">
          {/* 訊息區 */}
          <div className="flex-1 p-3 overflow-y-auto text-sm space-y-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={msg.role === 'user'
                  ? 'text-right text-gray-800'
                  : 'text-left text-blue-600'
                }
              >
                {msg.content}
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
              className="bg-blue-500 text-white px-3 py-1 rounded disabled:opacity-50"
              disabled={!input.trim()}
            >
              送出
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
