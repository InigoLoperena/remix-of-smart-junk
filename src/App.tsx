import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { PageHeaderProvider } from "@/hooks/usePageHeader";

// Eagerly loaded (landing + auth are critical path)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CreateRequestFab from "./components/CreateRequestFab";
import GlobalNav from "./components/GlobalNav";


// Lazy loaded (only when navigated to)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const CreatePickupRequest = lazy(() => import("./pages/CreatePickupRequest"));
const PickupRequestDetail = lazy(() => import("./pages/PickupRequestDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const MyRequests = lazy(() => import("./pages/MyRequests"));
const MyBids = lazy(() => import("./pages/MyBids"));
const Wallet = lazy(() => import("./pages/Wallet"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));

const DemoPreview = lazy(() => import("./pages/DemoPreview"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <PageHeaderProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <GlobalNav />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/demo" element={<DemoPreview />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/marketplace/new" element={<CreatePickupRequest />} />
                  <Route path="/marketplace/:id/edit" element={<CreatePickupRequest />} />
                  <Route path="/marketplace/:id" element={<PickupRequestDetail />} />
                  <Route path="/my-requests" element={<MyRequests />} />
                  <Route path="/my-bids" element={<MyBids />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/admin" element={<AdminPanel />} />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <CreateRequestFab />
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </PageHeaderProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
