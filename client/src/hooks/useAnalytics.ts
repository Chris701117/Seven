import { useQuery } from "@tanstack/react-query";
import { facebookApi } from "@/lib/facebookApi";
import { PostAnalytics, PageAnalytics } from "@shared/schema";

export const usePostAnalytics = (postId: string | null) => {
  const query = useQuery<PostAnalytics>({
    queryKey: [`/api/posts/${postId}/analytics`],
    enabled: !!postId,
  });
  
  return {
    analytics: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};

export const usePageAnalytics = (pageId: string | null) => {
  const query = useQuery<PageAnalytics>({
    queryKey: [`/api/pages/${pageId}/analytics`],
    enabled: !!pageId,
  });
  
  return {
    analytics: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};

// For analytics page with charts
export const useAnalyticsData = (pageId: string | null, period: "day" | "week" | "month" = "week") => {
  const { analytics, isLoading, isError } = usePageAnalytics(pageId);
  
  // Generate mock data for charts - in a real app, this would come from the API
  const generateChartData = () => {
    if (!analytics) return [];
    
    const now = new Date();
    const data = [];
    
    if (period === "day") {
      // Hourly data for last 24 hours
      for (let i = 23; i >= 0; i--) {
        const date = new Date(now);
        date.setHours(date.getHours() - i);
        
        const randomFactor = 1 + (Math.random() * 0.2 - 0.1); // Random factor between 0.9 and 1.1
        
        data.push({
          time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          likes: Math.round(((analytics.totalLikes ?? 0) / 24) * randomFactor),
          comments: Math.round(((analytics.totalComments ?? 0) / 24) * randomFactor),
          shares: Math.round(((analytics.totalShares ?? 0) / 24) * randomFactor),
        });
      }
    } else if (period === "week") {
      // Daily data for last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        const randomFactor = 1 + (Math.random() * 0.3 - 0.15); // Random factor between 0.85 and 1.15
        
        data.push({
          time: date.toLocaleDateString([], { weekday: 'short' }),
          likes: Math.round(((analytics.totalLikes ?? 0) / 7) * randomFactor),
          comments: Math.round(((analytics.totalComments ?? 0) / 7) * randomFactor),
          shares: Math.round(((analytics.totalShares ?? 0) / 7) * randomFactor),
        });
      }
    } else if (period === "month") {
      // Weekly data for last 4 weeks
      for (let i = 4; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - (i * 7));
        
        const randomFactor = 1 + (Math.random() * 0.4 - 0.2); // Random factor between 0.8 and 1.2
        
        data.push({
          time: `Week ${5 - i}`,
          likes: Math.round(((analytics.totalLikes ?? 0) / 4) * randomFactor),
          comments: Math.round(((analytics.totalComments ?? 0) / 4) * randomFactor),
          shares: Math.round(((analytics.totalShares ?? 0) / 4) * randomFactor),
        });
      }
    }
    
    return data;
  };
  
  return {
    chartData: generateChartData(),
    analytics,
    isLoading,
    isError,
  };
};
