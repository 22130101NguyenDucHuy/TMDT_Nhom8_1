import { Navigate, BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./components/admin/AdminDashboard";
import UserManagement from "./components/admin/UserManagement";
import VerificationManagement from "./components/admin/VerificationManagement";
import ListingManagement from "./components/admin/ListingManagement";
import CategoryManagement from "./components/admin/CategoryManagement";
import TransactionManagement from "./components/admin/TransactionManagement";
import PremiumManagement from "./components/admin/PremiumManagement";
import CheckoutScreen from "./pages/CheckoutScreen";
import TransactionSuccessScreen from "./pages/TransactionSuccessScreen";
import MyTransactionsScreen from "./pages/MyTransactionsScreen";
import WalletScreen from "./pages/WalletScreen";
import DisputeManagement from "./components/admin/DisputeManagement";
import ReportManagement from "./components/admin/ReportManagement";
import AdminSettings from "./components/admin/AdminSettings";
import AppShell from "./components/layout/AppShell";
import ForgotPasswordScreen from "./pages/ForgotPasswordScreen";
import ResetPasswordScreen from "./pages/ResetPasswordScreen";
import "./App.css";

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
        {/* Admin Routes */}
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

        {/* Auth Routes */}
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />

        {/* Main App Routes */}
        <Route path="/checkout/:bookId" element={<AppShell />} />
        <Route path="/transaction/:id/success" element={<AppShell />} />
        <Route path="/my-transactions" element={<AppShell />} />
        <Route path="/wallet" element={<AppShell />} />
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  );
}