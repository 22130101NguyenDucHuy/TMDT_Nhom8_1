export default function PremiumManagement() {
  const premiumUsers = [
    { id: 1, name: "Hoàng Yến", plan: "Nhân Bản Gấp", price: "10.000đ", expiryDate: "2024-04-15", status: "active" },
    { id: 2, name: "Nguyễn Minh Anh", plan: "Combo 14 Ngày", price: "39.000đ", expiryDate: "2024-04-20", status: "active" },
    { id: 3, name: "Phạm Hải", plan: "Nhân Bản Gấp", price: "10.000đ", expiryDate: "2024-04-10", status: "expiring" },
    { id: 4, name: "Trần Hoàng", plan: "Đầu Tin Trăng Đầu", price: "25.000đ", expiryDate: "2024-04-05", status: "expired" },
  ];

  const statusColor = (status) => {
    switch(status) {
      case "active": return "admin-badge-success";
      case "expiring": return "admin-badge-warning";
      case "expired": return "admin-badge-danger";
      default: return "admin-badge-info";
    }
  };

  const statusText = (status) => {
    switch(status) {
      case "active": return "Hoạt Động";
      case "expiring": return "Sắp Hết Hạn";
      case "expired": return "Đã Hết Hạn";
      default: return status;
    }
  };

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
          <p className="admin-stat-value">12</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Doanh Thu</p>
          <p className="admin-stat-value">2.1M</p>
          <p className="admin-stat-desc">Từ Premium</p>
        </div>
      </div>

      {/* Premium Users Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Người Dùng</th>
              <th>Gói</th>
              <th>Giá</th>
              <th>Ngày Hết Hạn</th>
              <th>Trạng Thái</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {premiumUsers.map(user => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong></td>
                <td>{user.plan}</td>
                <td style={{ fontWeight: 600 }}>{user.price}</td>
                <td>{user.expiryDate}</td>
                <td>
                  <span className={`admin-badge ${statusColor(user.status)}`}>
                    {statusText(user.status)}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>
                      Chi Tiết
                    </button>
                    <button className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>
                      Gia Hạn
                    </button>
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
