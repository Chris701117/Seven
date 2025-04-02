import { useState, useEffect, useRef } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, addMonths, isSameMonth } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { OperationTask } from '@shared/schema';
import { Edit, Calendar, AlertTriangle, CheckSquare, ArrowLeft, ArrowRight, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import OperationTaskModal from '@/components/OperationTaskModal';

interface OperationGanttChartProps {
  tasks: OperationTask[];
  onTaskUpdate?: (task: OperationTask) => void;
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
  '活動': 'bg-amber-200 hover:bg-amber-300 border-amber-300',
  '測試': 'bg-pink-200 hover:bg-pink-300 border-pink-300',
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

export default function OperationGanttChart({ tasks }: OperationGanttChartProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [daysInMonth, setDaysInMonth] = useState<Date[]>([]);
  const [editingTask, setEditingTask] = useState<OperationTask | null>(null);
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
  const handleTaskClick = (task: OperationTask) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  // 模態框關閉時重置狀態
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  // 計算任務應該位於哪些日期格子中
  const getTaskDaysInRange = (task: OperationTask) => {
    const startTaskDate = new Date(task.startTime);
    const endTaskDate = new Date(task.endTime);
    
    return daysInMonth.filter(day => 
      isWithinInterval(day, { start: startTaskDate, end: endTaskDate })
    );
  };

  // 按類別分組任務
  const tasksByCategory = tasks.reduce<Record<string, OperationTask[]>>((acc, task) => {
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
  const getTaskColor = (task: OperationTask) => {
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
            <div className="w-48 flex-shrink-0 border-r bg-gray-50 p-2 font-medium">
              類別 / 項目
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
                暫無營運任務數據，請創建新任務。
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
                  
                  {/* 各類別下的任務 */}
                  {tasksByCategory[category].map((task) => {
                    const taskDays = getTaskDaysInRange(task);
                    const status = task.status;
                    const isCompleted = status === '已完成';
                    const isDelayed = status === '已延遲';
                    const isPending = status === '待處理';
                    const isInProgress = status === '進行中';
                    
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
                          className="w-48 flex-shrink-0 border-r p-2 truncate cursor-pointer"
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className="font-medium truncate">{task.title}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {format(new Date(task.startTime), 'MM/dd')} - {format(new Date(task.endTime), 'MM/dd')}
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
                          
                          {/* 任務條 */}
                          {startIdx >= 0 && taskDays.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div 
                                    className={`absolute top-0 h-full flex items-center cursor-pointer ${
                                      isCompleted ? 'opacity-70' : 'opacity-90'
                                    }`}
                                    style={{
                                      left: `${startIdx * 40}px`,
                                      width: `${taskDays.length * 40}px`,
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
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* 編輯任務的模態框 */}
      {editingTask && (
        <OperationTaskModal
          open={isModalOpen}
          onClose={handleModalClose}
          task={editingTask}
        />
      )}
    </div>
  );
}