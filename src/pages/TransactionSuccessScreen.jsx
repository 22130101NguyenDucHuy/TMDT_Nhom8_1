import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { formatPrice } from "../utils/formatters";
import { useAuth } from "../contexts/AuthContext";

const statusConfig = {
  pending: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Đã xác nhận", color: "bg-blue-100 text-blue-700" },
  awaiting_meet: { label: "Chờ gặp mặt", color: "bg-purple-100 text-purple-700" },
  completed: { label: "Hoàn tất", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
  refunded: { label: "Đã hoàn tiền", color: "bg-slate-100 text-slate-700" },
};

export default function TransactionSuccessScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [transaction, setTransaction] = useState(null);
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const { data: txnData, error: txnErr } = await supabase
          .from("lb_transactions")
          .select("*")
          .eq("id", id)
          .single();
        if (txnErr) throw txnErr;
        setTransaction(txnData);

        if (txnData.book_id) {
          const { data: bookData } = await supabase
            .from("lb_books")
            .select("title, price, images")
            .eq("id", txnData.book_id)
            .single();
          setBook(bookData);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTransaction();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700" />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <p className="text-slate-500">{error || "Không tìm thấy giao dịch."}</p>
        <button onClick={() => navigate("/")} className="vinted-btn-outline mt-4">Về trang chủ</button>
      </div>
    );
  }

  const status = statusConfig[transaction.status] || { label: transaction.status, color: "bg-slate-100 text-slate-600" };

  return (
    <div className="max-w-lg mx-auto py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Giao dịch thành công!</h1>
        <p className="text-slate-500">Cảm ơn bạn đã sử dụng LoopBook.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm mb-6">
        <h2 className="font-bold text-slate-900 text-lg mb-4">Chi tiết giao dịch</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Mã giao dịch</span>
            <span className="text-sm font-mono font-semibold text-slate-900">{transaction.id}</span>
          </div>
          {book && (
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Sách</span>
              <span className="text-sm font-semibold text-slate-900 text-right">{book.title}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Số tiền</span>
            <span className="text-sm font-bold text-slate-900">{formatPrice(transaction.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Phí giao dịch</span>
            <span className="text-sm text-slate-600">{formatPrice(transaction.fee_amount)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-100">
            <span className="text-sm font-semibold text-slate-700">Trạng thái</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          to="/my-transactions"
          className="w-full vinted-btn-primary py-3 text-center text-sm font-bold"
        >
          Xem danh sách giao dịch
        </Link>
        <Link
          to="/"
          className="w-full text-center px-6 py-3 font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm rounded-lg transition-colors text-sm"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
