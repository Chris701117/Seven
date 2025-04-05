import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { WebSocketProvider } from "./WebSocketProvider";
import { Toaster } from "@/components/ui/toaster";
import { usePageContext } from "../contexts/PageContext";
import { X } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  
  // 使用 Page Context
  const { pages, isLoading: isLoadingPages, activePage, setActivePage } = usePageContext();
  
  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  // 監聽螢幕大小變化
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
      // 在大型設備上自動展開側邊欄，在小型設備上自動收起
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    // 初始檢查
    checkScreenSize();

    // 添加事件監聽器
    window.addEventListener('resize', checkScreenSize);
    
    // 添加自定義事件監聽器，用於處理側邊欄關閉
    const handleCloseSidebar = () => setIsSidebarOpen(false);
    window.addEventListener('closeSidebar', handleCloseSidebar);

    // 清理函數
    return () => {
      window.removeEventListener('resize', checkScreenSize);
      window.removeEventListener('closeSidebar', handleCloseSidebar);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <WebSocketProvider userId={user?.id || null}>
      <div className="flex h-screen bg-neutral-100 overflow-hidden">
        {/* 側邊欄 - 使用新的響應式佈局 */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          pages={pages} 
          activePage={activePage}
          onPageChange={(pageId) => {
            setActivePage(pageId);
            if (isSmallScreen) setIsSidebarOpen(false);
          }}
          isLoading={isLoadingPages}
          onClose={() => setIsSidebarOpen(false)}
        />
        
        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header 
            toggleSidebar={toggleSidebar} 
            user={user}
            isLoading={isLoadingUser}
            isSidebarOpen={isSidebarOpen}
          />
          
          {/* Content Area - 增加移動端的內邊距，優化顯示效果 */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none p-3 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
        <Toaster />
      </div>
    </WebSocketProvider>
  );
};

export default Layout;
