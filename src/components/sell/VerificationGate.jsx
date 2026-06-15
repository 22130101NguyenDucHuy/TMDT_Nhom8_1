import { useState, useEffect, useRef } from "react";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { isAcademicEmail, getInstitutionName } from "../../utils/academicDomains";

const VERIFICATION_EXPIRY_DAYS = 30;

export default function VerificationGate({ children }) {
  const { user, userData, showToast, updateProfile } = useAuth();
  const [status, setStatus] = useState("checking");
  const [studentCard, setStudentCard] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [institution, setInstitution] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    if (!user || !userData) { setStatus("checking"); return; }
    checkVerification();
  }, [user?.id, userData?.status, userData]);

  const checkVerification = async () => {
    setStatus("checking");

    try {
      // Admin bypass — không cần xác thực sinh viên
      if (userData?.role === "admin") {
        setStatus("verified");
        return;
      }

      // Nếu tài khoản đã active (admin đã duyệt), bỏ qua gate
      if (userData?.status === "active") {
        setStatus("verified");
        return;
      }

      // 1. Check academic email
      const email = user.email || "";
      const academic = isAcademicEmail(email);
      if (!academic) {
        setStatus("unverified");
        setInstitution("Không xác định (email ngoài danh sách)");
        return;
      }
      setInstitution(getInstitutionName(email));

      // 2. Check verification records
      const { data: verifications, error: vErr } = await supabase
        .from("lb_student_verifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (vErr) {
        console.error("VerificationGate: query error", vErr);
        setStatus("unverified");
        return;
      }

      const latest = verifications?.[0];

      if (!latest) {
        setStatus("unverified");
        return;
      }

      if (latest.status === "pending") {
        setStatus("pending_review");
        return;
      }

      if (latest.status === "rejected") {
        setStatus("unverified");
        return;
      }

      if (latest.status === "approved") {
        const verifiedAt = new Date(latest.created_at);
        const now = new Date();
        const diffDays = (now - verifiedAt) / (1000 * 60 * 60 * 24);
        if (diffDays > VERIFICATION_EXPIRY_DAYS) {
          setStatus("expired");
          return;
        }
        setStatus("verified");
        return;
      }

      setStatus("unverified");
    } catch (err) {
      console.error("VerificationGate: check error", err);
      setStatus("unverified");
    }
  };

  const handleSubmitVerification = async () => {
    if (!studentCard) { showToast("Vui lòng chọn ảnh thẻ sinh viên", "error"); return; }
    setUploading(true);
    try {
      const fileExt = studentCard.name.split(".").pop();
      const fileName = `student_card_${user.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("student-verification")
        .upload(fileName, studentCard);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("student-verification")
        .getPublicUrl(fileName);
      const imageUrl = urlData.publicUrl;

      const { error: insertError } = await supabase
        .from("lb_student_verifications")
        .insert([{
          user_id: user.id,
          image_path: imageUrl,
          status: "pending",
        }]);
      if (insertError) throw insertError;

      showToast("Đã gửi ảnh thẻ sinh viên! Vui lòng chờ admin xét duyệt.", "success");
      setStatus("pending_review");
    } catch (err) {
      console.error("Verification error:", err);
      showToast(err.message || "Lỗi xác thực, vui lòng thử lại", "error");
    } finally {
      setUploading(false);
    }
  };

  if (status === "checking") {
    return (
      <div className="max-w-4xl mx-auto py-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-700" />
      </div>
    );
  }

  if (status === "verified") {
    // Admin bypass badge
    if (userData?.role === "admin") {
      return (
        <div>
          <div className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Bạn đang đăng nhập với tài khoản <strong>Quản trị viên</strong> — đã bỏ qua bước xác thực sinh viên.
          </div>
          {children}
        </div>
      );
    }
    return children;
  }

  if (status === "pending_review") {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-50 rounded-full mb-6 text-amber-500 shadow-sm">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Đang chờ xét duyệt</h2>
        <p className="text-slate-600 mb-2">Thẻ sinh viên của bạn đang được admin xem xét.</p>
        <p className="text-sm text-slate-500 mb-8">Sau khi được duyệt, hãy <strong>refresh trang</strong> để tiếp tục đăng bán.</p>
        <button
          onClick={() => { setStatus("unverified"); setStudentCard(null); }}
          className="text-sm text-teal-700 font-semibold hover:underline"
        >
          Gửi lại thẻ sinh viên khác
        </button>
      </div>
    );
  }

  const isExpired = status === "expired";

  return (
    <div className="max-w-4xl mx-auto py-16">
      <div className="max-w-lg mx-auto text-center mb-8">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 shadow-sm ${
          isExpired ? "bg-amber-50 text-amber-500" : "bg-teal-50 text-teal-600"
        }`}>
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {isExpired ? "Xác thực đã hết hạn" : "Xác thực sinh viên"}
        </h2>
        <p className="text-slate-500 text-sm">
          {isExpired
            ? `Xác thực sinh viên của bạn đã quá ${VERIFICATION_EXPIRY_DAYS} ngày. Vui lòng xác thực lại để tiếp tục đăng bán.`
            : "Vui lòng xác thực thẻ sinh viên để sử dụng tính năng đăng bán tài liệu."}
        </p>
      </div>

      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="mb-5">
          <label className="font-bold text-slate-900 text-sm block mb-1">Email đăng ký</label>
          <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <svg className="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-slate-700 font-medium truncate">{user?.email}</span>
            {institution && institution !== "Không xác định (email ngoài danh sách)" ? (
              <span className="ml-auto text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium truncate max-w-[160px]">
                {institution}
              </span>
            ) : (
              <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                Chưa xác thực
              </span>
            )}
          </div>
        </div>

        <div className="mb-5">
          <label className="font-bold text-slate-900 text-sm block mb-2">
            Ảnh thẻ sinh viên <span className="text-red-500">*</span>
          </label>
          {studentCard ? (
            <div className="relative rounded-lg overflow-hidden border border-slate-200">
              <img src={URL.createObjectURL(studentCard)} alt="Student card" className="w-full h-48 object-contain bg-slate-50" />
              <button
                onClick={() => setStudentCard(null)}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center py-10 px-4 cursor-pointer hover:border-teal-500 hover:bg-teal-50/50 transition-colors"
            >
              <svg className="w-10 h-10 text-teal-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-teal-700 mb-1">Chọn ảnh thẻ sinh viên</span>
              <span className="text-xs text-slate-400">Chụp rõ mặt trước thẻ</span>
            </div>
          )}
          <input type="file" accept="image/jpeg,image/png" className="hidden" ref={fileRef} onChange={(e) => setStudentCard(e.target.files?.[0] || null)} />
        </div>

        <div className="bg-slate-50 rounded-lg p-3 mb-5">
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-700">Lưu ý:</strong> Ảnh thẻ sinh viên chỉ được sử dụng để xác thực danh tính. 
            Thông tin của bạn được bảo mật theo chính sách của LoopBook.
          </p>
        </div>

        <button
          onClick={handleSubmitVerification}
          disabled={!studentCard || uploading}
          className="w-full py-3 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Đang xử lý...
            </>
          ) : (
            isExpired ? "Gia hạn xác thực" : "Gửi xác thực"
          )}
        </button>
      </div>
    </div>
  );
}
