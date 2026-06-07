import { useState, useEffect, useMemo } from "react";
import { supabase } from "../services/supabase";

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
            images, urgent, verified, school, category, created_at,
            seller_id,
            seller:seller_id (name, rating_sum, rating_count)
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
        const normalized = (data || []).map((b) => {
          const defaultImageMap = {
            "chuyen-doi-so": "chuyendoi.jpg",
            "benh-gom-den": "benhgomden.jpg",
            "benh-heo": "benhheo.jpg",
            "cong-nghe-mang-loc": "cnghemangloc.jpg",
            "cong-nghe-nuoi-trong": "cnghenuoitrong.jpg",
            "phat-trien-san-pham": "ptriensp.jpg",
            "suc-ben-vat-lieu": "sbvl.jpg",
            "xa-hoi-hoc": "xhh.jpg",
            "anh-banner": "618572354_1397613058830175_8168212988356921032_n.jpg",
          };

          let imgs = [];
          if (Array.isArray(b.images) && b.images.length > 0) {
            imgs = b.images.map(img => img.startsWith('http') ? img : `https://ehvgtgzleukxtqgstivd.supabase.co/storage/v1/object/public/books2/${img}`);
          } else {
            const fallbackFile = defaultImageMap[b.id];
            if (fallbackFile) {
              imgs = [`https://ehvgtgzleukxtqgstivd.supabase.co/storage/v1/object/public/books/${fallbackFile}`];
            } else {
              imgs = [`https://ehvgtgzleukxtqgstivd.supabase.co/storage/v1/object/public/books/${b.id}_0.jpg`];
            }
          }

          return {
            ...b,
            images: imgs,
            image: imgs[0] || null,
            originalPrice: b.original_price,
            seller: {
              name: b.seller?.name || "Người bán",
              rating: b.seller && b.seller.rating_count > 0
                ? (b.seller.rating_sum / b.seller.rating_count).toFixed(1)
                : "0.0",
            },
          };
        });

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
