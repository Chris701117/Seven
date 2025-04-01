import { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected';

interface Notification {
  type: 'reminder' | 'completion' | 'publishing';
  post: any;
  message: string;
  timestamp: string;
}

export const useWebSocket = (userId: number | null) => {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Function to connect to WebSocket
  const connect = useCallback(() => {
    if (!userId || wsRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      // Get the current hostname and protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      
      // Create WebSocket connection
      const ws = new WebSocket(`${protocol}//${host}/ws`);
      wsRef.current = ws;
      setStatus('connecting');
      
      ws.onopen = () => {
        console.log('WebSocket 已連接');
        setStatus('connected');
        
        // Send authentication message
        ws.send(JSON.stringify({
          type: 'auth',
          userId
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'notification' && data.data) {
            const notification = data.data as Notification;
            
            // Add to notifications state
            setNotifications(prev => [notification, ...prev]);
            
            // Translate notification type to Chinese
            let typeInChinese = '通知';
            if (notification.type === 'reminder') {
              typeInChinese = '提醒';
            } else if (notification.type === 'completion') {
              typeInChinese = '完成';
            } else if (notification.type === 'publishing') {
              typeInChinese = '發佈';
            }
            
            // Show toast notification
            toast({
              title: typeInChinese,
              description: notification.message,
              duration: 10000 // 10 seconds
            });
          }
        } catch (error) {
          console.error('解析 WebSocket 訊息失敗:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket 錯誤:', error);
        setStatus('disconnected');
      };
      
      ws.onclose = () => {
        console.log('WebSocket 已斷線');
        setStatus('disconnected');
        wsRef.current = null;
        
        // Attempt to reconnect after delay
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000); // Reconnect after 5 seconds
      };
    } catch (error) {
      console.error('連接 WebSocket 失敗:', error);
      setStatus('disconnected');
    }
  }, [userId]);
  
  // Connect to WebSocket on component mount or userId change
  useEffect(() => {
    if (userId) {
      connect();
    }
    
    return () => {
      // Cleanup on unmount
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [userId, connect]);
  
  // Function to manually send a message
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);
  
  return {
    status,
    notifications,
    sendMessage,
    clearNotifications: () => setNotifications([])
  };
};