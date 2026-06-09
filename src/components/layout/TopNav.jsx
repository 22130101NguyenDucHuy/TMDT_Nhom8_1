import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../services/supabase";

export default function TopNav() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const { user, userData, openLoginModal, openRegisterModal, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("lb_categories").select("id, name").order("order", { ascending: true }).then(({ data }) => {
      if (data) setCategories(data);
    }).catch(() => {});
  }, []);

  const VISIBLE_COUNT = 5;
  const visibleCats = categories.slice(0, VISIBLE_COUNT);
  const hiddenCats = categories.slice(VISIBLE_COUNT);

  const handleSearch = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate(`/kham-pha?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 xl:px-8">
        {/* --- Hàng trên: Logo / Tìm kiếm / Tài khoản --- */}
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center">
            <BrandLogo className="h-8 w-auto object-contain" />
          </Link>

          {/* Thanh tìm kiếm */}
          <div className="flex-1 max-w-2xl hidden md:block mx-4">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Tìm kiếm tài liệu, sách..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-transparent rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-400 transition-all text-sm"
              />
            </div>
          </div>

          {/* Khu vực bên phải */}
          <div className="flex items-center gap-3 ml-auto">
            {user && (
              <>
                <Link
                  to="/dang-ban"
                  className="hidden sm:inline-flex items-center px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  Đăng bán
                </Link>

                <Link to="/tin-nhan" className="relative p-2 text-slate-500 hover:text-teal-700 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </Link>
              </>
            )}

            {/* Avatar + Menu hoặc Nút Đăng nhập/Đăng ký */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-teal-700 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 uppercase">
                    {userData?.name ? userData.name.charAt(0) : (user.email ? user.email.charAt(0) : "U")}
                  </div>
                  <svg className="w-4 h-4 text-slate-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-20 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="font-bold text-slate-900 text-sm truncate" title={user.email}>{userData?.name || user.email}</p>
                        <p className="text-xs text-slate-500 mt-0.5 capitalize">{userData?.role === 'admin' ? 'Quản trị viên' : (userData?.role === 'seller' ? 'Người bán' : 'Người dùng')}</p>
                      </div>
                      <div className="py-1">
                        <Link to="/quan-ly" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                          Bảng quản lý
                        </Link>

                        <Link to="/vi-tien" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                          Ví tiền
                        </Link>
                        
                        <Link to="/yeu-thich" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm font-medium">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                          Yêu thích
                        </Link>
                        <Link to="/yeu-cau-sach" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm font-medium">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          Yêu cầu sách
                        </Link>
                        <Link to="/yeu-cau-cua-toi" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm font-medium">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                          Yêu cầu của tôi
                        </Link>
                        {userData?.role === 'admin' && (
                          <>
                            <div className="border-t border-slate-100 my-1" />
                            <Link to="/admin" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-500 text-xs">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              Quản trị hệ thống
                            </Link>
                          </>
                        )}
                        
                        <div className="border-t border-slate-100 my-1" />
                        <button 
                          onClick={() => {
                            signOut();
                            setShowUserMenu(false);
                          }} 
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-red-600 text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={openRegisterModal}
                  className="hidden sm:inline-flex items-center px-4 py-2 text-teal-700 font-semibold text-sm hover:bg-teal-50 rounded-lg transition-colors"
                >
                  Đăng ký
                </button>
                <button
                  onClick={openLoginModal}
                  className="inline-flex items-center px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg font-semibold text-sm transition-colors"
                >
                  Đăng nhập
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- Hàng dưới: Danh mục điều hướng --- */}
        <div className="hidden md:flex items-center gap-1 py-1 border-t border-slate-100">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${isActive ? "text-teal-700 bg-teal-50" : "text-slate-600 hover:text-teal-700 hover:bg-slate-50"}`
            }
          >
            Trang chủ
          </NavLink>
          <NavLink
            to="/kham-pha"
            className={({ isActive }) =>
              `px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${isActive ? "text-teal-700 bg-teal-50" : "text-slate-600 hover:text-teal-700 hover:bg-slate-50"}`
            }
          >
            Khám phá tài liệu
          </NavLink>

          <span className="mx-1 text-slate-300 select-none">|</span>

          {visibleCats.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate(`/kham-pha?danh-muc=${cat.id}`)}
              className="px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap text-slate-600 hover:text-teal-700 hover:bg-slate-50 transition-colors"
            >
              {cat.name}
            </button>
          ))}

          {hiddenCats.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowCatDropdown(!showCatDropdown)}
                className="px-2 py-1.5 text-sm font-medium rounded-md text-slate-500 hover:text-teal-700 hover:bg-slate-50 transition-colors"
                title="Xem thêm danh mục"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
              </button>
              {showCatDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCatDropdown(false)} />
                  <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-20 overflow-hidden">
                    {hiddenCats.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => { setShowCatDropdown(false); navigate(`/kham-pha?danh-muc=${cat.id}`); }}
                        className="block w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-700 transition-colors"
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
