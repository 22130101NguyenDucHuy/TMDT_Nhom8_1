import { useState } from "react";
import { Link, Navigate, useParams, useNavigate } from "react-router-dom";
import { books, categories } from "../data/siteData";
import { formatPrice } from "../utils/formatters";
import BookCard from "../components/common/BookCard";

// --- Carousel ảnh sách ---
function ImageCarousel({ images, title }) {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));

  return (
    <div className="flex flex-col gap-3">
      {/* Ảnh chính */}
      <div className="relative bg-slate-100 rounded-xl overflow-hidden aspect-[4/5] group">
        <img
          src={images[current]}
          alt={`${title} - ảnh ${current + 1}`}
          className="w-full h-full object-cover transition-all duration-300"
        />

        {/* Nút prev / next */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100"
            >
              <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100"
            >
              <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Số ảnh */}
        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-full">
          {current + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${idx === current ? "border-teal-600" : "border-transparent opacity-60 hover:opacity-90"
              }`}
          >
            <img src={img} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Trang chi tiết sách ---
export default function BookDetailScreen() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [offerValue, setOfferValue] = useState("");
  const [showOfferBox, setShowOfferBox] = useState(false);

  const handleSendOffer = () => {
    if (!offerValue) return;
    navigate("/tin-nhan", { 
      state: { 
        initialOffer: {
          bookId: book?.id,
          bookTitle: book?.title,
          offerPrice: offerValue
        }
      } 
    });
  };

  const book = books.find((item) => item.id === bookId);
  if (!book) return <Navigate replace to="/kham-pha" />;

  // Giả lập nhiều ảnh từ 1 ảnh thực
  const bookImages = [book.image, book.image, book.image];

  const related = books.filter((b) => b.id !== book.id && b.category === book.category).slice(0, 4);

  const conditionColor = {
    "Mới 99%": "bg-green-100 text-green-700",
    "Mới 95%": "bg-green-100 text-green-700",
    "Mới 90%": "bg-blue-100 text-blue-700",
    "Mới 85%": "bg-blue-100 text-blue-700",
    "Mới 80%": "bg-yellow-100 text-yellow-700",
  }[book.condition] || "bg-slate-100 text-slate-600";

  return (
    <div className="max-w-6xl mx-auto py-4 md:py-6">
      {/* Breadcrumb */}
      <div className="text-sm font-medium text-slate-400 mb-5 flex items-center gap-1.5">
        <Link to="/" className="hover:text-teal-700 transition-colors">Trang chủ</Link>
        <span>›</span>
        <Link to="/kham-pha" className="hover:text-teal-700 transition-colors">Tài liệu</Link>
        <span>›</span>
        <span className="text-slate-600 truncate max-w-xs">{book.title}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* === Cột Trái: Carousel Ảnh === */}
        <div className="w-full lg:w-[55%]">
          <ImageCarousel images={bookImages} title={book.title} />
        </div>

        {/* === Cột Phải: Thông tin & Hành động === */}
        <div className="w-full lg:w-[45%] flex flex-col">

          {/* Tiêu đề + Yêu thích */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-snug mb-1">{book.title}</h1>
              <p className="text-sm text-slate-500">{book.edition}</p>
            </div>
            <button className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 hover:border-teal-500 hover:text-teal-600 text-slate-400 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          {/* Giá */}
          <div className="mb-4">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-slate-900">{formatPrice(book.price)}</span>
              <span className="text-sm text-slate-400 line-through">{formatPrice(book.originalPrice)}</span>
              <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                -{Math.round((1 - book.price / book.originalPrice) * 100)}%
              </span>
            </div>
          </div>

          {/* Bảo vệ người mua */}
          <div className="flex items-center gap-2 text-teal-700 text-xs font-semibold mb-5">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Được bảo vệ bởi LoopBook
          </div>

          {/* Thông tin chi tiết sách */}
          <div className="border-t border-slate-100 py-4 mb-4">
            <h2 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Thông tin tài liệu</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <span className="text-slate-400 block mb-0.5">Tác giả</span>
                <span className="font-semibold text-slate-800">{book.author}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Nhà xuất bản</span>
                <span className="font-semibold text-slate-800">{book.publisher}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Năm xuất bản</span>
                <span className="font-semibold text-slate-800">{book.year}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Tình trạng</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${conditionColor}`}>{book.condition}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block mb-0.5">Trường sử dụng</span>
                <span className="font-semibold text-slate-800">{book.school}</span>
              </div>
            </div>
          </div>

          {/* Mô tả */}
          <div className="mb-5">
            <p className="text-sm text-slate-600 leading-relaxed">{book.description}</p>
          </div>

          {/* Nút CTA chính */}
          <div className="flex flex-col gap-2.5 mb-5">
            <button className="w-full py-3.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg transition-colors text-sm">
              Mua ngay
            </button>
            <button
              onClick={() => setShowOfferBox(!showOfferBox)}
              className="w-full py-3 border border-teal-700 text-teal-700 hover:bg-teal-50 font-bold rounded-lg transition-colors text-sm"
            >
              Trả giá
            </button>
            <Link
              to="/tin-nhan"
              className="w-full py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold rounded-lg transition-colors text-sm text-center"
            >
              Nhắn tin cho người bán
            </Link>
          </div>

          {/* Hộp trả giá (mở rộng khi bấm) */}
          {showOfferBox && (
            <div className="bg-slate-50 rounded-lg p-4 mb-5 border border-slate-200">
              <p className="text-sm font-bold text-slate-800 mb-3">Nhập mức giá bạn muốn trả</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    placeholder="VD: 110000"
                    value={offerValue}
                    onChange={(e) => setOfferValue(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white"
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₫</span>
                </div>
                <button onClick={handleSendOffer} className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-sm transition-colors">
                  Gửi
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Tối đa giảm {Math.round((1 - book.price / book.originalPrice) * 100)}% so với giá niêm yết
              </p>
            </div>
          )}

          {/* Thông tin bảo vệ người mua */}
          <div className="bg-teal-50 rounded-xl p-4 flex gap-3 text-sm border border-teal-100 mb-5">
            <svg className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="font-bold text-teal-900 mb-0.5">Phí bảo vệ người mua</p>
              <p className="text-teal-800 text-xs leading-relaxed">
                Mọi giao dịch qua nút "Mua ngay" đều được bảo vệ theo{" "}
                <a href="#" className="underline font-semibold">Chính sách hoàn tiền</a> của LoopBook.
              </p>
            </div>
          </div>

          {/* Hồ sơ người bán — tách biệt rõ ràng khỏi thông tin tác giả */}
          <div className="border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer">
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-lg flex-shrink-0">
              {book.seller?.name?.charAt(0) || "N"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-bold text-slate-900 text-sm">{book.seller?.name}</p>
                {book.verified && (
                  <svg className="w-4 h-4 text-teal-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-1">{book.seller?.faculty}</p>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-yellow-500">{"★".repeat(Math.round(book.seller?.rating || 4))}</span>
                <span className="text-slate-400">({book.seller?.rating}/5)</span>
                <span className="text-slate-300 mx-1">·</span>
                <span className="text-slate-400">Phản hồi trong {book.seller?.responseTime}</span>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Sản phẩm liên quan */}
      {related.length > 0 && (
        <section className="mt-14 border-t border-slate-100 pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Sách liên quan</h2>
            <Link to="/kham-pha" className="text-sm text-teal-700 font-semibold hover:underline">
              Xem thêm
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-8">
            {related.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
