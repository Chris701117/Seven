import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Page, Post } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  List,
  BarChart4
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  format,
  parseISO,
  getDay,
  addHours
} from "date-fns";
import { zhTW } from "date-fns/locale";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import CreatePostModal from "@/components/CreatePostModal";
import ContentGanttChart from "@/components/ContentGanttChart";
import { formatDateDisplay } from "@/lib/utils";

const ContentCalendar = () => {
  const { toast } = useToast();
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<"month" | "list" | "gantt">("month");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  
  // Get all pages for the user
  const { data: pages, isLoading: isLoadingPages } = useQuery<Page[]>({
    queryKey: ['/api/pages'],
  });
  
  // Set the first page as active when pages are loaded
  useEffect(() => {
    if (pages && pages.length > 0 && !activePageId) {
      setActivePageId(pages[0].pageId);
    }
  }, [pages, activePageId]);
  
  // Get all posts for the active page
  const { data: posts, isLoading: isLoadingPosts } = useQuery<Post[]>({
    queryKey: [`/api/pages/${activePageId}/posts`],
    enabled: !!activePageId,
  });
  
  // Filter scheduled posts
  const scheduledPosts = posts?.filter(post => 
    post.status === "scheduled" && post.scheduledTime !== null
  ) || [];
  
  // Set up date-fns localizer for react-big-calendar
  const locales = {
    'zh-TW': zhTW
  };
  
  const localizer = dateFnsLocalizer({
    format,
    parse: parseISO,
    startOfWeek: () => {
      return new Date(0, 0, 0);
    },
    getDay,
    locales,
  });
  
  // Convert posts to calendar events
  const calendarEvents = useMemo(() => {
    return scheduledPosts.map(post => {
      // Creating start and end dates for the event
      const start = post.scheduledTime ? new Date(post.scheduledTime) : new Date();
      // If endTime is not set, default to 1 hour after start
      const end = post.endTime 
        ? new Date(post.endTime) 
        : addHours(start, 1);
      
      return {
        id: post.id,
        title: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
        start,
        end,
        allDay: false,
        resource: post,
        category: post.category || 'default'
      };
    });
  }, [scheduledPosts]);
  
  // Determine post type (simplified)
  const getPostType = (post: Post): "promotion" | "event" | "announcement" | "default" => {
    if (!post.category) return "default";
    
    switch(post.category) {
      case "promotion":
        return "promotion";
      case "event":
        return "event";
      case "announcement":
        return "announcement";
      default:
        return "default";
    }
  };
  
  // Get color based on post type/category
  const getPostColor = (category: string | null) => {
    if (!category) return "#94a3b8"; // slate-400
    
    switch(category) {
      case "promotion":
        return "#4ade80"; // green-400
      case "event":
        return "#60a5fa"; // blue-400
      case "announcement":
        return "#f97316"; // orange-500
      default:
        return "#94a3b8"; // slate-400
    }
  };
  
  // Handle event selection
  const handleSelectEvent = (event: any) => {
    // 先重置選中的事件，避免顯示之前的數據
    setSelectedEvent(null);
    
    // 在設置選擇的事件之前，從API獲取最新的貼文數據
    if (event.resource && event.resource.id) {
      console.log("嘗試獲取貼文數據，ID:", event.resource.id);
      
      // 使用toast顯示加載狀態
      toast({
        title: "載入中",
        description: "正在獲取貼文數據...",
        duration: 1500,
      });
      
      // 使用apiRequest幫助函數來確保一致的錯誤處理
      apiRequest(`/api/posts/${event.resource.id}`)
        .then(post => {
          console.log("成功獲取貼文數據:", post);
          // 設置獲取到的完整貼文數據
          setTimeout(() => {
            setSelectedEvent(post);
            setIsCreateModalOpen(true);
          }, 200); // 短暫延遲以確保UI狀態更新
        })
        .catch(error => {
          console.error('獲取貼文失敗:', error);
          toast({
            title: "錯誤",
            description: "無法獲取貼文數據，請稍後再試",
            variant: "destructive",
          });
          // 如果獲取失敗，則使用事件中的基本信息
          setTimeout(() => {
            setSelectedEvent(event.resource);
            setIsCreateModalOpen(true);
          }, 200); // 短暫延遲以確保UI狀態更新
        });
    } else {
      // 如果没有id，直接使用事件資源
      setSelectedEvent(event.resource);
      setIsCreateModalOpen(true);
    }
  };
  
  // Handle slot selection (empty time slot)
  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedDate(start);
    setIsCreateModalOpen(true);
  };
  
  // Custom event component for the calendar
  const EventComponent = ({ event, continuesPrior, continuesAfter, slotStart, slotEnd, isAllDay }: any) => {
    const category = event.resource?.category || "default";
    const bgColor = getPostColor(category);
    
    // 判斷事件是否被縮短了或是否在"更多事件"彈出窗口中
    const isCompact = event._isCompacted;
    const isInPopup = !!(event._orig && event._orig._isInPopup);
    
    // 如果是在彈出窗口中，使用更完整的顯示
    // 如果是在日曆格中，根據是否壓縮來顯示
    return (
      <div
        className={`rounded px-2 ${isCompact ? 'py-0' : 'py-1'} truncate text-white ${isCompact ? 'text-xs' : 'text-sm'}`}
        style={{ 
          backgroundColor: bgColor,
          // 確保高度始終足夠顯示內容
          minHeight: isCompact ? '1.5rem' : '2.5rem',
          height: 'auto',
          // 非壓縮狀態顯示更多內容
          maxHeight: isCompact ? '1.5rem' : (isInPopup ? '8rem' : '4rem'),
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}
      >
        <div className={`${isCompact ? '' : 'font-semibold'} truncate`}>
          {isCompact ? event.title.substring(0, 20) + (event.title.length > 20 ? '...' : '') : event.title}
        </div>
        {!isCompact && (
          <div className="text-xs opacity-90 truncate">
            {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
          </div>
        )}
        {/* 在彈出窗口中顯示更多詳情 */}
        {isInPopup && (
          <div className="text-xs mt-1 opacity-80">
            類別: {category}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">內容日曆</h2>
        <div className="flex items-center space-x-2">
          <Tabs defaultValue={calendarView} onValueChange={(value) => setCalendarView(value as "month" | "list" | "gantt")}>
            <TabsList>
              <TabsTrigger value="month">
                <CalendarIcon className="h-4 w-4 mr-2" />
                月曆視圖
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4 mr-2" />
                列表視圖
              </TabsTrigger>
              <TabsTrigger value="gantt">
                <BarChart4 className="h-4 w-4 mr-2" />
                甘特圖
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => {
            setSelectedEvent(null);
            setIsCreateModalOpen(true);
          }}>
            安排貼文
          </Button>
        </div>
      </div>
      
      {calendarView === "month" ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h3 className="text-xl font-semibold">
                  社群媒體排程
                </h3>
              </div>
              <div className="flex space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-1" style={{ backgroundColor: "#60a5fa" }}></div>
                  <span>活動</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-1" style={{ backgroundColor: "#4ade80" }}></div>
                  <span>宣傳</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-1" style={{ backgroundColor: "#f97316" }}></div>
                  <span>公告</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingPosts || isLoadingPages ? (
              <div className="p-4">
                <Skeleton className="h-[600px] w-full" />
              </div>
            ) : (
              <div className="h-[600px] p-2">
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  views={['month', 'week', 'day']}
                  defaultView="month"
                  selectable
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  components={{
                    event: EventComponent
                  }}
                  eventPropGetter={(event) => {
                    const category = event.resource?.category || "default";
                    const backgroundColor = getPostColor(category);
                    return { style: { backgroundColor } };
                  }}
                  messages={{
                    today: '今天',
                    previous: '上一頁',
                    next: '下一頁',
                    month: '月',
                    week: '週',
                    day: '日',
                    agenda: '行程',
                    date: '日期',
                    time: '時間',
                    event: '事件',
                    showMore: total => `+${total} 更多`
                  }}
                  // 日曆格子的樣式設置
                  dayPropGetter={(date) => {
                    return {
                      style: {
                        backgroundColor: '#f9fafb',
                        borderColor: '#e5e7eb'
                      }
                    };
                  }}
                  // 設置每個事件之間的間距
                  dayLayoutAlgorithm="no-overlap"
                  // 開啟彈出顯示更多事件的功能
                  popup
                  // 顯示多少天事件觸發"更多"按鈕，設置較大的值如6可以顯示更多事件
                  popupOffset={20}
                  // 區域設置為中文
                  culture="zh-TW"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ) : calendarView === "list" ? (
        <Card>
          <CardHeader>
            <CardTitle>待發佈貼文</CardTitle>
            <CardDescription>
              所有即將發佈的貼文，依時間順序排列
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPosts || isLoadingPages ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full" />
                ))}
              </div>
            ) : scheduledPosts.length > 0 ? (
              <div className="space-y-4">
                {scheduledPosts
                  .sort((a, b) => {
                    if (!a.scheduledTime || !b.scheduledTime) return 0;
                    return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
                  })
                  .map((post) => (
                    <div 
                      key={post.id} 
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                      onClick={() => {
                        // 在設置選擇的事件之前，從API獲取最新的貼文數據
                        console.log("列表視圖: 嘗試獲取貼文數據，ID:", post.id);
                        apiRequest(`/api/posts/${post.id}`)
                          .then(updatedPost => {
                            console.log("列表視圖: 成功獲取貼文數據:", updatedPost);
                            setSelectedEvent(updatedPost);
                            setIsCreateModalOpen(true);
                          })
                          .catch(error => {
                            console.error('獲取貼文失敗:', error);
                            toast({
                              title: "錯誤",
                              description: "無法獲取貼文數據，請稍後再試",
                              variant: "destructive",
                            });
                            setSelectedEvent(post);
                            setIsCreateModalOpen(true);
                          });
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium truncate">{post.content.substring(0, 60)}...</h3>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge 
                              style={{ 
                                backgroundColor: post.category ? `${getPostColor(post.category)}30` : '#e2e8f0',
                                color: post.category ? getPostColor(post.category) : '#64748b'
                              }}
                            >
                              {post.category || '未分類'}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {formatDateDisplay(post.scheduledTime)}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={(e) => {
                            e.stopPropagation();
                            // 在設置選擇的事件之前，從API獲取最新的貼文數據
                            console.log("編輯按鈕: 嘗試獲取貼文數據，ID:", post.id);
                            apiRequest(`/api/posts/${post.id}`)
                              .then(updatedPost => {
                                console.log("編輯按鈕: 成功獲取貼文數據:", updatedPost);
                                setSelectedEvent(updatedPost);
                                setIsCreateModalOpen(true);
                              })
                              .catch(error => {
                                console.error('獲取貼文失敗:', error);
                                toast({
                                  title: "錯誤",
                                  description: "無法獲取貼文數據，請稍後再試",
                                  variant: "destructive",
                                });
                                setSelectedEvent(post);
                                setIsCreateModalOpen(true);
                              });
                          }}>編輯</Button>
                          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                            刪除
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">沒有排程貼文</h3>
                <p className="text-gray-500 mb-4">開始安排貼文以在此處查看。</p>
                <Button onClick={() => setIsCreateModalOpen(true)}>安排貼文</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>甘特圖視圖</CardTitle>
            <CardDescription>
              以時間線形式查看所有貼文計劃
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPosts || isLoadingPages ? (
              <Skeleton className="h-[600px] w-full" />
            ) : scheduledPosts.length > 0 ? (
              <ContentGanttChart posts={scheduledPosts} />
            ) : (
              <div className="text-center py-10">
                <BarChart4 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">沒有排程活動</h3>
                <p className="text-gray-500 mb-4">安排貼文以在甘特圖中查看。</p>
                <Button onClick={() => setIsCreateModalOpen(true)}>安排貼文</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Create Post Modal */}
      <CreatePostModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedDate(null);
          setSelectedEvent(null);
        }}
        post={selectedEvent}
      />
    </div>
  );
};

export default ContentCalendar;
