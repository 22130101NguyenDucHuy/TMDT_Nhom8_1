export default function AdminSettings() {
  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Cài Đặt Hệ Thống</h1>
      </div>

      <div style={{ maxWidth: "800px" }}>
        {/* General Settings */}
        <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 700 }}>Cài Đặt Chung</h2>
          
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Tên Ứng Dụng</label>
            <input type="text" defaultValue="LoopBook" className="admin-filter-input" style={{ width: "100%" }} />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Email Admin</label>
            <input type="email" defaultValue="admin@loopbook.com" className="admin-filter-input" style={{ width: "100%" }} />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Phí Giao Dịch (%)</label>
            <input type="number" defaultValue="5" className="admin-filter-input" style={{ width: "100%" }} />
          </div>
        </div>

        {/* Premium Settings */}
        <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 700 }}>Cấu Hình Premium</h2>
          
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Giá "Nhân Bản Gấp" (VNĐ)</label>
            <input type="number" defaultValue="10000" className="admin-filter-input" style={{ width: "100%" }} />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Giá "Combo 14 Ngày" (VNĐ)</label>
            <input type="number" defaultValue="39000" className="admin-filter-input" style={{ width: "100%" }} />
          </div>
        </div>

        {/* Save Button */}
        <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
          <button className="admin-btn admin-btn-primary">Lưu Cài Đặt</button>
          <button className="admin-btn admin-btn-secondary">Hủy</button>
        </div>
      </div>
    </div>
  );
}
