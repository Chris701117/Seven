import { CheckCircle, Clock, AlertCircle, Clock2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusProps {
  status: 'published' | 'scheduled' | 'draft' | 'completed' | 'pending' | 'deleted';
  className?: string;
}

export function Status({ status, className }: StatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'published':
        return {
          icon: CheckCircle,
          text: '已發布',
          className: 'bg-green-100 text-green-800 border-green-300',
        };
      case 'scheduled':
        return {
          icon: Clock,
          text: '已排程',
          className: 'bg-blue-100 text-blue-800 border-blue-300',
        };
      case 'draft':
        return {
          icon: Clock2,
          text: '草稿',
          className: 'bg-gray-100 text-gray-800 border-gray-300',
        };
      case 'completed':
        return {
          icon: CheckCircle,
          text: '已完成',
          className: 'bg-green-100 text-green-800 border-green-300',
        };
      case 'pending':
        return {
          icon: AlertCircle,
          text: '待處理',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        };
      case 'deleted':
        return {
          icon: Trash2,
          text: '已刪除',
          className: 'bg-red-100 text-red-800 border-red-300',
        };
      default:
        return {
          icon: AlertCircle,
          text: '未知',
          className: 'bg-gray-100 text-gray-800 border-gray-300',
        };
    }
  };

  const { icon: Icon, text, className: statusClassName } = getStatusConfig();

  return (
    <div
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        statusClassName,
        className
      )}
    >
      <Icon className="w-3 h-3 mr-1" />
      {text}
    </div>
  );
}