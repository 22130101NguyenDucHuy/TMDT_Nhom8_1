import { useEffect, useState } from "react";
import { getTransactions, updateTransactionStatus } from "../../services/admin";

const STATUS_OPTIONS = [
  { value: "all", label: "Tất Cả Trạng Thái" },
  { value: "pending", label: "Chờ Xử Lý" },
  { value: "confirmed", label: "Đã Xác Nhận" },
  { value: "awaiting_meet", label: "Chờ Gặp Mặt" },
  { value: "completed", label: "Hoàn Tất" },
  { value: "cancelled", label: "Đã Hủy" },
  { value: "refunded", label: "Đã Hoàn Tiền" },
];

const STATUS_MAP = {
  pending: "Chờ Xử Lý", confirmed: "Đã Xác Nhận",
  awaiting_meet: "Chờ Gặp Mặt", completed: "Hoàn Tất",
  cancelled: "Đã Hủy", refunded: "Đã Hoàn Tiền",
};

export default function TransactionManagement() {
  const [txList, setTxList] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);

  const loadTransactions = async (background) => {
    if (!background) setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (filterStatus !== "all") filters.status = filterStatus;
      if (searchTerm) filters.search = searchTerm;
      const result = await getTransactions(filters, page, 15);
      setTxList(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error("Failed to load transactions:", err);
      setError("Không thể tải danh sách giao dịch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [filterStatus, searchTerm]);
  useEffect(() => { loadTransactions(); }, [page]);

  const patchTx = (id, updates) => {
    setTxList(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const statusColor = (status) => {
    const colors = {
      completed: "admin-badge-success", confirmed: "admin-badge-success",
      pending: "admin-badge-warning", awaiting_meet: "admin-badge-warning",
      cancelled: "admin-badge-danger", refunded: "admin-badge-info",
    };
    return colors[status] || "admin-badge-info";
  };

  const totalAmount = txList.reduce((sum, tx) => {
    // amount có thể là text dạng "125.000đ" hoặc number
    const raw = tx.amount;
    if (!raw) return sum;
    if (typeof raw === 'number') return sum + raw;
    const cleaned = String(raw).replace(/[^\d.,]/g, '');
    if (!cleaned) return sum;
    if (cleaned.includes('.') && !cleaned.includes(',')) {
      const parts = cleaned.split('.');
      if (parts[parts.length - 1].length === 3) return sum + parseInt(cleaned.replace(/\./g, ''), 10);
      return sum + parseFloat(cleaned);
    }
    if (cleaned.includes(',')) return sum + parseInt(cleaned.replace(/,/g, ''), 10);
    return sum + parseInt(cleaned, 10);
  }, 0);

  const handleConfirm = async (id) => {
    try {
      await updateTransactionStatus(id, "completed", true);
      // Reload lại từ DB để đảm bảo dữ liệu đồng bộ
      await loadTransactions();
    } catch (err) {
      console.error("Xác nhận giao dịch thất bại:", err);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-header"><h1>Quản Lý Giao Dịch</h1></div>
        <div style={{ textAlign: "center", padding: "40px", color: "#56647e" }}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <div className="admin-header"><h1>Quản Lý Giao Dịch</h1></div>
        <div style={{ textAlign: "center", padding: "40px", color: "#dc2626" }}>{error}</div>
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
            {txList.filter(t => t.status === "completed").length}
          </p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Chờ Xử Lý</p>
          <p className="admin-stat-value" style={{ color: "#f57c00" }}>
            {txList.filter(t => t.status === "pending" || t.status === "awaiting_meet").length}
          </p>
        </div>
      </div>

      <div className="admin-filter-bar">
        <div className="admin-filter-search-wrap">
          <svg className="admin-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" className="admin-filter-input with-search" placeholder="Tìm theo tên sách, người mua..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="admin-filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Sách</th>
              <th>Người Mua</th>
              <th>Người Bán</th>
              <th>Giá</th>
              <th>Trạng Thái</th>
              <th>Ngày</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {txList.map((tx) => (
              <tr key={tx.id}>
                <td><strong>{tx.book || "—"}</strong></td>
                <td>{tx.buyer_name || "—"}</td>
                <td>{tx.seller_name || "—"}</td>
                <td style={{ fontWeight: 600 }}>{tx.amount ? `${(Number(tx.amount) / 1000).toFixed(0)}K` : "—"}</td>
                <td>
                  <span className={`admin-badge ${statusColor(tx.status)}`}>
                    {STATUS_MAP[tx.status] || tx.status}
                  </span>
                </td>
                <td>{tx.created_at ? new Date(tx.created_at).toLocaleDateString("vi-VN") : "—"}</td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>Chi Tiết</button>
                    {(tx.status === "pending" || tx.status === "awaiting_meet") && (
                      <button onClick={() => handleConfirm(tx.id)} className="admin-btn admin-btn-primary" style={{ padding: "6px 10px", fontSize: "12px" }} disabled={actionLoading === tx.id}>
                        {actionLoading === tx.id ? "..." : "Xác Nhận"}
                      </button>
                    )}
                    <button className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>Liên Hệ</button>
                  </div>
                </td>
              </tr>
            ))}
            {txList.length === 0 && (
              <tr><td colSpan="7" style={{ textAlign: "center", padding: "32px", color: "#56647e" }}>Chưa có giao dịch nào</td></tr>
            )}
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

      <div style={{ marginTop: "16px", color: "#56647e", fontSize: "14px" }}>
        Hiển thị {txList.length} giao dịch
      </div>
    </div>
  );
}
