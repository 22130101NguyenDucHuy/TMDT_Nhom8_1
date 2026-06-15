import { useEffect, useState, useCallback } from "react";
import { getReports, updateReportStatus, reopenReport } from "../../services/admin";

function ReportDetailModal({ report, onClose, onMarkReviewed, onReopen, actionLoading }) {
  const [localLoading, setLocalLoading] = useState(false);
  const isLoading = actionLoading || localLoading;

  const handleMarkReviewed = async () => {
    setLocalLoading(true);
    await onMarkReviewed(report.id);
    setLocalLoading(false);
    onClose();
  };

  const handleReopen = async () => {
    setLocalLoading(true);
    await onReopen(report.id);
    setLocalLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: "#0f766e" }}>Chi tiết báo cáo</h2>
          <button onClick={onClose} style={{ color: "#63748a" }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <span className="font-semibold" style={{ color: "#63748a" }}>Người báo cáo</span>
            <span className="col-span-2" style={{ color: "#111827" }}>{report.reporter_name}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="font-semibold" style={{ color: "#63748a" }}>Loại</span>
            <span className="col-span-2">
              <span className="admin-badge admin-badge-info">{report.report_type}</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="font-semibold" style={{ color: "#63748a" }}>Mục tiêu</span>
            <span className="col-span-2">
              <span className="text-sm font-medium" style={{ color: "#0f766e" }}>
                {report.listing_title || `#${report.target_id}`}
              </span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="font-semibold" style={{ color: "#63748a" }}>Trạng thái</span>
            <span className="col-span-2">
              <span className={`admin-badge ${report.status === "pending" || report.status === "open" ? "admin-badge-warning" : "admin-badge-success"}`}>
                {report.status === "pending" || report.status === "open" ? "Chờ Xử Lý" : "Đã Xem Xét"}
              </span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="font-semibold" style={{ color: "#63748a" }}>Ngày</span>
            <span className="col-span-2" style={{ color: "#374151" }}>{report.report_date}</span>
          </div>
          <div className="pt-4" style={{ borderTop: "1px solid #e5e7eb" }}>
            <span className="font-semibold block mb-2" style={{ color: "#63748a" }}>Mô tả</span>
            <p className="leading-relaxed rounded-lg p-3" style={{ background: "#f9fafb", color: "#374151" }}>
              {report.description || "Không có mô tả"}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: "1px solid #e5e7eb" }}>
          <button onClick={onClose} className="admin-btn admin-btn-secondary" style={{ flex: 1 }}>
            Đóng
          </button>
          {report.status === "pending" || report.status === "open" ? (
            <button onClick={handleMarkReviewed} disabled={isLoading}
              className="admin-btn admin-btn-primary" style={{ flex: 1 }}>
              {isLoading ? "Đang xử lý..." : "Đã xử lý"}
            </button>
          ) : (
            <button onClick={handleReopen} disabled={isLoading}
              className="admin-btn admin-btn-primary" style={{ flex: 1, background: "#f59e0b", borderColor: "#f59e0b" }}>
              {isLoading ? "Đang mở..." : "Mở lại"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportManagement() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [detailReport, setDetailReport] = useState(null);

  const loadReports = useCallback(async (background) => {
    if (!background) setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (filterStatus !== "all") filters.status = filterStatus;
      if (filterType !== "all") filters.type = filterType;
      const result = await getReports(filters, page, 15);
      setReports(result.data || []);
      const tp = result.totalPages || 1;
      setTotalPages(tp);
      if (page > tp) setPage(tp);
    } catch (err) {
      console.error("Failed to load reports:", err);
      setError("Không thể tải danh sách báo cáo");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, page]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleMarkReviewed = async (id) => {
    setActionLoading(id);
    try {
      await updateReportStatus(id, "reviewed");
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: "reviewed" } : r));
    } catch (err) {
      console.error("Failed to update report:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopen = async (id) => {
    setActionLoading(id);
    try {
      await reopenReport(id);
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: "open" } : r));
    } catch (err) {
      console.error("Failed to reopen report:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const isUnhandled = (s) => s === "pending" || s === "open";

  const pendingCount = reports.filter(r => isUnhandled(r.status)).length;

  return (
    <div className="admin-page">
      {detailReport && (
        <ReportDetailModal
          report={detailReport}
          onClose={() => setDetailReport(null)}
          onMarkReviewed={handleMarkReviewed}
          onReopen={handleReopen}
          actionLoading={actionLoading === detailReport.id}
        />
      )}

      <div className="admin-header">
        <h1>Quản Lý Báo Cáo</h1>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <p className="admin-stat-label">Tổng Báo Cáo</p>
          <p className="admin-stat-value">{reports.length}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Chờ Xử Lý</p>
          <p className="admin-stat-value" style={{ color: "#f57c00" }}>{pendingCount}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Đã Xử Lý</p>
          <p className="admin-stat-value" style={{ color: "#16a34a" }}>{reports.length - pendingCount}</p>
        </div>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      <div className="admin-filter-bar">
        <select className="admin-filter-select"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
        >
          <option value="all">Tất Cả Trạng Thái</option>
          <option value="open">Chờ Xử Lý</option>
          <option value="pending">Đang Chờ</option>
          <option value="reviewed">Đã Xem Xét</option>
          <option value="resolved">Đã Giải Quyết</option>
          <option value="dismissed">Đã Bỏ Qua</option>
        </select>
        <select className="admin-filter-select"
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
        >
          <option value="all">Tất Cả Loại</option>
          <option value="Spam">Spam</option>
          <option value="Sách giả/Sai mô tả">Sách giả/Sai mô tả</option>
          <option value="Người bán lừa đảo">Người bán lừa đảo</option>
          <option value="Nội dung không phù hợp">Nội dung không phù hợp</option>
          <option value="Khác">Khác</option>
        </select>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Loại</th>
              <th>Người Báo Cáo</th>
              <th>Bài Đăng</th>
              <th>Trạng Thái</th>
              <th>Ngày</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#56647e" }}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#56647e" }}>
                  Không có báo cáo nào
                </td>
              </tr>
            ) : reports.map(report => (
              <tr key={report.id}>
                <td>
                  <span className="admin-badge admin-badge-info">{report.report_type}</span>
                </td>
                <td>{report.reporter_name}</td>
                <td>
                  <span className="text-sm font-medium" style={{ color: "#0f766e" }}>
                    {report.listing_title || `#${report.target_id}`}
                  </span>
                </td>
                <td>
                  <span className={`admin-badge ${isUnhandled(report.status) ? "admin-badge-warning" : "admin-badge-success"}`}>
                    {isUnhandled(report.status) ? "Chờ Xử Lý" : "Đã Xem Xét"}
                  </span>
                </td>
                <td className="text-sm" style={{ color: "#63748a" }}>{report.report_date}</td>
                <td>
                  <div className="admin-actions">
                    <button onClick={() => setDetailReport(report)}
                      className="admin-btn admin-btn-secondary">
                      Xem
                    </button>
                    {isUnhandled(report.status) ? (
                      <button onClick={() => handleMarkReviewed(report.id)}
                        disabled={actionLoading === report.id}
                        className="admin-btn admin-btn-primary">
                        {actionLoading === report.id ? "..." : "Xử Lý"}
                      </button>
                    ) : (
                      <button onClick={() => handleReopen(report.id)}
                        disabled={actionLoading === report.id}
                        className="admin-btn admin-btn-primary"
                        style={{ background: "#f59e0b", borderColor: "#f59e0b" }}>
                        {actionLoading === report.id ? "..." : "Mở Lại"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && totalPages > 1 && (
        <div className="admin-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Trước</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={p === page ? "active" : ""} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sau →</button>
        </div>
      )}
    </div>
  );
}
