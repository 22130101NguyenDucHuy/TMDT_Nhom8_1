import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { formatPrice } from "../utils/formatters";

const statusConfig = {
  pending: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Đã xác nhận", color: "bg-blue-100 text-blue-700" },
  awaiting_meet: { label: "Chờ gặp mặt", color: "bg-purple-100 text-purple-700" },
  completed: { label: "Hoàn tất", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
  refunded: { label: "Đã hoàn tiền", color: "bg-slate-100 text-slate-700" },
};

export default function MyTransactionsScreen() {
  const { userData } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) {
      setLoading(false);
      return;
    }
    const fetchTransactions = async () => {
      try {
        const { data, error } = await supabase
          .from("lb_transactions")
          .select("*, book:book_id(title)")
          .or(`buyer_id.eq.${userData.id},seller_id.eq.${userData.id}`)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setTransactions(data || []);
      } catch (err) {
        console.error("fetch transactions error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [userData]);

  if (!userData) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
          <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Bạn chưa đăng nhập</h2>
        <p className="text-slate-600 mb-6">Vui lòng đăng nhập để xem giao dịch.</p>
        <Link to="/" className="vinted-btn-outline w-auto px-8 mx-auto">Về trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-6">
        <p className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-1">Quản lý</p>
        <h1 className="text-2xl font-bold text-slate-900">Giao dịch của tôi</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-700" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-slate-500 font-medium">Chưa có giao dịch nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Mã GD</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Sách</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Số tiền</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Trạng thái</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((txn) => {
                  const status = statusConfig[txn.status] || { label: txn.status, color: "bg-slate-100 text-slate-600" };
                  return (
                    <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{txn.id}</td>
                      <td className="px-5 py-4 font-medium text-slate-900">{txn.book?.title || "—"}</td>
                      <td className="px-5 py-4 font-semibold text-slate-900">{formatPrice(txn.amount)}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs">
                        {new Date(txn.created_at).toLocaleDateString("vi-VN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
