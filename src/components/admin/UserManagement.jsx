import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getUsers, updateUserStatus } from "../../services/admin";
import { useAuth } from "../../contexts/AuthContext";

function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel, confirmVariant }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${
              confirmVariant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-teal-600 hover:bg-teal-700"
            }`}
          >
            {confirmLabel || "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { showToast } = useAuth();
  const [users, setUsers] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const loadUsers = useCallback(async (background) => {
    if (!background) setLoading(true);
    setError(null);
    try {
      const filters = filterStatus !== "all" ? { status: filterStatus } : {};
      if (searchTerm) filters.search = searchTerm;

      const result = await getUsers(filters, page, 15);
      const mappedData = (result.data || []).map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        listings: user.listings_count,
        sales: user.sales_count,
        status: user.status,
        joinDate: user.join_date,
      }));

      setUsers(mappedData);
      const tp = result.totalPages || 1;
      setTotalPages(tp);
      if (page > tp) setPage(tp);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchTerm, page]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const patchUser = (id, updates) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const handleSuspend = async (id) => {
    setActionLoading(id);
    setError(null);
    try {
      await updateUserStatus(id, "suspended");
      patchUser(id, { status: "suspended" });
      showToast("Đã khóa người dùng thành công", "success");
    } catch (err) {
      console.error("Failed to suspend user:", err);
      showToast("Không thể khóa người dùng", "error");
    } finally {
      setActionLoading(null);
      setConfirmTarget(null);
    }
  };

  const handleActivate = async (id) => {
    setActionLoading(id);
    setError(null);
    try {
      await updateUserStatus(id, "active");
      patchUser(id, { status: "active" });
      showToast("Đã kích hoạt người dùng thành công", "success");
    } catch (err) {
      console.error("Failed to activate user:", err);
      showToast("Không thể kích hoạt người dùng", "error");
    } finally {
      setActionLoading(null);
      setConfirmTarget(null);
    }
  };

  const statusColor = (status) => {
    switch(status) {
      case "active": return "admin-badge-success";
      case "inactive": return "admin-badge-warning";
      case "suspended": return "admin-badge-danger";
      default: return "admin-badge-info";
    }
  };

  const statusText = (status) => {
    switch(status) {
      case "active": return "Hoạt động";
      case "inactive": return "Không hoạt động";
      case "suspended": return "Đã khóa";
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <h1>Quản Lý Người Dùng</h1>
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
          <h1>Quản Lý Người Dùng</h1>
        </div>
        <div style={{ textAlign: "center", padding: "40px", color: "#dc2626" }}>
          {error}
        </div>
      </div>
    );
  }
  return (
    <div className="admin-page">
      {/* Confirm Modal */}
      {confirmTarget && (
        <ConfirmModal
          title={confirmTarget.action === "suspend" ? "Xác nhận khóa người dùng" : "Xác nhận kích hoạt"}
          message={confirmTarget.action === "suspend"
            ? `Bạn có chắc muốn khóa người dùng "${confirmTarget.name}"? Người dùng sẽ không thể đăng nhập hoặc thực hiện giao dịch.`
            : `Bạn có chắc muốn kích hoạt lại người dùng "${confirmTarget.name}"?`}
          confirmLabel={confirmTarget.action === "suspend" ? "Khóa" : "Kích hoạt"}
          confirmVariant={confirmTarget.action === "suspend" ? "danger" : "success"}
          onConfirm={() => confirmTarget.action === "suspend" ? handleSuspend(confirmTarget.id) : handleActivate(confirmTarget.id)}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      <div className="admin-header">
        <h1>Quản Lý Người Dùng</h1>
        <div className="admin-actions">
          <button className="admin-btn admin-btn-primary">Thêm Người Dùng</button>
        </div>
      </div>

      {/* Thông báo lỗi (success dùng showToast toàn cục) */}
      {error && (
        <div style={{ background: "#fef2f2", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-filter-search-wrap">
          <svg className="admin-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            className="admin-filter-input with-search" 
            placeholder="Tìm theo tên hoặc email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>
        <select 
          className="admin-filter-select"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
        >
          <option value="all">Tất Cả Trạng Thái</option>
          <option value="active">Hoạt Động</option>
          <option value="inactive">Không Hoạt Động</option>
          <option value="suspended">Đã Khóa</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Email</th>
              <th>Listing</th>
              <th>Giao Dịch</th>
              <th>Trạng Thái</th>
              <th>Tham Gia</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "#56647e" }}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "#56647e" }}>
                  Không tìm thấy người dùng nào
                </td>
              </tr>
            ) : users.map(user => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong></td>
                <td>{user.email}</td>
                <td>{user.listings}</td>
                <td>{user.sales}</td>
                <td>
                  <span className={`admin-badge ${statusColor(user.status)}`}>
                    {statusText(user.status)}
                  </span>
                </td>
                <td>{user.joinDate}</td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>
                      Xem
                    </button>
                    {(user.status === "active") && (
                      <button 
                        className="admin-btn admin-btn-danger" 
                        style={{ padding: "6px 10px", fontSize: "12px" }}
                        disabled={actionLoading === user.id}
                        onClick={() => setConfirmTarget({ id: user.id, name: user.name, action: "suspend" })}
                      >
                        {actionLoading === user.id ? "..." : "Khóa"}
                      </button>
                    )}
                    {(user.status === "suspended" || user.status === "inactive") && (
                      <button 
                        className="admin-btn admin-btn-success" 
                        style={{ padding: "6px 10px", fontSize: "12px" }}
                        disabled={actionLoading === user.id}
                        onClick={() => setConfirmTarget({ id: user.id, name: user.name, action: "activate" })}
                      >
                        {actionLoading === user.id ? "..." : "Kích Hoạt"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && (
        <>
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
            Hiển thị {users.length} người dùng
          </div>
        </>
      )}
    </div>
  );
}
