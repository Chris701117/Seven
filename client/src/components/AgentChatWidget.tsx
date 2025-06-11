import { useState } from 'react';
import axios from 'axios';

export default function AgentChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);

  const sendMessage = async () => {
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');

    // ✅ 傳送聊天內容給 OpenAI Agent
    const res = await axios.post('/api/agent/chat', {
      messages: newMessages.map(m => ({ role: m.role, content: m.content })),
    });

    // ✅ 額外呼叫 agent-command 讓 Agent 有機會控制元件
    await axios.post('/api/agent-command', {
      message: input,
    });

    setMessages([
      ...newMessages,
      { role: 'assistant', content: res.data.messages[0] }
    ]);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setOpen(!open)}
        className="bg-blue-600 text-white px-4 py-2 rounded-full shadow"
      >
        AI 助理
      </button>

      {open && (
        <div className="bg-white w-80 h-96 border rounded shadow-lg flex flex-col mt-2">
          <div className="flex-1 p-3 overflow-y-auto text-sm">
            {messages.map((msg, idx) => (
              <div key={idx} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left text-blue-600'}`}>
                {msg.content}
              </div>
            ))}
          </div>
          <div className="p-2 border-t flex">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 border px-2 py-1 rounded"
              placeholder="請輸入訊息..."
            />
           <input
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={(e) => {
               if (e.key === 'Enter' && input.trim()) {
                 e.preventDefault();
                 sendMessage();
               }
             }}
             className="flex-1 border px-2 py-1 rounded"
             placeholder="請輸入訊息..."
           />
            <button onClick={sendMessage} className="ml-2 bg-blue-500 text-white px-3 py-1 rounded">
              送出
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
