import { Navigate, BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./components/admin/AdminDashboard";
import UserManagement from "./components/admin/UserManagement";
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
    return ( <
        BrowserRouter >
        <
        Routes > { /* Admin Routes */ } <
        Route element = { < AdminGuard > < AdminLayout / > < /AdminGuard> }
        path = "/admin" >
        <
        Route element = { < AdminDashboard / > }
        index / >
        <
        Route element = { < UserManagement / > }
        path = "users" / >
        <
        Route element = { < ListingManagement / > }
        path = "listings" / >
        <
        Route element = { < CategoryManagement / > }
        path = "categories" / >
        <
        Route element = { < TransactionManagement / > }
        path = "transactions" / >
        <
        Route element = { < PremiumManagement / > }
        path = "premium" / >
        <
        Route element = { < DisputeManagement / > }
        path = "disputes" / >
        <
        Route element = { < ReportManagement / > }
        path = "reports" / >
        <
        Route element = { < AdminSettings / > }
        path = "settings" / >
        <
        /Route>

        { /* Auth Routes */ } <
        Route element = { < ForgotPasswordScreen / > }
        path = "/forgot-password" / >
        <
        Route element = { < ResetPasswordScreen / > }
        path = "/reset-password" / >

        { /* Main App Routes */ }
        <Route element={<AppShell />} path="/checkout/:bookId" />
        <Route element={<AppShell />} path="/transaction/:id/success" />
        <Route element={<AppShell />} path="/my-transactions" />
        <Route element={<AppShell />} path="/wallet" />
        <Route element={<AppShell />} path="/*" />
        <
        /Routes> <
        /BrowserRouter>
    );
}