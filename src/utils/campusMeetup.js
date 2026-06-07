/**
 * Gợi ý điểm hẹn an toàn tại các trường Đại học
 * Dựa trên trường của người bán và người mua
 */

const campusMeetupSpots = {
  "Đại học Bách Khoa Hà Nội": [
    "Thư viện Tạ Quang Bửu",
    "Cổng chính Bách Khoa (số 1 Đại Cồ Việt)",
    "Căng-tin B1 - Khu A",
    "Căng-tin B2 - Khu B",
    "Sảnh Nhà hiệu bộ",
    "Khuôn viên trước giảng đường D5",
  ],
  "Đại học Bách Khoa TP.HCM": [
    "Thư viện Trung tâm ĐHQG",
    "Cổng chính Bách Khoa (Lý Thường Kiệt)",
    "Căng-tin A4",
    "Khuôn viên trước Thư viện",
    "Sảnh Hội trường B10",
  ],
  "Đại học Kinh tế Quốc dân": [
    "Thư viện NEU",
    "Cổng chính (207 Giải Phóng)",
    "Căng-tin tầng 1 - Nhà A",
    "Sảnh Nhà B",
    "Khuôn viên trước Nhà G",
  ],
  "Đại học Ngoại thương": [
    "Thư viện FTU (Chùa Láng)",
    "Cổng chính Chùa Láng",
    "Căng-tin Nhà A",
    "Sảnh Nhà B1",
    "Khuôn viên trước Nhà D",
  ],
  "Đại học Kinh tế TP.HCM": [
    "Thư viện UEH",
    "Cổng chính (59C Nguyễn Đình Chiểu)",
    "Căng-tin Nhà A",
    "Sảnh Nhà B",
    "Khuôn viên trước Nhà I",
  ],
  "Đại học Khoa học Xã hội và Nhân văn": [
    "Thư viện USSH",
    "Cổng chính (336 Nguyễn Trãi)",
    "Căng-tin Khu A",
    "Sảnh Nhà D",
    "Khuôn viên trước Nhà E",
  ],
  "Đại học Khoa học Tự nhiên": [
    "Thư viện HCMUS",
    "Cổng chính (227 Nguyễn Văn Cừ)",
    "Căng-tin Nhà A",
    "Sảnh Nhà B",
    "Khuôn viên trước Nhà F",
  ],
  "Đại học Sư phạm": [
    "Thư viện HNUE",
    "Cổng chính (136 Xuân Thủy)",
    "Căng-tin Nhà C",
    "Sảnh Nhà D",
    "Khuôn viên trước Nhà G",
  ],
  "Học viện Bưu chính Viễn thông": [
    "Thư viện PTIT",
    "Cổng chính (Km10 Nguyễn Trãi)",
    "Căng-tin Nhà A",
    "Sảnh Nhà B",
  ],
  "Học viện Tài chính": [
    "Thư viện HVF",
    "Cổng chính (58 Lê Văn Hiến)",
    "Căng-tin Nhà A",
    "Sảnh Nhà B",
  ],
  "Học viện Nông nghiệp Việt Nam": [
    "Thư viện VNUA",
    "Cổng chính (Trâu Quỳ, Gia Lâm)",
    "Căng-tin Khu A",
    "Sảnh Nhà B",
  ],
};

/**
 * Lấy danh sách điểm hẹn gợi ý cho một trường
 * @param {string} schoolName - Tên trường đại học
 * @returns {string[]} Danh sách điểm hẹn
 */
export function getMeetupSpots(schoolName) {
  if (!schoolName) return [];
  // Tìm kiếm gần đúng
  const normalized = schoolName.trim().toLowerCase();
  for (const [key, spots] of Object.entries(campusMeetupSpots)) {
    if (normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) {
      return spots;
    }
  }
  return [];
}

/**
 * Lấy tất cả các điểm hẹn phổ biến (khi không khớp trường)
 * @returns {string[]}
 */
export function getDefaultMeetupSpots() {
  return [
    "Thư viện trường",
    "Cổng chính trường",
    "Căng-tin trường",
    "Khuôn viên trường",
    "Quán cà phê gần trường",
  ];
}
