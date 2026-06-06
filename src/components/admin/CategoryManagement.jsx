import { useEffect, useState } from "react";
import { getCategories, createCategory, deleteCategory } from "../../services/admin";

export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load categories from Supabase
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCategories();
        setCategories(data || []);
      } catch (err) {
        console.error("Failed to load categories:", err);
        setError("Không thể tải danh mục");
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  const handleAdd = async () => {
    if (newCat.trim()) {
      try {
        const newId = `cat-${Date.now()}`;
        await createCategory({
          id: newId,
          name: newCat,
          accent: "blue"
        });
        setNewCat("");
        // Refresh categories
        const data = await getCategories();
        setCategories(data || []);
      } catch (err) {
        console.error("Failed to create category:", err);
        setError("Không thể tạo danh mục");
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCategory(id);
      // Refresh categories
      const data = await getCategories();
      setCategories(data || []);
    } catch (err) {
      console.error("Failed to delete category:", err);
      setError("Không thể xóa danh mục");
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <h1>Quản Lý Danh Mục</h1>
        </div>
        <div style={{ textAlign: "center", padding: "40px", color: "#56647e" }}>
          Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  if (error && categories.length === 0) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <h1>Quản Lý Danh Mục</h1>
        </div>
        <div style={{ textAlign: "center", padding: "40px", color: "#dc2626" }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Quản Lý Danh Mục</h1>
      </div>

      {/* Add Category */}
      <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", marginBottom: "24px", display: "flex", gap: "12px" }}>
        <input 
          type="text" 
          placeholder="Tên danh mục mới..."
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          className="admin-filter-input"
          style={{ flex: 1 }}
        />
        <button className="admin-btn admin-btn-primary" onClick={handleAdd}>Thêm</button>
      </div>

      {/* Categories Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tên Danh Mục</th>
              <th>Số Sách</th>
              <th>Thứ Tự</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td><strong>{cat.name}</strong></td>
                <td>{cat.books}</td>
                <td>{cat.order}</td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="admin-btn admin-btn-secondary" style={{ padding: "6px 10px", fontSize: "12px" }}>
                      Sửa
                    </button>
                    <button 
                      className="admin-btn admin-btn-danger" 
                      style={{ padding: "6px 10px", fontSize: "12px" }}
                      onClick={() => handleDelete(cat.id)}
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
