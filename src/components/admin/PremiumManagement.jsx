import { useEffect, useState } from "react";
import { getPromotions } from "../../services/admin";

export default function PremiumManagement() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const result = await getPromotions({}, 1, 50);
      setPromotions(result.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const statusColor = (status) => {
    if (status === "active") return "admin-badge-success";
    return "admin-badge-danger";
  };

  const statusText = (status) => status === "active" ? "Hoạt Động" : "Hết Hạn";

  const activeCount = promotions.filter(p => p.is_active).length;

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-header"><h1>Quản Lý Premium</h1></div>
        <div style={{ textAlign: "center", padding: "40px", color: "#56647e" }}>Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Quản Lý Premium</h1>
        <div className="admin-actions">
          <button className="admin-btn admin-btn-primary">Tạo Gói Mới</button>
        </div>
      </div>

      <div className="admin-stats-grid" style={{ marginBottom: "24px" }}>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Premium Active</p>
          <p className="admin-stat-value">{activeCount}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Tổng Giao Dịch</p>
          <p className="admin-stat-value">{promotions.length}</p>
        </div>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Người Dùng</th>
              <th>Sách</th>
              <th>Gói</th>
              <th>Giá</th>
              <th>Ngày Hết Hạn</th>
              <th>Trạng Thái</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.user_name || "—"}</strong></td>
                <td>{p.book_title || "—"}</td>
                <td>{p.plan_type || "—"}</td>
                <td style={{ fontWeight: 600 }}>{(p.amount_paid || 0).toLocaleString()}đ</td>
                <td>{p.expires_at ? new Date(p.expires_at).toLocaleDateString("vi-VN") : "—"}</td>
                <td>
                  <span className={`admin-badge ${statusColor(p.is_active ? "active" : "expired")}`}>
                    {statusText(p.is_active ? "active" : "expired")}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>Chi Tiết</button>
                    {p.is_active && <button className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>Gia Hạn</button>}
                  </div>
                </td>
              </tr>
            ))}
            {promotions.length === 0 && (
              <tr><td colSpan="7" style={{ textAlign: "center", padding: "32px" }}>Chưa có giao dịch premium</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
