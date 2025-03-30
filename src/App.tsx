import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginForm from "./components/auth/LoginForm";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import DebtPage from "./pages/Debt";

const queryClient = new QueryClient();

// Auth guard component
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth/login" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route path="/auth/login" element={<LoginForm />} />
          <Route path="/login" element={<Navigate to="/auth/login" replace />} />
          
          {/* Protected routes */}
          <Route path="/" element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="payments" element={<Payments />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="debt" element={<DebtPage />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;