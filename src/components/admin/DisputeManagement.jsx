import { useEffect, useState } from "react";
import { getDisputes, updateDisputeStatus } from "../../services/admin";

export default function DisputeManagement() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);

  const loadDisputes = async (background) => {
    if (!background) setLoading(true);
    setError(null);
    try {
      const result = await getDisputes({}, page, 15);
      setDisputes(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error("Failed to load disputes:", err);
      setError("Không thể tải danh sách tranh chấp");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDisputes(); }, []);
  useEffect(() => { loadDisputes(); }, [page]);

  const patchDispute = (id, updates) => {
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const handleStatusUpdate = async (id, newStatus) => {
    setActionLoading(id);
    try {
      await updateDisputeStatus(id, newStatus);
      patchDispute(id, { status: newStatus });
    } catch (err) {
      console.error("Failed to update dispute:", err);
      setError("Không thể cập nhật tranh chấp");
    } finally {
      setActionLoading(null);
    }
  };

  const statusColor = (status) => {
    switch(status) {
      case "resolved": return "admin-badge-success";
      case "pending": return "admin-badge-warning";
      case "open": return "admin-badge-danger";
      default: return "admin-badge-info";
    }
  };

  const statusText = (status) => {
    switch(status) {
      case "resolved": return "Đã Giải Quyết";
      case "pending": return "Chờ Xử Lý";
      case "open": return "Mở";
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <h1>Quản Lý Tranh Chấp</h1>
        </div>
        <div style={{ textAlign: "center", padding: "40px", color: "#56647e" }}>
          Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  if (error && disputes.length === 0) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <h1>Quản Lý Tranh Chấp</h1>
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
        <h1>Quản Lý Tranh Chấp</h1>
      </div>

      <div className="admin-stats-grid" style={{ marginBottom: "24px" }}>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Tổng Tranh Chấp</p>
          <p className="admin-stat-value">{disputes.length}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Chưa Xử Lý</p>
          <p className="admin-stat-value" style={{ color: "#d94c24" }}>
            {disputes.filter(d => d.status !== "resolved").length}
          </p>
        </div>
      </div>

      {/* Disputes Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tiêu Đề</th>
              <th>Người Mua</th>
              <th>Người Bán</th>
              <th>Số Tiền</th>
              <th>Trạng Thái</th>
              <th>Ngày</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {disputes.map(dispute => (
              <tr key={dispute.id}>
                <td><strong>{dispute.title}</strong></td>
                <td>{dispute.buyer_name}</td>
                <td>{dispute.seller_name}</td>
                <td style={{ fontWeight: 600, color: "#d94c24" }}>
                  {((dispute.amount_involved ?? dispute.amount) || 0).toLocaleString("vi-VN")}đ
                </td>
                <td>
                  <span className={`admin-badge ${statusColor(dispute.status)}`}>
                    {statusText(dispute.status)}
                  </span>
                </td>
                <td>{dispute.dispute_date}</td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>
                      Xem
                    </button>
                    {dispute.status !== "resolved" && (
                      <button 
                        className="admin-btn admin-btn-primary" 
                        style={{ padding: "6px 10px", fontSize: "12px" }}
                        disabled={actionLoading === dispute.id}
                        onClick={() => handleStatusUpdate(dispute.id, "resolved")}
                      >
                        {actionLoading === dispute.id ? "..." : "Giải Quyết"}
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
