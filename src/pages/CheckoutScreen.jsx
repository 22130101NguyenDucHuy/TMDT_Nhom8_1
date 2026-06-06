import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { formatPrice } from "../utils/formatters";
import { createTransaction, processWalletPayment, getPaymentMethods } from "../services/payment";

export default function CheckoutScreen() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { userData, showToast } = useAuth();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState(null);

  const paymentMethods = getPaymentMethods();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: bookData, error: bookErr } = await supabase
          .from("lb_books")
          .select("*, seller:seller_id!inner(id, name)")
          .eq("id", bookId)
          .single();
        if (bookErr) throw bookErr;
        setBook(bookData);

        if (userData) {
          const { data: walletData } = await supabase
            .from("lb_wallets")
            .select("*")
            .eq("user_id", userData.id)
            .maybeSingle();
          setWallet(walletData);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [bookId, userData]);

  const handleSubmit = async () => {
    if (!userData) {
      showToast("Vui lòng đăng nhập để thanh toán.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const txn = await createTransaction(bookId, userData.id);
      if (paymentMethod === "wallet") {
        const result = await processWalletPayment(txn.id);
        navigate(`/transaction/${result.id}/success`);
      } else {
        navigate(`/transaction/${txn.id}/success`);
      }
      showToast("Đặt mua thành công!", "success");
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!userData) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
          <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Bạn chưa đăng nhập</h2>
        <p className="text-slate-600 mb-6">Vui lòng đăng nhập để tiếp tục thanh toán.</p>
        <button onClick={() => navigate("/")} className="vinted-btn-outline w-auto px-8 mx-auto">Về trang chủ</button>
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

  if (error || !book) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-slate-500">{error || "Không tìm thấy sách."}</p>
        <button onClick={() => navigate("/")} className="vinted-btn-outline mt-4">Về trang chủ</button>
      </div>
    );
  }

  const sufficientFunds = wallet && wallet.balance >= book.price;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Thanh toán</h1>

      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="font-bold text-slate-900 text-lg mb-4">Thông tin sách</h2>
        <div className="flex items-start gap-4">
          {book.images?.[0] && (
            <img src={book.images[0]} alt={book.title} className="w-20 h-28 object-cover rounded-md" />
          )}
          <div>
            <p className="font-semibold text-slate-900">{book.title}</p>
            <p className="text-sm text-slate-500 mt-1">Người bán: {book.seller?.name || "—"}</p>
            <p className="text-lg font-bold text-teal-700 mt-2">{formatPrice(book.price)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="font-bold text-slate-900 text-lg mb-4">Phương thức thanh toán</h2>
        <div className="space-y-3">
          {paymentMethods.map((pm) => (
            <label
              key={pm.id}
              className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                paymentMethod === pm.id
                  ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value={pm.id}
                checked={paymentMethod === pm.id}
                onChange={() => setPaymentMethod(pm.id)}
                className="accent-teal-700"
              />
              <div>
                <p className="font-semibold text-slate-900 text-sm">{pm.label}</p>
                <p className="text-xs text-slate-500">{pm.description}</p>
              </div>
            </label>
          ))}
        </div>

        {paymentMethod === "wallet" && wallet && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Số dư ví:</span>
              <span className="font-bold text-slate-900">{formatPrice(wallet.balance)}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-slate-600">Giá sách:</span>
              <span className="font-bold text-slate-900">{formatPrice(book.price)}</span>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
              <span className="text-sm font-semibold text-slate-700">Kết quả:</span>
              <span className={`font-bold ${sufficientFunds ? "text-green-600" : "text-red-500"}`}>
                {sufficientFunds ? "Đủ tiền" : "Không đủ tiền"}
              </span>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || (paymentMethod === "wallet" && !sufficientFunds)}
        className="w-full vinted-btn-primary py-3 text-base font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Đang xử lý...
          </>
        ) : (
          "Xác nhận thanh toán"
        )}
      </button>
    </div>
  );
}
