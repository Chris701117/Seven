import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { facebookApi } from "@/lib/facebookApi";
import { Post } from "@shared/schema";
import { useToast } from "./use-toast";

export const usePosts = (pageId: string | null, status?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const postsQuery = useQuery<Post[]>({
    queryKey: [`/api/pages/${pageId}/posts${status ? `?status=${status}` : ''}`],
    enabled: !!pageId,
  });
  
  const createPostMutation = useMutation({
    mutationFn: (postData: any) => {
      if (!pageId) throw new Error("No page selected");
      return facebookApi.createPost(pageId, postData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${pageId}/posts`] });
      toast({
        title: "Post Created",
        description: "Your post has been created successfully!",
      });
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
  
  const updatePostMutation = useMutation({
    mutationFn: ({ postId, postData }: { postId: number; postData: any }) => {
      return facebookApi.updatePost(postId, postData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${pageId}/posts`] });
      toast({
        title: "Post Updated",
        description: "Your post has been updated successfully!",
      });
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
  
  const deletePostMutation = useMutation({
    mutationFn: (postId: number) => {
      return facebookApi.deletePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${pageId}/posts`] });
      toast({
        title: "Post Deleted",
        description: "Your post has been deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to delete post:", error);
    },
  });
  
  return {
    posts: postsQuery.data || [],
    isLoading: postsQuery.isLoading,
    isError: postsQuery.isError,
    createPost: createPostMutation.mutate,
    updatePost: updatePostMutation.mutate,
    deletePost: deletePostMutation.mutate,
    isPending: createPostMutation.isPending || updatePostMutation.isPending || deletePostMutation.isPending,
  };
};
