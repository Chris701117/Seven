import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import AnalyticsOverview from "@/components/AnalyticsOverview";
import PostList from "@/components/PostList";
import CalendarPreview from "@/components/CalendarPreview";
import { Page, Post } from "@shared/schema";
import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CreatePostModal from "@/components/CreatePostModal";
import { usePageContext } from "@/contexts/PageContext";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { activePageData } = usePageContext();
  const { toast } = useToast();
  
  // Sample posts for preview
  const [samplePosts, setSamplePosts] = useState<Post[]>([
    {
      id: 1,
      pageId: "page_123456",
      postId: "post_123456",
      content: "這是一個已發佈的貼文示例。這裡展示了我們新設計的Facebook風格貼文界面。您可以看到這個界面非常接近Facebook的設計，包括頭像、名稱、時間戳以及貼文內容。",
      status: "published",
      publishedTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      imageUrl: "https://images.unsplash.com/photo-1705849336823-6fa967941b42?q=80&w=2662&auto=format&fit=crop",
      category: "announcement",
      scheduledTime: null,
      videoUrl: null,
      linkUrl: null,
      linkTitle: null,
      linkDescription: null,
      linkImageUrl: null,
      reminderSent: false,
      isCompleted: true,
      reminderTime: null,
      completedTime: new Date(),
    },
    {
      id: 2,
      pageId: "page_123456",
      postId: null,
      content: "這是一個排程貼文的示例。我們可以設定特定的時間來發佈這個貼文。這個界面展示了排程貼文的狀態和操作按鈕。",
      status: "scheduled",
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      createdAt: new Date(),
      updatedAt: new Date(),
      imageUrl: null,
      videoUrl: null,
      linkUrl: null,
      linkTitle: null,
      linkDescription: null,
      linkImageUrl: null,
      category: "event",
      reminderSent: true,
      isCompleted: false,
      reminderTime: new Date(),
      completedTime: null,
      publishedTime: null,
    },
    {
      id: 3,
      pageId: "page_123456",
      postId: null,
      content: "這是一個連結貼文的示例。您可以在Facebook風格的界面中看到連結的預覽效果。",
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
      scheduledTime: null,
      imageUrl: null,
      videoUrl: null,
      linkUrl: "https://replit.com",
      linkTitle: "Replit - 在瀏覽器中寫程式碼",
      linkDescription: "Replit 是一個協作瀏覽器IDE，可以讓您在任何地方用任何設備寫程式碼。",
      linkImageUrl: "https://replit.com/public/images/ogBanner.png",
      category: "promotion",
      reminderSent: false,
      isCompleted: false,
      reminderTime: null,
      completedTime: null,
      publishedTime: null,
    }
  ]);
  
  const handleDeletePost = (postId: number) => {
    setSamplePosts(samplePosts.filter(post => post.id !== postId));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{activePageData ? `${activePageData.pageName} 貼文管理` : '請選擇粉絲專頁'}</h2>
        <Button
          onClick={() => {
            if (!activePageData) {
              toast({
                title: "無法建立貼文",
                description: "請先選擇一個粉絲專頁",
                variant: "destructive",
              });
              return;
            }
            setIsCreateModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={!activePageData}
        >
          <Plus className="mr-2 h-4 w-4" /> 建立貼文
        </Button>
      </div>
      

      
      {/* 貼文列表包含排序和篩選功能 */}
      {activePageData ? (
        <PostList pageId={activePageData.pageId} />
      ) : (
        <div className="text-center p-6 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500">請先選擇一個粉絲專頁以查看貼文</p>
        </div>
      )}
      
      {/* 示例貼文，可以在真實API準備好後移除 */}
      {(!activePageData && samplePosts.length > 0) && (
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-semibold">示例貼文</h3>
          {samplePosts.map((post) => (
            <PostCard key={post.id} post={post} onPostDeleted={handleDeletePost} />
          ))}
        </div>
      )}
      
      {/* Add Create Post Modal */}
      {activePageData && (
        <CreatePostModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default Dashboard;
