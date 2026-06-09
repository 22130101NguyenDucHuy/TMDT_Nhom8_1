import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import { formatPrice } from "../utils/formatters";

const TABS = [
  { key: "active", label: "Đang đăng" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "draft",  label: "Nháp"      },
  { key: "sold",   label: "Đã bán"    },
];

const conditionMap = {
  brand_new: "Mới 100%",
  like_new:  "Như mới",
  very_good: "Rất tốt",
  good:      "Tốt",
  acceptable: "Cũ",
};

const statusBadge = (status) => {
  const map = {
    active: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    draft:  "bg-slate-100 text-slate-500",
    sold:   "bg-blue-100 text-blue-700",
  };
  return map[status] || "bg-slate-100 text-slate-600";
};

function BookRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-6 py-4 animate-pulse">
      <div className="w-12 h-14 bg-slate-200 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-200 rounded w-2/3" />
        <div className="h-3 bg-slate-200 rounded w-1/3" />
      </div>
      <div className="h-4 bg-slate-200 rounded w-16" />
    </div>
  );
}

export default function DashboardScreen() {
  const { user, userData, showToast } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("active");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lấy danh sách sách của user theo tab
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);

    supabase
      .from("lb_books")
      .select("id, title, condition, price, image, status, created_at, school, urgent")
      .eq("seller_id", user.id)
      .eq("status", activeTab)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Dashboard fetch error:", error);
        setBooks(data || []);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user, activeTab]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <p className="text-slate-600 mb-4">Vui lòng đăng nhập để xem bảng quản lý.</p>
      </div>
    );
  }

  const handleMarkSold = async (bookId) => {
    if (!window.confirm("Xác nhận đánh dấu tài liệu này đã bán?")) return;
    try {
      const { error } = await supabase
        .from("lb_books")
        .update({ status: "sold", is_sold: true, sold_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", bookId)
        .eq("seller_id", user.id);
      if (error) throw error;
      showToast("Đã đánh dấu đã bán!", "success");
      setBooks(books.filter(b => b.id !== bookId));
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra", "error");
    }
  };

  const handleDelete = async (bookId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tài liệu này?")) return;
    try {
      const { error } = await supabase
        .from("lb_books")
        .delete()
        .eq("id", bookId)
        .eq("seller_id", user.id);
      if (error) throw error;
      showToast("Đã xóa tài liệu!", "success");
      setBooks(books.filter(b => b.id !== bookId));
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra", "error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-1">Bảng quản lý</p>
          <h1 className="text-2xl font-bold text-slate-900">
            Xin chào, {userData?.name || user.email?.split("@")[0] || "bạn"} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Quản lý toàn bộ tin đăng bán của bạn tại đây.
          </p>
        </div>
        <Link
          to="/dang-ban"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold text-sm transition-colors self-start sm:self-center"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Đăng tin mới
        </Link>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Danh sách tin đăng */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? "text-teal-700 border-b-2 border-teal-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Danh sách */}
          <div className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <BookRowSkeleton key={i} />)
            ) : books.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="font-semibold text-sm">
                  {activeTab === "active" && "Bạn chưa có tin đăng nào."}
                  {activeTab === "pending" && "Không có tin nào chờ duyệt."}
                  {activeTab === "draft"  && "Không có bản nháp nào."}
                  {activeTab === "sold"   && "Chưa có giao dịch nào hoàn tất."}
                </p>
                {activeTab === "active" && (
                  <Link to="/dang-ban" className="mt-3 inline-block text-teal-700 font-semibold text-sm hover:underline">
                    Đăng tin ngay →
                  </Link>
                )}
              </div>
            ) : (
              books.map((book) => (
                <div key={book.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group">
                  {/* Ảnh */}
                  <div className="w-12 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-slate-100 bg-slate-100">
                    {book.image ? (
                      <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{book.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(book.status)}`}>
                        {book.status === "active" ? "Đang bán" : book.status === "pending" ? "Chờ duyệt" : book.status === "draft" ? "Nháp" : "Đã bán"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {conditionMap[book.condition] || book.condition}
                      </span>
                      {book.urgent && (
                        <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">🔥 Bán gấp</span>
                      )}
                    </div>
                  </div>

                  {/* Giá + Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="font-bold text-slate-900 text-sm">{formatPrice(book.price)}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        to={`/sach/${book.id}`}
                        className="text-xs text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full hover:bg-slate-100 transition-colors"
                      >
                        Xem
                      </Link>
                      {book.status === "active" && (
                        <>
                          <Link
                            to={`/sua-bai/${book.id}`}
                            className="text-xs text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full hover:bg-blue-50 transition-colors"
                          >
                            Sửa
                          </Link>
                          <button
                            onClick={() => handleMarkSold(book.id)}
                            className="text-xs text-green-600 border border-green-200 px-2 py-0.5 rounded-full hover:bg-green-50 transition-colors"
                          >
                            Đã bán
                          </button>
                        </>
                      )}
                      {book.status !== "sold" && (
                        <button
                          onClick={() => handleDelete(book.id)}
                          className="text-xs text-red-500 border border-red-200 px-2 py-0.5 rounded-full hover:bg-red-50 transition-colors"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cột phải - Truy cập nhanh */}
        <div className="flex flex-col gap-4">
          <div className="bg-teal-700 text-white rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4">Truy cập nhanh</h3>
            <div className="flex flex-col gap-2">
              {[
                { label: "Ví tiền & Doanh thu", to: "/vi-tien", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
                { label: "Lịch sử giao dịch", to: "/my-transactions", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
                { label: "Tin nhắn", to: "/tin-nhan", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
                { label: "Dịch vụ đẩy tin", to: "/dich-vu", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
                { label: "Yêu thích", to: "/yeu-thich", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> },
              ].map(({ label, to, icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                >
                  {icon}
                  {label}
                  <svg className="w-4 h-4 ml-auto opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Info tài khoản */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-bold text-slate-900 mb-3">Tài khoản</h3>
            <div className="flex flex-col gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {(userData?.name || user.email || "U").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{userData?.name || "Người dùng"}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
