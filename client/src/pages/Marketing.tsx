import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MarketingTask } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Lucide icons
import { Plus, RefreshCw, Filter, Search, MegaphoneOff, CalendarRange, LayoutGrid } from "lucide-react";

// UI components
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// Custom components
import MarketingTaskCard from "@/components/MarketingTaskCard";
import MarketingTaskModal from "@/components/MarketingTaskModal";
import MarketingGanttChart from "@/components/MarketingGanttChart";

export default function Marketing() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"card" | "gantt">("card");

  // Fetch marketing tasks
  const { data: tasks, isLoading, isError, refetch } = useQuery<MarketingTask[]>({
    queryKey: ['/api/marketing-tasks'],
  });

  // Filter tasks based on search term and filters
  const filteredTasks = tasks?.filter(task => {
    // Search filter
    const matchesSearch = searchTerm === "" || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.content && task.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Status filter
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    
    // Category filter
    const matchesCategory = categoryFilter === "all" || task.category === categoryFilter;
    
    // Priority filter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  });

  // Group tasks by status
  const pendingTasks = filteredTasks?.filter(task => task.status === "待處理") || [];
  const inProgressTasks = filteredTasks?.filter(task => task.status === "進行中") || [];
  const completedTasks = filteredTasks?.filter(task => task.status === "已完成") || [];
  const delayedTasks = filteredTasks?.filter(task => task.status === "已延遲") || [];
  const cancelledTasks = filteredTasks?.filter(task => task.status === "已取消") || [];

  // Get unique categories and priorities for filters
  const categories = tasks ? 
    ["all", ...Array.from(new Set(tasks.map(task => task.category)))] : 
    ["all"];
  const priorities = tasks ? 
    ["all", ...Array.from(new Set(tasks.filter(task => task.priority).map(task => task.priority || "")))] : 
    ["all"];

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setPriorityFilter("all");
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">行銷任務管理</h1>
        <div className="flex gap-2">
          <div className="flex border rounded-md overflow-hidden">
            <Button 
              variant={viewMode === "card" ? "default" : "ghost"} 
              className="rounded-none px-3 py-1 h-10"
              onClick={() => setViewMode("card")}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              卡片視圖
            </Button>
            <Button 
              variant={viewMode === "gantt" ? "default" : "ghost"} 
              className="rounded-none px-3 py-1 h-10"
              onClick={() => setViewMode("gantt")}
            >
              <CalendarRange className="h-4 w-4 mr-2" />
              甘特視圖
            </Button>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            新增行銷任務
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜尋任務..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-2/3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="任務狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>任務狀態</SelectLabel>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="待處理">待處理</SelectItem>
                  <SelectItem value="進行中">進行中</SelectItem>
                  <SelectItem value="已完成">已完成</SelectItem>
                  <SelectItem value="已延遲">已延遲</SelectItem>
                  <SelectItem value="已取消">已取消</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="任務類別" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>任務類別</SelectLabel>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "全部類別" : category}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="優先級" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>優先級</SelectLabel>
                  {priorities.map(priority => (
                    <SelectItem key={priority} value={priority}>
                      {priority === "all" ? "全部優先級" : `${priority}優先`}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={resetFilters}
              title="重置過濾器"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Gantt Chart View */}
      {viewMode === "gantt" && (
        <div className="mb-6">
          {isLoading ? (
            <div className="bg-white rounded-lg shadow p-4">
              <Skeleton className="h-10 w-full mb-4" />
              <Skeleton className="h-80 w-full" />
            </div>
          ) : isError ? (
            <div className="text-center py-10">
              <div className="text-red-500 mb-4">加載任務時出錯</div>
              <Button onClick={() => window.location.reload()}>重新整理</Button>
            </div>
          ) : !filteredTasks || filteredTasks.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg shadow">
              <MegaphoneOff className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">沒有找到任務</h3>
              <p className="text-gray-500 mb-4">
                目前沒有符合條件的行銷任務，請嘗試修改過濾條件或創建新任務。
              </p>
            </div>
          ) : (
            <MarketingGanttChart tasks={filteredTasks} />
          )}
        </div>
      )}

      {/* Card View with Tabs */}
      {viewMode === "card" && (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all" className="flex items-center">
              全部
              {filteredTasks && <span className="ml-2 bg-gray-200 px-2 py-0.5 rounded-full text-xs">{filteredTasks.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center">
              待處理
              {pendingTasks && <span className="ml-2 bg-yellow-200 px-2 py-0.5 rounded-full text-xs">{pendingTasks.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="in-progress" className="flex items-center">
              進行中
              {inProgressTasks && <span className="ml-2 bg-blue-200 px-2 py-0.5 rounded-full text-xs">{inProgressTasks.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center">
              已完成
              {completedTasks && <span className="ml-2 bg-green-200 px-2 py-0.5 rounded-full text-xs">{completedTasks.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="delayed" className="flex items-center">
              已延遲
              {delayedTasks && <span className="ml-2 bg-red-200 px-2 py-0.5 rounded-full text-xs">{delayedTasks.length}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <TaskList tasks={filteredTasks} isLoading={isLoading} isError={isError} />
          </TabsContent>
          
          <TabsContent value="pending" className="mt-0">
            <TaskList tasks={pendingTasks} isLoading={isLoading} isError={isError} />
          </TabsContent>
          
          <TabsContent value="in-progress" className="mt-0">
            <TaskList tasks={inProgressTasks} isLoading={isLoading} isError={isError} />
          </TabsContent>
          
          <TabsContent value="completed" className="mt-0">
            <TaskList tasks={completedTasks} isLoading={isLoading} isError={isError} />
          </TabsContent>
          
          <TabsContent value="delayed" className="mt-0">
            <TaskList tasks={delayedTasks} isLoading={isLoading} isError={isError} />
          </TabsContent>
        </Tabs>
      )}

      {/* Create Task Modal */}
      <MarketingTaskModal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

// Helper component for displaying tasks
interface TaskListProps {
  tasks?: MarketingTask[];
  isLoading: boolean;
  isError: boolean;
}

function TaskList({ tasks, isLoading, isError }: TaskListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  const handleDeleteTask = (taskId: number) => {
    deleteMutation.mutate(taskId);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/4 mb-2" />
            <Skeleton className="h-20 w-full mb-4" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-10">
        <div className="text-red-500 mb-4">加載任務時出錯</div>
        <Button onClick={() => window.location.reload()}>重新整理</Button>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg">
        <MegaphoneOff className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">沒有找到任務</h3>
        <p className="text-gray-500 mb-4">
          目前沒有符合條件的行銷任務，請嘗試修改過濾條件或創建新任務。
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.map(task => (
        <MarketingTaskCard 
          key={task.id} 
          task={task} 
          onDelete={() => handleDeleteTask(task.id)} 
          layout="grid"
        />
      ))}
    </div>
  );
}