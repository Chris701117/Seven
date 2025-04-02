import { useState, useEffect, useRef } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, addMonths, isSameMonth } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Post } from '@shared/schema';
import { ArrowLeft, ArrowRight, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import CreatePostModal from '@/components/CreatePostModal';

interface ContentGanttChartProps {
  posts: Post[];
  onPostUpdate?: (post: Post) => void;
}

// 類別顏色映射
const categoryColorMap: Record<string, string> = {
  '宣傳': 'bg-amber-200 hover:bg-amber-300 border-amber-300',
  '活動': 'bg-pink-200 hover:bg-pink-300 border-pink-300',
  '公告': 'bg-blue-200 hover:bg-blue-300 border-blue-300',
};

// 狀態顏色映射
const statusColorMap: Record<string, string> = {
  '已發布': 'bg-green-200 hover:bg-green-300 border-green-300',
  '待發布': 'bg-blue-200 hover:bg-blue-300 border-blue-300',
  '草稿': 'bg-yellow-200 hover:bg-yellow-300 border-yellow-300',
};

export default function ContentGanttChart({ posts }: ContentGanttChartProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [daysInMonth, setDaysInMonth] = useState<Date[]>([]);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [colorMode, setColorMode] = useState<'category' | 'status'>('status');
  const containerRef = useRef<HTMLDivElement>(null);

  // 計算當前月份的所有日期（包括前後月份補足整週）
  useEffect(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    
    // 添加前一個月的最後幾天和下一個月的開始幾天以補足完整的週
    const firstDayOfWeek = start.getDay(); // 0 for Sunday, 1 for Monday, etc.
    const startDate = addDays(start, -firstDayOfWeek);
    
    const lastDayOfWeek = end.getDay();
    const endDate = addDays(end, 6 - lastDayOfWeek);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    setDaysInMonth(days);
  }, [currentDate]);

  // 處理前一個月按鈕點擊
  const handlePrevMonth = () => {
    setCurrentDate(addMonths(currentDate, -1));
  };

  // 處理下一個月按鈕點擊
  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  // 切換顏色模式
  const toggleColorMode = () => {
    setColorMode(colorMode === 'category' ? 'status' : 'category');
  };

  // 點擊任務時開啟編輯模態框
  const handlePostClick = (post: Post) => {
    setEditingPost(post);
    setIsModalOpen(true);
  };

  // 模態框關閉時重置狀態
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPost(null);
  };

  // 計算貼文應該位於哪些日期格子中
  const getPostDaysInRange = (post: Post) => {
    // 使用排程時間作為起始日期，確保其不為空
    if (!post.scheduledTime) return [];
    const startPostDate = new Date(post.scheduledTime);
    
    // 如果有結束時間則使用結束時間，否則使用起始時間的當天作為結束日期
    const endPostDate = post.endTime 
      ? new Date(post.endTime) 
      : new Date(startPostDate.getFullYear(), startPostDate.getMonth(), startPostDate.getDate(), 23, 59, 59, 999);
    
    return daysInMonth.filter(day => 
      isWithinInterval(day, { start: startPostDate, end: endPostDate })
    );
  };

  // 按類別分組貼文
  const postsByCategory = posts.reduce<Record<string, Post[]>>((acc, post) => {
    const category = post.category || '未分類';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(post);
    return acc;
  }, {});

  // 分組類別的標題行
  const categoryHeaders = Object.keys(postsByCategory);

  // 獲取貼文顏色
  const getPostColor = (post: Post) => {
    if (colorMode === 'category') {
      return categoryColorMap[post.category || '未分類'] || 'bg-gray-200 hover:bg-gray-300 border-gray-300';
    } else {
      // 根據貼文狀態決定顏色
      let status = '草稿';
      if (post.status === 'published') {
        status = '已發布';
      } else if (post.scheduledTime && new Date(post.scheduledTime) > new Date()) {
        status = '待發布';
      }
      return statusColorMap[status] || 'bg-gray-200 hover:bg-gray-300 border-gray-300';
    }
  };

  // 獲取顏色模式的顯示文本
  const getColorModeText = () => {
    return colorMode === 'category' ? '類別著色' : '狀態著色';
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* 月份導航和控制按鈕 */}
      <div className="flex justify-between items-center bg-gray-100 p-4">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold">
            {format(currentDate, 'yyyy年MM月', { locale: zhTW })}
          </h2>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleColorMode}
                className="flex items-center space-x-1"
              >
                <ArrowUpDown className="h-4 w-4 mr-1" />
                {getColorModeText()}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>切換甘特圖顏色模式：類別 / 狀態</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="overflow-x-auto" ref={containerRef}>
        <div className="min-w-max">
          {/* 標題列 - 日期 */}
          <div className="flex border-b">
            <div className="w-48 flex-shrink-0 border-r bg-gray-50 p-2 font-medium">
              類別 / 貼文
            </div>
            <div className="flex flex-grow">
              {daysInMonth.map((day, idx) => {
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isCurrentMonth = isSameMonth(day, currentDate);
                
                return (
                  <div
                    key={idx}
                    className={`w-10 flex-shrink-0 text-center p-1 border-r text-xs ${
                      isToday ? 'bg-blue-100 font-bold' : 
                      isWeekend ? 'bg-gray-100' : 
                      !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                    }`}
                  >
                    <div className="font-medium">{format(day, 'dd')}</div>
                    <div className="text-[10px]">{format(day, 'E', { locale: zhTW })}</div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 甘特圖主體 */}
          <div>
            {categoryHeaders.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                暫無排程貼文數據，請創建新貼文。
              </div>
            ) : (
              categoryHeaders.map((category) => (
                <div key={category}>
                  {/* 類別標題行 */}
                  <div className="flex border-t border-b bg-gray-50">
                    <div className="w-48 flex-shrink-0 border-r p-2 font-medium truncate">
                      {category}
                    </div>
                    <div className="flex flex-grow">
                      {daysInMonth.map((_, idx) => (
                        <div key={idx} className="w-10 flex-shrink-0 border-r"></div>
                      ))}
                    </div>
                  </div>
                  
                  {/* 各類別下的貼文 */}
                  {postsByCategory[category].map((post) => {
                    // 確保 post.scheduledTime 不為空
                    if (!post.scheduledTime) return null;
                    
                    const postDays = getPostDaysInRange(post);
                    
                    // 計算貼文在甘特圖中的起始位置和寬度
                    const startIdx = daysInMonth.findIndex(day => 
                      format(day, 'yyyy-MM-dd') === format(new Date(post.scheduledTime!), 'yyyy-MM-dd')
                    );
                    
                    // 如果貼文不在當前月份範圍內，則不顯示
                    if (postDays.length === 0) {
                      return null;
                    }
                    
                    return (
                      <div key={post.id} className="flex border-b hover:bg-gray-50">
                        <div 
                          className="w-48 flex-shrink-0 border-r p-2 truncate cursor-pointer"
                          onClick={() => handlePostClick(post)}
                        >
                          <div className="font-medium truncate">{post.content.substring(0, 50)}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {format(new Date(post.scheduledTime!), 'MM/dd')}
                            {post.endTime && ` - ${format(new Date(post.endTime), 'MM/dd')}`}
                          </div>
                        </div>
                        <div className="flex flex-grow relative">
                          {daysInMonth.map((day, idx) => (
                            <div 
                              key={idx}
                              className={`w-10 flex-shrink-0 border-r ${
                                day.getDay() === 0 || day.getDay() === 6 ? 'bg-gray-50' : ''
                              }`}
                            ></div>
                          ))}
                          
                          {/* 貼文條 */}
                          {startIdx >= 0 && postDays.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div 
                                    className="absolute top-0 h-full flex items-center cursor-pointer opacity-90"
                                    style={{
                                      left: `${startIdx * 40}px`,
                                      width: `${postDays.length * 40}px`,
                                    }}
                                    onClick={() => handlePostClick(post)}
                                  >
                                    <div 
                                      className={`h-6 w-full rounded-sm ${getPostColor(post)}`}
                                    ></div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-sm">
                                    <p className="font-bold">{post.content.substring(0, 50)}</p>
                                    <p>排程時間: {format(new Date(post.scheduledTime!), 'yyyy/MM/dd HH:mm')}</p>
                                    {post.endTime && (
                                      <p>結束時間: {format(new Date(post.endTime), 'yyyy/MM/dd HH:mm')}</p>
                                    )}
                                    <p>類別: {post.category || '未分類'}</p>
                                    <p>狀態: {post.status === 'published' ? '已發布' : (post.scheduledTime && new Date(post.scheduledTime) > new Date() ? '待發布' : '草稿')}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* 編輯貼文的模態框 */}
      {editingPost && (
        <CreatePostModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          post={editingPost}
        />
      )}
    </div>
  );
}