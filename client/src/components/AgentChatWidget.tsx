// client/src/components/AgentChatWidget.tsx (已加入自動聚焦)
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function AgentChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自動捲動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // 開啟或送出訊息後，自動聚焦輸入框
  useEffect(() => {
    if (open && !isLoading) {
      inputRef.current?.focus();
    }
  }, [open, isLoading]); // ✅ 當 open 或 isLoading 狀態改變時觸發

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
      setIsLoading(false); // ✅ 在 finally 中設定 isLoading，確保聚焦邏輯正確
    }
  };

  return (
    // ... (此處的 JSX 結構完全不變)
  );
}