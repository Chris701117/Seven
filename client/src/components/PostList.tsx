import { useQuery, useQueryClient } from "@tanstack/react-query";
import PostCard from "./PostCard";
import { Post } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Calendar, ChevronDown, Filter, ArrowUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { format, subDays, isAfter, isBefore, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";

interface PostListProps {
  pageId: string;
  filter?: string;
}

const PostList = ({ pageId, filter }: PostListProps) => {
  const queryClient = useQueryClient();
  const [currentFilter, setCurrentFilter] = useState(filter || "all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({
    start: null,
    end: null
  });

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: [`/api/pages/${pageId}/posts${currentFilter !== "all" ? `?status=${currentFilter}` : ''}`],
    enabled: !!pageId,
  });
  
  // 處理日期篩選
  useEffect(() => {
    if (dateFilter === 'today') {
      setDateRange({
        start: new Date(),
        end: new Date()
      });
    } else if (dateFilter === 'yesterday') {
      const yesterday = subDays(new Date(), 1);
      setDateRange({
        start: yesterday,
        end: yesterday
      });
    } else if (dateFilter === 'last7days') {
      setDateRange({
        start: subDays(new Date(), 7),
        end: new Date()
      });
    } else if (dateFilter === 'last30days') {
      setDateRange({
        start: subDays(new Date(), 30),
        end: new Date()
      });
    } else {
      // 'all' 或其他
      setDateRange({
        start: null,
        end: null
      });
    }
  }, [dateFilter]);

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

  // 篩選與排序處理
  const filteredAndSortedPosts = posts?.filter(post => {
    // 類別篩選
    if (categoryFilter !== 'all' && post.category !== categoryFilter) {
      return false;
    }
    
    // 狀態篩選 (currentFilter 已經在 API 查詢中處理)
    
    // 日期篩選
    if (dateRange.start && dateRange.end) {
      const postDate = post.publishedTime || post.scheduledTime || post.createdAt;
      if (postDate) {
        const postDateObj = new Date(postDate);
        // 設置日期的時間為 0:0:0 以便只比較日期部分
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        
        if (!(isAfter(postDateObj, startDate) && isBefore(postDateObj, endDate))) {
          return false;
        }
      }
    }
    
    // 搜尋詞篩選
    if (searchTerm && !post.content.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  })
  .sort((a, b) => {
    const dateA = a.publishedTime || a.scheduledTime || a.createdAt;
    const dateB = b.publishedTime || b.scheduledTime || b.createdAt;
    
    if (sortOrder === 'newest') {
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    } else {
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    }
  });

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">貼文總覽</h3>
        <div className="flex items-center space-x-1">
          <a href="#" className="text-primary text-sm hover:underline">查看全部貼文</a>
        </div>
      </div>
      
      {/* 篩選工具列 */}
      <div className="flex flex-wrap items-center gap-2 mb-4 bg-white p-2 rounded-lg border">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-500" />
          <Input 
            placeholder="搜尋貼文..." 
            className="pl-8 h-9 w-[200px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="貼文類別" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有類別</SelectItem>
            <SelectItem value="promotion">宣傳</SelectItem>
            <SelectItem value="event">活動</SelectItem>
            <SelectItem value="announcement">公告</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={currentFilter} onValueChange={setCurrentFilter}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="貼文狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有狀態</SelectItem>
            <SelectItem value="published">已發布</SelectItem>
            <SelectItem value="scheduled">排程中</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
          </SelectContent>
        </Select>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1">
              <Calendar className="h-4 w-4" />
              <span>日期</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setDateFilter('all')}>
                <span className={dateFilter === 'all' ? 'font-bold' : ''}>所有時間</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter('today')}>
                <span className={dateFilter === 'today' ? 'font-bold' : ''}>今天</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter('yesterday')}>
                <span className={dateFilter === 'yesterday' ? 'font-bold' : ''}>昨天</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter('last7days')}>
                <span className={dateFilter === 'last7days' ? 'font-bold' : ''}>最近 7 天</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter('last30days')}>
                <span className={dateFilter === 'last30days' ? 'font-bold' : ''}>最近 30 天</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
        >
          <ArrowUpDown className="h-4 w-4 mr-1" />
          {sortOrder === 'newest' ? '最新優先' : '最舊優先'}
        </Button>
        
        {/* 篩選條件標籤 */}
        {(categoryFilter !== 'all' || currentFilter !== 'all' || dateFilter !== 'all' || searchTerm) && (
          <div className="flex flex-wrap gap-2 mt-2 w-full">
            {categoryFilter !== 'all' && (
              <Badge variant="secondary" className="px-2 py-1">
                類別: {categoryFilter === 'promotion' ? '宣傳' : 
                      categoryFilter === 'event' ? '活動' : 
                      categoryFilter === 'announcement' ? '公告' : 
                      categoryFilter}
                <button 
                  className="ml-1 text-xs hover:text-red-500" 
                  onClick={() => setCategoryFilter('all')}
                >
                  ×
                </button>
              </Badge>
            )}
            
            {currentFilter !== 'all' && (
              <Badge variant="secondary" className="px-2 py-1">
                狀態: {currentFilter === 'published' ? '已發布' : 
                      currentFilter === 'scheduled' ? '排程中' : 
                      currentFilter === 'draft' ? '草稿' : 
                      currentFilter}
                <button 
                  className="ml-1 text-xs hover:text-red-500" 
                  onClick={() => setCurrentFilter('all')}
                >
                  ×
                </button>
              </Badge>
            )}
            
            {dateFilter !== 'all' && (
              <Badge variant="secondary" className="px-2 py-1">
                日期: {dateFilter === 'today' ? '今天' : 
                      dateFilter === 'yesterday' ? '昨天' : 
                      dateFilter === 'last7days' ? '最近7天' : 
                      dateFilter === 'last30days' ? '最近30天' : 
                      dateFilter}
                <button 
                  className="ml-1 text-xs hover:text-red-500" 
                  onClick={() => setDateFilter('all')}
                >
                  ×
                </button>
              </Badge>
            )}
            
            {searchTerm && (
              <Badge variant="secondary" className="px-2 py-1">
                搜尋: {searchTerm}
                <button 
                  className="ml-1 text-xs hover:text-red-500" 
                  onClick={() => setSearchTerm('')}
                >
                  ×
                </button>
              </Badge>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs px-2 ml-auto" 
              onClick={() => {
                setCategoryFilter('all');
                setCurrentFilter('all');
                setDateFilter('all');
                setSearchTerm('');
              }}
            >
              清除所有篩選
            </Button>
          </div>
        )}
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
      ) : filteredAndSortedPosts && filteredAndSortedPosts.length > 0 ? (
        // Data loaded
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAndSortedPosts.map((post) => (
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
          <p className="text-gray-500 mb-4">
            {posts && posts.length > 0 
              ? "沒有符合篩選條件的貼文" 
              : "沒有找到任何貼文"}
          </p>
          <p className="text-sm text-gray-400">
            {posts && posts.length > 0 
              ? "請嘗試調整篩選條件或清除所有篩選" 
              : "點擊「新增貼文」按鈕來創建您的第一個貼文"}
          </p>
          {posts && posts.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4" 
              onClick={() => {
                setCategoryFilter('all');
                setCurrentFilter('all');
                setDateFilter('all');
                setSearchTerm('');
              }}
            >
              清除所有篩選
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default PostList;
