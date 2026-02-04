import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { RightCalendarSidebar } from "./components/layout/RightCalendarSidebar";
import { useEffect } from "react";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Matrix from "./pages/Matrix";
import Plan from "./pages/Plan";
import Login from "./pages/Login";
import ShareablePost from "./pages/ShareablePost";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const RedirectHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const redirectPath = sessionStorage.getItem('redirectPath');
    if (redirectPath) {
      sessionStorage.removeItem('redirectPath');
      navigate(redirectPath, { replace: true });
    }
  }, [navigate]);

  return null;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/">
        <AuthProvider>
          <RedirectHandler />
          <div className="flex h-screen overflow-hidden">
            <div className="flex-1 overflow-auto">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Index />} />
                <Route path="/calendar" element={<Index />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/matrix" element={<ProtectedRoute><Matrix /></ProtectedRoute>} />
                <Route path="/plan" element={<ProtectedRoute><Plan /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/post/:id" element={<ShareablePost />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <RightCalendarSidebar />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
