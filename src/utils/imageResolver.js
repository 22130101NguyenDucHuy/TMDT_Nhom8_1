const defaultImageMap = {
  "chuyen-doi-so": "chuyendoi.jpg",
  "benh-gom-den": "benhgomden.jpg",
  "benh-heo": "benhheo.jpg",
  "cong-nghe-mang-loc": "cnghemangloc.jpg",
  "cong-nghe-nuoi-trong": "cnghenuoitrong.jpg",
  "phat-trien-san-pham": "ptriensp.jpg",
  "suc-ben-vat-lieu": "sbvl.jpg",
  "xa-hoi-hoc": "xhh.jpg",
  "anh-banner": "618572354_1397613058830175_8168212988356921032_n.jpg",
};

const STORAGE_URL = "https://ehvgtgzleukxtqgstivd.supabase.co/storage/v1/object/public/books/";

function resolveUrl(img) {
  return typeof img === 'string' && img.startsWith('http') ? img : `${STORAGE_URL}${img}`;
}

export function resolveBookImages(bookId, imagesList) {
  if (Array.isArray(imagesList) && imagesList.length > 0) {
    return imagesList.filter(Boolean).map(resolveUrl);
  }
  const fallbackFile = defaultImageMap[bookId];
  if (fallbackFile) {
    return [`${STORAGE_URL}${fallbackFile}`];
  }
  return [`${STORAGE_URL}${bookId}_0.jpg`];
}

export function getBookImageUrl(book) {
  if (!book) return null;
  if (book.image && typeof book.image === 'string') {
    return resolveUrl(book.image);
  }
  const resolved = resolveBookImages(book.id, book.images);
  return resolved[0] || null;
}
