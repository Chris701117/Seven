import { useQuery } from "@tanstack/react-query";
import AnalyticsCard from "./AnalyticsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { PageAnalytics } from "@shared/schema";

interface AnalyticsOverviewProps {
  pageId: string;
}

const AnalyticsOverview = ({ pageId }: AnalyticsOverviewProps) => {
  const [weeklyChanges, setWeeklyChanges] = useState({
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0
  });

  const { data: analytics, isLoading } = useQuery<PageAnalytics>({
    queryKey: [`/api/pages/${pageId}/analytics`],
    enabled: !!pageId,
  });

  // Simulate weekly changes - in a real app, this would come from the API
  useEffect(() => {
    if (analytics) {
      setWeeklyChanges({
        likes: Math.round((Math.random() * 10) - 3),
        comments: Math.round((Math.random() * 10) - 2),
        shares: Math.round((Math.random() * 8) - 4),
        views: Math.round((Math.random() * 15) - 3)
      });
    }
  }, [analytics]);

  if (!pageId) {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Page Analytics Overview</h3>
        <div className="text-gray-500">Please select a page to view analytics</div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Page Analytics Overview</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          // Loading state
          <>
            {[...Array(4)].map((_, index) => (
              <div key={index} className="bg-white shadow rounded-lg p-5">
                <div className="flex items-center">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="ml-5 w-0 flex-1">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
                <div className="mt-4">
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </>
        ) : analytics ? (
          // Data loaded
          <>
            <AnalyticsCard 
              title="Total Likes" 
              value={analytics.totalLikes ?? 0} 
              icon="thumbs-up"
              changePercent={weeklyChanges.likes} 
            />
            <AnalyticsCard 
              title="Comments" 
              value={analytics.totalComments ?? 0} 
              icon="comment"
              changePercent={weeklyChanges.comments} 
            />
            <AnalyticsCard 
              title="Shares" 
              value={analytics.totalShares ?? 0} 
              icon="share"
              changePercent={weeklyChanges.shares} 
            />
            <AnalyticsCard 
              title="Page Views" 
              value={analytics.pageViews ?? 0} 
              icon="eye"
              changePercent={weeklyChanges.views} 
            />
          </>
        ) : (
          // No data
          <div className="col-span-4 text-center text-gray-500">
            No analytics data available for this page
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsOverview;
