import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Helper to get the base URL for API requests in Replit environment
const getBaseUrl = () => {
  // For Replit environment
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // 保存原始響應狀態碼和狀態文本
    const status = res.status;
    const statusText = res.statusText;
    
    let errorData;
    try {
      // 嘗試解析錯誤響應為 JSON
      errorData = await res.json();
      
      // 創建擴展錯誤對象，包含原始狀態碼和狀態文本
      const extendedError: any = new Error(
        errorData.message || `請求失敗: ${status} ${statusText}`
      );
      extendedError.status = status;
      extendedError.statusText = statusText;
      extendedError.data = errorData;
      
      // 對於特定的錯誤碼添加更友好的信息
      if (status === 404) {
        extendedError.friendlyMessage = "找不到請求的資源。請檢查URL是否正確。";
      } else if (status === 401) {
        extendedError.friendlyMessage = "您需要登錄才能訪問此資源。";
      } else if (status === 403) {
        extendedError.friendlyMessage = "您沒有權限訪問此資源。";
      } else if (status === 500) {
        extendedError.friendlyMessage = "伺服器內部錯誤。請稍後再試。";
      }
      
      throw extendedError;
      
    } catch (e) {
      // 如果無法解析為 JSON 或處理過程中出現錯誤
      if (e instanceof Error && (e as any).status) {
        // 如果已經是我們的擴展錯誤，則直接拋出
        throw e;
      }
      
      // 否則嘗試獲取文本內容並創建新的擴展錯誤
      try {
        const text = await res.text() || statusText;
        const extendedError: any = new Error(`${status}: ${text}`);
        extendedError.status = status;
        extendedError.statusText = statusText;
        throw extendedError;
      } catch (textError) {
        // 如果獲取文本也失敗，則使用基本錯誤信息
        const fallbackError: any = new Error(`${status}: ${statusText}`);
        fallbackError.status = status;
        fallbackError.statusText = statusText;
        throw fallbackError;
      }
    }
  }
}

export async function apiRequest<T = any>(
  url: string,
  options?: {
    method?: string;
    data?: any;
  }
): Promise<T> {
  // Make sure we have a properly formed URL (especially in Replit environment)
  const apiUrl = url.startsWith('http') ? url : 
                url.startsWith('/') ? `${getBaseUrl()}${url}` : `${getBaseUrl()}/${url}`;
  
  const method = options?.method || 'GET';
  const data = options?.data;
  
  console.log(`Making ${method} request to: ${apiUrl}`);
  
  try {
    const res = await fetch(apiUrl, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // 確保響應格式正確
    await throwIfResNotOk(res);
    
    // 對於 204 No Content 響應，返回空對象
    if (res.status === 204) {
      return {} as T;
    }
    
    // 檢查 Content-Type 頭部
    const contentType = res.headers.get('content-type');
    
    // 如果不是 JSON 格式，拋出更明確的錯誤
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`API 響應不是 JSON 格式，而是 ${contentType}`);
      const textResponse = await res.text();
      console.error('原始回應內容:', textResponse);
      throw new Error(`API 響應格式錯誤: 預期為 JSON，實際為 ${contentType || '未指定'}。服務端可能返回了 HTML 或其他格式。`);
    }
    
    // 以文本形式獲取響應，然後嘗試手動解析
    const textResponse = await res.text();
    
    if (!textResponse || textResponse.trim() === '') {
      console.warn('API 回應是空的');
      return {} as T;
    }
    
    try {
      return JSON.parse(textResponse) as T;
    } catch (parseError) {
      console.error('JSON 解析錯誤:', parseError);
      console.error('原始回應內容:', textResponse);
      
      if (textResponse.includes('<!DOCTYPE html>') || textResponse.includes('<html>')) {
        throw new Error('API 回應為 HTML 頁面，而非預期的 JSON 數據。請檢查 API 路由是否正確。');
      }
      
      throw new Error(`無法解析 API 響應為 JSON: ${parseError instanceof Error ? parseError.message : '未知錯誤'}`);
    }
  } catch (error) {
    console.error('API 請求失敗:', error);
    
    // 網絡錯誤處理
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error(`網絡請求失敗: 服務器無法訪問或網絡連接中斷`);
    }
    
    // 重新拋出已處理的錯誤
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Make sure we have a properly formed URL (especially in Replit environment)
    const url = queryKey[0] as string;
    const apiUrl = url.startsWith('http') ? url : 
                  url.startsWith('/') ? `${getBaseUrl()}${url}` : `${getBaseUrl()}/${url}`;
    
    console.log(`Fetching data from: ${apiUrl}`);
    
    try {
      const res = await fetch(apiUrl, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      
      // 檢查 Content-Type 頭部
      const contentType = res.headers.get('content-type');
      
      // 如果不是 JSON 格式，拋出更明確的錯誤
      if (!contentType || !contentType.includes('application/json')) {
        console.error(`API 響應不是 JSON 格式，而是 ${contentType}`);
        const textResponse = await res.text();
        console.error('原始回應內容:', textResponse);
        throw new Error(`API 響應格式錯誤: 預期為 JSON，實際為 ${contentType || '未指定'}。服務端可能返回了 HTML 或其他格式。`);
      }
      
      // 以文本形式獲取響應，然後嘗試手動解析
      const textResponse = await res.text();
      
      if (!textResponse || textResponse.trim() === '') {
        console.warn('API 回應是空的');
        return {} as T;
      }
      
      try {
        return JSON.parse(textResponse) as T;
      } catch (parseError) {
        console.error('JSON 解析錯誤:', parseError);
        console.error('原始回應內容:', textResponse);
        
        if (textResponse.includes('<!DOCTYPE html>') || textResponse.includes('<html>')) {
          throw new Error('API 回應為 HTML 頁面，而非預期的 JSON 數據。請檢查 API 路由是否正確。');
        }
        
        throw new Error(`無法解析 API 響應為 JSON: ${parseError instanceof Error ? parseError.message : '未知錯誤'}`);
      }
    } catch (error) {
      console.error('API 請求失敗:', error);
      
      // 網絡錯誤處理
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error(`網絡請求失敗: 服務器無法訪問或網絡連接中斷`);
      }
      
      // 重新拋出已處理的錯誤
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});
