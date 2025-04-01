import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Page } from '@shared/schema';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface PageContextType {
  pages: Page[];
  isLoading: boolean;
  activePage: string | null;
  setActivePage: (pageId: string) => void;
  activePageData: Page | null;
}

const PageContext = createContext<PageContextType>({
  pages: [],
  isLoading: false,
  activePage: null,
  setActivePage: () => {},
  activePageData: null
});

interface PageProviderProps {
  children: ReactNode;
}

export const PageProvider = ({ children }: PageProviderProps) => {
  const [activePage, setActivePage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // 獲取頁面列表
  const { data: pages = [], isLoading } = useQuery<Page[]>({
    queryKey: ['/api/pages']
  });
  
  // 當頁面數據加載成功時，設置第一個頁面為活動頁面
  useEffect(() => {
    if (pages.length > 0 && !activePage) {
      setActivePage(pages[0].pageId);
    }
  }, [pages, activePage]);

  // 從頁面列表中獲取當前選中的頁面數據
  const activePageData = activePage
    ? pages.find((page: Page) => page.pageId === activePage) || null
    : null;

  // 當頁面切換時，更新相關查詢
  useEffect(() => {
    if (activePage) {
      // 重新獲取與當前活動頁面相關的數據
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${activePage}/posts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${activePage}/analytics`] });
    }
  }, [activePage, queryClient]);

  const value = {
    pages,
    isLoading,
    activePage,
    setActivePage,
    activePageData
  };

  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
};

export const usePageContext = () => useContext(PageContext);