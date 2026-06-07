import { useEffect, useState } from "react";
import { getListings, updateListingStatus } from "../../services/admin";

// ── Modal từ chối ─────────────────────────────────────────────────────────────
function RejectModal({ listing, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    await onConfirm(listing.id, reason.trim());
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Từ chối bài đăng</h2>
        <p className="text-sm text-slate-500 mb-4">
          Bài: <span className="font-semibold text-slate-700">{listing.title}</span>
        </p>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Lý do từ chối <span className="text-red-500">*</span>
        </label>
        <textarea
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-teal-500 h-28"
          placeholder="VD: Tiêu đề không rõ ràng, ảnh không đủ chất lượng, vi phạm quy định..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim() || submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? "Đang xử lý..." : "Xác nhận từ chối"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Action buttons theo trạng thái ───────────────────────────────────────────
function ActionButtons({ listing, onApprove, onReject, onFlag, onRestore }) {
  // Ngăn click button lan lên row (tránh mở tab mới khi nhấn action)
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {/* pending → Duyệt + Từ chối */}
      {listing.status === "pending" && (
        <>
          <button
            className="admin-btn admin-btn-success"
            style={{ padding: "5px 10px", fontSize: "12px" }}
            onClick={stop(() => onApprove(listing.id))}
            title="Duyệt bài đăng — chuyển sang active"
          >
            Duyệt
          </button>
          <button
            className="admin-btn admin-btn-danger"
            style={{ padding: "5px 10px", fontSize: "12px" }}
            onClick={stop(() => onReject(listing))}
            title="Từ chối kèm lý do"
          >
            Từ chối
          </button>
        </>
      )}

      {/* active → Gỡ xuống */}
      {listing.status === "active" && (
        <button
          className="admin-btn"
          style={{ padding: "5px 10px", fontSize: "12px", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}
          onClick={stop(() => onFlag(listing.id))}
          title="Gỡ bài xuống — chuyển sang flagged để xem xét"
        >
          Gỡ xuống
        </button>
      )}

      {/* flagged → Khôi phục hoặc Từ chối vĩnh viễn */}
      {listing.status === "flagged" && (
        <>
          <button
            className="admin-btn admin-btn-success"
            style={{ padding: "5px 10px", fontSize: "12px" }}
            onClick={stop(() => onRestore(listing.id))}
            title="Khôi phục — chuyển lại active"
          >
            Khôi phục
          </button>
          <button
            className="admin-btn admin-btn-danger"
            style={{ padding: "5px 10px", fontSize: "12px" }}
            onClick={stop(() => onReject(listing))}
            title="Từ chối vĩnh viễn kèm lý do"
          >
            Từ chối
          </button>
        </>
      )}

      {/* rejected / sold / draft → không có action */}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ListingManagement() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null); // listing đang chờ từ chối

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = {};
      if (filterStatus !== "all") filters.status = filterStatus;
      if (searchTerm) filters.search = searchTerm;
      const result = await getListings(filters);
      setListings(result.data || []);
    } catch (err) {
      console.error("Failed to load listings:", err);
      setError("Không thể tải danh sách");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadListings(); }, [filterStatus, searchTerm]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleApprove = async (id) => {
    try {
      await updateListingStatus(id, "active");
      showSuccess("Đã duyệt bài đăng thành công");
      loadListings();
    } catch {
      setError("Không thể duyệt bài đăng");
    }
  };

  const handleRejectConfirm = async (id, reason) => {
    try {
      await updateListingStatus(id, "rejected", reason);
      setRejectTarget(null);
      showSuccess("Đã từ chối bài đăng");
      loadListings();
    } catch {
      setError("Không thể từ chối bài đăng");
    }
  };

  const handleFlag = async (id) => {
    try {
      await updateListingStatus(id, "flagged");
      showSuccess("Đã gỡ bài đăng xuống để xem xét");
      loadListings();
    } catch {
      setError("Không thể gỡ bài đăng");
    }
  };

  const handleRestore = async (id) => {
    try {
      await updateListingStatus(id, "active");
      showSuccess("Đã khôi phục bài đăng");
      loadListings();
    } catch {
      setError("Không thể khôi phục bài đăng");
    }
  };

  // ── Status helpers ─────────────────────────────────────────────────────────

  const statusColor = (status) => {
    switch (status) {
      case "active":   return "admin-badge-success";
      case "pending":  return "admin-badge-warning";
      case "rejected": return "admin-badge-danger";
      case "flagged":  return "admin-badge-danger";
      case "sold":     return "admin-badge-info";
      default:         return "admin-badge-info";
    }
  };

  const statusText = (status) => {
    switch (status) {
      case "active":   return "Đã Duyệt";
      case "pending":  return "Chờ Duyệt";
      case "rejected": return "Đã Từ Chối";
      case "flagged":  return "Vi Phạm";
      case "sold":     return "Đã Bán";
      case "draft":    return "Nháp";
      default:         return status;
    }
  };

  return (
    <div className="admin-page">
      {/* Reject Modal */}
      {rejectTarget && (
        <RejectModal
          listing={rejectTarget}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      <div className="admin-header">
        <h1>Quản Lý Listing / Sách</h1>
      </div>

      {/* Thông báo */}
      {error && (
        <div style={{ background: "#fef2f2", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ background: "#f0fdf4", color: "#15803d", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-filter-search-wrap">
          <svg className="admin-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="admin-filter-input with-search"
            placeholder="Tìm theo tên sách..."
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
          <option value="pending">Chờ Duyệt</option>
          <option value="active">Đã Duyệt</option>
          <option value="flagged">Vi Phạm</option>
          <option value="rejected">Đã Từ Chối</option>
          <option value="sold">Đã Bán</option>
          <option value="draft">Nháp</option>
        </select>
      </div>

      {/* Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tên Sách</th>
              <th>Người Bán</th>
              <th>Giá</th>
              <th>Trạng Thái</th>
              <th>Ngày Tạo</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#56647e" }}>
                  Đang tải...
                </td>
              </tr>
            ) : listings.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#56647e" }}>
                  Không có listing nào
                </td>
              </tr>
            ) : listings.map((listing) => (
              <tr
                key={listing.id}
                onClick={() => window.open(`/sach/${listing.id}`, "_blank")}
                style={{ cursor: "pointer" }}
                className="admin-table-row-link"
              >
                <td>
                  <div>
                    <strong style={{ display: "block" }}>{listing.title}</strong>
                    {listing.reject_reason && (
                      <span style={{ fontSize: "11px", color: "#dc2626" }}>
                        Lý do: {listing.reject_reason}
                      </span>
                    )}
                  </div>
                </td>
                <td>{listing.seller?.name || "—"}</td>
                <td style={{ fontWeight: 600 }}>
                  {(listing.price || 0).toLocaleString("vi-VN")}đ
                </td>
                <td>
                  <span className={`admin-badge ${statusColor(listing.status)}`}>
                    {statusText(listing.status)}
                  </span>
                </td>
                <td>{listing.created_at?.split("T")[0] || "—"}</td>
                <td>
                  <ActionButtons
                    listing={listing}
                    onApprove={handleApprove}
                    onReject={setRejectTarget}
                    onFlag={handleFlag}
                    onRestore={handleRestore}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "16px", color: "#56647e", fontSize: "14px" }}>
        Hiển thị {listings.length} listing
      </div>
    </div>
  );
}
