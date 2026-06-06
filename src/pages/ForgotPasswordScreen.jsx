import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ForgotPasswordScreen() {
  const { resetPassword, showToast } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      showToast(error.message || "Có lỗi xảy ra", "error");
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-6">
            <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Kiểm tra email của bạn</h2>
          <p className="text-slate-600 mb-6">
            Chúng tôi đã gửi liên kết đặt lại mật khẩu đến <span className="font-semibold text-slate-800">{email}</span>.
            Vui lòng kiểm tra hộp thư đến và làm theo hướng dẫn.
          </p>
          <Link to="/" className="vinted-btn-primary inline-block px-8 py-3 text-sm">Quay về trang chủ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Quên mật khẩu</h1>
        <p className="text-slate-500 text-sm mb-6">
          Nhập email của bạn, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="font-bold text-slate-900 text-sm block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="vinted-input"
              placeholder="your@email.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="vinted-btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Đang gửi...
              </>
            ) : "Gửi liên kết đặt lại"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Nhớ mật khẩu?{" "}
          <Link to="/" className="text-teal-700 font-semibold hover:underline">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
