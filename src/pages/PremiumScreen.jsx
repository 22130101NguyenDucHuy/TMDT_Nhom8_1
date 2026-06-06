import { useState } from "react";
import { premiumPlans } from "../data/siteData";
import { formatPrice } from "../utils/formatters";
import Page from "../components/layout/Page";

export default function PremiumScreen() {
  const [selectedPlan, setSelectedPlan] = useState(premiumPlans[0].id);
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const selected = premiumPlans.find((plan) => plan.id === selectedPlan) ?? premiumPlans[0];

  const paymentMethods = [
    { id: "wallet", label: "Ví LoopBook", icon: "💳" },
    { id: "bank", label: "Chuyển khoản ngân hàng", icon: "🏦" },
    { id: "card", label: "Thẻ tín dụng", icon: "💰" },
  ];

  return (
    <Page
      description="Dịch vụ Premium - Nâng cấp để có thêm nhiều tính năng."
      eyebrow="Premium"
      heading="Thanh toán dịch vụ đẩy tin"
    >
      <div className="py-6 flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto">
        {/* ── Sidebar Bộ lọc/Chọn ── */}
        <aside className="w-full lg:w-72 flex-shrink-0">
          <div className="sticky top-24 space-y-6">
            {/* Bộ lọc theo loại dịch vụ */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                Chọn Gói Dịch Vụ
              </h3>
              <div className="space-y-2">
                {premiumPlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      selectedPlan === plan.id
                        ? "bg-teal-50 border-teal-300 shadow-sm"
                        : "bg-white border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${selectedPlan === plan.id ? "text-teal-900" : "text-slate-900"}`}>
                          {plan.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{plan.summary}</p>
                      </div>
                      <span className={`text-sm font-bold ml-2 flex-shrink-0 ${selectedPlan === plan.id ? "text-teal-700" : "text-slate-600"}`}>
                        {formatPrice(plan.price)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Phương thức thanh toán */}
            <div className="bg-white border border-slate-100 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">
                Phương thức thanh toán
              </h3>
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                      paymentMethod === method.id
                        ? "bg-teal-50 text-teal-700 border-teal-200"
                        : "text-slate-600 hover:bg-slate-50 border-transparent"
                    }`}
                  >
                    <span className="text-lg">{method.icon}</span>
                    <span className="text-sm font-medium">{method.label}</span>
                    {paymentMethod === method.id && (
                      <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Gợi ý tính năng */}
            <div className="bg-gradient-to-br from-teal-50 to-blue-50 border border-teal-100 rounded-xl p-4">
              <p className="text-xs font-bold text-teal-900 mb-2 flex items-center gap-2">
                ✨ Tính năng nổi bật
              </p>
              <ul className="text-xs text-slate-700 space-y-1">
                <li className="flex gap-2">
                  <span>⭐</span>
                  <span>Đẩy tin lên top tìm kiếm</span>
                </li>
                <li className="flex gap-2">
                  <span>📈</span>
                  <span>Tăng độ tin cậy tài khoản</span>
                </li>
                <li className="flex gap-2">
                  <span>⚡</span>
                  <span>Bán nhanh hơn 3x lần</span>
                </li>
              </ul>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 min-w-0">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Tóm tắt gói dịch vụ</h2>

            {/* Chi tiết gói */}
            <div className="space-y-4 mb-8 pb-8 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Gói</span>
                <span className="font-bold text-slate-900 text-lg">{selected.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Mô tả</span>
                <span className="text-slate-700 text-sm text-right">{selected.summary}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Thời hạn</span>
                <span className="font-bold text-slate-900">30 ngày</span>
              </div>
            </div>

            {/* Chi phí */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-600">Phí dịch vụ</span>
                <span className="font-bold text-slate-900">{formatPrice(selected.price)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-600">Phương thức</span>
                <span className="font-bold text-slate-900">
                  {paymentMethods.find(m => m.id === paymentMethod)?.label}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-teal-50 border border-teal-200 rounded-lg">
                <span className="font-bold text-teal-900">Tổng thanh toán</span>
                <span className="text-2xl font-extrabold text-teal-700">{formatPrice(selected.price)}</span>
              </div>
            </div>

            {/* Nút xác nhận */}
            <button className="w-full py-3.5 px-6 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              Xác nhận thanh toán ngay
            </button>

            <p className="text-xs text-slate-500 text-center mt-4">
              Bằng cách thanh toán, bạn đồng ý với {" "}
              <button className="text-teal-600 hover:underline font-medium">Điều khoản dịch vụ</button> của chúng tôi.
            </p>
          </div>

          {/* FAQ */}
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
              <details className="group bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-slate-300 transition-colors">
                <summary className="flex items-center justify-between font-semibold text-slate-900">
                  Phương thức thanh toán nào an toàn nhất?
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600">Tất cả phương thức thanh toán trên LoopBook đều được bảo vệ bởi công nghệ mã hóa SSL 256-bit. Hãy chọn phương thức mà bạn cảm thấy thoải mái nhất.</p>
              </details>
            </div>
          </div>
        </main>
      </div>
    </Page>
  );
}
