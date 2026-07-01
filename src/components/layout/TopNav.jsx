import { useState, useEffect, useCallback } from "react";
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
    supabase.from("lb_categories").select("id, name, is_active").eq("is_active", true).order("order", { ascending: true }).then(({ data }) => {
      if (data) setCategories(data);
    }).catch(() => {});
  }, []);

  const VISIBLE_COUNT = 5;
  const visibleCats = categories.slice(0, VISIBLE_COUNT);
  const hiddenCats = categories.slice(VISIBLE_COUNT);

  const handleSearch = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      const q = searchQuery.trim();
      if (user) {
        supabase.from('lb_search_logs').insert([{ user_id: user.id, keyword: q }]).then(() => {});
      } else {
        supabase.from('lb_search_logs').insert([{ keyword: q }]).then(() => {});
      }
      navigate(`/kham-pha?q=${encodeURIComponent(q)}`);
      setSearchQuery("");
    }
  };

  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('lb_notifications')
        .select('id, type, title, content, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.warn("fetchNotifications error:", err);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (!user) return;
    const channel = supabase
      .channel('realtime_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'lb_notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await supabase.from('lb_notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      } catch (err) {
        console.warn("mark read error:", err);
      }
    }
    setShowNotifDropdown(false);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    try {
      await supabase.from('lb_notifications').update({ is_read: true, read_at: new Date().toISOString() }).in('id', unreadIds);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.warn("mark all read error:", err);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 xl:px-8">
        {/* --- Hàng trên: Logo / Tìm kiếm / Tài khoản --- */}
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center h-full">
            <BrandLogo className="h-[90%] w-auto object-contain" />
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

                {/* Notification Bell */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      setShowNotifDropdown(!showNotifDropdown);
                      setShowUserMenu(false);
                    }}
                    className="relative p-2 text-slate-500 hover:text-teal-700 transition-colors focus:outline-none"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border border-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  
                  {showNotifDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowNotifDropdown(false)} />
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-20 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">Thông báo</span>
                          {unreadCount > 0 && (
                            <button 
                              onClick={handleMarkAllRead}
                              className="text-xs text-teal-600 hover:text-teal-700 font-semibold focus:outline-none"
                            >
                              Đọc tất cả
                            </button>
                          )}
                        </div>
                        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                          {notifications.length === 0 ? (
                            <div className="px-4 py-6 text-center text-slate-400 text-xs">Chưa có thông báo nào</div>
                          ) : (
                            notifications.map(notif => (
                              <div 
                                key={notif.id}
                                onClick={() => handleNotifClick(notif)}
                                className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-left ${!notif.is_read ? 'bg-teal-50/30' : ''}`}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <p className={`text-xs text-slate-800 font-semibold ${!notif.is_read ? 'text-slate-950 font-bold' : ''}`}>{notif.title}</p>
                                  {!notif.is_read && <span className="w-1.5 h-1.5 bg-teal-600 rounded-full flex-shrink-0 mt-1"></span>}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{notif.content}</p>
                                <p className="text-[9px] text-slate-400 mt-1">{new Date(notif.created_at).toLocaleString("vi-VN")}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Avatar + Menu hoặc Nút Đăng nhập/Đăng ký */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {userData?.avatar_url ? (
                    <img src={userData.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                  )}
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
                        <Link to="/profile" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          Thông tin cá nhân
                        </Link>


                        <Link to="/vi-tien" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                          Ví tiền
                        </Link>

                        <Link to="/my-transactions" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                          Đơn hàng & Giao dịch
                        </Link>
                        
                        <Link to="/yeu-thich" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm font-medium">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                          Yêu thích
                        </Link>
                        <Link to="/yeu-cau-sach" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-sm font-medium">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          Yêu cầu sách
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
