import { Link } from "react-router-dom";
import { formatPrice } from "../../utils/formatters";
import { getCategoryMeta } from "../../data/categoryMeta";
import { getBookImageUrl } from "../../utils/imageResolver";

export default function BookCard({ book }) {
  const imgSrc = getBookImageUrl(book);
  const sellerName = book.seller?.name || "Người bán";
  const sellerInitial = sellerName.charAt(0).toUpperCase();
  const displayName = sellerName.split(" ").pop();
  const urgency = book.urgent;
  const cat = book.category ? getCategoryMeta(book.category) : null;

  return (
    <Link to={`/sach/${book.id}`} className="group block">
      <div className="relative aspect-[3/4] mb-3 bg-slate-100 overflow-hidden rounded-lg">
        {imgSrc ? (
          <img src={imgSrc} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
        )}
        {urgency && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Bán gấp
          </div>
        )}
        {book.verified && (
          <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1" title="Đã kiểm định">
            <svg className="w-3.5 h-3.5 text-teal-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
          <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-[9px] flex-shrink-0">
            {sellerInitial}
          </div>
          <span className="text-[11px] text-slate-700 font-medium truncate max-w-[70px]">
            {displayName}
          </span>
        </div>
        {cat && (
          <div className="absolute top-2 right-2">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cat.color}`}>
              {cat.icon} {cat.label}
            </span>
          </div>
        )}
      </div>

      <div>
        <p className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2 mb-1 group-hover:text-teal-700 transition-colors">
          {book.title}
        </p>
        <p className="text-[12px] text-slate-400 mb-1.5 truncate">
          {book.condition ? (conditionLabels[book.condition] || book.condition) : ""}
          {book.school ? ` · ${book.school}` : ""}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-extrabold text-slate-900">{formatPrice(book.price)}</span>
          {(book.originalPrice || book.original_price) > 0 && (
            <span className="text-xs text-slate-400 line-through">{formatPrice(book.originalPrice || book.original_price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

const conditionLabels = {
  brand_new: "Mới 100%", like_new: "Như mới", very_good: "Rất tốt",
  good: "Tốt", acceptable: "Cũ",
};
