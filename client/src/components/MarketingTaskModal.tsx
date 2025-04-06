import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertMarketingTaskSchema } from "@shared/schema";
import { MarketingTask } from "@shared/schema";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Lucide icons
import { X, Calendar } from "lucide-react";

// UI components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const FormSchema = z.object({
  title: z.string().min(2, '標題至少需要2個字符').max(100, '標題不能超過100個字符'),
  content: z.string().optional(),
  description: z.string().optional(),
  status: z.string(),
  category: z.string(),
  priority: z.string(),
  startTime: z.date(),
  endTime: z.date(),
});

export type MarketingTaskFormValues = z.infer<typeof FormSchema>;

interface MarketingTaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: MarketingTask;
}

export default function MarketingTaskModal({ open, onClose, task }: MarketingTaskModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  
  const isEditing = !!task;

  // Prepare default values for the form
  const defaultValues: Partial<MarketingTaskFormValues> = {
    title: "",
    content: "",
    description: "",
    category: "一般",
    status: "待處理",
    priority: "中",
    startTime: new Date(),
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 1 week later
  };

  const form = useForm<MarketingTaskFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues,
  });
  
  // Reset form when editing an existing task
  useEffect(() => {
    if (task && open) {
      const taskStartTime = new Date(task.startTime);
      const taskEndTime = new Date(task.endTime);
      
      form.reset({
        title: task.title,
        content: task.content || '',
        description: task.description || '',
        status: task.status,
        category: task.category,
        priority: task.priority || '中',
        startTime: taskStartTime,
        endTime: taskEndTime,
      });
    }
  }, [task, open, form]);

  // Create task mutation
  const createMutation = useMutation({
    mutationFn: (data: MarketingTaskFormValues) => {
      return apiRequest<any>("/api/marketing-tasks", {
        method: "POST",
        data
      });
    },
    onSuccess: () => {
      toast({
        title: "創建成功",
        description: "行銷任務已成功創建！",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-tasks'] });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "創建失敗",
        description: `錯誤: ${error?.message || '未知錯誤'}`,
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateMutation = useMutation({
    mutationFn: (data: MarketingTaskFormValues) => {
      return apiRequest<any>(`/api/marketing-tasks/${task?.id}`, {
        method: "PATCH",
        data
      });
    },
    onSuccess: () => {
      toast({
        title: "更新成功",
        description: "行銷任務已成功更新！",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing-tasks'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "更新失敗",
        description: `錯誤: ${error?.message || '未知錯誤'}`,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: MarketingTaskFormValues) {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(openState) => {
      // 只有當用戶點擊取消或提交後，才會關閉對話框
      // 點擊對話框外部不會自動關閉
      if (openState === false) {
        // 不自動關閉
        return;
      }
    }}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => {
        // 防止點擊外部關閉對話框
        e.preventDefault();
      }}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "編輯行銷任務" : "新增行銷任務"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? '更新任務的詳細信息並保存您的更改。點擊取消或提交按鈕關閉視窗。' 
              : '填寫以下表格以創建一個新的行銷任務。點擊取消或提交按鈕關閉視窗。'}
          </DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">關閉</span>
          </Button>
        </DialogClose>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>任務標題</FormLabel>
                  <FormControl>
                    <Input placeholder="輸入行銷任務標題" {...field} />
                  </FormControl>
                  <FormDescription>
                    簡潔明了的任務標題，能清楚描述任務內容
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 任務內容 */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>任務內容</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="描述行銷任務的具體內容和要求"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    詳細描述行銷任務的內容、目標和具體要求
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col md:flex-row gap-4">
              {/* 任務類別 */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>任務類別</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="選擇任務類別" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="一般">一般</SelectItem>
                        <SelectItem value="廣告投放">廣告投放</SelectItem>
                        <SelectItem value="地面推廣">地面推廣</SelectItem>
                        <SelectItem value="會議">會議</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      選擇最適合的行銷任務類別
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            
              {/* 任務狀態 */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>任務狀態</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="選擇任務狀態" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="待處理">待處理</SelectItem>
                        <SelectItem value="進行中">進行中</SelectItem>
                        <SelectItem value="已完成">已完成</SelectItem>
                        <SelectItem value="已延遲">已延遲</SelectItem>
                        <SelectItem value="已取消">已取消</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      指定行銷任務的當前狀態
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* 優先級 */}
            <div className="flex flex-col md:flex-row gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>優先級</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex justify-between space-x-2"
                      >
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="低" />
                          </FormControl>
                          <FormLabel className="text-green-600 font-medium">低</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="中" />
                          </FormControl>
                          <FormLabel className="text-blue-600 font-medium">中</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="高" />
                          </FormControl>
                          <FormLabel className="text-red-600 font-medium">高</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      設置任務的優先處理程度
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 日期選擇 */}
            <div className="flex flex-col md:flex-row gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>開始日期</FormLabel>
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full px-3 text-left font-normal h-10"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "yyyy-MM-dd") : <span>選擇日期</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date);
                              setStartDateOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      任務開始執行的日期
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>結束日期</FormLabel>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full px-3 text-left font-normal h-10"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "yyyy-MM-dd") : <span>選擇日期</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date);
                              setEndDateOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      任務預計完成的日期
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>任務描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="補充任務的其他重要信息和備註"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    任務的其他相關說明或注意事項
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? "處理中..." : isEditing ? "更新" : "創建"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}