import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ContentCalendar from "./pages/ContentCalendar";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/not-found";
import { PageProvider } from "./contexts/PageContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/calendar" component={ContentCalendar} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PageProvider>
        <Layout>
          <Router />
        </Layout>
      </PageProvider>
    </QueryClientProvider>
  );
}

export default App;
