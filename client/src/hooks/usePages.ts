import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Page } from '@shared/schema';

// 激活的頁面ID的本地存儲鍵
const ACTIVE_PAGE_KEY = 'facebook_manager_active_page';

// Hook 用於獲取所有頁面
export function useAllPages() {
  return useQuery<Page[]>({
    queryKey: ['/api/pages'],
    queryFn: () => apiRequest('/api/pages'),
  });
}

// Hook 用於管理激活的頁面
export function useActivePage() {
  const [activePageId, setActivePageIdState] = useState<string | null>(() => {
    // 從本地存儲中恢復激活的頁面ID
    const saved = localStorage.getItem(ACTIVE_PAGE_KEY);
    return saved || null;
  });

  // 監聽 activePageId 的變化並保存到本地存儲
  useEffect(() => {
    if (activePageId) {
      localStorage.setItem(ACTIVE_PAGE_KEY, activePageId);
    }
  }, [activePageId]);

  // 設置激活頁面的方法
  const setActivePageId = (pageId: string) => {
    setActivePageIdState(pageId);
  };

  // 獲取激活頁面的詳細信息
  const { data: activePage, isLoading: isActivePageLoading } = useQuery<Page | null>({
    queryKey: ['/api/pages', activePageId],
    queryFn: async () => {
      if (!activePageId) return null;
      return apiRequest(`/api/pages/${activePageId}`);
    },
    enabled: !!activePageId,
  });

  return {
    activePageId,
    setActivePageId,
    activePage,
    isActivePageLoading
  };
}