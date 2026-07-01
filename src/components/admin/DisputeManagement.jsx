import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getDisputes, updateDisputeStatus, reopenDispute, getDisputeMessages, sendAdminMessage } from "../../services/admin";
import { releaseEscrow, cancelTransaction } from "../../services/payment";

function ChatModal({ dispute, onClose }) {
  const { userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const msgs = await getDisputeMessages(dispute);
      setMessages(msgs);
      setLoading(false);
    };
    load();
  }, [dispute]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendAdminMessage(dispute, userData.id, userData.name, text.trim());
      const msgs = await getDisputeMessages(dispute);
      setMessages(msgs);
      setText("");
    } catch (err) {
      console.error("sendAdminMessage error:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "#e5e7eb" }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "#0f766e" }}>Nội dung tranh chấp</h2>
            <p className="text-xs mt-0.5" style={{ color: "#63748a" }}>{dispute.buyer_name} vs {dispute.seller_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: "#63748a" }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ background: "#f8f9fb" }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#0f766e" }} />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-sm py-12" style={{ color: "#63748a" }}>
              Chưa có tin nhắn nào trong cuộc hội thoại này.
            </div>
          ) : (
            messages.map((m, i) => {
              const isBuyer = m.sender_id === dispute.buyer_id;
              const isAdmin = m.sender_id === userData?.id;
              return (
                <div key={m.id || i} className={`flex max-w-[75%] gap-2 ${isAdmin ? "self-end flex-row-reverse ml-auto" : "self-start"}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{
                      background: isAdmin ? "#0f766e" : isBuyer ? "#dbeafe" : "#fef3c7",
                      color: isAdmin ? "#fff" : isBuyer ? "#1d4ed8" : "#92400e",
                    }}>
                    {isAdmin ? "A" : isBuyer ? "B" : "S"}
                  </div>
                  <div>
                    <div className="px-4 py-2.5 text-sm leading-relaxed"
                      style={{
                        background: isAdmin ? "#0f766e" : "#fff",
                        color: isAdmin ? "#fff" : "#111827",
                        borderRadius: isAdmin ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        border: isAdmin ? "none" : "1px solid #e5e7eb",
                        boxShadow: isAdmin ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                      }}>
                      {m.text}
                    </div>
                    <div className={`text-[11px] mt-1 ${isAdmin ? "text-right" : "text-left"}`} style={{ color: "#63748a" }}>
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t shrink-0" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Nhập tin nhắn với tư cách Admin..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm"
              style={{ border: "1px solid #d0d5dd", background: "#f9fafb" }}
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="px-5 py-2.5 text-white text-sm font-bold rounded-lg transition-colors"
              style={{ background: !text.trim() || sending ? "#9ca3af" : "#0f766e" }}
            >
              {sending ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : "Gửi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DisputeManagement() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [chatDispute, setChatDispute] = useState(null);

  const loadDisputes = async (background) => {
    if (!background) setLoading(true);
    setError(null);
    try {
      const result = await getDisputes({}, page, 15);
      setDisputes(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error("Failed to load disputes:", err);
      setError("Không thể tải danh sách tranh chấp");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDisputes(); }, []);
  useEffect(() => { loadDisputes(); }, [page]);

  const patchDispute = (id, updates) => {
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const handleStatusUpdate = async (dispute, resolution) => {
    const id = dispute.id;
    setActionLoading(id);
    try {
      if (resolution === 'open') {
        // Mở lại tranh chấp
        await reopenDispute(id);
        patchDispute(id, { status: 'open' });

      } else if (resolution === 'refund_buyer') {
        // BUG FIX: Hoàn tiền cho người mua — hủy giao dịch + hoàn esc row
        if (dispute.transaction_id) {
          await cancelTransaction(dispute.transaction_id, dispute.buyer_id);
        }
        await updateDisputeStatus(id, 'resolved', 'Hoàn tiền cho người mua');
        patchDispute(id, { status: 'resolved' });

      } else if (resolution === 'release_seller') {
        // BUG FIX: Giải ngân cho người bán — giải ngân escrow vào ví người bán
        if (dispute.transaction_id) {
          await releaseEscrow(dispute.transaction_id);
        }
        await updateDisputeStatus(id, 'resolved', 'Giải ngân cho người bán');
        patchDispute(id, { status: 'resolved' });
      }
    } catch (err) {
      console.error('Failed to update dispute:', err);
      setError('Lỗi: ' + (err.message || 'Không thể cập nhật tranh chấp'));
    } finally {
      setActionLoading(null);
    }
  };

  const statusColor = (status) => {
    switch(status) {
      case "resolved": return "admin-badge-success";
      case "pending": return "admin-badge-warning";
      case "open": return "admin-badge-danger";
      default: return "admin-badge-info";
    }
  };

  const statusText = (status) => {
    switch(status) {
      case "resolved": return "Đã Giải Quyết";
      case "pending": return "Chờ Xử Lý";
      case "open": return "Mở";
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-header"><h1>Quản Lý Tranh Chấp</h1></div>
        <div style={{ textAlign: "center", padding: "40px", color: "#56647e" }}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (error && disputes.length === 0) {
    return (
      <div className="admin-page">
        <div className="admin-header"><h1>Quản Lý Tranh Chấp</h1></div>
        <div style={{ textAlign: "center", padding: "40px", color: "#dc2626" }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {chatDispute && <ChatModal dispute={chatDispute} onClose={() => setChatDispute(null)} />}

      <div className="admin-header">
        <h1>Quản Lý Tranh Chấp</h1>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <p className="admin-stat-label">Tổng Tranh Chấp</p>
          <p className="admin-stat-value">{disputes.length}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Chưa Xử Lý</p>
          <p className="admin-stat-value" style={{ color: "#d94c24" }}>
            {disputes.filter(d => d.status !== "resolved").length}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tiêu Đề</th>
              <th>Người Mua</th>
              <th>Người Bán</th>
              <th>Số Tiền</th>
              <th>Trạng Thái</th>
              <th>Ngày</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {disputes.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "#56647e" }}>Không có tranh chấp nào</td></tr>
            ) : disputes.map(dispute => (
              <tr key={dispute.id}>
                <td><strong>{dispute.title}</strong></td>
                <td>{dispute.buyer_name}</td>
                <td>{dispute.seller_name}</td>
                <td style={{ fontWeight: 600, color: "#d94c24" }}>{dispute.amount}</td>
                <td>
                  <span className={`admin-badge ${statusColor(dispute.status)}`}>
                    {statusText(dispute.status)}
                  </span>
                </td>
                <td>{dispute.dispute_date}</td>
                <td>
                  <div className="admin-actions" style={{ flexWrap: "wrap", gap: "6px" }}>
                    <button
                      onClick={() => setChatDispute(dispute)}
                      className="admin-btn admin-btn-secondary"
                    >
                      Chat
                    </button>
                    {dispute.status !== "resolved" ? (
                      <>
                        {/* BUG FIX: Hai nút rõ ràng — admin chọn hướng giải quyết */}
                        <button
                          className="admin-btn"
                          disabled={actionLoading === dispute.id}
                          onClick={() => handleStatusUpdate(dispute, 'refund_buyer')}
                          style={{ background: '#3b82f6', borderColor: '#3b82f6', color: '#fff', padding: '5px 9px', fontSize: '12px' }}
                          title="Hoàn tiền escrow về ví người mua"
                        >
                          {actionLoading === dispute.id ? '...' : '💰 Hoàn tiền NM'}
                        </button>
                        <button
                          className="admin-btn"
                          disabled={actionLoading === dispute.id}
                          onClick={() => handleStatusUpdate(dispute, 'release_seller')}
                          style={{ background: '#10b981', borderColor: '#10b981', color: '#fff', padding: '5px 9px', fontSize: '12px' }}
                          title="Giải ngân escrow cho người bán"
                        >
                          {actionLoading === dispute.id ? '...' : '✅ Giải ngân NB'}
                        </button>
                      </>
                    ) : (
                      <button
                        className="admin-btn admin-btn-primary"
                        disabled={actionLoading === dispute.id}
                        onClick={() => handleStatusUpdate(dispute, 'open')}
                        style={{ background: "#f59e0b", borderColor: "#f59e0b" }}
                      >
                        {actionLoading === dispute.id ? "..." : "Mở Lại"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && totalPages > 1 && (
        <div className="admin-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Trước</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={p === page ? "active" : ""} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sau →</button>
        </div>
      )}
    </div>
  );
}
