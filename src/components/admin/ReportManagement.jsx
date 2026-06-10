import { useEffect, useState } from "react";
import { getReports, updateReportStatus } from "../../services/admin";

export default function ReportManagement() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load reports from Supabase
  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getReports({}, page, 15);
      setReports(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error("Failed to load reports:", err);
      setError("Không thể tải danh sách báo cáo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReports(); }, []);
  useEffect(() => { loadReports(); }, [page]);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateReportStatus(id, newStatus);
      loadReports();
    } catch (err) {
      console.error("Failed to update report:", err);
      setError("Không thể cập nhật báo cáo");
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <h1>Quản Lý Báo Cáo</h1>
        </div>
        <div style={{ textAlign: "center", padding: "40px", color: "#56647e" }}>
          Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  if (error && reports.length === 0) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <h1>Quản Lý Báo Cáo</h1>
        </div>
        <div style={{ textAlign: "center", padding: "40px", color: "#dc2626" }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Quản Lý Báo Cáo</h1>
      </div>

      <div className="admin-stats-grid" style={{ marginBottom: "24px" }}>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Tổng Báo Cáo</p>
          <p className="admin-stat-value">{reports.length}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Chờ Xử Lý</p>
          <p className="admin-stat-value" style={{ color: "#f57c00" }}>
            {reports.filter(r => r.status === "pending" || r.status === "open").length}
          </p>
        </div>
      </div>

      {/* Reports Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Loại</th>
              <th>Người Báo Cáo</th>
              <th>Mục Tiêu</th>
              <th>Trạng Thái</th>
              <th>Ngày</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(report => (
              <tr key={report.id}>
                <td><strong>{report.report_type}</strong></td>
                <td>{report.reporter_name}</td>
                <td>{report.target_type && report.target_id ? `${report.target_type === 'user' ? 'Người dùng' : 'Tin đăng'}: ${report.target_id}` : (report.target || '—')}</td>
                <td>
                  <span className={`admin-badge ${(report.status === "pending" || report.status === "open") ? "admin-badge-warning" : "admin-badge-success"}`}>
                    {(report.status === "pending" || report.status === "open") ? "Chờ Xử Lý" : "Đã Xem Xét"}
                  </span>
                </td>
                <td>{report.report_date}</td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>
                      Xem
                    </button>
                    {(report.status === "pending" || report.status === "open") && (
                      <button 
                        className="admin-btn admin-btn-primary" 
                        style={{ padding: "6px 10px", fontSize: "12px" }}
                        onClick={() => handleStatusUpdate(report.id, "reviewed")}
                      >
                        Xử Lý
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
          style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #d0d5dd", fontSize: "13px", fontWeight: 600 }}>
          ← Trước
        </button>
        <span style={{ fontSize: "13px", color: "#56647e" }}>Trang {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
          style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #d0d5dd", fontSize: "13px", fontWeight: 600 }}>
          Sau →
        </button>
      </div>
    </div>
  );
}
