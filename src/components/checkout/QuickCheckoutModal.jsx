import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { formatPrice } from "../../utils/formatters";
import { createTransaction, processWalletPayment } from "../../services/payment";

const DELIVERY_METHODS = [
  { id: "meet", label: "Gặp trực tiếp", description: "Thống nhất địa điểm với người bán qua tin nhắn", fee: 0 },
  { id: "ship_fast", label: "Giao hàng nhanh", description: "Nhận hàng trong 1–2 ngày", fee: 30000 },
  { id: "ship_save", label: "Giao hàng tiết kiệm", description: "Nhận hàng trong 3–5 ngày", fee: 15000 },
];

const PAYMENT_METHODS = [
  { id: "wallet", label: "Ví LoopBook", description: "Thanh toán bằng số dư trong ví" },
  { id: "cash", label: "Tiền mặt (COD)", description: "Thanh toán khi gặp mặt hoặc nhận hàng" },
  { id: "bank_transfer", label: "Chuyển khoản ngân hàng", description: "Chuyển khoản trước khi giao dịch" },
];

export default function QuickCheckoutModal({ book, onClose }) {
  const navigate = useNavigate();
  const { user, userData, showToast } = useAuth();

  const [wallet, setWallet] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("meet");
  const [paymentMethod, setPaymentMethod] = useState("wallet");

  useEffect(() => {
    if (!user) return;
    supabase.from("lb_wallets").select("balance").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setWallet(data));
  }, [user]);

  useEffect(() => {
    if (!userData) return;
    if (userData.name) setBuyerName(userData.name);
    if (userData.phone) setBuyerPhone(userData.phone);
    if (userData.address) setBuyerAddress(userData.address);
  }, [userData]);

  const deliveryFee = DELIVERY_METHODS.find((d) => d.id === deliveryMethod)?.fee ?? 0;
  const bookPrice = book?.price ?? 0;
  const totalAmount = bookPrice + deliveryFee;
  const sufficientFunds = wallet && wallet.balance >= totalAmount;

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
      const txn = await createTransaction(book.id, user.id, {
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

      onClose();
      navigate(`/transaction/${txn.id}/success`);
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra, thử lại sau.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const imgSrc = book?.images?.[0] || book?.image || null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-8" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Thanh toán nhanh</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <section className="bg-slate-50 rounded-xl p-4 border border-slate-100">
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
                <p className="font-semibold text-slate-900 text-sm leading-snug">{book.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">Số lượng: 1</p>
                <p className="text-base font-extrabold text-slate-900 mt-1.5">{formatPrice(bookPrice)}</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Thông tin nhận hàng</h3>
            <div className="space-y-2.5">
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Họ và tên *"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              <input
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="Số điện thoại *"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              {deliveryMethod !== "meet" && (
                <input
                  type="text"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  placeholder="Địa chỉ nhận hàng *"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Vận chuyển</h3>
            <div className="space-y-1.5">
              {DELIVERY_METHODS.map((dm) => (
                <label key={dm.id} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${deliveryMethod === dm.id ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500" : "border-slate-200 hover:border-slate-300"}`}>
                  <input type="radio" name="delivery" value={dm.id} checked={deliveryMethod === dm.id} onChange={() => setDeliveryMethod(dm.id)} className="accent-teal-700 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{dm.label}</p>
                    <p className="text-xs text-slate-500">{dm.description}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-700 flex-shrink-0">{dm.fee === 0 ? "Miễn phí" : formatPrice(dm.fee)}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Thanh toán</h3>
            <div className="space-y-1.5">
              {PAYMENT_METHODS.map((pm) => (
                <label key={pm.id} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${paymentMethod === pm.id ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500" : "border-slate-200 hover:border-slate-300"}`}>
                  <input type="radio" name="payment" value={pm.id} checked={paymentMethod === pm.id} onChange={() => setPaymentMethod(pm.id)} className="accent-teal-700 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{pm.label}</p>
                    <p className="text-xs text-slate-500">{pm.description}</p>
                  </div>
                </label>
              ))}
            </div>
            {paymentMethod === "wallet" && (
              <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Số dư ví</span>
                  <span className="font-bold text-slate-900">{formatPrice(wallet?.balance ?? 0)}</span>
                </div>
                {!sufficientFunds && (
                  <p className="mt-1.5 text-xs text-red-500 font-medium">Số dư không đủ. Vui lòng chọn phương thức khác.</p>
                )}
              </div>
            )}
          </section>

          <section className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Giá sách</span>
              <span>{formatPrice(bookPrice)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Phí vận chuyển</span>
              <span>{deliveryFee === 0 ? "Miễn phí" : formatPrice(deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-base text-slate-900 pt-2 border-t border-slate-100">
              <span>Tổng thanh toán</span>
              <span className="text-teal-700">{formatPrice(totalAmount)}</span>
            </div>
          </section>
        </div>

        <div className="px-6 pb-5">
          <button
            onClick={handleSubmit}
            disabled={submitting || (paymentMethod === "wallet" && !sufficientFunds)}
            className="w-full py-3.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
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
              "Xác nhận đặt mua"
            )}
          </button>
          <p className="text-center text-xs text-slate-400 mt-3">
            🔒 Mọi giao dịch đều được bảo vệ theo{" "}
            <span className="underline cursor-pointer">Chính sách hoàn tiền</span> của LoopBook
          </p>
        </div>
      </div>
    </div>
  );
}
