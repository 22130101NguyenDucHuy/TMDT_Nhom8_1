import { useMemo, useState, useEffect } from "react";
import { getTransactions, getDashboardStats, getAnalytics, getCategoryStats } from "../../services/admin";
import { RevenueChart, CategoryDistributionChart, UserGrowthChart } from "./AdminCharts";

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

  const fetchAll = async (sd, ed, tPage) => {
    setLoading(true);
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
  useEffect(() => { if (!loading) fetchAll(startDate, endDate, txPage); }, [txPage]);

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
