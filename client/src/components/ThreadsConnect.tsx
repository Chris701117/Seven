import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { Instagram } from "lucide-react";

interface ThreadsConnectProps {
  onConnect?: () => void;
}

const threadsApi = {
  // 注意：Threads實際上是通過Instagram API管理的，所以我們也通過相同的方式連接
  connectViaInstagram: async () => {
    try {
      // 檢查Instagram連接
      const igStatus = await apiRequest("GET", "/api/auth/instagram/status");
      
      if (!igStatus.connected) {
        throw new Error('您需要先連接Instagram帳號才能連接Threads。');
      }
      
      // 已有Instagram連接的情況下，啟用Threads
      const response = await apiRequest("POST", "/api/auth/threads", { 
        viaInstagram: true 
      });
      return response;
    } catch (error) {
      console.error('Threads連接失敗:', error);
      throw error;
    }
  },
  
  // 開發模式連接
  connectDevMode: async () => {
    try {
      const accessToken = "DEV_MODE_THREADS_TOKEN_" + Date.now();
      const response = await apiRequest("POST", "/api/auth/threads", { 
        accessToken, 
        devMode: true 
      });
      return response;
    } catch (error) {
      console.error('Threads開發模式連接失敗:', error);
      throw error;
    }
  }
};

const ThreadsConnect = ({ onConnect }: ThreadsConnectProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isInstagramConnected, setIsInstagramConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // 檢查當前連接狀態
  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        // 檢查Threads連接狀態
        const threadsStatus = await apiRequest("GET", "/api/auth/threads/status");
        setIsConnected(threadsStatus.connected || false);
        
        // 檢查Instagram連接狀態，因為Threads需要Instagram
        const igStatus = await apiRequest("GET", "/api/auth/instagram/status");
        setIsInstagramConnected(igStatus.connected || false);
      } catch (error) {
        console.error('無法檢查連接狀態:', error);
      }
    };

    checkConnectionStatus();
  }, []);

  // 處理通過Instagram連接Threads
  const handleConnectViaInstagram = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await threadsApi.connectViaInstagram();
      
      if (response && response.success) {
        setIsConnected(true);
        toast({
          title: "連接成功",
          description: "您的Threads帳號已成功連接。",
          variant: "default",
        });

        if (onConnect) {
          onConnect();
        }
      } else {
        throw new Error(response.message || '連接Threads失敗，請稍後再試。');
      }
    } catch (error) {
      let errorMessage = '連接Threads失敗';
      
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
      const response = await threadsApi.connectDevMode();
      
      if (response && response.success) {
        setIsConnected(true);
        toast({
          title: "開發模式連接成功",
          description: "您已成功連接Threads開發模式。系統將使用樣本資料。",
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
      await apiRequest("POST", "/api/auth/threads/disconnect");
      setIsConnected(false);
      toast({
        title: "已斷開連接",
        description: "您的Threads帳號已成功斷開連接。",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "斷開失敗",
        description: "無法斷開Threads連接，請稍後再試。",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">連接 Threads</CardTitle>
        <CardDescription>
          連接您的Threads帳戶以管理貼文。
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
              您的Threads帳號已成功連接。
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="instagram-auth" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="instagram-auth">通過Instagram連接</TabsTrigger>
            <TabsTrigger value="development">開發模式</TabsTrigger>
          </TabsList>
          
          <TabsContent value="instagram-auth" className="pt-4">
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Threads是Instagram的子產品，需要通過Instagram帳號進行連接。確保您已經：
              </p>
              
              <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1">
                <li>已連接Instagram帳號（在Instagram連接標籤）</li>
                <li>擁有相同帳號的Threads帳戶</li>
              </ul>
              
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-700 mb-2">連接Threads須知</p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>1. Threads使用與Instagram相同的帳號系統</li>
                  <li>2. 您需要先完成Instagram的連接</li>
                  <li>3. 系統將使用您的Instagram授權同時訪問Threads</li>
                </ul>
              </div>
              
              {isConnected ? (
                <Button 
                  onClick={handleDisconnect}
                  variant="outline" 
                  className="w-full mt-4"
                >
                  斷開Threads連接
                </Button>
              ) : (
                <Button 
                  onClick={handleConnectViaInstagram} 
                  disabled={isLoading || !isInstagramConnected}
                  className="w-full bg-gradient-to-r from-gray-700 via-gray-900 to-black hover:from-gray-800 hover:to-gray-950 mt-4"
                >
                  <Instagram className="mr-2 h-4 w-4" />
                  {isLoading ? "連接中..." : isInstagramConnected ? "通過Instagram連接Threads" : "請先連接Instagram"}
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
                  開發模式不會連接真實Threads API，而是使用樣本數據。此選項僅供開發測試使用。
                </AlertDescription>
              </Alert>
              
              <p className="text-sm text-gray-500">
                若您遇到Threads連接問題，可使用「開發模式」繼續測試其他功能。開發模式將使用系統內建的樣本數據，而非真實Threads數據。
              </p>
              
              {isConnected ? (
                <Button 
                  onClick={handleDisconnect}
                  variant="outline" 
                  className="w-full mt-4"
                >
                  斷開Threads連接
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

export default ThreadsConnect;