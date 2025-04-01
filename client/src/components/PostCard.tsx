import { useState } from "react";
import { 
  Post, 
  PostAnalytics,
  Page
} from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";
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
  ExternalLink
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
      return `Published · ${formatDistanceToNow(new Date(post.publishedTime), { addSuffix: true })}`;
    } else if (post.status === "scheduled" && post.scheduledTime) {
      return `Scheduled · ${format(new Date(post.scheduledTime), "MMMM d, yyyy 'at' h:mm a")}`;
    } else {
      return `Draft · Last edited ${formatDistanceToNow(new Date(post.updatedAt || post.createdAt), { addSuffix: true })}`;
    }
  };

  // Status badge styling
  const getStatusBadge = () => {
    switch (post.status) {
      case "published":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Published</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Scheduled</Badge>;
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Draft</Badge>;
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
    <div className="post-card bg-white shadow rounded-lg overflow-hidden transition-all duration-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
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
                  alt="Page profile" 
                  className="w-10 h-10 rounded-full mr-3" 
                />
                <div>
                  <div className="font-medium text-gray-900">{page?.name}</div>
                  <div className="text-sm text-gray-500">{getPostDateText()}</div>
                </div>
              </>
            )}
          </div>
          <div className="flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-500">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {post.status === "published" && (
                  <DropdownMenuItem>
                    <BarChart2 className="mr-2 h-4 w-4" /> View Analytics
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit Post
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600" 
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <p className="text-gray-800 mb-3">{post.content}</p>
        
        {post.imageUrl && (
          <div className="mb-4">
            <img 
              src={post.imageUrl} 
              alt="Post image" 
              className="w-full h-52 object-cover rounded-md" 
            />
          </div>
        )}
        
        {post.linkUrl && (
          <div className="mb-4 border border-gray-200 rounded-md p-3">
            <div className="flex items-start">
              {post.linkImageUrl && (
                <img 
                  src={post.linkImageUrl} 
                  alt="Link preview" 
                  className="w-20 h-20 object-cover rounded mr-3" 
                />
              )}
              <div>
                <div className="font-medium text-gray-900 mb-1">{post.linkTitle}</div>
                <div className="text-sm text-gray-500 truncate">{post.linkUrl.replace(/^https?:\/\/(www\.)?/, '')}</div>
              </div>
            </div>
          </div>
        )}
        
        {post.status === "published" && post.postId && (
          <div className="flex justify-between text-sm text-gray-500 border-t border-gray-200 pt-3">
            <div className="flex space-x-4">
              <div className="flex items-center">
                <ThumbsUp className="text-primary h-4 w-4 mr-1" />
                <span>{isAnalyticsLoading ? "..." : analytics?.likeCount || 0}</span>
              </div>
              <div className="flex items-center">
                <MessageSquare className="text-gray-400 h-4 w-4 mr-1" />
                <span>{isAnalyticsLoading ? "..." : analytics?.commentCount || 0}</span>
              </div>
              <div className="flex items-center">
                <Share2 className="text-gray-400 h-4 w-4 mr-1" />
                <span>{isAnalyticsLoading ? "..." : analytics?.shareCount || 0}</span>
              </div>
            </div>
            <div>
              {getStatusBadge()}
            </div>
          </div>
        )}
        
        {post.status !== "published" && (
          <div className="flex justify-end text-sm text-gray-500 border-t border-gray-200 pt-3">
            {getStatusBadge()}
          </div>
        )}
      </div>
      
      <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-2">
        {post.status === "published" ? (
          <>
            <Button variant="outline" size="sm" className="text-gray-700">
              <BarChart2 className="mr-1 h-4 w-4" />
              Analytics
            </Button>
            <Button variant="outline" size="sm" className="text-gray-700">
              <ExternalLink className="mr-1 h-4 w-4" />
              Boost
            </Button>
          </>
        ) : post.status === "scheduled" ? (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-gray-700"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit className="mr-1 h-4 w-4" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-gray-700"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </>
        ) : (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-gray-700"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit className="mr-1 h-4 w-4" />
              Edit
            </Button>
            <Button size="sm">
              <Send className="mr-1 h-4 w-4" />
              Publish
            </Button>
          </>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePost} 
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
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
