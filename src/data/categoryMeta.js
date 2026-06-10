const CATEGORY_META = {
  economics:              { label: "Kinh tế & Quản trị",    icon: "📊", color: "bg-green-100 text-green-700" },
  engineering:            { label: "Kỹ thuật & CNTT",       icon: "⚙️", color: "bg-blue-100 text-blue-700" },
  law:                    { label: "Luật",                   icon: "⚖️", color: "bg-purple-100 text-purple-700" },
  language:               { label: "Ngoại ngữ",             icon: "🌐", color: "bg-indigo-100 text-indigo-700" },
  agriculture:            { label: "Nông – Lâm – Ngư",      icon: "🌱", color: "bg-lime-100 text-lime-700" },
  sociology:              { label: "Xã hội & Nhân văn",     icon: "👥", color: "bg-orange-100 text-orange-700" },
  "cong-nghe-thong-tin":  { label: "Công nghệ thông tin",   icon: "💻", color: "bg-cyan-100 text-cyan-700" },
  "khoa-hoc-tu-nhien":    { label: "Khoa học tự nhiên",     icon: "🔬", color: "bg-teal-100 text-teal-700" },
  "toan-hoc":             { label: "Toán học",               icon: "📐", color: "bg-rose-100 text-rose-700" },
  "y-hoc":                { label: "Y học",                  icon: "🏥", color: "bg-red-100 text-red-700" },
};

export function getCategoryMeta(catId) {
  return CATEGORY_META[catId] || { label: catId || "Khác", icon: "📚", color: "bg-slate-100 text-slate-600" };
}

export default CATEGORY_META;
