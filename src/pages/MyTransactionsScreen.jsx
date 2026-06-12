import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { formatPrice } from "../utils/formatters";
import { releaseEscrow, openDispute } from "../services/payment";

const statusConfig = {
  pending: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Đã xác nhận", color: "bg-blue-100 text-blue-700" },
  awaiting_meet: { label: "Chờ gặp mặt", color: "bg-purple-100 text-purple-700" },
  completed: { label: "Hoàn tất", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
  refunded: { label: "Đã hoàn tiền", color: "bg-slate-100 text-slate-700" },
  disputed: { label: "Đang tranh chấp", color: "bg-orange-100 text-orange-700" },
};

export default function MyTransactionsScreen() {
  const { userData, showToast } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [disputeTxnId, setDisputeTxnId] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);

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

  const handleConfirmReceived = async (txnId) => {
    setProcessingId(txnId);
    try {
      await releaseEscrow(txnId);
      showToast("Đã xác nhận nhận sách! Tiền đã được giải ngân cho người bán.", "success");
      // Refresh transactions
      const { data } = await supabase
        .from("lb_transactions")
        .select("*, book:book_id(title)")
        .or(`buyer_id.eq.${userData.id},seller_id.eq.${userData.id}`)
        .order("created_at", { ascending: false });
      setTransactions(data || []);
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra khi xác nhận", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenDispute = async () => {
    if (!disputeReason.trim()) {
      showToast("Vui lòng nhập lý do khiếu nại", "error");
      return;
    }
    setDisputeLoading(true);
    try {
      await openDispute(disputeTxnId, disputeReason.trim());
      showToast("Đã gửi khiếu nại! Admin sẽ xem xét trong thời gian sớm nhất.", "success");
      setDisputeTxnId(null);
      setDisputeReason("");
      // Refresh transactions
      const { data } = await supabase
        .from("lb_transactions")
        .select("*, book:book_id(title)")
        .or(`buyer_id.eq.${userData.id},seller_id.eq.${userData.id}`)
        .order("created_at", { ascending: false });
      setTransactions(data || []);
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra khi gửi khiếu nại", "error");
    } finally {
      setDisputeLoading(false);
    }
  };

  const canDispute = (txn) => {
    if (txn.buyer_id !== userData.id) return false;
    if (['cancelled', 'refunded', 'disputed'].includes(txn.status)) return false;
    const txnTime = new Date(txn.completed_at || txn.created_at);
    const hoursDiff = (new Date() - txnTime) / (1000 * 60 * 60);
    return hoursDiff <= 48;
  };

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
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((txn) => {
                  const status = statusConfig[txn.status] || { label: txn.status, color: "bg-slate-100 text-slate-600" };
                  const isBuyer = txn.buyer_id === userData.id;
                  const isPendingWallet = txn.status === 'pending' && (txn.payment_method === 'wallet' || txn.payment_method === 'payos') && !txn.is_completed;
                  const showConfirmBtn = isBuyer && isPendingWallet;
                  return (
                    <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{txn.id}</td>
                      <td className="px-5 py-4 font-medium text-slate-900">{txn.book?.title || "—"}</td>
                      <td className="px-5 py-4 font-semibold text-slate-900">{formatPrice(txn.amount)}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                        {isPendingWallet && (
                          <span className="block text-[10px] text-amber-600 mt-1">🔒 Đang giữ tiền</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs">
                        {new Date(txn.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5">
                          {showConfirmBtn && (
                            <button
                              onClick={() => handleConfirmReceived(txn.id)}
                              disabled={processingId === txn.id}
                              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                            >
                              {processingId === txn.id ? (
                                <>
                                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  Đang xử lý...
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Xác nhận đã nhận sách
                                </>
                              )}
                            </button>
                          )}
                          {canDispute(txn) && (
                            <button
                              onClick={() => setDisputeTxnId(txn.id)}
                              className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              Khiếu nại
                            </button>
                          )}
                          {txn.status === 'completed' && (
                            <span className="text-xs text-green-600 font-medium">✓ Đã hoàn tất</span>
                          )}
                          {txn.status === 'disputed' && (
                            <span className="text-xs text-orange-600 font-medium">⚠ Đang xử lý khiếu nại</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal khiếu nại */}
      {disputeTxnId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">🚨 Khiếu nại đơn hàng</h3>
              <button
                onClick={() => { setDisputeTxnId(null); setDisputeReason(""); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Vui lòng mô tả chi tiết vấn đề bạn gặp phải. Khiếu nại chỉ có hiệu lực trong vòng <strong>48 giờ</strong> kể từ khi giao dịch được tạo.
              </p>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="VD: Sách không đúng mô tả, thiếu trang, hư hỏng..."
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 h-28 resize-y"
                maxLength={500}
              />
              <p className="text-xs text-slate-400 text-right mt-1">{disputeReason.length}/500</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setDisputeTxnId(null); setDisputeReason(""); }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleOpenDispute}
                  disabled={disputeLoading || !disputeReason.trim()}
                  className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {disputeLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Đang gửi...
                    </>
                  ) : (
                    <>Gửi khiếu nại</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
