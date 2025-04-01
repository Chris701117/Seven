import { useState, useEffect } from "react";
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
import { X, Image, Link, Smile, MapPin, Calendar, Clock } from "lucide-react";
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
  
  // Get active page
  const { data: pages = [] } = useQuery<any[]>({
    queryKey: ['/api/pages'],
  });
  
  const activePage = pages.length > 0 ? pages[0] : null;
  
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
        title: "Success",
        description: "Post created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${form.getValues().pageId}/posts`] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
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
        title: "Success",
        description: "Post updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${post?.pageId}/posts`] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update post. Please try again.",
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
          <DialogTitle>{post ? "Edit Post" : "Create New Post"}</DialogTitle>
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
                <div className="font-medium text-gray-900">{activePage?.name || "Select a page"}</div>
              </div>
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="What would you like to share?" 
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
                <div className="text-sm font-medium text-gray-700">Add to Your Post</div>
              </div>
              <div className="flex mt-2 space-x-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className={`rounded-full ${form.watch("hasImage") ? "bg-blue-50 text-blue-600" : "text-gray-500"}`}
                  onClick={() => form.setValue("hasImage", !form.watch("hasImage"))}
                >
                  <Image className="h-5 w-5" />
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className={`rounded-full ${form.watch("hasLink") ? "bg-blue-50 text-blue-600" : "text-gray-500"}`}
                  onClick={() => form.setValue("hasLink", !form.watch("hasLink"))}
                >
                  <Link className="h-5 w-5" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="rounded-full text-gray-500">
                  <Smile className="h-5 w-5" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="rounded-full text-gray-500">
                  <MapPin className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Image URL input */}
              {form.watch("hasImage") && (
                <div className="mt-3">
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} value={field.value || ''} />
                        </FormControl>
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
                        <FormLabel>Link URL</FormLabel>
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
                        <FormLabel>Link Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Title..." {...field} value={field.value || ''} />
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
                        <FormLabel>Link Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Description..." {...field} value={field.value || ''} />
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
                        <FormLabel>Link Image URL</FormLabel>
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
                      <FormLabel className="text-base">Schedule Post</FormLabel>
                      <FormDescription>
                        Set a specific date and time to publish
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
                          <FormLabel>Date</FormLabel>
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
                          <FormLabel>Time</FormLabel>
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
                Cancel
              </Button>
              
              {post?.status === "draft" ? (
                <>
                  <Button 
                    type="submit" 
                    disabled={createPostMutation.isPending || updatePostMutation.isPending}
                  >
                    {form.watch("schedulePost") ? "Schedule" : "Save Draft"}
                  </Button>
                </>
              ) : (
                <Button 
                  type="submit" 
                  disabled={createPostMutation.isPending || updatePostMutation.isPending}
                >
                  {post ? "Update" : (form.watch("schedulePost") ? "Schedule" : "Publish Now")}
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
