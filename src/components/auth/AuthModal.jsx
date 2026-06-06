import { useState } from "react";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../contexts/AuthContext";

export default function AuthModal() {
  const { isAuthModalOpen, authModalMode, setAuthModalMode, closeAuthModal, showToast } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isAuthModalOpen) return null;

  const handleAuth = async (e) => {
    e.preventDefault();

    if (authModalMode === "register" && password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (authModalMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        showToast("Đăng nhập thành công!", "success");
        closeAuthModal();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        if (data.user) {
          const { error: userError } = await supabase.from('lb_users').insert([
            {
              id: data.user.id,
              email: data.user.email,
              name: "Người dùng mới"
            }
          ]);

          if (userError) {
            console.error("Lỗi khi lưu vào bảng lb_users:", userError);
          }
        }

        if (data.session) {
          await supabase.auth.signOut();
        }

        showToast("Đăng ký thành công!", "success");
        closeAuthModal();
        setConfirmPassword("");
        setPassword("");
      }
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header Modal with Tabs */}
        <div className="flex items-center justify-between px-6 pt-2 border-b border-slate-100">
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => {
                setAuthModalMode("register");
                setError(null);
                setConfirmPassword("");
              }}
              className={`py-3 text-lg font-bold border-b-2 transition-colors ${authModalMode === "register" ? "text-teal-700 border-teal-700" : "text-slate-400 border-transparent hover:text-slate-600"}`}
            >
              Đăng ký
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthModalMode("login");
                setError(null);
                setConfirmPassword("");
              }}
              className={`py-3 text-lg font-bold border-b-2 transition-colors ${authModalMode === "login" ? "text-teal-700 border-teal-700" : "text-slate-400 border-transparent hover:text-slate-600"}`}
            >
              Đăng nhập
            </button>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nội dung form */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="vinted-label">Email</label>
              <input
                type="email"
                required
                placeholder="Ví dụ: hello@loopbook.vn"
                className="vinted-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="vinted-label">Mật khẩu</label>
              <input
                type="password"
                required
                placeholder="Nhập mật khẩu của bạn"
                className="vinted-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {authModalMode === "register" && (
              <div>
                <label className="vinted-label">Xác nhận mật khẩu</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập lại mật khẩu"
                  className="vinted-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="vinted-btn-primary mt-6"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                authModalMode === "login" ? "Đăng nhập" : "Tạo tài khoản"
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
