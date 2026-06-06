import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import TopNav from "./TopNav";
import HomeScreen from "../../pages/HomeScreen";
import ExploreScreen from "../../pages/ExploreScreen";
import BookDetailScreen from "../../pages/BookDetailScreen";
import SellScreen from "../../pages/SellScreen";
import MessagesScreen from "../../pages/MessagesScreen";
import WalletScreen from "../../pages/WalletScreen";
import CheckoutScreen from "../../pages/CheckoutScreen";
import TransactionSuccessScreen from "../../pages/TransactionSuccessScreen";
import MyTransactionsScreen from "../../pages/MyTransactionsScreen";
import PremiumScreen from "../../pages/PremiumScreen";
import TransactionsScreen from "../../pages/TransactionsScreen";
import DashboardScreen from "../../pages/DashboardScreen";
import ProfileScreen from "../../pages/ProfileScreen";
import AuthModal from "../auth/AuthModal";

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
      "/giao-dich": "Giao dịch",
      "/quan-ly": "Bảng quản lý",
      "/profile": "Thông tin cá nhân | LoopBook",
    };

    if (location.pathname.startsWith("/sach/")) {
      document.title = "Chi tiết tài liệu | LoopBook";
      return;
    }

    document.title = `${titles[location.pathname] ?? "LoopBook"}`;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <TopNav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 xl:px-8 py-6">
        <Routes>
          <Route element={<HomeScreen />} path="/" />
          <Route element={<ExploreScreen />} path="/kham-pha" />
          <Route element={<BookDetailScreen />} path="/sach/:bookId" />
          <Route element={<SellScreen />} path="/dang-ban" />
          <Route element={<MessagesScreen />} path="/tin-nhan" />
          <Route element={<WalletScreen />} path="/vi-tien" />
          <Route element={<WalletScreen />} path="/wallet" />
          <Route element={<CheckoutScreen />} path="/checkout/:bookId" />
          <Route element={<TransactionSuccessScreen />} path="/transaction/:id/success" />
          <Route element={<MyTransactionsScreen />} path="/my-transactions" />
          <Route element={<PremiumScreen />} path="/dich-vu" />
          <Route element={<TransactionsScreen />} path="/giao-dich" />
          <Route element={<ProfileScreen />} path="/profile" />

          <Route element={<DashboardScreen />} path="/quan-ly" />

          {/* Redirect các đường dẫn cũ */}
          <Route element={<Navigate replace to="/kham-pha" />} path="/explore" />
          <Route element={<Navigate replace to="/dang-ban" />} path="/sell" />
          <Route element={<Navigate replace to="/tin-nhan" />} path="/messages" />
          {/* /wallet is now mapped directly above */}
          <Route element={<Navigate replace to="/giao-dich" />} path="/transactions" />
          <Route element={<Navigate replace to="/quan-ly" />} path="/dashboard" />
          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </main>
      <AuthModal />
    </div>
  );
}

