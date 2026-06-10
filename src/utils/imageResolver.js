export function resolveBookImages(bookId, imagesList) {
  if (Array.isArray(imagesList) && imagesList.length > 0) {
    return imagesList
      .filter(Boolean)
      .map(img => (typeof img === 'string' && img.startsWith('http')) ? img : `https://ehvgtgzleukxtqgstivd.supabase.co/storage/v1/object/public/books/${img}`);
  }
  return [];
}

export function getBookImageUrl(book) {
  if (!book) return null;

  // 1. Kiểm tra trường book.image trước
  if (book.image && typeof book.image === 'string') {
    if (book.image.startsWith('http')) {
      return book.image;
    }
    return `https://ehvgtgzleukxtqgstivd.supabase.co/storage/v1/object/public/books/${book.image}`;
  }

  // 2. Nếu không có book.image, phân giải từ book.images
  const resolved = resolveBookImages(book.id, book.images);
  return resolved[0] || null;
}
