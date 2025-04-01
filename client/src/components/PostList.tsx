import { useQuery, useQueryClient } from "@tanstack/react-query";
import PostCard from "./PostCard";
import { Post } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

interface PostListProps {
  pageId: string;
  filter?: string;
}

const PostList = ({ pageId, filter }: PostListProps) => {
  const queryClient = useQueryClient();
  const [currentFilter, setCurrentFilter] = useState(filter || "all");

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: [`/api/pages/${pageId}/posts${currentFilter !== "all" ? `?status=${currentFilter}` : ''}`],
    enabled: !!pageId,
  });

  const handlePostDeleted = (postId: number) => {
    // Invalidate the posts query to refetch the data
    queryClient.invalidateQueries({ queryKey: [`/api/pages/${pageId}/posts`] });
  };

  if (!pageId) {
    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Posts</h3>
        </div>
        <div className="text-gray-500">Please select a page to view posts</div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Posts</h3>
        <a href="#" className="text-primary text-sm hover:underline">View all posts</a>
      </div>
      
      {isLoading ? (
        // Loading state
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <Skeleton className="w-10 h-10 rounded-full mr-3" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-11/12 mb-2" />
                <Skeleton className="h-4 w-3/4 mb-3" />
                <Skeleton className="h-52 w-full rounded-md mb-4" />
              </div>
            </div>
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        // Data loaded
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onPostDeleted={handlePostDeleted}
            />
          ))}
        </div>
      ) : (
        // No posts
        <div className="bg-white p-8 text-center rounded-lg shadow-sm">
          <p className="text-gray-500 mb-4">No posts found</p>
          <p className="text-sm text-gray-400">Create your first post by clicking the "Create Post" button</p>
        </div>
      )}
    </div>
  );
};

export default PostList;
