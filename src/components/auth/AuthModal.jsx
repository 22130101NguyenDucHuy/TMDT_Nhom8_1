import { useState, useRef } from "react";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../contexts/AuthContext";

export default function AuthModal() {
  const { isAuthModalOpen, authModalMode, setAuthModalMode, closeAuthModal, showToast, signInWithOAuth, isEduEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationFile, setVerificationFile] = useState(null);
  const [verificationPreview, setVerificationPreview] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState(null);
  const fileInputRef = useRef(null);

  if (!isAuthModalOpen) return null;

  const handleAuth = async (e) => {
    e.preventDefault();

    if (authModalMode === "register" && password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    // Kiểm tra email .edu.vn khi đăng ký
    if (authModalMode === "register" && !isEduEmail(email)) {
      setError("Vui lòng sử dụng email trường học có đuôi .edu.vn để đăng ký.");
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
              name: "Người dùng mới",
              status: "inactive"
            }
          ]);

          if (userError) {
            console.error("Lỗi khi lưu vào bảng lb_users:", userError);
          }
        }

        setRegisteredUserId(data.user.id);
        setConfirmPassword("");
        setPassword("");
        setVerificationStep(true);
        showToast("Đăng ký thành công! Vui lòng tải lên ảnh xác thực.", "success");
      }
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVerificationFile(file);
    setVerificationPreview(URL.createObjectURL(file));
  };

  const handleSubmitVerification = async () => {
    if (!verificationFile || !registeredUserId) return;
    setVerificationLoading(true);
    setError(null);
    try {
      const fileExt = verificationFile.name.split('.').pop();
      const filePath = `${registeredUserId}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('student-verification')
        .upload(filePath, verificationFile);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('lb_student_verifications')
        .insert([
          {
            user_id: registeredUserId,
            image_path: filePath,
            status: 'pending'
          }
        ]);
      if (dbError) throw dbError;

      showToast("Ảnh xác thực đã được gửi! Vui lòng chờ xác nhận.", "success");
      closeAuthModal();
    } catch (err) {
      setError(err.message || "Có lỗi khi tải ảnh lên.");
    } finally {
      setVerificationLoading(false);
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
              disabled={verificationStep}
              onClick={() => {
                if (verificationStep) return;
                setAuthModalMode("register");
                setError(null);
                setConfirmPassword("");
                setVerificationStep(false);
                setVerificationFile(null);
                setVerificationPreview(null);
              }}
              className={`py-3 text-lg font-bold border-b-2 transition-colors ${verificationStep ? 'text-slate-300 cursor-not-allowed' : authModalMode === "register" ? "text-teal-700 border-teal-700" : "text-slate-400 border-transparent hover:text-slate-600"}`}
            >
              Đăng ký
            </button>
            <button
              type="button"
              disabled={verificationStep}
              onClick={() => {
                if (verificationStep) return;
                setAuthModalMode("login");
                setError(null);
                setConfirmPassword("");
                setVerificationStep(false);
                setVerificationFile(null);
                setVerificationPreview(null);
              }}
              className={`py-3 text-lg font-bold border-b-2 transition-colors ${verificationStep ? 'text-slate-300 cursor-not-allowed' : authModalMode === "login" ? "text-teal-700 border-teal-700" : "text-slate-400 border-transparent hover:text-slate-600"}`}
            >
              Đăng nhập
            </button>
          </div>
          <button
            onClick={verificationStep ? undefined : closeAuthModal}
            className={`p-2 rounded-full transition-colors ${verificationStep ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            disabled={verificationStep}
            title={verificationStep ? 'Vui lòng xác thực trước' : 'Đóng'}
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

          {verificationStep ? (
            <div>
              <h3 className="text-lg font-bold text-teal-700 mb-2">Xác thực tài khoản</h3>
              <p className="text-sm text-slate-600 mb-2">Vui lòng tải lên ảnh chụp thẻ sinh viên hoặc email sinh viên còn hạn sử dụng để xác thực.</p>
              <p className="text-sm font-semibold text-red-500 mb-4">* Bắt buộc — tài khoản chỉ được kích hoạt sau khi xác thực thành công.</p>
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-teal-500"
                onClick={() => fileInputRef.current?.click()}
              >
                {verificationPreview ? (
                  <img src={verificationPreview} alt="Verification" className="max-h-48 mx-auto" />
                ) : (
                  <>
                    <svg className="w-12 h-12 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-slate-500">Nhấn để tải ảnh lên</p>
                  </>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleVerificationUpload} />
              <button
                onClick={handleSubmitVerification}
                disabled={verificationLoading || !verificationFile}
                className="vinted-btn-primary mt-4 w-full"
              >
                {verificationLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white mx-auto" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : "Gửi xác thực"}
              </button>
            </div>
          ) : (
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

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400 font-medium">HOẶC</span></div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => signInWithOAuth('google')}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {authModalMode === "login" ? "Đăng nhập" : "Đăng ký"} với Google
                </button>
                <button
                  type="button"
                  onClick={() => signInWithOAuth('azure')}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
                    <rect x="1" y="1" width="8" height="8" rx="1.5" fill="#F25022"/>
                    <rect x="12" y="1" width="8" height="8" rx="1.5" fill="#7FBA00"/>
                    <rect x="1" y="12" width="8" height="8" rx="1.5" fill="#00A4EF"/>
                    <rect x="12" y="12" width="8" height="8" rx="1.5" fill="#FFB900"/>
                  </svg>
                  {authModalMode === "login" ? "Đăng nhập" : "Đăng ký"} với Microsoft
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
