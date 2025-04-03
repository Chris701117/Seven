import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertPostSchema } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageContext } from "@/contexts/PageContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Post } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  X, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Smile, 
  MapPin, 
  Calendar, 
  Clock, 
  Upload, 
  Loader2, 
  FilePlus,
  FileVideo,
  Share,
  Camera,
  Music as MusicIcon,
  MessageCircle,
  FileImage,
  FileBadge,
  ChevronDown,
  AtSign,
  Info,
  Send
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import PostEditor from "./PostEditor";

// Extended schema for the form
const formSchema = insertPostSchema.extend({
  schedulePost: z.boolean().default(false),
  multiPlatform: z.boolean().default(true),
  scheduleDate: z.string().optional(),
  scheduleTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  hasImage: z.boolean().default(false),
  hasLink: z.boolean().default(false),
  category: z.enum(["promotion", "event", "announcement"]).optional(),
}).superRefine((data, ctx) => {
  if (data.schedulePost) {
    if (!data.scheduleDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "開始日期為必填",
        path: ["scheduleDate"],
      });
    }
    if (!data.scheduleTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "開始時間為必填",
        path: ["scheduleTime"],
      });
    }
    
    // 如果有填寫結束日期，必須確保結束時間也有填寫
    if (data.endDate && !data.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "已填寫結束日期時，結束時間為必填",
        path: ["endTime"],
      });
    }
    
    // 如果有填寫結束時間，必須確保結束日期也有填寫
    if (!data.endDate && data.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "已填寫結束時間時，結束日期為必填",
        path: ["endDate"],
      });
    }
    
    // 如果開始和結束日期時間都存在，確保結束時間在開始時間之後
    if (data.scheduleDate && data.scheduleTime && data.endDate && data.endTime) {
      const startDateTime = new Date(`${data.scheduleDate}T${data.scheduleTime}`);
      const endDateTime = new Date(`${data.endDate}T${data.endTime}`);
      
      if (endDateTime <= startDateTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "結束時間必須晚於開始時間",
          path: ["endTime"],
        });
      }
    }
  }
});

type FormValues = z.infer<typeof formSchema>;

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: Post;
}

const CreatePostModal = ({ isOpen, onClose, post }: CreatePostModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedMediaType, setUploadedMediaType] = useState<"image" | "video" | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get active page from context
  const { activePageData } = usePageContext();
  
  // Function to upload media to Cloudinary
  const uploadMedia = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append("media", file);
      
      // Create a custom fetch with upload progress
      const xhr = new XMLHttpRequest();
      
      // Set up progress monitoring
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      });
      
      // Return a promise that resolves when the upload is complete
      const response = await new Promise<any>((resolve, reject) => {
        xhr.open("POST", "/api/upload");
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(formData);
      });
      
      // Handle successful upload
      if (response.success) {
        toast({
          title: "上傳成功",
          description: "媒體上傳成功",
        });
        
        // Set the uploaded media URL in the form
        form.setValue("imageUrl", response.mediaUrl);
        form.setValue("hasImage", true);
        
        // Set media preview
        setMediaPreview(response.mediaUrl);
        setUploadedMediaType(response.fileType);
        
        return response.mediaUrl;
      } else {
        throw new Error(response.message || "上傳失敗");
      }
    } catch (error) {
      toast({
        title: "上傳失敗",
        description: error instanceof Error ? error.message : "媒體上傳失敗",
        variant: "destructive",
      });
      console.error("Upload error:", error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handler for file input change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check file type and size
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      
      if (!isImage && !isVideo) {
        toast({
          title: "檔案類型無效",
          description: "請上傳圖片或視頻檔案",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (limit to 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast({
          title: "檔案太大",
          description: "請上傳小於 10MB 的檔案",
          variant: "destructive",
        });
        return;
      }
      
      // Upload the file
      await uploadMedia(file);
    }
  };
  
  // Function to trigger file input click
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pageId: post?.pageId || activePageData?.pageId || "page_123456", // 確保一定有頁面ID
      content: post?.content || "",
      status: post?.status || "draft",
      scheduledTime: post?.scheduledTime ? new Date(post.scheduledTime) : undefined,
      imageUrl: post?.imageUrl || "",
      linkUrl: post?.linkUrl || "",
      linkTitle: post?.linkTitle || "",
      linkDescription: post?.linkDescription || "",
      linkImageUrl: post?.linkImageUrl || "",
      schedulePost: post?.scheduledTime ? true : false,
      scheduleDate: post?.scheduledTime ? new Date(post.scheduledTime).toISOString().split('T')[0] : "",
      scheduleTime: post?.scheduledTime ? new Date(post.scheduledTime).toTimeString().split(' ')[0].substring(0, 5) : "",
      endDate: post?.endTime ? new Date(post.endTime).toISOString().split('T')[0] : "",
      endTime: post?.endTime ? new Date(post.endTime).toTimeString().split(' ')[0].substring(0, 5) : "",
      hasImage: !!post?.imageUrl,
      hasLink: post ? !!post.linkUrl : false,
      multiPlatform: true,
      category: post?.category as "promotion" | "event" | "announcement" | undefined,
      platformContent: post?.platformContent || {
        fb: '',
        ig: '',
        tiktok: '',
        threads: '',
        x: ''
      },
      platformStatus: post?.platformStatus || {
        fb: true,
        ig: false,
        tiktok: false,
        threads: false,
        x: false
      },
    },
  });
  
  // Update form values when active page changes
  useEffect(() => {
    if (activePageData && !form.getValues().pageId) {
      form.setValue("pageId", activePageData.pageId);
    }
  }, [activePageData, form]);
  
  // 當 post 變更時重置表單
  useEffect(() => {
    console.log("選中的貼文變更:", post);
    
    // 清空媒體預覽
    setMediaPreview(null);
    setUploadedMediaType(null);
    
    // 根據 post 重設所有表單值
    form.reset({
      pageId: post?.pageId || activePageData?.pageId || "page_123456",
      content: post?.content || "",
      status: post?.status || "draft",
      scheduledTime: post?.scheduledTime ? new Date(post.scheduledTime) : undefined,
      imageUrl: post?.imageUrl || "",
      linkUrl: post?.linkUrl || "",
      linkTitle: post?.linkTitle || "",
      linkDescription: post?.linkDescription || "",
      linkImageUrl: post?.linkImageUrl || "",
      schedulePost: post?.scheduledTime ? true : false,
      scheduleDate: post?.scheduledTime ? new Date(post.scheduledTime).toISOString().split('T')[0] : "",
      scheduleTime: post?.scheduledTime ? new Date(post.scheduledTime).toTimeString().split(' ')[0].substring(0, 5) : "",
      endDate: post?.endTime ? new Date(post.endTime).toISOString().split('T')[0] : "",
      endTime: post?.endTime ? new Date(post.endTime).toTimeString().split(' ')[0].substring(0, 5) : "",
      hasImage: !!post?.imageUrl,
      hasLink: post ? !!post.linkUrl : false,
      multiPlatform: true,
      category: post?.category as "promotion" | "event" | "announcement" | undefined,
      platformContent: post?.platformContent || {
        fb: '',
        ig: '',
        tiktok: '',
        threads: '',
        x: ''
      },
      platformStatus: post?.platformStatus || {
        fb: true,
        ig: false,
        tiktok: false,
        threads: false,
        x: false
      },
    });
    
    // 初始化媒體預覽
    if (post?.imageUrl) {
      setMediaPreview(post.imageUrl);
      // 嘗試確定是圖片還是視頻
      const fileExtension = post.imageUrl.split('.').pop()?.toLowerCase();
      const videoExtensions = ['mp4', 'mov', 'avi', 'webm'];
      setUploadedMediaType(videoExtensions.includes(fileExtension || '') ? 'video' : 'image');
    }
  }, [post, activePageData, form]);
  
  // 監聽模態框的開關狀態，當打開時檢查是否需要重置表單
  const [previousIsOpen, setPreviousIsOpen] = useState(false);
  
  useEffect(() => {
    // 如果從關閉狀態變為打開狀態
    if (isOpen && !previousIsOpen) {
      // 如果是新建貼文（沒有選定的post）
      if (!post) {
        console.log("打開新建貼文模態框，重置表單");
        
        // 清空媒體預覽
        setMediaPreview(null);
        setUploadedMediaType(null);
        
        // 重置表單所有字段為默認值
        form.reset({
          pageId: activePageData?.pageId || "page_123456",
          content: "",
          status: "draft",
          scheduledTime: undefined,
          imageUrl: "",
          linkUrl: "",
          linkTitle: "",
          linkDescription: "",
          linkImageUrl: "",
          schedulePost: false,
          scheduleDate: "",
          scheduleTime: "",
          endDate: "",
          endTime: "",
          hasImage: false,
          hasLink: false,
          multiPlatform: true,
          category: undefined,
          platformContent: {
            fb: '',
            ig: '',
            tiktok: '',
            threads: '',
            x: ''
          },
          platformStatus: {
            fb: true,
            ig: true,
            tiktok: true,
            threads: true,
            x: true
          },
        });
      }
    }
    
    // 更新先前的開啟狀態
    setPreviousIsOpen(isOpen);
  }, [isOpen, post, form, activePageData]);

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // 計算結束時間
      let endTime = null;
      if (values.schedulePost && values.endDate && values.endTime) {
        const endTimeDate = new Date(`${values.endDate}T${values.endTime}`);
        endTime = endTimeDate.toISOString(); // 轉換為ISO字符串
      }
      
      // 檢查 pageId 是否有效
      if (!values.pageId) {
        throw new Error("請選擇一個頁面來發布貼文");
      }
      
      // 處理日期對象 - 使用ISO字符串格式
      let scheduledTimeValue = null;
      if (values.schedulePost && values.scheduleDate && values.scheduleTime) {
        const scheduledDate = new Date(`${values.scheduleDate}T${values.scheduleTime}`);
        scheduledTimeValue = scheduledDate.toISOString(); // 轉換為ISO字符串
      }
      
      console.log("排程時間ISO:", scheduledTimeValue, "結束時間ISO:", endTime);
      
      const postData = {
        pageId: values.pageId,
        content: values.content,
        status: values.schedulePost ? "scheduled" : values.status,
        category: values.category || null,
        scheduledTime: scheduledTimeValue, // 使用ISO字符串
        endTime: endTime, // 使用ISO字符串
        imageUrl: values.hasImage ? values.imageUrl : null,
        linkUrl: values.hasLink ? values.linkUrl : null,
        linkTitle: values.hasLink ? values.linkTitle : null,
        linkDescription: values.hasLink ? values.linkDescription : null,
        linkImageUrl: values.hasLink ? values.linkImageUrl : null,
        platformContent: values.multiPlatform ? values.platformContent : null,
        platformStatus: values.multiPlatform ? values.platformStatus : null,
      };
      
      console.log(`Creating post for page: ${values.pageId}`);
      console.log("Post data being sent:", JSON.stringify(postData, null, 2));
      // 修改URL格式，確保與伺服器路由匹配
      return apiRequest(`/api/pages/${values.pageId}/posts`, { method: "POST", data: postData });
    },
    onSuccess: () => {
      toast({
        title: "成功",
        description: "成功創建貼文！",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${form.getValues().pageId}/posts`] });
      onClose();
    },
    onError: (error) => {
      let errorMessage = "創建貼文失敗。請再試一次。";
      let errorTitle = "錯誤";
      
      if (error instanceof Error) {
        // 檢查是否有擴展錯誤屬性
        const extError = error as any;
        
        if (extError.friendlyMessage) {
          // 使用我們的友好錯誤信息
          errorMessage = extError.friendlyMessage;
        } else if (extError.message) {
          // 使用錯誤消息
          errorMessage = extError.message;
        }
        
        // 添加HTTP狀態碼到標題（如果有）
        if (extError.status) {
          errorTitle = `錯誤 ${extError.status}`;
          
          // 針對特定錯誤碼提供更具體的說明
          if (extError.status === 404) {
            errorTitle = "找不到資源";
            if (!extError.friendlyMessage) {
              errorMessage = "請求的頁面或資源不存在。請確認頁面ID是否正確。";
            }
          } else if (extError.status === 401) {
            errorTitle = "需要登錄";
          } else if (extError.status === 403) {
            errorTitle = "權限不足";
          } else if (extError.status === 500) {
            errorTitle = "伺服器錯誤";
          }
        }
      } else if (typeof error === 'object' && error !== null) {
        // 嘗試從錯誤響應中獲取更多信息
        const errorObj = error as any;
        if (errorObj.message) {
          errorMessage = errorObj.message;
        } else if (errorObj.status === 404) {
          errorTitle = "找不到資源";
          errorMessage = "找不到指定的頁面。請確認頁面ID是否正確。";
        } else if (errorObj.statusText) {
          errorMessage = `錯誤: ${errorObj.statusText}`;
          if (errorObj.status) {
            errorTitle = `錯誤 ${errorObj.status}`;
          }
        }
      }
      
      // 顯示紅色提示通知
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      
      // 記錄原始錯誤到控制台以便調試
      console.error("Failed to create post:", error);
    },
  });

  // Update post mutation
  const updatePostMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!post) return;
      
      // 計算結束時間 - 使用ISO字符串格式
      let endTime = null;
      if (values.schedulePost && values.endDate && values.endTime) {
        const endTimeDate = new Date(`${values.endDate}T${values.endTime}`);
        endTime = endTimeDate.toISOString(); // 轉換為ISO字符串
      }
      
      // 準備排程時間（如果需要）- 使用ISO字符串格式
      let scheduledTimeValue = null;
      if (values.schedulePost && values.scheduleDate && values.scheduleTime) {
        const scheduledDate = new Date(`${values.scheduleDate}T${values.scheduleTime}`);
        scheduledTimeValue = scheduledDate.toISOString(); // 轉換為ISO字符串
      }
      
      console.log("更新貼文 - 排程時間ISO:", scheduledTimeValue, "結束時間ISO:", endTime);
      
      const postData = {
        content: values.content,
        status: values.schedulePost ? "scheduled" : values.status,
        category: values.category || null,
        scheduledTime: scheduledTimeValue, // 使用ISO字符串
        endTime: endTime, // 使用ISO字符串
        imageUrl: values.hasImage ? values.imageUrl : null,
        linkUrl: values.hasLink ? values.linkUrl : null,
        linkTitle: values.hasLink ? values.linkTitle : null,
        linkDescription: values.hasLink ? values.linkDescription : null,
        linkImageUrl: values.hasLink ? values.linkImageUrl : null,
        platformContent: values.multiPlatform ? values.platformContent : null,
        platformStatus: values.multiPlatform ? values.platformStatus : null,
      };
      
      return apiRequest(`/api/posts/${post.id}`, { method: "PATCH", data: postData });
    },
    onSuccess: () => {
      toast({
        title: "成功",
        description: "成功更新貼文！",
      });
      // 立即刷新貼文列表和日曆數據
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${post?.pageId}/posts`] });
      // 稍微延遲後再次刷新以確保獲取最新數據
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [`/api/pages/${post?.pageId}/posts`] });
      }, 500);
      onClose();
    },
    onError: (error) => {
      let errorMessage = "更新貼文失敗。請再試一次。";
      let errorTitle = "錯誤";
      
      if (error instanceof Error) {
        // 檢查是否有擴展錯誤屬性
        const extError = error as any;
        
        if (extError.friendlyMessage) {
          // 使用我們的友好錯誤信息
          errorMessage = extError.friendlyMessage;
        } else if (extError.message) {
          // 使用錯誤消息
          errorMessage = extError.message;
        }
        
        // 添加HTTP狀態碼到標題（如果有）
        if (extError.status) {
          errorTitle = `錯誤 ${extError.status}`;
          
          // 針對特定錯誤碼提供更具體的說明
          if (extError.status === 404) {
            errorTitle = "找不到資源";
            if (!extError.friendlyMessage) {
              errorMessage = "請求的貼文不存在。可能已被刪除。";
            }
          } else if (extError.status === 401) {
            errorTitle = "需要登錄";
          } else if (extError.status === 403) {
            errorTitle = "權限不足";
          } else if (extError.status === 500) {
            errorTitle = "伺服器錯誤";
          }
        }
      }
      
      // 顯示紅色提示通知
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      
      console.error("Failed to update post:", error);
    },
  });

  const onSubmit = (values: FormValues) => {
    try {
      // 確保必要欄位存在
      if (!values.content?.trim()) {
        toast({
          title: "錯誤",
          description: "請輸入貼文內容",
          variant: "destructive",
        });
        return;
      }
      
      // 檢查是否已選擇貼文類別 - 針對排程貼文必須選擇類別
      if ((values.schedulePost || values.status === 'published') && !values.category) {
        toast({
          title: "錯誤",
          description: "請選擇貼文類別（宣傳、活動或公告）",
          variant: "destructive",
        });
        return;
      }

      // 確保多平台設置的數據格式正確
      if (values.multiPlatform) {
        if (!values.platformContent || !values.platformStatus) {
          // 初始化預設值
          values.platformContent = values.platformContent || {
            fb: values.content,
            ig: values.content,
            tiktok: values.content,
            threads: values.content,
            x: values.content
          };
          
          values.platformStatus = values.platformStatus || {
            fb: true,
            ig: true,
            tiktok: true,
            threads: true,
            x: true
          };
        }
      }

      console.log("提交表單:", values);
      
      if (post) {
        updatePostMutation.mutate(values);
      } else {
        createPostMutation.mutate(values);
      }
    } catch (error) {
      console.error("表單提交錯誤:", error);
      toast({
        title: "錯誤",
        description: "表單提交過程中發生錯誤，請檢查您的輸入並再試一次",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-auto max-h-[90vh]">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-xl font-bold text-center">
            {post ? "編輯貼文" : "建立新貼文"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {post ? "在此編輯您的貼文內容" : "在此創建您的新貼文"}
          </DialogDescription>
        </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 flex flex-col">
              <div className="p-4 flex-1">
                <div className="flex items-center mb-4">
                  <img 
                    src={activePageData?.picture || "https://via.placeholder.com/40"} 
                    alt="Page profile" 
                    className="w-10 h-10 rounded-full mr-3" 
                  />
                  <div className="flex flex-col">
                    <div className="font-semibold text-[15px]">{activePageData?.pageName || "選擇粉絲頁"}</div>
                    {form.watch("schedulePost") && (
                      <div className="text-xs flex items-center text-gray-600 mt-0.5">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>排程: {form.watch("scheduleDate")} {form.watch("scheduleTime")}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea 
                          placeholder={`${activePageData?.pageName || "你"}在想什麼？`}
                          className="resize-vertical min-h-[300px] text-lg border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-2 w-full bg-white rounded-md shadow-sm"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            // 如果多平台功能已開啟，將主內容同步到所有平台
                            if (form.watch("multiPlatform")) {
                              const mainContent = e.target.value;
                              const currentPlatformContents = form.getValues("platformContent") || {};
                              
                              // 確保所有平台都有內容
                              if (typeof currentPlatformContents === 'object' && currentPlatformContents !== null) {
                                // 指定平台鍵以避免TypeScript錯誤
                                // 定義平台列表
                                const platforms = ['fb', 'ig', 'tiktok', 'threads', 'x'] as const;
                                
                                // 針對每個平台更新內容
                                platforms.forEach(platform => {
                                  // 安全地訪問屬性，使用類型斷言避免 TypeScript 錯誤
                                  const platformContent = (currentPlatformContents as Record<string, string | undefined>)[platform];
                                  // 只更新空白或與主內容相同的平台內容
                                  if (!platformContent || platformContent === field.value) {
                                    form.setValue(`platformContent.${platform}`, mainContent);
                                  }
                                });
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Media Preview Section - Simplified UI similar to Facebook */}
                {mediaPreview && (
                  <div className="mt-3 relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <div className="absolute top-2 right-2 z-10">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-gray-800/60 hover:bg-gray-800/80 text-white"
                        onClick={() => {
                          form.setValue("imageUrl", "");
                          form.setValue("hasImage", false);
                          setMediaPreview(null);
                          setUploadedMediaType(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {uploadedMediaType === "image" ? (
                      <img 
                        src={mediaPreview} 
                        alt="Preview" 
                        className="w-full h-auto max-h-[300px] object-contain"
                      />
                    ) : (
                      <video 
                        src={mediaPreview} 
                        className="w-full h-auto max-h-[300px] object-contain"
                        controls
                      />
                    )}
                  </div>
                )}
                

              </div>
              
              {/* Color Background Options (similar to Facebook) */}
              <div className="hidden px-4">
                <div className="flex space-x-2 overflow-x-auto py-2">
                  {["bg-white", "bg-gradient-to-br from-pink-500 to-orange-400", "bg-gradient-to-br from-purple-500 to-blue-500", "bg-gradient-to-br from-yellow-400 to-orange-500", "bg-gradient-to-br from-green-400 to-blue-500"].map((bgColor, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`w-12 h-12 rounded-lg border-2 ${index === 0 ? 'border-blue-500' : 'border-transparent'} flex-shrink-0 ${bgColor}`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Tools Section - Facebook style */}
              <div className="px-4">
                <div className="border border-gray-200 rounded-lg p-1">
                  <div className="text-sm font-medium text-gray-600 mb-2 px-2">添加到你的貼文</div>
                  <div className="flex flex-wrap">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className={`flex items-center justify-start rounded-md h-10 px-3 ${form.watch("hasImage") ? "text-green-600" : "text-gray-700"}`}
                      onClick={() => {
                        if (!form.watch("hasImage")) {
                          form.setValue("hasImage", true);
                          setTimeout(() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.click();
                            }
                          }, 100);
                        } else {
                          form.setValue("hasImage", false);
                        }
                      }}
                    >
                      <ImageIcon className="h-5 w-5 mr-2" />
                      <span>照片/影片</span>
                    </Button>
                    

                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="flex items-center justify-start rounded-md h-10 px-3 text-yellow-600"
                      onClick={() => {
                        form.setValue("schedulePost", !form.watch("schedulePost"));
                        if (!form.watch("schedulePost") && !form.watch("scheduleDate")) {
                          // Set default date to tomorrow
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          form.setValue("scheduleDate", tomorrow.toISOString().split('T')[0]);
                          form.setValue("scheduleTime", "12:00");
                        }
                      }}
                    >
                      <Calendar className="h-5 w-5 mr-2" />
                      <span>設定提醒</span>
                    </Button>
                  </div>
                  
                  <input
                    type="file"
                    id="media-upload"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                </div>
              </div>
              
              {/* Upload Progress */}
              {isUploading && (
                <div className="px-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm font-medium">正在上傳媒體...</span>
                  </div>
                  <Progress value={uploadProgress} className="h-1 w-full" />
                </div>
              )}
              
              {/* Hidden Forms */}
              <div className="hidden">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <Input {...field} value={field.value || ''} />
                  )}
                />
              </div>
              
              {/* Multi-Platform Panel */}
              <div className="px-4 py-2 border-t border-gray-200">
                <div className="flex items-center mb-2 justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <Share className="h-5 w-5 mr-2 text-red-500" />
                      <h4 className="font-medium">多平台設置</h4>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 ml-7">
                      <Info className="h-3 w-3 inline mr-1" />
                      這裡可讓您調整每個社群平台的文字內容，預設全部開啟，您可隨時修改各平台的專屬內容。儲存為草稿或排程時系統會為所有選取的平台保存內容。
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          form.setValue("platformStatus", {
                            fb: true,
                            ig: true,
                            tiktok: true,
                            threads: true,
                            x: true
                          });
                        }}
                      >
                        全部開啟
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          form.setValue("platformStatus", {
                            fb: false,
                            ig: false,
                            tiktok: false,
                            threads: false,
                            x: false
                          });
                        }}
                      >
                        全部關閉
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 mb-4">
                    <div 
                      className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer border ${form.watch("platformStatus.fb") ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
                      onClick={() => {
                        const currentStatus = form.watch("platformStatus.fb");
                        form.setValue("platformStatus.fb", !currentStatus);
                      }}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${form.watch("platformStatus.fb") ? "bg-blue-500 text-white" : "bg-gray-100"}`}>
                        <span className="text-xl font-bold">f</span>
                      </div>
                      <span className="mt-1 text-xs">Facebook</span>
                    </div>
                    
                    <div 
                      className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer border ${form.watch("platformStatus.ig") ? "border-purple-500 bg-purple-50" : "border-gray-200"}`}
                      onClick={() => {
                        const currentStatus = form.watch("platformStatus.ig");
                        form.setValue("platformStatus.ig", !currentStatus);
                      }}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${form.watch("platformStatus.ig") ? "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white" : "bg-gray-100"}`}>
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="mt-1 text-xs">Instagram</span>
                    </div>
                    
                    <div 
                      className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer border ${form.watch("platformStatus.tiktok") ? "border-black bg-gray-50" : "border-gray-200"}`}
                      onClick={() => {
                        const currentStatus = form.watch("platformStatus.tiktok");
                        form.setValue("platformStatus.tiktok", !currentStatus);
                      }}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${form.watch("platformStatus.tiktok") ? "bg-black text-white" : "bg-gray-100"}`}>
                        <MusicIcon className="w-5 h-5" />
                      </div>
                      <span className="mt-1 text-xs">TikTok</span>
                    </div>
                    
                    <div 
                      className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer border ${form.watch("platformStatus.threads") ? "border-gray-900 bg-gray-50" : "border-gray-200"}`}
                      onClick={() => {
                        const currentStatus = form.watch("platformStatus.threads");
                        form.setValue("platformStatus.threads", !currentStatus);
                      }}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${form.watch("platformStatus.threads") ? "bg-gray-900 text-white" : "bg-gray-100"}`}>
                        <AtSign className="w-5 h-5" />
                      </div>
                      <span className="mt-1 text-xs">Threads</span>
                    </div>
                    
                    <div 
                      className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer border ${form.watch("platformStatus.x") ? "border-gray-800 bg-gray-50" : "border-gray-200"}`}
                      onClick={() => {
                        const currentStatus = form.watch("platformStatus.x");
                        form.setValue("platformStatus.x", !currentStatus);
                      }}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${form.watch("platformStatus.x") ? "bg-gray-800 text-white" : "bg-gray-100"}`}>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                        </svg>
                      </div>
                      <span className="mt-1 text-xs">X</span>
                    </div>
                  </div>
                  
                  <Tabs defaultValue="fb" className="w-full mb-4">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="fb" disabled={!form.watch("platformStatus.fb")}>FB</TabsTrigger>
                      <TabsTrigger value="ig" disabled={!form.watch("platformStatus.ig")}>IG</TabsTrigger>
                      <TabsTrigger value="tiktok" disabled={!form.watch("platformStatus.tiktok")}>TikTok</TabsTrigger>
                      <TabsTrigger value="threads" disabled={!form.watch("platformStatus.threads")}>Threads</TabsTrigger>
                      <TabsTrigger value="x" disabled={!form.watch("platformStatus.x")}>X</TabsTrigger>
                    </TabsList>
                    <TabsContent value="fb">
                      <div className="border rounded-md p-3 mt-2">
                        <FormField
                          control={form.control}
                          name="platformContent.fb"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Facebook 內容</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="請輸入 Facebook 專用內容..."
                                  className="min-h-[220px] resize-vertical w-full bg-white border-0 rounded-md shadow-sm p-3"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                若不填寫則使用主要內容
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="ig">
                      <div className="border rounded-md p-3 mt-2">
                        <FormField
                          control={form.control}
                          name="platformContent.ig"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Instagram 內容</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="請輸入 Instagram 專用內容..."
                                  className="min-h-[220px] resize-vertical w-full bg-white border-0 rounded-md shadow-sm p-3"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                應使用多個標籤，建議不超過 30 個標籤
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="tiktok">
                      <div className="border rounded-md p-3 mt-2">
                        <FormField
                          control={form.control}
                          name="platformContent.tiktok"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>TikTok 內容</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="請輸入 TikTok 專用內容..."
                                  className="min-h-[220px] resize-vertical w-full bg-white border-0 rounded-md shadow-sm p-3"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                建議使用活潑生動的文字和流行標籤
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="threads">
                      <div className="border rounded-md p-3 mt-2">
                        <FormField
                          control={form.control}
                          name="platformContent.threads"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Threads 內容</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="請輸入 Threads 專用內容..."
                                  className="min-h-[220px] resize-vertical w-full bg-white border-0 rounded-md shadow-sm p-3"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                簡短有力的文字更適合 Threads 平台
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="x">
                      <div className="border rounded-md p-3 mt-2">
                        <FormField
                          control={form.control}
                          name="platformContent.x"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>X 內容</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="請輸入 X (Twitter) 專用內容..."
                                  className="min-h-[220px] resize-vertical w-full bg-white border-0 rounded-md shadow-sm p-3"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                字數限制為 280 字元
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              
              {/* Schedule Panel */}
              {form.watch("schedulePost") && (
                <div className="px-4 py-2 border-t border-gray-200">
                  <div className="flex items-center mb-2">
                    <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                    <h4 className="font-medium">設定發佈提醒時間</h4>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    <Info className="h-3 w-3 inline mr-1" />
                    系統將在設定的時間提醒您發佈貼文，而非自動發佈。您將會在設定時間的前一天收到通知，並在發佈日當天再次收到提醒。
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-1">開始時間：</div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="scheduleDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <Calendar className="h-4 w-4 absolute left-3 top-2.5 text-gray-500 z-10" />
                                <div className="flex">
                                  <Input 
                                    type="date" 
                                    {...field} 
                                    value={field.value || ''} 
                                    className="pl-9 rounded-r-none"
                                  />
                                  <Button 
                                    type="button"
                                    variant="outline" 
                                    className="rounded-l-none border-l-0 text-blue-600 hover:bg-blue-50"
                                    onClick={() => {
                                      const today = new Date().toISOString().split('T')[0];
                                      field.onChange(today);
                                    }}
                                  >
                                    今天
                                  </Button>
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="scheduleTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <Clock className="h-4 w-4 absolute left-3 top-2.5 text-gray-500" />
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full pl-9 flex justify-between items-center gap-2 h-10">
                                      {field.value || '選擇時間'}
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="w-48 max-h-60 overflow-y-auto">
                                    <div className="py-2 px-3 border-b border-gray-100 flex justify-end">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                        onClick={() => {
                                          const now = new Date();
                                          const hours = now.getHours().toString().padStart(2, '0');
                                          const minutes = Math.floor(now.getMinutes() / 30) * 30;
                                          const timeValue = `${hours}:${minutes.toString().padStart(2, '0')}`;
                                          field.onChange(timeValue);
                                        }}
                                      >
                                        現在
                                      </Button>
                                    </div>
                                    {Array.from({ length: 24 }).map((_, hour) => (
                                      <React.Fragment key={hour}>
                                        {[0, 30].map(minute => {
                                          const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                                          return (
                                            <DropdownMenuItem 
                                              key={timeValue}
                                              onClick={() => field.onChange(timeValue)}
                                              className={field.value === timeValue ? "bg-blue-100" : ""}
                                            >
                                              {timeValue}
                                            </DropdownMenuItem>
                                          );
                                        })}
                                      </React.Fragment>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600 mb-1">結束時間 (選填)：</div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <Calendar className="h-4 w-4 absolute left-3 top-2.5 text-gray-500 z-10" />
                                <div className="flex">
                                  <Input 
                                    type="date" 
                                    {...field} 
                                    value={field.value || ''} 
                                    className="pl-9 rounded-r-none"
                                  />
                                  <Button 
                                    type="button"
                                    variant="outline" 
                                    className="rounded-l-none border-l-0 text-blue-600 hover:bg-blue-50"
                                    onClick={() => {
                                      const today = new Date().toISOString().split('T')[0];
                                      field.onChange(today);
                                    }}
                                  >
                                    今天
                                  </Button>
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <Clock className="h-4 w-4 absolute left-3 top-2.5 text-gray-500" />
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full pl-9 flex justify-between items-center gap-2 h-10">
                                      {field.value || '選擇時間'}
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="w-48 max-h-60 overflow-y-auto">
                                    <div className="py-2 px-3 border-b border-gray-100 flex justify-end">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                        onClick={() => {
                                          const now = new Date();
                                          const hours = now.getHours().toString().padStart(2, '0');
                                          const minutes = Math.floor(now.getMinutes() / 30) * 30;
                                          const timeValue = `${hours}:${minutes.toString().padStart(2, '0')}`;
                                          field.onChange(timeValue);
                                        }}
                                      >
                                        現在
                                      </Button>
                                    </div>
                                    {Array.from({ length: 24 }).map((_, hour) => (
                                      <React.Fragment key={hour}>
                                        {[0, 30].map(minute => {
                                          const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                                          return (
                                            <DropdownMenuItem 
                                              key={timeValue}
                                              onClick={() => field.onChange(timeValue)}
                                              className={field.value === timeValue ? "bg-blue-100" : ""}
                                            >
                                              {timeValue}
                                            </DropdownMenuItem>
                                          );
                                        })}
                                      </React.Fragment>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Category Panel */}
              <div className="px-4 py-2 border-t border-gray-200">
                <div className="flex items-center mb-2">
                  <FileBadge className="h-5 w-5 mr-2 text-purple-500" />
                  <h4 className="font-medium">貼文類別</h4>
                </div>
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="promotion" id="promotion" />
                            <Label htmlFor="promotion" className="text-sm font-medium">宣傳</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="event" id="event" />
                            <Label htmlFor="event" className="text-sm font-medium">活動</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="announcement" id="announcement" />
                            <Label htmlFor="announcement" className="text-sm font-medium">公告</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Multi-Platform Panel 2 */}
                <div className="px-4 py-2 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <Share className="h-5 w-5 mr-2 text-red-500" />
                      <h4 className="font-medium">多平台發佈設定</h4>
                    </div>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => {
                        // 一鍵全開或全關
                        const allEnabled = form.watch("platformStatus.fb") && 
                                           form.watch("platformStatus.ig") && 
                                           form.watch("platformStatus.tiktok") && 
                                           form.watch("platformStatus.threads") && 
                                           form.watch("platformStatus.x");
                        
                        if (allEnabled) {
                          // 如果全部已開啟，則全部關閉
                          form.setValue("platformStatus.fb", false);
                          form.setValue("platformStatus.ig", false);
                          form.setValue("platformStatus.tiktok", false);
                          form.setValue("platformStatus.threads", false);
                          form.setValue("platformStatus.x", false);
                        } else {
                          // 否則全部開啟
                          form.setValue("platformStatus.fb", true);
                          form.setValue("platformStatus.ig", true);
                          form.setValue("platformStatus.tiktok", true);
                          form.setValue("platformStatus.threads", true);
                          form.setValue("platformStatus.x", true);
                        }
                      }}
                    >
                      {(form.watch("platformStatus.fb") && 
                        form.watch("platformStatus.ig") && 
                        form.watch("platformStatus.tiktok") && 
                        form.watch("platformStatus.threads") && 
                        form.watch("platformStatus.x")) 
                          ? "全部關閉" : "全部開啟"}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                          <span className="text-white font-semibold">f</span>
                        </div>
                        <span className="font-medium">Facebook</span>
                      </div>
                      <FormField
                        control={form.control}
                        name="platformStatus.fb"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center mr-3">
                          <Camera className="text-white h-4 w-4" />
                        </div>
                        <span className="font-medium">Instagram</span>
                      </div>
                      <FormField
                        control={form.control}
                        name="platformStatus.ig"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center mr-3">
                          <span className="text-white font-semibold">𝕏</span>
                        </div>
                        <span className="font-medium">X (Twitter)</span>
                      </div>
                      <FormField
                        control={form.control}
                        name="platformStatus.x"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center mr-3">
                          <MessageCircle className="text-white h-4 w-4" />
                        </div>
                        <span className="font-medium">Threads</span>
                      </div>
                      <FormField
                        control={form.control}
                        name="platformStatus.threads"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between pb-2">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center mr-3">
                          <MusicIcon className="text-white h-4 w-4" />
                        </div>
                        <span className="font-medium">TikTok</span>
                      </div>
                      <FormField
                        control={form.control}
                        name="platformStatus.tiktok"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    <Info className="h-3 w-3 inline mr-1" />
                    選擇要發佈的平台。每個平台可以有不同的內容，預設與主貼文內容相同。如不需要修改，可保留空白。
                  </div>
                  
                  <div className="mt-3">
                    <Tabs defaultValue="fb" className="w-full">
                      <TabsList className="w-full grid grid-cols-5">
                        <TabsTrigger value="fb" className="text-xs">FB</TabsTrigger>
                        <TabsTrigger value="ig" className="text-xs">IG</TabsTrigger>
                        <TabsTrigger value="tiktok" className="text-xs">TikTok</TabsTrigger>
                        <TabsTrigger value="threads" className="text-xs">Threads</TabsTrigger>
                        <TabsTrigger value="x" className="text-xs">X</TabsTrigger>
                      </TabsList>
                      <TabsContent value="fb">
                        <FormField
                          control={form.control}
                          name="platformContent.fb"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea 
                                  placeholder="Facebook 專屬內容（如不填則使用主貼文內容）" 
                                  {...field}
                                  value={field.value || ''}
                                  className="resize-vertical min-h-[140px] mt-2"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      <TabsContent value="ig">
                        <FormField
                          control={form.control}
                          name="platformContent.ig"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea 
                                  placeholder="Instagram 專屬內容（如不填則使用主貼文內容）" 
                                  {...field}
                                  value={field.value || ''}
                                  className="resize-vertical min-h-[140px] mt-2"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      <TabsContent value="tiktok">
                        <FormField
                          control={form.control}
                          name="platformContent.tiktok"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea 
                                  placeholder="TikTok 專屬內容（如不填則使用主貼文內容）" 
                                  {...field}
                                  value={field.value || ''}
                                  className="resize-vertical min-h-[140px] mt-2"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      <TabsContent value="threads">
                        <FormField
                          control={form.control}
                          name="platformContent.threads"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea 
                                  placeholder="Threads 專屬內容（如不填則使用主貼文內容）" 
                                  {...field}
                                  value={field.value || ''}
                                  className="resize-vertical min-h-[140px] mt-2"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      <TabsContent value="x">
                        <FormField
                          control={form.control}
                          name="platformContent.x"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea 
                                  placeholder="X (Twitter) 專屬內容（如不填則使用主貼文內容）" 
                                  {...field}
                                  value={field.value || ''}
                                  className="resize-vertical min-h-[140px] mt-2"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              

              
              {/* Footer Actions */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 mt-auto sticky bottom-0 z-10">
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onClose}
                    disabled={createPostMutation.isPending || updatePostMutation.isPending}
                    className="text-gray-700 hover:text-gray-900"
                  >
                    取消
                  </Button>
                  
                  {/* 若是編輯已存在的貼文，顯示「立即發布」按鈕 */}
                  {post && post.status === "scheduled" && (
                    <Button 
                      type="button" 
                      onClick={() => {
                        const values = form.getValues();
                        // 不直接設置publishedTime，而是通過後端邏輯處理
                        updatePostMutation.mutate({
                          ...values,
                          status: "published"
                        });
                      }}
                      disabled={createPostMutation.isPending || updatePostMutation.isPending || !form.watch("content")}
                      className="bg-green-600 hover:bg-green-700 flex items-center"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      立即發佈
                    </Button>
                  )}
                  
                  <Button 
                    type="submit" 
                    disabled={createPostMutation.isPending || updatePostMutation.isPending || !form.watch("content")}
                    className={`${form.watch("schedulePost") ? "bg-blue-600 hover:bg-blue-700" : (post?.status === "draft" ? "bg-gray-600 hover:bg-gray-700" : "bg-blue-600 hover:bg-blue-700")}`}
                  >
                    {createPostMutation.isPending || updatePostMutation.isPending ? (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        處理中...
                      </div>
                    ) : (
                      post 
                        ? "更新貼文" 
                        : (form.watch("schedulePost") 
                          ? "排程發佈" 
                          : (form.watch("status") === "draft" ? "儲存草稿" : "立即發佈"))
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;
