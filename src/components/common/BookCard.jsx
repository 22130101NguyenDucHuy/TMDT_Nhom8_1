import { Link } from "react-router-dom";
import { formatPrice } from "../../utils/formatters";

export default function BookCard({ book }) {
  return (
    <Link to={`/sach/${book.id}`} className="group block">
      {/* Ảnh */}
      <div className="relative aspect-[3/4] mb-3 bg-slate-100 overflow-hidden rounded-lg">
        <img
          src={book.image}
          alt={book.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Badge bán gấp */}
        {book.urgent && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Bán gấp
          </div>
        )}
        {/* Badge xác thực */}
        {book.verified && (
          <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1" title="Đã kiểm định">
            <svg className="w-3.5 h-3.5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        {/* Người bán (avatar mini) */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
          <div className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-[9px] flex-shrink-0">
            {book.seller?.name?.charAt(0) || "N"}
          </div>
          <span className="text-[11px] text-slate-700 font-medium truncate max-w-[70px]">
            {book.seller?.name?.split(" ").pop() || "Người bán"}
          </span>
        </div>
      </div>

      {/* Thông tin bên dưới */}
      <div>
        <p className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2 mb-1 group-hover:text-teal-700 transition-colors">
          {book.title}
        </p>
        <p className="text-[12px] text-slate-400 mb-1.5 truncate">{book.condition} · {book.school}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-extrabold text-slate-900">{formatPrice(book.price)}</span>
          {book.originalPrice != null && book.originalPrice > 0 && (
            <span className="text-xs text-slate-400 line-through">{formatPrice(book.originalPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
