import { useEffect, useState } from "react";
import { getWithdrawals, approveWithdrawal, rejectWithdrawal } from "../../services/admin";
import { formatPrice } from "../../utils/formatters";

export default function WithdrawalManagement() {
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processingId, setProcessingId] = useState(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = filterStatus !== "all" ? { status: filterStatus } : {};
      const result = await getWithdrawals(filters, page, 15);
      
      setRequests(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error("Failed to load withdrawals:", err);
      setError("Không thể tải danh sách yêu cầu rút tiền.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filterStatus, page]);

  const handleApprove = async (id) => {
    if (window.confirm("Xác nhận đã chuyển khoản và duyệt yêu cầu rút tiền này?")) {
      try {
        setProcessingId(id);
        await approveWithdrawal(id);
        alert("Đã duyệt yêu cầu rút tiền thành công!");
        loadRequests();
      } catch (err) {
        console.error("Failed to approve withdrawal:", err);
        alert("Lỗi khi duyệt yêu cầu: " + err.message);
      } finally {
        setProcessingId(null);
      }
    }
  };

  const handleReject = async (id, userId, amount) => {
    if (window.confirm("Bạn có chắc chắn muốn TỪ CHỐI yêu cầu rút tiền này? Tiền sẽ được hoàn trả lại ví của người dùng.")) {
      try {
        setProcessingId(id);
        await rejectWithdrawal(id, userId, amount);
        alert("Đã từ chối và hoàn tiền về ví người dùng thành công!");
        loadRequests();
      } catch (err) {
        console.error("Failed to reject withdrawal:", err);
        alert("Lỗi khi từ chối yêu cầu: " + err.message);
      } finally {
        setProcessingId(null);
      }
    }
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
          <h1>Quản Lý Rút Tiền</h1>
        </div>
        <div style={{ textAlign: "center", padding: "80px 40px", color: "#56647e" }}>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-700 mx-auto mb-4" />
          Đang tải yêu cầu rút tiền...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Quản Lý Rút Tiền</h1>
        <p className="admin-subtitle" style={{ fontSize: "14px", color: "#56647e", marginTop: "4px" }}>
          Xem và duyệt các yêu cầu rút tiền từ ví LoopBook của người dùng về tài khoản ngân hàng thực tế.
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
            <option value="approved">Đã duyệt (Thành công)</option>
            <option value="rejected">Bị từ chối (Đã hoàn tiền)</option>
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
            Không tìm thấy yêu cầu rút tiền nào.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người Rút</th>
                <th>Thông Tin Ngân Hàng</th>
                <th>Số Tiền</th>
                <th>Trạng Thái</th>
                <th>Ngày Gửi</th>
                <th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>
                    <div>
                      <strong className="text-slate-900">{req.user_name}</strong>
                      <div className="text-xs text-slate-400 mt-0.5">{req.user_email}</div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "13px" }}>
                      <div>Ngân hàng: <strong>{req.bank_name}</strong></div>
                      <div>STK: <strong>{req.account_number}</strong></div>
                      <div className="text-slate-500">Chủ TK: {req.account_holder}</div>
                    </div>
                  </td>
                  <td>
                    <strong className="text-teal-700 font-bold">{formatPrice(req.amount)}</strong>
                  </td>
                  <td>
                    <span className={`admin-badge ${statusColor(req.status)}`}>
                      {statusText(req.status)}
                    </span>
                  </td>
                  <td>{req.created_at ? new Date(req.created_at).toLocaleDateString("vi-VN") + ' ' + new Date(req.created_at).toLocaleTimeString("vi-VN", {hour: '2-digit', minute:'2-digit'}) : "—"}</td>
                  <td>
                    {req.status === "pending" ? (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button 
                          className="admin-btn admin-btn-success"
                          style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          disabled={processingId === req.id}
                          onClick={() => handleApprove(req.id)}
                        >
                          Duyệt
                        </button>
                        <button 
                          className="admin-btn admin-btn-danger"
                          style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          disabled={processingId === req.id}
                          onClick={() => handleReject(req.id, req.user_id, req.amount)}
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
    </div>
  );
}
