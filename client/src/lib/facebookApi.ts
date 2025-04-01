import { apiRequest } from "./queryClient";

interface FacebookPost {
  id: string;
  message: string;
  created_time: string;
  status_type?: string;
  permalink_url?: string;
  full_picture?: string;
  link?: string;
}

interface FacebookPostAnalytics {
  id: string;
  reactions?: {
    summary: {
      total_count: number;
    };
  };
  comments?: {
    summary: {
      total_count: number;
    };
  };
  shares?: {
    count: number;
  };
}

interface FacebookPageInsights {
  name: string;
  period: string;
  values: {
    value: number;
    end_time: string;
  }[];
}

interface FacebookAudienceData {
  age_gender: {
    age_range: string;
    gender: string;
    percentage: number;
  }[];
  locations: {
    city: string;
    country: string;
    percentage: number;
  }[];
}

export const facebookApi = {
  // Auth related functions
  saveAccessToken: async (accessToken: string, fbUserId: string) => {
    return apiRequest("POST", "/api/auth/facebook", { accessToken, fbUserId });
  },
  
  // Pages related functions
  fetchUserPages: async () => {
    return apiRequest("GET", "/api/pages");
  },
  
  savePage: async (pageData: any) => {
    return apiRequest("POST", "/api/pages", pageData);
  },
  
  // Posts related functions
  fetchPagePosts: async (pageId: string, status?: string) => {
    let url = `/api/pages/${pageId}/posts`;
    if (status) {
      url += `?status=${status}`;
    }
    return apiRequest("GET", url);
  },
  
  createPost: async (pageId: string, postData: any) => {
    return apiRequest("POST", `/api/pages/${pageId}/posts`, postData);
  },
  
  updatePost: async (postId: number, postData: any) => {
    return apiRequest("PATCH", `/api/posts/${postId}`, postData);
  },
  
  deletePost: async (postId: number) => {
    return apiRequest("DELETE", `/api/posts/${postId}`);
  },
  
  // Analytics related functions
  fetchPostAnalytics: async (postId: string) => {
    return apiRequest("GET", `/api/posts/${postId}/analytics`);
  },
  
  fetchPageAnalytics: async (pageId: string) => {
    return apiRequest("GET", `/api/pages/${pageId}/analytics`);
  },
  
  // Facebook Graph API integration functions
  syncPageInsights: async (pageId: string) => {
    // 實際實現中，這會向Facebook Graph API請求數據，然後更新我們的數據庫
    // 目前我們將模擬此操作，以示例界面功能
    return apiRequest("POST", `/api/pages/${pageId}/sync`, { 
      source: "facebook_graph_api" 
    });
  },
  
  fetchAudienceData: async (pageId: string) => {
    // 實際實現中，這會從Facebook Graph API獲取受眾數據
    // 目前返回模擬數據
    return apiRequest("GET", `/api/pages/${pageId}/audience`);
  },
  
  fetchEngagementByTime: async (pageId: string) => {
    // 實際實現中，這會從Facebook Graph API獲取按時間的互動數據
    // 目前返回模擬數據
    return apiRequest("GET", `/api/pages/${pageId}/engagement-time`);
  },
  
  fetchPostPerformance: async (postId: string) => {
    // 實際實現中，這會從Facebook Graph API獲取特定貼文的詳細表現數據
    // 目前返回模擬數據
    return apiRequest("GET", `/api/posts/${postId}/performance`);
  },
  
  // 此方法將用於後續實現批量同步或定期同步功能
  scheduleSyncJob: async (pageId: string, frequency: "daily" | "weekly") => {
    return apiRequest("POST", `/api/pages/${pageId}/sync/schedule`, { 
      frequency 
    });
  }
};
