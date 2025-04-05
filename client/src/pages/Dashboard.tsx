import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AnalyticsOverview from "@/components/AnalyticsOverview";
import PostList from "@/components/PostList";
import CalendarPreview from "@/components/CalendarPreview";
import { Page, Post } from "@shared/schema";
import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Clock } from "lucide-react";
import CreatePostModal from "@/components/CreatePostModal";
import { usePageContext } from "@/contexts/PageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

const Dashboard = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { activePageData } = usePageContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  
  // 查詢最近發布的貼文
  const { data: recentlyPublishedPosts, isLoading: isLoadingPublished } = useQuery<Post[]>({
    queryKey: [`/api/pages/${activePageData?.pageId}/posts`, 'published'],
    queryFn: async () => {
      if (!activePageData) return [];
      const response = await apiRequest("GET", `/api/pages/${activePageData.pageId}/posts?status=published&limit=5`);
      console.log("已發佈貼文響應:", response);
      return response || [];
    },
    enabled: !!activePageData,
  });
  
  // 查詢排程中的貼文
  const { data: scheduledPosts, isLoading: isLoadingScheduled } = useQuery<Post[]>({
    queryKey: [`/api/pages/${activePageData?.pageId}/posts`, 'scheduled'],
    queryFn: async () => {
      if (!activePageData) return [];
      const response = await apiRequest("GET", `/api/pages/${activePageData.pageId}/posts?status=scheduled&limit=5`);
      console.log("排程貼文響應:", response);
      return response || [];
    },
    enabled: !!activePageData,
  });
  
  // 查詢草稿貼文
  const { data: draftPosts, isLoading: isLoadingDrafts } = useQuery<Post[]>({
    queryKey: [`/api/pages/${activePageData?.pageId}/posts`, 'draft'],
    queryFn: async () => {
      if (!activePageData) return [];
      console.log("獲取草稿貼文:", activePageData.pageId);
      try {
        const response = await apiRequest("GET", `/api/pages/${activePageData.pageId}/posts?status=draft&limit=5`);
        console.log("草稿貼文響應:", response);
        return response || [];
      } catch (error) {
        console.error("獲取草稿貼文失敗:", error);
        return [];
      }
    },
    enabled: !!activePageData,
    // 增加重試次數和刷新間隔，確保草稿能被獲取到
    retry: 2,
    refetchInterval: 5000, // 5秒刷新一次
  });
  
  // 格式化日期顯示
  const formatPostDate = (date: Date | string | null) => {
    if (!date) return "日期未設定";
    return format(new Date(date), 'yyyy/MM/dd HH:mm', { locale: zhTW });
  };
  
  // 啟動編輯貼文
  const handleEditPost = async (post: Post) => {
    try {
      // 從API獲取最新的貼文詳情
      const updatedPost = await apiRequest("GET", `/api/posts/${post.id}`);
      console.log("獲取貼文詳情:", updatedPost);
      setSelectedPost(updatedPost);
      setIsCreateModalOpen(true);
    } catch (error) {
      console.error("獲取貼文詳情失敗:", error);
      // 如果無法獲取詳情，使用當前的資料
      setSelectedPost(post);
      setIsCreateModalOpen(true);
    }
  };
  
  // 處理模態框關閉
  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setSelectedPost(null);
  };
  
  return (
    <div className="space-y-6">
      
      {activePageData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 最近發佈的貼文 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  最近發佈
                </CardTitle>
              </div>
              <CardDescription>最近發佈的 5 篇文章</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPublished ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center p-3 border rounded-lg animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-gray-200 mr-3"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentlyPublishedPosts && recentlyPublishedPosts.length > 0 ? (
                <div className="space-y-3">
                  {recentlyPublishedPosts.map((post) => (
                    <div 
                      key={post.id} 
                      className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleEditPost(post)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{post.content.substring(0, 60)}{post.content.length > 60 ? '...' : ''}</p>
                        <div className="flex items-center mt-1">
                          <Badge 
                            className="mr-2" 
                            variant="outline"
                            style={{
                              borderColor: post.category === 'promotion' ? '#4ade80' :
                                          post.category === 'event' ? '#60a5fa' :
                                          post.category === 'announcement' ? '#f97316' : '#e2e8f0',
                              color: post.category === 'promotion' ? '#16a34a' :
                                    post.category === 'event' ? '#2563eb' :
                                    post.category === 'announcement' ? '#ea580c' : '#64748b'
                            }}
                          >
                            {post.category === 'promotion' ? '宣傳' :
                             post.category === 'event' ? '活動' :
                             post.category === 'announcement' ? '公告' : '未分類'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {post.publishedTime ? formatPostDate(post.publishedTime) : formatPostDate(post.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">尚無發佈的貼文</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 排程中的貼文 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-500" />
                  排程中
                </CardTitle>
              </div>
              <CardDescription>排程等待發佈的貼文</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingScheduled ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center p-3 border rounded-lg animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-gray-200 mr-3"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : scheduledPosts && scheduledPosts.length > 0 ? (
                <div className="space-y-3">
                  {scheduledPosts.map((post) => (
                    <div 
                      key={post.id} 
                      className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleEditPost(post)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{post.content.substring(0, 60)}{post.content.length > 60 ? '...' : ''}</p>
                        <div className="flex items-center mt-1">
                          <Badge 
                            className="mr-2" 
                            variant="outline"
                            style={{
                              borderColor: post.category === 'promotion' ? '#4ade80' :
                                          post.category === 'event' ? '#60a5fa' :
                                          post.category === 'announcement' ? '#f97316' : '#e2e8f0',
                              color: post.category === 'promotion' ? '#16a34a' :
                                    post.category === 'event' ? '#2563eb' :
                                    post.category === 'announcement' ? '#ea580c' : '#64748b'
                            }}
                          >
                            {post.category === 'promotion' ? '宣傳' :
                             post.category === 'event' ? '活動' :
                             post.category === 'announcement' ? '公告' : '未分類'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {post.scheduledTime ? formatPostDate(post.scheduledTime) : '無排程時間'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">尚無排程中的貼文</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 草稿貼文 */}
      {activePageData && (
        <div className="mb-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Plus className="h-5 w-5 text-gray-500" />
                  草稿貼文
                </CardTitle>
              </div>
              <CardDescription>尚未排程或發佈的草稿</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDrafts ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center p-3 border rounded-lg animate-pulse">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : draftPosts && draftPosts.length > 0 ? (
                <div className="space-y-3">
                  {draftPosts.map((post) => (
                    <div 
                      key={post.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div 
                        className="flex-1 min-w-0 pr-4"
                        onClick={() => handleEditPost(post)}
                      >
                        <p className="text-sm font-medium truncate">{post.content.substring(0, 60)}{post.content.length > 60 ? '...' : ''}</p>
                        <div className="flex items-center mt-1">
                          <Badge className="mr-2" variant="secondary">草稿</Badge>
                          <span className="text-xs text-gray-500">
                            {formatPostDate(post.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("確定要刪除此草稿貼文嗎？")) {
                              apiRequest("DELETE", `/api/posts/${post.id}`)
                              .then(() => {
                                toast({
                                  title: "成功",
                                  description: "草稿貼文已成功刪除",
                                });
                                // 重新載入貼文列表
                                queryClient.invalidateQueries({ queryKey: [`/api/pages/${activePageData.pageId}/posts`] });
                              })
                              .catch((error) => {
                                toast({
                                  title: "錯誤",
                                  description: "刪除草稿貼文失敗，請稍後再試",
                                  variant: "destructive",
                                });
                              });
                            }
                          }}
                        >
                          刪除
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">尚無草稿貼文</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 貼文列表包含排序和篩選功能 */}
      {activePageData ? (
        <PostList pageId={activePageData.pageId} />
      ) : (
        <div className="text-center p-6 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500">請先選擇一個粉絲專頁以查看貼文</p>
        </div>
      )}
      
      {/* Add Create Post Modal */}
      {activePageData && (
        <CreatePostModal 
          isOpen={isCreateModalOpen} 
          onClose={handleModalClose} 
          post={selectedPost || undefined}
        />
      )}
    </div>
  );
};

export default Dashboard;
