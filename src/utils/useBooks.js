import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";

/**
 * Custom hook fetch sách từ Supabase với filter/sort.
 * @param {object} options - { category, school, priceMin, priceMax, sortBy, limit }
 */
export function useBooks(options = {}) {
  const { category, school, priceMin, priceMax, sortBy, limit } = options;

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchBooks = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("lb_books")
          .select(`
            id, title, condition, price, original_price,
            image, urgent, verified, school, category, created_at,
            seller_id,
            lb_users (name)
          `)
          .eq("status", "active");

        if (category && category !== "all") {
          query = query.eq("category", category);
        }
        if (school && school !== "all") {
          query = query.eq("school", school);
        }
        if (priceMin != null && priceMin > 0) {
          query = query.gte("price", priceMin);
        }
        if (priceMax != null && priceMax !== Infinity) {
          query = query.lte("price", priceMax);
        }

        // Sắp xếp
        if (sortBy === "price_asc") {
          query = query.order("price", { ascending: true });
        } else if (sortBy === "price_desc") {
          query = query.order("price", { ascending: false });
        } else {
          // Mặc định: mới nhất
          query = query.order("created_at", { ascending: false });
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        // Chuẩn hóa format để BookCard dùng được
        const normalized = (data || []).map((b) => ({
          ...b,
          originalPrice: b.original_price,
          seller: {
            name: b.lb_users?.name || "Người bán",
          },
        }));

        if (!cancelled) setBooks(normalized);
      } catch (err) {
        console.error("useBooks error:", err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBooks();
    return () => { cancelled = true; };
  }, [category, school, priceMin, priceMax, sortBy, limit]);

  return { books, loading, error };
}
