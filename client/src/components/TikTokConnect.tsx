import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, Info, Database, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { SiTiktok } from "react-icons/si";

interface TikTokConnectProps {
  onConnect?: () => void;
}

// 創建一個專門處理TikTok相關API的對象
const tiktokApi = {
  // 使用OAuth連接TikTok
  connect: async (code: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/tiktok", { code });
      return response;
    } catch (error) {
      console.error('TikTok API連接失敗:', error);
      throw error;
    }
  },
  
  // 開發模式連接
  connectDevMode: async () => {
    try {
      const accessToken = "DEV_MODE_TIKTOK_TOKEN_" + Date.now();
      const response = await apiRequest("POST", "/api/auth/tiktok", { 
        accessToken, 
        devMode: true 
      });
      return response;
    } catch (error) {
      console.error('TikTok開發模式連接失敗:', error);
      throw error;
    }
  },
  
  // 從伺服器獲取TikTok登入URL
  getLoginUrl: async () => {
    try {
      const response = await apiRequest("GET", "/api/auth/tiktok/login-url");
      return response.url;
    } catch (error) {
      console.error('無法獲取TikTok登入URL:', error);
      throw error;
    }
  }
};

const TikTokConnect = ({ onConnect }: TikTokConnectProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // 檢查當前TikTok連接狀態並獲取登入URL
  useEffect(() => {
    const initialize = async () => {
      try {
        // 檢查連接狀態
        const statusResponse = await apiRequest("GET", "/api/auth/tiktok/status");
        setIsConnected(statusResponse.connected || false);
        
        // 獲取登入URL (如果需要)
        if (!statusResponse.connected) {
          try {
            const url = await tiktokApi.getLoginUrl();
            setLoginUrl(url);
          } catch (error) {
            console.error('無法獲取TikTok登入URL:', error);
            // 不設置錯誤，因為這不影響開發模式功能
          }
        }
      } catch (error) {
        console.error('無法檢查TikTok連接狀態:', error);
      }
    };

    initialize();
  }, []);

  // 處理OAuth回調
  useEffect(() => {
    // 檢查URL是否包含TikTok回調的code參數
    const urlParams = new URLSearchParams(window.location.search);
    const tiktokCode = urlParams.get('tiktok_code');
    
    if (tiktokCode) {
      // 移除URL參數，避免重新整理頁面時重複處理
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // 處理TikTok授權碼
      handleTikTokCallback(tiktokCode);
    }
  }, []);

  // 處理TikTok OAuth回調
  const handleTikTokCallback = async (code: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await tiktokApi.connect(code);
      
      if (response && response.success) {
        setIsConnected(true);
        toast({
          title: "連接成功",
          description: "您的TikTok帳號已成功連接。",
          variant: "default",
        });

        if (onConnect) {
          onConnect();
        }
      } else {
        throw new Error(response.message || '連接TikTok失敗，請稍後再試。');
      }
    } catch (error) {
      let errorMessage = '連接TikTok失敗';
      
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

  // 處理TikTok登入點擊
  const handleTikTokLogin = () => {
    if (loginUrl) {
      // 在新窗口打開TikTok授權頁面
      window.open(loginUrl, '_blank', 'width=800,height=600');
      
      // 提示用戶
      toast({
        title: "TikTok授權",
        description: "已在新窗口打開TikTok授權頁面，請完成授權流程。",
      });
    } else {
      setError('無法獲取TikTok登入URL，請稍後再試。');
      toast({
        title: "連接失敗",
        description: "無法獲取TikTok登入URL，請稍後再試。",
        variant: "destructive",
      });
    }
  };

  // 處理開發模式連接
  const handleDevModeConnect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await tiktokApi.connectDevMode();
      
      if (response && response.success) {
        setIsConnected(true);
        toast({
          title: "開發模式連接成功",
          description: "您已成功連接TikTok開發模式。系統將使用樣本資料。",
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
      await apiRequest("POST", "/api/auth/tiktok/disconnect");
      setIsConnected(false);
      toast({
        title: "已斷開連接",
        description: "您的TikTok帳號已成功斷開連接。",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "斷開失敗",
        description: "無法斷開TikTok連接，請稍後再試。",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">連接 TikTok</CardTitle>
        <CardDescription>
          連接您的TikTok帳戶以管理內容。
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
              您的TikTok帳號已成功連接。
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="oauth" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="oauth">TikTok登入</TabsTrigger>
            <TabsTrigger value="development">開發模式</TabsTrigger>
          </TabsList>
          
          <TabsContent value="oauth" className="pt-4">
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                連接TikTok需要您允許我們的應用程序存取您的TikTok帳號。點擊下方按鈕將引導您完成TikTok的授權流程。
              </p>
              
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-700 mb-2">TikTok連接須知</p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>1. 您需要擁有TikTok商業帳號</li>
                  <li>2. 授權過程將在新窗口中打開</li>
                  <li>3. 授權後，請返回此頁面</li>
                </ul>
              </div>
              
              {isConnected ? (
                <Button 
                  onClick={handleDisconnect}
                  variant="outline" 
                  className="w-full mt-4"
                >
                  斷開TikTok連接
                </Button>
              ) : (
                <Button 
                  onClick={handleTikTokLogin} 
                  disabled={isLoading || !loginUrl}
                  className="w-full bg-black hover:bg-gray-900 mt-4"
                >
                  <SiTiktok className="mr-2 h-4 w-4" />
                  {isLoading ? "連接中..." : "連接TikTok"}
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
                  開發模式不會連接真實TikTok API，而是使用樣本數據。此選項僅供開發測試使用。
                </AlertDescription>
              </Alert>
              
              <p className="text-sm text-gray-500">
                若您遇到TikTok連接問題，可使用「開發模式」繼續測試其他功能。開發模式將使用系統內建的樣本數據，而非真實TikTok數據。
              </p>
              
              {isConnected ? (
                <Button 
                  onClick={handleDisconnect}
                  variant="outline" 
                  className="w-full mt-4"
                >
                  斷開TikTok連接
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

export default TikTokConnect;