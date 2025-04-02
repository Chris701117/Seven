import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, Facebook, RefreshCcw, Info, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { facebookApi } from "../lib/facebookApi";

interface FacebookConnectProps {
  onConnect?: () => void;
}

const FacebookConnect = ({ onConnect }: FacebookConnectProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [sdkStatus, setSdkStatus] = useState<'未初始化' | '初始化中' | '已初始化' | '初始化失敗'>('未初始化');
  const { toast } = useToast();

  // 檢查 App ID 並初始化 SDK
  useEffect(() => {
    const initFacebook = async () => {
      try {
        setSdkStatus('初始化中');
        // 獲取 App ID
        const id = await facebookApi.getAppId();
        setAppId(id);
        
        // 初始化 SDK
        await facebookApi.initSDK();
        setSdkStatus('已初始化');
      } catch (error) {
        console.error('Facebook SDK 初始化失敗:', error);
        setSdkStatus('初始化失敗');
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
      let errorMessage = '連接 Facebook 失敗，請確保您已允許必要的權限。';
      
      // 提供更詳細的錯誤訊息
      if (error instanceof Error) {
        if (error.message.includes('domain')) {
          errorMessage = 'Facebook 應用程序設置錯誤：JSSDK 網域未正確配置。請聯繫管理員設置允許的網域。';
        } else {
          errorMessage = `連接失敗：${error.message}`;
        }
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

  // 重新初始化 Facebook SDK
  const handleReinitializeSDK = async () => {
    try {
      setSdkStatus('初始化中');
      setError(null);
      await facebookApi.initSDK();
      setSdkStatus('已初始化');
      toast({
        title: "重新初始化成功",
        description: "Facebook SDK 已成功重新初始化。",
        variant: "default",
      });
    } catch (error) {
      console.error('Facebook SDK 重新初始化失敗:', error);
      setSdkStatus('初始化失敗');
      setError(`無法初始化 Facebook SDK: ${error instanceof Error ? error.message : '未知錯誤'}`);
      toast({
        title: "重新初始化失敗",
        description: "Facebook SDK 重新初始化失敗，請檢查控制台獲取更多信息。",
        variant: "destructive",
      });
    }
  };
  
  // 用於測試的 App ID 檢查和網域檢查功能
  const checkEnvironment = () => {
    // 顯示當前網域信息
    const currentDomain = window.location.origin;
    const fullUrl = window.location.href;
    
    // 記錄到控制台同時更新UI
    console.log('環境檢查 - 當前網域:', currentDomain);
    console.log('環境檢查 - 當前完整URL:', fullUrl);
    console.log('環境檢查 - App ID:', appId);
    
    toast({
      title: "環境信息",
      description: `網域: ${currentDomain}，App ID: ${appId || '未設置'}`,
      variant: "default",
    });
  };

  // 使用開發模式臨時連接，繞過Facebook網域限制
  const handleDevModeConnect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 模擬成功連接，使用臨時令牌
      const accessToken = "DEV_MODE_TOKEN_" + Date.now();
      const fbUserId = "DEV_MODE_USER_" + Date.now();
      
      // 儲存令牌到我們的系統
      const response = await facebookApi.saveAccessToken(accessToken, fbUserId);
      console.log('開發模式連接響應:', response);
      
      // response 現在是已解析的 JSON 對象
      if (response && response.devMode) {
        setIsConnected(true);
        toast({
          title: "開發模式連接成功",
          description: "您已成功連接開發模式。系統將使用樣本資料。",
          variant: "default",
        });
  
        // 通知父組件連接成功
        if (onConnect) {
          onConnect();
        }
      } else {
        throw new Error('伺服器未返回有效的開發模式回應');
      }
    } catch (error) {
      console.error('開發模式連接失敗:', error);
      let errorMessage = '開發模式連接失敗';
      
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage += `: ${JSON.stringify(error)}`;
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
        
        {/* SDK 和 App ID 狀態顯示 */}
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-xs font-mono">
          <p className="flex justify-between">
            <span>SDK 狀態:</span> 
            <span className={
              sdkStatus === '已初始化' ? 'text-green-600 font-bold' : 
              sdkStatus === '初始化中' ? 'text-blue-600 font-bold' : 
              'text-red-600 font-bold'
            }>
              {sdkStatus}
            </span>
          </p>
          <p className="flex justify-between mt-1">
            <span>App ID:</span> 
            <span className={appId ? 'text-black' : 'text-red-600'}>
              {appId || '未設置'}
            </span>
          </p>
          <div className="mt-2 flex justify-end space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkEnvironment}
              className="text-xs h-7 px-2"
            >
              <Info className="mr-1 h-3 w-3" />
              檢查環境
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReinitializeSDK}
              className="text-xs h-7 px-2"
            >
              <RefreshCcw className="mr-1 h-3 w-3" />
              重新初始化
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="facebook" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="facebook">Facebook 連接</TabsTrigger>
            <TabsTrigger value="development">開發模式</TabsTrigger>
          </TabsList>
          
          <TabsContent value="facebook" className="pt-4">
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
              
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-700 mb-2">Facebook 應用程序設置須知</p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>1. 在 Facebook 開發者平台中，確保添加以下網域：</li>
                  <li className="pl-4">• 點擊「檢查環境」並複製顯示的完整網域</li>
                  <li className="pl-4">• 在「網域管理員」處添加該網域為「完全相符」</li>
                  <li className="pl-4">• 添加 *.replit.dev 和 *.picard.replit.dev 為「前置詞:相符」</li>
                  <li>2. 確保「OAuth 重定向 URI」中也包含您的 Replit 網域</li>
                  <li>3. 設置後，請點擊「重新初始化」按鈕</li>
                </ul>
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <a 
                    href="/facebook-setup" 
                    className="text-xs font-medium text-blue-700 hover:text-blue-800 flex items-center"
                  >
                    查看詳細的 Facebook 設置指南 →
                  </a>
                </div>
              </div>
              
              <Button 
                onClick={handleConnectFacebook} 
                disabled={isLoading || isConnected || sdkStatus !== '已初始化'}
                className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
              >
                <Facebook className="mr-2 h-4 w-4" />
                {isLoading ? "連接中..." : isConnected ? "已連接" : "連接 Facebook"}
              </Button>
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
                  開發模式不會連接真實 Facebook API，而是使用樣本數據。此選項僅供開發測試使用。
                </AlertDescription>
              </Alert>
              
              <p className="text-sm text-gray-500">
                若您遇到 Facebook 網域設置問題，可使用「開發模式」繼續測試其他功能。開發模式將使用系統內建的樣本數據，而非真實 Facebook 數據。
              </p>
              
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm font-medium text-gray-700 mb-2">開發模式功能說明</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• 可以測試系統的所有功能，包括貼文管理和排程功能</li>
                  <li>• 所有分析數據均使用預設的樣本數據</li>
                  <li>• 不會發佈任何內容到真實的 Facebook 頁面</li>
                  <li>• 隨時可切換回真實連接模式（重新登入即可）</li>
                </ul>
              </div>
              
              <Button 
                onClick={handleDevModeConnect} 
                disabled={isLoading || isConnected}
                className="w-full bg-gray-600 hover:bg-gray-700 mt-4"
              >
                <Database className="mr-2 h-4 w-4" />
                {isLoading ? "連接中..." : isConnected ? "已連接" : "使用開發模式"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FacebookConnect;