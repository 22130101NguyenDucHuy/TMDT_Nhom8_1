import { useState, useEffect } from "react";
import { Link, Navigate, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { formatPrice } from "../utils/formatters";
import BookCard from "../components/common/BookCard";
import { useAuth } from "../contexts/AuthContext";
import { useFavorite } from "../hooks/useFavorite";
import QuickCheckoutModal from "../components/checkout/QuickCheckoutModal";

function ImageCarousel({ images, title }) {
  const [current, setCurrent] = useState(0);
  const imgs = Array.isArray(images) && images.length > 0 ? images : [null];

  const prev = () => setCurrent((c) => (c === 0 ? imgs.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === imgs.length - 1 ? 0 : c + 1));

  return (
    <div className="flex flex-col gap-3">
      <div className="relative bg-slate-100 rounded-xl overflow-hidden aspect-[4/5] group">
        {imgs[current] ? (
          <img src={imgs[current]} alt={`${title} - ảnh ${current + 1}`} className="w-full h-full object-cover transition-all duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
        )}
        {imgs.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100">
              <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100">
              <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}
        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-full">
          {current + 1} / {imgs.length}
        </div>
      </div>
      {imgs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {imgs.map((img, idx) => (
            <button key={idx} onClick={() => setCurrent(idx)} className={`flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${idx === current ? "border-teal-600" : "border-transparent opacity-60 hover:opacity-90"}`}>
              {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const conditionLabels = {
  brand_new: "Mới 100%", like_new: "Như mới", very_good: "Rất tốt",
  good: "Tốt", acceptable: "Cũ",
};
const conditionColor = {
  brand_new: "bg-green-100 text-green-700", like_new: "bg-green-100 text-green-700",
  very_good: "bg-blue-100 text-blue-700", good: "bg-yellow-100 text-yellow-700",
  acceptable: "bg-red-100 text-red-700",
};

export default function BookDetailScreen() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { user, userData, requireAuth, showToast } = useAuth();
  const [book, setBook] = useState(null);
  const [seller, setSeller] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offerValue, setOfferValue] = useState("");
  const [showOfferBox, setShowOfferBox] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const { isFavorite, loading: favLoading, toggle: toggleFavorite } = useFavorite(bookId, user);

  useEffect(() => {
    if (!bookId) return;
    const fetchBook = async () => {
      setLoading(true);
      const { data: bookData } = await supabase
        .from("lb_books")
        .select("*, seller:seller_id(id, name, rating_sum, rating_count)")
        .eq("id", bookId)
        .single();
      if (bookData) {
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

        const resolveImgs = (id, imagesList) => {
          if (Array.isArray(imagesList) && imagesList.length > 0) {
            return imagesList.map(img => img.startsWith('http') ? img : `https://ehvgtgzleukxtqgstivd.supabase.co/storage/v1/object/public/books2/${img}`);
          } else {
            const fallbackFile = defaultImageMap[id];
            if (fallbackFile) {
              return [`https://ehvgtgzleukxtqgstivd.supabase.co/storage/v1/object/public/books/${fallbackFile}`];
            } else {
              return [`https://ehvgtgzleukxtqgstivd.supabase.co/storage/v1/object/public/books/${id}_0.jpg`];
            }
          }
        };

        const mainImgs = resolveImgs(bookData.id, bookData.images);
        setBook({
          ...bookData,
          images: mainImgs,
          image: mainImgs[0] || null,
        });

        setSeller({
          name: bookData.seller?.name || "Người bán",
          rating: bookData.seller && bookData.seller.rating_count > 0
            ? (bookData.seller.rating_sum / bookData.seller.rating_count).toFixed(1) : "0.0",
        });
        const { data: relData } = await supabase
          .from("lb_books")
          .select("id, title, condition, price, original_price, images, urgent, verified, school, category, created_at, seller_id")
          .eq("status", "active")
          .eq("category", bookData.category)
          .neq("id", bookId)
          .limit(4);
        if (relData) {
          setRelated(relData.map((b) => {
            const relImgs = resolveImgs(b.id, b.images);
            return {
              ...b,
              images: relImgs,
              image: relImgs[0] || null,
              originalPrice: b.original_price,
            };
          }));
        }
      }
      setLoading(false);
    };
    fetchBook();
  }, [bookId]);

  const handleToggleFavorite = async () => {
    if (!requireAuth()) return;
    try {
      const result = await toggleFavorite();
      if (result?.added) showToast("Đã thêm vào danh sách yêu thích", "success");
      else if (result?.added === false) showToast("Đã xóa khỏi danh sách yêu thích", "success");
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra", "error");
    }
  };

  const handleBuyNow = () => {
    if (!requireAuth()) return;
    setShowCheckoutModal(true);
  };

  const handleContactSeller = () => {
    if (!requireAuth()) return;
    // Không cho nhắn tin chính mình
    if (user?.id === book?.seller_id) {
      showToast("Đây là sản phẩm của bạn", "error");
      return;
    }
    navigate("/tin-nhan", {
      state: {
        sellerId: book?.seller_id,
        sellerName: seller?.name,
        bookId: book?.id,
        bookTitle: book?.title,
        bookImage: book?.images?.[0] || null,
      }
    });
  };

  const handleSendOffer = () => {
    if (!requireAuth()) return;
    if (!offerValue) return;
    if (user?.id === book?.seller_id) {
      showToast("Đây là sản phẩm của bạn", "error");
      return;
    }
    navigate("/tin-nhan", {
      state: {
        sellerId: book?.seller_id,
        sellerName: seller?.name,
        bookId: book?.id,
        bookTitle: book?.title,
        bookImage: book?.images?.[0] || null,
        initialOffer: { offerPrice: offerValue },
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700" />
      </div>
    );
  }

  if (!book) return <Navigate replace to="/kham-pha" />;

  const bookImages = Array.isArray(book.images) && book.images.length > 0 ? book.images : [null];
  const condLabel = conditionLabels[book.condition] || book.condition;

  return (
    <div className="max-w-6xl mx-auto py-4 md:py-6">
      <div className="text-sm font-medium text-slate-400 mb-5 flex items-center gap-1.5">
        <Link to="/" className="hover:text-teal-700 transition-colors">Trang chủ</Link>
        <span>›</span>
        <Link to="/kham-pha" className="hover:text-teal-700 transition-colors">Tài liệu</Link>
        <span>›</span>
        <span className="text-slate-600 truncate max-w-xs">{book.title}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="w-full lg:w-[55%]">
          <ImageCarousel images={bookImages} title={book.title} />
        </div>

        <div className="w-full lg:w-[45%] flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-snug mb-1">{book.title}</h1>
              {book.edition && <p className="text-sm text-slate-500">{book.edition}</p>}
            </div>
            <button onClick={handleToggleFavorite} disabled={favLoading} className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full border transition-all disabled:opacity-50 ${isFavorite ? "bg-red-50 border-red-300 text-red-500" : "border-slate-200 hover:border-teal-500 hover:text-teal-600 text-slate-400"}`}>
              <svg className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </button>
          </div>

          <div className="mb-4">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-slate-900">{formatPrice(book.price)}</span>
              {book.original_price && book.original_price > 0 && (
                <>
                  <span className="text-sm text-slate-400 line-through">{formatPrice(book.original_price)}</span>
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    -{Math.round((1 - book.price / book.original_price) * 100)}%
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-teal-700 text-xs font-semibold mb-5">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            Được bảo vệ bởi LoopBook
          </div>

          <div className="border-t border-slate-100 py-4 mb-4">
            <h2 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Thông tin tài liệu</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {book.author && <div><span className="text-slate-400 block mb-0.5">Tác giả</span><span className="font-semibold text-slate-800">{book.author}</span></div>}
              {book.publisher && <div><span className="text-slate-400 block mb-0.5">Nhà xuất bản</span><span className="font-semibold text-slate-800">{book.publisher}</span></div>}
              {book.year && <div><span className="text-slate-400 block mb-0.5">Năm xuất bản</span><span className="font-semibold text-slate-800">{book.year}</span></div>}
              <div><span className="text-slate-400 block mb-0.5">Tình trạng</span><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${conditionColor[book.condition] || "bg-slate-100 text-slate-600"}`}>{condLabel}</span></div>
              {book.school && <div className="col-span-2"><span className="text-slate-400 block mb-0.5">Trường sử dụng</span><span className="font-semibold text-slate-800">{book.school}</span></div>}
            </div>
          </div>

          {book.description && (
            <div className="mb-5">
              <p className="text-sm text-slate-600 leading-relaxed">{book.description}</p>
            </div>
          )}

          <div className="flex flex-col gap-2.5 mb-5">
            <button onClick={handleBuyNow} className="w-full py-3.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg transition-colors text-sm">
              Mua ngay
            </button>
            <button onClick={() => { if (!requireAuth()) return; setShowOfferBox(!showOfferBox); }} className="w-full py-3 border border-teal-700 text-teal-700 hover:bg-teal-50 font-bold rounded-lg transition-colors text-sm">
              Trả giá
            </button>
            {user?.id !== book?.seller_id && (
              <button onClick={handleContactSeller} className="w-full py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold rounded-lg transition-colors text-sm">
                Nhắn tin cho người bán
              </button>
            )}
          </div>

          {showOfferBox && (
            <div className="bg-slate-50 rounded-lg p-4 mb-5 border border-slate-200">
              <p className="text-sm font-bold text-slate-800 mb-3">Nhập mức giá bạn muốn trả</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type="number" placeholder="VD: 110000" value={offerValue} onChange={(e) => setOfferValue(e.target.value)} className="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white" />
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₫</span>
                </div>
                <button onClick={handleSendOffer} className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-sm transition-colors">Gửi</button>
              </div>
            </div>
          )}

          <div className="bg-teal-50 rounded-xl p-4 flex gap-3 text-sm border border-teal-100 mb-5">
            <svg className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            <div>
              <p className="font-bold text-teal-900 mb-0.5">Phí bảo vệ người mua</p>
              <p className="text-teal-800 text-xs leading-relaxed">Mọi giao dịch qua nút "Mua ngay" đều được bảo vệ theo <a href="#" className="underline font-semibold">Chính sách hoàn tiền</a> của LoopBook.</p>
            </div>
          </div>

          {seller && (
            <div className="border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-lg flex-shrink-0">
                {(seller.name || "N").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-slate-900 text-sm">{seller.name}</p>
                  {book.verified && (
                    <svg className="w-4 h-4 text-teal-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-yellow-500">{"★".repeat(Math.round(parseFloat(seller.rating) || 4))}</span>
                  <span className="text-slate-400">({seller.rating}/5)</span>
                </div>
              </div>
              <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </div>
          )}
        </div>
      </div>

      {showCheckoutModal && book && (
        <QuickCheckoutModal book={book} onClose={() => setShowCheckoutModal(false)} />
      )}

      {related.length > 0 && (
        <section className="mt-14 border-t border-slate-100 pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Sách liên quan</h2>
            <Link to="/kham-pha" className="text-sm text-teal-700 font-semibold hover:underline">Xem thêm</Link>
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
