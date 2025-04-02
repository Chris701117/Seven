import { useState } from "react";
import { format } from "date-fns";
import { zhTW } from 'date-fns/locale';
import { MarketingTask } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Icons
import { 
  Edit as EditIcon, 
  Trash2 as TrashIcon, 
  Calendar as CalendarIcon, 
  CheckSquare as CheckIcon, 
  AlertTriangle as AlertTriangleIcon,
  Clock as ClockIcon
} from "lucide-react";

// UI Components
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Modal
import MarketingTaskModal from "./MarketingTaskModal";

interface MarketingTaskCardProps {
  task: MarketingTask;
}

export default function MarketingTaskCard({ task }: MarketingTaskCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const startDate = new Date(task.startTime);
  const endDate = new Date(task.endTime);

  // 根據優先級顯示不同顏色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '高':
        return 'text-red-600';
      case '中':
        return 'text-blue-600';
      case '低':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  // 根據狀態顯示不同顏色的標籤
  const getStatusBadge = () => {
    switch (task.status) {
      case '已完成':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border border-green-300">
            <CheckIcon className="h-3.5 w-3.5 mr-1" />
            已完成
          </Badge>
        );
      case '進行中':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300">
            <ClockIcon className="h-3.5 w-3.5 mr-1" />
            進行中
          </Badge>
        );
      case '已延遲':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border border-red-300">
            <AlertTriangleIcon className="h-3.5 w-3.5 mr-1" />
            已延遲
          </Badge>
        );
      case '已取消':
        return (
          <Badge variant="outline" className="text-gray-800 border border-gray-300">
            已取消
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300">
            待處理
          </Badge>
        );
    }
  };

  // 根據類別顯示不同顏色
  const getCategoryBadge = () => {
    switch (task.category) {
      case '一般':
        return <Badge variant="secondary">一般</Badge>;
      case '廣告投放':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300">廣告投放</Badge>;
      case '地面推廣':
        return <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-200 border border-pink-300">地面推廣</Badge>;
      case '會議':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-300">會議</Badge>;
      default:
        return <Badge variant="outline">{task.category}</Badge>;
    }
  };

  // 檢查是否已過期
  const isOverdue = () => {
    const today = new Date();
    return endDate < today && task.status !== '已完成' && task.status !== '已取消';
  };

  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: () => {
      return apiRequest<any>(`/api/marketing-tasks/${task.id}`, {
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
    onError: (error) => {
      toast({
        title: "刪除失敗",
        description: `錯誤: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle delete confirmation
  const handleDelete = () => {
    deleteMutation.mutate();
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Card className={`w-full h-full flex flex-col ${isOverdue() ? 'border-red-300' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-bold truncate">{task.title}</CardTitle>
            <div className="flex space-x-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`font-medium ${getPriorityColor(task.priority || '中')}`}>
                      {task.priority || '中'}優先
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>優先級: {task.priority || '中'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {getStatusBadge()}
            {getCategoryBadge()}
          </div>
        </CardHeader>

        <CardContent className="py-2 flex-grow">
          <div className="text-sm text-gray-600 max-h-20 overflow-hidden">
            {task.description || task.content || <span className="text-gray-400 italic">無任務描述</span>}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-start pt-2 border-t">
          <div className="flex items-center text-sm text-gray-500 mb-1">
            <CalendarIcon className="h-4 w-4 mr-1" />
            {format(startDate, 'yyyy/MM/dd', { locale: zhTW })} - {format(endDate, 'yyyy/MM/dd', { locale: zhTW })}
          </div>
          <div className="flex justify-between w-full mt-2">
            <Button size="sm" variant="outline" onClick={() => setIsEditModalOpen(true)}>
              <EditIcon className="h-3.5 w-3.5 mr-1" />
              編輯
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setIsDeleteDialogOpen(true)}>
              <TrashIcon className="h-3.5 w-3.5 mr-1" />
              刪除
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Edit Modal */}
      <MarketingTaskModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        task={task}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              您確定要刪除此行銷任務嗎？此操作無法撤銷。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}