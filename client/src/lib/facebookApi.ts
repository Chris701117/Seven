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

// Facebook SDK 配置 - 使用更寬鬆的安全設置，便於開發環境使用
const FB_CONFIG = {
  cookie: false,      // 禁用 cookie 以減少跨域問題
  xfbml: false,       // 不嚴格檢查網域
  version: 'v18.0',   // 使用 v18.0 版本的 Graph API
  status: false,      // 禁止自動檢查登錄狀態
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
        
        // 檢查響應狀態
        if (!response.ok) {
          throw new Error(`Facebook App ID 獲取失敗: ${response.status} ${response.statusText}`);
        }
        
        // 檢查響應格式和內容
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('伺服器回應不是JSON格式:', contentType);
          throw new Error('伺服器回應格式錯誤');
        }
        
        // 嘗試解析JSON
        const text = await response.text();
        console.log('原始回應:', text);
        
        try {
          const data = JSON.parse(text);
          if (data && data.appId) {
            FACEBOOK_APP_ID = data.appId;
            console.log('成功獲取 App ID:', FACEBOOK_APP_ID);
          } else {
            console.error('回應缺少appId屬性:', data);
            throw new Error('回應缺少appId屬性');
          }
        } catch (parseError) {
          console.error('JSON解析錯誤:', parseError);
          throw new Error('JSON解析錯誤');
        }
      } catch (error) {
        console.error('無法獲取 Facebook App ID:', error);
        throw new Error(`無法獲取 Facebook App ID: ${error instanceof Error ? error.message : '未知錯誤'}`);
      }
    }
    return FACEBOOK_APP_ID;
  },
  
  // 初始化 Facebook SDK
  initSDK: async () => {
    // 確保我們有 App ID
    await facebookApi.getAppId();
    
    // 顯示當前網域，便於調試
    console.log('當前網域:', window.location.origin);
    console.log('當前完整URL:', window.location.href);
    
    // 檢查 SDK 是否已經加載
    if (window.FB) {
      console.log('Facebook SDK 已經加載，直接初始化');
      window.FB.init({
        appId: FACEBOOK_APP_ID,
        ...FB_CONFIG,
        frictionlessRequests: true  // 減少跨域請求摩擦
      });
      return Promise.resolve();
    }
    
    return new Promise<void>((resolve, reject) => {
      // 設置超時處理
      const timeoutId = setTimeout(() => {
        reject(new Error('Facebook SDK 加載超時，請檢查網絡連接或網域設置'));
      }, 20000); // 增加到20秒超時，給較慢的連接更多時間
      
      window.fbAsyncInit = function() {
        clearTimeout(timeoutId);
        
        try {
          window.FB.init({
            appId: FACEBOOK_APP_ID,
            ...FB_CONFIG,
            frictionlessRequests: true  // 減少跨域請求摩擦
          });
          console.log('Facebook SDK 初始化成功');
          resolve();
        } catch (error) {
          console.error('Facebook SDK 初始化失敗:', error);
          reject(error);
        }
      };
      
      // 加載 Facebook SDK
      try {
        (function(d, s, id) {
          var js, fjs = d.getElementsByTagName(s)[0];
          if (d.getElementById(id)) {
            console.log('Facebook SDK 已存在，跳過加載');
            return;
          }
          
          console.log('正在加載 Facebook SDK...');
          js = d.createElement(s) as HTMLScriptElement;
          js.id = id;
          js.src = "https://connect.facebook.net/zh_TW/sdk.js";
          js.crossOrigin = "anonymous"; // 添加跨域支持
          js.onerror = function(error) {
            console.error('Facebook SDK 加載失敗', error);
            clearTimeout(timeoutId);
            reject(new Error('無法加載 Facebook SDK，請檢查網絡連接'));
          };
          fjs.parentNode?.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
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
      // 檢查 FB SDK 是否已經加載
      if (!window.FB) {
        console.error('Facebook SDK 尚未加載，嘗試重新初始化');
        facebookApi.initSDK()
          .then(() => {
            // SDK 加載成功後重試登入
            facebookApi.login()
              .then(resolve)
              .catch(reject);
          })
          .catch(error => {
            reject(new Error(`Facebook SDK 初始化失敗: ${error.message}`));
          });
        return;
      }
      
      try {
        window.FB.login((response: any) => {
          if (response && response.authResponse) {
            console.log('Facebook 登入成功');
            resolve(response);
          } else {
            console.warn('Facebook 登入取消或失敗', response);
            reject(new Error('用戶取消登入或登入失敗'));
          }
        }, { 
          scope: 'email,pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content',
          return_scopes: true, // 返回授權的權限列表
          auth_type: 'rerequest' // 確保重新詢問權限
        });
      } catch (error) {
        console.error('Facebook 登入過程發生異常:', error);
        reject(new Error(`Facebook 登入過程發生異常: ${error instanceof Error ? error.message : '未知錯誤'}`));
      }
    });
  },
  
  // Auth related functions
  saveAccessToken: async (accessToken: string, fbUserId: string) => {
    return apiRequest(`/api/auth/facebook`, {
      method: "POST",
      data: { accessToken, fbUserId }
    });
  },
  
  // Pages related functions
  fetchUserPages: async () => {
    return apiRequest(`/api/pages`);
  },
  
  savePage: async (pageData: any) => {
    return apiRequest(`/api/pages`, {
      method: "POST",
      data: pageData
    });
  },
  
  // Posts related functions
  fetchPagePosts: async (pageId: string, status?: string) => {
    let url = `/api/pages/${pageId}/posts`;
    if (status) {
      url += `?status=${status}`;
    }
    return apiRequest(url);
  },
  
  createPost: async (pageId: string, postData: any) => {
    return apiRequest(`/api/pages/${pageId}/posts`, {
      method: "POST",
      data: postData
    });
  },
  
  updatePost: async (postId: number, postData: any) => {
    return apiRequest(`/api/posts/${postId}`, {
      method: "PATCH",
      data: postData
    });
  },
  
  deletePost: async (postId: number) => {
    return apiRequest(`/api/posts/${postId}`, {
      method: "DELETE"
    });
  },
  
  // 一鍵發布到所有平台
  publishToAllPlatforms: async (postId: number) => {
    return apiRequest(`/api/posts/${postId}/publish-all`, {
      method: "POST"
    });
  },
  
  // Analytics related functions
  fetchPostAnalytics: async (postId: string) => {
    return apiRequest(`/api/posts/${postId}/analytics`);
  },
  
  fetchPageAnalytics: async (pageId: string) => {
    return apiRequest(`/api/pages/${pageId}/analytics`);
  },
  
  // Facebook Graph API integration functions
  syncPageInsights: async (pageId: string) => {
    // 實際實現中，這會向Facebook Graph API請求數據，然後更新我們的數據庫
    // 目前我們將模擬此操作，以示例界面功能
    return apiRequest(`/api/pages/${pageId}/sync`, {
      method: "POST",
      data: { source: "facebook_graph_api" }
    });
  },
  
  fetchAudienceData: async (pageId: string) => {
    // 實際實現中，這會從Facebook Graph API獲取受眾數據
    // 目前返回模擬數據
    return apiRequest(`/api/pages/${pageId}/audience`);
  },
  
  fetchEngagementByTime: async (pageId: string) => {
    // 實際實現中，這會從Facebook Graph API獲取按時間的互動數據
    // 目前返回模擬數據
    return apiRequest(`/api/pages/${pageId}/engagement-time`);
  },
  
  fetchPostPerformance: async (postId: string) => {
    // 實際實現中，這會從Facebook Graph API獲取特定貼文的詳細表現數據
    // 目前返回模擬數據
    return apiRequest(`/api/posts/${postId}/performance`);
  },
  
  // 此方法將用於後續實現批量同步或定期同步功能
  scheduleSyncJob: async (pageId: string, frequency: "daily" | "weekly") => {
    return apiRequest(`/api/pages/${pageId}/sync/schedule`, {
      method: "POST",
      data: { frequency }
    });
  }
};
