import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import TopNav from "./TopNav";
import AuthModal from "../auth/AuthModal";

// ── Lazy load tất cả pages — mỗi route chỉ tải JS khi cần ─────────────────
const HomeScreen             = lazy(() => import("../../pages/HomeScreen"));
const ExploreScreen          = lazy(() => import("../../pages/ExploreScreen"));
const BookDetailScreen       = lazy(() => import("../../pages/BookDetailScreen"));
const SellScreen             = lazy(() => import("../../pages/SellScreen"));
const EditListingScreen      = lazy(() => import("../../pages/EditListingScreen"));
const MessagesScreen         = lazy(() => import("../../pages/MessagesScreen"));
const WalletScreen           = lazy(() => import("../../pages/WalletScreen"));
const CheckoutScreen         = lazy(() => import("../../pages/CheckoutScreen"));
const TransactionSuccessScreen = lazy(() => import("../../pages/TransactionSuccessScreen"));
const MyTransactionsScreen   = lazy(() => import("../../pages/MyTransactionsScreen"));
const PremiumScreen          = lazy(() => import("../../pages/PremiumScreen"));
const TransactionsScreen     = lazy(() => import("../../pages/TransactionsScreen"));
const DashboardScreen        = lazy(() => import("../../pages/DashboardScreen"));
const ProfileScreen          = lazy(() => import("../../pages/ProfileScreen"));
const FavoritesScreen        = lazy(() => import("../../pages/FavoritesScreen"));
const BookRequestScreen      = lazy(() => import("../../pages/BookRequestScreen"));

// ── Fallback spinner dùng chung ────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-700" />
    </div>
  );
}

export default function AppShell() {
  const location = useLocation();

  useEffect(() => {
    const titles = {
      "/": "LoopBook – Mua bán sách sinh viên",
      "/kham-pha": "Khám phá tài liệu",
      "/dang-ban": "Đăng bán tài liệu",
      "/tin-nhan": "Tin nhắn",
      "/vi-tien": "Ví tiền",
      "/dich-vu": "Dịch vụ đẩy tin",
      "/my-transactions": "Giao dịch của tôi",
      "/quan-ly": "Bảng quản lý",
      "/profile": "Thông tin cá nhân | LoopBook",
      "/yeu-thich": "Yêu thích | LoopBook",
      "/yeu-cau-sach": "Yêu cầu sách | LoopBook",
    };
    if (location.pathname.startsWith("/sach/")) {
      document.title = "Chi tiết tài liệu | LoopBook";
      return;
    }
    document.title = titles[location.pathname] ?? "LoopBook";
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <TopNav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 xl:px-8 py-6">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<HomeScreen />}               path="/" />
            <Route element={<ExploreScreen />}            path="/kham-pha" />
            <Route element={<BookDetailScreen />}         path="/sach/:bookId" />
            <Route element={<SellScreen />}               path="/dang-ban" />
            <Route element={<EditListingScreen />}        path="/sua-bai/:bookId" />
            <Route element={<MessagesScreen />}           path="/tin-nhan" />
            <Route element={<WalletScreen />}             path="/vi-tien" />
            <Route element={<WalletScreen />}             path="/wallet" />
            <Route element={<CheckoutScreen />}           path="/checkout/:bookId" />
            <Route element={<TransactionSuccessScreen />} path="/transaction/:id/success" />
            <Route element={<MyTransactionsScreen />}     path="/my-transactions" />
            <Route element={<PremiumScreen />}            path="/dich-vu" />
            <Route element={<ProfileScreen />}            path="/profile" />
            <Route element={<FavoritesScreen />}          path="/yeu-thich" />
            <Route element={<DashboardScreen />}          path="/quan-ly" />
            <Route element={<BookRequestScreen />}        path="/yeu-cau-sach" />

            {/* Redirects */}
            <Route element={<Navigate replace to="/my-transactions" />} path="/giao-dich" />
            <Route element={<Navigate replace to="/kham-pha" />}        path="/explore" />
            <Route element={<Navigate replace to="/dang-ban" />}        path="/sell" />
            <Route element={<Navigate replace to="/tin-nhan" />}        path="/messages" />
            <Route element={<Navigate replace to="/my-transactions" />} path="/transactions" />
            <Route element={<Navigate replace to="/quan-ly" />}         path="/dashboard" />
            <Route element={<Navigate replace to="/yeu-thich" />}       path="/favorites" />
            <Route element={<Navigate replace to="/" />}                path="*" />
          </Routes>
        </Suspense>
      </main>
      <AuthModal />
    </div>
  );
}
