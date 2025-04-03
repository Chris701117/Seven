import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Helper to get the base URL for API requests in Replit environment
const getBaseUrl = () => {
  // For Replit environment
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

// 處理響應錯誤的輔助函數
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
      
      // 拋出擴展錯誤
      throw extendedError;
    } catch (parseError) {
      // 如果無法解析為 JSON，可能是服務器錯誤或網絡問題
      // 嘗試獲取響應文本
      try {
        const text = await res.text();
        if (text) {
          console.error('響應文本:', text);
          const plainError: any = new Error(`${status}: ${statusText} - ${text}`);
          plainError.status = status;
          plainError.statusText = statusText;
          plainError.responseText = text;
          throw plainError;
        }
      } catch (textError) {
        console.error('無法獲取響應文本:', textError);
      }
      
      // 如果都失敗了，拋出帶有基本狀態信息的錯誤
      const fallbackError: any = new Error(`${status}: ${statusText}`);
      fallbackError.status = status;
      fallbackError.statusText = statusText;
      throw fallbackError;
    }
  }
}

// 通用 API 請求函數，支持兩種調用模式
export async function apiRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  body?: any
): Promise<Response> {
  // 構建完整 URL
  const apiUrl = url.startsWith('http') ? url : 
                url.startsWith('/') ? `${getBaseUrl()}${url}` : `${getBaseUrl()}/${url}`;
                
  console.log(`Making ${method} request to: ${apiUrl}`);
                
  // 設置請求選項
  const options: RequestInit = {
    method,
    headers: body ? {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    } : {
      'Accept': 'application/json'
    },
    credentials: 'include',
  };
  
  // 如果有請求體，將其添加到選項中
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  // 執行請求並返回 Response 對象
  return fetch(apiUrl, options);
}

// 原始的數據查詢函數
export async function fetchData<T = any>(url: string): Promise<T> {
  // 構建完整 URL
  const apiUrl = url.startsWith('http') ? url : 
                url.startsWith('/') ? `${getBaseUrl()}${url}` : `${getBaseUrl()}/${url}`;
  
  console.log(`Fetching data from: ${apiUrl}`);
  
  try {
    const res = await fetch(apiUrl, {
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

// TanStack Query 的查詢函數工廠
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

// 設置 QueryClient 實例
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