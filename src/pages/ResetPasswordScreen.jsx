import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ResetPasswordScreen() {
  const { updatePassword, showToast } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      showToast("Mật khẩu phải có ít nhất 6 ký tự", "error");
      return;
    }
    if (password !== confirm) {
      showToast("Mật khẩu xác nhận không khớp", "error");
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      showToast(error.message || "Có lỗi xảy ra", "error");
    } else {
      showToast("Đặt lại mật khẩu thành công!", "success");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Đặt lại mật khẩu</h1>
        <p className="text-slate-500 text-sm mb-6">Nhập mật khẩu mới cho tài khoản của bạn.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="font-bold text-slate-900 text-sm block mb-2">Mật khẩu mới</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="vinted-input"
              placeholder="Ít nhất 6 ký tự"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-900 text-sm block mb-2">Xác nhận mật khẩu</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="vinted-input"
              placeholder="Nhập lại mật khẩu mới"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className="vinted-btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Đang xử lý...
              </>
            ) : "Đặt lại mật khẩu"}
          </button>
        </form>
      </div>
    </div>
  );
}
