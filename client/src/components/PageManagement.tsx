import { useState } from "react";
import { Page } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Facebook, Plus, Trash2, RefreshCw, Edit2, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";

interface PageManagementProps {
  onPageSelected: (pageId: string) => void;
  activePage: string | null;
}

const PageManagement = ({ onPageSelected, activePage }: PageManagementProps) => {
  const [isAddPageOpen, setIsAddPageOpen] = useState(false);
  const [newPageData, setNewPageData] = useState({
    pageId: "",
    pageName: "",
    accessToken: "",
    picture: "",
    pageImage: ""
  });
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);

  const queryClient = useQueryClient();

  // 取得所有粉絲頁
  const { data: pages = [], isLoading } = useQuery<Page[]>({
    queryKey: ['/api/pages'],
  });

  // 創建新粉絲頁
  const addPageMutation = useMutation({
    mutationFn: (pageData: Omit<Page, 'id' | 'userId'>) => {
      return apiRequest("POST", "/api/pages", pageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pages'] });
      setIsAddPageOpen(false);
      setNewPageData({
        pageId: "",
        pageName: "",
        accessToken: "",
        picture: "",
        pageImage: ""
      });
      toast({
        title: "粉絲頁添加成功",
        description: "您現在可以管理此粉絲頁的貼文了",
      });
    },
    onError: (error) => {
      toast({
        title: "添加粉絲頁失敗",
        description: `錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`,
        variant: "destructive",
      });
    }
  });

  // 刪除粉絲頁
  const deletePageMutation = useMutation({
    mutationFn: (pageId: number) => {
      return apiRequest("DELETE", `/api/pages/${pageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pages'] });
      setIsConfirmDeleteOpen(false);
      setPageToDelete(null);
      toast({
        title: "粉絲頁刪除成功",
        description: "粉絲頁已從您的帳戶中移除",
      });
    },
    onError: (error) => {
      toast({
        title: "刪除粉絲頁失敗",
        description: `錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`,
        variant: "destructive",
      });
    }
  });

  // 為開發模式創建模擬粉絲頁
  const createDemoPageMutation = useMutation({
    mutationFn: () => {
      const demoImage = "https://via.placeholder.com/60x60.png?text=FB";
      const demoPageData = {
        pageId: `demo_page_${Date.now()}`,
        pageName: `測試粉絲專頁 ${new Date().toLocaleDateString()}`,
        accessToken: "DEMO_MODE_ACCESS_TOKEN",
        picture: demoImage,
        pageImage: demoImage
      };
      return apiRequest("POST", "/api/pages", demoPageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pages'] });
      toast({
        title: "測試粉絲頁創建成功",
        description: "已添加一個用於測試的模擬粉絲頁",
      });
    },
    onError: (error) => {
      toast({
        title: "創建測試粉絲頁失敗",
        description: `錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`,
        variant: "destructive",
      });
    }
  });

  // 處理粉絲頁選擇
  const handlePageSelect = (pageId: string) => {
    onPageSelected(pageId);
    toast({
      title: "已切換當前粉絲頁",
      description: `現在管理: ${pages.find(p => p.pageId === pageId)?.pageName || '未知頁面'}`,
    });
  };

  // 處理添加新粉絲頁
  const handleAddPage = (e: React.FormEvent) => {
    e.preventDefault();
    addPageMutation.mutate(newPageData);
  };

  // 確認刪除粉絲頁
  const confirmDeletePage = (page: Page) => {
    setPageToDelete(page);
    setIsConfirmDeleteOpen(true);
  };

  // 執行刪除粉絲頁
  const executeDeletePage = () => {
    if (pageToDelete) {
      deletePageMutation.mutate(pageToDelete.id);
    }
  };

  // 創建測試粉絲頁
  const createDemoPage = () => {
    createDemoPageMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">粉絲專頁管理</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={createDemoPage}
            disabled={createDemoPageMutation.isPending}
          >
            {createDemoPageMutation.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            創建測試頁面
          </Button>
          <Button 
            onClick={() => setIsAddPageOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Facebook className="mr-2 h-4 w-4" /> 連接粉絲專頁
          </Button>
        </div>
      </div>

      {pages.length === 0 ? (
        <Card className="bg-neutral-50 border-dashed">
          <CardContent className="pt-6 pb-8 text-center">
            <div className="mx-auto bg-white p-6 rounded-full w-16 h-16 mb-4 flex items-center justify-center border">
              <Facebook className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">尚未連接任何粉絲專頁</h3>
            <p className="text-sm text-gray-500 mb-4">
              連接一個或多個粉絲專頁，開始管理您的 Facebook 內容
            </p>
            <div className="flex justify-center space-x-3">
              <Button 
                variant="outline" 
                onClick={createDemoPage}
              >
                <Plus className="mr-2 h-4 w-4" />
                創建測試頁面
              </Button>
              <Button 
                onClick={() => setIsAddPageOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Facebook className="mr-2 h-4 w-4" /> 連接粉絲專頁
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map(page => (
            <Card 
              key={page.id} 
              className={`hover:shadow-md transition-shadow ${
                activePage === page.pageId ? 'border-blue-500 ring-1 ring-blue-500' : ''
              }`}
            >
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center space-x-3">
                  <img 
                    src={page.picture || "https://via.placeholder.com/48"} 
                    alt={page.pageName} 
                    className="w-12 h-12 rounded-full" 
                  />
                  <div>
                    <CardTitle className="text-lg">{page.pageName}</CardTitle>
                    {activePage === page.pageId && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <CheckCircle className="w-3 h-3 mr-1" /> 當前選擇
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="text-sm text-gray-500">
                <p className="truncate"><span className="text-gray-700">ID:</span> {page.pageId}</p>
                <p className="mt-1"><span className="text-gray-700">Token:</span> {page.accessToken.substring(0, 12)}...</p>
              </CardContent>
              
              <CardFooter className="flex justify-between pt-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => confirmDeletePage(page)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handlePageSelect(page.pageId)}
                  disabled={activePage === page.pageId}
                >
                  {activePage === page.pageId ? '已選擇' : '選擇此頁面'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* 添加粉絲頁對話框 */}
      <Dialog open={isAddPageOpen} onOpenChange={setIsAddPageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>連接 Facebook 粉絲專頁</DialogTitle>
            <DialogDescription>
              請輸入粉絲專頁的詳細信息來連接到此應用
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddPage}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pageId" className="text-right">
                  頁面 ID
                </Label>
                <Input 
                  id="pageId" 
                  value={newPageData.pageId} 
                  onChange={e => setNewPageData({...newPageData, pageId: e.target.value})}
                  placeholder="例如: 123456789012345"
                  className="col-span-3"
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pageName" className="text-right">
                  頁面名稱
                </Label>
                <Input 
                  id="pageName" 
                  value={newPageData.pageName} 
                  onChange={e => setNewPageData({...newPageData, pageName: e.target.value})}
                  placeholder="您的粉絲專頁名稱"
                  className="col-span-3"
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="accessToken" className="text-right">
                  存取令牌
                </Label>
                <Input 
                  id="accessToken" 
                  value={newPageData.accessToken} 
                  onChange={e => setNewPageData({...newPageData, accessToken: e.target.value})}
                  placeholder="粉絲專頁存取令牌"
                  className="col-span-3"
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="picture" className="text-right">
                  圖片網址
                </Label>
                <Input 
                  id="picture" 
                  value={newPageData.picture} 
                  onChange={e => setNewPageData({...newPageData, picture: e.target.value, pageImage: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                  className="col-span-3"
                />
              </div>
            </div>
            
            <Alert className="mb-4 bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-amber-700">提示</AlertTitle>
              <AlertDescription className="text-amber-600">
                若使用開發模式，您可以使用模擬數據創建測試頁面。
              </AlertDescription>
            </Alert>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddPageOpen(false)}>
                取消
              </Button>
              <Button 
                type="submit" 
                disabled={addPageMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {addPageMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                添加粉絲專頁
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 確認刪除對話框 */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>確認刪除粉絲專頁</DialogTitle>
            <DialogDescription>
              您確定要移除 "{pageToDelete?.pageName}" 粉絲專頁嗎？此操作無法撤銷。
            </DialogDescription>
          </DialogHeader>
          
          <Alert variant="destructive" className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>警告</AlertTitle>
            <AlertDescription>
              刪除粉絲專頁將移除所有相關的貼文和分析數據。
            </AlertDescription>
          </Alert>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>
              取消
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={executeDeletePage}
              disabled={deletePageMutation.isPending}
            >
              {deletePageMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              確認刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PageManagement;