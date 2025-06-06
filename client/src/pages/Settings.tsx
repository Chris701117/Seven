import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Facebook, 
  Instagram, 
  Bell, 
  User, 
  LogOut, 
  ListFilter, 
  Users, 
  Shield, 
  UserPlus,
  Lock,
  Unlock,
  QrCode
} from "lucide-react";
import { SiTiktok, SiX } from "react-icons/si";
import FacebookConnect from "../components/FacebookConnect";
import InstagramConnect from "../components/InstagramConnect";
import TikTokConnect from "../components/TikTokConnect";
import ThreadsConnect from "../components/ThreadsConnect";
import XConnect from "../components/XConnect";
import PageManagement from "../components/PageManagement";
import UserGroupManagement from "../components/UserGroupManagement";
import UserManagement from "../components/UserManagement";
import { facebookApi } from "../lib/facebookApi";
import { usePageContext } from "../contexts/PageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Settings = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("account");
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [tfaSecret, setTfaSecret] = useState('');
  
  // 使用 Page Context
  const { activePage, setActivePage } = usePageContext();
  
  // 獲取用戶資料
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me']
  });
  
  // 連接狀態監聽
  useEffect(() => {
    if (user && (user as any)?.accessToken) {
      setIsConnected(true);
    }
    if (user && (user as any)?.isTwoFactorEnabled) {
      setIs2FAEnabled(true);
    }
  }, [user]);
  
  // 處理頁面選擇
  const handlePageSelected = (pageId: string) => {
    setActivePage(pageId);
    queryClient.invalidateQueries({ queryKey: ['/api/pages'] });
  };
  
  // 處理 Facebook 連接成功
  const handleFacebookConnect = () => {
    setIsConnected(true);
    toast({
      title: "連接成功",
      description: "您已成功連接 Facebook 帳號",
    });
    // 重新獲取用戶資料和頁面列表
    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    queryClient.invalidateQueries({ queryKey: ['/api/pages'] });
  };
  
  // 處理通知設置
  const handleNotificationToggle = (setting: string) => {
    toast({
      title: "設置已更新",
      description: `${setting}通知已更新。`,
    });
  };
  
  // 處理保存賬戶設置
  const handleSaveAccountSettings = () => {
    toast({
      title: "賬戶已更新",
      description: "您的賬戶設置已成功保存。",
    });
  };
  
  // 處理斷開 Facebook 連接
  const handleDisconnectFacebook = async () => {
    try {
      // 這裡將來需要實現真實的斷開邏輯
      setIsConnected(false);
      toast({
        title: "已斷開連接",
        description: "您的 Facebook 帳號已成功斷開連接。",
      });
      // 重新獲取用戶資料
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    } catch (error) {
      toast({
        title: "斷開失敗",
        description: "無法斷開 Facebook 連接，請稍後再試。",
        variant: "destructive",
      });
    }
  };
  
  // 啟用二步驗證
  const handleEnable2FA = async () => {
    try {
      // 顯示正在處理的提示
      toast({
        title: "設置中",
        description: "正在為您設置二步驗證...",
      });
      
      // 調用啟用二步驗證API
      const response = await fetch('/api/user/enable-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `伺服器錯誤: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 設置QR Code URL和密鑰
      setQrCodeUrl(data.qrCode);
      setTfaSecret(data.secret);
      setShowQRCode(true);
      
      toast({
        title: "掃描QR碼",
        description: "請使用Google Authenticator掃描QR碼",
      });
    } catch (error) {
      console.error("啟用二步驗證失敗:", error);
      toast({
        title: "設置失敗",
        description: error instanceof Error ? error.message : "無法設置二步驗證，請稍後再試",
        variant: "destructive",
      });
    }
  };
  
  // 驗證並完成二步驗證設置
  const handleVerify2FA = async () => {
    try {
      if (!verificationCode || verificationCode.length !== 6) {
        toast({
          title: "驗證失敗",
          description: "請輸入6位數驗證碼",
          variant: "destructive",
        });
        return;
      }
      
      // 調用驗證API
      const response = await fetch('/api/user/verify-2fa-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `伺服器錯誤: ${response.status}`);
      }
      
      // 設置狀態
      setIs2FAEnabled(true);
      setShowQRCode(false);
      setVerificationCode('');
      
      // 重新獲取用戶資料
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: "設置成功",
        description: "您已成功啟用二步驗證，下次登入時將需要驗證碼",
      });
    } catch (error) {
      console.error("驗證失敗:", error);
      toast({
        title: "驗證失敗",
        description: error instanceof Error ? error.message : "驗證碼無效或已過期",
        variant: "destructive",
      });
    }
  };
  
  // 禁用二步驗證
  const handleDisable2FA = async () => {
    try {
      // 調用禁用二步驗證API
      const response = await fetch('/api/user/disable-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `伺服器錯誤: ${response.status}`);
      }
      
      // 更新狀態
      setIs2FAEnabled(false);
      
      // 重新獲取用戶資料
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: "已禁用",
        description: "二步驗證已成功禁用",
      });
    } catch (error) {
      console.error("禁用二步驗證失敗:", error);
      toast({
        title: "操作失敗",
        description: error instanceof Error ? error.message : "無法禁用二步驗證，請稍後再試",
        variant: "destructive",
      });
    }
  };
  

  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">設置</h2>
        <p className="text-gray-500">管理您的帳戶設置和偏好</p>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full md:w-auto md:inline-flex grid-cols-6">
          <TabsTrigger value="account" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">帳戶</span>
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center">
            <Facebook className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">連接</span>
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center">
            <ListFilter className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">粉絲專頁</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center">
            <UserPlus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">用戶管理</span>
          </TabsTrigger>
          <TabsTrigger value="usergroups" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">用戶群組</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">通知</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="account" className="space-y-4">

          
          <Card>
            <CardHeader>
              <CardTitle>修改密碼</CardTitle>
              <CardDescription>
                更新您的登錄密碼
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">當前密碼</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">新密碼</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">確認新密碼</Label>
                <Input id="confirm-password" type="password" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>更新密碼</Button>
            </CardFooter>
          </Card>
          
          {/* 二步驗證卡片 */}
          <Card>
            <CardHeader>
              <CardTitle>二步驗證</CardTitle>
              <CardDescription>
                啟用二步驗證以增強帳戶安全性
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showQRCode ? (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-center">設置二步驗證</h2>
                  <p className="text-center text-muted-foreground">
                    請使用Google Authenticator掃描下方QR碼並輸入驗證碼
                  </p>
                  
                  {/* 必須啟用二步驗證提示 */}
                  <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-md">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-yellow-600" />
                      <p className="font-medium text-yellow-800">必須啟用二步驗證</p>
                    </div>
                    <p className="text-yellow-700 text-sm mt-1 ml-7">
                      為保障帳戶安全，本系統要求所有用戶啟用二步驗證。請完成以下步驟。
                    </p>
                  </div>
                  
                  {/* 第一步：下載應用 */}
                  <div className="mt-6">
                    <h3 className="font-medium text-gray-800">第1步：下載 Google Authenticator 應用</h3>
                    <div className="flex justify-center gap-4 mt-3">
                      <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Android下載
                      </a>
                      <a href="https://apps.apple.com/app/google-authenticator/id388497605" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        iOS下載
                      </a>
                    </div>
                  </div>
                  
                  {/* 第二步：掃描QR碼 */}
                  <div className="mt-4">
                    <h3 className="font-medium text-gray-800 mb-3">第2步：掃描QR碼</h3>
                    {qrCodeUrl && (
                      <div className="bg-white flex justify-center border rounded-md p-2">
                        <img src={qrCodeUrl} alt="二步驗證 QR 碼" className="w-48 h-48" />
                      </div>
                    )}
                    
                    {tfaSecret && (
                      <div className="mt-3">
                        <p className="text-sm text-center text-gray-500">如無法掃描，請手動輸入以下密鑰：</p>
                        <div className="bg-gray-100 p-2 text-center rounded-md mt-1">
                          <p className="font-mono text-sm select-all">
                            {tfaSecret}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 第三步：輸入驗證碼 */}
                  <div className="mt-6">
                    <h3 className="font-medium text-gray-800 mb-3">第3步：輸入驗證碼</h3>
                    <Input 
                      id="verification-code" 
                      placeholder="請輸入6位數驗證碼" 
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="text-center text-lg py-6"
                    />
                  </div>
                  
                  <div className="flex justify-between mt-6">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowQRCode(false);
                        setVerificationCode('');
                        setQrCodeUrl('');
                        setTfaSecret('');
                      }}
                      className="px-6"
                    >
                      返回
                    </Button>
                    <Button 
                      onClick={handleVerify2FA}
                      disabled={!verificationCode || verificationCode.length !== 6}
                      className="px-10 bg-blue-600 hover:bg-blue-700"
                    >
                      驗證並完成設置
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {is2FAEnabled ? (
                    <div>
                      <div className="p-4 mb-4 bg-green-50 border border-green-100 rounded-md">
                        <div className="flex items-center gap-2">
                          <Lock className="h-5 w-5 text-green-600" />
                          <p className="font-medium text-green-800">二步驗證已啟用</p>
                        </div>
                        <p className="text-green-700 text-sm mt-2">
                          您的帳戶受到額外的安全保護
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        為確保帳戶安全，二步驗證為必需功能，無法禁用。
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="p-4 mb-4 bg-yellow-50 border border-yellow-100 rounded-md">
                        <div className="flex items-center gap-2">
                          <Unlock className="h-5 w-5 text-yellow-600" />
                          <p className="font-medium text-yellow-800">二步驗證未啟用</p>
                        </div>
                        <p className="text-yellow-700 text-sm mt-2">
                          啟用二步驗證以增強您的帳戶安全性
                        </p>
                      </div>
                      <Button 
                        onClick={handleEnable2FA}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        啟用二步驗證
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          

        </TabsContent>
        
        <TabsContent value="connections" className="space-y-4">
          <Tabs defaultValue="facebook" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="facebook" className="flex items-center justify-center">
                <Facebook className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Facebook</span>
              </TabsTrigger>
              <TabsTrigger value="instagram" className="flex items-center justify-center">
                <Instagram className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Instagram</span>
              </TabsTrigger>
              <TabsTrigger value="tiktok" className="flex items-center justify-center">
                <SiTiktok className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">TikTok</span>
              </TabsTrigger>
              <TabsTrigger value="threads" className="flex items-center justify-center">
                <svg viewBox="0 0 192 192" className="h-4 w-4 sm:mr-2">
                  <path fill="currentColor" d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.076-10.548h.23c8.152.048 14.352 2.356 18.42 6.881 2.982 3.325 4.97 7.923 5.932 13.754a73.027 73.027 0 0 0-11.522-2.028c-13.365-1.67-24.965 1.28-32.532 8.287-5.065 4.682-7.857 10.833-7.927 17.434-.075 7.226 2.56 13.788 7.434 18.446 6.46 6.215 16.59 9.563 28.523 9.376 13.79-.215 24.24-5.12 30.98-14.537 4.842-6.767 7.407-15.707 7.618-26.605 3.168 1.688 5.94 3.557 8.265 5.595 5.566 4.89 8.674 10.23 9.494 16.334.83 6.203-.619 12.713-4.277 19.207-3.218 5.7-8.176 10.657-14.764 14.73-6.802 4.215-14.93 7.012-24.181 8.317a4.29 4.29 0 0 0-3.425 5.05 4.3 4.3 0 0 0 5.059 3.42c10.598-1.464 19.983-4.64 27.913-9.423 7.766-4.82 13.699-10.825 17.622-17.855 4.4-7.805 6.159-15.87 5.12-23.577-1.128-8.37-5.036-15.774-11.691-22.057a48.085 48.085 0 0 0-10.116-7.834zm-30.589 53.926c-9.179.145-16.984-2.398-21.928-7.135-2.741-2.629-4.055-6.156-4.005-10.72.035-3.314 1.376-6.167 3.972-8.533 4.485-4.083 12.588-6.023 22.9-4.71 3.907.497 7.736 1.413 11.437 2.669.035 1.221.058 2.47.068 3.75.125 10.093-1.505 17.56-4.97 22.75-4.282 6.458-11.055 9.733-20.96 9.888l7.486-8zm74.902 7.333c-6.037 0-10.944 4.902-10.944 10.94 0 6.037 4.907 10.943 10.944 10.943 6.038 0 10.943-4.906 10.943-10.944 0-6.037-4.905-10.939-10.943-10.939zm-48.502 10.94c0-6.038-4.902-10.94-10.94-10.94-6.037 0-10.939 4.902-10.939 10.94 0 6.037 4.902 10.943 10.94 10.943 6.037 0 10.939-4.906 10.939-10.944zm-73.963 0c0-6.038-4.903-10.94-10.94-10.94s-10.94 4.902-10.94 10.94c0 6.037 4.902 10.943 10.94 10.943 6.037 0 10.94-4.906 10.94-10.944z" />
                </svg>
                <span className="hidden sm:inline">Threads</span>
              </TabsTrigger>
              <TabsTrigger value="x" className="flex items-center justify-center">
                <SiX className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">X</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="facebook" className="pt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Facebook 連接</CardTitle>
                  <CardDescription>
                    連接您的 Facebook 帳號以管理您的粉絲專頁
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isConnected ? (
                    <div className="space-y-4">
                      <div className="p-4 mb-4 bg-green-50 border border-green-100 rounded-md">
                        <div className="flex items-center gap-2">
                          <Facebook className="h-5 w-5 text-green-600" />
                          <p className="font-medium text-green-800">已連接到 Facebook</p>
                        </div>
                        <p className="text-green-700 text-sm mt-2">
                          您的帳號已成功連接到 Facebook
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <Button 
                          variant="outline" 
                          onClick={handleDisconnectFacebook} 
                          className="w-full sm:w-auto"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          斷開 Facebook 連接
                        </Button>
                        
                        <Button 
                          variant="default" 
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                          onClick={async () => {
                            try {
                              toast({
                                title: "創建測試頁面",
                                description: "正在為您建立測試頁面，請稍後..."
                              });
                              
                              // 呼叫後端API創建測試頁面
                              const response = await fetch('/api/facebook/create-test-page', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  pageName: '測試粉絲專頁',
                                  pageDescription: '這是一個由系統自動生成的測試用粉絲專頁'
                                }),
                                credentials: 'include'
                              });
                              
                              if (!response.ok) {
                                const errorText = await response.text();
                                throw new Error(errorText || `伺服器錯誤: ${response.status}`);
                              }
                              
                              const data = await response.json();
                              
                              // 顯示成功訊息
                              toast({
                                title: "測試頁面已創建",
                                description: data.message || "測試頁面創建成功！",
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
                                  : "創建測試頁面時發生錯誤，請稍後再試",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Facebook className="h-4 w-4 mr-2" />
                          創建測試粉絲專頁
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <FacebookConnect onConnect={handleFacebookConnect} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="instagram" className="pt-6">
              <InstagramConnect onConnect={() => {
                toast({
                  title: "連接成功",
                  description: "您已成功連接 Instagram 帳號",
                });
                queryClient.invalidateQueries({ queryKey: ['/api/auth/instagram/status'] });
              }} />
            </TabsContent>
            
            <TabsContent value="tiktok" className="pt-6">
              <TikTokConnect onConnect={() => {
                toast({
                  title: "連接成功",
                  description: "您已成功連接 TikTok 帳號",
                });
                queryClient.invalidateQueries({ queryKey: ['/api/auth/tiktok/status'] });
              }} />
            </TabsContent>
            
            <TabsContent value="threads" className="pt-6">
              <ThreadsConnect onConnect={() => {
                toast({
                  title: "連接成功",
                  description: "您已成功連接 Threads 帳號",
                });
                queryClient.invalidateQueries({ queryKey: ['/api/auth/threads/status'] });
              }} />
            </TabsContent>
            
            <TabsContent value="x" className="pt-6">
              <XConnect onConnect={() => {
                toast({
                  title: "連接成功",
                  description: "您已成功連接 X 帳號",
                });
                queryClient.invalidateQueries({ queryKey: ['/api/auth/x/status'] });
              }} />
            </TabsContent>
          </Tabs>
        </TabsContent>
        
        <TabsContent value="pages" className="space-y-4">
          <PageManagement onPageSelected={handlePageSelected} activePage={activePage} />
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="usergroups" className="space-y-4">
          <UserGroupManagement />
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>通知設置</CardTitle>
              <CardDescription>
                配置如何和何時接收通知
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="post-published">貼文發布</Label>
                    <p className="text-sm text-gray-500">
                      當排程的貼文發布時接收通知
                    </p>
                  </div>
                  <Switch 
                    id="post-published" 
                    defaultChecked={true}
                    onCheckedChange={() => handleNotificationToggle("貼文發布")}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="engagement-alerts">互動提醒</Label>
                    <p className="text-sm text-gray-500">
                      當您的貼文獲得高互動時接收通知
                    </p>
                  </div>
                  <Switch 
                    id="engagement-alerts" 
                    defaultChecked={true}
                    onCheckedChange={() => handleNotificationToggle("互動提醒")}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="comments">評論通知</Label>
                    <p className="text-sm text-gray-500">
                      當有新評論添加到您的貼文時接收通知
                    </p>
                  </div>
                  <Switch 
                    id="comments" 
                    defaultChecked={false}
                    onCheckedChange={() => handleNotificationToggle("評論")}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="analytics-reports">分析報告</Label>
                    <p className="text-sm text-gray-500">
                      接收粉絲專頁的每週表現報告
                    </p>
                  </div>
                  <Switch 
                    id="analytics-reports" 
                    defaultChecked={true}
                    onCheckedChange={() => handleNotificationToggle("分析報告")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>電子郵件通知</CardTitle>
              <CardDescription>
                配置電子郵件通知偏好
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-address">電子郵件地址</Label>
                <Input 
                  id="email-address" 
                  type="email" 
                  defaultValue="user@example.com" 
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Switch id="marketing-emails" />
                <Label htmlFor="marketing-emails">
                  接收營銷郵件和產品更新
                </Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button>保存偏好</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
