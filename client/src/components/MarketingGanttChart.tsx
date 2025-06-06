import { useState, useEffect, useRef } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isWithinInterval, addMonths, isSameMonth, isSameDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { MarketingTask } from '@shared/schema';
import { Edit, Calendar, AlertTriangle, CheckSquare, ArrowLeft, ArrowRight, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import MarketingTaskModal from './MarketingTaskModal';

interface MarketingGanttChartProps {
  tasks: MarketingTask[];
  onTaskUpdate?: (task: MarketingTask) => void;
}

// 優先級顏色映射
const priorityColorMap: Record<string, string> = {
  '高': 'bg-red-200 hover:bg-red-300 border-red-300',
  '中': 'bg-blue-200 hover:bg-blue-300 border-blue-300',
  '低': 'bg-green-200 hover:bg-green-300 border-green-300',
};

// 任務類別顏色映射
const categoryColorMap: Record<string, string> = {
  '一般': 'bg-cyan-200 hover:bg-cyan-300 border-cyan-300',
  '廣告投放': 'bg-amber-200 hover:bg-amber-300 border-amber-300',
  '地面推廣': 'bg-pink-200 hover:bg-pink-300 border-pink-300',
  '會議': 'bg-purple-200 hover:bg-purple-300 border-purple-300',
};

// 任務狀態顏色映射
const statusColorMap: Record<string, string> = {
  '已完成': 'bg-green-200 hover:bg-green-300 border-green-300',
  '進行中': 'bg-blue-200 hover:bg-blue-300 border-blue-300',
  '待處理': 'bg-yellow-200 hover:bg-yellow-300 border-yellow-300',
  '已延遲': 'bg-red-200 hover:bg-red-300 border-red-300',
  '已取消': 'bg-gray-200 hover:bg-gray-300 border-gray-300',
};

export default function MarketingGanttChart({ tasks }: MarketingGanttChartProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [daysInMonth, setDaysInMonth] = useState<Date[]>([]);
  const [editingTask, setEditingTask] = useState<MarketingTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [colorMode, setColorMode] = useState<'category' | 'status' | 'priority'>('status');
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
    const modes: ('category' | 'status' | 'priority')[] = ['category', 'status', 'priority'];
    const currentIndex = modes.indexOf(colorMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setColorMode(modes[nextIndex]);
  };

  // 點擊任務時開啟編輯模態框
  const handleTaskClick = (task: MarketingTask) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  // 模態框關閉時重置狀態
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  // 計算任務應該位於哪些日期格子中
  const getTaskDaysInRange = (task: MarketingTask) => {
    const startTaskDate = new Date(task.startTime);
    const endTaskDate = new Date(task.endTime);
    
    // 為單日任務確保至少有一天的顯示
    const adjustedEndDate = isSameDay(startTaskDate, endTaskDate) 
      ? new Date(endTaskDate.getFullYear(), endTaskDate.getMonth(), endTaskDate.getDate(), 23, 59, 59) 
      : endTaskDate;
    
    const daysInRange = daysInMonth.filter(day => 
      isWithinInterval(day, { start: startTaskDate, end: adjustedEndDate })
    );
    
    // 如果是單日任務但找不到匹配天數，確保至少返回開始日期
    if (isSameDay(startTaskDate, endTaskDate) && daysInRange.length === 0) {
      // 找到最接近的日期
      const closestDayIndex = daysInMonth.findIndex(day => 
        format(day, 'yyyy-MM-dd') === format(startTaskDate, 'yyyy-MM-dd')
      );
      
      if (closestDayIndex >= 0) {
        return [daysInMonth[closestDayIndex]];
      }
    }
    
    return daysInRange;
  };

  // 按類別分組任務
  const tasksByCategory = tasks.reduce<Record<string, MarketingTask[]>>((acc, task) => {
    const category = task.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(task);
    return acc;
  }, {});

  // 分組類別的標題行
  const categoryHeaders = Object.keys(tasksByCategory);

  // 獲取任務顏色
  const getTaskColor = (task: MarketingTask) => {
    switch (colorMode) {
      case 'category':
        return categoryColorMap[task.category] || 'bg-gray-200 hover:bg-gray-300 border-gray-300';
      case 'status':
        return statusColorMap[task.status] || 'bg-gray-200 hover:bg-gray-300 border-gray-300';
      case 'priority':
        return priorityColorMap[task.priority || '中'] || 'bg-gray-200 hover:bg-gray-300 border-gray-300';
      default:
        return 'bg-gray-200 hover:bg-gray-300 border-gray-300';
    }
  };

  // 獲取顏色模式的顯示文本
  const getColorModeText = () => {
    switch (colorMode) {
      case 'category':
        return '類別著色';
      case 'status':
        return '狀態著色';
      case 'priority':
        return '優先級著色';
      default:
        return '切換著色模式';
    }
  };

  // 設定固定寬度常量，確保所有相關元素使用相同的寬度標準
  const CELL_WIDTH = 40; // 每個日期格子的寬度
  const CATEGORY_WIDTH = 100; // 類別欄的寬度
  const TITLE_WIDTH = 180; // 任務標題欄的寬度
  
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
              <p>切換甘特圖顏色模式：類別 / 狀態 / 優先級</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="overflow-x-auto" ref={containerRef}>
        <div className="min-w-max">
          {/* 標題列 - 日期 */}
          <div className="flex border-b">
            <div style={{ width: `${CATEGORY_WIDTH + TITLE_WIDTH}px` }} className="flex-shrink-0 border-r bg-gray-50 p-2 font-medium">
              <div style={{ width: CATEGORY_WIDTH }} className="inline-block">類別</div>
              <div style={{ width: TITLE_WIDTH }} className="inline-block">項目</div>
            </div>
            <div className="flex flex-grow">
              {daysInMonth.map((day, idx) => {
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isCurrentMonth = isSameMonth(day, currentDate);
                
                return (
                  <div
                    key={idx}
                    style={{ width: `${CELL_WIDTH}px` }}
                    className={`h-12 flex-shrink-0 text-center p-1 border-r text-xs flex flex-col justify-center ${
                      isToday ? 'bg-blue-100 font-bold' : 
                      isWeekend ? 'bg-gray-100' : 
                      !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                    }`}
                  >
                    <div className="font-medium leading-tight">{format(day, 'dd')}</div>
                    <div className="text-[10px] leading-tight">{format(day, 'E', { locale: zhTW })}</div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 甘特圖主體 */}
          <div>
            {categoryHeaders.map((category) => (
              <div key={category}>
                {/* 類別標題行 */}
                <div className="flex border-t border-b bg-gray-50">
                  <div style={{ width: `${CATEGORY_WIDTH}px` }} className="flex-shrink-0 border-r p-2 font-medium truncate">
                    {category}
                  </div>
                  <div style={{ width: `${TITLE_WIDTH}px` }} className="flex-shrink-0 border-r p-2 font-medium truncate">
                    任務項目
                  </div>
                  <div className="flex flex-grow">
                    {daysInMonth.map((_, idx) => (
                      <div key={idx} style={{ width: `${CELL_WIDTH}px` }} className="flex-shrink-0 border-r"></div>
                    ))}
                  </div>
                </div>
                
                {/* 各類別下的任務 */}
                {tasksByCategory[category].map((task) => {
                  const taskDays = getTaskDaysInRange(task);
                  const status = task.status;
                  
                  // 計算任務在甘特圖中的起始位置和寬度
                  const startIdx = daysInMonth.findIndex(day => 
                    format(day, 'yyyy-MM-dd') === format(new Date(task.startTime), 'yyyy-MM-dd')
                  );
                  
                  // 如果任務不在當前月份範圍內，則不顯示
                  if (taskDays.length === 0) {
                    return null;
                  }
                  
                  return (
                    <div key={task.id} className="flex border-b hover:bg-gray-50">
                      <div 
                        style={{ width: `${CATEGORY_WIDTH}px` }}
                        className="flex-shrink-0 border-r p-2 truncate cursor-pointer"
                        onClick={() => handleTaskClick(task)}
                      >
                        {category}
                      </div>
                      <div 
                        style={{ width: `${TITLE_WIDTH}px` }}
                        className="flex-shrink-0 border-r p-2 cursor-pointer"
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="font-medium whitespace-nowrap overflow-hidden text-ellipsis" title={task.title}>
                          {task.title.length > 7 ? `${task.title.slice(0, 7)}...` : task.title}
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {format(new Date(task.startTime), 'MM/dd')} - {format(new Date(task.endTime), 'MM/dd')}
                        </div>
                      </div>
                      <div className="flex flex-grow relative">
                        {daysInMonth.map((day, idx) => (
                          <div 
                            key={idx}
                            style={{ width: `${CELL_WIDTH}px` }}
                            className={`flex-shrink-0 border-r ${
                              day.getDay() === 0 || day.getDay() === 6 ? 'bg-gray-50' : ''
                            }`}
                          ></div>
                        ))}
                        
                        {/* 任務條 */}
                        {startIdx >= 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div 
                                  className={`absolute top-0 h-full flex items-center cursor-pointer ${
                                    status === '已完成' ? 'opacity-70' : 'opacity-90'
                                  }`}
                                  style={{
                                    left: `${startIdx * CELL_WIDTH}px`,
                                    width: `${Math.max(taskDays.length, 1) * CELL_WIDTH}px`,
                                  }}
                                  onClick={() => handleTaskClick(task)}
                                >
                                  <div 
                                    className={`h-6 w-full rounded-sm ${getTaskColor(task)}`}
                                  ></div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-sm">
                                  <p className="font-bold">{task.title}</p>
                                  <p>開始: {format(new Date(task.startTime), 'yyyy/MM/dd')}</p>
                                  <p>結束: {format(new Date(task.endTime), 'yyyy/MM/dd')}</p>
                                  <p>狀態: {task.status}</p>
                                  <p>優先級: {task.priority}</p>
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
            ))}
          </div>
        </div>
      </div>
      
      {/* 編輯任務的模態框 */}
      {editingTask && (
        <MarketingTaskModal
          open={isModalOpen}
          onClose={handleModalClose}
          task={editingTask}
        />
      )}
    </div>
  );
}