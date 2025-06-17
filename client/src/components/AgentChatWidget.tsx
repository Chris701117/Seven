// client/src/components/AgentChatWidget.tsx (最終修正版)
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function AgentChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 新增：用來儲存我們的對話 ID (Thread ID)
  const [threadId, setThreadId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自動捲動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // 開啟視窗自動聚焦
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // 送出訊息給新的 Assistants API
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessageContent = input;
    const newMsgs: Msg[] = [...messages, { role: 'user', content: userMessageContent }];
    setMessages(newMsgs);
    setIsLoading(true);
    setInput('');

    try {
      // ✅ 修正：API 請求的 body，現在只送出當前的訊息和 threadId
      const requestBody = {
        message: userMessageContent,
        threadId: threadId, // 如果是第一次，這裡會是 null
      };

      const chatRes = await axios.post('/api/agent/chat', requestBody);
      
      const reply = chatRes.data.message || '⚠️ 無回應';
      
      // ✅ 更新：從後端回應中取得新的 threadId 並儲存，供下一次對話使用
      if (chatRes.data.threadId) {
        setThreadId(chatRes.data.threadId);
      }

      // ✅ 簡化：後端已處理所有工具，前端只需顯示最終回覆
      setMessages([...newMsgs, { role: 'assistant', content: reply }]);

    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '❌ 發生錯誤，請稍後重試' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setOpen(v => !v)}
        className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-110"
      >
        AI Agent
      </button>

      {open && (
        <div className="bg-white w-80 h-96 border rounded-lg shadow-xl flex flex-col mt-2">
          <div className="flex-1 p-3 overflow-y-auto text-sm space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] px-3 py-2 rounded-lg ${m.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-800'}`
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                  <div className="bg-gray-200 text-gray-500 px-3 py-2 rounded-lg">
                    正在思考中...
                  </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-2 border-t flex space-x-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !isLoading) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1 border px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="輸入訊息..."
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-blue-500 text-white px-4 py-1 rounded-md disabled:opacity-50 hover:bg-blue-600"
            >
              送出
            </button>
          </div>
        </div>
      )}
    </div>
  );
}