import { useEffect, useState } from "react";
import { getReports, updateReportStatus } from "../../services/admin";

export default function ReportManagement() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load reports from Supabase
  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getReports();
        setReports(result.data || []);
      } catch (err) {
        console.error("Failed to load reports:", err);
        setError("Không thể tải danh sách báo cáo");
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateReportStatus(id, newStatus);
      // Refresh reports
      const result = await getReports();
      setReports(result.data || []);
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
            {reports.filter(r => r.status === "pending").length}
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
                <td>{report.target}</td>
                <td>
                  <span className={`admin-badge ${report.status === "pending" ? "admin-badge-warning" : "admin-badge-success"}`}>
                    {report.status === "pending" ? "Chờ Xử Lý" : "Đã Xem Xét"}
                  </span>
                </td>
                <td>{report.report_date}</td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>
                      Xem
                    </button>
                    {report.status === "pending" && (
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
    </div>
  );
}
