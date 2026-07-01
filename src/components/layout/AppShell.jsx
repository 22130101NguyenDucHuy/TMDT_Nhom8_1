import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import TopNav from "./TopNav";
import AuthModal from "../auth/AuthModal";

// Helper tự động tải lại trang khi gặp lỗi load chunk (do thay đổi mã hash khi deploy bản build mới trên Vercel)
function lazyWithRetry(componentImport) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.warn("Failed to load page chunk, forcing reload to fetch latest version:", error);
      window.location.reload();
      return new Promise(() => {}); // prevent loading broken state before reload
    }
  });
}

// ── Lazy load tất cả pages — mỗi route chỉ tải JS khi cần ─────────────────
const HomeScreen             = lazyWithRetry(() => import("../../pages/HomeScreen"));
const ExploreScreen          = lazyWithRetry(() => import("../../pages/ExploreScreen"));
const BookDetailScreen       = lazyWithRetry(() => import("../../pages/BookDetailScreen"));
const SellScreen             = lazyWithRetry(() => import("../../pages/SellScreen"));
const EditListingScreen      = lazyWithRetry(() => import("../../pages/EditListingScreen"));
const MessagesScreen         = lazyWithRetry(() => import("../../pages/MessagesScreen"));
const WalletScreen           = lazyWithRetry(() => import("../../pages/WalletScreen"));
const CheckoutScreen         = lazyWithRetry(() => import("../../pages/CheckoutScreen"));
const TransactionSuccessScreen = lazyWithRetry(() => import("../../pages/TransactionSuccessScreen"));
const MyTransactionsScreen   = lazyWithRetry(() => import("../../pages/MyTransactionsScreen"));
const PremiumScreen          = lazyWithRetry(() => import("../../pages/PremiumScreen"));
const DashboardScreen        = lazyWithRetry(() => import("../../pages/DashboardScreen"));
const ProfileScreen          = lazyWithRetry(() => import("../../pages/ProfileScreen"));
const FavoritesScreen        = lazyWithRetry(() => import("../../pages/FavoritesScreen"));
const BookRequestScreen      = lazyWithRetry(() => import("../../pages/BookRequestScreen"));
const MyBookRequestsScreen   = lazyWithRetry(() => import("../../pages/MyBookRequestsScreen"));

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
      "/sach": "Danh sách tài liệu | LoopBook",
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
            <Route element={<ExploreScreen />}            path="/sach" />
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
            <Route element={<MyBookRequestsScreen />}    path="/yeu-cau-cua-toi" />

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
