import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, Link } from "react-router-dom";
import TopNav from "./TopNav";
import AuthModal from "../auth/AuthModal";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../services/supabase";

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
  const { user } = useAuth();
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!user) {
      setNotification(null);
      return;
    }

    const checkVerificationStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("lb_student_verifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!data) return;

        // Bỏ qua nếu vẫn đang chờ duyệt
        if (data.status === "pending") return;

        const dismissedId = localStorage.getItem(`loopbook_verify_dismiss_${user.id}`);
        if (dismissedId !== data.id) {
          setNotification(data);
        }
      } catch (err) {
        console.error("Lỗi kiểm tra trạng thái xác thực trong AppShell:", err);
      }
    };

    checkVerificationStatus();
  }, [user]);

  const handleDismiss = () => {
    if (notification) {
      localStorage.setItem(`loopbook_verify_dismiss_${user.id}`, notification.id);
      setNotification(null);
    }
  };

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

      {notification && (
        <div className={`w-full py-3 px-4 border-b text-center text-sm font-semibold flex items-center justify-center gap-2 relative transition-all animate-in slide-in-from-top duration-300 ${
          notification.status === 'approved' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
            : 'bg-rose-50 text-rose-800 border-rose-100'
        }`}>
          <span>
            {notification.status === 'approved' ? (
              <>🎉 Chúc mừng! Thẻ sinh viên của bạn đã được duyệt thành công. Tài khoản của bạn đã hoạt động đầy đủ tính năng giao dịch!</>
            ) : (
              <>⚠️ Yêu cầu xác thực thẻ sinh viên của bạn đã bị từ chối. Vui lòng gửi lại ảnh thẻ khác để tiếp tục sử dụng LoopBook. <Link to="/dang-ban" className="underline font-bold hover:text-rose-950 ml-1">Gửi lại ngay &rarr;</Link></>
            )}
          </span>
          <button 
            onClick={handleDismiss} 
            className={`absolute right-4 p-1 rounded-full transition-colors ${
              notification.status === 'approved' ? 'hover:bg-emerald-100 text-emerald-600' : 'hover:bg-rose-100 text-rose-600'
            }`}
            title="Đóng thông báo"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

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
            <Route element={<Navigate replace to="/yeu-cau-sach?tab=my_requests" />} path="/yeu-cau-cua-toi" />

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
