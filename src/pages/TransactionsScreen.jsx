import { useEffect, useState } from "react";
import { transactions } from "../data/siteData";

const statusConfig = {
  "Đang chờ gặp trực tiếp": { label: "Chờ gặp mặt", color: "bg-yellow-100 text-yellow-700" },
  "Đang xác nhận thanh toán": { label: "Xác nhận TT", color: "bg-blue-100 text-blue-700" },
  "Hoàn tất": { label: "Hoàn tất", color: "bg-green-100 text-green-700" },
};

function TransactionCard({ item, isCompleted }) {
  const status = statusConfig[item.status] || { label: item.status, color: "bg-slate-100 text-slate-600" };
  return (
    <div className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
      {/* Avatar người giao dịch */}
      <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
        {item.partner.charAt(0)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm truncate">{item.book}</p>
        <p className="text-xs text-slate-500 mt-0.5">Với <span className="font-medium text-slate-700">{item.partner}</span></p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
          <span className="text-xs text-slate-400">{item.when}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={`font-bold text-sm ${isCompleted ? "text-green-600" : "text-slate-900"}`}>{item.amount}</span>
        <div className="flex gap-2">
          {!isCompleted && (
            <button className="text-xs text-teal-700 border border-teal-700 px-2 py-0.5 rounded-full font-semibold hover:bg-teal-50 transition-colors">
              Xem chi tiết
            </button>
          )}
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-report-modal', { detail: item }))}
            className="text-xs text-orange-600 border border-orange-600 px-2 py-0.5 rounded-full font-semibold hover:bg-orange-50 transition-colors">
            Khiếu nại
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransactionsScreen() {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [reportReason, setReportReason] = useState("");
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // all, current, completed
  const [sortBy, setSortBy] = useState("recent");

  const allTransactions = [
    ...transactions.current.map((t) => ({ ...t, _type: "current" })),
    ...transactions.completed.map((t) => ({ ...t, _type: "completed" })),
  ];

  const parseWhen = (value) => {
    if (!value) return null;
    const normalized = value.toLowerCase();

    if (normalized.includes("hôm nay")) {
      const now = new Date();
      const timePart = value.split(",")[1]?.trim();
      if (timePart) {
        const [hours, minutes] = timePart.split(":").map((v) => Number(v));
        now.setHours(hours || 0, minutes || 0, 0, 0);
      }
      return now;
    }

    if (normalized.includes("ngày mai")) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const timePart = value.split(",")[1]?.trim();
      if (timePart) {
        const [hours, minutes] = timePart.split(":").map((v) => Number(v));
        tomorrow.setHours(hours || 0, minutes || 0, 0, 0);
      }
      return tomorrow;
    }

    if (/\d{2}\/\d{2}\/\d{4}/.test(value)) {
      const [day, month, year] = value.split("/").map((v) => Number(v));
      return new Date(year, month - 1, day);
    }

    return null;
  };

  // Listen to custom event to open modal
  useEffect(() => {
    const handleOpenModal = (e) => {
      setSelectedTransaction(e.detail);
      setReportModalOpen(true);
    };
    window.addEventListener('open-report-modal', handleOpenModal);
    return () => window.removeEventListener('open-report-modal', handleOpenModal);
  }, []);

  const handleSubmitReport = () => {
    if (!reportReason.trim()) return alert("Vui lòng nhập lý do khiếu nại.");
    alert(`Đã gửi báo cáo khiếu nại cho giao dịch: ${selectedTransaction.book}\nLý do: ${reportReason}`);
    setReportModalOpen(false);
    setReportReason("");
    setSelectedTransaction(null);
  };

  // Apply filters
  let filtered = allTransactions;
  
  if (typeFilter !== "all") {
    filtered = filtered.filter(t => t._type === typeFilter);
  }
  
  if (statusFilter !== "all") {
    filtered = filtered.filter(t => t.status === statusFilter);
  }
  
  // Apply sorting
  if (sortBy === "recent") {
    filtered.sort((a, b) => {
      const dateA = parseWhen(a.when);
      const dateB = parseWhen(b.when);
      if (dateA && dateB) return dateB - dateA;
      if (dateA) return -1;
      if (dateB) return 1;
      return 0;
    });
  } else if (sortBy === "oldest") {
    filtered.sort((a, b) => {
      const dateA = parseWhen(a.when);
      const dateB = parseWhen(b.when);
      if (dateA && dateB) return dateA - dateB;
      if (dateA) return -1;
      if (dateB) return 1;
      return 0;
    });
  }

  const hasFilter = statusFilter !== "all" || typeFilter !== "all";

  const resetFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setSortBy("recent");
  };

  return (
    <div className="py-6 flex flex-col lg:flex-row gap-8 max-w-5xl mx-auto">
      {/* ── Sidebar Bộ lọc ── */}
      <aside className="w-full lg:w-64 flex-shrink-0">
        <div className="sticky top-24 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Bộ lọc</h2>
            {hasFilter && (
              <button
                onClick={resetFilters}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium hover:underline transition-colors"
              >
                Xoá tất cả
              </button>
            )}
          </div>

          {/* Trạng thái */}
          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">
              Trạng thái
            </h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                    statusFilter === "all"
                      ? "bg-teal-50 text-teal-700 border-teal-200"
                      : "text-slate-600 hover:bg-slate-50 border-transparent"
                  }`}
                >
                  Tất cả
                </button>
              </li>
              {Object.entries(statusConfig).map(([status, config]) => (
                <li key={status}>
                  <button
                    onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                      statusFilter === status
                        ? "bg-teal-50 text-teal-700 border-teal-200"
                        : "text-slate-600 hover:bg-slate-50 border-transparent"
                    }`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${config.color.split(" ")[0]}`} />
                    {config.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Loại giao dịch */}
          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">
              Loại
            </h3>
            <ul className="space-y-2">
              {[
                { id: "all", label: "Tất cả" },
                { id: "current", label: "Đang diễn ra" },
                { id: "completed", label: "Hoàn tất" },
              ].map((type) => (
                <li key={type.id}>
                  <button
                    onClick={() => setTypeFilter(typeFilter === type.id ? "all" : type.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                      typeFilter === type.id
                        ? "bg-teal-50 text-teal-700 border-teal-200"
                        : "text-slate-600 hover:bg-slate-50 border-transparent"
                    }`}
                  >
                    {type.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0">
        {/* Header */}
        <div>
          <p className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-1">Theo dõi đơn hàng</p>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Lịch sử giao dịch</h1>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-slate-200 rounded-lg bg-white px-3 py-2 font-medium text-slate-700 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200 text-sm cursor-pointer transition-colors hover:border-slate-300"
            >
              <option value="recent">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
            </select>
          </div>
        </div>

        {/* Thống kê nhanh */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center hover:border-slate-300 transition-colors">
            <p className="text-2xl font-extrabold text-slate-900">{transactions.current.length}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Đang diễn ra</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center hover:border-slate-300 transition-colors">
            <p className="text-2xl font-extrabold text-green-600">{transactions.completed.length}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Hoàn tất</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center hover:border-slate-300 transition-colors col-span-2 md:col-span-1">
            <p className="text-2xl font-extrabold text-teal-700">209K</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Tổng tháng này</p>
          </div>
        </div>

        {/* Transaction List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <p className="text-sm font-medium">Chưa có giao dịch nào khớp với bộ lọc</p>
            </div>
          ) : (
            filtered.map((item) => (
              <TransactionCard key={item.id} item={item} isCompleted={item._type === "completed"} />
            ))
          )}
        </div>

        {/* Modal Khiếu Nại */}
        {reportModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl relative">
              <button onClick={() => setReportModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Gửi Báo Cáo Khiếu Nại</h2>
              <p className="text-sm text-slate-500 mb-5">
                Bạn đang khiếu nại giao dịch sách <span className="font-semibold text-slate-800">{selectedTransaction?.book}</span> với <span className="font-semibold text-slate-800">{selectedTransaction?.partner}</span>
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Lý do khiếu nại / tranh chấp</label>
                <textarea 
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:border-orange-500 min-h-[100px]"
                  placeholder="Vui lòng mô tả chi tiết vấn đề (ví dụ: Sách bị rách, giao sai sách, không đúng như mô tả...)"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                ></textarea>
              </div>
              
              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setReportModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Hủy bỏ
                </button>
                <button onClick={handleSubmitReport} className="px-4 py-2 text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
                  Gửi Báo Cáo
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
