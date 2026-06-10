import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUsers, updateUserStatus, getUserById } from "../../services/admin";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Load users from Supabase
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Map Supabase columns to component column names
      const filters = filterStatus !== "all" ? { status: filterStatus } : {};
      if (searchTerm) {
        filters.search = searchTerm;
      }
      
      const result = await getUsers(filters, page, 15);
      const mappedData = (result.data || []).map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        listings: user.listings_count,
        sales: user.sales_count,
        status: user.status,
        joinDate: user.join_date || (user.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "—"),
        verificationStatus: user.verification_status,
      }));
      
      setUsers(mappedData);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [filterStatus, searchTerm]);
  useEffect(() => { loadUsers(); }, [page]);

  const handleSuspend = async (id) => {
    try {
      await updateUserStatus(id, "suspended");
      loadUsers();
    } catch (err) {
      console.error("Failed to suspend user:", err);
      setError("Không thể khóa người dùng");
    }
  };

  const handleActivate = async (id) => {
    try {
      await updateUserStatus(id, "active");
      loadUsers();
    } catch (err) {
      console.error("Failed to activate user:", err);
      setError("Không thể kích hoạt người dùng");
    }
  };

  const handleViewUser = async (id) => {
    try {
      setViewLoading(true);
      const data = await getUserById(id);
      setSelectedUser(data);
    } catch (err) {
      console.error("Failed to fetch user details:", err);
      alert("Không thể lấy chi tiết người dùng");
    } finally {
      setViewLoading(false);
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

  const verificationColor = (status) => {
    switch(status) {
      case "approved": return "admin-badge-success";
      case "pending": return "admin-badge-warning";
      case "rejected": return "admin-badge-danger";
      default: return "admin-badge-info";
    }
  };

  const verificationText = (status) => {
    switch(status) {
      case "approved": return "Đã duyệt";
      case "pending": return "Chờ duyệt";
      case "rejected": return "Bị từ chối";
      default: return "Chưa gửi";
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
      <div className="admin-header">
        <h1>Quản Lý Người Dùng</h1>
        <div className="admin-actions">
          <button className="admin-btn admin-btn-primary">Thêm Người Dùng</button>
        </div>
      </div>

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
              <th>Xác thực SV</th>
              <th>Tham Gia</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
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
                <td>
                  <Link to="/admin/verifications" className={`admin-badge ${verificationColor(user.verificationStatus)}`} style={{ textDecoration: "none" }}>
                    {verificationText(user.verificationStatus)}
                  </Link>
                </td>
                <td>{user.joinDate}</td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button 
                      className="admin-btn admin-btn-secondary" 
                      style={{ padding: "6px 10px", fontSize: "12px" }}
                      onClick={() => handleViewUser(user.id)}
                      disabled={viewLoading}
                    >
                      {viewLoading && selectedUser?.id === user.id ? "..." : "Xem"}
                    </button>
                    {(user.status === "active") && (
                      <button 
                        className="admin-btn admin-btn-danger" 
                        style={{ padding: "6px 10px", fontSize: "12px" }}
                        onClick={() => handleSuspend(user.id)}
                      >
                        Khóa
                      </button>
                    )}
                    {(user.status === "suspended" || user.status === "inactive") && (
                      <button 
                        className="admin-btn admin-btn-success" 
                        style={{ padding: "6px 10px", fontSize: "12px" }}
                        onClick={() => handleActivate(user.id)}
                      >
                        Kích Hoạt
                      </button>
                    )}
                    {user.verificationStatus === "pending" && (
                      <Link 
                        to="/admin/verifications" 
                        className="admin-btn admin-btn-primary" 
                        style={{ padding: "6px 10px", fontSize: "12px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                      >
                        Duyệt thẻ SV
                      </Link>
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

      <div style={{ marginTop: "16px", color: "#56647e", fontSize: "14px" }}>
        Hiển thị {users.length} người dùng
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">Chi Tiết Người Dùng</h3>
              <button 
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-2xl shadow-inner">
                  {selectedUser.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{selectedUser.name}</h4>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Trạng Thái</span>
                  <span className={`inline-block mt-1 admin-badge ${statusColor(selectedUser.status)}`}>
                    {statusText(selectedUser.status)}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Vai Trò</span>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 capitalize">
                    {selectedUser.role}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Số Điện Thoại</span>
                  <p className="mt-1 font-medium text-slate-800">{selectedUser.phone || "—"}</p>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Trường Học</span>
                  <p className="mt-1 font-medium text-slate-800">{selectedUser.school || "—"}</p>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Số Dư Ví</span>
                  <p className="mt-1 font-semibold text-teal-700">{(selectedUser.wallet_balance || 0).toLocaleString("vi-VN")}đ</p>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Tổng Thu Nhập</span>
                  <p className="mt-1 font-semibold text-teal-700">{(selectedUser.total_income || 0).toLocaleString("vi-VN")}đ</p>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Số Tin Đăng</span>
                  <p className="mt-1 font-medium text-slate-800">{selectedUser.listings_count || 0}</p>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Giao Dịch Thành Công</span>
                  <p className="mt-1 font-medium text-slate-800">{selectedUser.sales_count || 0}</p>
                </div>
                <div className="col-span-2">
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Địa Chỉ</span>
                  <p className="mt-1 font-medium text-slate-800">{selectedUser.address || "—"}</p>
                </div>
                <div className="col-span-2">
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Tiểu Sử</span>
                  <p className="mt-1 font-medium text-slate-800 italic">{selectedUser.bio || "Chưa cập nhật tiểu sử."}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button 
                className="admin-btn admin-btn-secondary"
                onClick={() => setSelectedUser(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
