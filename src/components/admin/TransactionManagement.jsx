import { useEffect, useState } from "react";
import { getTransactions, updateTransactionStatus } from "../../services/admin";

export default function TransactionManagement() {
  const [txList, setTxList] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load transactions from Supabase
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const filters = {};
        if (filterStatus === "Hoàn Tất") {
          filters.status = "Hoàn Tất";
        } else if (filterStatus === "Đang Chờ Gặp Trực Tiếp") {
          filters.status = "Đang Chờ Gặp Trực Tiếp";
        }
        if (searchTerm) {
          filters.search = searchTerm;
        }
        
        const result = await getTransactions(filters);
        setTxList(result.data || []);
      } catch (err) {
        console.error("Failed to load transactions:", err);
        setError("Không thể tải danh sách giao dịch");
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [filterStatus, searchTerm]);

  const statusColor = (status) => {
    if (status.includes("Hoàn Tất")) return "admin-badge-success";
    if (status.includes("Chờ")) return "admin-badge-warning";
    if (status.includes("Xác Nhận")) return "admin-badge-success";
    return "admin-badge-info";
  };

  const totalAmount = txList.reduce((sum, tx) => {
    const amount = parseInt(String(tx.amount).replace(/[^\d]/g, '')) || 0;
    return sum + amount;
  }, 0);

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <h1>Quản Lý Giao Dịch</h1>
        </div>
        <div style={{ textAlign: "center", padding: "40px", color: "#56647e" }}>
          Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <h1>Quản Lý Giao Dịch</h1>
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
        <h1>Quản Lý Giao Dịch</h1>
        <div className="admin-actions">
          <button className="admin-btn admin-btn-secondary">Export</button>
          <button className="admin-btn admin-btn-secondary">Thống Kê</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="admin-stats-grid" style={{ marginBottom: "24px" }}>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Tổng Giao Dịch</p>
          <p className="admin-stat-value">{txList.length}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Tổng Giá Trị</p>
          <p className="admin-stat-value">{(totalAmount / 1000000).toFixed(1)}M</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Hoàn Tất</p>
          <p className="admin-stat-value" style={{ color: "#0f8c4b" }}>
            {txList.filter(t => t.status.includes("Hoàn")).length}
          </p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Đang Chờ Gặp</p>
          <p className="admin-stat-value" style={{ color: "#f57c00" }}>
            {txList.filter(t => t.status.includes("Chờ")).length}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-filter-search-wrap">
          <svg className="admin-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            className="admin-filter-input with-search" 
            placeholder="Tìm theo tên sách, người mua..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="admin-filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Tất Cả Trạng Thái</option>
          <option value="Hoàn Tất">Hoàn Tất</option>
          <option value="Đang Chờ Gặp Trực Tiếp">Đang Chờ Gặp Trực Tiếp</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Sách</th>
              <th>Người Mua</th>
              <th>Đối Tác</th>
              <th>Giá</th>
              <th>Trạng Thái</th>
              <th>Ngày</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {txList.map((tx, idx) => (
              <tr key={idx}>
                <td><strong>{tx.book}</strong></td>
                <td>{tx.partner}</td>
                <td>{tx.partner}</td>
                <td style={{ fontWeight: 600 }}>{tx.amount}</td>
                <td>
                  <span className={`admin-badge ${statusColor(tx.status)}`}>
                    {tx.status}
                  </span>
                </td>
                <td>{tx.when_time}</td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>
                      Chi Tiết
                    </button>
                    {tx.status.includes("Chờ") && (
                      <button className="admin-btn admin-btn-primary" style={{ padding: "6px 10px", fontSize: "12px" }}>
                        Xác Nhận
                      </button>
                    )}
                    <button className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>
                      Liên Hệ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "16px", color: "#56647e", fontSize: "14px" }}>
        Hiển thị {txList.length} giao dịch
      </div>
    </div>
  );
}
