import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { formatPrice } from "../utils/formatters";

export default function ProfileScreen() {
  const { user, userData, updateProfile, updatePassword, showToast, requireAuth } = useAuth();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(userData?.name || "");
  const [phone, setPhone] = useState(userData?.phone || "");
  const [bio, setBio] = useState(userData?.bio || "");
  const [address, setAddress] = useState(userData?.address || "");
  const [avatarUrl, setAvatarUrl] = useState(userData?.avatar_url || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [wallet, setWallet] = useState(null);
  const [stats, setStats] = useState({ listings: 0, sold: 0, bought: 0, totalEarned: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: w } = await supabase.from("lb_wallets").select("*").eq("user_id", user.id).maybeSingle();
      setWallet(w);

      const { count: listingCount } = await supabase.from("lb_books").select("*", { count: "exact", head: true }).eq("seller_id", user.id);
      const { count: soldCount } = await supabase.from("lb_transactions").select("*", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "completed");
      const { count: boughtCount } = await supabase.from("lb_transactions").select("*", { count: "exact", head: true }).eq("buyer_id", user.id).eq("status", "completed");
      const { data: soldTxns } = await supabase.from("lb_transactions").select("net_amount").eq("seller_id", user.id).eq("status", "completed");
      const totalEarned = (soldTxns || []).reduce((sum, t) => sum + (Number(t.net_amount) || 0), 0);

      setStats({ listings: listingCount || 0, sold: soldCount || 0, bought: boughtCount || 0, totalEarned });
    };
    fetchData();
  }, [user]);

  if (!user) {
    requireAuth();
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
          <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Bạn chưa đăng nhập</h2>
        <p className="text-slate-600 mb-6">Vui lòng đăng nhập để xem và chỉnh sửa thông tin cá nhân.</p>
        <Link to="/" className="vinted-btn-outline w-auto px-8 mx-auto">Về trang chủ</Link>
      </div>
    );
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return null;
    const fileExt = avatarFile.name.split(".").pop();
    const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;

    // Thử bucket "avatars" trước, fallback sang "books" nếu chưa có bucket avatars
    const buckets = ["avatars", "books"];
    for (const bucket of buckets) {
      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, avatarFile, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return urlData.publicUrl;
      }
      const msg = (uploadError?.message || "").toLowerCase();
      const isBucketError = msg.includes("bucket") || msg.includes("not found") || msg.includes("does not exist");
      if (!isBucketError) throw uploadError;
    }
    throw new Error("Không thể tải ảnh lên. Vui lòng kiểm tra cấu hình Storage trên Supabase và tạo bucket 'avatars'.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalAvatar = avatarUrl;
      if (avatarFile) {
        finalAvatar = await uploadAvatar();
      }
      const { error } = await updateProfile({ name, phone, bio, address, avatar_url: finalAvatar });
      if (error) throw error;
      setAvatarUrl(finalAvatar);
      setAvatarFile(null);
      setAvatarPreview(null);
      showToast("Cập nhật thông tin thành công!", "success");
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("Mật khẩu mới không khớp", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Mật khẩu phải có ít nhất 6 ký tự", "error");
      return;
    }
    setPasswordLoading(true);
    const { error } = await updatePassword(newPassword);
    setPasswordLoading(false);
    if (error) {
      showToast(error.message || "Đổi mật khẩu thất bại", "error");
    } else {
      showToast("Đổi mật khẩu thành công!", "success");
      setShowPasswordForm(false);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const displayAvatar = avatarPreview || avatarUrl || null;

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Thông tin cá nhân</h1>

      {/* Wallet & Stats */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 text-white rounded-xl p-6 flex flex-col sm:flex-row gap-6">
        <div className="flex-1">
          <p className="text-teal-200 text-sm font-medium mb-1">Số dư ví</p>
          <p className="text-3xl font-extrabold">{formatPrice(wallet?.balance || 0)}</p>
          <Link to="/vi-tien" className="inline-block mt-2 text-sm text-teal-200 hover:text-white underline">Quản lý ví</Link>
        </div>
        <div className="flex gap-6 sm:border-l sm:border-teal-500 sm:pl-6 flex-wrap">
          <div><p className="text-teal-200 text-xs">{stats.listings}</p><p className="text-sm font-bold">Tin đăng</p></div>
          <div><p className="text-teal-200 text-xs">{stats.sold}</p><p className="text-sm font-bold">Đã bán</p></div>
          <div><p className="text-teal-200 text-xs">{stats.bought}</p><p className="text-sm font-bold">Đã mua</p></div>
          <div><p className="text-teal-200 text-xs">{formatPrice(stats.totalEarned)}</p><p className="text-sm font-bold">Tổng thu</p></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-5">
        {/* Avatar Upload */}
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 rounded-full bg-teal-50 overflow-hidden flex-shrink-0">
            {displayAvatar ? (
              <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-teal-400">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
            )}
          </div>
          <div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="vinted-btn-outline text-sm px-4 py-2">Chọn ảnh</button>
            <p className="text-xs text-slate-400 mt-1">PNG, JPG tối đa 2MB</p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>
        </div>

        <div>
          <label className="font-bold text-slate-900 text-sm block mb-2">Tên hiển thị</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="vinted-input" placeholder={userData?.name || "Nhập tên của bạn"} />
        </div>
        <div>
          <label className="font-bold text-slate-900 text-sm block mb-2">Số điện thoại</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="vinted-input" placeholder={userData?.phone || "Chưa có thông tin"} />
        </div>
        <div>
          <label className="font-bold text-slate-900 text-sm block mb-2">Giới thiệu</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="vinted-input h-24 resize-y" placeholder={userData?.bio || "Chưa có thông tin"} />
        </div>
        <div>
          <label className="font-bold text-slate-900 text-sm block mb-2">Địa chỉ</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="vinted-input" placeholder={userData?.address || "Chưa có thông tin"} />
        </div>

        <div className="pt-4 border-t border-slate-100 flex gap-3">
          <button type="submit" disabled={loading} className="vinted-btn-primary w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-8">
            {loading ? (
              <><svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Đang lưu...</>
            ) : "Lưu thay đổi"}
          </button>
        </div>
      </form>

      {/* Change Password */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900">Mật khẩu</h2>
          <button type="button" onClick={() => setShowPasswordForm(!showPasswordForm)} className="text-sm text-teal-700 font-semibold hover:underline">
            {showPasswordForm ? "Hủy" : "Đổi mật khẩu"}
          </button>
        </div>
        {showPasswordForm && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="font-bold text-slate-900 text-sm block mb-2">Mật khẩu mới</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="vinted-input" placeholder="••••••••" minLength={6} required />
            </div>
            <div>
              <label className="font-bold text-slate-900 text-sm block mb-2">Xác nhận mật khẩu</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="vinted-input" placeholder="••••••••" minLength={6} required />
            </div>
            <button type="submit" disabled={passwordLoading} className="vinted-btn-primary py-3 px-6">
              {passwordLoading ? "Đang đổi..." : "Cập nhật mật khẩu"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
