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
      return "貼文總覽";
    case "/calendar":
      return "內容日曆";
    case "/analytics":
      return "分析報表";
    case "/settings":
      return "設定";
    default:
      return "貼文總覽";
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
                    <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </header>
  );
};

export default Header;
