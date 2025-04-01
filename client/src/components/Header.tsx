import { useState } from "react";
import { Menu, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import CreatePostModal from "./CreatePostModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationsMenu } from "./NotificationsMenu";
import { User } from "@shared/schema";

interface HeaderProps {
  toggleSidebar: () => void;
  user: User | undefined;
  isLoading: boolean;
}

const getPageTitle = (path: string) => {
  switch (path) {
    case "/":
      return "儀表板";
    case "/calendar":
      return "內容日曆";
    case "/analytics":
      return "分析報表";
    case "/settings":
      return "設定";
    default:
      return "儀表板";
  }
};

const Header = ({ toggleSidebar, user, isLoading }: HeaderProps) => {
  const [location] = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const pageTitle = getPageTitle(location);

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <button 
              className="md:hidden px-4 text-gray-500 focus:outline-none" 
              onClick={toggleSidebar}
            >
              <Menu />
            </button>
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-gray-800">{pageTitle}</h2>
            </div>
          </div>
          <div className="flex items-center">
            <Button 
              className="ml-3 flex items-center" 
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              建立貼文
            </Button>
            {/* 通知菜單 */}
            {user && <div className="ml-3">
              <NotificationsMenu />
            </div>}
            <div className="ml-4 relative flex-shrink-0">
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-8 rounded-full" />
                ) : (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.picture || ""} alt="User profile" />
                    <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Command bar */}
        <div className="border-t border-gray-200 py-3 flex flex-wrap justify-between items-center">
          <div className="flex space-x-2">
            <div className="relative">
              <select className="pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary">
                <option>所有貼文</option>
                <option>已發佈</option>
                <option>已排程</option>
                <option>草稿</option>
              </select>
            </div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="搜尋貼文..." 
                className="pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex space-x-2 mt-2 sm:mt-0">
            <Button variant="outline" size="sm" className="text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              篩選
            </Button>
            <Button variant="outline" size="sm" className="text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              排序
            </Button>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </header>
  );
};

export default Header;
