import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { OperationTask } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export type OperationTaskFormValues = {
  title: string;
  content: string;
  status: string;
  category: string;
  priority: string;
  startTime: Date;
  endTime: Date;
};

// 表單驗證規則
const FormSchema = z.object({
  title: z.string().min(2, '標題至少需要2個字符').max(100, '標題不能超過100個字符'),
  content: z.string().optional(),
  status: z.string(),
  category: z.string(),
  priority: z.string(),
  startTime: z.date(),
  endTime: z.date(),
}).refine(
  (data) => data.endTime >= data.startTime,
  {
    message: "結束時間必須晚於或等於開始時間",
    path: ["endTime"],
  }
);

interface OperationTaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: OperationTask;
}

export default function OperationTaskModal({ open, onClose, task }: OperationTaskModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // 在編輯模式下設置預設值
  useEffect(() => {
    if (task) {
      const taskStartTime = new Date(task.startTime);
      const taskEndTime = new Date(task.endTime);
      
      setStartDate(taskStartTime);
      setEndDate(taskEndTime);
      
      form.reset({
        title: task.title,
        content: task.content || '',
        status: task.status,
        category: task.category,
        priority: task.priority || '中',
        startTime: taskStartTime,
        endTime: taskEndTime,
      });
    }
  }, [task, open]);

  // 創建任務的突變
  const createMutation = useMutation({
    mutationFn: (data: OperationTaskFormValues) => {
      return apiRequest('/api/operation/tasks', {
        method: 'POST',
        data
      });
    },
    onSuccess: () => {
      toast({
        title: '成功創建營運任務',
        description: '新任務已添加到列表中。',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/operation/tasks'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: '無法創建營運任務',
        description: '請檢查您的輸入並再試一次。',
        variant: 'destructive',
      });
      console.error('Create task error:', error);
    }
  });

  // 更新任務的突變
  const updateMutation = useMutation({
    mutationFn: (data: OperationTaskFormValues) => {
      if (!task) throw new Error('無任務數據可更新');
      return apiRequest(`/api/operation/tasks/${task.id}`, {
        method: 'PATCH',
        data
      });
    },
    onSuccess: () => {
      toast({
        title: '成功更新營運任務',
        description: '任務詳情已更新。',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/operation/tasks'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: '無法更新營運任務',
        description: '請檢查您的輸入並再試一次。',
        variant: 'destructive',
      });
      console.error('Update task error:', error);
    }
  });

  // 表單初始設置
  const form = useForm<OperationTaskFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: '',
      content: '',
      status: '待處理',
      category: '一般',
      priority: '中',
      startTime: new Date(),
      endTime: new Date(),
    }
  });

  // 提交表單處理
  function onSubmit(data: OperationTaskFormValues) {
    if (task) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  }

  // 重置表單
  function resetForm() {
    if (!task) {
      form.reset({
        title: '',
        content: '',
        status: '待處理',
        category: '一般',
        priority: '中',
        startTime: new Date(),
        endTime: new Date(),
      });
      setStartDate(undefined);
      setEndDate(undefined);
    } else {
      const taskStartTime = new Date(task.startTime);
      const taskEndTime = new Date(task.endTime);
      
      form.reset({
        title: task.title,
        content: task.content || '',
        status: task.status,
        category: task.category,
        priority: task.priority || '中',
        startTime: taskStartTime,
        endTime: taskEndTime,
      });
      setStartDate(taskStartTime);
      setEndDate(taskEndTime);
    }
  }

  // 關閉模態框時重置表單
  function handleClose() {
    resetForm();
    onClose();
  }

  // 是否為編輯模式
  const isEditMode = !!task;
  
  // 是否在提交中
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

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
          <DialogTitle>{isEditMode ? '編輯營運任務' : '創建營運任務'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? '更新任務的詳細信息並保存您的更改。點擊取消或提交按鈕關閉視窗。' 
              : '填寫以下表格以創建一個新的營運任務。點擊取消或提交按鈕關閉視窗。'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 任務標題 */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>任務標題</FormLabel>
                  <FormControl>
                    <Input placeholder="輸入營運任務標題" {...field} />
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
                      placeholder="描述營運任務的具體內容和要求"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    詳細描述營運任務的內容、目標和具體要求
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 類別和優先級 */}
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
                        <SelectItem value="活動">活動</SelectItem>
                        <SelectItem value="測試">測試</SelectItem>
                        <SelectItem value="會議">會議</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      選擇最適合的營運任務類別
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 優先級 */}
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

            {/* 狀態 */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
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
                    指定營運任務的當前狀態
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 開始和結束時間 */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* 開始時間 */}
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>開始時間</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full pl-3 text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, 'yyyy年MM月dd日', { locale: zhTW })
                            ) : (
                              <span>選擇日期</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date);
                              setStartDate(date);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      任務的開始日期
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 結束時間 */}
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>結束時間</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full pl-3 text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, 'yyyy年MM月dd日', { locale: zhTW })
                            ) : (
                              <span>選擇日期</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date);
                              setEndDate(date);
                            }
                          }}
                          disabled={(date) => 
                            startDate ? date < startDate : false
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      任務的結束日期
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '處理中...' : isEditMode ? '更新任務' : '創建任務'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}