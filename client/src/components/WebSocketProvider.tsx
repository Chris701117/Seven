import { createContext, useContext, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

// Create context for WebSocket
interface WebSocketContextType {
  status: 'connecting' | 'connected' | 'disconnected';
  notifications: any[];
  sendMessage: (message: any) => boolean;
  clearNotifications: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  userId: number | null;
  children: ReactNode;
}

export function WebSocketProvider({ userId, children }: WebSocketProviderProps) {
  // 使用useWebSocket鉤子獲取WebSocket功能
  const webSocket = useWebSocket(userId);

  // 確保創建了有效的上下文值
  return (
    <WebSocketContext.Provider value={webSocket}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}