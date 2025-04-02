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
  ChevronDown
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import PostEditor from "./PostEditor";

// Extended schema for the form
const formSchema = insertPostSchema.extend({
  schedulePost: z.boolean().default(false),
  multiPlatform: z.boolean().default(false),
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
      pageId: activePageData?.pageId || "",
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
      hasLink: !!post?.linkUrl,
      multiPlatform: false,
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
  
  // Initialize media preview if post has an image
  useEffect(() => {
    if (post?.imageUrl) {
      setMediaPreview(post.imageUrl);
      // Try to determine if it's an image or video based on file extension
      const fileExtension = post.imageUrl.split('.').pop()?.toLowerCase();
      const videoExtensions = ['mp4', 'mov', 'avi', 'webm'];
      setUploadedMediaType(videoExtensions.includes(fileExtension || '') ? 'video' : 'image');
    }
  }, [post]);

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // 計算結束時間
      let endTime = null;
      if (values.schedulePost && values.endDate && values.endTime) {
        endTime = new Date(`${values.endDate}T${values.endTime}`);
      }
      
      // 檢查 pageId 是否有效
      if (!values.pageId) {
        throw new Error("請選擇一個頁面來發布貼文");
      }
      
      const postData = {
        pageId: values.pageId,
        content: values.content,
        status: values.schedulePost ? "scheduled" : values.status,
        category: values.category || null,
        scheduledTime: values.schedulePost ? new Date(`${values.scheduleDate}T${values.scheduleTime}`) : null,
        endTime,
        imageUrl: values.hasImage ? values.imageUrl : null,
        linkUrl: values.hasLink ? values.linkUrl : null,
        linkTitle: values.hasLink ? values.linkTitle : null,
        linkDescription: values.hasLink ? values.linkDescription : null,
        linkImageUrl: values.hasLink ? values.linkImageUrl : null,
        platformContent: values.multiPlatform ? values.platformContent : null,
        platformStatus: values.multiPlatform ? values.platformStatus : null,
      };
      
      console.log(`Creating post for page: ${values.pageId}`);
      return apiRequest("POST", `/api/pages/${values.pageId}/posts`, postData);
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
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "錯誤",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Failed to create post:", error);
    },
  });

  // Update post mutation
  const updatePostMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!post) return;
      
      // 計算結束時間
      let endTime = null;
      if (values.schedulePost && values.endDate && values.endTime) {
        endTime = new Date(`${values.endDate}T${values.endTime}`);
      }
      
      const postData = {
        content: values.content,
        status: values.schedulePost ? "scheduled" : values.status,
        category: values.category || null,
        scheduledTime: values.schedulePost ? new Date(`${values.scheduleDate}T${values.scheduleTime}`) : null,
        endTime,
        imageUrl: values.hasImage ? values.imageUrl : null,
        linkUrl: values.hasLink ? values.linkUrl : null,
        linkTitle: values.hasLink ? values.linkTitle : null,
        linkDescription: values.hasLink ? values.linkDescription : null,
        linkImageUrl: values.hasLink ? values.linkImageUrl : null,
        platformContent: values.multiPlatform ? values.platformContent : null,
        platformStatus: values.multiPlatform ? values.platformStatus : null,
      };
      
      return apiRequest("PATCH", `/api/posts/${post.id}`, postData);
    },
    onSuccess: () => {
      toast({
        title: "成功",
        description: "成功更新貼文！",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${post?.pageId}/posts`] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "錯誤",
        description: "更新貼文失敗。請再試一次。",
        variant: "destructive",
      });
      console.error("Failed to update post:", error);
    },
  });

  const onSubmit = (values: FormValues) => {
    if (post) {
      updatePostMutation.mutate(values);
    } else {
      createPostMutation.mutate(values);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-xl font-bold text-center">
            {post ? "編輯貼文" : "建立新貼文"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {post ? "在此編輯您的貼文內容" : "在此創建您的新貼文"}
          </DialogDescription>
        </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="p-4">
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
                          className="resize-none min-h-[120px] text-lg border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                          {...field}
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
                
                {/* Link Preview */}
                {form.watch("hasLink") && form.watch("linkUrl") && (
                  <div className="mt-3 border border-gray-200 rounded-md overflow-hidden">
                    <div className="absolute top-2 right-2 z-10">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-gray-800/60 hover:bg-gray-800/80 text-white"
                        onClick={() => {
                          form.setValue("hasLink", false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.watch("linkImageUrl") && (
                      <img 
                        src={form.watch("linkImageUrl") || ''} 
                        alt="連結預覽" 
                        className="w-full h-[160px] object-cover" 
                      />
                    )}
                    <div className="p-3">
                      <div className="text-xs uppercase text-gray-500 mb-1">
                        {new URL(form.watch("linkUrl") || "https://example.com").hostname}
                      </div>
                      <div className="font-medium line-clamp-1">{form.watch("linkTitle") || "連結標題"}</div>
                      {form.watch("linkDescription") && (
                        <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {form.watch("linkDescription")}
                        </div>
                      )}
                    </div>
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
                      className={`flex items-center justify-start rounded-md h-10 px-3 ${form.watch("hasLink") ? "text-blue-600" : "text-gray-700"}`}
                      onClick={() => form.setValue("hasLink", !form.watch("hasLink"))}
                    >
                      <LinkIcon className="h-5 w-5 mr-2" />
                      <span>連結</span>
                    </Button>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="flex items-center justify-start rounded-md h-10 px-3 text-purple-600"
                      onClick={() => {
                        const dialog = document.getElementById('post-category-dialog');
                        if (dialog) {
                          dialog.classList.toggle('hidden');
                        }
                      }}
                    >
                      <FileBadge className="h-5 w-5 mr-2" />
                      <span>貼文類別</span>
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
                      <span>排程</span>
                    </Button>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="flex items-center justify-start rounded-md h-10 px-3 text-red-600"
                      onClick={() => {
                        form.setValue("multiPlatform", !form.watch("multiPlatform"));
                      }}
                    >
                      <Share className="h-5 w-5 mr-2" />
                      <span>多平台</span>
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
              
              {/* Schedule Panel */}
              {form.watch("schedulePost") && (
                <div className="px-4 py-2 border-t border-gray-200">
                  <div className="flex items-center mb-2">
                    <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                    <h4 className="font-medium">設定發佈時間</h4>
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
              
              {/* Multi-Platform Panel */}
              {form.watch("multiPlatform") && (
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
                    選擇要發佈的平台。每個平台可以有不同的內容，預設與主要內容相同。
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
                                  className="resize-none h-24 mt-2"
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
                                  className="resize-none h-24 mt-2"
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
                                  className="resize-none h-24 mt-2"
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
                                  className="resize-none h-24 mt-2"
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
                                  className="resize-none h-24 mt-2"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              )}
              
              {/* Link Panel */}
              {form.watch("hasLink") && (
                <div className="px-4 py-2 border-t border-gray-200">
                  <div className="flex items-center mb-2">
                    <LinkIcon className="h-5 w-5 mr-2 text-blue-500" />
                    <h4 className="font-medium">添加連結</h4>
                  </div>
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="linkUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="https://..." {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="linkTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="連結標題..." {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="linkImageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="圖片網址..." {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="linkDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="連結描述..." {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
              
              {/* Footer Actions */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
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
