import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import AnalyticsOverview from "@/components/AnalyticsOverview";
import PostList from "@/components/PostList";
import CalendarPreview from "@/components/CalendarPreview";
import { Page } from "@shared/schema";

const Dashboard = () => {
  const [activePageId, setActivePageId] = useState<string | null>(null);
  
  // Get all pages for the user
  const { data: pages, isLoading: isLoadingPages } = useQuery<Page[]>({
    queryKey: ['/api/pages'],
  });
  
  // Set the first page as active when pages are loaded
  useEffect(() => {
    if (pages && pages.length > 0 && !activePageId) {
      setActivePageId(pages[0].pageId);
    }
  }, [pages, activePageId]);
  
  return (
    <>
      {/* Analytics Overview */}
      <AnalyticsOverview pageId={activePageId || ""} />
      
      {/* Posts Management Section */}
      <PostList pageId={activePageId || ""} />
      
      {/* Content Calendar Preview */}
      <CalendarPreview pageId={activePageId || ""} />
    </>
  );
};

export default Dashboard;
