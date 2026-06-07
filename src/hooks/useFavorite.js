import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";

/**
 * Hook quản lý trạng thái yêu thích cho một cuốn sách.
 * Dùng chung cho BookDetailScreen và BookCard.
 *
 * @param {string|null} bookId
 * @param {object|null} user  - auth user từ useAuth()
 */
export function useFavorite(bookId, user) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favId, setFavId]           = useState(null); // id của row lb_favorites
  const [loading, setLoading]       = useState(false);

  // Kiểm tra trạng thái yêu thích khi mount / khi user hoặc bookId thay đổi
  useEffect(() => {
    if (!user || !bookId) {
      setIsFavorite(false);
      setFavId(null);
      return;
    }
    supabase
      .from("lb_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .maybeSingle()
      .then(({ data }) => {
        setIsFavorite(!!data);
        setFavId(data?.id ?? null);
      })
      .catch(() => {});
  }, [user, bookId]);

  /**
   * Toggle yêu thích: thêm hoặc xóa.
   * Trả về { added: boolean } hoặc throw nếu lỗi.
   */
  const toggle = useCallback(async () => {
    if (!user || !bookId || loading) return;
    setLoading(true);
    try {
      if (isFavorite && favId) {
        // --- Xóa yêu thích ---
        const { error } = await supabase
          .from("lb_favorites")
          .delete()
          .eq("id", favId);
        if (error) throw error;

        // Giảm favorite_count (fire-and-forget, không block UI)
        supabase.rpc("decrement_favorite_count", { book_id: bookId }).catch(() => {});

        setIsFavorite(false);
        setFavId(null);
        return { added: false };
      } else {
        // --- Thêm yêu thích (upsert để tránh duplicate) ---
        const { data, error } = await supabase
          .from("lb_favorites")
          .upsert(
            [{ user_id: user.id, book_id: bookId }],
            { onConflict: "user_id,book_id", ignoreDuplicates: false }
          )
          .select("id")
          .single();
        if (error) throw error;

        // Tăng favorite_count
        supabase.rpc("increment_favorite_count", { book_id: bookId }).catch(() => {});

        setIsFavorite(true);
        setFavId(data.id);
        return { added: true };
      }
    } finally {
      setLoading(false);
    }
  }, [user, bookId, isFavorite, favId, loading]);

  return { isFavorite, favId, loading, toggle };
}
