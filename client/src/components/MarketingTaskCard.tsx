import { useState } from "react";
import { format } from "date-fns";
import { MarketingTask } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Icons
import { Edit, Trash2, Calendar, CheckSquare, AlertTriangle } from "lucide-react";

// UI Components
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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

  // Status color mapping
  const statusColorMap: Record<string, string> = {
    "待處理": "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    "進行中": "bg-blue-100 text-blue-800 hover:bg-blue-200",
    "已完成": "bg-green-100 text-green-800 hover:bg-green-200",
    "已延遲": "bg-red-100 text-red-800 hover:bg-red-200",
    "已取消": "bg-gray-100 text-gray-800 hover:bg-gray-200",
  };

  // Priority color mapping
  const priorityColorMap: Record<string, string> = {
    "高": "bg-red-100 text-red-800 hover:bg-red-200",
    "中": "bg-blue-100 text-blue-800 hover:bg-blue-200",
    "低": "bg-green-100 text-green-800 hover:bg-green-200",
  };

  // Calculate days left
  const calculateDaysLeft = () => {
    const endDate = new Date(task.endTime);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = calculateDaysLeft();
  const isOverdue = daysLeft < 0;

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
      <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-bold line-clamp-2">{task.title}</CardTitle>
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0" 
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">編輯</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100" 
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">刪除</span>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge className={statusColorMap[task.status] || "bg-gray-100"}>
              {task.status}
            </Badge>
            <Badge className={priorityColorMap[task.priority || "中"] || "bg-blue-100"}>
              {task.priority || "中"}優先
            </Badge>
            <Badge variant="outline">{task.category}</Badge>
          </div>
        </CardHeader>
        <CardContent className="py-2 flex-grow">
          <div className="text-sm text-gray-600 mb-2 line-clamp-3">
            {task.description || task.content}
          </div>
          
          <div className="flex items-center text-sm text-gray-500 mt-3">
            <Calendar className="h-4 w-4 mr-1" />
            <span>
              {format(new Date(task.startTime), "yyyy/MM/dd")} - {format(new Date(task.endTime), "yyyy/MM/dd")}
            </span>
          </div>

          {task.status !== "已完成" && task.status !== "已取消" && (
            <div className="flex items-center mt-2">
              {isOverdue ? (
                <div className="flex items-center text-red-500">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  <span>已逾期 {Math.abs(daysLeft)} 天</span>
                </div>
              ) : (
                <div className={`flex items-center ${daysLeft <= 3 ? 'text-amber-500' : 'text-green-500'}`}>
                  <CheckSquare className="h-4 w-4 mr-1" />
                  <span>剩餘 {daysLeft} 天</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-2 border-t text-xs text-gray-500">
          <div>建立於 {format(new Date(task.createdAt), "yyyy/MM/dd")}</div>
          {task.createdBy && <div className="ml-auto">建立者: {task.createdBy}</div>}
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