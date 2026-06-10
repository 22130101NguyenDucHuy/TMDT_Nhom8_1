import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { formatPrice } from "../utils/formatters";

const conditionLabels = {
  any: "Bất kỳ", brand_new: "Mới 100%", like_new: "Như mới",
  very_good: "Rất tốt", good: "Tốt", acceptable: "Cũ",
};

const TABS = [
  { key: "open", label: "Đang mở" },
  { key: "fulfilled", label: "Đã có người bán" },
  { key: "cancelled", label: "Đã hủy" },
];

export default function MyBookRequestsScreen() {
  const { user, userData, showToast } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("open");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("lb_book_requests")
        .select("*")
        .eq("requester_id", user.id)
        .eq("status", activeTab)
        .order("created_at", { ascending: false });
      setRequests(data || []);
      setLoading(false);
    };
    fetch();
  }, [user, activeTab]);

  const handleCancel = async (id) => {
    if (!window.confirm("Hủy yêu cầu này?")) return;
    const { error } = await supabase
      .from("lb_book_requests")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("requester_id", user.id);
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Đã hủy yêu cầu", "success");
      setRequests(requests.filter(r => r.id !== id));
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <p className="text-slate-600 mb-4">Vui lòng đăng nhập để xem yêu cầu.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-1">Yêu cầu</p>
          <h1 className="text-2xl font-bold text-slate-900">Yêu cầu của tôi</h1>
        </div>
        <Link to="/yeu-cau-sach" className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold text-sm transition-colors">
          + Tạo yêu cầu
        </Link>
      </div>

      <div className="flex border-b border-slate-100 mb-6">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab.key ? "text-teal-700 border-teal-700" : "text-slate-500 border-transparent hover:text-slate-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-700" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="font-semibold">Chưa có yêu cầu nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{req.title}</h3>
                  {req.author && <p className="text-sm text-slate-500 mt-1">Tác giả: {req.author}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {req.max_price && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">Tối đa {formatPrice(req.max_price)}</span>}
                    {req.condition && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{conditionLabels[req.condition] || req.condition}</span>}
                    {req.school && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{req.school}</span>}
                  </div>
                  {req.description && <p className="text-sm text-slate-600 mt-2">{req.description}</p>}
                  <p className="text-xs text-slate-400 mt-2">{new Date(req.created_at).toLocaleDateString("vi-VN")}</p>
                </div>
                {activeTab === "open" && (
                  <button onClick={() => handleCancel(req.id)} className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                    Hủy
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
