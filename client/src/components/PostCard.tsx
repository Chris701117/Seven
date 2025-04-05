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
import { facebookApi } from "@/lib/facebookApi";
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
  Clock,
  Zap,
  RefreshCw
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
  isCompactView?: boolean; // 是否在移動設備上使用緊湊視圖
}

const PostCard = ({ post, onPostDeleted, isCompactView = false }: PostCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPublishAllDialogOpen, setIsPublishAllDialogOpen] = useState(false);

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
  
  // 一鍵發布到所有平台的 mutation
  const publishAllMutation = useMutation({
    mutationFn: async () => {
      return facebookApi.publishToAllPlatforms(post.id);
    },
    onSuccess: () => {
      toast({
        title: "發布成功",
        description: "貼文已成功發布到所有已連接的平台！",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${post.pageId}/posts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}`] });
    },
    onError: (error) => {
      // API調用失敗時顯示失敗訊息
      toast({
        title: "發布失敗",
        description: "貼文發布失敗，請檢查您的網絡連接和Facebook權限設置。",
        variant: "destructive",
      });
      console.error("Failed to publish post to all platforms:", error);
      
      // 讓後端處理狀態更新為publish_failed
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${post.pageId}/posts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}`] });
    },
  });

  // Format date/time for display

  // Status badge styling
  const getStatusBadge = () => {
    switch (post.status) {
      case "published":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">已發佈</Badge>;
      case "publish_failed":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">發佈失敗</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">已排程</Badge>;
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">草稿</Badge>;
      default:
        return null;
    }
  };
  
  // Format date/time for display with publish_failed status
  const getPostDateText = () => {
    if (post.status === "published" && post.publishedTime) {
      return `已發佈 · ${formatDistanceToNow(new Date(post.publishedTime), { addSuffix: true, locale: zhTW })}`;
    } else if (post.status === "publish_failed" && post.publishedTime) {
      return `發佈失敗 · ${formatDistanceToNow(new Date(post.publishedTime), { addSuffix: true, locale: zhTW })}`;
    } else if (post.status === "scheduled" && post.scheduledTime) {
      return `已排程 · ${format(new Date(post.scheduledTime), "yyyy年MM月dd日 HH:mm", { locale: zhTW })}`;
    } else {
      return `草稿 · 最後編輯於${formatDistanceToNow(new Date(post.updatedAt || post.createdAt), { addSuffix: true, locale: zhTW })}`;
    }
  };

  // Handle post deletion
  const handleDeletePost = () => {
    deletePostMutation.mutate();
    setIsDeleteDialogOpen(false);
  };
  
  // 處理一鍵發布
  const handlePublishAll = () => {
    publishAllMutation.mutate();
    setIsPublishAllDialogOpen(false);
  };

  return (
    <div className={`post-card bg-white shadow-md rounded-lg overflow-hidden transition-all duration-200 mb-4 border border-gray-200 ${isCompactView ? 'compact-view' : ''}`}>
      {/* Header Section */}
      <div className="p-3 sm:p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start">
            {isPageLoading ? (
              <>
                <Skeleton className={`rounded-full mr-3 flex-shrink-0 ${isCompactView ? 'w-8 h-8' : 'w-10 h-10'}`} />
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
                  className={`rounded-full mr-3 flex-shrink-0 ${isCompactView ? 'w-8 h-8' : 'w-10 h-10'}`}
                />
                <div className={`${isCompactView ? 'max-w-[calc(100%-40px)]' : ''} min-w-0`}>
                  <div className="font-semibold text-[15px] text-gray-900 truncate">{page?.pageName}</div>
                  <div className="flex items-center text-xs text-gray-500 flex-wrap">
                    {post.status === "published" ? (
                      <>
                        <span className="truncate max-w-[120px] xs:max-w-[180px] sm:max-w-full">{getPostDateText()}</span>
                        <span className="mx-1 hidden xs:inline">·</span>
                        <div className="flex items-center xs:inline-flex mt-0.5 xs:mt-0">
                          <Globe className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span>公開</span>
                        </div>
                      </>
                    ) : post.status === "scheduled" ? (
                      <>
                        <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{getPostDateText()}</span>
                      </>
                    ) : (
                      <span className="truncate">{getPostDateText()}</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex flex-shrink-0 ml-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:bg-gray-100 rounded-full h-8 w-8 p-0 touch-target">
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
                {post.status !== "published" && (
                  <DropdownMenuItem onClick={() => setIsPublishAllDialogOpen(true)}>
                    <Zap className="mr-2 h-4 w-4" /> 一鍵發佈到所有平台
                  </DropdownMenuItem>
                )}
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
        <p className={`text-[15px] leading-relaxed mb-3 whitespace-pre-line ${isCompactView ? 'line-clamp-3' : ''}`}>
          {post.content}
        </p>
        
        {/* Media Preview - Full Width Facebook Style */}
        {post.imageUrl && (
          <div className="mb-3 -mx-3 sm:-mx-4 bg-gray-100">
            <img 
              src={post.imageUrl} 
              alt="貼文圖片" 
              className={`w-full object-contain ${isCompactView ? 'max-h-[300px]' : 'max-h-[500px]'}`}
              loading="lazy"
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
                className={`w-full object-cover ${isCompactView ? 'h-[120px]' : 'h-[180px]'}`}
                loading="lazy"
              />
            )}
            <div className="p-3 bg-gray-50">
              <div className="text-xs uppercase text-gray-500 mb-1 truncate">
                {post.linkUrl.replace(/^https?:\/\/(www\.)?/, '')}
              </div>
              <div className="font-semibold text-gray-900 truncate">{post.linkTitle || "連結標題"}</div>
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
          <div className="mb-2 flex items-center">
            {getStatusBadge()}
            {post.status === "publish_failed" && (
              <span className="text-xs text-red-600 ml-2">
                發布失敗，請檢查連接並重試
              </span>
            )}
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
              <Button variant="ghost" size="sm" className="flex-1 py-3 xs:py-5 text-gray-600 hover:bg-gray-100 rounded-md touch-target">
                <ThumbsUp className="mr-1 xs:mr-2 h-4 w-4 xs:h-5 xs:w-5" />
                <span className="text-sm xs:text-base">讚</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 py-3 xs:py-5 text-gray-600 hover:bg-gray-100 rounded-md touch-target">
                <MessageSquare className="mr-1 xs:mr-2 h-4 w-4 xs:h-5 xs:w-5" />
                <span className="text-sm xs:text-base">留言</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 py-3 xs:py-5 text-gray-600 hover:bg-gray-100 rounded-md touch-target">
                <Share2 className="mr-1 xs:mr-2 h-4 w-4 xs:h-5 xs:w-5" />
                <span className="text-sm xs:text-base">分享</span>
              </Button>
            </>
          ) : post.status === "publish_failed" ? (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 py-3 xs:py-5 text-gray-600 hover:bg-gray-100 rounded-md touch-target"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="mr-1 xs:mr-2 h-4 w-4 xs:h-5 xs:w-5" />
                <span className="text-sm xs:text-base">編輯</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 py-3 xs:py-5 text-red-600 hover:bg-red-50 rounded-md touch-target"
                onClick={() => setIsPublishAllDialogOpen(true)}
                disabled={publishAllMutation.isPending}
              >
                <RefreshCw className="mr-1 xs:mr-2 h-4 w-4 xs:h-5 xs:w-5" />
                <span className="text-sm xs:text-base">重試發佈</span>
              </Button>
            </>
          ) : post.status === "scheduled" ? (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 py-3 xs:py-5 text-gray-600 hover:bg-gray-100 rounded-md touch-target"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="mr-1 xs:mr-2 h-4 w-4 xs:h-5 xs:w-5" />
                <span className="text-sm xs:text-base">編輯</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 py-3 xs:py-5 text-blue-600 hover:bg-blue-50 rounded-md touch-target"
                onClick={() => setIsPublishAllDialogOpen(true)}
                disabled={publishAllMutation.isPending}
              >
                <Zap className="mr-1 xs:mr-2 h-4 w-4 xs:h-5 xs:w-5" />
                <span className="text-sm xs:text-base">立即發佈</span>
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 py-3 xs:py-5 text-gray-600 hover:bg-gray-100 rounded-md touch-target"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="mr-1 xs:mr-2 h-4 w-4 xs:h-5 xs:w-5" />
                <span className="text-sm xs:text-base">編輯</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 py-3 xs:py-5 text-blue-600 hover:bg-blue-50 rounded-md touch-target"
                onClick={() => setIsPublishAllDialogOpen(true)}
                disabled={publishAllMutation.isPending}
              >
                <Zap className="mr-1 xs:mr-2 h-4 w-4 xs:h-5 xs:w-5" />
                <span className="text-sm xs:text-base">一鍵發佈</span>
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">確定要刪除嗎？</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              此操作無法撤銷。貼文將被永久刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-2">
            <AlertDialogCancel className="mt-0 sm:mt-0">取消</AlertDialogCancel>
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
      
      {/* 一鍵發佈確認對話框 */}
      <AlertDialog open={isPublishAllDialogOpen} onOpenChange={setIsPublishAllDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">一鍵發佈到所有平台</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              此操作將把貼文發佈到所有已連接的平台（FB、IG、TikTok、Threads、X）。
              確認所有平台內容已準備好了嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-2">
            <AlertDialogCancel className="mt-0 sm:mt-0">取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePublishAll} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={publishAllMutation.isPending}
            >
              {publishAllMutation.isPending ? "發佈中..." : "確認發佈"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PostCard;
