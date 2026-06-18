export const formatPrice = (value) => {
  if (value == null || isNaN(value)) return "0đ";
  return `${Number(value).toLocaleString("vi-VN")}đ`;
};

export const formatPriceInput = (value) => {
  const rawValue = String(value).replace(/\D/g, "");
  if (!rawValue) return "";
  return rawValue.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
};

