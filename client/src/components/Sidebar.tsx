import { Link, useLocation } from "wouter";
import { Facebook, Home, Calendar, BarChart2, Settings, ChevronDown, HelpCircle, Megaphone, Clipboard, Link2, Trash2, X } from "lucide-react";
import { Page } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef, useEffect } from "react";

interface SidebarProps {
  isOpen: boolean;
  pages: Page[];
  activePage: string | null;
  onPageChange: (pageId: string) => void;
  isLoading: boolean;
  onClose?: () => void; // 關閉側邊欄的回調函數
}

const Sidebar = ({ isOpen, pages, activePage, onPageChange, isLoading, onClose }: SidebarProps) => {
  const [location] = useLocation();
  const [isPageSelectorOpen, setIsPageSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  const getActivePage = () => {
    if (!activePage || !pages.length) return null;
    return pages.find(page => page.pageId === activePage);
  };

  // 監聽螢幕大小變化
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    
    // 初始檢查
    checkScreenSize();
    
    // 添加事件監聽器
    window.addEventListener('resize', checkScreenSize);
    
    // 清理事件監聽器
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 處理點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsPageSelectorOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 創建側邊欄覆蓋層（僅在移動設備且側邊欄開啟時顯示）
  const SidebarBackdrop = () => {
    if (!isOpen || !isSmallScreen) return null;
    
    return (
      <div 
        className="fixed inset-0 bg-black/30 z-40 md:hidden" 
        onClick={onClose}
        aria-hidden="true"
      />
    );
  };

  // 在大型設備上，如果側邊欄閉合，不顯示任何內容
  if (!isOpen && !isSmallScreen) {
    return null;
  }

  return (
    <>
      <SidebarBackdrop />
      <div 
        className={`
          fixed md:static inset-y-0 left-0 z-50 
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
          h-screen flex flex-col w-[280px] md:w-64 border-r border-neutral-200 bg-white
        `}
      >
        <div className="flex items-center justify-between h-16 border-b border-neutral-200 px-4">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center">
            <img src={new URL('../assets/logo.png', import.meta.url).href} alt="Logo" className="inline-block mr-2 w-8 h-8" />
            <span>七七七科技</span>
          </h1>
          {isSmallScreen && (
            <button 
              className="p-2 rounded-full hover:bg-gray-100 touch-target"
              onClick={onClose}
              aria-label="關閉側邊欄"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {/* 導航項目 - 適配移動設備的點擊區域 */}
            <Link href="/">
              <a className={`sidebar-item flex items-center px-4 py-3 rounded-md touch-target ${location === '/' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Home className="h-5 w-5 mr-3 flex-shrink-0" />
                <span>貼文管理</span>
              </a>
            </Link>
            <Link href="/calendar">
              <a className={`sidebar-item flex items-center px-4 py-3 rounded-md touch-target ${location === '/calendar' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Calendar className="h-5 w-5 mr-3 flex-shrink-0" />
                <span>內容日曆</span>
              </a>
            </Link>
            <Link href="/analytics">
              <a className={`sidebar-item flex items-center px-4 py-3 rounded-md touch-target ${location === '/analytics' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                <BarChart2 className="h-5 w-5 mr-3 flex-shrink-0" />
                <span>數據分析</span>
              </a>
            </Link>
            <Link href="/marketing">
              <a className={`sidebar-item flex items-center px-4 py-3 rounded-md touch-target ${location === '/marketing' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Megaphone className="h-5 w-5 mr-3 flex-shrink-0" />
                <span>行銷管理</span>
              </a>
            </Link>
            <Link href="/operations">
              <a className={`sidebar-item flex items-center px-4 py-3 rounded-md touch-target ${location === '/operations' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Clipboard className="h-5 w-5 mr-3 flex-shrink-0" />
                <span>營運管理</span>
              </a>
            </Link>
            <Link href="/onelink">
              <a className={`sidebar-item flex items-center px-4 py-3 rounded-md touch-target ${location === '/onelink' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Link2 className="h-5 w-5 mr-3 flex-shrink-0" />
                <span>Onelink 管理</span>
              </a>
            </Link>
            <Link href="/recycle-bin">
              <a className={`sidebar-item flex items-center px-4 py-3 rounded-md touch-target ${location === '/recycle-bin' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Trash2 className="h-5 w-5 mr-3 flex-shrink-0" />
                <span>還原區</span>
              </a>
            </Link>
          </nav>
          
          {/* 粉絲頁面選擇器 */}
          <div className="px-4 py-3 border-t border-neutral-200">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">您的粉絲專頁</div>
            
            {/* 頁面選擇下拉選單 */}
            <div className="relative" ref={selectorRef}>
              <button
                className="w-full p-3 font-medium text-left bg-gray-50 hover:bg-gray-100 rounded-md flex items-center justify-between touch-target"
                onClick={() => setIsPageSelectorOpen(!isPageSelectorOpen)}
              >
                <div className="flex items-center overflow-hidden">
                  {isLoading ? (
                    <Skeleton className="w-8 h-8 rounded-full mr-3 flex-shrink-0" />
                  ) : (
                    <img 
                      src={getActivePage()?.picture || "https://via.placeholder.com/32"} 
                      alt={getActivePage()?.pageName || "Facebook Page"} 
                      className="w-8 h-8 rounded-full mr-3 flex-shrink-0"
                    />
                  )}
                  
                  <div className="truncate max-w-[180px]">
                    {isLoading ? (
                      <Skeleton className="h-4 w-28" />
                    ) : (
                      getActivePage()?.pageName || "選擇頁面"
                    )}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 flex-shrink-0 ml-1" />
              </button>
              
              {isPageSelectorOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                  {isLoading ? (
                    Array(3).fill(0).map((_, index) => (
                      <div key={index} className="p-3 border-b last:border-0 flex items-center">
                        <Skeleton className="w-6 h-6 rounded-full mr-3 flex-shrink-0" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    ))
                  ) : (
                    pages.length > 0 ? (
                      pages.map(page => (
                        <button
                          key={page.pageId}
                          className={`w-full p-3 text-left flex items-center touch-target ${page.pageId === activePage ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          onClick={() => {
                            onPageChange(page.pageId);
                            setIsPageSelectorOpen(false);
                          }}
                        >
                          <img src={page.picture || undefined} alt={page.pageName} className="w-6 h-6 rounded-full mr-3 flex-shrink-0" />
                          <span className="truncate">{page.pageName}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-gray-500">尚未連接任何粉絲專頁</div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-neutral-200">
          <Link href="/settings">
            <a className={`sidebar-item flex items-center px-4 py-3 rounded-md touch-target ${location === '/settings' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Settings className="h-5 w-5 mr-3 flex-shrink-0" />
              <span>設定</span>
            </a>
          </Link>
          <Link href="/facebook-setup">
            <a className={`sidebar-item flex items-center px-4 py-3 rounded-md touch-target ${location === '/facebook-setup' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              <HelpCircle className="h-5 w-5 mr-3 flex-shrink-0" />
              <span>Facebook 設置指南</span>
            </a>
          </Link>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
