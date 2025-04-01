import { apiRequest } from "./queryClient";

// 我們將通過 API 請求獲取 Facebook App ID
let FACEBOOK_APP_ID: string | null = null;

// 擴展 Window 接口以支持 Facebook SDK
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

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
  // 獲取 Facebook App ID
  getAppId: async () => {
    if (!FACEBOOK_APP_ID) {
      try {
        const response = await fetch('/api/config/facebook');
        const data = await response.json();
        FACEBOOK_APP_ID = data.appId;
      } catch (error) {
        console.error('無法獲取 Facebook App ID:', error);
        throw new Error('無法獲取 Facebook App ID');
      }
    }
    return FACEBOOK_APP_ID;
  },
  
  // 初始化 Facebook SDK
  initSDK: async () => {
    // 確保我們有 App ID
    await facebookApi.getAppId();
    return new Promise<void>((resolve) => {
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: FACEBOOK_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
        resolve();
      };
      
      // 加載 Facebook SDK
      (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s) as HTMLScriptElement;
        js.id = id;
        js.src = "https://connect.facebook.net/zh_TW/sdk.js";
        fjs.parentNode?.insertBefore(js, fjs);
      }(document, 'script', 'facebook-jssdk'));
    });
  },
  
  // 使用 Facebook 登入
  login: () => {
    return new Promise<{
      authResponse: {
        accessToken: string;
        userID: string;
      }
    }>((resolve, reject) => {
      window.FB.login((response: any) => {
        if (response.authResponse) {
          resolve(response);
        } else {
          reject(new Error('用戶取消登入或登入失敗'));
        }
      }, { scope: 'email,pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content' });
    });
  },
  
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
