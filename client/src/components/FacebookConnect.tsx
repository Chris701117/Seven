import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, Facebook, RefreshCcw, Info, Database, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { facebookApi } from "../lib/facebookApi";
import { queryClient, apiRequest } from "@/lib/queryClient";

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
  
  // 修復 onConnect 可能為 undefined 的問題
  const safeOnConnect = () => {
    if (onConnect) {
      onConnect();
    }
  };

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
      
      // 檢查是否有頁面訪問令牌
      console.log('Facebook 登入響應:', response);
      if (response.pageTokens && response.pageTokens.length > 0) {
        console.log('獲取到頁面訪問令牌:', response.pageTokens);
        
        // 提取頁面訪問令牌，並將其存儲以供後續使用
        const pageTokens = response.pageTokens;
        
        // 告知用戶獲取了頁面訪問令牌
        toast({
          title: "成功",
          description: `已獲取 ${pageTokens.length} 個頁面的訪問令牌，您現在可以發布到這些頁面。`,
          variant: "default",
        });

        // 將頁面令牌保存到本地存儲，方便後續使用
        localStorage.setItem('fb_page_tokens', JSON.stringify(pageTokens));
      } else {
        console.warn('未獲取到頁面訪問令牌，可能無法進行發布操作');
        toast({
          title: "警告",
          description: "未獲取到頁面訪問令牌，可能無法進行發布操作。請確保您擁有管理粉絲專頁的權限，並確保勾選了'pages_read_engagement'和'pages_manage_posts'權限。",
          variant: "destructive",
        });
      }
      
      // 儲存令牌到我們的系統
      await facebookApi.saveAccessToken(accessToken, fbUserId);
      
      setIsConnected(true);
      toast({
        title: "連接成功",
        description: "您的 Facebook 帳號已成功連接。",
        variant: "default",
      });

      // 通知父組件連接成功
      safeOnConnect();
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
      // 臨時解決方案：直接在前端模擬成功，完全跳過後端請求
      console.log('使用前端模擬開發模式，跳過後端請求');
      
      // 等待一秒模擬連接過程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 直接設置為已連接狀態
      setIsConnected(true);
      
      // 顯示成功訊息
      toast({
        title: "開發模式連接成功",
        description: "您已成功連接開發模式。系統將使用樣本資料。",
        variant: "default",
      });
      
      // 將開發模式狀態保存到本地存儲
      localStorage.setItem('fb_dev_mode', 'true');
      localStorage.setItem('fb_dev_mode_timestamp', new Date().toISOString());
      
      // 通知父元件連接成功
      safeOnConnect();
      
      setIsLoading(false);
      return;
    
      // 以下代碼暫時跳過，直接返回
      // 記錄嘗試連接的時間
      console.log('開始嘗試開發模式連接，時間:', new Date().toISOString());
      
      // 模擬成功連接，使用臨時令牌
      const accessToken = "DEV_MODE_TOKEN_" + Date.now();
      const fbUserId = "DEV_MODE_USER_" + Date.now();
      
      // 顯示調試信息
      console.log('使用開發模式令牌:', accessToken.substring(0, 15) + '...');
      console.log('使用開發模式用戶ID:', fbUserId);
      
      // 嘗試向 Facebook 授權端點發送請求前的測試
      try {
        // 測試服務器端點是否可達
        const testUrl = `${window.location.origin}/api/test`;
        console.log('測試API連接:', testUrl);
        
        const testResponse = await fetch(testUrl, {
          headers: {
            'Accept': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!testResponse.ok) {
          console.error('API測試請求失敗:', testResponse.status, testResponse.statusText);
          throw new Error(`API測試請求失敗: ${testResponse.status}`);
        }
        
        const contentType = testResponse.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.error('API測試響應不是JSON:', contentType);
          const textContent = await testResponse.text();
          console.error('API測試響應內容:', textContent.substring(0, 200));
          throw new Error('API測試響應不是JSON格式');
        }
        
        const testData = await testResponse.json();
        console.log('API 測試響應:', testData);
      } catch (testError) {
        console.error('API 測試失敗:', testError);
      }
      
      // 儲存令牌到我們的系統
      console.log('正在向伺服器發送開發模式授權請求...');
      
      // 使用明確定義的請求參數
      const requestData = {
        accessToken,
        fbUserId,
        devMode: true  // 明確指示這是開發模式
      };
      
      console.log('請求數據:', JSON.stringify(requestData).substring(0, 50));
      
      // 使用API幫助函數來處理請求
      // 使用完整的 URL 路徑，防止路徑解析問題
      const currentUrl = window.location.origin;
      console.log('當前URL基礎路徑:', currentUrl);
      
      const fullUrl = `${currentUrl}/api/auth/facebook`;
      console.log('完整請求URL:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json' // 明確指定接受 JSON 格式回應
        },
        body: JSON.stringify(requestData),
        credentials: 'include'
      });
      
      console.log('伺服器響應狀態:', response.status);
      console.log('伺服器響應類型:', response.headers.get('content-type'));
      
      // 檢查響應是否成功
      if (!response.ok) {
        const errorText = await response.text();
        console.error('伺服器錯誤響應:', errorText);
        throw new Error(`伺服器錯誤: ${response.status} ${response.statusText}`);
      }
      
      // 解析 JSON 響應
      const responseData = await response.json();
      console.log('開發模式連接響應:', responseData);
      
      // 檢查開發模式標誌
      if (responseData && responseData.devMode) {
        setIsConnected(true);
        toast({
          title: "開發模式連接成功",
          description: "您已成功連接開發模式。系統將使用樣本資料。",
          variant: "default",
        });
  
        // 通知父組件連接成功
        safeOnConnect();
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
              
              <div className="flex flex-col space-y-2 mt-4">
                <Button 
                  onClick={handleDevModeConnect} 
                  disabled={isLoading || isConnected}
                  className="w-full bg-green-600 hover:bg-green-700 font-bold"
                >
                  <Database className="mr-2 h-4 w-4" />
                  {isLoading ? "連接中..." : isConnected ? "已連接" : "直接啟用開發模式"}
                </Button>
                
                {isConnected && (
                  <Button 
                    variant="outline"
                    onClick={async () => {
                      try {
                        toast({
                          title: "創建測試頁面",
                          description: "正在創建測試粉絲專頁..."
                        });
                        
                        // 使用前端apiRequest工具以提高一致性
                        const body = {
                          pageName: '測試粉絲專頁',
                          pageDescription: '這是一個由系統自動生成的測試用粉絲專頁'
                        };
                        const response = await apiRequest('POST', '/api/facebook/create-test-page', body);
                        
                        toast({
                          title: "測試頁面已創建",
                          description: "測試頁面創建成功！",
                          variant: "default",
                        });
                        
                        // 刷新頁面列表
                        queryClient.invalidateQueries({ queryKey: ['/api/pages'] });
                      } catch (error) {
                        console.error("創建測試頁面失敗:", error);
                        toast({
                          title: "創建失敗",
                          description: error instanceof Error 
                            ? error.message
                            : "創建測試頁面時發生錯誤",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="w-full"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    創建測試粉絲專頁
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FacebookConnect;