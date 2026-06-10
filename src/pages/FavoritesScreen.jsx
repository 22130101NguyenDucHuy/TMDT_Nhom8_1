import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { formatPrice } from "../utils/formatters";
import { getBookImageUrl } from "../utils/imageResolver";

export default function FavoritesScreen() {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null); // id đang được xóa

  const fetchFavorites = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lb_favorites")
        .select(`
          id,
          book_id,
          created_at,
          book:book_id (
            id, title, price, image, images, status,
            seller_id, condition, school, original_price,
            urgent, verified
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Chỉ hiển thị sách còn active
      setFavorites(data?.filter((f) => f.book?.status === "active") ?? []);
    } catch (err) {
      console.error("fetch favorites error:", err.message);
      showToast("Không thể tải danh sách yêu thích", "error");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch khi mount (hoặc khi user thay đổi)
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemove = async (favId, bookTitle) => {
    setRemovingId(favId);
    try {
      const { error } = await supabase
        .from("lb_favorites")
        .delete()
        .eq("id", favId);

      if (error) throw error;

      setFavorites((prev) => prev.filter((f) => f.id !== favId));
      showToast(`Đã xóa "${bookTitle}" khỏi yêu thích`, "success");
    } catch (err) {
      console.error(err.message);
      showToast("Không thể xóa, thử lại sau", "error");
    } finally {
      setRemovingId(null);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <p className="text-slate-600 mb-4">Vui lòng đăng nhập để xem danh sách yêu thích.</p>
        <Link to="/" className="vinted-btn-outline w-auto px-8 mx-auto">Về trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-6">
        <p className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-1">Yêu thích</p>
        <h1 className="text-2xl font-bold text-slate-900">Danh sách yêu thích</h1>
        <p className="text-sm text-slate-500 mt-1">
          {loading ? "Đang tải…" : `${favorites.length} tài liệu`}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-700" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p className="text-slate-500 font-medium">Chưa có tài liệu yêu thích</p>
            <Link to="/kham-pha" className="mt-3 inline-block text-teal-700 font-semibold text-sm hover:underline">
              Khám phá tài liệu ngay →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {favorites.map((fav) => {
              const book = fav.book;
              const imgSrc = getBookImageUrl(book);
              const isRemoving = removingId === fav.id;

              return (
                <div
                  key={fav.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group ${isRemoving ? "opacity-50 pointer-events-none" : ""}`}
                >
                  {/* Thumbnail + info — click vào xem chi tiết */}
                  <Link to={`/sach/${fav.book_id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-14 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                      {imgSrc ? (
                        <img src={imgSrc} alt={book?.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate group-hover:text-teal-700 transition-colors">{book?.title || "—"}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{book?.school || ""}</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">{formatPrice(book?.price ?? 0)}</p>
                    </div>
                  </Link>

                  {/* Actions — luôn hiển thị rõ ràng, phân cách bằng border trên mobile và border-l trên desktop */}
                  <div className="flex items-center gap-3 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-150 pt-3 sm:pt-0 sm:pl-4 w-full sm:w-auto justify-end">
                    <Link
                      to={`/sach/${fav.book_id}`}
                      className="inline-flex items-center justify-center text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-3.5 py-1.5 rounded-lg hover:bg-teal-100 hover:border-teal-300 transition-all active:scale-95"
                    >
                      Xem chi tiết
                    </Link>
                    <button
                      onClick={() => handleRemove(fav.id, book?.title || "sách")}
                      disabled={isRemoving}
                      className="inline-flex items-center justify-center text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-lg hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300 transition-all disabled:opacity-50 active:scale-95"
                    >
                      {isRemoving ? "Đang xóa…" : "Bỏ thích"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

