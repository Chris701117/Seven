import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MarketingTask } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Lucide icons
import { 
  Plus, 
  RefreshCw, 
  Search, 
  MegaphoneOff, 
  LayoutGrid, 
  List, 
  BarChart3,
  RefreshCcw 
} from "lucide-react";

// UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Custom components
import MarketingTaskCard from "@/components/MarketingTaskCard";
import MarketingTaskModal from "@/components/MarketingTaskModal";
import MarketingGanttChart from "@/components/MarketingGanttChart";

export default function Marketing() {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [view, setView] = useState<'cards' | 'gantt'>('cards');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch marketing tasks
  const { data: tasks = [], isLoading, isError, refetch } = useQuery<MarketingTask[]>({
    queryKey: ['/api/marketing-tasks'],
  });

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (taskId: number) => {
      return apiRequest<any>(`/api/marketing-tasks/${taskId}`, {
        method: "DELETE",
      } as RequestInit);
    },
    onSuccess: () => {
      toast({
        title: "刪除成功",
        description: "行銷任務已成功刪除！",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-tasks'] });
    },
    onError: (error: Error) => {
      toast({
        title: "刪除失敗",
        description: `錯誤: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter tasks based on search term and filters
  const filteredTasks = useMemo(() => tasks.filter(task => {
    // Search filter
    const matchesSearch = searchTerm === "" || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.content && task.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Status filter
    const matchesStatus = selectedStatus === "all" || task.status === selectedStatus;
    
    // Category filter
    const matchesCategory = selectedCategory === "all" || task.category === selectedCategory;
    
    // Priority filter
    const matchesPriority = selectedPriority === "all" || task.priority === selectedPriority;
    
    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  }), [tasks, searchTerm, selectedStatus, selectedCategory, selectedPriority]);

  // Group tasks by category for list view
  const tasksByCategory = useMemo(() => {
    const grouped: Record<string, MarketingTask[]> = {};
    filteredTasks.forEach(task => {
      const category = task.category || '未分類';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(task);
    });
    return grouped;
  }, [filteredTasks]);

  // Calculate statistics for cards
  const stats = useMemo(() => {
    const statuses = {
      pending: filteredTasks.filter(t => t.status === '待處理').length,
      inProgress: filteredTasks.filter(t => t.status === '進行中').length,
      completed: filteredTasks.filter(t => t.status === '已完成').length,
      delayed: filteredTasks.filter(t => t.status === '已延遲').length,
      cancelled: filteredTasks.filter(t => t.status === '已取消').length,
      total: filteredTasks.length
    };

    const categoryStats: Record<string, number> = {};
    filteredTasks.forEach(task => {
      const category = task.category || '未分類';
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });

    return { statuses, categories: categoryStats, total: filteredTasks.length };
  }, [filteredTasks]);

  return (
    <div className="space-y-4 p-4 sm:p-6 h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">行銷管理</h1>
          <p className="text-muted-foreground">
            管理公司行銷相關任務，包括廣告投放、地面推廣和宣傳活動等。
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">任務狀態分佈</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>待處理</span>
                <span>{stats.statuses.pending} 個任務</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="bg-yellow-500 h-full" style={{ width: `${(stats.statuses.pending / stats.total) * 100}%` }}></div>
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>進行中</span>
                <span>{stats.statuses.inProgress} 個任務</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: `${(stats.statuses.inProgress / stats.total) * 100}%` }}></div>
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>已完成</span>
                <span>{stats.statuses.completed} 個任務</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full" style={{ width: `${(stats.statuses.completed / stats.total) * 100}%` }}></div>
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>已延遲</span>
                <span>{stats.statuses.delayed} 個任務</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full" style={{ width: `${(stats.statuses.delayed / stats.total) * 100}%` }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">任務類別分佈</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.categories).map(([category, count]) => (
                <div key={category} className="flex flex-col">
                  <div className="flex justify-between mb-1">
                    <Badge 
                      className={
                        category === '一般' ? 'bg-gray-100 text-gray-800' : 
                        category === '廣告投放' ? 'bg-amber-100 text-amber-800' : 
                        category === '地面推廣' ? 'bg-pink-100 text-pink-800' : 
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
                        category === '廣告投放' ? 'bg-amber-500' : 
                        category === '地面推廣' ? 'bg-pink-500' : 
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

        <Card className="col-span-1 sm:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">進行中的優先任務</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTasks.filter(t => t.status === '進行中' && t.priority === '高').slice(0, 3).map(task => (
              <div key={task.id} className="mb-3 p-3 border rounded-lg last:mb-0">
                <div className="flex justify-between">
                  <span className="font-medium">{task.title}</span>
                  <Badge variant="outline" className="text-red-600 border-red-200">高優先</Badge>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {task.category} · {new Date(task.endTime).toLocaleDateString('zh-TW')} 截止
                </div>
              </div>
            ))}
            {filteredTasks.filter(t => t.status === '進行中' && t.priority === '高').length === 0 && (
              <div className="text-center text-gray-500 py-6">
                目前沒有高優先級進行中的任務
              </div>
            )}
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
              <SelectItem value="廣告投放">廣告投放</SelectItem>
              <SelectItem value="地面推廣">地面推廣</SelectItem>
              <SelectItem value="會議">會議</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="優先級" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有優先級</SelectItem>
              <SelectItem value="高">高優先</SelectItem>
              <SelectItem value="中">中優先</SelectItem>
              <SelectItem value="低">低優先</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="搜尋任務..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-full sm:w-[200px]"
            />
          </div>
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
                <span className="hidden sm:inline">甘特視圖</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {view === 'cards' && (
            <Tabs defaultValue={layout} className="w-auto" onValueChange={(value) => setLayout(value as 'grid' | 'list')}>
              <TabsList>
                <TabsTrigger value="grid" className="px-2">
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="list" className="px-2">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">載入行銷任務中...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-2">無法載入行銷任務</p>
          <Button variant="outline" onClick={() => refetch()}>重試</Button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500 mb-4">暫無符合條件的行銷任務</p>
          <Button onClick={() => setIsTaskModalOpen(true)}>新增行銷任務</Button>
        </div>
      ) : (
        <>
          {view === 'cards' ? (
            <>
              {layout === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredTasks.map((task) => (
                    <MarketingTaskCard
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
                          <MarketingTaskCard
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
              <MarketingGanttChart tasks={filteredTasks} />
            </div>
          )}
        </>
      )}

      {/* 新增任務模態框 */}
      <MarketingTaskModal 
        open={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
      />
    </div>
  );
}