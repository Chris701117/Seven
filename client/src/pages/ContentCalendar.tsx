import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Page, Post } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  GridIcon
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  parseISO
} from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CreatePostModal from "@/components/CreatePostModal";
import { formatDateDisplay } from "@/lib/utils";

const ContentCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [view, setView] = useState<"month" | "list">("month");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
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
  
  // Calendar navigation
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  // Generate calendar data
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get posts for a specific day
  const getPostsForDay = (day: Date) => {
    if (!scheduledPosts) return [];
    
    return scheduledPosts.filter(post => {
      if (!post.scheduledTime) return false;
      const postDate = new Date(post.scheduledTime);
      return isSameDay(postDate, day);
    });
  };
  
  // Determine post type (simplified)
  const getPostType = (post: Post): "blog" | "promotion" | "event" => {
    if (post.content.toLowerCase().includes("workshop") || post.content.toLowerCase().includes("event")) {
      return "event";
    }
    if (post.content.toLowerCase().includes("sale") || post.content.toLowerCase().includes("discount") || post.content.toLowerCase().includes("promotion")) {
      return "promotion";
    }
    return "blog";
  };
  
  // Get color based on post type
  const getPostTypeColor = (type: "blog" | "promotion" | "event") => {
    switch (type) {
      case "blog":
        return "bg-blue-200";
      case "promotion":
        return "bg-green-200";
      case "event":
        return "bg-indigo-200";
      default:
        return "bg-gray-200";
    }
  };
  
  // Handle date click to schedule a post
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsCreateModalOpen(true);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Content Calendar</h2>
        <div className="flex items-center space-x-2">
          <Tabs defaultValue={view} onValueChange={(value) => setView(value as "month" | "list")}>
            <TabsList>
              <TabsTrigger value="month">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Month
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4 mr-2" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Schedule Post
          </Button>
        </div>
      </div>
      
      {view === "month" ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="mx-4 text-xl font-semibold">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-blue-200 rounded-full mr-1"></div>
                  <span>Blog Posts</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-green-200 rounded-full mr-1"></div>
                  <span>Promotions</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-indigo-200 rounded-full mr-1"></div>
                  <span>Events</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPosts || isLoadingPages ? (
              <div className="grid grid-cols-7 gap-2">
                {[...Array(35)].map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                <div className="h-10 flex items-center justify-center font-medium text-sm text-gray-500">Sun</div>
                <div className="h-10 flex items-center justify-center font-medium text-sm text-gray-500">Mon</div>
                <div className="h-10 flex items-center justify-center font-medium text-sm text-gray-500">Tue</div>
                <div className="h-10 flex items-center justify-center font-medium text-sm text-gray-500">Wed</div>
                <div className="h-10 flex items-center justify-center font-medium text-sm text-gray-500">Thu</div>
                <div className="h-10 flex items-center justify-center font-medium text-sm text-gray-500">Fri</div>
                <div className="h-10 flex items-center justify-center font-medium text-sm text-gray-500">Sat</div>
                
                {/* Empty cells for days before the first of the month */}
                {[...Array(getDay(monthStart))].map((_, index) => (
                  <div 
                    key={`empty-start-${index}`} 
                    className="h-24 p-1 border border-gray-100 rounded-md bg-gray-50"
                  ></div>
                ))}
                
                {/* Calendar days */}
                {days.map((day, dayIdx) => {
                  const postsOnDay = getPostsForDay(day);
                  return (
                    <div 
                      key={dayIdx} 
                      className="h-24 p-1 border border-gray-200 rounded-md hover:border-primary hover:border-2 cursor-pointer transition-all"
                      onClick={() => handleDayClick(day)}
                    >
                      <div className="text-sm font-medium">
                        {format(day, 'd')}
                      </div>
                      <div className="mt-1 space-y-1">
                        <TooltipProvider>
                          {postsOnDay.slice(0, 3).map((post, idx) => (
                            <Tooltip key={idx}>
                              <TooltipTrigger asChild>
                                <div className={`h-5 ${getPostTypeColor(getPostType(post))} rounded-md px-1 text-xs truncate`}>
                                  {format(new Date(post.scheduledTime!), 'h:mm a')}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p className="font-medium">{format(new Date(post.scheduledTime!), 'h:mm a')}</p>
                                <p className="text-xs mt-1">{post.content}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {postsOnDay.length > 3 && (
                            <div className="text-xs text-center text-gray-500">
                              +{postsOnDay.length - 3} more
                            </div>
                          )}
                        </TooltipProvider>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Posts</CardTitle>
            <CardDescription>
              All your upcoming posts in chronological order
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
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium truncate">{post.content.substring(0, 60)}...</h3>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Scheduled</Badge>
                            <span className="text-sm text-gray-500">
                              {formatDateDisplay(post.scheduledTime)}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No scheduled posts</h3>
                <p className="text-gray-500 mb-4">Start scheduling posts to see them here.</p>
                <Button onClick={() => setIsCreateModalOpen(true)}>Schedule a Post</Button>
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
        }}
        defaultScheduledDate={selectedDate}
      />
    </div>
  );
};

export default ContentCalendar;
