import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard";
import AdminPage from "@/pages/admin";
import ProfilePage from "@/pages/profile";
import EventDetailsPage from "@/pages/event-details";
import CustomerSettingsPage from "@/pages/customer-settings";
import { ProtectedRoute } from "./lib/protected-route";
import { useAuth } from './hooks/use-auth';
import { AdminBar } from "@/components/admin-bar";

function Router() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {user && (user.isAdmin || user.isSuperAdmin) && <AdminBar />}
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/event/:id" component={EventDetailsPage} />
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/dashboard" component={DashboardPage} />
        <ProtectedRoute path="/admin" component={AdminPage} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <ProtectedRoute path="/customer-settings" component={CustomerSettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;