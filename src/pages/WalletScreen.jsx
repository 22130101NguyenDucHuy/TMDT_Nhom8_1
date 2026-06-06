import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { formatPrice } from "../utils/formatters";

export default function WalletScreen() {
  const { userData } = useAuth();

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) {
      setLoading(false);
      return;
    }
    const fetchWallet = async () => {
      try {
        const { data: walletData } = await supabase
          .from("lb_wallets")
          .select("*")
          .eq("user_id", userData.id)
          .maybeSingle();
        setWallet(walletData);

        const { data: txnData } = await supabase
          .from("lb_transactions")
          .select("*, book:book_id(title)")
          .or(`buyer_id.eq.${userData.id},seller_id.eq.${userData.id}`)
          .order("created_at", { ascending: false });
        setTransactions(txnData || []);
      } catch (err) {
        console.error("wallet fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, [userData]);

  if (!userData) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
          <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Bạn chưa đăng nhập</h2>
        <p className="text-slate-600 mb-6">Vui lòng đăng nhập để xem ví tiền.</p>
        <Link to="/" className="vinted-btn-outline w-auto px-8 mx-auto">Về trang chủ</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700" />
      </div>
    );
  }

  const balance = wallet?.balance || 0;

  return (
    <div className="max-w-4xl mx-auto py-6 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-1">Tài chính</p>
          <h1 className="text-2xl font-bold text-slate-900">Ví & Doanh thu</h1>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12l7-7 7 7" /></svg>
            Nạp ví
          </button>
        </div>
      </div>

      <div className="bg-teal-700 text-white rounded-xl p-6 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1">
          <p className="text-teal-200 text-sm font-medium mb-2">Số dư khả dụng</p>
          <p className="text-4xl font-extrabold tracking-tight">{formatPrice(balance)}</p>
        </div>
        <div className="flex gap-6 md:border-l md:border-teal-600 md:pl-8">
          <div>
            <p className="text-teal-200 text-xs font-medium mb-1">Tổng thu</p>
            <p className="text-xl font-bold">{formatPrice(wallet?.total_in || 0)}</p>
          </div>
          <div>
            <p className="text-teal-200 text-xs font-medium mb-1">Tổng chi</p>
            <p className="text-xl font-bold">{formatPrice(wallet?.total_out || 0)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Lịch sử giao dịch</h2>
          <Link to="/my-transactions" className="text-sm text-teal-700 font-semibold hover:underline">
            Xem tất cả
          </Link>
        </div>
        {transactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-medium">Chưa có giao dịch nào</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 10).map((txn) => {
              const isBuyer = txn.buyer_id === userData.id;
              const isIn = !isBuyer && txn.status === "completed";
              const isOut = isBuyer && txn.status === "completed";
              return (
                <div key={txn.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isIn ? "bg-green-100" : isOut ? "bg-red-100" : "bg-slate-100"
                  }`}>
                    {isIn ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19V5M5 12l7 7 7-7" /></svg>
                    ) : isOut ? (
                      <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12l7-7 7 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm">
                      {isBuyer ? "Mua: " : "Bán: "}
                      {txn.book?.title || "—"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(txn.created_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <span className={`font-bold text-sm ${
                    isIn ? "text-green-600" : isOut ? "text-red-500" : "text-slate-400"
                  }`}>
                    {isIn ? "+" : isOut ? "-" : ""}{formatPrice(txn.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
