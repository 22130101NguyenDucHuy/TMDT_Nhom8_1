import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function EmptyChartState() {
  return (
    <div
      style={{
        height: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#63718a",
        fontSize: "14px",
        background: "#f9fbfd",
        borderRadius: "10px",
      }}
    >
      Không có dữ liệu cho bộ lọc đã chọn.
    </div>
  );
}

export function RevenueChart({ data, title = "Doanh Thu Theo Thời Gian", xKey = "label" }) {
  return (
    <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", marginBottom: "24px" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700, color: "#0f766e" }}>{title}</h3>
      {data.length ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(92, 109, 140, 0.1)" />
            <XAxis dataKey={xKey} stroke="#9a9a9a" />
            <YAxis stroke="#9a9a9a" />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid rgba(92, 109, 140, 0.14)", borderRadius: "8px" }}
              formatter={(value) => `${(value / 1000).toFixed(0)}K đ`}
            />
            <Line type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={3} dot={{ fill: "#06b6d4", r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChartState />
      )}
    </div>
  );
}

const PIE_COLORS = ["#0f766e","#14b8a6","#8b5cf6","#f59e0b","#ef4444","#3b82f6","#06b6d4","#10b981","#f97316","#ec4899"];

export function CategoryDistributionChart({ data }) {
  return (
    <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", marginBottom: "24px" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700, color: "#0f766e" }}>Phân Bố Sách Theo Danh Mục</h3>
      {data.length ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, _, props) => [`${value} cuốn`, props.payload.name]} />
            <Legend formatter={(value) => value} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChartState />
      )}
    </div>
  );
}

export function UserGrowthChart({ data, title = "Tăng Trưởng Người Dùng", xKey = "label" }) {
  return (
    <div style={{ background: "#fff", padding: "20px", borderRadius: "12px" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700, color: "#0f766e" }}>{title}</h3>
      {data.length ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(92, 109, 140, 0.1)" />
            <XAxis dataKey={xKey} stroke="#9a9a9a" />
            <YAxis stroke="#9a9a9a" />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid rgba(92, 109, 140, 0.14)", borderRadius: "8px" }}
              formatter={(value) => `${value} người`}
            />
            <defs>
              <linearGradient id="userBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <Bar dataKey="users" fill="url(#userBarGrad)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChartState />
      )}
    </div>
  );
}
