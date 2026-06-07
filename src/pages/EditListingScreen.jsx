import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";

const conditionOptions = [
  { id: "brand_new", label: "Mới 100%" },
  { id: "like_new", label: "Như mới 90-95%" },
  { id: "very_good", label: "Rất tốt" },
  { id: "good", label: "Tốt - Có ghi chú" },
  { id: "acceptable", label: "Cũ" },
];

const deliveryOptions = [
  { id: "meet", label: "Gặp trực tiếp" },
  { id: "cod", label: "Ship COD" },
  { id: "transfer", label: "Chuyển khoản trước" },
];

const schoolSuggestions = [
  "Đại học Bách Khoa Hà Nội", "Đại học Bách Khoa TP.HCM",
  "Đại học Kinh tế Quốc dân", "Đại học Ngoại thương",
  "Đại học Kinh tế TP.HCM", "Đại học Khoa học Xã hội và Nhân văn",
  "Đại học Khoa học Tự nhiên", "Đại học Sư phạm",
  "Học viện Bưu chính Viễn thông", "Học viện Tài chính",
  "Học viện Nông nghiệp Việt Nam",
];

export default function EditListingScreen() {
  const { bookId } = useParams();
  const { user, userData, showToast } = useAuth();
  const navigate = useNavigate();
  const { categories } = useCategories();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [author, setAuthor] = useState("");
  const [publisher, setPublisher] = useState("");
  const [edition, setEdition] = useState("");
  const [school, setSchool] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");
  const [allowOffers, setAllowOffers] = useState(true);
  const [description, setDescription] = useState("");
  const [locationStr, setLocationStr] = useState("");
  const [selectedDeliveries, setSelectedDeliveries] = useState(["meet"]);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!bookId || !user) return;
    const fetchBook = async () => {
      try {
        const { data, error } = await supabase
          .from("lb_books")
          .select("*")
          .eq("id", bookId)
          .eq("seller_id", user.id)
          .single();
        if (error || !data) {
          showToast("Không tìm thấy bài đăng", "error");
          navigate("/quan-ly");
          return;
        }
        setTitle(data.title || "");
        setCategory(data.category || "");
        setCondition(data.condition || "");
        setAuthor(data.author || "");
        setPublisher(data.publisher || "");
        setEdition(data.edition || "");
        setSchool(data.school || "");
        setYear(data.year ? String(data.year) : "");
        setPrice(data.price ? String(data.price) : "");
        setAllowOffers(data.allow_offers !== false);
        setDescription(data.description || "");
        setLocationStr(data.location_text || "");
        setSelectedDeliveries(data.delivery_methods || ["meet"]);
        setIsUrgent(data.urgent || false);
      } catch (err) {
        showToast("Lỗi tải dữ liệu", "error");
        navigate("/quan-ly");
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [bookId, user]);

  const handleSubmit = async () => {
    if (!title.trim()) { showToast("Vui lòng nhập tiêu đề", "error"); return; }
    if (!category) { showToast("Vui lòng chọn danh mục", "error"); return; }
    if (!condition) { showToast("Vui lòng chọn tình trạng", "error"); return; }
    if (!price) { showToast("Vui lòng nhập giá", "error"); return; }

    setSaving(true);
    try {
      const tags = [];
      if (isUrgent) tags.push("Bán gấp");
      if (allowOffers) tags.push("Cho phép trả giá");
      selectedDeliveries.forEach(id => {
        const method = deliveryOptions.find(d => d.id === id);
        if (method) tags.push(method.label);
      });
      if (locationStr) tags.push(`Giao dịch: ${locationStr}`);
      if (category === 'other' && customCategory.trim()) tags.push(`Môn học: ${customCategory.trim()}`);

      const { error } = await supabase
        .from("lb_books")
        .update({
          title: title.trim(),
          category: category === 'other' ? null : category,
          condition,
          price: parseInt(price.replace(/,/g, ""), 10),
          author: author.trim() || null,
          publisher: publisher.trim() || null,
          edition: edition.trim() || null,
          school: school.trim() || null,
          year: year ? parseInt(year, 10) : null,
          allow_offers: allowOffers,
          description: description.trim() || null,
          location_text: locationStr || null,
          delivery_methods: selectedDeliveries,
          urgent: isUrgent,
          tags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookId)
        .eq("seller_id", user.id);
      if (error) throw error;
      showToast("Cập nhật thành công!", "success");
      navigate("/quan-ly");
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Bạn chưa đăng nhập</h2>
        <button onClick={() => navigate("/")} className="vinted-btn-outline w-auto px-8 mx-auto">Về trang chủ</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate("/quan-ly")} className="text-slate-400 hover:text-slate-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <p className="text-sm font-semibold text-teal-700 uppercase tracking-wider">Chỉnh sửa</p>
          <h1 className="text-2xl font-bold text-slate-900">Sửa bài đăng</h1>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="font-bold text-slate-900 text-lg mb-4">Thông tin cơ bản</h2>
        <div className="mb-4">
          <label className="font-bold text-slate-900 block mb-2">Tiêu đề <span className="text-red-500">*</span></label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} className="vinted-input" placeholder="VD: Giáo trình Kinh tế vi mô" />
        </div>
        <div className="mb-4">
          <label className="font-bold text-slate-900 block mb-3">Danh mục <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-2">
            {[...categories, { id: 'other', name: 'Khác' }].map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${category === c.id ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-700 border-slate-200 hover:border-teal-500'}`}>
                {c.name}
              </button>
            ))}
          </div>
          {category === 'other' && (
            <input type="text" value={customCategory} onChange={e => setCustomCategory(e.target.value)} className="vinted-input mt-3" placeholder="Nhập môn học khác..." />
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="font-bold text-slate-900 text-lg mb-4">Chi tiết thuộc tính</h2>
        <div className="mb-4">
          <label className="font-bold text-slate-900 block mb-3">Tình trạng <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-2">
            {conditionOptions.map(c => (
              <button key={c.id} onClick={() => setCondition(c.id)}
                className={`px-4 py-2 rounded-md border text-sm font-medium transition-all ${condition === c.id ? 'bg-teal-50 text-teal-800 border-teal-500 ring-1 ring-teal-500' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-bold text-slate-900 text-sm block mb-2">Trường</label>
            <input type="text" list="school-list" value={school} onChange={e => setSchool(e.target.value)} className="vinted-input" placeholder="Gõ để tìm..." />
            <datalist id="school-list">{schoolSuggestions.map(s => <option key={s} value={s} />)}</datalist>
          </div>
          <div>
            <label className="font-bold text-slate-900 text-sm block mb-2">Tác giả</label>
            <input type="text" value={author} onChange={e => setAuthor(e.target.value)} className="vinted-input" placeholder="VD: Nguyễn Văn A" />
          </div>
          <div>
            <label className="font-bold text-slate-900 text-sm block mb-2">Phiên bản</label>
            <input type="text" value={edition} onChange={e => setEdition(e.target.value)} className="vinted-input" placeholder="VD: Tái bản lần 5" />
          </div>
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="font-bold text-slate-900 text-sm block mb-2">Năm XB</label>
              <input type="number" value={year} onChange={e => setYear(e.target.value)} className="vinted-input" placeholder="2022" />
            </div>
            <div className="w-1/2">
              <label className="font-bold text-slate-900 text-sm block mb-2">Nhà XB</label>
              <input type="text" value={publisher} onChange={e => setPublisher(e.target.value)} className="vinted-input" placeholder="NXB Giáo dục" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="font-bold text-slate-900 text-lg mb-4">Định giá & Mô tả</h2>
        <div className="mb-4">
          <label className="font-bold text-teal-800 block mb-2">Giá bán <span className="text-red-500">*</span></label>
          <div className="relative md:w-1/2">
            <span className="absolute right-4 top-3.5 text-teal-800 font-bold">₫</span>
            <input type="text" value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, "").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1."))}
              className="vinted-input pr-10 text-lg font-bold text-teal-800 border-teal-200" placeholder="0" />
          </div>
        </div>
        <div className="mb-4">
          <label className="font-bold text-slate-900 block mb-2">Mô tả</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={1000}
            className="vinted-input h-32 resize-y" placeholder="Mô tả chi tiết..." />
        </div>
        <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
          <input type="checkbox" checked={allowOffers} onChange={e => setAllowOffers(e.target.checked)} className="w-5 h-5 accent-teal-700 rounded" />
          <div>
            <p className="font-bold text-slate-900 text-sm">Chấp nhận trả giá</p>
            <p className="text-xs text-slate-500">Cho phép người mua đề xuất giá thấp hơn.</p>
          </div>
        </label>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-8 shadow-sm">
        <h2 className="font-bold text-slate-900 text-lg mb-4">Giao dịch</h2>
        <div className="mb-4">
          <label className="font-bold text-slate-900 block mb-2">Địa điểm giao dịch</label>
          <input type="text" value={locationStr} onChange={e => setLocationStr(e.target.value)} className="vinted-input" placeholder="VD: KTX Khu A, ĐHQG TP.HCM" />
        </div>
        <div className="mb-4">
          <label className="font-bold text-slate-900 block mb-3">Hình thức giao dịch</label>
          <div className="flex flex-wrap gap-2">
            {deliveryOptions.map(d => (
              <button key={d.id}
                onClick={() => {
                  if (selectedDeliveries.includes(d.id)) {
                    if (selectedDeliveries.length > 1) setSelectedDeliveries(selectedDeliveries.filter(x => x !== d.id));
                  } else setSelectedDeliveries([...selectedDeliveries, d.id]);
                }}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${selectedDeliveries.includes(d.id) ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-700 border-slate-200 hover:border-teal-500'}`}>
                {selectedDeliveries.includes(d.id) && <span className="mr-1">✓</span>}{d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100 pt-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-bold text-slate-900">🔥 Cần bán gấp</span>
              <p className="text-sm text-slate-500">Tin đăng sẽ được ưu tiên hiển thị.</p>
            </div>
            <div className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isUrgent} onChange={() => setIsUrgent(!isUrgent)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-700" />
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pb-12">
        <button onClick={() => navigate("/quan-ly")} className="px-6 py-3 font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm" disabled={saving}>
          Hủy
        </button>
        <button onClick={handleSubmit} disabled={saving} className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
}
