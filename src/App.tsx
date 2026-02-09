import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { RightCalendarSidebar } from "./components/layout/RightCalendarSidebar";
import SimpleAuthGate from "./components/SimpleAuthGate";
import { useEffect } from "react";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Matrix from "./pages/Matrix";
import Plan from "./pages/Plan";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SimpleAuthGate>
        <BrowserRouter basename="/">
          <AuthProvider>
            <RedirectHandler />
            <div className="flex h-screen overflow-hidden">
              <div className="flex-1 overflow-auto">
                <Routes>
                  <Route path="/login" element={<Navigate to="/" replace />} />
                  <Route path="/" element={<Index />} />
                  <Route path="/calendar" element={<Index />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/matrix" element={<Matrix />} />
                  <Route path="/plan" element={<Plan />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/post/:id" element={<ShareablePost />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              <RightCalendarSidebar />
            </div>
          </AuthProvider>
        </BrowserRouter>
      </SimpleAuthGate>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
