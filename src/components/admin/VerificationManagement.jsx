import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import { getVerifications, approveVerification, rejectVerification } from "../../services/admin";

export default function VerificationManagement() {
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedImage, setSelectedImage] = useState(null); // For fullscreen image modal
  const [processingId, setProcessingId] = useState(null); // To show loading state for individual action

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = filterStatus !== "all" ? { status: filterStatus } : {};
      const result = await getVerifications(filters, page, 15);
      
      setRequests(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error("Failed to load student verifications:", err);
      setError("Không thể tải danh sách yêu cầu xác thực.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filterStatus, page]);

  const handleApprove = async (id, userId) => {
    if (window.confirm("Bạn có chắc chắn muốn duyệt thẻ sinh viên này?")) {
      try {
        setProcessingId(id);
        await approveVerification(id, userId);
        loadRequests();
      } catch (err) {
        console.error("Failed to approve verification:", err);
        alert("Lỗi khi duyệt yêu cầu: " + err.message);
      } finally {
        setProcessingId(null);
      }
    }
  };

  const handleReject = async (id, userId) => {
    if (window.confirm("Bạn có chắc chắn muốn từ chối thẻ sinh viên này?")) {
      try {
        setProcessingId(id);
        await rejectVerification(id, userId);
        loadRequests();
      } catch (err) {
        console.error("Failed to reject verification:", err);
        alert("Lỗi khi từ chối yêu cầu: " + err.message);
      } finally {
        setProcessingId(null);
      }
    }
  };

  const getImageUrl = (path) => {
    if (!path) return "";
    const { data } = supabase.storage.from("student-verification").getPublicUrl(path);
    return data.publicUrl;
  };

  const statusColor = (status) => {
    switch (status) {
      case "approved": return "admin-badge-success";
      case "pending": return "admin-badge-warning";
      case "rejected": return "admin-badge-danger";
      default: return "admin-badge-info";
    }
  };

  const statusText = (status) => {
    switch (status) {
      case "approved": return "Đã duyệt";
      case "pending": return "Đang chờ";
      case "rejected": return "Bị từ chối";
      default: return status;
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <h1>Xác Thực Sinh Viên</h1>
        </div>
        <div style={{ textAlign: "center", padding: "80px 40px", color: "#56647e" }}>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-700 mx-auto mb-4" />
          Đang tải yêu cầu xác thực...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Xác Thực Sinh Viên</h1>
        <p className="admin-subtitle" style={{ fontSize: "14px", color: "#56647e", marginTop: "4px" }}>
          Duyệt ảnh thẻ sinh viên để kích hoạt quyền đăng bán và giao dịch trên LoopBook.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#344054" }}>Lọc trạng thái:</span>
          <select 
            className="admin-filter-select"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            style={{ width: "200px" }}
          >
            <option value="all">Tất Cả</option>
            <option value="pending">Đang chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Bị từ chối</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: "16px", backgroundColor: "#fef2f2", color: "#dc2626", borderRadius: "8px", border: "1px solid #fee2e2", marginBottom: "20px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {/* Table Wrapper */}
      <div className="admin-table-wrapper">
        {requests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#56647e" }}>
            Không tìm thấy yêu cầu xác thực nào.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sinh Viên</th>
                <th>Email</th>
                <th>Ảnh Thẻ Sinh Viên</th>
                <th>Trạng Thái</th>
                <th>Ngày Gửi</th>
                <th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td><strong>{req.user?.name || "Người dùng mới"}</strong></td>
                  <td>{req.user?.email || "—"}</td>
                  <td>
                    {req.image_path ? (
                      <div className="group relative w-24 h-16 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shadow-sm hover:shadow transition-shadow"
                           onClick={() => setSelectedImage(getImageUrl(req.image_path))}>
                        <img 
                          src={getImageUrl(req.image_path)} 
                          alt="Student Card" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">Không có ảnh</span>
                    )}
                  </td>
                  <td>
                    <span className={`admin-badge ${statusColor(req.status)}`}>
                      {statusText(req.status)}
                    </span>
                  </td>
                  <td>{req.created_at ? new Date(req.created_at).toLocaleDateString("vi-VN") : "—"}</td>
                  <td>
                    {req.status === "pending" ? (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button 
                          className="admin-btn admin-btn-success"
                          style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          disabled={processingId === req.id}
                          onClick={() => handleApprove(req.id, req.user_id)}
                        >
                          Duyệt
                        </button>
                        <button 
                          className="admin-btn admin-btn-danger"
                          style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          disabled={processingId === req.id}
                          onClick={() => handleReject(req.id, req.user_id)}
                        >
                          Từ chối
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400" style={{ fontSize: "13px" }}>Đã xử lý</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {requests.length > 0 && (
        <div style={{ marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
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
      )}

      {/* Lightbox / Modal for Image Preview */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] bg-white rounded-xl overflow-hidden shadow-2xl p-2 animate-in zoom-in-95 duration-200"
               onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedImage} 
              alt="Fullscreen Preview" 
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <button 
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors shadow-lg"
              onClick={() => setSelectedImage(null)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
