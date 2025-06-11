// client/src/components/AgentChatWidget.tsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function AgentChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 每次開啟時聚焦到輸入框
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    try {
      const res = await axios.post('/api/agent/chat', {
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      });
      // 同時呼叫 command API
      await axios.post('/api/agent-command', { message: input });
      setMessages([
        ...newMessages,
        { role: 'assistant', content: res.data.messages[0] }
      ]);
    } catch (err) {
      console.error('Chat 發生錯誤：', err);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: '❌ 發生錯誤，請稍後重試' }
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
          {/* 訊息列表 */}
          <div className="flex-1 p-3 overflow-y-auto text-sm space-y-2">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={ msg.role === 'user'
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
