// client/src/components/AgentChatWidget.tsx (最終體驗優化版)
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Paperclip } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function AgentChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // ✅ 開啟或送出訊息後，自動聚焦輸入框
  useEffect(() => {
    if (open && !isLoading) {
      inputRef.current?.focus();
    }
  }, [open, isLoading]); 

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ 檔案上傳功能未設定，請聯繫管理員。' }]);
      return;
    }

    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'assistant', content: `正在上傳檔案：${file.name}...` }]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        formData
      );
      const fileUrl = response.data.secure_url;
      const successMessage = `✅ 檔案上傳成功！連結為：${fileUrl}\n現在您可以針對這個檔案提問了。`;
      setMessages(prev => [...prev, { role: 'assistant', content: successMessage }]);
      setInput(prev => `${prev} ${fileUrl}`.trim());
    } catch (error) {
      console.error("Cloudinary upload failed:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ 檔案上傳失敗。' }]);
    } finally {
      setIsLoading(false);
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessageContent = input;
    const newMsgs: Msg[] = [...messages, { role: 'user', content: userMessageContent }];
    setMessages(newMsgs);
    setIsLoading(true);
    setInput('');

    try {
      const requestBody = {
        message: userMessageContent,
        threadId: threadId,
      };
      const chatRes = await axios.post('/api/agent/chat', requestBody);
      const reply = chatRes.data.message || '⚠️ 無回應';
      if (chatRes.data.threadId) {
        setThreadId(chatRes.data.threadId);
      }
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
      <button onClick={() => setOpen(v => !v)} className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-110">
        AI Agent
      </button>
      {open && (
        <div className="bg-white w-80 h-96 border rounded-lg shadow-xl flex flex-col mt-2">
          <div className="flex-1 p-3 overflow-y-auto text-sm space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-lg break-words ${m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                  <div className="bg-gray-200 text-gray-500 px-3 py-2 rounded-lg animate-pulse">
                    正在思考中...
                  </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-2 border-t flex space-x-2 items-center">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-blue-600 disabled:opacity-50" title="上傳檔案" disabled={isLoading}>
              <Paperclip size={18} />
            </button>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !isLoading) { e.preventDefault(); sendMessage(); } }} className="flex-1 border px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="輸入訊息..." disabled={isLoading} />
            <button onClick={sendMessage} disabled={!input.trim() || isLoading} className="bg-blue-500 text-white px-4 py-1 rounded-md disabled:opacity-50 hover:bg-blue-600">
              送出
            </button>
          </div>
        </div>
      )}
    </div>
  );
}