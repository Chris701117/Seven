import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Post } from "@shared/schema";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CalendarPreviewProps {
  pageId: string;
}

// Map to keep track of post types and their colors
const postTypeColors = {
  blog: "bg-blue-200",
  promotion: "bg-green-200",
  event: "bg-indigo-200"
};

// Helper to determine post type (simplified for demo)
const getPostType = (post: Post): keyof typeof postTypeColors => {
  if (post.content.toLowerCase().includes("workshop") || post.content.toLowerCase().includes("event")) {
    return "event";
  }
  if (post.content.toLowerCase().includes("sale") || post.content.toLowerCase().includes("discount") || post.content.toLowerCase().includes("promotion")) {
    return "promotion";
  }
  return "blog";
};

const CalendarPreview = ({ pageId }: CalendarPreviewProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Get scheduled posts
  const { data: scheduledPosts, isLoading } = useQuery<Post[]>({
    queryKey: [`/api/pages/${pageId}/posts?status=scheduled`],
    enabled: !!pageId,
  });
  
  // Calendar navigation
  const prevMonth = () => {
    setCurrentMonth(month => {
      const newMonth = new Date(month);
      newMonth.setMonth(newMonth.getMonth() - 1);
      return newMonth;
    });
  };
  
  const nextMonth = () => {
    setCurrentMonth(month => {
      const newMonth = new Date(month);
      newMonth.setMonth(newMonth.getMonth() + 1);
      return newMonth;
    });
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
      return (
        postDate.getDate() === day.getDate() &&
        postDate.getMonth() === day.getMonth() &&
        postDate.getFullYear() === day.getFullYear()
      );
    });
  };

  if (!pageId) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Schedule</h3>
        </div>
        <div className="text-gray-500">Please select a page to view the calendar</div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Schedule</h3>
        <a href="/calendar" className="text-primary text-sm hover:underline">View full calendar</a>
      </div>
      
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="font-medium">{format(currentMonth, 'MMMM yyyy')}</div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {[...Array(35)].map((_, index) => (
              <div key={index} className="aspect-w-1 aspect-h-1">
                <Skeleton className="w-full h-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the first of the month */}
            {[...Array(getDay(monthStart))].map((_, index) => (
              <div key={`empty-start-${index}`} className="aspect-w-1 aspect-h-1">
                <div className="w-full h-16 p-1 border border-gray-100 rounded-md bg-gray-50"></div>
              </div>
            ))}
            
            {/* Calendar days */}
            {days.map((day, dayIdx) => {
              const postsOnDay = getPostsForDay(day);
              return (
                <div key={dayIdx} className="aspect-w-1 aspect-h-1">
                  <div className="w-full h-16 p-1 border border-gray-200 rounded-md text-center flex flex-col">
                    <div className="text-xs text-gray-500 mb-1">{format(day, 'd')}</div>
                    <div className="flex-grow flex flex-col justify-center items-center space-y-1">
                      {postsOnDay.length > 0 ? (
                        <TooltipProvider>
                          {postsOnDay.slice(0, 3).map((post, idx) => (
                            <Tooltip key={idx}>
                              <TooltipTrigger>
                                <div 
                                  className={`h-2 w-8 ${postTypeColors[getPostType(post)]} rounded-full`}
                                ></div>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p className="text-xs max-w-[200px] truncate">{post.content}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {postsOnDay.length > 3 && (
                            <div className="text-xs text-gray-500">+{postsOnDay.length - 3} more</div>
                          )}
                        </TooltipProvider>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Empty cells for days after the last of the month */}
            {[...Array(42 - (days.length + getDay(monthStart)))].map((_, index) => (
              <div key={`empty-end-${index}`} className="aspect-w-1 aspect-h-1">
                <div className="w-full h-16 p-1 border border-gray-100 rounded-md bg-gray-50"></div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 flex justify-center space-x-4 text-xs">
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
    </div>
  );
};

export default CalendarPreview;
