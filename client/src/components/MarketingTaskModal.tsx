import { useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

const FormSchema = insertMarketingTaskSchema.extend({
  startTime: z.date({
    required_error: "請選擇開始日期",
  }),
  endTime: z.date({
    required_error: "請選擇結束日期",
  }).refine(
    (date, ctx) => {
      if (date < ctx.parent.startTime) {
        return false;
      }
      return true;
    },
    {
      message: "結束日期必須晚於或等於開始日期",
    }
  ),
  category: z.string({
    required_error: "請選擇類別",
  }),
  status: z.string({
    required_error: "請選擇狀態",
  }),
  priority: z.string({
    required_error: "請選擇優先級",
  }),
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
    title: task?.title || "",
    content: task?.content || "",
    description: task?.description || "",
    category: task?.category || "一般",
    status: task?.status || "待處理",
    priority: task?.priority || "中",
    startTime: task?.startTime ? new Date(task.startTime) : new Date(),
    endTime: task?.endTime ? new Date(task.endTime) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 1 week later
  };

  const form = useForm<MarketingTaskFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues,
  });

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
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? "編輯行銷任務" : "新增行銷任務"}
          </DialogTitle>
          <button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">關閉</span>
          </button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">任務標題</FormLabel>
                  <FormControl>
                    <Input placeholder="請輸入任務標題" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">類別</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="選擇類別" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="一般">一般</SelectItem>
                        <SelectItem value="廣告投放">廣告投放</SelectItem>
                        <SelectItem value="地面推廣">地面推廣</SelectItem>
                        <SelectItem value="會議">會議</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">狀態</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="選擇狀態" />
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">優先級</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇優先級" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="高">高</SelectItem>
                      <SelectItem value="中">中</SelectItem>
                      <SelectItem value="低">低</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-base">開始日期</FormLabel>
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="px-3 text-left font-normal h-10"
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-base">結束日期</FormLabel>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="px-3 text-left font-normal h-10"
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">任務內容</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="請輸入任務內容"
                      className="min-h-[100px]"
                      value={field.value || ""}
                      onChange={field.onChange}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      name={field.name}
                      disabled={field.disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">任務描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="請輸入任務詳細描述"
                      className="min-h-[100px]"
                      value={field.value || ""}
                      onChange={field.onChange}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      name={field.name}
                      disabled={field.disabled}
                    />
                  </FormControl>
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