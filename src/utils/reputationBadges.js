/**
 * Hệ thống Huy hiệu Uy tín người dùng (Reputation Badge)
 * Tự động gắn danh hiệu dựa trên đánh giá của người mua
 */

export const REPUTATION_BADGES = [
  {
    id: "scholar_a",
    label: "🏆 Học giả điểm A",
    description: "Người bán có đánh giá trung bình từ 4.8 sao trở lên",
    condition: (rating, count) => rating >= 4.8 && count >= 5,
    color: "bg-amber-100 text-amber-800 border-amber-300",
  },
  {
    id: "trusted_seller",
    label: "✅ Người bán có tâm",
    description: "Người bán có đánh giá trung bình từ 4.5 sao trở lên",
    condition: (rating, count) => rating >= 4.5 && count >= 3,
    color: "bg-green-100 text-green-800 border-green-300",
  },
  {
    id: "careful_packer",
    label: "📦 Đóng gói cẩn thận",
    description: "Người bán nhận nhiều đánh giá tích cực về đóng gói",
    condition: (rating, count) => rating >= 4.0 && count >= 10,
    color: "bg-blue-100 text-blue-800 border-blue-300",
  },
  {
    id: "fast_shipper",
    label: "⚡ Giao hàng nhanh",
    description: "Người bán có nhiều giao dịch hoàn tất nhanh chóng",
    condition: (rating, count) => count >= 20 && rating >= 4.0,
    color: "bg-purple-100 text-purple-800 border-purple-300",
  },
  {
    id: "new_seller",
    label: "🌟 Người bán mới",
    description: "Người bán mới tham gia nền tảng",
    condition: (rating, count) => count < 3,
    color: "bg-slate-100 text-slate-700 border-slate-300",
  },
];

/**
 * Lấy danh sách huy hiệu phù hợp với người dùng
 * @param {number} rating - Điểm đánh giá trung bình (1-5)
 * @param {number} ratingCount - Số lượt đánh giá
 * @returns {Array} Danh sách huy hiệu
 */
export function getReputationBadges(rating, ratingCount) {
  if (!ratingCount || ratingCount === 0) {
    return [REPUTATION_BADGES.find((b) => b.id === "new_seller")];
  }

  const badges = [];
  for (const badge of REPUTATION_BADGES) {
    if (badge.condition(rating || 0, ratingCount || 0)) {
      badges.push(badge);
    }
  }

  // Nếu không có badge nào khác ngoài new_seller, trả về new_seller
  if (badges.length === 0) {
    return [REPUTATION_BADGES.find((b) => b.id === "new_seller")];
  }

  return badges;
}

/**
 * Lấy badge cao nhất (ưu tiên hiển thị)
 * @param {number} rating 
 * @param {number} ratingCount 
 * @returns {Object|null}
 */
export function getTopBadge(rating, ratingCount) {
  const badges = getReputationBadges(rating, ratingCount);
  // Ưu tiên badge đầu tiên trong danh sách (đã sắp xếp theo độ ưu tiên)
  return badges[0] || null;
}
