import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Copy, ExternalLink, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FacebookSetupGuide = () => {
  const { toast } = useToast();
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [appId, setAppId] = useState<string | null>(null);
  const [checkResults, setCheckResults] = useState<{
    hasAppId: boolean;
    hasAppSecret: boolean;
    domain: string;
  } | null>(null);

  // 獲取當前域名和 App ID
  useEffect(() => {
    // 獲取當前域名
    setCurrentDomain(window.location.origin);
    
    // 獲取 App ID
    const fetchAppId = async () => {
      try {
        const response = await fetch('/api/config/facebook');
        const data = await response.json();
        setAppId(data.appId);
        setCheckResults({
          hasAppId: !!data.appId,
          hasAppSecret: data.hasAppSecret,
          domain: data.domain || window.location.host
        });
      } catch (error) {
        console.error('無法獲取 Facebook 配置:', error);
      }
    };
    
    fetchAppId();
  }, []);

  // 複製到剪貼板
  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "已複製",
        description: message,
      });
    });
  };

  // 重新獲取配置信息
  const refreshConfig = async () => {
    try {
      const response = await fetch('/api/config/facebook');
      const data = await response.json();
      setAppId(data.appId);
      setCheckResults({
        hasAppId: !!data.appId,
        hasAppSecret: data.hasAppSecret,
        domain: data.domain || window.location.host
      });
      
      toast({
        title: "已刷新",
        description: "已重新獲取 Facebook 配置信息",
      });
    } catch (error) {
      toast({
        title: "刷新失敗",
        description: "無法獲取 Facebook 配置信息",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Facebook 應用程序設置指南</h1>
        <p className="text-gray-500">
          按照這些步驟正確配置您的 Facebook 應用程序，以連接到我們的系統。
        </p>
      </div>
      
      {/* 環境檢查 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            環境檢查
            <Button 
              variant="outline" 
              size="icon" 
              className="ml-2 h-6 w-6" 
              onClick={refreshConfig}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </Button>
          </CardTitle>
          <CardDescription>
            檢查您的配置和環境變量
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 顯示當前環境 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-md space-y-2">
              <p className="text-sm font-medium">當前網域:</p>
              <div className="flex items-center bg-white p-2 rounded border">
                <code className="text-xs flex-1 text-blue-600">{currentDomain}</code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 ml-2"
                  onClick={() => copyToClipboard(currentDomain, "網域已複製到剪貼板")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-md space-y-2">
              <p className="text-sm font-medium">Facebook App ID:</p>
              <div className="flex items-center bg-white p-2 rounded border">
                <code className="text-xs flex-1">{appId || '未設置'}</code>
                {appId && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 ml-2"
                    onClick={() => copyToClipboard(appId, "App ID 已複製到剪貼板")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* 檢查結果 */}
          {checkResults && (
            <div className="mt-4 border rounded-md p-4">
              <h3 className="text-sm font-medium mb-2">配置檢查結果:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  {checkResults.hasAppId ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  )}
                  <span>
                    Facebook App ID: {checkResults.hasAppId ? '已設置' : '未設置'}
                  </span>
                </li>
                <li className="flex items-center">
                  {checkResults.hasAppSecret ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  )}
                  <span>
                    Facebook App Secret: {checkResults.hasAppSecret ? '已設置' : '未設置'}
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="mt-1">
                    <AlertCircle className="h-4 w-4 text-blue-500 mr-2" />
                  </div>
                  <span>
                    伺服器識別的網域: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{checkResults.domain}</code>
                  </span>
                </li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 設置指南 */}
      <Tabs defaultValue="create">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create">1. 創建應用</TabsTrigger>
          <TabsTrigger value="config">2. 配置設置</TabsTrigger>
          <TabsTrigger value="permissions">3. 添加權限</TabsTrigger>
          <TabsTrigger value="connect">4. 連接應用</TabsTrigger>
        </TabsList>
        
        {/* 第一步：創建應用 */}
        <TabsContent value="create" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>步驟 1: 創建 Facebook 應用</CardTitle>
              <CardDescription>
                在 Facebook 開發者平台創建一個新的應用
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal pl-5 space-y-3">
                <li>
                  <p>前往 <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline flex items-center">
                    Facebook 開發者平台
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a></p>
                </li>
                <li>
                  <p>點擊右上角的「我的應用程式」，然後選擇「創建應用程式」</p>
                </li>
                <li>
                  <p>選擇應用類型：「消費者」或「商業」</p>
                  <p className="text-sm text-gray-500 mt-1">如果您是管理自己的粉絲專頁，請選擇「消費者」</p>
                </li>
                <li>
                  <p>填寫應用程式信息：</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                    <li>應用名稱：為您的應用取一個名稱</li>
                    <li>聯繫電子郵件：填寫您的電子郵件</li>
                    <li>商業帳戶（可選）：如果您有商業帳戶，可以選擇關聯</li>
                  </ul>
                </li>
                <li>
                  <p>點擊「創建應用程式」完成創建</p>
                </li>
              </ol>
              
              <Alert className="mt-4 bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">提示</AlertTitle>
                <AlertDescription className="text-blue-700">
                  請記下您的應用程式 ID 和應用程式密鑰（App Secret），您將需要將這些信息添加到環境變量中。
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 第二步：配置設置 */}
        <TabsContent value="config" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>步驟 2: 配置應用程式設置</CardTitle>
              <CardDescription>
                添加必要的網域和重定向 URI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal pl-5 space-y-3">
                <li>
                  <p>在您的應用程式儀表板中，找到「應用設置」→「基本」</p>
                </li>
                <li>
                  <p>填寫隱私政策網址（必填）：可以暫時使用您的網站網址</p>
                </li>
                <li>
                  <p>添加平台：點擊「添加平台」→ 選擇「網站」</p>
                  <div className="mt-2 p-2 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium mb-1">網站網址：</p>
                    <div className="flex items-center bg-white p-2 rounded border mb-2">
                      <code className="text-xs flex-1 text-blue-600">{currentDomain}</code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 ml-2"
                        onClick={() => copyToClipboard(currentDomain, "網址已複製到剪貼板")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">將此網址添加到 Facebook 應用程式設置中的「網站網址」欄位。</p>
                  </div>
                </li>
                <li>
                  <p>前往「應用設置」→「進階」→「安全」，找到「有效的 OAuth 重定向 URI」欄位</p>
                  <div className="mt-2 p-2 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium mb-1">OAuth 重定向 URI：</p>
                    <div className="flex items-center bg-white p-2 rounded border mb-2">
                      <code className="text-xs flex-1 text-blue-600">{currentDomain}/</code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 ml-2"
                        onClick={() => copyToClipboard(`${currentDomain}/`, "重定向 URI 已複製到剪貼板")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">將此 URI 添加到 Facebook 應用程式設置中的「有效的 OAuth 重定向 URI」欄位。</p>
                  </div>
                </li>
                <li>
                  <p>保存所有更改</p>
                </li>
              </ol>
              
              <Alert className="mt-4 bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">重要提示</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Facebook 需要一些時間來識別和接受新的網域。如果您的應用在測試中，可能需要添加測試用戶才能完整使用 API 功能。
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 第三步：添加權限 */}
        <TabsContent value="permissions" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>步驟 3: 配置應用程式權限</CardTitle>
              <CardDescription>
                添加必要的產品和權限設置
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal pl-5 space-y-3">
                <li>
                  <p>在左側導航欄點擊「添加產品」，添加以下產品：</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                    <li>Facebook 登入</li>
                    <li>頁面 API</li>
                  </ul>
                </li>
                <li>
                  <p>配置 Facebook 登入：</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                    <li>將「允許網域中的 JavaScript SDK 登入」設置為「是」</li>
                    <li>在「嵌入網頁網域」中添加您的應用網域，例如 <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{window.location.hostname}</code></li>
                  </ul>
                </li>
                <li>
                  <p>前往「應用審核」→「權限和功能」，請求以下權限：</p>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="p-2 bg-white rounded border">
                      <div className="font-medium text-xs">email</div>
                      <div className="text-xs text-gray-500">獲取用戶電子郵件</div>
                    </div>
                    <div className="p-2 bg-white rounded border">
                      <div className="font-medium text-xs">pages_show_list</div>
                      <div className="text-xs text-gray-500">獲取用戶管理的頁面列表</div>
                    </div>
                    <div className="p-2 bg-white rounded border">
                      <div className="font-medium text-xs">pages_read_engagement</div>
                      <div className="text-xs text-gray-500">讀取頁面互動數據</div>
                    </div>
                    <div className="p-2 bg-white rounded border">
                      <div className="font-medium text-xs">pages_manage_posts</div>
                      <div className="text-xs text-gray-500">管理頁面貼文</div>
                    </div>
                    <div className="p-2 bg-white rounded border">
                      <div className="font-medium text-xs">pages_read_user_content</div>
                      <div className="text-xs text-gray-500">讀取頁面用戶內容</div>
                    </div>
                  </div>
                </li>
                <li>
                  <p>在「應用審核」頁面，將您的應用模式設置為「開發」或「上線」：</p>
                  <p className="text-sm text-gray-500 mt-1">在開發模式下，只有應用管理員和開發人員可以使用您的應用。如果需要讓其他用戶使用，需要將應用提交審核並上線。</p>
                </li>
              </ol>
              
              <Alert className="mt-4 bg-green-50 border-green-200">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">提示</AlertTitle>
                <AlertDescription className="text-green-700">
                  在開發模式下，所有權限都可以直接使用，但僅限於指定的測試用戶。如果您打算公開應用，需要為每個權限提供詳細的使用說明並通過 Facebook 審核。
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 第四步：連接應用 */}
        <TabsContent value="connect" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>步驟 4: 連接到我們的系統</CardTitle>
              <CardDescription>
                將 Facebook 應用程式憑證添加到環境變量
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                要連接您的 Facebook 應用，請將以下兩個環境變量添加到您的系統：
              </p>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-md space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">FACEBOOK_APP_ID:</p>
                  <p className="text-xs text-gray-500">從 Facebook 開發者平台複製您的應用程式 ID</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">FACEBOOK_APP_SECRET:</p>
                  <p className="text-xs text-gray-500">從 Facebook 開發者平台複製您的應用程式密鑰</p>
                </div>
              </div>
              
              <p className="text-sm mt-3">
                添加環境變量後，請重新啟動應用以使更改生效。
              </p>
              
              <div className="mt-4 p-4 bg-gray-50 rounded-md border">
                <h3 className="text-sm font-medium mb-3">當前環境狀態：</h3>
                
                {checkResults ? (
                  <div className="space-y-2">
                    <p className={`text-sm ${checkResults.hasAppId ? 'text-green-600' : 'text-red-600'}`}>
                      {checkResults.hasAppId 
                        ? '✓ FACEBOOK_APP_ID 已設置' 
                        : '✗ FACEBOOK_APP_ID 未設置'}
                    </p>
                    <p className={`text-sm ${checkResults.hasAppSecret ? 'text-green-600' : 'text-red-600'}`}>
                      {checkResults.hasAppSecret 
                        ? '✓ FACEBOOK_APP_SECRET 已設置' 
                        : '✗ FACEBOOK_APP_SECRET 未設置'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">正在檢查環境狀態...</p>
                )}
              </div>
              
              <Alert 
                className={`mt-4 ${
                  checkResults && checkResults.hasAppId && checkResults.hasAppSecret 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                {checkResults && checkResults.hasAppId && checkResults.hasAppSecret ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">您的環境配置完成</AlertTitle>
                    <AlertDescription className="text-green-700">
                      您的 Facebook 應用程式環境變量已正確設置。您現在可以使用 Facebook 連接功能。
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">環境配置不完整</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      請確保您已正確設置所有必要的環境變量。缺少這些設置將導致 Facebook 連接功能不可用。
                    </AlertDescription>
                  </>
                )}
              </Alert>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => window.location.href = '/settings'} 
                className="w-full sm:w-auto"
              >
                前往設置頁面嘗試連接
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FacebookSetupGuide;