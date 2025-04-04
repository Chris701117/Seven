import { Link, useLocation } from "wouter";
import { Facebook, Home, Calendar, BarChart2, Settings, ChevronDown, HelpCircle, Megaphone, Clipboard, Link2, Trash2 } from "lucide-react";
import { Page } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

interface SidebarProps {
  isOpen: boolean;
  pages: Page[];
  activePage: string | null;
  onPageChange: (pageId: string) => void;
  isLoading: boolean;
}

const Sidebar = ({ isOpen, pages, activePage, onPageChange, isLoading }: SidebarProps) => {
  const [location] = useLocation();
  const [isPageSelectorOpen, setIsPageSelectorOpen] = useState(false);

  const getActivePage = () => {
    if (!activePage || !pages.length) return null;
    return pages.find(page => page.pageId === activePage);
  };

  return (
    <div className={`${isOpen ? 'block' : 'hidden'} md:flex md:flex-shrink-0`}>
      <div className="flex flex-col w-64 border-r border-neutral-200 bg-white">
        <div className="flex items-center justify-center h-16 border-b border-neutral-200">
          <h1 className="text-xl font-semibold text-gray-800">
            <img src={new URL('../assets/logo.png', import.meta.url).href} alt="Logo" className="inline-block mr-2 w-8 h-8" />
            七七七科技
          </h1>
        </div>
        <div className="h-0 flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            <Link href="/">
              <a className={`sidebar-item flex items-center px-4 py-3 rounded-md ${location === '/' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Home className="h-5 w-5 mr-3" />
                <span>貼文管理</span>
              </a>
            </Link>
            <Link href="/calendar">
              <a className={`sidebar-item flex items-center px-4 py-3 rounded-md ${location === '/calendar' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Calendar className="h-5 w-5 mr-3" />
                <span>內容日曆</span>
              </a>
            </Link>
            <Link href="/analytics">
              <a className={`sidebar-item flex items-center px-4 py-3 rounded-md ${location === '/analytics' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800' : 'text-gray-600 hover:bg-gray-50'}`}>
                <BarChart2 className="h-5 w-5 mr-3" />
                <span>數據分析</span>
              </a>
            </Link>
            <Link href="/marketing">
              <a className={`sidebar-item flex items-center px-4 py-3 rounded-md ${location === '/marketing' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Megaphone className="h-5 w-5 mr-3" />
                <span>行銷管理</span>
              </a>
            </Link>
            <Link href="/operations">
              <a className={`sidebar-item flex items-center px-4 py-3 rounded-md ${location === '/operations' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Clipboard className="h-5 w-5 mr-3" />
                <span>營運管理</span>
              </a>
            </Link>
            <Link href="/onelink">
              <a className={`sidebar-item flex items-center px-4 py-3 rounded-md ${location === '/onelink' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Link2 className="h-5 w-5 mr-3" />
                <span>Onelink 管理</span>
              </a>
            </Link>
            <Link href="/recycle-bin">
              <a className={`sidebar-item flex items-center px-4 py-3 rounded-md ${location === '/recycle-bin' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Trash2 className="h-5 w-5 mr-3" />
                <span>還原區</span>
              </a>
            </Link>
            <Link href="/settings">
              <a className={`sidebar-item flex items-center px-4 py-3 rounded-md ${location === '/settings' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Settings className="h-5 w-5 mr-3" />
                <span>設定</span>
              </a>
            </Link>
            <Link href="/facebook-setup">
              <a className={`sidebar-item flex items-center px-4 py-3 rounded-md ${location === '/facebook-setup' ? 'active bg-blue-50 border-l-4 border-primary text-gray-800' : 'text-gray-600 hover:bg-gray-50'}`}>
                <HelpCircle className="h-5 w-5 mr-3" />
                <span>Facebook 設置指南</span>
              </a>
            </Link>
          </nav>
          
          {/* Page selector */}
          <div className="p-4 border-t border-neutral-200">
            <div className="mb-2 text-sm font-medium text-gray-500">管理粉絲頁</div>
            
            {isLoading ? (
              <div className="px-3 py-2">
                <div className="flex items-center">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32 ml-2" />
                </div>
              </div>
            ) : (
              <div className="relative">
                <div 
                  className="flex items-center px-3 py-2 bg-white border rounded-md cursor-pointer hover:bg-gray-50"
                  onClick={() => setIsPageSelectorOpen(!isPageSelectorOpen)}
                >
                  {getActivePage() ? (
                    <>
                      <img 
                        src={getActivePage()?.picture || "https://via.placeholder.com/32"} 
                        alt="粉絲頁頭像" 
                        className="w-8 h-8 rounded-full" 
                      />
                      <div className="ml-2 text-sm font-medium text-gray-700">{getActivePage()?.pageName}</div>
                      <ChevronDown className="ml-auto text-gray-400 h-4 w-4" />
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">沒有可用的粉絲頁</div>
                  )}
                </div>
                
                {isPageSelectorOpen && pages.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10">
                    {pages.map(page => (
                      <div 
                        key={page.pageId}
                        className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 ${page.pageId === activePage ? 'bg-blue-50' : ''}`}
                        onClick={() => {
                          onPageChange(page.pageId);
                          setIsPageSelectorOpen(false);
                        }}
                      >
                        <img 
                          src={page.picture || "https://via.placeholder.com/32"} 
                          alt={page.pageName} 
                          className="w-8 h-8 rounded-full" 
                        />
                        <div className="ml-2 text-sm font-medium text-gray-700">{page.pageName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
