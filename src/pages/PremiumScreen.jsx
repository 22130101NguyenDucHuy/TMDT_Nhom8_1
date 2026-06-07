import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { formatPrice } from "../utils/formatters";
import { useAuth } from "../contexts/AuthContext";
import Page from "../components/layout/Page";

export default function PremiumScreen() {
  const { user, userData, showToast } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase.from("lb_premium_plans").select("*");
      if (data && data.length > 0) {
        setPlans(data);
        setSelectedPlan(data[0].id);
      }
      setLoading(false);
    };
    fetchPlans();
  }, []);

  const selected = plans.find((plan) => plan.id === selectedPlan) ?? plans[0];

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
          <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Bạn chưa đăng nhập</h2>
        <p className="text-slate-600 mb-6">Vui lòng đăng nhập để sử dụng dịch vụ Premium.</p>
        <button onClick={() => navigate("/")} className="vinted-btn-primary w-auto px-8 mx-auto">Về trang chủ</button>
      </div>
    );
  }

  const handlePayment = async () => {
    if (!user) { showToast("Vui lòng đăng nhập", "error"); return; }
    if (!userData?.id) { showToast("Không tìm thấy thông tin người dùng", "error"); return; }
    if (!selected) { showToast("Vui lòng chọn gói dịch vụ", "error"); return; }
    setSubmitting(true);
    try {
      if (paymentMethod === "wallet") {
        const { data: wallet, error: wErr } = await supabase
          .from("lb_wallets").select("*").eq("user_id", user.id).maybeSingle();
        if (wErr) throw wErr;
        if (!wallet || wallet.balance < selected.price) {
          showToast("Số dư ví không đủ. Vui lòng nạp thêm tiền.", "error");
          setSubmitting(false);
          return;
        }
        const { error: deductErr } = await supabase
          .from("lb_wallets")
          .update({ balance: wallet.balance - selected.price, total_out: (wallet.total_out || 0) + selected.price })
          .eq("user_id", user.id);
        if (deductErr) throw deductErr;
      }

      const expiresAt = new Date();
      if (selected.id === "combo" || selected.id === "combo14") {
        expiresAt.setDate(expiresAt.getDate() + 14);
      } else {
        expiresAt.setDate(expiresAt.getDate() + 7);
      }

      const { error: promoErr } = await supabase
        .from("lb_listing_promotions")
        .insert([{
          user_id: userData.id,
          plan_type: selected.id,
          amount_paid: selected.price,
          payment_ref: `pmt_${Date.now()}`,
          is_active: true,
          expires_at: expiresAt.toISOString(),
        }]);
      if (promoErr) throw promoErr;

      showToast(`Đã kích hoạt gói "${selected.name}" thành công!`, "success");
    } catch (err) {
      showToast(err.message || "Thanh toán thất bại", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const paymentMethods = [
    { id: "wallet", label: "Ví LoopBook", icon: "💳" },
    { id: "bank", label: "Chuyển khoản ngân hàng", icon: "🏦" },
    { id: "card", label: "Thẻ tín dụng", icon: "💰" },
  ];

  if (loading) {
    return (
      <Page eyebrow="Premium" heading="Thanh toán dịch vụ đẩy tin">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      description="Dịch vụ Premium - Nâng cấp để có thêm nhiều tính năng."
      eyebrow="Premium"
      heading="Thanh toán dịch vụ đẩy tin"
    >
      <div className="py-6 flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto">
        <aside className="w-full lg:w-72 flex-shrink-0">
          <div className="sticky top-24 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Chọn Gói Dịch Vụ</h3>
              <div className="space-y-2">
                {plans.map((plan) => (
                  <button key={plan.id} onClick={() => setSelectedPlan(plan.id)} className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${selectedPlan === plan.id ? "bg-teal-50 border-teal-300 shadow-sm" : "bg-white border-slate-100 hover:border-slate-200"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${selectedPlan === plan.id ? "text-teal-900" : "text-slate-900"}`}>{plan.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{plan.summary}</p>
                      </div>
                      <span className={`text-sm font-bold ml-2 flex-shrink-0 ${selectedPlan === plan.id ? "text-teal-700" : "text-slate-600"}`}>{formatPrice(plan.price)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Phương thức thanh toán</h3>
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <button key={method.id} onClick={() => setPaymentMethod(method.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${paymentMethod === method.id ? "bg-teal-50 text-teal-700 border-teal-200" : "text-slate-600 hover:bg-slate-50 border-transparent"}`}>
                    <span className="text-lg">{method.icon}</span>
                    <span className="text-sm font-medium">{method.label}</span>
                    {paymentMethod === method.id && (
                      <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-blue-50 border border-teal-100 rounded-xl p-4">
              <p className="text-xs font-bold text-teal-900 mb-2 flex items-center gap-2">✨ Tính năng nổi bật</p>
              <ul className="text-xs text-slate-700 space-y-1">
                <li className="flex gap-2"><span>⭐</span><span>Đẩy tin lên top tìm kiếm</span></li>
                <li className="flex gap-2"><span>📈</span><span>Tăng độ tin cậy tài khoản</span></li>
                <li className="flex gap-2"><span>⚡</span><span>Bán nhanh hơn 3x lần</span></li>
              </ul>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Tóm tắt gói dịch vụ</h2>

            <div className="space-y-4 mb-8 pb-8 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Gói</span>
                <span className="font-bold text-slate-900 text-lg">{selected?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Mô tả</span>
                <span className="text-slate-700 text-sm text-right">{selected?.summary}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Thời hạn</span>
                <span className="font-bold text-slate-900">{selected?.id === "combo" || selected?.id === "combo14" ? "14 ngày" : "7 ngày"}</span>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-600">Phí dịch vụ</span>
                <span className="font-bold text-slate-900">{selected ? formatPrice(selected.price) : "—"}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-600">Phương thức</span>
                <span className="font-bold text-slate-900">{paymentMethods.find(m => m.id === paymentMethod)?.label}</span>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-teal-50 border border-teal-200 rounded-lg">
                <span className="font-bold text-teal-900">Tổng thanh toán</span>
                <span className="text-2xl font-extrabold text-teal-700">{selected ? formatPrice(selected.price) : "—"}</span>
              </div>
            </div>

            <button onClick={handlePayment} disabled={submitting || !selected} className="w-full py-3.5 px-6 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50">
              {submitting ? "Đang xử lý..." : "Xác nhận thanh toán ngay"}
            </button>

            <p className="text-xs text-slate-500 text-center mt-4">
              Bằng cách thanh toán, bạn đồng ý với{" "}
              <button className="text-teal-600 hover:underline font-medium">Điều khoản dịch vụ</button> của chúng tôi.
            </p>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Câu hỏi thường gặp</h3>
            <div className="space-y-3">
              <details className="group bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-slate-300 transition-colors">
                <summary className="flex items-center justify-between font-semibold text-slate-900">
                  Có thể hủy gói bất cứ lúc nào không?
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600">Có, bạn có thể hủy gói Premium bất cứ lúc nào. Khi hủy, bạn sẽ không được hoàn tiền cho kỳ đã thanh toán.</p>
              </details>
              <details className="group bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-slate-300 transition-colors">
                <summary className="flex items-center justify-between font-semibold text-slate-900">
                  Sẽ được sử dụng gói này bao lâu?
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600">Gói Premium của bạn sẽ có hiệu lực trong 30 ngày kể từ ngày kích hoạt. Sau đó, bạn có thể gia hạn hoặc chọn gói khác.</p>
              </details>
            </div>
          </div>
        </main>
      </div>
    </Page>
  );
}
