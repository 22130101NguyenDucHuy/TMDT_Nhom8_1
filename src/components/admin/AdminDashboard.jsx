import { useMemo, useState } from "react";
import { transactions } from "../../data/siteData";
import { RevenueChart, CategoryDistributionChart, UserGrowthChart } from "./AdminCharts";

const CATEGORY_LABELS = {
  economics: "Kinh Tế",
  law: "Luật",
  engineering: "Kỹ Thuật",
  language: "Ngoại Ngữ",
  agriculture: "Nông Nghiệp",
  sociology: "Xã Hội Học",
};

const CATEGORY_COLORS = {
  economics: "#0f766e",
  law: "#14b8a6",
  engineering: "#a78bfa",
  language: "#06b6d4",
  agriculture: "#059669",
  sociology: "#64748b",
};

function parseDate(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetweenInclusive(start, end) {
  const diffMs = parseDate(end).getTime() - parseDate(start).getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

function formatDateVi(isoDate) {
  const date = parseDate(isoDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function formatCurrencyShort(value) {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  return `${Math.round(value / 1000)}K`;
}

function formatDateLabel(dateString) {
  const date = parseDate(dateString);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthNumber) {
  return `T${monthNumber}`;
}

function generateAnalyticsData() {
  const start = parseDate("2025-01-01");
  const end = parseDate("2026-04-15");
  const dayMs = 24 * 60 * 60 * 1000;
  const rows = [];
  const categoryKeys = Object.keys(CATEGORY_LABELS);

  for (let timestamp = start.getTime(), i = 0; timestamp <= end.getTime(); timestamp += dayMs, i += 1) {
    const date = new Date(timestamp);
    const isoDate = date.toISOString().slice(0, 10);

    const transactionsCount = 4 + ((i * 7) % 18);
    const listingCount = 2 + ((i * 5) % 10);
    const users = 1 + ((i * 3) % 7);
    const seasonalBoost = date.getMonth() === 2 ? 45000 : 0;
    const revenue = transactionsCount * 95000 + listingCount * 25000 + (i % 6) * 12000 + seasonalBoost;

    rows.push({
      date: isoDate,
      category: categoryKeys[i % categoryKeys.length],
      transactions: transactionsCount,
      listings: listingCount,
      users,
      revenue,
    });
  }

  return rows;
}

function aggregateByPeriod(data, granularity) {
  const grouped = new Map();

  data.forEach((item) => {
    const date = parseDate(item.date);
    let key = item.date;
    let label = formatDateLabel(item.date);

    if (granularity === "month") {
      key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      label = `${monthLabel(date.getMonth() + 1)}/${date.getFullYear()}`;
    }

    if (!grouped.has(key)) {
      grouped.set(key, { label, revenue: 0, users: 0 });
    }

    const bucket = grouped.get(key);
    bucket.revenue += item.revenue;
    bucket.users += item.users;
  });

  return [...grouped.values()];
}

function getPresetRange(preset, latestIsoDate) {
  const latest = parseDate(latestIsoDate);

  if (preset === "today") {
    const value = formatIsoDate(latest);
    return { start: value, end: value, label: "Hôm nay" };
  }

  if (preset === "week") {
    // Tính từ thứ 2 tuần này đến ngày hiện tại
    const dayOfWeek = latest.getDay() === 0 ? 7 : latest.getDay(); // CN=0 thành 7
    const monday = addDays(latest, -(dayOfWeek - 1));
    return { start: formatIsoDate(monday), end: formatIsoDate(latest), label: "Tuần này" };
  }

  if (preset === "month") {
    const start = new Date(latest.getFullYear(), latest.getMonth(), 1);
    return { start: formatIsoDate(start), end: formatIsoDate(latest), label: "Tháng này" };
  }

  const start = new Date(latest.getFullYear(), 0, 1);
  return { start: formatIsoDate(start), end: formatIsoDate(latest), label: "Năm nay" };
}

function filterDataByRange(data, start, end) {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (startDate > endDate) {
    return [];
  }

  return data.filter((item) => {
    const current = parseDate(item.date);
    return current >= startDate && current <= endDate;
  });
}

function sumMetrics(data) {
  return {
    users: data.reduce((sum, item) => sum + item.users, 0),
    listings: data.reduce((sum, item) => sum + item.listings, 0),
    transactions: data.reduce((sum, item) => sum + item.transactions, 0),
    revenue: data.reduce((sum, item) => sum + item.revenue, 0),
  };
}

function getTrend(current, previous) {
  if (previous <= 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

const analyticsData = generateAnalyticsData();

export default function AdminDashboard() {
  const latestDate = analyticsData[analyticsData.length - 1]?.date || "2026-04-15";
  const [activePreset, setActivePreset] = useState("week");
  const [draftRange, setDraftRange] = useState({
    start: "2026-03-01",
    end: latestDate,
  });
  const [customRange, setCustomRange] = useState({
    start: "2026-03-01",
    end: latestDate,
  });

  const activeRange = useMemo(() => {
    if (activePreset === "custom") {
      return {
        start: customRange.start,
        end: customRange.end,
        label: "Tùy chọn",
      };
    }

    return getPresetRange(activePreset, latestDate);
  }, [activePreset, customRange.end, customRange.start, latestDate]);

  const filteredData = useMemo(
    () => filterDataByRange(analyticsData, activeRange.start, activeRange.end),
    [activeRange.end, activeRange.start]
  );

  const rangeDays = daysBetweenInclusive(activeRange.start, activeRange.end);
  const chartGranularity = rangeDays > 120 ? "month" : "day";

  const currentMetrics = sumMetrics(filteredData);
  const totalUsers = currentMetrics.users;
  const totalListings = currentMetrics.listings;
  const totalTransactions = currentMetrics.transactions;
  const totalRevenue = currentMetrics.revenue;

  const previousEnd = formatIsoDate(addDays(parseDate(activeRange.start), -1));
  const previousStart = formatIsoDate(addDays(parseDate(previousEnd), -(rangeDays - 1)));
  const previousData = filterDataByRange(analyticsData, previousStart, previousEnd);
  const previousMetrics = sumMetrics(previousData);

  const trends = {
    users: getTrend(totalUsers, previousMetrics.users),
    listings: getTrend(totalListings, previousMetrics.listings),
    transactions: getTrend(totalTransactions, previousMetrics.transactions),
    revenue: getTrend(totalRevenue, previousMetrics.revenue),
  };

  const revenueData = aggregateByPeriod(filteredData, chartGranularity);
  const userGrowthData = aggregateByPeriod(filteredData, chartGranularity);

  const categoryMap = filteredData.reduce((map, item) => {
    map.set(item.category, (map.get(item.category) || 0) + item.listings);
    return map;
  }, new Map());

  const categoryData = [...categoryMap.entries()].map(([key, value]) => ({
    name: CATEGORY_LABELS[key] || key,
    value,
    color: CATEGORY_COLORS[key] || "#0f69ff",
  }));

  const rangeDescription = `${formatDateVi(activeRange.start)} - ${formatDateVi(activeRange.end)}`;

  function applyCustomRange() {
    if (!draftRange.start || !draftRange.end) {
      return;
    }
    if (parseDate(draftRange.start) > parseDate(draftRange.end)) {
      return;
    }
    setCustomRange(draftRange);
  }

  function resetCustomRange() {
    const next = { start: "2026-03-01", end: latestDate };
    setDraftRange(next);
    setCustomRange(next);
  }

  function trendLabel(value) {
    if (value === null) {
      return "Không có dữ liệu kỳ trước";
    }
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}% so với kỳ trước`;
  }

  const recentTransactions = [...transactions.current, ...transactions.completed].slice(0, 5);

  const presets = [
    { key: "today", label: "Hôm nay" },
    { key: "week", label: "Tuần này" },
    { key: "month", label: "Tháng này" },
    { key: "year", label: "Năm nay" },
    { key: "custom", label: "Tùy chọn" },
  ];

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Dashboard</h1>
      </div>

      <div className="admin-time-panel">
        <div className="admin-time-presets">
          {presets.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={`admin-time-chip ${activePreset === preset.key ? "active" : ""}`}
              onClick={() => setActivePreset(preset.key)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {activePreset === "custom" && (
          <div className="admin-time-custom">
            <input
              className="admin-filter-input"
              type="date"
              value={draftRange.start}
              onChange={(event) => setDraftRange((prev) => ({ ...prev, start: event.target.value }))}
            />
            <input
              className="admin-filter-input"
              type="date"
              value={draftRange.end}
              onChange={(event) => setDraftRange((prev) => ({ ...prev, end: event.target.value }))}
            />
            <button type="button" className="admin-btn admin-btn-primary" onClick={applyCustomRange}>
              Áp dụng
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={resetCustomRange}>
              Đặt lại
            </button>
          </div>
        )}
      </div>

      <div className="admin-time-summary">
        <p className="admin-time-summary-main">
          Đang xem <strong>{activeRange.label}</strong>: {rangeDescription}
        </p>
        <p className="admin-time-summary-sub">So sánh với kỳ trước: {formatDateVi(previousStart)} - {formatDateVi(previousEnd)}</p>
      </div>

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <p className="admin-stat-label">Người Dùng Mới</p>
          <p className="admin-stat-value">{totalUsers}</p>
          <p className="admin-stat-desc">{trendLabel(trends.users)}</p>
        </div>

        <div className="admin-stat-card">
          <p className="admin-stat-label">Listing Mới</p>
          <p className="admin-stat-value">{totalListings}</p>
          <p className="admin-stat-desc">{trendLabel(trends.listings)}</p>
        </div>

        <div className="admin-stat-card">
          <p className="admin-stat-label">Giao Dịch</p>
          <p className="admin-stat-value">{totalTransactions}</p>
          <p className="admin-stat-desc">{trendLabel(trends.transactions)}</p>
        </div>

        <div className="admin-stat-card">
          <p className="admin-stat-label">Doanh Thu</p>
          <p className="admin-stat-value">{formatCurrencyShort(totalRevenue)}</p>
          <p className="admin-stat-desc">{trendLabel(trends.revenue)}</p>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ marginTop: "40px" }}>
        <h2 style={{ margin: "0 0 24px", fontSize: "20px", fontWeight: 700, color: "#172033" }}>
          Biểu Đồ & Thống Kê
        </h2>

        <RevenueChart
          data={revenueData}
          xKey="label"
          title={chartGranularity === "month" ? "Doanh Thu Theo Tháng" : "Doanh Thu Theo Ngày"}
        />
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px", marginBottom: "24px" }}>
          <CategoryDistributionChart data={categoryData} />
          <UserGrowthChart
            data={userGrowthData}
            xKey="label"
            title={chartGranularity === "month" ? "Người Dùng Mới Theo Tháng" : "Người Dùng Mới Theo Ngày"}
          />
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={{ marginTop: "32px" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: "20px", fontWeight: 700, color: "#172033" }}>
          Giao Dịch Gần Đây
        </h2>
        
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sách</th>
                <th>Người Mua</th>
                <th>Giá</th>
                <th>Trạng Thái</th>
                <th>Ngày</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx, idx) => (
                <tr key={idx}>
                  <td><strong>{tx.book}</strong></td>
                  <td>{tx.partner}</td>
                  <td style={{ fontWeight: 600, color: "#0f8c4b" }}>{tx.amount}</td>
                  <td>
                    <span className={`admin-badge ${tx.status.includes("Hoàn") ? "admin-badge-success" : "admin-badge-info"}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td>{tx.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Premium Active</p>
          <p className="admin-stat-value">45</p>
          <p className="admin-stat-desc">Người dùng Premium</p>
        </div>

        <div className="admin-stat-card">
          <p className="admin-stat-label">Reports</p>
          <p className="admin-stat-value" style={{ color: "#d94c24" }}>12</p>
          <p className="admin-stat-desc">Báo cáo chờ xử lý</p>
        </div>

        <div className="admin-stat-card">
          <p className="admin-stat-label">Disputes</p>
          <p className="admin-stat-value" style={{ color: "#f57c00" }}>8</p>
          <p className="admin-stat-desc">Tranh chấp chưa giải quyết</p>
        </div>
      </div>
    </div>
  );
}
