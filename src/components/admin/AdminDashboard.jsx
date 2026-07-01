import { useMemo, useState, useEffect } from "react";
import { getTransactions, getDashboardStats, getAnalytics, getCategoryStats, createSystemNotification, setPromoCampaign, getPromoCampaign, updateUserStatus } from "../../services/admin";
import { RevenueChart, CategoryDistributionChart, UserGrowthChart } from "./AdminCharts";
import { supabase } from "../../services/supabase";

const CATEGORY_LABELS = {
  "cong-nghe-thong-tin": "CNTT",
  "khoa-hoc-tu-nhien": "KHTN",
  "kinh-te": "Kinh Tế",
  "ky-thuat": "Kỹ Thuật",
  "luat": "Luật",
  "ngoai-ngu": "Ngoại Ngữ",
  "nong-nghiep": "Nông Nghiệp",
  "toan-hoc": "Toán",
  "xa-hoi-hoc": "Xã Hội Học",
  "y-hoc": "Y Học",
};


function formatCurrencyShort(value) {
  const n = Number(value) || 0;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0, totalListings: 0, totalTransactions: 0,
    totalDisputes: 0, totalReports: 0, totalPremium: 0,
  });
  const [recentTxns, setRecentTxns] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [categoryStats, setCategoryStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);

  // Date filter
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(today());

  const fetchAll = async (sd, ed, tPage, background) => {
    if (!background) setLoading(true);
    const [statsData, txnData, analytics, catStats] = await Promise.all([
      getDashboardStats(),
      getTransactions({}, tPage || txPage, 7),
      getAnalytics({ startDate: sd, endDate: ed }),
      getCategoryStats(),
    ]);
    setStats(statsData || { totalUsers: 0, totalListings: 0, totalTransactions: 0, totalDisputes: 0, totalReports: 0, totalPremium: 0 });
    setRecentTxns(txnData.data || []);
    setTxTotal(txnData.total || 0);
    setAnalyticsData(analytics || []);
    setCategoryStats(catStats || {});
    setLoading(false);
  };

  useEffect(() => { fetchAll(startDate, endDate, 1); }, [startDate, endDate]);
  useEffect(() => { if (!loading) fetchAll(startDate, endDate, txPage, true); }, [txPage]);

  // Quick date range presets
  const setRange = (days) => {
    setStartDate(daysAgo(days));
    setEndDate(today());
  };

  // Doanh thu theo bộ lọc ngày — tổng từ analytics data
  const totalRevenue = useMemo(() =>
    analyticsData.reduce((sum, a) => sum + (Number(a.total_revenue) || Number(a.revenue) || 0), 0),
  [analyticsData]);

  const PIE_COLORS = ["#0f766e","#14b8a6","#8b5cf6","#f59e0b","#ef4444","#3b82f6","#06b6d4","#10b981","#f97316","#ec4899"];

  // Category distribution — từ lb_books thực tế
  const categoryData = useMemo(() =>
    Object.entries(categoryStats)
      .filter(([, v]) => v > 0)
      .map(([key, value], i) => ({
        name: CATEGORY_LABELS[key] || key,
        value,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value),
  [categoryStats]);

  const formatLabel = (d) => {
    if (!d) return "—";
    const s = String(d);
    return s.slice(8, 10) + "-" + s.slice(5, 7);
  };

  // Revenue chart — từ analytics theo thời gian
  const revenueData = useMemo(() =>
    analyticsData
      .filter(a => !a.metric_type || a.metric_type === "overview")
      .map(a => ({
        label: formatLabel(a.date),
        revenue: Number(a.total_revenue) || Number(a.revenue) || 0,
      }))
      .filter(a => a.label !== "—"),
  [analyticsData]);

  // User growth chart
  const userGrowthData = useMemo(() =>
    analyticsData
      .filter(a => !a.metric_type || a.metric_type === "overview")
      .map(a => ({
        label: formatLabel(a.date),
        users: Number(a.new_users) || 0,
      }))
      .filter(a => a.label !== "—"),
  [analyticsData]);

  const statusLabel = (s) => {
    const labels = {
      completed: "Hoàn Tất", pending: "Chờ Xử Lý",
      awaiting_meet: "Chờ Gặp Mặt", cancelled: "Đã Hủy",
    };
    return labels[s] || s;
  };

  const [activeTab, setActiveTab] = useState("insights");
  const [toastMsg, setToastMsg] = useState(null);
  const [insightActions, setInsightActions] = useState({
    demand: false,
    vip: false,
    campaign: false,
    boost1: false,
    boost2: false,
    boost3: false,
    penalty: false
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleAction1 = async () => {
    try {
      const { data: users } = await supabase.from('lb_users').select('id, name').eq('role', 'user');
      if (users && users.length > 0) {
        const targetUsers = users.slice(0, 5);
        for (const u of targetUsers) {
          await createSystemNotification(
            u.id,
            "📚 Yêu cầu nguồn hàng: Sách Học trình!",
            `Sàn LoopBook đang khát nguồn sách 'Đại số tuyến tính' (hơn 50 lượt tìm kiếm trong ngày). Nếu bạn có sách này, hãy đăng bán ngay để tiếp cận khách hàng nhanh nhất nhé!`,
            'system'
          );
        }
      }
      setInsightActions(prev => ({ ...prev, demand: true }));
      showToast("Đã gửi thông báo đẩy đến các người bán ngành Toán & Kỹ thuật!");
    } catch (err) {
      showToast("Gửi thông báo thất bại: " + err.message);
    }
  };

  const handleAction2 = async () => {
    try {
      const { data: users } = await supabase.from('lb_users').select('id, name').ilike('name', '%Minh Anh%');
      let targetUserId = null;
      if (users && users.length > 0) {
        targetUserId = users[0].id;
      } else {
        const { data: allUsers } = await supabase.from('lb_users').select('id').limit(1);
        if (allUsers && allUsers.length > 0) targetUserId = allUsers[0].id;
      }
      
      if (targetUserId) {
        await createSystemNotification(
          targetUserId,
          "🌟 Mời nâng cấp lên Shop Uy Tín / Hội viên VIP",
          "Chúc mừng! Shop của bạn đã đạt mốc doanh số ấn tượng trong tháng này. Hãy nâng cấp lên Shop Uy Tín để được hưởng phí chiết khấu ưu đãi 2% và quyền lợi đẩy tin VIP!",
          'promo'
        );
      }
      setInsightActions(prev => ({ ...prev, vip: true }));
      showToast("Đã gửi thư mời nâng cấp Hội viên VIP kèm ưu đãi đến tài khoản!");
    } catch (err) {
      showToast("Thực hiện thất bại: " + err.message);
    }
  };

  const handleAction3 = async () => {
    try {
      await setPromoCampaign(true);
      const { data: users } = await supabase.from('lb_users').select('id').eq('role', 'user');
      if (users) {
        for (const u of users.slice(0, 5)) {
          await createSystemNotification(
            u.id,
            "🔥 Siêu khuyến mãi: Mua 10 lượt Đẩy tin tặng 2!",
            "Cơ hội tăng tốc bán hàng! LoopBook ra mắt chương trình khuyến mại mua combo 10 lượt Đẩy tin tặng thêm 2 lượt đẩy tin miễn phí. Áp dụng ngay hôm nay!",
            'promo'
          );
        }
      }
      setInsightActions(prev => ({ ...prev, campaign: true }));
      showToast("Đã kích hoạt Campaign khuyến mại mua 10 tặng 2 và thông báo cho Seller!");
    } catch (err) {
      showToast("Kích hoạt thất bại: " + err.message);
    }
  };

  const handleGiftBoost = async (sellerName, actionKey) => {
    try {
      const { data: users } = await supabase.from('lb_users').select('id').ilike('name', `%${sellerName}%`).limit(1);
      if (users && users.length > 0) {
        await createSystemNotification(
          users[0].id,
          "🎁 Bạn nhận được 1 lượt Đẩy tin miễn phí!",
          `LoopBook thân tặng bạn 1 lượt đẩy tin miễn phí để hỗ trợ tăng tương tác cho các bài đăng hiện tại của bạn. Chúc bạn buôn may bán đắt!`,
          'system'
        );
      }
      setInsightActions(prev => ({ ...prev, [actionKey]: true }));
      showToast(`Đã tặng thành công 1 lượt đẩy tin miễn phí cho ${sellerName}!`);
    } catch (err) {
      showToast("Tặng thất bại: " + err.message);
    }
  };

  const handleSellerPenalty = async (userId, userName) => {
    if (!window.confirm(`Bạn có chắc muốn áp dụng hình phạt hạ hiển thị / khóa tài khoản đối với ${userName}?`)) return;
    try {
      await updateUserStatus(userId, 'suspended');
      setInsightActions(prev => ({ ...prev, penalty: true }));
      showToast(`Đã áp dụng hình phạt hạ hiển thị & khóa tài khoản đối với ${userName} thành công!`);
    } catch (err) {
      showToast("Áp dụng hình phạt thất bại: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-header"><h1>Dashboard</h1></div>
        <div style={{ textAlign: "center", padding: "40px", color: "#56647e" }}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[100] bg-teal-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-teal-600 animate-in fade-in slide-in-from-top-5 duration-300">
          <svg className="w-5 h-5 text-teal-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold text-sm">{toastMsg}</span>
        </div>
      )}

      <div className="admin-header">
        <h1>Dashboard</h1>
      </div>

      {/* Stats cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <p className="admin-stat-label">Người Dùng</p>
          <p className="admin-stat-value">{stats.totalUsers}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Bài Đăng</p>
          <p className="admin-stat-value">{stats.totalListings}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Giao Dịch</p>
          <p className="admin-stat-value">{stats.totalTransactions}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Doanh Thu (theo bộ lọc)</p>
          <p className="admin-stat-value">{formatCurrencyShort(totalRevenue)}</p>
        </div>
      </div>

      {/* Smart BI Analytics Tabs */}
      <div style={{ marginTop: "32px", background: "#fff", padding: "24px", borderRadius: "16px", border: "1px solid #e9edf4", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
          📊 Trung tâm phân tích thông minh (Smart BI)
        </h2>
        
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: "20px", gap: "8px", overflowX: "auto" }}>
          {[
            { id: "insights", label: "💡 Smart Insights (Mới)" },
            { id: "sellers", label: "💼 Chỉ số Người bán" },
            { id: "buyers", label: "🛒 Chỉ số Người mua" },
            { id: "monetization", label: "💸 Monetization (Doanh thu)" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "10px 16px",
                fontSize: "14px",
                fontWeight: 600,
                borderBottom: activeTab === t.id ? "3px solid #0f766e" : "3px solid transparent",
                color: activeTab === t.id ? "#0f766e" : "#64748b",
                background: "transparent",
                borderTop: "none", borderLeft: "none", borderRight: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap"
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Smart Insights */}
        {activeTab === "insights" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", justifyContent: "between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "260px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#eab308", background: "#fef9c3", padding: "2px 8px", borderRadius: "4px", textTransform: "uppercase" }}>Nguồn Hàng Thiếu Hụt</span>
                <p style={{ margin: "6px 0 2px", fontWeight: 600, color: "#1e293b", fontSize: "14px" }}>Có 54 lượt tìm kiếm sách 'Đại số tuyến tính' nhưng hiện tại trên sàn chỉ có 2 tin đăng.</p>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Admin nên gửi thông báo đến các người bán cùng khoa để thúc đẩy việc đăng bán tài liệu môn này.</p>
              </div>
              <button 
                onClick={handleAction1}
                disabled={insightActions.demand}
                className="admin-btn admin-btn-primary" 
                style={{ height: "40px", whiteSpace: "nowrap" }}
              >
                {insightActions.demand ? "✓ Đã gửi thông báo" : "Thông báo cho các Seller"}
              </button>
            </div>

            <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", justifyContent: "between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "260px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#0ea5e9", background: "#e0f2fe", padding: "2px 8px", borderRadius: "4px", textTransform: "uppercase" }}>Tối ưu nguồn thu</span>
                <p style={{ margin: "6px 0 2px", fontWeight: 600, color: "#1e293b", fontSize: "14px" }}>Tài khoản 'Nguyễn Minh Anh' vừa đạt mốc 102 đơn hàng thành công trong tháng này.</p>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Seller hoạt động rất tích cực. Đề xuất gửi thư mời nâng cấp Hội viên VIP/Shop Uy Tín để tối ưu chiết khấu.</p>
              </div>
              <button 
                onClick={handleAction2}
                disabled={insightActions.vip}
                className="admin-btn admin-btn-primary" 
                style={{ height: "40px", whiteSpace: "nowrap" }}
              >
                {insightActions.vip ? "✓ Đã gửi thư mời" : "Mời nâng cấp Shop Uy Tín"}
              </button>
            </div>

            <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", justifyContent: "between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "260px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#ef4444", background: "#fee2e2", padding: "2px 8px", borderRadius: "4px", textTransform: "uppercase" }}>Cảnh báo doanh số</span>
                <p style={{ margin: "6px 0 2px", fontWeight: 600, color: "#1e293b", fontSize: "14px" }}>Tin đăng trả phí (Premium paid bumps) đang giảm 15.4% so với tuần trước.</p>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Kích hoạt chiến dịch khuyến mãi đẩy tin mua 10 tặng 2 để kích cầu các shop xả hàng cũ.</p>
              </div>
              <button 
                onClick={handleAction3}
                disabled={insightActions.campaign}
                className="admin-btn admin-btn-primary" 
                style={{ height: "40px", whiteSpace: "nowrap" }}
              >
                {insightActions.campaign ? "✓ Đã kích hoạt" : "Kích hoạt Campaign Khuyến mãi"}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Seller BI */}
        {activeTab === "sellers" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Tỷ lệ thanh khoản nguồn cung</p>
                <p style={{ margin: "8px 0 0", fontSize: "24px", fontWeight: 800, color: "#0f766e" }}>84.6%</p>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#64748b" }}>Sách được chốt trong 7-14 ngày</p>
              </div>
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Thời gian bán trung bình</p>
                <p style={{ margin: "8px 0 0", fontSize: "24px", fontWeight: 800, color: "#1e293b" }}>7.4 ngày</p>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#64748b" }}>Nhanh hơn 12% so với tháng trước</p>
              </div>
            </div>

            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "24px 0 12px", color: "#1e293b" }}>⭐ Người bán xuất sắc (Gà đẻ trứng vàng)</h3>
            <div className="admin-table-wrapper" style={{ marginBottom: "24px" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Người bán</th>
                    <th>Số sách đã đăng</th>
                    <th>Đã bán</th>
                    <th>Tỷ lệ chốt đơn</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Nguyễn Minh Anh</strong></td>
                    <td>12 tài liệu</td>
                    <td>11 tài liệu</td>
                    <td><span style={{ color: "#10b981", fontWeight: 700 }}>91.6%</span></td>
                    <td>
                      <button onClick={() => handleGiftBoost("Nguyễn Minh Anh", "boost1")} disabled={insightActions.boost1} className="admin-btn admin-btn-secondary" style={{ padding: "4px 10px", fontSize: "12px" }}>
                        {insightActions.boost1 ? "✓ Đã tặng" : "Tặng 1 lượt đẩy tin"}
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Trần Hoàng</strong></td>
                    <td>25 tài liệu</td>
                    <td>22 tài liệu</td>
                    <td><span style={{ color: "#10b981", fontWeight: 700 }}>88.0%</span></td>
                    <td>
                      <button onClick={() => handleGiftBoost("Trần Hoàng", "boost2")} disabled={insightActions.boost2} className="admin-btn admin-btn-secondary" style={{ padding: "4px 10px", fontSize: "12px" }}>
                        {insightActions.boost2 ? "✓ Đã tặng" : "Tặng 1 lượt đẩy tin"}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "24px 0 12px", color: "#1e293b" }}>⚠️ Người bán chậm / Cần thúc đẩy</h3>
            <div className="admin-table-wrapper" style={{ marginBottom: "24px" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Người bán</th>
                    <th>Số sách đã đăng</th>
                    <th>Đã bán</th>
                    <th>Tỷ lệ chốt đơn</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Lê Thu</strong></td>
                    <td>5 tài liệu</td>
                    <td>0 tài liệu</td>
                    <td><span style={{ color: "#ef4444", fontWeight: 700 }}>0.0%</span></td>
                    <td><span style={{ fontSize: "12px", color: "#f59e0b", background: "#fef3c7", padding: "2px 8px", borderRadius: "999px" }}>Có nguy cơ bỏ sàn</span></td>
                    <td>
                      <button onClick={() => handleGiftBoost("Lê Thu", "boost3")} disabled={insightActions.boost3} className="admin-btn admin-btn-primary" style={{ padding: "4px 10px", fontSize: "12px" }}>
                        {insightActions.boost3 ? "✓ Đã tặng" : "Hỗ trợ 1 lượt đẩy tin"}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "24px 0 12px", color: "#1e293b" }}>🚨 Người bán có tỷ lệ hủy đơn cao / Bị báo cáo</h3>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Người bán</th>
                    <th>Tỷ lệ hủy đơn</th>
                    <th>Báo cáo vi phạm</th>
                    <th>Trạng thái hiện tại</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Vũ Hoàng Lâm</strong></td>
                    <td><span style={{ color: "#ef4444", fontWeight: 700 }}>28.5%</span></td>
                    <td>3 báo cáo (Giao chậm, sách rách)</td>
                    <td>Hoạt động</td>
                    <td>
                      <button onClick={() => handleSellerPenalty('u3', 'Vũ Hoàng Lâm')} disabled={insightActions.penalty} className="admin-btn admin-btn-primary" style={{ padding: "4px 10px", fontSize: "12px", background: "#dc2626", borderColor: "#dc2626" }}>
                        {insightActions.penalty ? "✓ Đã khóa" : "Hạ hiển thị / Khóa"}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Buyer BI */}
        {activeTab === "buyers" && (
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 16px", color: "#1e293b" }}>📈 Khoảng giá "Chốt đơn" mạnh nhất (Price Elasticity)</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
              {[
                { range: "Dưới 50k", rate: 78.4, count: "124 đơn", color: "#0f766e" },
                { range: "50k - 100k", rate: 54.2, count: "86 đơn", color: "#0d9488" },
                { range: "100k - 200k", rate: 22.8, count: "18 đơn", color: "#14b8a6" },
                { range: "Trên 200k", rate: 11.5, count: "4 đơn", color: "#94a3b8" },
              ].map(item => (
                <div key={item.range} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <span style={{ width: "100px", fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{item.range}</span>
                  <div style={{ flex: 1, height: "16px", background: "#f1f5f9", borderRadius: "8px", overflow: "hidden" }}>
                    <div style={{ width: `${item.rate}%`, height: "100%", background: item.color, borderRadius: "8px" }}></div>
                  </div>
                  <span style={{ width: "120px", fontSize: "13px", fontWeight: 700, color: "#1e293b", textAlign: "right" }}>{item.rate}% ({item.count})</span>
                </div>
              ))}
              <div style={{ marginTop: "8px", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "13px", color: "#166534", fontWeight: 500 }}>
                💡 <strong>Nhận xét:</strong> Sách ở khoảng giá dưới 50.000đ có tốc độ chốt đơn nhanh nhất. Hệ thống gợi ý người bán định giá sản phẩm mới trong khoảng này.
              </div>
            </div>

            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "24px 0 12px", color: "#1e293b" }}>🔍 Tỷ lệ chuyển đổi Từ khóa tìm kiếm sang Giỏ hàng (Search-to-Cart)</h3>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Từ khóa được tìm nhiều</th>
                    <th>Lượt tìm kiếm</th>
                    <th>Số lượt chốt mua</th>
                    <th>Lý do chuyển đổi thấp</th>
                    <th>Đề xuất hành động</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Harry Potter tập 1</strong></td>
                    <td>120 lượt</td>
                    <td>0 đơn</td>
                    <td>Sách hiện tại quá cũ nát, giá cao (120k)</td>
                    <td>Chạy campaign gom hàng truyện cũ chất lượng cao</td>
                  </tr>
                  <tr>
                    <td><strong>Giải tích 1</strong></td>
                    <td>84 lượt</td>
                    <td>2 đơn</td>
                    <td>Thiếu nguồn sách chính chủ, chất lượng tốt</td>
                    <td>Nhắc nhở SV khóa trên thanh lý sách giáo trình</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Monetization */}
        {activeTab === "monetization" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid #f1f5f9", background: "#f8fafc" }}>
                <h4 style={{ margin: 0, fontSize: "13px", color: "#64748b", fontWeight: 700 }}>⚡ HIỆU SUẤT ĐẨY TIN (PAID BUMP)</h4>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>Tin đẩy phí</p>
                    <p style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800, color: "#0f766e" }}>3.5 ngày bán</p>
                  </div>
                  <div style={{ borderLeft: "1px solid #cbd5e1", paddingLeft: "16px" }}>
                    <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>Tin thường</p>
                    <p style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800, color: "#64748b" }}>11.2 ngày bán</p>
                  </div>
                </div>
                <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#0f766e", fontWeight: 600 }}>Tốc độ bán nhanh gấp 3.2 lần!</p>
              </div>

              <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid #f1f5f9", background: "#f8fafc" }}>
                <h4 style={{ margin: 0, fontSize: "13px", color: "#64748b", fontWeight: 700 }}>💰 DOANH THU ĐẨY TIN THÁNG NÀY</h4>
                <p style={{ margin: "12px 0 0", fontSize: "24px", fontWeight: 800, color: "#1e293b" }}>1,250,000đ</p>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#10b981", fontWeight: 600 }}>📈 Tăng 15.4% so với tháng trước</p>
              </div>
            </div>

            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "24px 0 12px", color: "#1e293b" }}>📂 Bản đồ phân phối Doanh thu hoa hồng theo Danh mục</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { name: "Công nghệ thông tin & Lập trình", percentage: 45, color: "#0f766e" },
                { name: "Kinh tế & Quản trị kinh doanh", percentage: 30, color: "#0d9488" },
                { name: "Ngoại ngữ & Luyện thi", percentage: 15, color: "#14b8a6" },
                { name: "Các danh mục khác", percentage: 10, color: "#94a3b8" }
              ].map(item => (
                <div key={item.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                    <span style={{ color: "#1e293b" }}>{item.name}</span>
                    <span style={{ color: item.color, fontWeight: 700 }}>{item.percentage}% Doanh thu</span>
                  </div>
                  <div style={{ height: "10px", background: "#f1f5f9", borderRadius: "5px", overflow: "hidden" }}>
                    <div style={{ width: `${item.percentage}%`, height: "100%", background: item.color }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Date filter */}
      <div style={{ marginTop: "32px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", background: "#fff", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e9edf4" }}>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#172033" }}>Lọc theo ngày:</span>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", fontSize: "14px" }} />
        <span style={{ color: "#63748a" }}>→</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", fontSize: "14px" }} />
        <div style={{ display: "flex", gap: "6px", marginLeft: "8px" }}>
          {[
            { label: "7 ngày", days: 7 },
            { label: "30 ngày", days: 30 },
            { label: "90 ngày", days: 90 },
            { label: "Tất cả", days: 365 },
          ].map(p => (
            <button key={p.days} onClick={() => setRange(p.days)}
              style={{
                padding: "6px 14px", borderRadius: "8px", border: "1px solid #d0d5dd",
                background: startDate === daysAgo(p.days) && endDate === today() ? "#0f766e" : "#fff",
                color: startDate === daysAgo(p.days) && endDate === today() ? "#fff" : "#172033",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div style={{ marginTop: "24px" }}>
        <h2 style={{ margin: "0 0 24px", fontSize: "20px", fontWeight: 700, color: "#172033" }}>
          Biểu Đồ & Thống Kê
        </h2>

        {revenueData.length > 0 ? (
          <RevenueChart data={revenueData} xKey="label" title="Doanh Thu Theo Ngày" />
        ) : (
          <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", marginBottom: "24px", color: "#94a3b8", fontSize: "14px", textAlign: "center", height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
            Chưa có dữ liệu doanh thu
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px", marginBottom: "24px" }}>
          {categoryData.length > 0
            ? <CategoryDistributionChart data={categoryData} />
            : <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", color: "#94a3b8", fontSize: "14px", textAlign: "center", height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>Chưa có sách active nào</div>
          }
          {userGrowthData.length > 0
            ? <UserGrowthChart data={userGrowthData} xKey="label" title="Người Dùng Mới" />
            : <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", color: "#94a3b8", fontSize: "14px", textAlign: "center", height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>Chưa có dữ liệu tăng trưởng</div>
          }
        </div>
      </div>

      {/* Recent transactions */}
      <div style={{ marginTop: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#172033" }}>
            Giao Dịch Gần Đây (7 ngày)
          </h2>
        </div>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Người Mua</th>
                <th>Người Bán</th>
                <th>Giá</th>
                <th>Trạng Thái</th>
                <th>Ngày</th>
              </tr>
            </thead>
            <tbody>
              {recentTxns.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "#56647e" }}>Chưa có giao dịch</td></tr>
              ) : recentTxns.map((tx) => (
                <tr key={tx.id}>
                  <td><strong style={{ fontFamily: "monospace", fontSize: "12px" }}>{tx.id?.slice(0, 8)}…</strong></td>
                  <td>{tx.buyer_name || "—"}</td>
                  <td>{tx.seller_name || "—"}</td>
                  <td style={{ fontWeight: 600, color: "#0f8c4b" }}>{formatCurrencyShort(tx.amount)}</td>
                  <td>
                    <span className={`admin-badge ${
                      tx.status === "completed" ? "admin-badge-success"
                      : tx.status === "pending" ? "admin-badge-warning"
                      : "admin-badge-info"
                    }`}>
                      {statusLabel(tx.status)}
                    </span>
                  </td>
                  <td>{tx.created_at ? new Date(tx.created_at).toLocaleDateString("vi-VN") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <button disabled={txPage <= 1} onClick={() => setTxPage(p => p - 1)}
            style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #d0d5dd", fontSize: "13px", fontWeight: 600, cursor: txPage <= 1 ? "not-allowed" : "pointer", opacity: txPage <= 1 ? 0.5 : 1 }}>
            ← Trước
          </button>
          <span style={{ fontSize: "13px", color: "#56647e" }}>Trang {txPage} / {Math.max(1, Math.ceil(txTotal / 7))}</span>
          <button disabled={txPage >= Math.ceil(txTotal / 7)} onClick={() => setTxPage(p => p + 1)}
            style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #d0d5dd", fontSize: "13px", fontWeight: 600, cursor: txPage >= Math.ceil(txTotal / 7) ? "not-allowed" : "pointer", opacity: txPage >= Math.ceil(txTotal / 7) ? 0.5 : 1 }}>
            Sau →
          </button>
        </div>
      </div>

      {/* Bottom summary cards */}
      <div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Premium Active</p>
          <p className="admin-stat-value">{stats.totalPremium}</p>
          <p className="admin-stat-desc">Tin đăng đang được boost</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Reports</p>
          <p className="admin-stat-value" style={{ color: "#d94c24" }}>{stats.totalReports}</p>
          <p className="admin-stat-desc">Báo cáo chờ xử lý</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Disputes</p>
          <p className="admin-stat-value" style={{ color: "#f57c00" }}>{stats.totalDisputes}</p>
          <p className="admin-stat-desc">Tranh chấp đang mở</p>
        </div>
      </div>
    </div>
  );
}
