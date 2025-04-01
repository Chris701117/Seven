import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useQuery } from "@tanstack/react-query";
import { Page, User } from "@shared/schema";
import { WebSocketProvider } from "./WebSocketProvider";
import { Toaster } from "@/components/ui/toaster";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  const { data: pages = [], isLoading: isLoadingPages } = useQuery<Page[]>({
    queryKey: ['/api/pages'],
    enabled: !!user,
  });

  const [activePage, setActivePage] = useState<string | null>(null);

  // Set the first page as active when pages are loaded
  useEffect(() => {
    if (pages.length > 0 && !activePage) {
      setActivePage(pages[0].pageId);
    }
  }, [pages, activePage]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <WebSocketProvider userId={user?.id || null}>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          pages={pages || []} 
          activePage={activePage}
          onPageChange={setActivePage}
          isLoading={isLoadingPages}
        />
        
        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header 
            toggleSidebar={toggleSidebar} 
            user={user}
            isLoading={isLoadingUser}
          />
          
          {/* Content Area */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 sm:p-6 lg:p-8 bg-neutral-100">
            {children}
          </main>
        </div>
        <Toaster />
      </div>
    </WebSocketProvider>
  );
};

export default Layout;
