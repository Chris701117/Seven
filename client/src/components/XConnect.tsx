import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { SiX } from "react-icons/si";

interface XConnectProps {
  onConnect?: () => void;
}

const xApi = {
  // 使用OAuth連接X (Twitter)
  connect: async (code: string, redirectUri: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/x", { 
        code,
        redirectUri
      });
      return response;
    } catch (error) {
      console.error('X API連接失敗:', error);
      throw error;
    }
  },
  
  // 開發模式連接
  connectDevMode: async () => {
    try {
      const accessToken = "DEV_MODE_X_TOKEN_" + Date.now();
      const response = await apiRequest("POST", "/api/auth/x", { 
        accessToken, 
        devMode: true 
      });
      return response;
    } catch (error) {
      console.error('X開發模式連接失敗:', error);
      throw error;
    }
  },
  
  // 從伺服器獲取X登入URL
  getLoginUrl: async () => {
    try {
      const response = await apiRequest("GET", "/api/auth/x/login-url");
      return response.url;
    } catch (error) {
      console.error('無法獲取X登入URL:', error);
      throw error;
    }
  }
};

const XConnect = ({ onConnect }: XConnectProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // 檢查當前X連接狀態並獲取登入URL
  useEffect(() => {
    const initialize = async () => {
      try {
        // 檢查連接狀態
        const statusResponse = await apiRequest("GET", "/api/auth/x/status");
        setIsConnected(statusResponse.connected || false);
        
        // 獲取登入URL (如果需要)
        if (!statusResponse.connected) {
          try {
            const url = await xApi.getLoginUrl();
            setLoginUrl(url);
          } catch (error) {
            console.error('無法獲取X登入URL:', error);
            // 不設置錯誤，因為這不影響開發模式功能
          }
        }
      } catch (error) {
        console.error('無法檢查X連接狀態:', error);
      }
    };

    initialize();
  }, []);

  // 處理OAuth回調
  useEffect(() => {
    // 檢查URL是否包含X回調的code參數
    const urlParams = new URLSearchParams(window.location.search);
    const xCode = urlParams.get('x_code');
    const state = urlParams.get('state');
    
    if (xCode && state === 'x_auth') {
      // 移除URL參數，避免重新整理頁面時重複處理
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // 處理X授權碼
      handleXCallback(xCode);
    }
  }, []);

  // 處理X OAuth回調
  const handleXCallback = async (code: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const redirectUri = window.location.origin + window.location.pathname;
      const response = await xApi.connect(code, redirectUri);
      
      if (response && response.success) {
        setIsConnected(true);
        toast({
          title: "連接成功",
          description: "您的X帳號已成功連接。",
          variant: "default",
        });

        if (onConnect) {
          onConnect();
        }
      } else {
        throw new Error(response.message || '連接X失敗，請稍後再試。');
      }
    } catch (error) {
      let errorMessage = '連接X失敗';
      
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      setError(errorMessage);
      toast({
        title: "連接失敗",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 處理X登入點擊
  const handleXLogin = () => {
    if (loginUrl) {
      // 在新窗口打開X授權頁面
      window.open(loginUrl, '_blank', 'width=800,height=600');
      
      // 提示用戶
      toast({
        title: "X授權",
        description: "已在新窗口打開X授權頁面，請完成授權流程。",
      });
    } else {
      setError('無法獲取X登入URL，請稍後再試。');
      toast({
        title: "連接失敗",
        description: "無法獲取X登入URL，請稍後再試。",
        variant: "destructive",
      });
    }
  };

  // 處理開發模式連接
  const handleDevModeConnect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await xApi.connectDevMode();
      
      if (response && response.success) {
        setIsConnected(true);
        toast({
          title: "開發模式連接成功",
          description: "您已成功連接X開發模式。系統將使用樣本資料。",
          variant: "default",
        });

        if (onConnect) {
          onConnect();
        }
      } else {
        throw new Error(response.message || '開發模式連接失敗');
      }
    } catch (error) {
      let errorMessage = '開發模式連接失敗';
      
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      setError(errorMessage);
      toast({
        title: "開發模式連接失敗",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 處理斷開連接
  const handleDisconnect = async () => {
    try {
      await apiRequest("POST", "/api/auth/x/disconnect");
      setIsConnected(false);
      toast({
        title: "已斷開連接",
        description: "您的X帳號已成功斷開連接。",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "斷開失敗",
        description: "無法斷開X連接，請稍後再試。",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">連接 X</CardTitle>
        <CardDescription>
          連接您的X帳戶(前身為Twitter)以管理貼文。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>錯誤</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {isConnected && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-700">已連接</AlertTitle>
            <AlertDescription className="text-green-600">
              您的X帳號已成功連接。
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="oauth" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="oauth">X登入</TabsTrigger>
            <TabsTrigger value="development">開發模式</TabsTrigger>
          </TabsList>
          
          <TabsContent value="oauth" className="pt-4">
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                連接X需要您允許我們的應用程序存取您的X帳號。點擊下方按鈕將引導您完成X的授權流程。
              </p>
              
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-700 mb-2">X連接須知</p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>1. 授權過程將在新窗口中打開</li>
                  <li>2. 您需要授予我們發布推文的權限</li>
                  <li>3. 授權後，請返回此頁面完成連接</li>
                </ul>
              </div>
              
              {isConnected ? (
                <Button 
                  onClick={handleDisconnect}
                  variant="outline" 
                  className="w-full mt-4"
                >
                  斷開X連接
                </Button>
              ) : (
                <Button 
                  onClick={handleXLogin} 
                  disabled={isLoading || !loginUrl}
                  className="w-full bg-black hover:bg-gray-900 mt-4"
                >
                  <SiX className="mr-2 h-4 w-4" />
                  {isLoading ? "連接中..." : "連接X"}
                </Button>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="development" className="pt-4">
            <div className="space-y-4">
              <Alert 
                variant="default"
                className="mb-4 bg-amber-50 border-amber-200"
              >
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-amber-700">開發模式說明</AlertTitle>
                <AlertDescription className="text-amber-600">
                  開發模式不會連接真實X API，而是使用樣本數據。此選項僅供開發測試使用。
                </AlertDescription>
              </Alert>
              
              <p className="text-sm text-gray-500">
                若您遇到X連接問題，可使用「開發模式」繼續測試其他功能。開發模式將使用系統內建的樣本數據，而非真實X數據。
              </p>
              
              {isConnected ? (
                <Button 
                  onClick={handleDisconnect}
                  variant="outline" 
                  className="w-full mt-4"
                >
                  斷開X連接
                </Button>
              ) : (
                <Button 
                  onClick={handleDevModeConnect} 
                  disabled={isLoading}
                  className="w-full bg-gray-600 hover:bg-gray-700 mt-4"
                >
                  <Database className="mr-2 h-4 w-4" />
                  {isLoading ? "連接中..." : "使用開發模式"}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default XConnect;