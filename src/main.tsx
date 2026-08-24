import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import "./index.css";
import { AuthProvider, useAuth } from "./data/auth";
import { StoreProvider } from "./data/store";
import { Shell } from "./layout/Shell";
import { Dashboard } from "./pages/Dashboard";
import { CustomersPage } from "./pages/Customers";
import { StaffPage } from "./pages/Staff";
import { ReviewCampaignPage } from "./pages/ReviewCampaign";
import { WinBackPage } from "./pages/WinBack";
import { QrFlow } from "./pages/qr/QrFlow";
import { Login } from "./pages/auth/Login";
import { Signup } from "./pages/auth/Signup";
import {
  BadPage, GoodPage, GooglePage, ReviewsHome, SentPage,
} from "./pages/reviews/ReviewsPages";
import { StatsOverview, StatsReviews, StatsStaff } from "./pages/stats/Stats";

/**
 * Auth gate. When Supabase is configured, unauthenticated users are sent to
 * the sign in page. When it is not configured yet (no env vars), the app stays
 * open so the seeded demo preview keeps working.
 */
function RequireAuth() {
  const { ready, loading, session } = useAuth();
  if (!ready) return <Outlet />;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sub text-sm">
        Loading…
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <StoreProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Routes>
            <Route path="/r/:slug" element={<QrFlow />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route element={<RequireAuth />}>
              <Route element={<Shell />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/reviews" element={<ReviewsHome />} />
                <Route path="/reviews/sent" element={<SentPage />} />
                <Route path="/reviews/good" element={<GoodPage />} />
                <Route path="/reviews/bad" element={<BadPage />} />
                <Route path="/reviews/google" element={<GooglePage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/staff" element={<StaffPage />} />
                <Route path="/review-campaign" element={<ReviewCampaignPage />} />
                <Route path="/win-back" element={<WinBackPage />} />
                <Route path="/statistics" element={<StatsOverview />} />
                <Route path="/statistics/reviews" element={<StatsReviews />} />
                <Route path="/statistics/staff" element={<StatsStaff />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </StoreProvider>
    </AuthProvider>
  </StrictMode>
);
