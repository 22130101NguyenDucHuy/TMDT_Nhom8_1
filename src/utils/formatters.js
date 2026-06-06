export const formatPrice = (value) => {
  if (value == null || isNaN(value)) return "0đ";
  return `${Number(value).toLocaleString("vi-VN")}đ`;
};
