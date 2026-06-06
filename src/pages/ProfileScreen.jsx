import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function ProfileScreen() {
  const { userData, updateProfile, showToast } = useAuth();

  const [name, setName] = useState(userData?.name || "");
  const [phone, setPhone] = useState(userData?.phone || "");
  const [bio, setBio] = useState(userData?.bio || "");
  const [address, setAddress] = useState(userData?.address || "");
  const [avatarUrl, setAvatarUrl] = useState(userData?.avatar_url || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await updateProfile({ name, phone, bio, address, avatar_url: avatarUrl });
    setLoading(false);
    if (error) {
      showToast(error.message || "Có lỗi xảy ra", "error");
    } else {
      showToast("Cập nhật thông tin thành công!", "success");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Thông tin cá nhân</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-5">
        <div>
          <label className="font-bold text-slate-900 text-sm block mb-2">Tên hiển thị</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="vinted-input"
            placeholder={userData?.name || "Nhập tên của bạn"}
          />
        </div>

        <div>
          <label className="font-bold text-slate-900 text-sm block mb-2">Số điện thoại</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="vinted-input"
            placeholder={userData?.phone || "Chưa có thông tin"}
          />
        </div>

        <div>
          <label className="font-bold text-slate-900 text-sm block mb-2">Giới thiệu</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="vinted-input h-24 resize-y"
            placeholder={userData?.bio || "Chưa có thông tin"}
          />
        </div>

        <div>
          <label className="font-bold text-slate-900 text-sm block mb-2">Địa chỉ</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="vinted-input"
            placeholder={userData?.address || "Chưa có thông tin"}
          />
        </div>

        <div>
          <label className="font-bold text-slate-900 text-sm block mb-2">URL ảnh đại diện</label>
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="vinted-input"
            placeholder={userData?.avatar_url || "Chưa có thông tin"}
          />
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="vinted-btn-primary w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-8"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Đang lưu...
              </>
            ) : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}
