import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { formatPrice } from "../utils/formatters";
import { createTransaction, processWalletPayment, createPayOSCheckoutLink } from "../services/payment";
import { getMeetupSpots, getDefaultMeetupSpots } from "../utils/campusMeetup";

// ─── Cấu hình phương thức vận chuyển ───────────────────────────────────────
const DELIVERY_METHODS = [
  {
    id: "meet",
    label: "Gặp trực tiếp",
    description: "Thống nhất địa điểm với người bán qua tin nhắn",
    fee: 0,
    icon: "🤝",
  },
  {
    id: "ship_fast",
    label: "Giao hàng nhanh",
    description: "Nhận hàng trong 1–2 ngày",
    fee: 30000,
    icon: "⚡",
  },
  {
    id: "ship_save",
    label: "Giao hàng tiết kiệm",
    description: "Nhận hàng trong 3–5 ngày",
    fee: 15000,
    icon: "📦",
  },
];

// ─── Cấu hình phương thức thanh toán ───────────────────────────────────────
const PAYMENT_METHODS = [
  {
    id: "wallet",
    label: "Ví LoopBook",
    description: "Thanh toán bằng số dư trong ví",
    icon: "💳",
  },
  {
    id: "payos",
    label: "Cổng thanh toán PayOS (VietQR)",
    description: "Quét mã QR bằng ứng dụng ngân hàng",
    icon: "⚡",
  },
  {
    id: "cash",
    label: "Tiền mặt (COD)",
    description: "Thanh toán khi gặp mặt hoặc nhận hàng",
    icon: "💵",
  },
  {
    id: "bank_transfer",
    label: "Chuyển khoản ngân hàng",
    description: "Chuyển khoản trước khi giao dịch",
    icon: "🏦",
  },
];

export default function CheckoutScreen() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { user, userData, showToast, requireAuth, loading: authLoading } = useAuth();

  const [book, setBook]               = useState(null);
  const [wallet, setWallet]           = useState(null);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);

  // Form state
  const [buyerName, setBuyerName]         = useState("");
  const [buyerPhone, setBuyerPhone]       = useState("");
  const [buyerAddress, setBuyerAddress]   = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("meet");
  const [paymentMethod, setPaymentMethod]   = useState("wallet");
  const [meetupSpot, setMeetupSpot]         = useState("");

  // Gợi ý điểm hẹn dựa trên trường của người bán
  const meetupSuggestions = book?.school
    ? getMeetupSpots(book.school)
    : getDefaultMeetupSpots();

  // ── Fetch dữ liệu — chỉ chạy khi đã có user ──────────────────────────────
  useEffect(() => {
    if (!user) return; // chờ auth xong
    const fetchData = async () => {
      try {
        const [{ data: bookData, error: bookErr }, { data: walletData }] = await Promise.all([
          supabase.from("lb_books").select("*, seller:seller_id(id, name)").eq("id", bookId).single(),
          supabase.from("lb_wallets").select("balance").eq("user_id", user.id).maybeSingle(),
        ]);
        if (bookErr) throw bookErr;
        setBook(bookData);
        setWallet(walletData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [bookId, user]);

  // Tự động điền thông tin người dùng từ userData
  useEffect(() => {
    if (!userData) return;
    if (userData.name)    setBuyerName(userData.name);
    if (userData.phone)   setBuyerPhone(userData.phone);
    if (userData.address) setBuyerAddress(userData.address);
  }, [userData]);

  // ── Tính toán giá ─────────────────────────────────────────────────────────
  const deliveryFee   = DELIVERY_METHODS.find((d) => d.id === deliveryMethod)?.fee ?? 0;
  const bookPrice     = book?.price ?? 0;
  const feeRate       = 5.00;
  const feeAmount     = Math.round(bookPrice * feeRate / 100);
  const netAmount     = bookPrice - feeAmount;
  const totalAmount   = bookPrice + deliveryFee;
  const sufficientFunds = wallet && wallet.balance >= totalAmount;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!buyerName.trim() || !buyerPhone.trim()) {
      showToast("Vui lòng điền đầy đủ tên và số điện thoại", "error");
      return;
    }
    if (deliveryMethod !== "meet" && !buyerAddress.trim()) {
      showToast("Vui lòng nhập địa chỉ nhận hàng", "error");
      return;
    }
    if (paymentMethod === "wallet" && !sufficientFunds) {
      showToast("Số dư ví không đủ", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (paymentMethod === "payos") {
        const res = await createPayOSCheckoutLink(bookId, user.id, {
          deliveryMethod,
          deliveryAddress: buyerAddress,
          buyerName,
          buyerPhone,
          deliveryFee,
          amount: totalAmount,
        });
        if (res && res.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        } else {
          throw new Error("Không nhận được liên kết thanh toán");
        }
        return;
      }

      const txn = await createTransaction(bookId, user.id, {
        paymentMethod,
        deliveryMethod,
        deliveryAddress: buyerAddress,
        buyerName,
        buyerPhone,
        deliveryFee,
      });

      if (paymentMethod === "wallet") {
        await processWalletPayment(txn.id);
      }

      navigate(`/transaction/${txn.id}/success`);
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra, thử lại sau.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  // 1. Auth đang load — chờ, không redirect
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700" />
      </div>
    );
  }

  // 2. Chưa đăng nhập — hiện thông báo + mở modal
  if (!user || !userData) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Vui lòng đăng nhập</h2>
        <p className="text-slate-500 text-sm mb-5">Bạn cần đăng nhập để tiếp tục thanh toán.</p>
        <button
          onClick={() => requireAuth()}
          className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg text-sm transition-colors"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  if (userData.status === 'inactive') {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-full mb-4 text-amber-500 shadow-sm">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Tài khoản chưa được kích hoạt</h2>
        <p className="text-slate-500 text-sm mb-5 max-w-md mx-auto">Tài khoản của bạn đang chờ phê duyệt thẻ sinh viên để thực hiện mua sách.</p>
        <button onClick={() => navigate("/")} className="vinted-btn-outline w-auto px-8 mx-auto">Về trang chủ</button>
      </div>
    );
  }

  if (userData.status === 'suspended') {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-4 text-red-500 shadow-sm">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Tài khoản đã bị khóa</h2>
        <p className="text-slate-500 text-sm mb-5 max-w-md mx-auto">Tài khoản của bạn đã bị khóa do vi phạm chính sách của LoopBook.</p>
        <button onClick={() => navigate("/")} className="vinted-btn-outline w-auto px-8 mx-auto">Về trang chủ</button>
      </div>
    );
  }

  // 3. Đang load data sách
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
        <button onClick={() => navigate(-1)} className="vinted-btn-outline mt-4">Quay lại</button>
      </div>
    );
  }

  const imgSrc = book.images?.[0] || book.image || null;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 transition-colors mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Quay lại
        </button>
        <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-0.5">Thanh toán</p>
        <h1 className="text-2xl font-bold text-slate-900">Xác nhận đặt mua</h1>
      </div>

      {/* ── Thông tin đơn hàng ── */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4 shadow-sm">
        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4">Đơn hàng</h2>
        <div className="flex gap-4">
          <div className="w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
            {imgSrc
              ? <img src={imgSrc} alt={book.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 leading-snug">{book.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">Người bán: {book.seller?.name || "—"}</p>
            <p className="text-xs text-slate-500 mt-0.5">Số lượng: 1</p>
            <p className="text-base font-extrabold text-slate-900 mt-2">{formatPrice(bookPrice)}</p>
          </div>
        </div>
      </section>

      {/* ── Thông tin nhận hàng ── */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4 shadow-sm">
        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4">Thông tin nhận hàng</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Số điện thoại <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              placeholder="0912 345 678"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
          {deliveryMethod === "meet" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                📍 Điểm hẹn giao dịch
              </label>
              {book?.school && (
                <p className="text-xs text-teal-600 mb-2">
                  🎓 Gợi ý điểm hẹn tại {book.school}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mb-2">
                {meetupSuggestions.map((spot) => (
                  <button
                    key={spot}
                    type="button"
                    onClick={() => {
                      setMeetupSpot(spot);
                      setBuyerAddress(spot);
                    }}
                    className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      meetupSpot === spot
                        ? "bg-teal-700 text-white border-teal-700"
                        : "bg-white text-slate-700 border-slate-200 hover:border-teal-500"
                    }`}
                  >
                    {meetupSpot === spot && <span className="mr-1">✓</span>}
                    {spot}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={buyerAddress}
                onChange={(e) => {
                  setBuyerAddress(e.target.value);
                  setMeetupSpot(e.target.value);
                }}
                placeholder="Hoặc nhập địa điểm khác..."
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )}
          {deliveryMethod !== "meet" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Địa chỉ nhận hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                placeholder="Số nhà, đường, phường, quận, tỉnh/thành phố"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Phương thức vận chuyển ── */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4 shadow-sm">
        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4">Phương thức vận chuyển</h2>
        <div className="space-y-2">
          {DELIVERY_METHODS.map((dm) => (
            <label
              key={dm.id}
              className={`flex items-center gap-3 p-3.5 border rounded-lg cursor-pointer transition-all ${
                deliveryMethod === dm.id
                  ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="delivery"
                value={dm.id}
                checked={deliveryMethod === dm.id}
                onChange={() => setDeliveryMethod(dm.id)}
                className="accent-teal-700"
              />
              <span className="text-xl">{dm.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 text-sm">{dm.label}</p>
                <p className="text-xs text-slate-500">{dm.description}</p>
              </div>
              <span className="text-sm font-bold text-slate-700 flex-shrink-0">
                {dm.fee === 0 ? "Miễn phí" : formatPrice(dm.fee)}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* ── Phương thức thanh toán ── */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4 shadow-sm">
        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4">Phương thức thanh toán</h2>
        <div className="space-y-2">
          {PAYMENT_METHODS.map((pm) => (
            <label
              key={pm.id}
              className={`flex items-center gap-3 p-3.5 border rounded-lg cursor-pointer transition-all ${
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
              <span className="text-xl">{pm.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 text-sm">{pm.label}</p>
                <p className="text-xs text-slate-500">{pm.description}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Hiển thị số dư ví nếu chọn ví */}
        {paymentMethod === "wallet" && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Số dư ví</span>
              <span className="font-bold text-slate-900">{formatPrice(wallet?.balance ?? 0)}</span>
            </div>
            {!sufficientFunds && (
              <p className="mt-2 text-xs text-red-500 font-medium">
                Số dư không đủ. Vui lòng{" "}
                <Link to="/wallet" className="underline font-semibold">nạp thêm tiền</Link>
                {" "}hoặc chọn phương thức khác.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Tóm tắt đơn hàng ── */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Tóm tắt</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Giá sách</span>
            <span>{formatPrice(bookPrice)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Phí vận chuyển</span>
            <span>{deliveryFee === 0 ? "Miễn phí" : formatPrice(deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-amber-600">
            <span className="flex items-center gap-1">
              Phí bảo chứng ({feeRate}%)
              <span title="Phí giúp bảo vệ giao dịch và duy trì nền tảng" className="cursor-help text-amber-400">ⓘ</span>
            </span>
            <span>-{formatPrice(feeAmount)}</span>
          </div>
          <div className="flex justify-between text-emerald-600 text-xs bg-emerald-50 px-2 py-1.5 rounded-lg">
            <span>Người bán thực nhận</span>
            <span className="font-semibold">{formatPrice(netAmount)}</span>
          </div>
          <div className="flex justify-between font-extrabold text-base text-slate-900 pt-2 border-t border-slate-100">
            <span>Tổng thanh toán</span>
            <span className="text-teal-700">{formatPrice(totalAmount)}</span>
          </div>
        </div>
      </section>

      {/* ── Nút xác nhận ── */}
      <button
        onClick={handleSubmit}
        disabled={submitting || (paymentMethod === "wallet" && !sufficientFunds)}
        className="w-full py-4 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-base transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Đang xử lý…
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Xác nhận đặt mua
          </>
        )}
      </button>

      {/* Cam kết bảo vệ */}
      <p className="text-center text-xs text-slate-400 mt-4">
        🔒 Mọi giao dịch đều được bảo vệ theo{" "}
        <span className="underline cursor-pointer">Chính sách hoàn tiền</span> của LoopBook
      </p>
    </div>
  );
}
