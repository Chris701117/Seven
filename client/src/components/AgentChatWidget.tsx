import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function AgentChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<{ role:string; content:string }[]>([]);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if(open && ref.current) ref.current.focus();
  },[open]);

  const send = async () => {
    if(!input.trim()) return;
    const history = [...msgs, { role:'user', content:input }];
    setMsgs(history);
    setInput('');

    // 呼叫新的 respond API
    const { data } = await axios.post('/api/agent/respond', { messages: history });
    setMsgs([...history, { role:'assistant', content: data.messages[0] }]);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button onClick={()=>setOpen(o=>!o)} className="bg-blue-600 text-white px-4 py-2 rounded-full shadow">
        AI Agent
      </button>
      {open && (
      <div className="bg-white w-80 h-96 border rounded shadow-lg flex flex-col mt-2">
        <div className="flex-1 p-3 overflow-y-auto text-sm">
          {msgs.map((m,i)=>
            <div key={i} className={m.role==='user'?'text-right':'text-left text-blue-600'}>
              {m.content}
            </div>
          )}
        </div>
        <div className="p-2 border-t flex">
          <input
            ref={ref}
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&send()}
            className="flex-1 border px-2 py-1 rounded"
            placeholder="輸入並按 Enter..."
          />
          <button onClick={send} className="ml-2 bg-blue-500 text-white px-3 py-1 rounded">
            送出
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
