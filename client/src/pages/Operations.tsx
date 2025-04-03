import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Grid2X2, ListIcon, Plus, Calendar, BarChart3, LayoutGrid, RefreshCcw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OperationTask } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { OperationTaskCard, OperationTaskModal, OperationGanttChart } from '@/components/Operation';

export default function Operations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [view, setView] = useState<'cards' | 'gantt'>('cards');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 獲取所有營運任務
  const { 
    data: tasks = [], 
    isLoading,
    isError,
    refetch
  } = useQuery<OperationTask[]>({
    queryKey: ['/api/operation/tasks'],
  });

  // 處理刪除任務
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/operation/tasks/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: '任務已刪除',
        description: '營運任務已成功刪除。',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/operation/tasks'] });
    },
    onError: (error) => {
      toast({
        title: '刪除失敗',
        description: '無法刪除營運任務，請稍後再試。',
        variant: 'destructive',
      });
      console.error('Delete task error:', error);
    },
  });

  // 處理數據刷新
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast({
      title: '數據已更新',
      description: '營運任務列表已刷新。',
    });
  };

  // 過濾任務列表
  const filteredTasks = tasks.filter(task => {
    const statusMatch = selectedStatus === 'all' || task.status === selectedStatus;
    const categoryMatch = selectedCategory === 'all' || task.category === selectedCategory;
    return statusMatch && categoryMatch;
  });

  // 根據類別分組任務
  const tasksByCategory = filteredTasks.reduce<Record<string, OperationTask[]>>((acc, task) => {
    const category = task.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(task);
    return acc;
  }, {});

  // 計算任務統計
  const stats = {
    total: tasks.length,
    pending: tasks.filter(task => task.status === '待處理').length,
    inProgress: tasks.filter(task => task.status === '進行中').length,
    completed: tasks.filter(task => task.status === '已完成').length,
    delayed: tasks.filter(task => task.status === '已延遲').length,
    cancelled: tasks.filter(task => task.status === '已取消').length,
  };

  // 計算不同類別的任務數量
  const categoryStats = Object.entries(
    tasks.reduce<Record<string, number>>((acc, task) => {
      const category = task.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {})
  );

  return (
    <div className="space-y-4 p-4 sm:p-6 h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">營運管理</h1>
          <p className="text-muted-foreground">
            管理公司營運相關任務，包括活動、測試、會議等。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className={`${isRefreshing ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={handleRefresh}
          >
            <RefreshCcw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={() => setIsTaskModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            新增任務
          </Button>
        </div>
      </div>

      {/* 任務統計卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${selectedStatus === 'all' ? 'border-2 border-red-500 hover:border-red-600' : ''}`} 
          onClick={() => setSelectedStatus('all')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">總任務</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              所有營運任務總數
            </p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${selectedStatus === '進行中' ? 'border-2 border-red-500 hover:border-red-600' : ''}`} 
          onClick={() => setSelectedStatus('進行中')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">進行中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground mt-1">
              目前正在進行的任務 ({stats.inProgress ? ((stats.inProgress / stats.total) * 100).toFixed(0) : 0}%)
            </p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${selectedStatus === '待處理' ? 'border-2 border-red-500 hover:border-red-600' : ''}`} 
          onClick={() => setSelectedStatus('待處理')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">待處理</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              未開始的任務 ({stats.pending ? ((stats.pending / stats.total) * 100).toFixed(0) : 0}%)
            </p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${selectedStatus === '已延遲' ? 'border-2 border-red-500 hover:border-red-600' : ''}`} 
          onClick={() => setSelectedStatus('已延遲')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">已延遲</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.delayed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              逾期未完成的任務 ({stats.delayed ? ((stats.delayed / stats.total) * 100).toFixed(0) : 0}%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 類別統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">任務類別分布</CardTitle>
            <CardDescription>不同類別的營運任務數量分布</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2">
              {categoryStats.map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Badge 
                      variant="outline" 
                      className={
                        category === '一般' ? 'bg-gray-100 text-gray-800' : 
                        category === '活動' ? 'bg-amber-100 text-amber-800' : 
                        category === '測試' ? 'bg-pink-100 text-pink-800' : 
                        category === '會議' ? 'bg-purple-100 text-purple-800' : 
                        'bg-blue-100 text-blue-800'
                      }
                    >
                      {category}
                    </Badge>
                    <span className="ml-2 text-sm text-gray-600">{count} 個任務</span>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full ${
                        category === '一般' ? 'bg-gray-500' : 
                        category === '活動' ? 'bg-amber-500' : 
                        category === '測試' ? 'bg-pink-500' : 
                        category === '會議' ? 'bg-purple-500' : 
                        'bg-blue-500'
                      }`}
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">任務狀態分布</CardTitle>
            <CardDescription>各狀態營運任務數量分布</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setSelectedStatus('待處理')}>
                <div className="flex items-center">
                  <Badge className="bg-yellow-100 text-yellow-800 w-16 justify-center">待處理</Badge>
                  <span className="ml-2 text-sm text-gray-600 w-16">{stats.pending} 個任務</span>
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-yellow-500 h-2.5 rounded-full"
                    style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setSelectedStatus('進行中')}>
                <div className="flex items-center">
                  <Badge className="bg-blue-100 text-blue-800 w-16 justify-center">進行中</Badge>
                  <span className="ml-2 text-sm text-gray-600 w-16">{stats.inProgress} 個任務</span>
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-2.5 rounded-full"
                    style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setSelectedStatus('已完成')}>
                <div className="flex items-center">
                  <Badge className="bg-green-100 text-green-800 w-16 justify-center">已完成</Badge>
                  <span className="ml-2 text-sm text-gray-600 w-16">{stats.completed} 個任務</span>
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-green-500 h-2.5 rounded-full"
                    style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setSelectedStatus('已延遲')}>
                <div className="flex items-center">
                  <Badge className="bg-red-100 text-red-800 w-16 justify-center">已延遲</Badge>
                  <span className="ml-2 text-sm text-gray-600 w-16">{stats.delayed} 個任務</span>
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-red-500 h-2.5 rounded-full"
                    style={{ width: `${(stats.delayed / stats.total) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setSelectedStatus('已取消')}>
                <div className="flex items-center">
                  <Badge variant="outline" className="w-16 justify-center">已取消</Badge>
                  <span className="ml-2 text-sm text-gray-600 w-16">{stats.cancelled} 個任務</span>
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-gray-500 h-2.5 rounded-full"
                    style={{ width: `${(stats.cancelled / stats.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 任務過濾和視圖切換 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="任務狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有狀態</SelectItem>
              <SelectItem value="待處理">待處理</SelectItem>
              <SelectItem value="進行中">進行中</SelectItem>
              <SelectItem value="已完成">已完成</SelectItem>
              <SelectItem value="已延遲">已延遲</SelectItem>
              <SelectItem value="已取消">已取消</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="任務類別" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有類別</SelectItem>
              <SelectItem value="一般">一般</SelectItem>
              <SelectItem value="活動">活動</SelectItem>
              <SelectItem value="測試">測試</SelectItem>
              <SelectItem value="會議">會議</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Tabs defaultValue="cards" className="w-auto" onValueChange={(value) => setView(value as 'cards' | 'gantt')}>
            <TabsList>
              <TabsTrigger value="cards" className="flex items-center gap-1">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">卡片視圖</span>
              </TabsTrigger>
              <TabsTrigger value="gantt" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">甘特圖</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {view === 'cards' && (
            <div className="border rounded-md flex">
              <Button
                variant={layout === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-r-none h-8 px-2"
                onClick={() => setLayout('grid')}
              >
                <Grid2X2 className="h-4 w-4" />
              </Button>
              <Button
                variant={layout === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-l-none h-8 px-2"
                onClick={() => setLayout('list')}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 主要內容區域 */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">載入營運任務中...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-2">無法載入營運任務</p>
          <Button variant="outline" onClick={() => refetch()}>重試</Button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500 mb-4">暫無符合條件的營運任務</p>
          <Button onClick={() => setIsTaskModalOpen(true)}>新增營運任務</Button>
        </div>
      ) : (
        <>
          {view === 'cards' ? (
            <>
              {layout === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredTasks.map((task) => (
                    <OperationTaskCard
                      key={task.id}
                      task={task}
                      layout="grid"
                      onDelete={() => deleteMutation.mutate(task.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(tasksByCategory).map(([category, tasks]) => (
                    <div key={category}>
                      <h3 className="text-lg font-semibold mb-2">{category}</h3>
                      <div className="space-y-3">
                        {tasks.map((task) => (
                          <OperationTaskCard
                            key={task.id}
                            task={task}
                            layout="list"
                            onDelete={() => deleteMutation.mutate(task.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg border">
              <OperationGanttChart tasks={filteredTasks} />
            </div>
          )}
        </>
      )}

      {/* 新增任務模態框 */}
      <OperationTaskModal
        open={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />
    </div>
  );
}