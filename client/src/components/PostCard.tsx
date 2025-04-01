import { useState } from "react";
import { 
  Post, 
  PostAnalytics,
  Page
} from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";
import { zhTW } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  ThumbsUp,
  MessageSquare,
  Share2,
  BarChart2,
  Edit,
  Trash2,
  Send,
  ExternalLink,
  Globe,
  Clock
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import CreatePostModal from "./CreatePostModal";

interface PostCardProps {
  post: Post;
  onPostDeleted: (postId: number) => void;
}

const PostCard = ({ post, onPostDeleted }: PostCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Get page for the post
  const { data: page, isLoading: isPageLoading } = useQuery<Page>({
    queryKey: [`/api/pages/${post.pageId}`],
  });

  // Get analytics for published posts
  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery<PostAnalytics>({
    queryKey: [`/api/posts/${post.postId}/analytics`],
    enabled: !!post.postId && post.status === "published",
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/posts/${post.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Post deleted",
        description: "The post has been deleted successfully.",
      });
      onPostDeleted(post.id);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete the post. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to delete post:", error);
    },
  });

  // Format date/time for display
  const getPostDateText = () => {
    if (post.status === "published" && post.publishedTime) {
      return `已發佈 · ${formatDistanceToNow(new Date(post.publishedTime), { addSuffix: true, locale: zhTW })}`;
    } else if (post.status === "scheduled" && post.scheduledTime) {
      return `已排程 · ${format(new Date(post.scheduledTime), "yyyy年MM月dd日 HH:mm", { locale: zhTW })}`;
    } else {
      return `草稿 · 最後編輯於${formatDistanceToNow(new Date(post.updatedAt || post.createdAt), { addSuffix: true, locale: zhTW })}`;
    }
  };

  // Status badge styling
  const getStatusBadge = () => {
    switch (post.status) {
      case "published":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">已發佈</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">已排程</Badge>;
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">草稿</Badge>;
      default:
        return null;
    }
  };

  // Handle post deletion
  const handleDeletePost = () => {
    deletePostMutation.mutate();
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="post-card bg-white shadow-md rounded-lg overflow-hidden transition-all duration-200 mb-4 border border-gray-200">
      {/* Header Section */}
      <div className="p-3 sm:p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start">
            {isPageLoading ? (
              <>
                <Skeleton className="w-10 h-10 rounded-full mr-3" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </>
            ) : (
              <>
                <img 
                  src={page?.picture || "https://via.placeholder.com/40"} 
                  alt="頁面大頭貼" 
                  className="w-10 h-10 rounded-full mr-3" 
                />
                <div>
                  <div className="font-semibold text-[15px] text-gray-900">{page?.name}</div>
                  <div className="flex items-center text-xs text-gray-500">
                    {post.status === "published" ? (
                      <>
                        <span>{getPostDateText()}</span>
                        <span className="mx-1">·</span>
                        <Globe className="h-3 w-3 mr-1" />
                        <span>公開</span>
                      </>
                    ) : post.status === "scheduled" ? (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{getPostDateText()}</span>
                      </>
                    ) : (
                      <span>{getPostDateText()}</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:bg-gray-100 rounded-full h-8 w-8 p-0">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {post.status === "published" && (
                  <DropdownMenuItem>
                    <BarChart2 className="mr-2 h-4 w-4" /> 查看數據分析
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" /> 編輯貼文
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600" 
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> 刪除貼文
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="px-3 sm:px-4 pb-3">
        <p className="text-[15px] leading-relaxed mb-3 whitespace-pre-line">{post.content}</p>
        
        {/* Media Preview - Full Width Facebook Style */}
        {post.imageUrl && (
          <div className="mb-3 -mx-3 sm:-mx-4 bg-gray-100">
            <img 
              src={post.imageUrl} 
              alt="貼文圖片" 
              className="w-full object-contain max-h-[500px]" 
            />
          </div>
        )}
        
        {/* Link Preview - Facebook Style Card */}
        {post.linkUrl && (
          <div className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
            {post.linkImageUrl && (
              <img 
                src={post.linkImageUrl} 
                alt="連結預覽" 
                className="w-full h-[180px] object-cover" 
              />
            )}
            <div className="p-3 bg-gray-50">
              <div className="text-xs uppercase text-gray-500 mb-1 truncate">
                {post.linkUrl.replace(/^https?:\/\/(www\.)?/, '')}
              </div>
              <div className="font-semibold text-gray-900">{post.linkTitle || "連結標題"}</div>
              {post.linkDescription && (
                <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {post.linkDescription}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Status Badge for Non-Published Posts */}
        {post.status !== "published" && (
          <div className="mb-2 flex">
            {getStatusBadge()}
          </div>
        )}
        
        {/* Engagement Stats - Facebook Style */}
        {post.status === "published" && post.postId && (
          <div className="flex justify-between items-center text-sm text-gray-500 border-t border-gray-200 pt-2 mt-1">
            <div className="flex items-center space-x-1">
              <div className="flex items-center">
                <div className="bg-blue-500 text-white rounded-full p-1 h-5 w-5 flex items-center justify-center">
                  <ThumbsUp className="h-3 w-3" />
                </div>
                <span className="ml-1">{isAnalyticsLoading ? "..." : analytics?.likeCount || 0}</span>
              </div>
            </div>
            <div className="flex space-x-4">
              <div className="text-gray-500 text-sm">
                {isAnalyticsLoading ? "..." : `${analytics?.commentCount || 0} 則留言`}
              </div>
              <div className="text-gray-500 text-sm">
                {isAnalyticsLoading ? "..." : `${analytics?.shareCount || 0} 次分享`}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Action Buttons - Facebook Style */}
      <div className="px-3 sm:px-4 py-1 border-t border-gray-200">
        <div className="flex justify-between">
          {post.status === "published" ? (
            <>
              <Button variant="ghost" size="sm" className="flex-1 py-5 text-gray-600 hover:bg-gray-100 rounded-md">
                <ThumbsUp className="mr-2 h-5 w-5" />
                讚
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 py-5 text-gray-600 hover:bg-gray-100 rounded-md">
                <MessageSquare className="mr-2 h-5 w-5" />
                留言
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 py-5 text-gray-600 hover:bg-gray-100 rounded-md">
                <Share2 className="mr-2 h-5 w-5" />
                分享
              </Button>
            </>
          ) : post.status === "scheduled" ? (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 py-5 text-gray-600 hover:bg-gray-100 rounded-md"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="mr-2 h-5 w-5" />
                編輯
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 py-5 text-red-600 hover:bg-red-50 rounded-md"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-5 w-5" />
                刪除
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 py-5 text-gray-600 hover:bg-gray-100 rounded-md"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="mr-2 h-5 w-5" />
                編輯
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 py-5 text-blue-600 hover:bg-blue-50 rounded-md"
              >
                <Send className="mr-2 h-5 w-5" />
                發佈
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法撤銷。貼文將被永久刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePost} 
              className="bg-red-600 hover:bg-red-700"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Edit Post Modal */}
      {isEditModalOpen && (
        <CreatePostModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          post={post}
        />
      )}
    </div>
  );
};

export default PostCard;
