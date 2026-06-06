// Import ảnh thật từ thư mục assets/images
import imgChuyenDoi from "../assets/images/chuyendoi.jpg";
import imgBenhGomDen from "../assets/images/benhgomden.jpg";
import imgBenhHeo from "../assets/images/benhheo.jpg";
import imgCngheMangloc from "../assets/images/cnghemangloc.jpg";
import imgCngheNuoiTrong from "../assets/images/cnghenuoitrong.jpg";
import imgPtrienSp from "../assets/images/ptriensp.jpg";
import imgSbvl from "../assets/images/sbvl.jpg";
import imgXhh from "../assets/images/xhh.jpg";
import imgBanner from "../assets/images/618572354_1397613058830175_8168212988356921032_n.jpg";

export const categories = [
  { id: "economics", name: "Kinh tế", accent: "blue" },
  { id: "law", name: "Luật", accent: "orange" },
  { id: "engineering", name: "Kỹ thuật", accent: "green" },
  { id: "language", name: "Ngoại ngữ", accent: "slate" },
  { id: "agriculture", name: "Nông nghiệp", accent: "green" },
  { id: "sociology", name: "Xã hội học", accent: "blue" },
];

export const books = [
  {
    id: "chuyen-doi-so",
    title: "Chuyển đổi số trong doanh nghiệp",
    edition: "Tái bản lần thứ 2",
    author: "GS. Nguyễn Đình Thọ",
    publisher: "NXB Đại học Quốc gia Hà Nội",
    school: "ĐH Kinh tế Quốc dân",
    price: 42000,
    originalPrice: 180000,
    condition: "Như mới",
    year: 2022,
    category: "economics",
    verified: true,
    urgent: false,
    tags: ["Đã kiểm định"],
    image: imgChuyenDoi,
    description:
      "Sách sạch, không ghi chú, còn bọc nylon. Phù hợp sinh viên các ngành Quản trị kinh doanh và Kinh tế số.",
    seller: {
      name: "Nguyễn Minh Anh",
      faculty: "Quản trị kinh doanh",
      rating: 4.9,
      responseTime: "3 phút",
    },
  },
  {
    id: "benh-gom-den",
    title: "Giáo trình Bệnh cây đồng ruộng",
    edition: "Bản đại học",
    author: "PGS.TS. Vũ Triệu Mẫn",
    publisher: "NXB Nông nghiệp",
    school: "Học viện Nông nghiệp Việt Nam",
    price: 33000,
    originalPrice: 140000,
    condition: "Rất tốt",
    year: 2021,
    category: "agriculture",
    verified: true,
    urgent: true,
    tags: ["Bán gấp", "Đã kiểm định"],
    image: imgBenhGomDen,
    description:
      "Sách có highlight nhẹ ở vài trang đầu, phần còn lại nguyên vẹn. Phù hợp học phần Bảo vệ thực vật.",
    seller: {
      name: "Trần Thị Lan",
      faculty: "Bảo vệ thực vật",
      rating: 4.7,
      responseTime: "10 phút",
    },
  },
  {
    id: "benh-heo",
    title: "Bệnh học thú y – Heo",
    edition: "Lần 3",
    author: "TS. Lê Văn Phước",
    publisher: "NXB Nông nghiệp",
    school: "ĐH Nông Lâm TP. HCM",
    price: 36000,
    originalPrice: 155000,
    condition: "Rất tốt",
    year: 2020,
    category: "agriculture",
    verified: false,
    urgent: false,
    tags: [],
    image: imgBenhHeo,
    description:
      "Bìa còn tốt, gáy chắc, có vài ghi chú bằng bút chì ở mục dịch tả heo. Rất hữu ích cho năm 3-4.",
    seller: {
      name: "Phạm Văn Đức",
      faculty: "Thú y",
      rating: 4.5,
      responseTime: "20 phút",
    },
  },
  {
    id: "cong-nghe-mang-loc",
    title: "Công nghệ màng lọc trong xử lý nước",
    edition: "Tái bản 2023",
    author: "PGS.TS. Trần Đức Hạ",
    publisher: "NXB Xây dựng",
    school: "ĐH Bách khoa Hà Nội",
    price: 48000,
    originalPrice: 220000,
    condition: "Như mới",
    year: 2023,
    category: "engineering",
    verified: true,
    urgent: false,
    tags: ["Đã kiểm định"],
    image: imgCngheMangloc,
    description:
      "Sách mới gần như chưa dùng, không bút mực, còn bọc nylon. Mua xong không dùng đến môn này.",
    seller: {
      name: "Hoàng Trọng Nghĩa",
      faculty: "Kỹ thuật môi trường",
      rating: 5.0,
      responseTime: "5 phút",
    },
  },
  {
    id: "cong-nghe-nuoi-trong",
    title: "Công nghệ nuôi trồng thủy sản",
    edition: "Bản đại học",
    author: "GS. Nguyễn Quang Huy",
    publisher: "NXB Nông nghiệp",
    school: "ĐH Nông Lâm TP. HCM",
    price: 39000,
    originalPrice: 165000,
    condition: "Tốt",
    year: 2021,
    category: "agriculture",
    verified: false,
    urgent: true,
    tags: ["Bán gấp"],
    image: imgCngheNuoiTrong,
    description:
      "Sách đã dùng nhưng còn đọc được rõ ràng. Có bút highlight vàng ở một số chương. Cần bán gấp trước kỳ thi.",
    seller: {
      name: "Lê Thu Trang",
      faculty: "Nuôi trồng thủy sản",
      rating: 4.6,
      responseTime: "15 phút",
    },
  },
  {
    id: "phat-trien-san-pham",
    title: "Phát triển sản phẩm mới",
    edition: "Lần 4",
    author: "Philip Kotler & Kevin Lane Keller",
    publisher: "NXB Lao động",
    school: "ĐH Kinh tế TP. HCM",
    price: 55000,
    originalPrice: 245000,
    condition: "Rất tốt",
    year: 2022,
    category: "economics",
    verified: true,
    urgent: false,
    tags: ["Đã kiểm định"],
    image: imgPtrienSp,
    description:
      "Bản dịch tiếng Việt chất lượng cao, dùng cho học phần Marketing căn bản và nâng cao. Sách còn rất mới.",
    seller: {
      name: "Nguyễn Thanh Hà",
      faculty: "Marketing",
      rating: 4.8,
      responseTime: "7 phút",
    },
  },
  {
    id: "suc-ben-vat-lieu",
    title: "Sức bền vật liệu",
    edition: "Tập 1 & 2 – Tái bản lần 5",
    author: "GS.TSKH. Đỗ Sanh",
    publisher: "NXB Giáo dục Việt Nam",
    school: "ĐH Bách khoa Hà Nội",
    price: 45000,
    originalPrice: 195000,
    condition: "Rất tốt",
    year: 2020,
    category: "engineering",
    verified: true,
    urgent: false,
    tags: ["Đã kiểm định"],
    image: imgSbvl,
    description:
      "Sách học kỳ trước, còn dùng được tốt. Có một số ghi chú chì ở chương ứng suất pháp, dễ tẩy.",
    seller: {
      name: "Trần Hoàng Minh",
      faculty: "Kỹ thuật cơ khí",
      rating: 4.8,
      responseTime: "8 phút",
    },
  },
  {
    id: "xa-hoi-hoc",
    title: "Xã hội học đại cương",
    edition: "Tái bản lần thứ 3",
    author: "TS. Nguyễn Thị Kim Hoa",
    publisher: "NXB Đại học Quốc gia Hà Nội",
    school: "ĐH Khoa học Xã hội và Nhân văn",
    price: 28000,
    originalPrice: 120000,
    condition: "Mới 90%",
    year: 2021,
    category: "sociology",
    verified: false,
    urgent: false,
    tags: [],
    image: imgXhh,
    description:
      "Sách đã đọc qua một lần, không gai trống hay ghi chú. Rất phù hợp cho học phần nhập môn xã hội học.",
    seller: {
      name: "Vũ Thị Mai",
      faculty: "Xã hội học",
      rating: 4.4,
      responseTime: "30 phút",
    },
  },
  {
    id: "anh-banner",
    title: "Giáo trình Tiếng Anh chuyên ngành Kinh tế",
    edition: "Band 6.5+",
    author: "Nhóm tác giả ĐH Ngoại thương",
    publisher: "NXB Đại học Ngoại thương",
    school: "ĐH Ngoại thương Hà Nội",
    price: 50000,
    originalPrice: 210000,
    condition: "Mới 95%",
    year: 2023,
    category: "language",
    verified: true,
    urgent: false,
    tags: ["Đã kiểm định"],
    image: imgBanner,
    description:
      "Bộ tài liệu luyện đề và ghi chú kỹ năng đọc & viết học thuật. Gần như mới, phù hợp tự học và thi IELTS.",
    seller: {
      name: "Phạm Thanh",
      faculty: "Kinh tế đối ngoại",
      rating: 4.9,
      responseTime: "5 phút",
    },
  },
];

export const metrics = [
  { label: "Tin đang đăng", value: "12", accent: "blue" },
  { label: "Sách đã bán", value: "48", accent: "green" },
  { label: "Đang ký gửi", value: "05", accent: "orange" },
  { label: "Số dư ví", value: "2.450.000đ", accent: "dark" },
];

export const conversations = [
  {
    id: "conv-minh-anh",
    name: "Nguyễn Minh Anh",
    bookId: "microeconomics-12",
    online: true,
    preview: "Dạ vâng, em chốt giá 120k và gặp ở thư viện nhé.",
    messages: [
      { from: "them", text: "Chào bạn, sách Kinh tế vi mô còn không?", time: "09:12" },
      { from: "me", text: "Còn bạn nhé, sách sạch và đã kiểm định.", time: "09:14" },
      { from: "them", text: "Mình lấy 1 cuốn, có thể giao ở NEU chiều nay không?", time: "09:16" },
      { from: "me", text: "Được, mình có mặt ở thư viện từ 3 giờ.", time: "09:18" },
    ],
  },
  {
    id: "conv-tran-hoang",
    name: "Trần Hoàng",
    bookId: "data-structures-java",
    online: false,
    preview: "Sách còn mới không bạn ơi?",
    messages: [
      { from: "them", text: "Bạn gửi thêm ảnh cạnh gáy sách giúp mình.", time: "Hôm qua" },
      { from: "me", text: "Mình vừa gửi rồi nhé.", time: "Hôm qua" },
    ],
  },
  {
    id: "conv-le-thu",
    name: "Lê Thu",
    bookId: "business-law",
    online: false,
    preview: "Đã gửi một ảnh",
    messages: [{ from: "them", text: "Nếu lấy hai cuốn mình giảm giá nhé.", time: "Hôm qua" }],
  },
];

export const transactions = {
  current: [
    {
      id: "cur-1",
      book: "Kinh tế vi mô",
      partner: "Nguyễn Minh Anh",
      status: "Đang chờ gặp trực tiếp",
      amount: "125.000đ",
      when: "Hôm nay, 15:00",
    },
    {
      id: "cur-2",
      book: "IELTS Foundation Masterclass",
      partner: "Phạm Thanh",
      status: "Đang xác nhận thanh toán",
      amount: "99.000đ",
      when: "Ngày mai, 09:30",
    },
  ],
  completed: [
    {
      id: "done-1",
      book: "Giải thuật và Cấu trúc dữ liệu",
      partner: "Trần Hoàng Minh",
      status: "Hoàn tất",
      amount: "120.000đ",
      when: "18/03/2026",
    },
    {
      id: "done-2",
      book: "Luật kinh doanh",
      partner: "Lê Thu Trang",
      status: "Hoàn tất",
      amount: "89.000đ",
      when: "14/03/2026",
    },
  ],
};

export const walletEvents = [
  { id: "w1", label: "Bán sách Kinh tế vi mô", amount: "+125.000đ", type: "in", date: "20/03/2026" },
  { id: "w2", label: "Thanh toán nhãn ưu tiên", amount: "-15.000đ", type: "out", date: "19/03/2026" },
  { id: "w3", label: "Rút tiền về ngân hàng", amount: "-500.000đ", type: "out", date: "18/03/2026" },
  { id: "w4", label: "Bán sách IELTS Foundation", amount: "+99.000đ", type: "in", date: "18/03/2026" },
];

export const premiumPlans = [
  {
    id: "urgent",
    name: "Nhãn Bán gấp",
    price: 10000,
    summary: "Gắn nhãn nổi bật trên danh sách tìm kiếm trong 7 ngày.",
  },
  {
    id: "boost",
    name: "Đẩy tin trang đầu",
    price: 25000,
    summary: "Ưu tiên hiển thị ở cụm đề xuất và dashboard người mua.",
  },
  {
    id: "combo",
    name: "Combo ưu tiên 14 ngày",
    price: 39000,
    summary: "Bao gồm nhãn nổi bật, đẩy tin và thống kê lượt xem.",
  },
];
