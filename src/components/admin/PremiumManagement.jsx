import { useEffect, useState } from "react";
import { getPromotions } from "../../services/admin";
import { supabase } from "../../services/supabase";

function PlanModal({ plan, onSave, onClose }) {
  const [name, setName] = useState(plan?.name || "");
  const [summary, setSummary] = useState(plan?.summary || "");
  const [price, setPrice] = useState(plan?.price || 0);
  const [duration, setDuration] = useState(plan?.duration_days || 7);
  const [features, setFeatures] = useState(plan?.features?.join(", ") || "");
  const [saving, setSaving] = useState(false);
  const isEdit = !!plan;

  const handleSave = async () => {
    if (!name.trim() || !price) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      summary: summary.trim(),
      price: Number(price),
      duration_days: Number(duration),
      features: features.split(",").map(f => f.trim()).filter(Boolean),
    };
    await onSave(payload, plan?.id);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{isEdit ? "Sửa gói" : "Tạo gói mới"}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold">Tên gói</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold">Mô tả ngắn</label>
            <input value={summary} onChange={e => setSummary(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-semibold">Giá (₫)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-sm font-semibold">Số ngày</label>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold">Tính năng (phân cách bằng dấu phẩy)</label>
            <textarea value={features} onChange={e => setFeatures(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm h-20" placeholder="VD: Đẩy tin lên top, Gắn nhãn nổi bật, ..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg">Hủy</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 rounded-lg disabled:opacity-50">
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PremiumManagement() {
  const [tab, setTab] = useState("plans");
  const [plans, setPlans] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planModal, setPlanModal] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);

  const loadPlans = async () => {
    const { data } = await supabase.from("lb_premium_plans").select("*").order("price", { ascending: true });
    setPlans(data || []);
  };

  const loadPromotionsList = async () => {
    const result = await getPromotions({}, page, 15);
    setPromotions(result.data || []);
    setTotalPages(result.totalPages || Math.ceil((result.total || 0) / 15) || 1);
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadPlans(), loadPromotionsList()]);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (tab === "history") loadPromotionsList(); }, [page, tab]);

  const handleSavePlan = async (payload, planId) => {
    try {
      if (planId) {
        const { data, error } = await supabase.from("lb_premium_plans").update(payload).eq("id", planId).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Không tìm thấy gói premium");
        setPlans(prev => prev.map(p => p.id === planId ? { ...p, ...data[0] } : p));
      } else {
        const { data, error } = await supabase.from("lb_premium_plans").insert([payload]).select();
        if (error) throw error;
        if (data) setPlans(prev => [...prev, data[0]]);
      }
      setPlanModal(null);
    } catch (err) {
      console.error("Save plan error:", err);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm("Xóa gói này?")) return;
    setActionLoading(planId);
    try {
      await supabase.from("lb_premium_plans").delete().eq("id", planId);
      setPlans(prev => prev.filter(p => p.id !== planId));
    } catch (err) {
      console.error("Delete plan error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const statusColor = (s) => s === "active" ? "admin-badge-success" : "admin-badge-danger";
  const statusText = (s) => s === "active" ? "Hoạt Động" : "Hết Hạn";
  const activeCount = promotions.filter(p => p.is_active).length;

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-header"><h1>Quản Lý Premium</h1></div>
        <div style={{ textAlign: "center", padding: "40px" }}>Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Quản Lý Premium & Đẩy Tin</h1>
        <div className="admin-actions">
          {tab === "plans" && (
            <button className="admin-btn admin-btn-primary" onClick={() => setPlanModal({})}>Tạo Gói Mới</button>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-6">
        <button onClick={() => setTab("plans")} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === "plans" ? "text-teal-700 border-teal-700" : "text-slate-500 border-transparent"}`}>
          Gói Premium
        </button>
        <button onClick={() => setTab("history")} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === "history" ? "text-teal-700 border-teal-700" : "text-slate-500 border-transparent"}`}>
          Lịch sử mua ({activeCount} active)
        </button>
      </div>

      {tab === "plans" && (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên gói</th>
                <th>Mô tả</th>
                <th>Giá</th>
                <th>Thời hạn</th>
                <th>Tính năng</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td className="text-sm text-slate-500">{p.summary || "—"}</td>
                  <td style={{ fontWeight: 600 }}>{(p.price || 0).toLocaleString()}đ</td>
                  <td>{p.duration_days || 7} ngày</td>
                  <td className="text-xs">{(p.features || []).slice(0, 2).join(", ")}{(p.features || []).length > 2 ? "..." : ""}</td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => setPlanModal(p)} className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>Sửa</button>
                      <button onClick={() => handleDeletePlan(p.id)} className="admin-btn admin-btn-danger" style={{ padding: "6px 10px", fontSize: "12px" }} disabled={actionLoading === p.id}>
                        {actionLoading === p.id ? "..." : "Xóa"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: "32px" }}>Chưa có gói premium nào. Nhấn "Tạo Gói Mới" để thêm.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "history" && (
        <>
          <div className="admin-stats-grid" style={{ marginBottom: "24px" }}>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Premium Active</p>
              <p className="admin-stat-value">{activeCount}</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Tổng Giao Dịch</p>
              <p className="admin-stat-value">{promotions.length}</p>
            </div>
          </div>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Người Dùng</th>
                  <th>Sách</th>
                  <th>Gói</th>
                  <th>Giá</th>
                  <th>Ngày Hết Hạn</th>
                  <th>Trạng Thái</th>
                  <th>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.user_name || "—"}</strong></td>
                    <td>{p.book_title || "—"}</td>
                    <td>{p.plan_type || "—"}</td>
                    <td style={{ fontWeight: 600 }}>{(p.amount_paid || 0).toLocaleString()}đ</td>
                    <td>{p.expires_at ? new Date(p.expires_at).toLocaleDateString("vi-VN") : "—"}</td>
                    <td>
                      <span className={`admin-badge ${statusColor(p.is_active ? "active" : "expired")}`}>
                        {statusText(p.is_active ? "active" : "expired")}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>Chi Tiết</button>
                        {p.is_active && <button className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>Gia Hạn</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {promotions.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: "center", padding: "32px" }}>Chưa có giao dịch premium</td></tr>
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
        </>
      )}

      {planModal && (
        <PlanModal plan={planModal} onSave={handleSavePlan} onClose={() => setPlanModal(null)} />
      )}
    </div>
  );
}
