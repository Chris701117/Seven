import { useState } from "react";
import { Menu, Plus, LogOut, User as UserIcon, Bell } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import CreatePostModal from "./CreatePostModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationsMenu } from "./NotificationsMenu";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  toggleSidebar: () => void;
  user: User | undefined;
  isLoading: boolean;
  isSidebarOpen?: boolean;
}

const getPageTitle = (path: string) => {
  switch (path) {
    case "/":
      return "貼文總覽";
    case "/calendar":
      return "內容日曆";
    case "/analytics":
      return "分析報表";
    case "/marketing":
      return "行銷管理";
    case "/operations":
      return "營運管理";
    case "/onelink":
      return "Onelink 管理";
    case "/recycle-bin":
      return "還原區";
    case "/settings":
      return "設定";
    case "/facebook-setup":
      return "Facebook 設置指南";
    default:
      return "貼文總覽";
  }
};

const Header = ({ toggleSidebar, user, isLoading, isSidebarOpen }: HeaderProps) => {
  const [location, setLocation] = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const pageTitle = getPageTitle(location);
  const { toast } = useToast();
  
  // 處理登出功能
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast({
          title: "登出成功",
          description: "您已成功登出系統",
        });
        // 重定向到登入頁面
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      } else {
        throw new Error("登出失敗");
      }
    } catch (error) {
      toast({
        title: "登出失敗",
        description: "無法登出系統，請稍後再試",
        variant: "destructive"
      });
    }
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="px-2 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button 
              className="md:hidden p-2 mr-2 text-gray-500 hover:bg-gray-100 rounded-md focus:outline-none touch-target" 
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? "關閉側邊欄" : "開啟側邊欄"}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
          
          {/* 桌面版用戶操作區 */}
          <div className="hidden sm:flex items-center ml-2 space-x-3">
            {user && (
              <>
                <div>
                  <NotificationsMenu />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center text-red-500 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  登出
                </Button>
                <div className="relative flex-shrink-0">
                  {isLoading ? (
                    <Skeleton className="h-9 w-9 rounded-full" />
                  ) : (
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </>
            )}
          </div>
          
          {/* 移動端用戶操作區 - 下拉菜單 */}
          <div className="flex sm:hidden items-center ml-2">
            {user && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full touch-target">
                      <Bell className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="p-2 text-center text-sm text-gray-500">沒有新通知</div>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full touch-target">
                      {isLoading ? (
                        <Skeleton className="h-7 w-7 rounded-full" />
                      ) : (
                        <Avatar className="h-7 w-7">
                          <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                        </Avatar>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56" forceMount>
                    <div className="p-2">
                      <p className="text-sm font-medium">{user?.username}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>登出</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </header>
  );
};

export default Header;
