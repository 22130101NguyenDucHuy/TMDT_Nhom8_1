import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { formatPrice, formatPriceInput } from "../utils/formatters";
import VerificationGate from "../components/sell/VerificationGate";

const conditionOptions = [
  { id: "any", label: "Bất kỳ" },
  { id: "brand_new", label: "Mới 100%" },
  { id: "like_new", label: "Như mới 90-95%" },
  { id: "good", label: "Tốt - Có ghi chú" },
  { id: "acceptable", label: "Cũ" },
];

const conditionLabels = {
  any: "Bất kỳ",
  brand_new: "Mới 100%",
  like_new: "Như mới",
  very_good: "Rất tốt",
  good: "Tốt",
  acceptable: "Cũ",
};

const MY_REQUEST_TABS = [
  { key: "open", label: "Đang mở" },
  { key: "fulfilled", label: "Đã có người bán" },
  { key: "cancelled", label: "Đã hủy" },
];

export default function BookRequestScreen() {
  const { user, userData, showToast } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab chính: 'explore' (khám phá) hoặc 'my_requests' (của tôi)
  const initialTab = searchParams.get("tab") === "my_requests" ? "my_requests" : "explore";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Toggle form đăng yêu cầu (ở tab explore)
  const [showForm, setShowForm] = useState(false);

  // Trạng thái form đăng bán
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [condition, setCondition] = useState("any");
  const [description, setDescription] = useState("");
  const [school, setSchool] = useState("");
  const [loading, setLoading] = useState(false);

  // Danh sách yêu cầu chung (explore)
  const [requests, setRequests] = useState([]);
  const [fetching, setFetching] = useState(true);

  // Danh sách yêu cầu cá nhân (my_requests)
  const [myRequests, setMyRequests] = useState([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(true);
  const [mySubTab, setMySubTab] = useState("open"); // open, fulfilled, cancelled

  // Đồng bộ tab từ URL query params
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "my_requests" && user) {
      setActiveTab("my_requests");
    } else {
      setActiveTab("explore");
    }
  }, [searchParams, user]);

  // Tải danh sách yêu cầu chung (explore)
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

  // Tải danh sách yêu cầu cá nhân (my_requests)
  useEffect(() => {
    if (!user || activeTab !== "my_requests") return;
    const fetchMyRequests = async () => {
      setMyRequestsLoading(true);
      try {
        const { data, error } = await supabase
          .from("lb_book_requests")
          .select("*")
          .eq("requester_id", user.id)
          .eq("status", mySubTab)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setMyRequests(data || []);
      } catch (err) {
        console.error("fetch my requests error:", err);
      } finally {
        setMyRequestsLoading(false);
      }
    };
    fetchMyRequests();
  }, [user, activeTab, mySubTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handlePriceChange = (e) => {
    setMaxPrice(formatPriceInput(e.target.value));
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
      const numericPrice = maxPrice ? parseInt(maxPrice.replace(/\D/g, ""), 10) : null;
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
      setShowForm(false);

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

  const handleCancelRequest = async (id) => {
    if (!window.confirm("Hủy yêu cầu này?")) return;
    try {
      const { error } = await supabase
        .from("lb_book_requests")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("requester_id", user.id);
      if (error) throw error;

      showToast("Đã hủy yêu cầu thành công!", "success");
      setMyRequests((prev) => prev.filter((r) => r.id !== id));

      // Cập nhật lại danh sách yêu cầu chung nếu cần
      const { data } = await supabase
        .from("lb_book_requests")
        .select("*, requester:requester_id(id, name, avatar_url)")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      setRequests(data || []);
    } catch (err) {
      showToast(err.message || "Không thể hủy yêu cầu", "error");
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

  // Nếu tài khoản đã bị khóa
  if (user && userData && userData.status === "suspended") {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-full mb-6 text-red-500 shadow-sm">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Tài khoản đã bị khóa</h2>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">Tài khoản của bạn đã bị khóa do vi phạm chính sách của LoopBook.</p>
        <button onClick={() => navigate("/")} className="vinted-btn-outline w-auto px-8 mx-auto">Về trang chủ</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* Tiêu đề trang */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-1">Yêu cầu sách</p>
          <h1 className="text-2xl font-bold text-slate-900">Tìm kiếm tài liệu & sách cần mua</h1>
        </div>
      </div>

      {/* Tabs điều hướng chính (chỉ hiện khi đã đăng nhập) */}
      {user && (
        <div className="flex border-b border-slate-200 mb-6 bg-slate-50/50 rounded-lg p-1">
          <button
            onClick={() => handleTabChange("explore")}
            className={`flex-1 py-2.5 text-center font-bold text-sm rounded-md transition-all ${
              activeTab === "explore"
                ? "text-teal-700 bg-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Khám phá yêu cầu
          </button>
          <button
            onClick={() => handleTabChange("my_requests")}
            className={`flex-1 py-2.5 text-center font-bold text-sm rounded-md transition-all ${
              activeTab === "my_requests"
                ? "text-teal-700 bg-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Yêu cầu của tôi
          </button>
        </div>
      )}

      {/* NỘI DUNG TAB 1: KHÁM PHÁ YÊU CẦU CHUNG */}
      {activeTab === "explore" && (
        <div className="space-y-6">
          {/* Header hành động trong tab */}
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="text-sm text-slate-600">
              Bạn có thể xem các tin tìm sách của sinh viên khác hoặc tự tạo tin yêu cầu.
            </div>
            {user && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                {showForm ? "✕ Đóng form" : "Đăng yêu cầu mua"}
              </button>
            )}
          </div>

          {/* Form đăng yêu cầu (Chỉ hiện khi click và bắt buộc xác thực sinh viên) */}
          {showForm && (
            <VerificationGate>
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-in slide-in-from-top-4 duration-200">
                <h2 className="font-bold text-slate-900 text-lg mb-4">Thông tin sách cần mua</h2>
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
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
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
                      placeholder="Mô tả chi tiết hơn về sách bạn cần mua (ví dụ: cần photo hay sách gốc, hẹn gặp ở thư viện...)"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 h-24 resize-y"
                    />
                    <p className="text-xs text-slate-400 text-right mt-1">{description.length}/500</p>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-lg text-sm transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Đang đăng...
                        </>
                      ) : (
                        "Đăng yêu cầu"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </VerificationGate>
          )}

          {/* Danh sách yêu cầu đang mở */}
          <div>
            <h2 className="font-bold text-slate-900 text-lg mb-4">Các yêu cầu mua sách gần đây</h2>
            {fetching ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-700" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-100">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-slate-500 font-medium">Chưa có yêu cầu mua sách nào</p>
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
                        {req.author && <p className="text-sm text-slate-500">Tác giả: {req.author}</p>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {req.condition && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {getConditionLabel(req.condition)}
                            </span>
                          )}
                          {req.school && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {req.school}
                            </span>
                          )}
                        </div>
                        {req.description && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{req.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-500 flex-shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
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
                        Chào hàng
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* NỘI DUNG TAB 2: YÊU CẦU CỦA TÔI (BẮT BUỘC XÁC THỰC SINH VIÊN) */}
      {activeTab === "my_requests" && (
        <VerificationGate>
          <div className="space-y-6">
            {/* Lọc trạng thái yêu cầu cá nhân */}
            <div className="flex border-b border-slate-100 mb-6">
              {MY_REQUEST_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setMySubTab(tab.key)}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                    mySubTab === tab.key
                      ? "text-teal-700 border-teal-700"
                      : "text-slate-500 border-transparent hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* List user requests */}
            {myRequestsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-700" />
              </div>
            ) : myRequests.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="font-semibold">Bạn chưa có yêu cầu nào ở mục này</p>
                {mySubTab === "open" && (
                  <button
                    onClick={() => handleTabChange("explore")}
                    className="text-sm text-teal-700 font-semibold hover:underline mt-2"
                  >
                    Đăng tin cần mua sách ngay
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {myRequests.map((req) => (
                  <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900">{req.title}</h3>
                        {req.author && <p className="text-sm text-slate-500 mt-1">Tác giả: {req.author}</p>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {req.max_price && (
                            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">
                              Tối đa {formatPrice(req.max_price)}
                            </span>
                          )}
                          {req.condition && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {conditionLabels[req.condition] || req.condition}
                            </span>
                          )}
                          {req.school && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {req.school}
                            </span>
                          )}
                        </div>
                        {req.description && <p className="text-sm text-slate-600 mt-2">{req.description}</p>}
                        <p className="text-xs text-slate-400 mt-2">
                          Đăng ngày: {new Date(req.created_at).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                      {mySubTab === "open" && (
                        <button
                          onClick={() => handleCancelRequest(req.id)}
                          className="px-3.5 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                        >
                          Hủy yêu cầu
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </VerificationGate>
      )}
    </div>
  );
}
