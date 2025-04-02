import { useState, useEffect, useRef } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { MarketingTask } from '@shared/schema';
import { Edit, Calendar, AlertTriangle, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import MarketingTaskModal from './MarketingTaskModal';

interface MarketingGanttChartProps {
  tasks: MarketingTask[];
  onTaskUpdate?: (task: MarketingTask) => void;
}

// 優先級顏色映射
const priorityColorMap: Record<string, string> = {
  '高': 'bg-red-200 hover:bg-red-300',
  '中': 'bg-blue-200 hover:bg-blue-300',
  '低': 'bg-green-200 hover:bg-green-300',
};

// 任務類別顏色映射
const categoryColorMap: Record<string, string> = {
  '社群媒體': 'bg-purple-200 hover:bg-purple-300',
  '內容行銷': 'bg-cyan-200 hover:bg-cyan-300',
  '廣告投放': 'bg-amber-200 hover:bg-amber-300',
  '活動策劃': 'bg-pink-200 hover:bg-pink-300',
  '公關': 'bg-teal-200 hover:bg-teal-300',
  '其他': 'bg-gray-200 hover:bg-gray-300',
};

export default function MarketingGanttChart({ tasks }: MarketingGanttChartProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [daysInMonth, setDaysInMonth] = useState<Date[]>([]);
  const [editingTask, setEditingTask] = useState<MarketingTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 計算當前月份的所有日期
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
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentDate(prevMonth);
  };

  // 處理下一個月按鈕點擊
  const handleNextMonth = () => {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentDate(nextMonth);
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
    
    return daysInMonth.filter(day => 
      isWithinInterval(day, { start: startTaskDate, end: endTaskDate })
    );
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

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* 月份導航 */}
      <div className="flex justify-between items-center bg-gray-100 p-4">
        <Button variant="outline" onClick={handlePrevMonth}>
          上個月
        </Button>
        <h2 className="text-xl font-bold">
          {format(currentDate, 'yyyy年MM月', { locale: zhTW })}
        </h2>
        <Button variant="outline" onClick={handleNextMonth}>
          下個月
        </Button>
      </div>
      
      <div className="overflow-x-auto" ref={containerRef}>
        <div className="min-w-max">
          {/* 標題列 - 日期 */}
          <div className="flex">
            <div className="w-48 flex-shrink-0 border-r bg-gray-50 p-2 font-medium">
              類別 / 項目
            </div>
            <div className="flex flex-grow">
              {daysInMonth.map((day, idx) => {
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                
                return (
                  <div
                    key={idx}
                    className={`w-10 flex-shrink-0 text-center p-2 border-r text-xs ${
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
            {categoryHeaders.map((category) => (
              <div key={category}>
                {/* 類別標題行 */}
                <div className="flex border-t">
                  <div className="w-48 flex-shrink-0 border-r bg-gray-100 p-2 font-medium truncate">
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
                  
                  return (
                    <div key={task.id} className="flex border-t">
                      <div 
                        className="w-48 flex-shrink-0 border-r p-2 truncate hover:bg-gray-50"
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
                          <div 
                            className={`absolute top-0 h-full flex items-center cursor-pointer ${
                              isCompleted ? 'opacity-50' : 'opacity-90'
                            }`}
                            style={{
                              left: `${startIdx * 40}px`,
                              width: `${taskDays.length * 40}px`,
                            }}
                            onClick={() => handleTaskClick(task)}
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div 
                                    className={`h-6 w-full rounded-md px-1 flex items-center justify-between text-xs ${
                                      isCompleted ? 'bg-green-200 hover:bg-green-300' :
                                      isDelayed ? 'bg-red-200 hover:bg-red-300' :
                                      isPending ? 'bg-yellow-200 hover:bg-yellow-300' :
                                      isInProgress ? 'bg-blue-200 hover:bg-blue-300' :
                                      priorityColorMap[task.priority || '中']
                                    }`}
                                  >
                                    <span className="truncate max-w-[80%]">{task.title}</span>
                                    <div className="flex items-center">
                                      {isDelayed && <AlertTriangle className="h-3 w-3 text-red-700" />}
                                      {isCompleted && <CheckSquare className="h-3 w-3 text-green-700" />}
                                      {isInProgress && <Calendar className="h-3 w-3 text-blue-700" />}
                                      <Edit className="h-3 w-3 ml-1" />
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="p-2 max-w-xs">
                                    <p className="font-bold">{task.title}</p>
                                    <p className="text-sm mt-1">{task.description || task.content}</p>
                                    <div className="text-xs mt-2">
                                      <p><span className="font-medium">狀態:</span> {task.status}</p>
                                      <p><span className="font-medium">優先級:</span> {task.priority}</p>
                                      <p><span className="font-medium">時間:</span> {format(new Date(task.startTime), 'yyyy/MM/dd')} - {format(new Date(task.endTime), 'yyyy/MM/dd')}</p>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
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