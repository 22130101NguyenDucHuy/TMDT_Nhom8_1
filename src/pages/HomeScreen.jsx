import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import BookCard from "../components/common/BookCard";
import { useBooks } from "../hooks/useBooks";
import { useState, useEffect } from "react";

const categoryIcons = {
  economics: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
  ),
  engineering: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  ),
  law: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
  ),
  language: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
  ),
  agriculture: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ),
  sociology: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  ),
  "cong-nghe-thong-tin": (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  ),
  "khoa-hoc-tu-nhien": (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
  ),
  "toan-hoc": (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
  ),
  "y-hoc": (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
  ),
  "ngoai-ngu": "language",
  "kinh-te": "economics",
  "ky-thuat": "engineering",
  "luat": "law",
  "nong-nghiep": "agriculture",
  "xa-hoi-hoc": "sociology",
};

// Skeleton loader cho BookCard
function BookCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] bg-slate-200 rounded-lg mb-3" />
      <div className="h-3 bg-slate-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
      <div className="h-4 bg-slate-200 rounded w-1/3" />
    </div>
  );
}

export default function HomeScreen() {
  const { books, loading } = useBooks({ limit: 10 });
  const [categories, setCategories] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});

  useEffect(() => {
    supabase.from("lb_categories").select("*").order("order", { ascending: true })
      .then(({ data }) => { if (data) setCategories(data); })
      .catch(() => {});

    supabase.from("lb_books").select("category").eq("status", "active")
      .then(({ data }) => {
        if (data) {
          const counts = {};
          data.forEach(b => {
            if (b.category) counts[b.category] = (counts[b.category] || 0) + 1;
          });
          setCategoryCounts(counts);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative flex flex-col gap-12 py-6">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="lb-grid" />
        <div className="lb-orb lb-orb-1" />
        <div className="lb-orb lb-orb-2" />
      </div>

      {/* --- Hero Banner --- */}
      <section className="relative lb-hero rounded-[28px] overflow-hidden">
        <div className="absolute inset-0">
          <div className="lb-orb lb-orb-hero" />
          <div className="lb-orb lb-orb-hero-alt" />
        </div>

        <div className="relative z-10 grid gap-10 md:grid-cols-[1.2fr_0.8fr] items-center px-7 sm:px-10 md:px-14 py-12 md:py-16">
          <div className="text-white lb-fade-up">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-teal-100/80">
              <span className="w-2 h-2 rounded-full bg-amber-300" />
              Nền tảng trao đổi sách sinh viên #1
            </p>
            <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold mt-4 leading-[1.05]">
              Sách giáo trình cũ,
              <span className="block text-teal-100">tri thức mới.</span>
            </h1>
            <p className="text-teal-100/90 text-base md:text-lg mt-5 max-w-xl">
              Mua bán tài liệu học tập trực tiếp với sinh viên cùng trường. Nhanh, tiết kiệm và uy tín.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                to="/dang-ban"
                className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-teal-50 transition-colors shadow-md"
              >
                Bắt đầu đăng bán
              </Link>
              <Link
                to="/kham-pha"
                className="px-6 py-3 bg-white/10 border border-white/30 text-white rounded-xl font-bold hover:bg-white/20 transition-colors"
              >
                Khám phá sách
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-8 text-sm text-teal-100/80">
              <span className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-200">✓</span>
                Đăng tin trong 2 phút
              </span>
              <span className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-200">✓</span>
                Chat trực tiếp, minh bạch
              </span>
            </div>
          </div>

          <div className="lb-fade-up-delayed">
            <div className="bg-white/10 border border-white/20 rounded-2xl p-6 backdrop-blur shadow-[0_20px_70px_rgba(15,23,42,0.35)]">
              <p className="text-sm text-teal-100/80">Gợi ý nhanh hôm nay</p>
              <h3 className="text-xl font-bold text-white mt-2">Giao dịch an toàn, nhanh gọn</h3>
              <div className="mt-5 space-y-4">
                {[
                  { title: "Kho sách được xác thực", detail: "Đánh giá người bán real-time." },
                  { title: "Giá gợi ý thông minh", detail: "Trung bình theo trường." },
                  { title: "Kênh chat nội bộ", detail: "Nhắn tin ngay trên app." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <span className="mt-1 w-3 h-3 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(253,230,138,0.8)]" />
                    <div>
                      <p className="text-white font-semibold">{item.title}</p>
                      <p className="text-sm text-teal-100/80">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Thống kê nhanh --- */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { value: "2.400+", label: "Sinh viên đang dùng", note: "Tăng 18%/tháng" },
          { value: "1.800+", label: "Tài liệu được đăng", note: "Nhiều nhất tại HCM" },
          { value: "98%", label: "Giao dịch thành công", note: "Cam kết hoàn tiền" },
        ].map(({ value, label, note }) => (
          <div
            key={label}
            className="bg-white/90 border border-slate-100 rounded-2xl p-5 shadow-[0_12px_35px_rgba(148,163,184,0.18)] backdrop-blur lb-float"
          >
            <p className="text-2xl font-extrabold text-slate-900">{value}</p>
            <p className="text-sm text-slate-500 font-medium mt-1">{label}</p>
            <p className="text-xs text-emerald-600 font-semibold mt-3">{note}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { title: "Đăng tin nhanh", desc: "Chụp ảnh, nhập giá, đăng trong 2 phút." },
          { title: "Đánh giá rõ ràng", desc: "Thang uy tín người bán minh bạch." },
          { title: "Giao dịch linh hoạt", desc: "Gặp trực tiếp hoặc gửi qua bưu điện." },
        ].map((item) => (
          <div key={item.title} className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 transition-all">
            <h3 className="font-bold text-slate-900 text-lg">{item.title}</h3>
            <p className="text-sm text-slate-500 mt-2">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* --- Danh mục --- */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <p className="lb-category-pill">Danh mục nổi bật</p>
            <h2 className="text-2xl font-bold text-slate-900 mt-2">Danh mục tài liệu</h2>
            <p className="text-sm text-slate-500 mt-1">Chọn nhanh theo ngành học bạn cần</p>
          </div>
          <Link to="/kham-pha" className="text-sm text-teal-700 font-semibold hover:underline">
            Tất cả danh mục
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((c, index) => (
            <Link
              key={c.id}
              to={`/kham-pha?danh-muc=${c.id}`}
              className="lb-category-card group"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <span className="lb-category-glow" />
              <div className="lb-category-icon">
                {typeof categoryIcons[c.id] === "string" ? categoryIcons[categoryIcons[c.id]] : (categoryIcons[c.id] || categoryIcons.language)}
              </div>
              <div className="text-center">
                <span className="block font-semibold text-slate-900 text-sm">{c.name}</span>
                <span className="lb-category-count">
                  {categoryCounts[c.id] || 0} tài liệu
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* --- Đăng bán gần đây --- */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Tin đăng mới nhất</h2>
            <p className="text-sm text-slate-500 mt-0.5">Sách đang được đăng bán trong cộng đồng</p>
          </div>
          <Link to="/kham-pha" className="text-sm text-teal-700 font-semibold hover:underline">
            Xem tất cả
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => <BookCardSkeleton key={i} />)
            : books.length > 0
              ? books.map((book) => <BookCard key={book.id} book={book} />)
              : (
                <div className="col-span-full text-center py-16 text-slate-400">
                  <p className="font-semibold">Chưa có tài liệu nào được đăng</p>
                  <Link to="/dang-ban" className="mt-3 inline-block text-teal-700 font-semibold text-sm hover:underline">
                    Đăng bán ngay →
                  </Link>
                </div>
              )
          }
        </div>
      </section>

      {/* --- Banner kêu gọi đăng bán --- */}
      <section className="relative overflow-hidden rounded-3xl lb-hero p-8 md:p-12 text-center text-white">
        <div className="absolute inset-0">
          <div className="lb-orb lb-orb-cta" />
          <div className="lb-orb lb-orb-hero-alt" />
        </div>
        <div className="relative">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Dọn tủ sách để kiếm thêm thu nhập?
          </h2>
          <p className="text-teal-100/80 mb-6 max-w-md mx-auto text-sm md:text-base">
            Chụp ảnh, đăng tin và chờ người liên hệ. Đơn giản vậy thôi.
          </p>
          <Link
            to="/dang-ban"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-teal-50 transition-colors"
          >
            Đăng bán ngay
          </Link>
        </div>
      </section>
    </div>
  );
}
