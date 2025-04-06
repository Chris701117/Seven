import { useQuery, useQueryClient } from "@tanstack/react-query";
import PostCard from "./PostCard";
import { Post } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronDown, Filter, ArrowUpDown, Search } from "lucide-react";
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
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { apiRequest } from "@/lib/queryClient";
import { getCategoryDisplayName } from "@/lib/utils";

interface PostListProps {
  pageId: string;
  filter?: string;
  isCompactView?: boolean; // 是否使用緊湊視圖（適合移動設備）
}

const PostList = ({ pageId, filter, isCompactView = false }: PostListProps) => {
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
  
  // 日曆選擇器的日期範圍狀態
  const [calendarDate, setCalendarDate] = useState<DateRange | undefined>(undefined);
  
  // 是否顯示日曆選擇器
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  
  // 用於檢測小螢幕設備的狀態 - 在 server-side rendering 環境中安全使用
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  
  // 監聽螢幕大小變化
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640);
    };
    
    // 初始檢查
    checkScreenSize();
    
    // 添加事件監聽器
    window.addEventListener('resize', checkScreenSize);
    
    // 清理事件監聽器
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 獲取貼文數據
  const { data: posts, isLoading, refetch } = useQuery({
    queryKey: [`/api/pages/${pageId}/posts`],
    queryFn: async () => {
      if (!pageId) return [] as Post[];
      
      console.log("獲取全部貼文:", pageId);
      try {
        // 使用直接的 fetch 請求而不是簡化的 apiRequest 以便添加日誌
        const response = await fetch(`/api/pages/${pageId}/posts?all=true`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`獲取貼文失敗: HTTP ${response.status}`, errorText);
          throw new Error(`獲取貼文請求失敗: ${errorText}`);
        }
        
        const data = await response.json() as Post[];
        console.log("[獲取到的貼文數量]", data?.length || 0);
        
        // 確保 data 始終是數組
        if (!Array.isArray(data)) {
          console.warn("API 未返回數組格式的數據，轉換為空數組");
          return [] as Post[];
        }
        
        // 詳細日誌，按狀態分類
        const statusCounts: Record<string, number> = (data as Post[]).reduce((acc: Record<string, number>, post: Post) => {
          const status = post.status || 'unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
        console.log("[貼文狀態統計]", statusCounts);
        
        // 檢查數據中每個貼文的關鍵字段，确保数据完整
        (data as Post[]).forEach((post: Post, index: number) => {
          if (!post.id || !post.pageId || !post.status) {
            console.warn(`[警告] 貼文 #${index} 數據不完整:`, post);
          }
        });
        
        return data as Post[];
      } catch (error) {
        console.error("獲取全部貼文錯誤:", error);
        return [] as Post[];
      }
    },
    enabled: !!pageId,
    // 更改重試和刷新策略，確保我們能獲取最新資料
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 2,
    // TanStack Query v5 使用 gcTime 而非 cacheTime
    gcTime: 30000, // 30秒垃圾回收時間
    staleTime: 10000, // 10秒後数据过期，可以重新获取
  });
  
  // 處理日期篩選
  useEffect(() => {
    if (dateFilter === 'today') {
      setDateRange({
        start: new Date(),
        end: new Date()
      });
      setCalendarDate(undefined);
    } else if (dateFilter === 'yesterday') {
      const yesterday = subDays(new Date(), 1);
      setDateRange({
        start: yesterday,
        end: yesterday
      });
      setCalendarDate(undefined);
    } else if (dateFilter === 'last7days') {
      setDateRange({
        start: subDays(new Date(), 7),
        end: new Date()
      });
      setCalendarDate(undefined);
    } else if (dateFilter === 'last30days') {
      setDateRange({
        start: subDays(new Date(), 30),
        end: new Date()
      });
      setCalendarDate(undefined);
    } else if (dateFilter === 'custom') {
      // 保持當前的自定義日期範圍
    } else {
      // 'all' 或其他
      setDateRange({
        start: null,
        end: null
      });
      setCalendarDate(undefined);
    }
  }, [dateFilter]);
  
  // 監聽日曆選擇器日期變更
  useEffect(() => {
    if (calendarDate?.from) {
      setDateFilter('custom');
      setDateRange({
        start: calendarDate.from,
        end: calendarDate.to || calendarDate.from
      });
    }
  }, [calendarDate]);

  // 篩選和排序邏輯
  const filterAndSortPosts = useCallback(() => {
    if (!posts) return [];
    
    console.log("篩選條件：", { 
      狀態: currentFilter, 
      類別: categoryFilter, 
      日期: dateFilter, 
      排序: sortOrder 
    });
    
    // 確保所有貼文都被包含在初始篩選中，包括草稿
    let filtered = [...posts];
    
    // 狀態篩選
    if (currentFilter !== 'all') {
      filtered = filtered.filter(post => post.status === currentFilter);
    }
    
    // 類別篩選 - 不要排除沒有類別的草稿
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(post => {
        // 如果是草稿且未設置類別，仍然顯示
        if (post.status === 'draft' && !post.category) return true;
        return post.category === categoryFilter;
      });
    }
    
    // 日期篩選
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(post => {
        // 對於不同狀態使用適當的日期
        let postDate;
        if (post.status === 'draft') {
          postDate = post.createdAt;
        } else if (post.status === 'published' || post.status === 'publish_failed') {
          postDate = post.publishedTime || post.createdAt;
        } else if (post.status === 'scheduled') {
          postDate = post.scheduledTime || post.createdAt;
        } else {
          postDate = post.createdAt;
        }
        
        if (postDate) {
          const postDateObj = new Date(postDate);
          // 設置日期的時間為 0:0:0 以便只比較日期部分
          const startDate = new Date(dateRange.start as Date);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(dateRange.end as Date);
          endDate.setHours(23, 59, 59, 999);
          
          return isAfter(postDateObj, startDate) && isBefore(postDateObj, endDate);
        }
        return false;
      });
    }
    
    // 搜尋詞篩選
    if (searchTerm) {
      filtered = filtered.filter(post => 
        post.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // 排序 - 確保草稿也能正確排序
    const sorted = [...filtered].sort((a, b) => {
      // 針對不同狀態的貼文使用適當的日期字段
      // 優先使用意義最符合的日期字段
      const getDateForSort = (post: Post): Date => {
        // 對於已發布或發布失敗的貼文，優先使用發布時間
        if ((post.status === 'published' || post.status === 'publish_failed') && post.publishedTime) {
          return new Date(post.publishedTime);
        }
        
        // 對於排程中的貼文，使用排程時間
        if (post.status === 'scheduled' && post.scheduledTime) {
          return new Date(post.scheduledTime);
        }
        
        // 其他情況（包括草稿）使用創建時間
        const createdDate = post.createdAt ? new Date(post.createdAt) : new Date(0);
        return createdDate;
      };
      
      // 獲取排序用的日期對象
      const dateObjA = getDateForSort(a);
      const dateObjB = getDateForSort(b);
      
      // 檢查是否為有效日期對象，避免時間戳為NaN
      const timeA = !isNaN(dateObjA.getTime()) ? dateObjA.getTime() : 0;
      const timeB = !isNaN(dateObjB.getTime()) ? dateObjB.getTime() : 0;
      
      // 根據排序選項應用對應的排序邏輯
      if (sortOrder === 'newest') {
        return timeB - timeA; // 最新排序 (降序)
      } else {
        return timeA - timeB; // 最舊排序 (升序)
      }
    });
    
    console.log("篩選後貼文數量:", sorted.length, "包含草稿:", sorted.filter((p: Post) => p.status === 'draft').length);
    return sorted;
  }, [posts, currentFilter, categoryFilter, dateRange, searchTerm, sortOrder]);

  // 當篩選條件或数据變更時，重新計算过滤结果
  useEffect(() => {
    if (posts) {
      const result = filterAndSortPosts();
      setFilteredPosts(result);
    }
  }, [posts, filterAndSortPosts]);

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
      <div className="flex justify-end items-center mb-4">
        <div className="flex items-center space-x-1">
          <button 
            onClick={() => {
              setCategoryFilter('all');
              setCurrentFilter('all');
              setDateFilter('all');
              setSearchTerm('');
              setCalendarDate(undefined);
              setDateRange({ start: null, end: null });
            }}
            className="text-primary text-sm hover:underline"
          >
            查看全部貼文
          </button>
        </div>
      </div>
      
      {/* 篩選工具列 - 響應式設計 */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 mb-4 bg-white p-3 rounded-lg border">
        {/* 搜尋框 - 在移動設備上寬度100% */}
        <div className="relative w-full sm:w-auto mb-2 sm:mb-0">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-500" />
          <Input 
            placeholder="搜尋貼文..." 
            className="pl-8 h-9 w-full sm:w-[200px]"
            value={searchTerm || ""}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* 篩選器按鈕組 - 更適合移動設備的下拉選擇器 */}
        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[130px]">
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
            <SelectTrigger className="h-9 w-full sm:w-[130px]">
              <SelectValue placeholder="貼文狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有狀態</SelectItem>
              <SelectItem value="published">已發布</SelectItem>
              <SelectItem value="publish_failed">發布失敗</SelectItem>
              <SelectItem value="scheduled">排程中</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* 日期篩選器和排序按鈕 */}
        <div className="flex flex-wrap gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1">
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden xs:inline">預設日期</span>
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
          
          <Popover open={showCalendarPicker} onOpenChange={setShowCalendarPicker}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1">
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden xs:inline">日曆選擇</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="range"
                selected={calendarDate}
                onSelect={setCalendarDate}
                initialFocus
                className="bg-white"
                locale={zhTW}
              />
            </PopoverContent>
          </Popover>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            <span className="hidden xs:inline">{sortOrder === 'newest' ? '最新優先' : '最舊優先'}</span>
          </Button>
        </div>
        
        {/* 篩選條件標籤 */}
        {(categoryFilter !== 'all' || currentFilter !== 'all' || dateFilter !== 'all' || searchTerm) && (
          <div className="flex flex-wrap gap-1 xs:gap-2 mt-2 w-full">
            {categoryFilter !== 'all' && (
              <Badge variant="secondary" className="px-1.5 xs:px-2 py-0.5 xs:py-1 text-xs xs:text-sm">
                <span className="truncate max-w-[60px] xs:max-w-none inline-block align-bottom">
                  類別: {getCategoryDisplayName(categoryFilter)}
                </span>
                <button 
                  className="ml-1 text-xs hover:text-red-500 inline-flex items-center justify-center" 
                  onClick={() => setCategoryFilter('all')}
                >
                  ×
                </button>
              </Badge>
            )}
            
            {currentFilter !== 'all' && (
              <Badge variant="secondary" className="px-1.5 xs:px-2 py-0.5 xs:py-1 text-xs xs:text-sm">
                <span className="truncate max-w-[80px] xs:max-w-none inline-block align-bottom">
                  狀態: {currentFilter === 'published' ? '已發布' : 
                        currentFilter === 'publish_failed' ? '發布失敗' : 
                        currentFilter === 'scheduled' ? '排程中' : 
                        currentFilter === 'draft' ? '草稿' : 
                        currentFilter}
                </span>
                <button 
                  className="ml-1 text-xs hover:text-red-500 inline-flex items-center justify-center" 
                  onClick={() => setCurrentFilter('all')}
                >
                  ×
                </button>
              </Badge>
            )}
            
            {dateFilter !== 'all' && (
              <Badge variant="secondary" className="px-1.5 xs:px-2 py-0.5 xs:py-1 text-xs xs:text-sm">
                <span className="truncate max-w-[80px] xs:max-w-none inline-block align-bottom">
                  日期: {dateFilter === 'today' ? '今天' : 
                        dateFilter === 'yesterday' ? '昨天' : 
                        dateFilter === 'last7days' ? '最近7天' : 
                        dateFilter === 'last30days' ? '最近30天' : 
                        dateFilter}
                </span>
                <button 
                  className="ml-1 text-xs hover:text-red-500 inline-flex items-center justify-center" 
                  onClick={() => setDateFilter('all')}
                >
                  ×
                </button>
              </Badge>
            )}
            
            {searchTerm && (
              <Badge variant="secondary" className="px-1.5 xs:px-2 py-0.5 xs:py-1 text-xs xs:text-sm">
                <span className="truncate max-w-[80px] xs:max-w-none inline-block align-bottom">
                  搜尋: {searchTerm}
                </span>
                <button 
                  className="ml-1 text-xs hover:text-red-500 inline-flex items-center justify-center" 
                  onClick={() => setSearchTerm('')}
                >
                  ×
                </button>
              </Badge>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs px-2 ml-auto touch-target" 
              onClick={() => {
                setCategoryFilter('all');
                setCurrentFilter('all');
                setDateFilter('all');
                setSearchTerm('');
              }}
            >
              清除篩選
            </Button>
          </div>
        )}
      </div>
      
      {isLoading ? (
        // Loading state with responsive dimensions
        <div className="grid grid-cols-1 gap-3 xs:gap-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full mr-2 sm:mr-3 flex-shrink-0" />
                    <div>
                      <Skeleton className="h-4 w-24 xs:w-32 mb-1" />
                      <Skeleton className="h-3 w-20 xs:w-24" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 sm:p-4">
                <Skeleton className="h-3 sm:h-4 w-full mb-2" />
                <Skeleton className="h-3 sm:h-4 w-11/12 mb-2" />
                <Skeleton className="h-3 sm:h-4 w-3/4 mb-3" />
                <Skeleton className="h-40 xs:h-48 sm:h-52 w-full rounded-md mb-3 sm:mb-4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPosts && filteredPosts.length > 0 ? (
        // Data loaded with responsive design for mobile
        <div className="grid grid-cols-1 gap-3 xs:gap-4">
          {filteredPosts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onPostDeleted={handlePostDeleted}
              isCompactView={isCompactView || isSmallScreen} // 在小螢幕上自動使用緊湊視圖
            />
          ))}
        </div>
      ) : (
        // No posts
        <div className="bg-white p-4 xs:p-6 sm:p-8 text-center rounded-lg shadow-sm">
          <p className="text-gray-500 mb-2 xs:mb-4 text-sm xs:text-base">
            {posts && posts.length > 0 
              ? "沒有符合篩選條件的貼文" 
              : "沒有找到任何貼文"}
          </p>
          <p className="text-xs xs:text-sm text-gray-400">
            {posts && posts.length > 0 
              ? "請嘗試調整篩選條件或清除篩選" 
              : "點擊「新增貼文」按鈕來創建您的第一個貼文"}
          </p>
          {posts && posts.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3 xs:mt-4 h-8 text-xs xs:text-sm touch-target" 
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
