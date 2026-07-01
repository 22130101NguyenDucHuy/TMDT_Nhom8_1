import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabase";
import BookCard from "../components/common/BookCard";
import { resolveBookImages } from "../utils/imageResolver";

const PAGE_SIZE = 12;

const PRICE_PRESETS = [
  { label: "Tất cả", min: 0, max: Infinity },
  { label: "Dưới 50k", min: 0, max: 50000 },
  { label: "50k – 100k", min: 50000, max: 100000 },
  { label: "100k – 200k", min: 100000, max: 200000 },
  { label: "Trên 200k", min: 200000, max: Infinity },
];

const categoryMeta = {
  economics:              { label: "Kinh tế & Quản trị",    icon: "📊" },
  engineering:            { label: "Kỹ thuật & CNTT",       icon: "⚙️" },
  law:                    { label: "Luật",                   icon: "⚖️" },
  language:               { label: "Ngoại ngữ",             icon: "🌐" },
  agriculture:            { label: "Nông – Lâm – Ngư",      icon: "🌱" },
  sociology:              { label: "Xã hội & Nhân văn",     icon: "👥" },
  "cong-nghe-thong-tin":  { label: "Công nghệ thông tin",   icon: "💻" },
  "khoa-hoc-tu-nhien":    { label: "Khoa học tự nhiên",     icon: "🔬" },
  "toan-hoc":             { label: "Toán học",               icon: "📐" },
  "y-hoc":                { label: "Y học",                  icon: "🏥" },
};

// Normalize book data từ Supabase
const normalizeBook = (b) => {
  const imgs = resolveBookImages(b.id, b.images);

  return {
    ...b,
    images: imgs,
    image: imgs[0] || null,
    originalPrice: b.original_price,
    seller: {
      name: b.seller?.name || "Người bán",
      rating: b.seller?.rating_count > 0
        ? (b.seller.rating_sum / b.seller.rating_count).toFixed(1)
        : "0.0",
    },
  };
};

export default function ExploreScreen() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [books, setBooks]             = useState([]);
  const [categories, setCategories]   = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading]         = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount]   = useState(0);

  // Khởi tạo từ URL params (q=... và danh-muc=...)
  const [searchQuery, setSearchQuery]           = useState(() => searchParams.get("q") || "");
  const selectedCategory                        = searchParams.get("danh-muc") || "all";
  const [selectedSchool, setSelectedSchool]     = useState("all");
  const [selectedPrice, setSelectedPrice]       = useState(0);
  const [sortBy, setSortBy]                     = useState("newest");
  const [schoolQuery, setSchoolQuery]           = useState("");

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ── Build Supabase query (có range theo trang) ─────────────────────────
  const buildQuery = useCallback((page) => {
    const from = (page - 1) * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;
    let q = supabase
      .from("lb_books")
      .select(`
        id, title, condition, price, original_price,
        images, urgent, verified, school, category,
        created_at, seller_id,
        seller:seller_id (name, rating_sum, rating_count)
      `)
      .eq("status", "active")
      .range(from, to);

    if (searchQuery.trim())     q = q.ilike("title", `%${searchQuery.trim()}%`);
    if (selectedCategory !== "all") q = q.eq("category", selectedCategory);
    if (selectedSchool !== "all")   q = q.eq("school", selectedSchool);

    const { min, max } = PRICE_PRESETS[selectedPrice];
    if (min > 0)          q = q.gte("price", min);
    if (max !== Infinity) q = q.lte("price", max);

    if (sortBy === "price_asc")       q = q.order("price", { ascending: true });
    else if (sortBy === "price_desc") q = q.order("price", { ascending: false });
    else                              q = q.order("created_at", { ascending: false });

    return q;
  }, [searchQuery, selectedCategory, selectedSchool, selectedPrice, sortBy]);

  // ── Build count query (giống filter, không range) ──────────────────────
  const buildCountQuery = useCallback(() => {
    let q = supabase
      .from("lb_books")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    if (searchQuery.trim())     q = q.ilike("title", `%${searchQuery.trim()}%`);
    if (selectedCategory !== "all") q = q.eq("category", selectedCategory);
    if (selectedSchool !== "all")   q = q.eq("school", selectedSchool);

    const { min, max } = PRICE_PRESETS[selectedPrice];
    if (min > 0)          q = q.gte("price", min);
    if (max !== Infinity) q = q.lte("price", max);

    return q;
  }, [searchQuery, selectedCategory, selectedSchool, selectedPrice]);

  // ── Fetch dữ liệu theo trang ───────────────────────────────────────────
  const fetchPage = useCallback(async (page) => {
    setLoading(true);
    const [booksResult, catsResult, countResult, catCountResult] = await Promise.all([
      buildQuery(page),
      supabase.from("lb_categories").select("*").order("order", { ascending: true }),
      buildCountQuery(),
      supabase.from("lb_books").select("category").eq("status", "active"),
    ]);

    if (booksResult.data) {
      setBooks(booksResult.data.map(normalizeBook));
    }
    if (catsResult.data) setCategories(catsResult.data);
    if (countResult.count !== null) setTotalCount(countResult.count);
    if (catCountResult.data) {
      const counts = {};
      for (const b of catCountResult.data) {
        if (b.category) counts[b.category] = (counts[b.category] || 0) + 1;
      }
      setCategoryCounts(counts);
    }
    setLoading(false);
  }, [buildQuery, buildCountQuery]);

  // ── Reset về trang 1 khi filter thay đổi ──────────────────────────────
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedSchool, selectedPrice, sortBy]);

  // ── Fetch khi filter hoặc trang thay đổi ──────────────────────────────
  useEffect(() => {
    fetchPage(currentPage);
  }, [fetchPage, currentPage]);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Render page numbers ────────────────────────────────────────────────
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-10 pb-6">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Trước
        </button>
        {start > 1 && (
          <>
            <button onClick={() => goToPage(1)} className="w-10 h-10 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">1</button>
            {start > 2 && <span className="text-slate-400 px-1">...</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => goToPage(p)}
            className={`w-10 h-10 text-sm font-medium rounded-lg border transition-colors ${
              p === currentPage
                ? "bg-teal-700 text-white border-teal-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="text-slate-400 px-1">...</span>}
            <button onClick={() => goToPage(totalPages)} className="w-10 h-10 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">{totalPages}</button>
          </>
        )}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Sau →
        </button>
      </div>
    );
  };

  // ── Danh sách trường (từ sách đã load) ───────────────────────────────
  const allSchools = useMemo(() => {
    const schools = [...new Set(books.map((b) => b.school).filter(Boolean))];
    return schools.sort();
  }, [books]);

  const filteredSchools = allSchools.filter((s) =>
    s.toLowerCase().includes(schoolQuery.toLowerCase())
  );

  const getCatCount = (catId) => categoryCounts[catId] || 0;

  const hasFilter = selectedCategory !== "all" || selectedSchool !== "all" || selectedPrice !== 0 || searchQuery.trim() !== "";

  const updateCategory = (catId) => {
    const next = new URLSearchParams(searchParams);
    if (catId === "all") next.delete("danh-muc");
    else next.set("danh-muc", catId);
    setSearchParams(next);
  };

  const resetAll = () => {
    setSearchParams({});
    setSelectedSchool("all");
    setSelectedPrice(0);
    setSchoolQuery("");
    setSearchQuery("");
  };

  // ── Skeleton cards ────────────────────────────────────────────────────
  const SkeletonCard = () => (
    <div className="animate-pulse">
      <div className="aspect-[3/4] bg-slate-200 rounded-lg mb-3" />
      <div className="h-3 bg-slate-200 rounded w-4/5 mb-2" />
      <div className="h-3 bg-slate-200 rounded w-2/3 mb-2" />
      <div className="h-4 bg-slate-200 rounded w-1/3" />
    </div>
  );

  return (
    <div className="py-6 flex flex-col lg:flex-row gap-8">
      {/* ── Sidebar bộ lọc ── */}
      <aside className="w-full lg:w-72 flex-shrink-0">
        <div className="sticky top-24 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Bộ lọc</h2>
            {hasFilter && (
              <button onClick={resetAll} className="text-xs text-slate-500 hover:text-slate-700 font-medium hover:underline transition-colors">
                Xoá tất cả
              </button>
            )}
          </div>

          {/* Search box */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm tài liệu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200 bg-white transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          {/* Danh mục */}
          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Danh mục ngành</h3>
            <ul className="space-y-2">
              <li>
                <button onClick={() => updateCategory("all")} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${selectedCategory === "all" ? "bg-teal-50 text-teal-700 border-teal-200" : "text-slate-600 hover:bg-slate-50 border-transparent"}`}>
                  Tất cả danh mục
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button onClick={() => updateCategory(selectedCategory === cat.id ? "all" : cat.id)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-between group border ${selectedCategory === cat.id ? "bg-teal-50 text-teal-700 border-teal-200" : "text-slate-600 hover:bg-slate-50 border-transparent"}`}>
                    <span className="flex items-center gap-2">
                      <span>{categoryMeta[cat.id]?.icon || "📚"}</span>
                      {categoryMeta[cat.id]?.label || cat.name}
                    </span>
                    <span className={`text-xs font-medium ${selectedCategory === cat.id ? "text-teal-600" : "text-slate-400 group-hover:text-slate-500"}`}>
                      {getCatCount(cat.id)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-slate-100" />

          {/* Trường học */}
          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Trường đại học</h3>
            <div className="relative mb-3">
              <svg className="absolute left-3 top-3 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Tìm trường..." value={schoolQuery} onChange={(e) => setSchoolQuery(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200 bg-white transition-colors" />
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
              <button onClick={() => setSelectedSchool("all")} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all border ${selectedSchool === "all" ? "bg-teal-50 text-teal-700 border-teal-200" : "text-slate-600 hover:bg-slate-50 border-transparent"}`}>
                Tất cả trường
              </button>
              {filteredSchools.map((school) => (
                <button key={school} onClick={() => setSelectedSchool(selectedSchool === school ? "all" : school)} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all leading-snug border ${selectedSchool === school ? "bg-teal-50 text-teal-700 border-teal-200" : "text-slate-600 hover:bg-slate-50 border-transparent"}`}>
                  {school}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Khoảng giá */}
          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Khoảng giá</h3>
            <ul className="space-y-2">
              {PRICE_PRESETS.map((preset, idx) => (
                <li key={idx}>
                  <button onClick={() => setSelectedPrice(idx)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${selectedPrice === idx ? "bg-teal-50 text-teal-700 border-teal-200" : "text-slate-600 hover:bg-slate-50 border-transparent"}`}>
                    {preset.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* ── Danh sách sách ── */}
      <main className="flex-1 min-w-0">
        {/* Filter tags */}
        {hasFilter && (
          <div className="flex flex-wrap gap-2 mb-5 pb-4 border-b border-slate-100">
            {selectedCategory !== "all" && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200">
                <span>{categoryMeta[selectedCategory]?.icon}</span>
                {categoryMeta[selectedCategory]?.label || selectedCategory}
                <button onClick={() => updateCategory("all")} className="ml-0.5 hover:text-teal-900">✕</button>
              </span>
            )}
            {selectedSchool !== "all" && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200">
                🏫 {selectedSchool}
                <button onClick={() => setSelectedSchool("all")} className="ml-0.5 hover:text-teal-900">✕</button>
              </span>
            )}
            {selectedPrice !== 0 && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200">
                💰 {PRICE_PRESETS[selectedPrice].label}
                <button onClick={() => setSelectedPrice(0)} className="ml-0.5 hover:text-teal-900">✕</button>
              </span>
            )}
          </div>
        )}

        {/* Header + sort */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <h1 className="text-lg font-bold text-slate-900">
            {loading ? "Đang tải…" : `${totalCount} tài liệu`}
            {selectedCategory !== "all" && (
              <span className="font-normal text-slate-500 text-base"> · {categoryMeta[selectedCategory]?.label}</span>
            )}
            {totalPages > 1 && !loading && (
              <span className="font-normal text-slate-400 text-sm ml-2">(trang {currentPage}/{totalPages})</span>
            )}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Sắp xếp:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-slate-200 rounded-lg bg-white px-3 py-2 font-medium text-slate-700 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200 text-sm cursor-pointer transition-colors hover:border-slate-300">
              <option value="newest">Mới nhất</option>
              <option value="price_asc">Giá thấp → cao</option>
              <option value="price_desc">Giá cao → thấp</option>
            </select>
          </div>
        </div>

        {/* Grid sách */}
        {loading ? (
          // Skeleton loading lần đầu
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <svg className="w-12 h-12 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            <p className="font-semibold text-slate-500">Không tìm thấy tài liệu nào</p>
            <p className="text-sm mt-1">Thử điều chỉnh bộ lọc để xem thêm kết quả</p>
            <button onClick={resetAll} className="mt-4 px-4 py-2 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors">Xoá bộ lọc</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>

            {renderPagination()}
          </>
        )}
      </main>
    </div>
  );
}
