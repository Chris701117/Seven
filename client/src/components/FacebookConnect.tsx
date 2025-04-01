import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Facebook } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { facebookApi } from "../lib/facebookApi";

interface FacebookConnectProps {
  onConnect?: () => void;
}

const FacebookConnect = ({ onConnect }: FacebookConnectProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initFacebook = async () => {
      try {
        await facebookApi.initSDK();
      } catch (error) {
        console.error('Facebook SDK 初始化失敗:', error);
        setError('無法初始化 Facebook API，請稍後再試。');
      }
    };

    initFacebook();
  }, []);

  const handleConnectFacebook = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 嘗試使用 Facebook 登入
      const response = await facebookApi.login();
      
      // 從登入回應中獲取訪問令牌
      const authResponse = response.authResponse as { accessToken: string; userID: string };
      const accessToken = authResponse.accessToken;
      const fbUserId = authResponse.userID;
      
      // 儲存令牌到我們的系統
      await facebookApi.saveAccessToken(accessToken, fbUserId);
      
      setIsConnected(true);
      toast({
        title: "連接成功",
        description: "您的 Facebook 帳號已成功連接。",
        variant: "default",
      });

      // 通知父組件連接成功
      if (onConnect) {
        onConnect();
      }
    } catch (error) {
      console.error('Facebook 連接失敗:', error);
      setError('連接 Facebook 失敗，請確保您已允許必要的權限。');
      toast({
        title: "連接失敗",
        description: "Facebook 連接失敗，請稍後再試。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">連接 Facebook</CardTitle>
        <CardDescription>
          連接您的 Facebook 帳戶以管理粉絲專頁貼文。
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
              您的 Facebook 帳號已成功連接。
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            點擊下方按鈕以連接您的 Facebook 帳戶。此操作需要您授權我們的應用程式存取您的 Facebook 頁面。
          </p>
          <p className="text-sm text-gray-500">
            我們需要以下權限：
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1">
            <li>存取您管理的粉絲專頁列表</li>
            <li>查看頁面互動數據</li>
            <li>管理頁面貼文</li>
            <li>查看頁面內容</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleConnectFacebook} 
          disabled={isLoading || isConnected}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Facebook className="mr-2 h-4 w-4" />
          {isLoading ? "連接中..." : isConnected ? "已連接" : "連接 Facebook"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FacebookConnect;