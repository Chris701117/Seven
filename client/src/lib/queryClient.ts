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
    let errorData;
    try {
      // 嘗試解析錯誤響應為 JSON
      errorData = await res.json();
    } catch (e) {
      // 如果無法解析為 JSON，則使用文本
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
    
    // 如果有詳細的錯誤信息，則使用它
    if (errorData && errorData.message) {
      throw new Error(`${res.status}: ${errorData.message}`);
    } else {
      throw new Error(`${res.status}: ${JSON.stringify(errorData)}`);
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
