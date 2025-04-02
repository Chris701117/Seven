import { useState } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { MarketingTask } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Edit, Calendar } from 'lucide-react';
import MarketingTaskModal from './MarketingTaskModal';

interface MarketingGanttChartProps {
  tasks: MarketingTask[];
  onTaskUpdate?: (task: MarketingTask) => void;
}

// 簡化版的甘特圖組件，用於修復渲染問題
export default function MarketingGanttChart({ tasks }: MarketingGanttChartProps) {
  const [editingTask, setEditingTask] = useState<MarketingTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentDate = new Date();

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

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* 月份導航 */}
      <div className="flex justify-between items-center bg-gray-100 p-4">
        <h2 className="text-xl font-bold">
          {format(currentDate, 'yyyy年MM月', { locale: zhTW })} 行銷任務
        </h2>
        <Button variant="outline" disabled>
          正在開發甘特圖功能...
        </Button>
      </div>
      
      {/* 簡化的任務表格 */}
      <div className="overflow-x-auto p-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-2 text-left">項目名稱</th>
              <th className="border p-2 text-left">類別</th>
              <th className="border p-2 text-left">開始日期</th>
              <th className="border p-2 text-left">結束日期</th>
              <th className="border p-2 text-left">狀態</th>
              <th className="border p-2 text-left">優先級</th>
              <th className="border p-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="border p-2">{task.title}</td>
                <td className="border p-2">{task.category}</td>
                <td className="border p-2">{format(new Date(task.startTime), 'yyyy/MM/dd')}</td>
                <td className="border p-2">{format(new Date(task.endTime), 'yyyy/MM/dd')}</td>
                <td className="border p-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    task.status === '已完成' ? 'bg-green-100 text-green-800' :
                    task.status === '已延遲' ? 'bg-red-100 text-red-800' :
                    task.status === '進行中' ? 'bg-blue-100 text-blue-800' :
                    task.status === '待處理' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.status}
                  </span>
                </td>
                <td className="border p-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    task.priority === '高' ? 'bg-red-100 text-red-800' :
                    task.priority === '中' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {task.priority}優先
                  </span>
                </td>
                <td className="border p-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleTaskClick(task)}
                    className="flex items-center"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    編輯
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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