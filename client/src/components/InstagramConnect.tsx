import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, Info, Database, RefreshCcw } from "lucide-react";
import { Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../lib/queryClient";

interface InstagramConnectProps {
  onConnect?: () => void;
}

// 創建一個專門處理Instagram相關API的對象
const instagramApi = {
  // 通過Facebook Graph API連接Instagram
  connectViaFacebook: async (accessToken: string) => {
    try {
      // 在實際實現中，這裡應該使用FB access token獲取Instagram的連接信息
      const response = await apiRequest("POST", "/api/auth/instagram", { accessToken });
      return response;
    } catch (error) {
      console.error('Instagram API連接失敗:', error);
      throw error;
    }
  },
  
  // 開發模式連接
  connectDevMode: async () => {
    try {
      const accessToken = "DEV_MODE_IG_TOKEN_" + Date.now();
      const response = await apiRequest("POST", "/api/auth/instagram", { 
        accessToken, 
        devMode: true 
      });
      return response;
    } catch (error) {
      console.error('Instagram開發模式連接失敗:', error);
      throw error;
    }
  }
};

const InstagramConnect = ({ onConnect }: InstagramConnectProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // 檢查當前Instagram連接狀態
  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        const response = await apiRequest("GET", "/api/auth/instagram/status");
        setIsConnected(response.connected || false);
      } catch (error) {
        console.error('無法檢查Instagram連接狀態:', error);
      }
    };

    checkConnectionStatus();
  }, []);

  // 處理通過Facebook連接Instagram
  const handleConnectViaFacebook = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 首先檢查Facebook連接
      const fbStatus = await apiRequest("GET", "/api/auth/me");
      
      if (!fbStatus.accessToken) {
        throw new Error('您需要先連接Facebook帳號才能連接Instagram。請先在Facebook標籤中完成連接。');
      }
      
      // 使用Facebook token連接Instagram
      const response = await instagramApi.connectViaFacebook(fbStatus.accessToken);
      
      if (response && response.success) {
        setIsConnected(true);
        toast({
          title: "連接成功",
          description: "您的Instagram帳號已成功連接。",
          variant: "default",
        });

        if (onConnect) {
          onConnect();
        }
      } else {
        throw new Error(response.message || '連接Instagram失敗，請稍後再試。');
      }
    } catch (error) {
      let errorMessage = '連接Instagram失敗';
      
      if (error instanceof Error) {
        errorMessage = error.message;
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

  // 處理開發模式連接
  const handleDevModeConnect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await instagramApi.connectDevMode();
      
      if (response && response.success) {
        setIsConnected(true);
        toast({
          title: "開發模式連接成功",
          description: "您已成功連接Instagram開發模式。系統將使用樣本資料。",
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
      await apiRequest("POST", "/api/auth/instagram/disconnect");
      setIsConnected(false);
      toast({
        title: "已斷開連接",
        description: "您的Instagram帳號已成功斷開連接。",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "斷開失敗",
        description: "無法斷開Instagram連接，請稍後再試。",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">連接 Instagram</CardTitle>
        <CardDescription>
          連接您的Instagram帳戶以管理貼文。
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
              您的Instagram帳號已成功連接。
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="facebook-auth" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="facebook-auth">通過Facebook連接</TabsTrigger>
            <TabsTrigger value="development">開發模式</TabsTrigger>
          </TabsList>
          
          <TabsContent value="facebook-auth" className="pt-4">
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Instagram Professional帳號需要通過Facebook進行驗證和連接。確保您已經：
              </p>
              
              <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1">
                <li>已經在「連接」標籤中連接了Facebook帳號</li>
                <li>擁有Instagram Professional或Creator帳號</li>
                <li>已將您的Instagram帳號與Facebook粉絲專頁連結</li>
              </ul>
              
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-700 mb-2">連接Instagram須知</p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>1. 此連接使用Facebook Graph API獲取Instagram Professional帳號</li>
                  <li>2. 需要Instagram專業帳號（Business或Creator）</li>
                  <li>3. 您的Instagram帳號必須已連結到Facebook粉絲專頁</li>
                </ul>
              </div>
              
              {isConnected ? (
                <Button 
                  onClick={handleDisconnect}
                  variant="outline" 
                  className="w-full mt-4"
                >
                  斷開Instagram連接
                </Button>
              ) : (
                <Button 
                  onClick={handleConnectViaFacebook} 
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 mt-4"
                >
                  <Instagram className="mr-2 h-4 w-4" />
                  {isLoading ? "連接中..." : "通過Facebook連接Instagram"}
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
                  開發模式不會連接真實Instagram API，而是使用樣本數據。此選項僅供開發測試使用。
                </AlertDescription>
              </Alert>
              
              <p className="text-sm text-gray-500">
                若您遇到Instagram連接問題，可使用「開發模式」繼續測試其他功能。開發模式將使用系統內建的樣本數據，而非真實Instagram數據。
              </p>
              
              {isConnected ? (
                <Button 
                  onClick={handleDisconnect}
                  variant="outline" 
                  className="w-full mt-4"
                >
                  斷開Instagram連接
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

export default InstagramConnect;