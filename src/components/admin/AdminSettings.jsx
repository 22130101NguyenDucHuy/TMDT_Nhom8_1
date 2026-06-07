import { useEffect, useState } from "react";
import { getAllSettings, updateSetting } from "../../services/admin";

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await getAllSettings();
        setSettings(data);
      } catch (err) {
        setError("Không thể tải cài đặt");
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const keys = ["app_name", "admin_email", "commission_rate", "urgent_price", "combo_price"];
      for (const key of keys) {
        if (settings[key] !== undefined) {
          await updateSetting(key, settings[key]);
        }
      }
      setError(null);
    } catch (err) {
      setError("Không thể lưu cài đặt");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-header"><h1>Cài Đặt Hệ Thống</h1></div>
        <div style={{ textAlign: "center", padding: "40px", color: "#56647e" }}>Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Cài Đặt Hệ Thống</h1>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      <div style={{ maxWidth: "800px" }}>
        {/* General Settings */}
        <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 700 }}>Cài Đặt Chung</h2>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Tên Ứng Dụng</label>
            <input
              type="text"
              value={settings._app_name || settings.app_name || ""}
              onChange={e => setSettings(s => ({ ...s, app_name: e.target.value, _app_name: e.target.value }))}
              className="admin-filter-input"
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Email Admin</label>
            <input
              type="email"
              value={settings._admin_email || settings.admin_email || ""}
              onChange={e => setSettings(s => ({ ...s, admin_email: e.target.value, _admin_email: e.target.value }))}
              className="admin-filter-input"
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Phí Giao Dịch (%)</label>
            <input
              type="number"
              value={settings._commission_rate || settings.commission_rate || "5"}
              onChange={e => setSettings(s => ({ ...s, commission_rate: e.target.value, _commission_rate: e.target.value }))}
              className="admin-filter-input"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Premium Settings */}
        <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 700 }}>Cấu Hình Premium</h2>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Giá "Nhãn Bán Gấp" (VNĐ)</label>
            <input
              type="number"
              value={settings._urgent_price || settings.urgent_price || "10000"}
              onChange={e => setSettings(s => ({ ...s, urgent_price: e.target.value, _urgent_price: e.target.value }))}
              className="admin-filter-input"
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Giá "Combo 14 Ngày" (VNĐ)</label>
            <input
              type="number"
              value={settings._combo_price || settings.combo_price || "39000"}
              onChange={e => setSettings(s => ({ ...s, combo_price: e.target.value, _combo_price: e.target.value }))}
              className="admin-filter-input"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Save Button */}
        <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
          <button
            className="admin-btn admin-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Lưu Cài Đặt"}
          </button>
          <button className="admin-btn admin-btn-secondary">Hủy</button>
        </div>
      </div>
    </div>
  );
}
