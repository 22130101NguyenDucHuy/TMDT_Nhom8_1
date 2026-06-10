import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getCategories, createCategory, updateCategory, deleteCategory, getCategoryStats } from "../../services/admin";

// ─── Vietnamese slugify ───────────────────────────────────────────────────────
function slugify(str) {
  const map = {
    'à':'a','á':'a','ả':'a','ã':'a','ạ':'a','ă':'a','ắ':'a','ặ':'a','ằ':'a','ẳ':'a','ẵ':'a',
    'â':'a','ấ':'a','ầ':'a','ẩ':'a','ẫ':'a','ậ':'a','đ':'d',
    'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e','ê':'e','ế':'e','ề':'e','ể':'e','ễ':'e','ệ':'e',
    'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
    'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o','ô':'o','ố':'o','ồ':'o','ổ':'o','ỗ':'o','ộ':'o',
    'ơ':'o','ớ':'o','ờ':'o','ở':'o','ỡ':'o','ợ':'o',
    'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u','ư':'u','ứ':'u','ừ':'u','ử':'u','ữ':'u','ự':'u',
    'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y',
  };
  return str
    .toLowerCase()
    .split('')
    .map(c => map[c] || c)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// ─── Accent colour map ────────────────────────────────────────────────────────
const ACCENT_OPTIONS = ['blue','green','red','orange','purple','cyan','indigo','emerald','slate'];

const ACCENT_BADGE = {
  blue:    'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  green:   'bg-green-100 text-green-700 ring-1 ring-green-200',
  red:     'bg-red-100 text-red-700 ring-1 ring-red-200',
  orange:  'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
  purple:  'bg-purple-100 text-purple-700 ring-1 ring-purple-200',
  cyan:    'bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200',
  indigo:  'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200',
  emerald: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  slate:   'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
};

// ─── Default new-form state ───────────────────────────────────────────────────
const EMPTY_FORM = { name: '', accent: 'blue', order: 1 };

export default function CategoryManagement() {
  const { showToast } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookCounts, setBookCounts] = useState({});

  // Add-form
  const [form, setForm] = useState(EMPTY_FORM);

  // Edit modal
  const [editCat, setEditCat] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── load ────────────────────────────────────────────────────────────────────
  const load = async (background) => {
    if (!background) setLoading(true);
    try {
      const [data, counts] = await Promise.all([
        getCategories(),
        getCategoryStats(),
      ]);
      setCategories(data || []);
      setBookCounts(counts || {});
    } catch (err) {
      console.error(err);
      showToast('Không thể tải danh mục', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Keep default order in sync with current list length
  useEffect(() => {
    setForm(f => ({ ...f, order: categories.length + 1 }));
  }, [categories.length]);

  // ── add ─────────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.name.trim()) {
      showToast('Vui lòng nhập tên danh mục', 'error');
      return;
    }
    try {
      setSaving(true);
      const slug = slugify(form.name.trim());
      const id   = slug || `cat-${Date.now()}`;
      await createCategory({
        id,
        name:  form.name.trim(),
        slug,
        accent: form.accent,
        order:  Number(form.order) || categories.length + 1,
        is_active: true,
      });
      setForm(EMPTY_FORM);
      await load(true);
      showToast('Đã thêm danh mục thành công');
    } catch (err) {
      console.error(err);
      showToast('Không thể thêm danh mục', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── save edit ────────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editCat?.name?.trim()) {
      showToast('Vui lòng nhập tên danh mục', 'error');
      return;
    }
    try {
      setSaving(true);
      const updated = await updateCategory(editCat.id, {
        name:      editCat.name.trim(),
        accent:    editCat.accent,
        order:     Number(editCat.order),
        is_active: editCat.is_active,
      });
      setCategories(prev => prev.map(c => c.id === editCat.id ? { ...c, ...updated } : c));
      setEditCat(null);
      showToast('Đã cập nhật danh mục');
    } catch (err) {
      console.error(err);
      showToast('Không thể cập nhật danh mục', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── toggle active ────────────────────────────────────────────────────────────
  const handleToggleActive = async (cat) => {
    try {
      await updateCategory(cat.id, { is_active: !cat.is_active });
      setCategories(prev =>
        prev.map(c => c.id === cat.id ? { ...c, is_active: !c.is_active } : c)
      );
      showToast(`Đã ${!cat.is_active ? 'kích hoạt' : 'ẩn'} danh mục`);
    } catch (err) {
      console.error(err);
      showToast('Không thể cập nhật trạng thái', 'error');
    }
  };

  // ── delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (cat) => {
    if (!window.confirm(`Bạn có chắc muốn xóa danh mục "${cat.name}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await deleteCategory(cat.id);
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      showToast('Đã xóa danh mục');
    } catch (err) {
      console.error(err);
      showToast('Không thể xóa danh mục', 'error');
    }
  };

  // ── derived slug preview ─────────────────────────────────────────────────────
  const slugPreview = form.name ? slugify(form.name) : '';

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <h1>Quản Lý Danh Mục</h1>
        <p className="text-sm text-slate-500 mt-0.5">{categories.length} danh mục</p>
      </div>

      {/* ── Add form ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Thêm danh mục mới</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Name */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Tên danh mục <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Ví dụ: Công nghệ thông tin"
              className="admin-filter-input w-full"
            />
            {slugPreview && (
              <p className="text-xs text-slate-400 mt-1 truncate">slug: <span className="font-mono text-slate-500">{slugPreview}</span></p>
            )}
          </div>

          {/* Accent */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Màu accent</label>
            <select
              value={form.accent}
              onChange={e => setForm(f => ({ ...f, accent: e.target.value }))}
              className="admin-filter-input w-full"
            >
              {ACCENT_OPTIONS.map(a => (
                <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Order */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Thứ tự</label>
            <input
              type="number"
              min={1}
              value={form.order}
              onChange={e => setForm(f => ({ ...f, order: e.target.value }))}
              className="admin-filter-input w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            className="admin-btn admin-btn-primary"
            onClick={handleAdd}
            disabled={saving}
          >
            {saving ? 'Đang lưu…' : '+ Thêm danh mục'}
          </button>
          {form.name && (
            <button
              className="admin-btn admin-btn-secondary"
              onClick={() => setForm(EMPTY_FORM)}
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="admin-table-wrapper">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
            </svg>
            Đang tải dữ liệu…
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <svg className="w-10 h-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h8" />
            </svg>
            <span className="text-sm">Chưa có danh mục nào</span>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tên danh mục</th>
                <th>Accent</th>
                <th>Slug</th>
                <th>Số sách</th>
                <th>Thứ tự</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr key={cat.id}>
                  <td className="text-slate-400 text-xs w-10">{idx + 1}</td>
                  <td>
                    <span className="font-medium text-slate-800">{cat.name}</span>
                  </td>
                  <td>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACCENT_BADGE[cat.accent] || ACCENT_BADGE.slate}`}>
                      {cat.accent || '—'}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded">
                      {cat.slug || '—'}
                    </span>
                  </td>
                  <td>
                    {(bookCounts[cat.id] || bookCounts[cat.slug] || 0) > 0 ? (
                      <Link
                        to={`/kham-pha?category=${cat.slug || cat.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-teal-700 font-semibold text-sm hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        {bookCounts[cat.id] || bookCounts[cat.slug] || 0}
                        <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Link>
                    ) : (
                      <span className="text-slate-300 text-sm">0</span>
                    )}
                  </td>
                  <td className="text-slate-600 text-sm">{cat.order ?? '—'}</td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${cat.is_active ? 'bg-teal-500' : 'bg-slate-200'}`}
                      title={cat.is_active ? 'Đang hiện — nhấn để ẩn' : 'Đang ẩn — nhấn để hiện'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${cat.is_active ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => setEditCat({ ...cat })}
                      >
                        Sửa
                      </button>
                      <button
                        className="admin-btn admin-btn-danger"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => handleDelete(cat)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Edit modal ────────────────────────────────────────────────────────── */}
      {editCat && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setEditCat(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Sửa danh mục</h3>
              <button
                onClick={() => setEditCat(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tên danh mục <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editCat.name}
                  onChange={e => setEditCat(c => ({ ...c, name: e.target.value }))}
                  className="admin-filter-input w-full"
                />
              </div>

              {/* Accent */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Màu accent</label>
                <select
                  value={editCat.accent}
                  onChange={e => setEditCat(c => ({ ...c, accent: e.target.value }))}
                  className="admin-filter-input w-full"
                >
                  {ACCENT_OPTIONS.map(a => (
                    <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
                  ))}
                </select>
                <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACCENT_BADGE[editCat.accent] || ACCENT_BADGE.slate}`}>
                  {editCat.accent}
                </span>
              </div>

              {/* Order */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Thứ tự</label>
                <input
                  type="number"
                  min={1}
                  value={editCat.order}
                  onChange={e => setEditCat(c => ({ ...c, order: e.target.value }))}
                  className="admin-filter-input w-full"
                />
              </div>

              {/* is_active */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">Hiển thị danh mục</span>
                <button
                  onClick={() => setEditCat(c => ({ ...c, is_active: !c.is_active }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${editCat.is_active ? 'bg-teal-500' : 'bg-slate-200'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${editCat.is_active ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => setEditCat(null)}
                disabled={saving}
              >
                Hủy
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={handleSaveEdit}
                disabled={saving}
              >
                {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
