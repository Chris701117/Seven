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
  }
};
