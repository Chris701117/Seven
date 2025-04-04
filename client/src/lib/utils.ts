import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  } else {
    return value.toString();
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function formatDateDisplay(date: Date | string | null): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(dateObj);
}

// 貼文類別的中英文對照表
export const categoryTranslations: Record<string, string> = {
  'promotion': '宣傳',
  'event': '活動',
  'announcement': '公告',
  // 反向對照表
  '宣傳': 'promotion',
  '活動': 'event',
  '公告': 'announcement',
};

// 獲取類別的中文名稱
export function getCategoryDisplayName(category: string | null | undefined): string {
  if (!category) return '未分類';
  return categoryTranslations[category] || category;
}

export function getPostStatusColor(status: string): {
  bg: string;
  text: string;
  hover: string;
} {
  switch (status) {
    case 'published':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        hover: 'hover:bg-green-200'
      };
    case 'publish_failed':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        hover: 'hover:bg-red-200'
      };
    case 'scheduled':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        hover: 'hover:bg-blue-200'
      };
    case 'draft':
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        hover: 'hover:bg-gray-200'
      };
  }
}
