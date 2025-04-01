import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertPostSchema } from "@shared/schema";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Post } from "@shared/schema";
import {
  Dialog,
  DialogContent,
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
  FileImage 
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import PostEditor from "./PostEditor";

// Extended schema for the form
const formSchema = insertPostSchema.extend({
  schedulePost: z.boolean().default(false),
  scheduleDate: z.string().optional(),
  scheduleTime: z.string().optional(),
  hasImage: z.boolean().default(false),
  hasLink: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.schedulePost) {
    if (!data.scheduleDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Schedule date is required",
        path: ["scheduleDate"],
      });
    }
    if (!data.scheduleTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Schedule time is required",
        path: ["scheduleTime"],
      });
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
  
  // Get active page
  const { data: pages = [] } = useQuery<any[]>({
    queryKey: ['/api/pages'],
  });
  
  const activePage = pages.length > 0 ? pages[0] : null;
  
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
      pageId: activePage?.pageId || "",
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
      hasImage: !!post?.imageUrl,
      hasLink: !!post?.linkUrl,
    },
  });
  
  // Update form values when active page changes
  useEffect(() => {
    if (activePage && !form.getValues().pageId) {
      form.setValue("pageId", activePage.pageId);
    }
  }, [activePage, form]);
  
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
      const postData = {
        pageId: values.pageId,
        content: values.content,
        status: values.schedulePost ? "scheduled" : values.status,
        scheduledTime: values.schedulePost ? new Date(`${values.scheduleDate}T${values.scheduleTime}`) : null,
        imageUrl: values.hasImage ? values.imageUrl : null,
        linkUrl: values.hasLink ? values.linkUrl : null,
        linkTitle: values.hasLink ? values.linkTitle : null,
        linkDescription: values.hasLink ? values.linkDescription : null,
        linkImageUrl: values.hasLink ? values.linkImageUrl : null,
      };
      
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
      toast({
        title: "錯誤",
        description: "創建貼文失敗。請再試一次。",
        variant: "destructive",
      });
      console.error("Failed to create post:", error);
    },
  });

  // Update post mutation
  const updatePostMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!post) return;
      
      const postData = {
        content: values.content,
        status: values.schedulePost ? "scheduled" : values.status,
        scheduledTime: values.schedulePost ? new Date(`${values.scheduleDate}T${values.scheduleTime}`) : null,
        imageUrl: values.hasImage ? values.imageUrl : null,
        linkUrl: values.hasLink ? values.linkUrl : null,
        linkTitle: values.hasLink ? values.linkTitle : null,
        linkDescription: values.hasLink ? values.linkDescription : null,
        linkImageUrl: values.hasLink ? values.linkImageUrl : null,
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{post ? "編輯貼文" : "建立新貼文"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="mb-4">
              <div className="flex items-center mb-3">
                <img 
                  src={activePage?.picture || "https://via.placeholder.com/40"} 
                  alt="Page profile" 
                  className="w-10 h-10 rounded-full mr-3" 
                />
                <div className="font-medium text-gray-900">{activePage?.name || "選擇粉絲頁"}</div>
              </div>
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="你想要分享什麼？" 
                        className="resize-none min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="border border-gray-200 rounded-md p-3 mb-4">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-gray-700">添加到你的貼文</div>
              </div>
              <div className="flex mt-2 space-x-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className={`rounded-full ${form.watch("hasImage") ? "bg-blue-50 text-blue-600" : "text-gray-500"}`}
                  onClick={() => form.setValue("hasImage", !form.watch("hasImage"))}
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className={`rounded-full ${form.watch("hasLink") ? "bg-blue-50 text-blue-600" : "text-gray-500"}`}
                  onClick={() => form.setValue("hasLink", !form.watch("hasLink"))}
                >
                  <LinkIcon className="h-5 w-5" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="rounded-full text-gray-500">
                  <Smile className="h-5 w-5" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="rounded-full text-gray-500">
                  <MapPin className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Image/Media section */}
              {form.watch("hasImage") && (
                <div className="mt-3 space-y-3">
                  <input
                    type="file"
                    id="media-upload"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                  
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <FormLabel className="text-sm font-medium">上傳媒體</FormLabel>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={triggerFileUpload}
                        disabled={isUploading}
                        className="flex items-center"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            上傳中...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            上傳
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {isUploading && (
                      <div className="w-full space-y-1">
                        <Progress value={uploadProgress} className="h-2 w-full" />
                        <p className="text-xs text-gray-500 text-right">{uploadProgress}%</p>
                      </div>
                    )}
                    
                    {mediaPreview && (
                      <div className="border rounded-md p-2 mt-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            {uploadedMediaType === "image" ? (
                              <FileImage className="h-4 w-4 mr-2 text-blue-500" />
                            ) : (
                              <FileVideo className="h-4 w-4 mr-2 text-red-500" />
                            )}
                            <span className="text-sm">{uploadedMediaType === "image" ? "圖片" : "影片"}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 rounded-full"
                            onClick={() => {
                              form.setValue("imageUrl", "");
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
                            className="w-full h-auto max-h-[200px] object-contain rounded"
                          />
                        ) : (
                          <video 
                            src={mediaPreview} 
                            className="w-full h-auto max-h-[200px] object-contain rounded"
                            controls
                          />
                        )}
                      </div>
                    )}
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>媒體網址</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://..." 
                            {...field} 
                            value={field.value || ''} 
                            onChange={(e) => {
                              field.onChange(e);
                              // If URL is filled manually, clear the preview
                              if (mediaPreview && e.target.value !== mediaPreview) {
                                setMediaPreview(null);
                                setUploadedMediaType(null);
                              }
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          上傳媒體或直接輸入網址
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              {/* Link inputs */}
              {form.watch("hasLink") && (
                <div className="mt-3 space-y-3">
                  <FormField
                    control={form.control}
                    name="linkUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>連結網址</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="linkTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>連結標題</FormLabel>
                        <FormControl>
                          <Input placeholder="標題..." {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="linkDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>連結描述</FormLabel>
                        <FormControl>
                          <Input placeholder="描述..." {...field} value={field.value || ''} />
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
                        <FormLabel>連結圖片網址</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
            
            <div className="border border-gray-200 rounded-md p-3 mb-4">
              <FormField
                control={form.control}
                name="schedulePost"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">排程貼文</FormLabel>
                      <FormDescription>
                        設定特定的日期和時間發佈
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {form.watch("schedulePost") && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="scheduleDate"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          <FormLabel>日期</FormLabel>
                        </div>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ''} />
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
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-gray-500" />
                          <FormLabel>時間</FormLabel>
                        </div>
                        <FormControl>
                          <Input type="time" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
            
            <DialogFooter className="pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={createPostMutation.isPending || updatePostMutation.isPending}
              >
                取消
              </Button>
              
              {post?.status === "draft" ? (
                <>
                  <Button 
                    type="submit" 
                    disabled={createPostMutation.isPending || updatePostMutation.isPending}
                  >
                    {form.watch("schedulePost") ? "排程" : "儲存草稿"}
                  </Button>
                </>
              ) : (
                <Button 
                  type="submit" 
                  disabled={createPostMutation.isPending || updatePostMutation.isPending}
                >
                  {post ? "更新" : (form.watch("schedulePost") ? "排程" : "立即發佈")}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;
