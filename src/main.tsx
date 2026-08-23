import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import { StoreProvider } from "./data/store";
import { Shell } from "./layout/Shell";
import { Dashboard } from "./pages/Dashboard";
import { CustomersPage } from "./pages/Customers";
import { StaffPage } from "./pages/Staff";
import { ReviewCampaignPage } from "./pages/ReviewCampaign";
import { WinBackPage } from "./pages/WinBack";
import { QrFlow } from "./pages/qr/QrFlow";
import {
  BadPage, GoodPage, GooglePage, ReviewsHome, SentPage,
} from "./pages/reviews/ReviewsPages";
import { StatsOverview, StatsReviews, StatsStaff } from "./pages/stats/Stats";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Routes>
          <Route path="/r/:slug" element={<QrFlow />} />
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
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  </StrictMode>
);
