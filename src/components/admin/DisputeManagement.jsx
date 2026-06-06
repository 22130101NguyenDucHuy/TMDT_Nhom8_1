import { useEffect, useState } from "react";
import { getDisputes, updateDisputeStatus } from "../../services/admin";

export default function DisputeManagement() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load disputes from Supabase
  useEffect(() => {
    const loadDisputes = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getDisputes();
        setDisputes(result.data || []);
      } catch (err) {
        console.error("Failed to load disputes:", err);
        setError("Không thể tải danh sách tranh chấp");
      } finally {
        setLoading(false);
      }
    };

    loadDisputes();
  }, []);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateDisputeStatus(id, newStatus);
      // Refresh disputes
      const result = await getDisputes();
      setDisputes(result.data || []);
    } catch (err) {
      console.error("Failed to update dispute:", err);
      setError("Không thể cập nhật tranh chấp");
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
                <td style={{ fontWeight: 600, color: "#d94c24" }}>{dispute.amount}</td>
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
                        onClick={() => handleStatusUpdate(dispute.id, "resolved")}
                      >
                        Giải Quyết
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
