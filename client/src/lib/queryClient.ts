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
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  // Make sure we have a properly formed URL (especially in Replit environment)
  const apiUrl = url.startsWith('http') ? url : 
                url.startsWith('/') ? `${getBaseUrl()}${url}` : `${getBaseUrl()}/${url}`;
  
  console.log(`Making ${method} request to: ${apiUrl}`);
  
  const res = await fetch(apiUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // 對於 204 No Content 響應，返回空對象
  if (res.status === 204) {
    return {} as T;
  }
  
  // 解析 JSON 響應
  try {
    return await res.json() as T;
  } catch (error) {
    console.error('無法解析 API 響應為 JSON:', error);
    throw new Error(`API 響應無法解析為 JSON: ${error instanceof Error ? error.message : '未知錯誤'}`);
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
    
    const res = await fetch(apiUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
