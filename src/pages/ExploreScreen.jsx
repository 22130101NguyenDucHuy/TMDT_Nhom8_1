import { useState, useMemo } from "react";
import { books, categories } from "../data/siteData";
import BookCard from "../components/common/BookCard";

// Lấy danh sách trường không trùng từ data
const allSchools = [...new Set(books.map((b) => b.school))].sort();

// Tên + icon cho từng danh mục
const categoryMeta = {
  economics: { label: "Kinh tế & Quản trị", icon: "📊" },
  engineering: { label: "Kỹ thuật & CNTT", icon: "⚙️" },
  law: { label: "Luật", icon: "⚖️" },
  language: { label: "Ngoại ngữ", icon: "🌐" },
  agriculture: { label: "Nông – Lâm – Ngư", icon: "🌱" },
  sociology: { label: "Xã hội & Nhân văn", icon: "👥" },
};

const PRICE_PRESETS = [
  { label: "Tất cả", min: 0, max: Infinity },
  { label: "Dưới 50k", min: 0, max: 50000 },
  { label: "50k – 100k", min: 50000, max: 100000 },
  { label: "100k – 200k", min: 100000, max: 200000 },
  { label: "Trên 200k", min: 200000, max: Infinity },
];

export default function ExploreScreen() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSchool, setSelectedSchool] = useState("all");
  const [selectedPrice, setSelectedPrice] = useState(0); // index vào PRICE_PRESETS
  const [sortBy, setSortBy] = useState("relevant");
  const [schoolQuery, setSchoolQuery] = useState("");

  const filteredBooks = useMemo(() => {
    let result = [...books];

    // Lọc danh mục
    if (selectedCategory !== "all") {
      result = result.filter((b) => b.category === selectedCategory);
    }

    // Lọc trường
    if (selectedSchool !== "all") {
      result = result.filter((b) => b.school === selectedSchool);
    }

    // Lọc giá
    const { min, max } = PRICE_PRESETS[selectedPrice];
    result = result.filter((b) => b.price >= min && b.price <= max);

    // Sắp xếp
    if (sortBy === "price_asc") result.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") result.sort((a, b) => b.price - a.price);
    else if (sortBy === "newest") result.sort((a, b) => b.year - a.year);

    return result;
  }, [selectedCategory, selectedSchool, selectedPrice, sortBy]);

  const hasFilter = selectedCategory !== "all" || selectedSchool !== "all" || selectedPrice !== 0;

  const resetAll = () => {
    setSelectedCategory("all");
    setSelectedSchool("all");
    setSelectedPrice(0);
    setSchoolQuery("");
  };

  const filteredSchools = allSchools.filter((s) =>
    s.toLowerCase().includes(schoolQuery.toLowerCase())
  );

  return (
    <div className="py-6 flex flex-col lg:flex-row gap-8">
      {/* ── Sidebar Bộ lọc ── */}
      <aside className="w-full lg:w-72 flex-shrink-0">
        <div className="sticky top-24 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Bộ lọc</h2>
            {hasFilter && (
              <button
                onClick={resetAll}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium hover:underline transition-colors"
              >
                Xoá tất cả
              </button>
            )}
          </div>

          {/* 1. Danh mục */}
          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">
              Danh mục ngành
            </h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === "all"
                      ? "bg-teal-50 text-teal-700 border border-teal-200"
                      : "text-slate-600 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  Tất cả danh mục
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() =>
                      setSelectedCategory(selectedCategory === cat.id ? "all" : cat.id)
                    }
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-between group border ${
                      selectedCategory === cat.id
                        ? "bg-teal-50 text-teal-700 border-teal-200"
                        : "text-slate-600 hover:bg-slate-50 border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{categoryMeta[cat.id]?.icon}</span>
                      {categoryMeta[cat.id]?.label || cat.name}
                    </span>
                    <span className={`text-xs font-medium ${selectedCategory === cat.id ? "text-teal-600" : "text-slate-400 group-hover:text-slate-500"}`}>
                      {books.filter((b) => b.category === cat.id).length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

        <div className="border-t border-slate-100" />

        {/* 2. Trường đại học */}
        <div className="bg-white border border-slate-100 rounded-xl p-4">
          <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">
            Trường đại học
          </h3>
          <div className="relative mb-3">
            <svg className="absolute left-3 top-3 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm trường..."
              value={schoolQuery}
              onChange={(e) => setSchoolQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200 bg-white transition-colors"
            />
          </div>
          <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
            <button
              onClick={() => setSelectedSchool("all")}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                selectedSchool === "all"
                  ? "bg-teal-50 text-teal-700 border-teal-200"
                  : "text-slate-600 hover:bg-slate-50 border-transparent"
              }`}
            >
              Tất cả trường
            </button>
            {filteredSchools.map((school) => (
              <button
                key={school}
                onClick={() => setSelectedSchool(selectedSchool === school ? "all" : school)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all leading-snug border ${
                  selectedSchool === school
                    ? "bg-teal-50 text-teal-700 border-teal-200"
                    : "text-slate-600 hover:bg-slate-50 border-transparent"
                }`}
              >
                {school}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* 3. Khoảng giá */}
        <div className="bg-white border border-slate-100 rounded-xl p-4">
          <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">
            Khoảng giá
          </h3>
          <ul className="space-y-2">
            {PRICE_PRESETS.map((preset, idx) => (
              <li key={idx}>
                <button
                  onClick={() => setSelectedPrice(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                    selectedPrice === idx
                      ? "bg-teal-50 text-teal-700 border-teal-200"
                      : "text-slate-600 hover:bg-slate-50 border-transparent"
                  }`}
                >
                  {preset.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0">
        {/* Active filter chips */}
        {hasFilter && (
          <div className="flex flex-wrap gap-2 mb-5 pb-4 border-b border-slate-100">
            {selectedCategory !== "all" && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200 hover:bg-teal-100 transition-colors">
                <span>{categoryMeta[selectedCategory]?.icon}</span>
                {categoryMeta[selectedCategory]?.label || selectedCategory}
                <button onClick={() => setSelectedCategory("all")} className="ml-0.5 hover:text-teal-900">✕</button>
              </span>
            )}
            {selectedSchool !== "all" && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200 hover:bg-teal-100 transition-colors">
                🏫 {selectedSchool}
                <button onClick={() => setSelectedSchool("all")} className="ml-0.5 hover:text-teal-900">✕</button>
              </span>
            )}
            {selectedPrice !== 0 && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200 hover:bg-teal-100 transition-colors">
                💰 {PRICE_PRESETS[selectedPrice].label}
                <button onClick={() => setSelectedPrice(0)} className="ml-0.5 hover:text-teal-900">✕</button>
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <h1 className="text-lg font-bold text-slate-900">
            {filteredBooks.length} tài liệu
            {selectedCategory !== "all" && (
              <span className="font-normal text-slate-500 text-base"> · {categoryMeta[selectedCategory]?.label}</span>
            )}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-slate-200 rounded-lg bg-white px-3 py-2 font-medium text-slate-700 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200 text-sm cursor-pointer transition-colors hover:border-slate-300"
            >
              <option value="relevant">Phù hợp nhất</option>
              <option value="price_asc">Giá thấp → cao</option>
              <option value="price_desc">Giá cao → thấp</option>
              <option value="newest">Mới nhất</option>
            </select>
          </div>
        </div>

        {filteredBooks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <svg className="w-12 h-12 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="font-semibold text-slate-500">Không tìm thấy tài liệu nào</p>
            <p className="text-sm mt-1">Thử điều chỉnh bộ lọc để xem thêm kết quả</p>
            <button onClick={resetAll} className="mt-4 px-4 py-2 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors">
              Xoá bộ lọc
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
