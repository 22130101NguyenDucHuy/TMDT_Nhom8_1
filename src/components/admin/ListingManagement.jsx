import { useEffect, useState, useCallback } from "react";
import { getListings, updateListingStatus, deleteListing } from "../../services/admin";
import { useAuth } from "../../contexts/AuthContext";

function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel, confirmVariant }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Hủy
          </button>
          <button onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${
              confirmVariant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-teal-600 hover:bg-teal-700"
            }`}>
            {confirmLabel || "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
          <button onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Hủy
          </button>
          <button onClick={handleConfirm} disabled={!reason.trim() || submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50">
            {submitting ? "Đang xử lý..." : "Xác nhận từ chối"}
          </button>
        </div>
      </div>
    </div>
  );
}

 // ── Action buttons theo trạng thái ───────────────────────────────────────────
function ActionButtons({ listing, actionLoading, onApprove, onReject, onFlag, onRestore, onDelete }) {
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  const isLoading = actionLoading === listing.id;

  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {listing.status === "pending" && (
        <>
          <button className="admin-btn admin-btn-success"
            style={{ padding: "5px 10px", fontSize: "12px" }}
            disabled={isLoading}
            onClick={stop(() => onApprove(listing.id))}
            title="Duyệt bài đăng">
            {isLoading ? "..." : "Duyệt"}
          </button>
          <button className="admin-btn admin-btn-danger"
            style={{ padding: "5px 10px", fontSize: "12px" }}
            disabled={isLoading}
            onClick={stop(() => onReject(listing))}
            title="Từ chối kèm lý do">
            Từ chối
          </button>
        </>
      )}

      {listing.status === "active" && (
        <button className="admin-btn"
          style={{ padding: "5px 10px", fontSize: "12px", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}
          disabled={isLoading}
          onClick={stop(() => onFlag(listing))}
          title="Gỡ bài xuống — chuyển sang flagged để xem xét">
          {isLoading ? "..." : "Gỡ xuống"}
        </button>
      )}

      {listing.status === "flagged" && (
        <>
          <button className="admin-btn admin-btn-success"
            style={{ padding: "5px 10px", fontSize: "12px" }}
            disabled={isLoading}
            onClick={stop(() => onRestore(listing.id, "active"))}
            title="Khôi phục — chuyển lại active">
            {isLoading ? "..." : "Khôi phục"}
          </button>
          <button className="admin-btn admin-btn-danger"
            style={{ padding: "5px 10px", fontSize: "12px" }}
            disabled={isLoading}
            onClick={stop(() => onReject(listing))}
            title="Từ chối vĩnh viễn kèm lý do">
            Từ chối
          </button>
        </>
      )}

      {listing.status === "rejected" && (
        <button className="admin-btn admin-btn-success"
          style={{ padding: "5px 10px", fontSize: "12px" }}
          disabled={isLoading}
          onClick={stop(() => onRestore(listing.id, "pending"))}
          title="Khôi phục — chuyển về pending để duyệt lại">
          {isLoading ? "..." : "Khôi phục"}
        </button>
      )}

      {listing.status === "draft" && (
        <button className="admin-btn admin-btn-danger"
          style={{ padding: "5px 10px", fontSize: "12px" }}
          disabled={isLoading}
          onClick={stop(() => onDelete(listing))}
          title="Xóa bài nháp">
          {isLoading ? "..." : "Xóa"}
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ListingManagement() {
  const { showToast } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const loadListings = useCallback(async (background) => {
    if (!background) setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (filterStatus !== "all") filters.status = filterStatus;
      if (searchTerm) filters.search = searchTerm;
      const result = await getListings(filters, page, 15);
      setListings(result.data || []);
      const tp = result.totalPages || 1;
      setTotalPages(tp);
      if (page > tp) setPage(tp);
    } catch (err) {
      console.error("Failed to load listings:", err);
      setError("Không thể tải danh sách");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchTerm, page]);

  useEffect(() => { loadListings(); }, [loadListings]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const patchListing = (id, updates) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const removeListing = (id) => {
    setListings(prev => prev.filter(l => l.id !== id));
  };

  const handleApprove = async (id) => {
    setActionLoading(id);
    setError(null);
    try {
      await updateListingStatus(id, "active");
      patchListing(id, { status: "active", reject_reason: null });
      showToast("Đã duyệt bài đăng thành công", "success");
    } catch (err) {
      showToast(err?.message || "Không thể duyệt bài đăng", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async (id, reason) => {
    setActionLoading(id);
    setError(null);
    try {
      await updateListingStatus(id, "rejected", reason);
      patchListing(id, { status: "rejected", reject_reason: reason });
      setRejectTarget(null);
      showToast("Đã từ chối bài đăng", "success");
    } catch (err) {
      showToast(err?.message || "Không thể từ chối bài đăng", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFlag = async (id) => {
    setActionLoading(id);
    setError(null);
    try {
      await updateListingStatus(id, "flagged");
      patchListing(id, { status: "flagged" });
      setConfirmTarget(null);
      showToast("Đã gỡ bài đăng xuống để xem xét", "success");
    } catch (err) {
      showToast(err?.message || "Không thể gỡ bài đăng", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (id, targetStatus) => {
    setActionLoading(id);
    setError(null);
    try {
      const updated = await updateListingStatus(id, targetStatus);
      patchListing(id, { status: updated.status, reject_reason: null });
      const msg = targetStatus === "active"
        ? "Đã khôi phục bài đăng về trạng thái đã duyệt"
        : "Đã khôi phục bài đăng, chuyển về chờ duyệt";
      showToast(msg, "success");
    } catch (err) {
      showToast(err?.message || "Không thể khôi phục bài đăng", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    setActionLoading(id);
    setError(null);
    try {
      await deleteListing(id);
      removeListing(id);
      setConfirmTarget(null);
      showToast("Đã xóa bài đăng", "success");
    } catch (err) {
      showToast(err?.message || "Không thể xóa bài đăng", "error");
    } finally {
      setActionLoading(null);
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

  const getConfirmMessage = (listing) => {
    if (confirmTarget?.action === "flag") {
      return `Bạn có chắc muốn gỡ bài đăng "${listing.title}"? Bài đăng sẽ chuyển sang trạng thái vi phạm để xem xét.`;
    }
    if (confirmTarget?.action === "delete") {
      return `Bạn có chắc muốn xóa vĩnh viễn bài nháp "${listing.title}"? Hành động này không thể hoàn tác.`;
    }
    return "";
  };

  const getConfirmTitle = () => {
    if (confirmTarget?.action === "flag") return "Xác nhận gỡ bài đăng";
    if (confirmTarget?.action === "delete") return "Xác nhận xóa bài đăng";
    return "";
  };

  return (
    <div className="admin-page">
      {/* Confirm Modal (flag / delete) */}
      {confirmTarget && (
        <ConfirmModal
          title={getConfirmTitle()}
          message={getConfirmMessage(
            listings.find(l => l.id === confirmTarget.id) || confirmTarget
          )}
          confirmLabel={confirmTarget?.action === "flag" ? "Gỡ xuống" : "Xóa"}
          confirmVariant="danger"
          onConfirm={() => {
            if (confirmTarget.action === "flag") handleFlag(confirmTarget.id);
            if (confirmTarget.action === "delete") handleDelete(confirmTarget.id);
          }}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

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

      {/* Thông báo lỗi (success dùng showToast toàn cục) */}
      {error && (
        <div style={{ background: "#fef2f2", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-filter-search-wrap">
          <svg className="admin-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" className="admin-filter-input with-search"
            placeholder="Tìm theo tên sách..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>
        <select className="admin-filter-select"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
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
              <tr key={listing.id}
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
                    actionLoading={actionLoading}
                    onApprove={handleApprove}
                    onReject={setRejectTarget}
                    onFlag={(listing) => setConfirmTarget({ id: listing.id, title: listing.title, action: "flag" })}
                    onRestore={handleRestore}
                    onDelete={(listing) => setConfirmTarget({ id: listing.id, title: listing.title, action: "delete" })}
                  />
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
            Hiển thị {listings.length} listing
          </div>
        </>
      )}
    </div>
  );
}
