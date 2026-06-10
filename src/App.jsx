import { lazy, Suspense } from "react";
import { Navigate, BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import AdminLayout from "./components/admin/AdminLayout";

import AppShell from "./components/layout/AppShell";
import "./App.css";

const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard"));
const UserManagement = lazy(() => import("./components/admin/UserManagement"));
const ListingManagement = lazy(() => import("./components/admin/ListingManagement"));
const CategoryManagement = lazy(() => import("./components/admin/CategoryManagement"));
const TransactionManagement = lazy(() => import("./components/admin/TransactionManagement"));
const PremiumManagement = lazy(() => import("./components/admin/PremiumManagement"));
const DisputeManagement = lazy(() => import("./components/admin/DisputeManagement"));
const ReportManagement = lazy(() => import("./components/admin/ReportManagement"));
const AdminSettings = lazy(() => import("./components/admin/AdminSettings"));
const VerificationManagement = lazy(() => import("./components/admin/VerificationManagement"));
const ForgotPasswordScreen = lazy(() => import("./pages/ForgotPasswordScreen"));
const ResetPasswordScreen = lazy(() => import("./pages/ResetPasswordScreen"));

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-700" />
    </div>
  );
}

/** Guard: chỉ cho phép admin/moderator truy cập */
function AdminGuard({ children }) {
  const { userData, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700" />
      </div>
    );
  }

  if (!userData || !['admin', 'moderator'].includes(userData.role)) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}

export default function App() {
    return (
      <BrowserRouter>
        <Routes>
          <Route element={<AdminGuard><AdminLayout /></AdminGuard>} path="/admin">
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="verifications" element={<VerificationManagement />} />
            <Route path="listings" element={<ListingManagement />} />
            <Route path="categories" element={<CategoryManagement />} />
            <Route path="transactions" element={<TransactionManagement />} />
            <Route path="premium" element={<PremiumManagement />} />
            <Route path="disputes" element={<DisputeManagement />} />
            <Route path="reports" element={<ReportManagement />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          <Route element={<Suspense fallback={<PageFallback />}><ForgotPasswordScreen /></Suspense>} path="/forgot-password" />
          <Route element={<Suspense fallback={<PageFallback />}><ResetPasswordScreen /></Suspense>} path="/reset-password" />

          <Route element={<AppShell />} path="/checkout/:bookId" />
          <Route element={<AppShell />} path="/transaction/:id/success" />
          <Route element={<AppShell />} path="/my-transactions" />
          <Route element={<AppShell />} path="/wallet" />
          <Route element={<AppShell />} path="/*" />
        </Routes>
      </BrowserRouter>
    );
}