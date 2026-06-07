import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { formatPrice } from "../utils/formatters";

const conditionOptions = [
  { id: "any", label: "Bất kỳ" },
  { id: "brand_new", label: "Mới 100%" },
  { id: "like_new", label: "Như mới 90-95%" },
  { id: "good", label: "Tốt - Có ghi chú" },
  { id: "acceptable", label: "Cũ" },
];

export default function BookRequestScreen() {
  const { user, userData, showToast } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [condition, setCondition] = useState("any");
  const [description, setDescription] = useState("");
  const [school, setSchool] = useState("");
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [fetching, setFetching] = useState(true);

  // Fetch danh sách yêu cầu
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { data, error } = await supabase
          .from("lb_book_requests")
          .select("*, requester:requester_id(id, name, avatar_url)")
          .eq("status", "open")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setRequests(data || []);
      } catch (err) {
        console.error("fetch requests error:", err);
      } finally {
        setFetching(false);
      }
    };
    fetchRequests();
  }, []);

  const handlePriceChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    setMaxPrice(raw ? parseInt(raw, 10).toLocaleString("en-US") : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userData) {
      showToast("Vui lòng đăng nhập để đăng yêu cầu", "error");
      return;
    }
    if (!title.trim()) {
      showToast("Vui lòng nhập tên sách", "error");
      return;
    }

    setLoading(true);
    try {
      const numericPrice = maxPrice ? parseInt(maxPrice.replace(/,/g, ""), 10) : null;
      const { error } = await supabase.from("lb_book_requests").insert([
        {
          requester_id: userData.id,
          title: title.trim(),
          author: author.trim() || null,
          max_price: numericPrice,
          condition: condition === "any" ? null : condition,
          description: description.trim() || null,
          school: school.trim() || null,
          status: "open",
        },
      ]);
      if (error) throw error;

      showToast("Đã đăng yêu cầu thành công!", "success");
      setTitle("");
      setAuthor("");
      setMaxPrice("");
      setCondition("any");
      setDescription("");
      setSchool("");

      // Refresh list
      const { data } = await supabase
        .from("lb_book_requests")
        .select("*, requester:requester_id(id, name, avatar_url)")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      setRequests(data || []);
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOffer = (requestId) => {
    if (!userData) {
      showToast("Vui lòng đăng nhập để chào hàng", "error");
      return;
    }
    navigate(`/dang-ban?request=${requestId}`);
  };

  const getConditionLabel = (c) => {
    const opt = conditionOptions.find((o) => o.id === c);
    return opt ? opt.label : c;
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <p className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-1">Yêu cầu sách</p>
        <h1 className="text-2xl font-bold text-slate-900">Đăng tin cần mua sách</h1>
        <p className="text-slate-500 text-sm mt-1">
          Bạn cần mua sách nào? Đăng yêu cầu để người có sách liên hệ chào hàng.
        </p>
      </div>

      {/* Form đăng yêu cầu */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
        <h2 className="font-bold text-slate-900 text-lg mb-4">Thông tin yêu cầu</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tên sách <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Giáo trình Kinh tế vi mô"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tác giả</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Giá tối đa mong muốn</label>
              <div className="relative">
                <span className="absolute right-4 top-3 text-slate-400 font-bold">₫</span>
                <input
                  type="text"
                  value={maxPrice}
                  onChange={handlePriceChange}
                  placeholder="0"
                  className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tình trạng mong muốn</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
              >
                {conditionOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Trường / Khu vực</label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="VD: Đại học Bách Khoa Hà Nội"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mô tả thêm</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="Mô tả chi tiết hơn về sách bạn cần..."
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 h-24 resize-y"
            />
            <p className="text-xs text-slate-400 text-right mt-1">{description.length}/500</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="vinted-btn-primary w-auto px-8 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Đang đăng...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Đăng yêu cầu
              </>
            )}
          </button>
        </form>
      </div>

      {/* Danh sách yêu cầu */}
      <div>
        <h2 className="font-bold text-slate-900 text-lg mb-4">Yêu cầu đang mở</h2>
        {fetching ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-700" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-100">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-slate-500 font-medium">Chưa có yêu cầu nào</p>
            <p className="text-slate-400 text-sm mt-1">Hãy là người đầu tiên đăng yêu cầu!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900">{req.title}</h3>
                      {req.max_price && (
                        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">
                          Tối đa {formatPrice(req.max_price)}
                        </span>
                      )}
                    </div>
                    {req.author && (
                      <p className="text-sm text-slate-500">Tác giả: {req.author}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {req.condition && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {getConditionLabel(req.condition)}
                        </span>
                      )}
                      {req.school && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          🎓 {req.school}
                        </span>
                      )}
                    </div>
                    {req.description && (
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">{req.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">
                        {req.requester?.name?.charAt(0) || "?"}
                      </div>
                      <span className="text-xs text-slate-500">
                        {req.requester?.name || "Người dùng"} · {new Date(req.created_at).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOffer(req.id)}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg transition-colors flex-shrink-0"
                  >
                    💬 Chào hàng
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
