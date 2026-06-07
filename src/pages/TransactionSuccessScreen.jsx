import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { formatPrice } from "../utils/formatters";
import { useAuth } from "../contexts/AuthContext";

const STATUS_CONFIG = {
  pending:       { label: "Chờ người bán xác nhận", color: "bg-yellow-100 text-yellow-700", icon: "⏳" },
  confirmed:     { label: "Đã xác nhận",            color: "bg-blue-100 text-blue-700",    icon: "✅" },
  awaiting_meet: { label: "Chờ gặp mặt",            color: "bg-purple-100 text-purple-700", icon: "🤝" },
  completed:     { label: "Hoàn tất",                color: "bg-green-100 text-green-700",  icon: "🎉" },
  cancelled:     { label: "Đã hủy",                  color: "bg-red-100 text-red-700",      icon: "❌" },
  refunded:      { label: "Đã hoàn tiền",            color: "bg-slate-100 text-slate-700",  icon: "↩️" },
};

const DELIVERY_LABELS = {
  meet:      "Gặp trực tiếp",
  ship_fast: "Giao hàng nhanh",
  ship_save: "Giao hàng tiết kiệm",
};

export default function TransactionSuccessScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [txn, setTxn]       = useState(null);
  const [book, setBook]     = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!userData) return;
    const fetchData = async () => {
      try {
        const { data: txnData, error: txnErr } = await supabase
          .from("lb_transactions")
          .select("*")
          .eq("id", id)
          .single();
        if (txnErr) throw txnErr;

        // Bảo vệ: chỉ buyer hoặc seller mới xem được
        if (txnData.buyer_id !== userData.id && txnData.seller_id !== userData.id) {
          setError("Bạn không có quyền xem giao dịch này.");
          return;
        }
        setTxn(txnData);

        // Fetch book + seller song song
        if (txnData.book_id) {
          const [{ data: bookData }, { data: sellerData }] = await Promise.all([
            supabase.from("lb_books").select("id, title, price, images, image").eq("id", txnData.book_id).single(),
            txnData.seller_id
              ? supabase.from("lb_users").select("id, name").eq("id", txnData.seller_id).maybeSingle()
              : Promise.resolve({ data: null }),
          ]);
          setBook(bookData);
          setSeller(sellerData);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, userData]);

  if (!userData) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <p className="text-slate-500">Vui lòng đăng nhập để xem giao dịch.</p>
        <button onClick={() => navigate("/")} className="vinted-btn-outline mt-4">Về trang chủ</button>
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

  if (error || !txn) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <p className="text-slate-500">{error || "Không tìm thấy giao dịch."}</p>
        <button onClick={() => navigate("/")} className="vinted-btn-outline mt-4">Về trang chủ</button>
      </div>
    );
  }

  const status  = STATUS_CONFIG[txn.status] ?? { label: txn.status, color: "bg-slate-100 text-slate-600", icon: "📋" };
  const imgSrc  = book?.images?.[0] || book?.image || null;
  const isWallet = txn.payment_method === "wallet";

  return (
    <div className="max-w-lg mx-auto py-10 px-4">

      {/* ── Hero thành công ── */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Đặt mua thành công!</h1>
        <p className="text-slate-500 text-sm">Cảm ơn bạn đã tin tưởng LoopBook.</p>
      </div>

      {/* ── Mã đơn hàng + trạng thái ── */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4 text-center">
        <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider mb-1">Mã đơn hàng</p>
        <p className="text-lg font-mono font-extrabold text-teal-800">#{txn.id}</p>
        <div className="mt-2 flex items-center justify-center gap-1.5">
          <span className="text-base">{status.icon}</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.color}`}>{status.label}</span>
        </div>
        {seller && (
          <p className="text-xs text-teal-600 mt-2">
            Đang chờ <span className="font-semibold">{seller.name}</span> xác nhận
          </p>
        )}
      </div>

      {/* ── Chi tiết đơn ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-4 overflow-hidden">
        {/* Sách */}
        {book && (
          <div className="flex gap-4 p-5 border-b border-slate-100">
            <div className="w-14 h-18 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
              {imgSrc
                ? <img src={imgSrc} alt={book.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm leading-snug">{book.title}</p>
              {seller && <p className="text-xs text-slate-500 mt-0.5">Người bán: {seller.name}</p>}
              <p className="text-base font-extrabold text-slate-900 mt-1.5">{formatPrice(txn.amount)}</p>
            </div>
          </div>
        )}

        {/* Breakdown */}
        <div className="p-5 space-y-2.5 text-sm">
          <Row label="Phương thức thanh toán" value={
            txn.payment_method === "wallet" ? "Ví LoopBook"
            : txn.payment_method === "cash" ? "Tiền mặt (COD)"
            : txn.payment_method === "bank_transfer" ? "Chuyển khoản ngân hàng"
            : txn.payment_method || "—"
          } />
          <Row label="Vận chuyển" value={DELIVERY_LABELS[txn.delivery_method] || "Gặp trực tiếp"} />
          {txn.buyer_name  && <Row label="Người nhận"  value={txn.buyer_name} />}
          {txn.buyer_phone && <Row label="Số điện thoại" value={txn.buyer_phone} />}
          {txn.delivery_address && <Row label="Địa chỉ" value={txn.delivery_address} />}
          <div className="flex justify-between pt-2.5 border-t border-slate-100 font-bold text-slate-900">
            <span>Tổng thanh toán</span>
            <span className="text-teal-700">{formatPrice(txn.amount)}</span>
          </div>
        </div>
      </div>

      {/* ── Chính sách bảo vệ ── */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex gap-3">
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <div>
          <p className="text-sm font-bold text-blue-900 mb-0.5">Bảo vệ người mua</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            Mọi giao dịch qua LoopBook đều được bảo vệ theo{" "}
            <span className="underline font-semibold cursor-pointer">Chính sách hoàn tiền</span>.
            Nếu sách không đúng mô tả, bạn có thể yêu cầu hoàn tiền trong vòng 24 giờ.
          </p>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="flex flex-col gap-3">
        <Link
          to="/tin-nhan"
          className="w-full py-3.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-sm text-center transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Nhắn tin cho người bán
        </Link>
        <Link
          to="/my-transactions"
          className="w-full py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-sm text-center transition-colors"
        >
          Xem lịch sử giao dịch
        </Link>
        <Link
          to="/kham-pha"
          className="w-full py-3 text-teal-700 hover:underline font-semibold text-sm text-center transition-colors"
        >
          Tiếp tục khám phá tài liệu →
        </Link>
      </div>
    </div>
  );
}

// Helper component
function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500 flex-shrink-0">{label}</span>
      <span className="font-semibold text-slate-800 text-right">{value}</span>
    </div>
  );
}
