import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { formatPrice } from "../utils/formatters";
import { depositWallet, withdrawWallet } from "../services/payment";

export default function WalletScreen() {
  const { userData, showToast } = useAuth();

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("chuyen_khoan");
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);

  const banks = [
    "Vietcombank", "Techcombank", "ACB", "MB Bank", "BIDV", "VietinBank",
    "VPBank", "TPBank", "Sacombank", "SHB", "HDBank", "VIB", "MSB",
    "SeABank", "OCB", "Nam A Bank", "PVcomBank", "PG Bank", "Saigonbank",
    "VietBank", "BaoViet Bank", "KienLong Bank", "LienVietPostBank",
  ];

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

  const handleDeposit = async () => {
    const amount = parseInt(depositAmount.replace(/\D/g, ""), 10);
    if (!amount || amount <= 0) {
      showToast("Vui lòng nhập số tiền hợp lệ", "error");
      return;
    }
    setShowDeposit(false);
    setShowPaymentGateway(true);
    await new Promise(r => setTimeout(r, 2000));
    setSubmitting(true);
    try {
      await depositWallet(userData.id, amount);
      showToast(`Nạp thành công ${formatPrice(amount)} vào ví!`, "success");
      setDepositAmount("");
      const { data: w } = await supabase.from("lb_wallets").select("*").eq("user_id", userData.id).maybeSingle();
      setWallet(w);
    } catch (err) {
      showToast(err.message || "Nạp tiền thất bại", "error");
    } finally {
      setSubmitting(false);
      setShowPaymentGateway(false);
      setPaymentMethod("chuyen_khoan");
    }
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount.replace(/\D/g, ""), 10);
    if (!amount || amount <= 0) {
      showToast("Vui lòng nhập số tiền hợp lệ", "error");
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      showToast("Vui lòng nhập đầy đủ thông tin ngân hàng", "error");
      return;
    }
    setSubmitting(true);
    try {
      await withdrawWallet(userData.id, amount, {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
      });
      showToast("Yêu cầu rút tiền đã được ghi nhận!", "success");
      setShowWithdraw(false);
      setWithdrawAmount("");
      setBankName("");
      setAccountNumber("");
      setAccountHolder("");
      const { data: w } = await supabase.from("lb_wallets").select("*").eq("user_id", userData.id).maybeSingle();
      setWallet(w);
    } catch (err) {
      showToast(err.message || "Rút tiền thất bại", "error");
    } finally {
      setSubmitting(false);
    }
  };

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
          <button
            onClick={() => setShowWithdraw(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19V5M5 12l7-7 7 7" /></svg>
            Rút tiền
          </button>
          <button
            onClick={() => setShowDeposit(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold text-sm transition-colors"
          >
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

      {showDeposit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !submitting && setShowDeposit(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Nạp tiền vào ví</h3>
              <button onClick={() => !submitting && setShowDeposit(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Nhập số tiền bạn muốn nạp vào ví LoopBook.</p>
            <div className="relative mb-4">
              <input
                type="text"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value.replace(/\D/g, "").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1."))}
                className="vinted-input text-lg font-bold text-center py-4"
                placeholder="0"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₫</span>
            </div>
            <div className="flex gap-2 mb-4">
              {[50000, 100000, 200000, 500000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setDepositAmount(amt.toLocaleString("vi-VN"))}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-colors"
                >
                  {formatPrice(amt)}
                </button>
              ))}
            </div>
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">Chọn phương thức thanh toán</p>
              <div className="space-y-2">
                {[
                  { value: "chuyen_khoan", label: "Chuyển khoản ngân hàng" },
                  { value: "the_tin_dung", label: "Thẻ tín dụng/ghi nợ" },
                  { value: "momo", label: "Ví Momo" },
                  { value: "vietqr", label: "VietQR" },
                ].map(m => (
                  <label key={m.value} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-colors cursor-pointer has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50">
                    <input type="radio" name="paymentMethod" value={m.value} checked={paymentMethod === m.value} onChange={() => setPaymentMethod(m.value)} className="accent-teal-700" />
                    <span className="text-sm font-medium text-slate-800">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={handleDeposit}
              disabled={submitting}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              {submitting ? "Đang xử lý..." : "Xác nhận nạp tiền"}
            </button>
          </div>
        </div>
      )}

      {showPaymentGateway && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm mx-4 shadow-xl text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700 mx-auto mb-4" />
            <p className="text-lg font-bold text-slate-900 mb-2">Đang chuyển hướng đến cổng thanh toán...</p>
            <p className="text-sm text-slate-500">Vui lòng không tắt trình duyệt</p>
          </div>
        </div>
      )}

      {showWithdraw && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !submitting && setShowWithdraw(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Rút tiền về ngân hàng</h3>
              <button onClick={() => !submitting && setShowWithdraw(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Số tiền rút</label>
                <input
                  type="text"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value.replace(/\D/g, "").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1."))}
                  className="vinted-input"
                  placeholder="0"
                />
                <p className="text-xs text-slate-400 mt-1">Số dư hiện tại: {formatPrice(balance)}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Ngân hàng thụ hưởng</label>
                <select value={bankName} onChange={e => setBankName(e.target.value)} className="vinted-input">
                  <option value="">-- Chọn ngân hàng --</option>
                  {banks.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Số tài khoản</label>
                <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="vinted-input" placeholder="VD: 1234567890" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Chủ tài khoản</label>
                <input type="text" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} className="vinted-input" placeholder="VD: NGUYEN VAN A" />
              </div>
            </div>
            <button
              onClick={handleWithdraw}
              disabled={submitting || balance <= 0}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              {submitting ? "Đang xử lý..." : "Gửi yêu cầu rút tiền"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
