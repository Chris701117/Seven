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
import { Facebook, FileText, Bell, Key, User, LogOut, Trash2 } from "lucide-react";
import FacebookConnect from "../components/FacebookConnect";
import { facebookApi } from "../lib/facebookApi";
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
  
  // 獲取用戶資料
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me']
  });
  
  // 連接狀態監聽
  useEffect(() => {
    if (user && (user as any)?.accessToken) {
      setIsConnected(true);
    }
  }, [user]);
  
  // 獲取頁面列表
  const { data: pages } = useQuery({
    queryKey: ['/api/pages']
  });
  
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
  
  // 處理賬戶刪除
  const handleDeleteAccount = () => {
    toast({
      title: "賬戶已刪除",
      description: "您的賬戶已成功刪除。",
      variant: "destructive",
    });
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">設置</h2>
        <p className="text-gray-500">管理您的帳戶設置和偏好</p>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full md:w-auto md:inline-flex grid-cols-3">
          <TabsTrigger value="account" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">帳戶</span>
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center">
            <Facebook className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">連接</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">通知</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>帳戶信息</CardTitle>
              <CardDescription>
                更新您的帳戶詳細信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用戶名</Label>
                <Input 
                  id="username" 
                  defaultValue={(user as any)?.username || ""} 
                  disabled={!user}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">電子郵箱</Label>
                <Input 
                  id="email" 
                  type="email" 
                  defaultValue="user@example.com" 
                  disabled={!user}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveAccountSettings} disabled={!user}>
                保存變更
              </Button>
            </CardFooter>
          </Card>
          
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
          
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">危險區域</CardTitle>
              <CardDescription>
                不可逆的帳戶操作
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 mb-4">
                一旦您刪除帳戶，您的所有資料將被永久移除。
                此操作無法撤銷。
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    刪除帳戶
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>您確定要刪除帳戶嗎？</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作無法撤銷。這將永久刪除您的
                      帳戶並從我們的伺服器中移除所有資料。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      刪除帳戶
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="connections" className="space-y-4">
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
                  <div className="flex items-center space-x-4 p-4 border border-green-100 bg-green-50 rounded-md">
                    <Facebook className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-medium">已連接到 Facebook</p>
                      <p className="text-sm text-gray-500">您的帳號已連接到 Facebook。</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleDisconnectFacebook} className="w-full sm:w-auto">
                    <LogOut className="h-4 w-4 mr-2" />
                    斷開 Facebook 連接
                  </Button>
                </div>
              ) : (
                <FacebookConnect onConnect={handleFacebookConnect} />
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>已連接的粉絲專頁</CardTitle>
              <CardDescription>
                管理您連接的 Facebook 粉絲專頁
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pages && Array.isArray(pages) && pages.length > 0 ? (
                <div className="space-y-4">
                  {pages.map((page: any) => (
                    <div key={page.pageId} className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={page.picture || "https://via.placeholder.com/40"} 
                          alt={page.name} 
                          className="h-10 w-10 rounded-full" 
                        />
                        <div>
                          <p className="font-medium">{page.name}</p>
                          <p className="text-xs text-gray-500">頁面 ID: {page.pageId}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">管理</Button>
                    </div>
                  ))}
                  
                  <Button variant="outline" className="mt-4">
                    <Facebook className="h-4 w-4 mr-2" />
                    添加其他專頁
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Facebook className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">尚未連接任何粉絲專頁</h3>
                  <p className="text-gray-500 mb-4">連接您的 Facebook 帳號以管理您的粉絲專頁。</p>
                  <Button disabled={!isConnected}>
                    添加 Facebook 粉絲專頁
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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
