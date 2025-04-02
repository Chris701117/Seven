import { useState, useEffect } from "react";
import { Switch, Route, useLocation, useRoute } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ContentCalendar from "./pages/ContentCalendar";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/not-found";
import FacebookSetupGuide from "./pages/FacebookSetupGuide";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { PageProvider } from "./contexts/PageContext";
import { User } from "@shared/schema";

// 需要登入的路由
const PROTECTED_ROUTES = ['/', '/calendar', '/analytics', '/settings', '/facebook-setup'];

function Router() {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });
  
  // 檢查是否需要重定向到登入頁面
  useEffect(() => {
    const checkAuth = async () => {
      if (!isLoading) {
        const isProtectedRoute = PROTECTED_ROUTES.includes(location);
        if (isProtectedRoute && !user) {
          setLocation('/login');
        } else if ((location === '/login' || location === '/register') && user) {
          setLocation('/');
        }
      }
    };
    
    checkAuth();
  }, [user, isLoading, location, setLocation]);

  // 在加載時顯示空白頁面
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">正在載入...</div>;
  }

  return (
    <Switch>
      {/* 公開路由 */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* 受保護的路由 */}
      <Route path="/" component={Dashboard} />
      <Route path="/calendar" component={ContentCalendar} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route path="/facebook-setup" component={FacebookSetupGuide} />
      
      {/* 404 頁面 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PageProvider>
        <AppContent />
      </PageProvider>
    </QueryClientProvider>
  );
}

// 根據路由顯示Layout或直接顯示子組件
function AppContent() {
  const [location] = useLocation();
  const isLoginPage = useRoute('/login')[0];
  const isRegisterPage = useRoute('/register')[0];
  
  // 登入和註冊頁面不使用Layout
  if (isLoginPage || isRegisterPage) {
    return <Router />;
  }
  
  return (
    <Layout>
      <Router />
    </Layout>
  );
}

export default App;
