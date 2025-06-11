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
import Marketing from "./pages/Marketing";
import Operations from "./pages/Operations";
import Onelink from "./pages/Onelink";
import RecycleBin from "./pages/RecycleBin";
import NotFound from "./pages/not-found";
import FacebookSetupGuide from "./pages/FacebookSetupGuide";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { PageProvider } from "./contexts/PageContext";
import { User } from "@shared/schema";

// 新增 /dashboard 路由，並將它加入保護列表
const PROTECTED_ROUTES = [
  "/dashboard",
  "/", "/calendar", "/analytics", "/settings",
  "/facebook-setup", "/marketing", "/operations",
  "/onelink", "/recycle-bin"
];

function Router() {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  useEffect(() => {
    if (!isLoading) {
      const isProtected = PROTECTED_ROUTES.includes(location);
      if (isProtected && !user) {
        setLocation("/login");
      } else if ((location === "/login" || location === "/register") && user) {
        setLocation("/dashboard");
      }
    }
  }, [user, isLoading, location, setLocation]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">正在載入...</div>;
  }

  return (
    <Switch>
      {/* Public */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Protected */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/" component={Dashboard} />
      <Route path="/calendar" component={ContentCalendar} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/marketing" component={Marketing} />
      <Route path="/operations" component={Operations} />
      <Route path="/onelink" component={Onelink} />
      <Route path="/settings" component={Settings} />
      <Route path="/facebook-setup" component={FacebookSetupGuide} />
      <Route path="/recycle-bin" component={RecycleBin} />

      {/* 404 */}
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

function AppContent() {
  const [location] = useLocation();
  const isLogin = useRoute("/login")[0];
  const isRegister = useRoute("/register")[0];

  if (isLogin || isRegister) {
    return <Router />;
  }
  return (
    <Layout>
      <Router />
    </Layout>
  );
}

export default App;
