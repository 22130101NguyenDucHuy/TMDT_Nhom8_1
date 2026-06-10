import { supabase } from './supabase';

// ============================================================================
// MOCK DATA - Fallback khi Supabase không available
// ============================================================================
const MOCK = {
  users: [
    { id: 'u1', name: 'Nguyễn Minh Anh', email: 'minh.anh@uni.edu', phone: '0912345678', avatar_url: null, bio: '', address: '', role: 'user', wallet_balance: 2450000, total_income: 8500000, total_withdrawn: 0, listings_count: 12, sales_count: 85, rating_sum: 48, rating_count: 10, status: 'active', join_date: '2026-01-15' },
    { id: 'u2', name: 'Trần Hoàng', email: 'hoang.tran@uni.edu', phone: '0912345679', avatar_url: null, bio: '', address: '', role: 'user', wallet_balance: 1200000, total_income: 4200000, total_withdrawn: 0, listings_count: 5, sales_count: 42, rating_sum: 20, rating_count: 5, status: 'active', join_date: '2026-02-10' },
    { id: 'u3', name: 'Lê Thu', email: 'thu.le@uni.edu', phone: '', avatar_url: null, bio: '', address: '', role: 'user', wallet_balance: 350000, total_income: 300000, total_withdrawn: 0, listings_count: 0, sales_count: 3, rating_sum: 12, rating_count: 3, status: 'suspended', join_date: '2026-01-20' },
    { id: 'u9', name: 'Admin LoopBook', email: 'admin@loopbook.com', phone: '0900000000', avatar_url: null, bio: '', address: '', role: 'admin', wallet_balance: 10000000, total_income: 0, total_withdrawn: 0, listings_count: 0, sales_count: 0, rating_sum: 0, rating_count: 0, status: 'active', join_date: '2026-01-01' },
  ],
  listings: [
    { id: 'b1', seller_id: 'u1', title: 'Giáo trình Kinh tế vi mô', description: 'Sách sạch đẹp', category: { id: 'c2', name: 'Kinh tế' }, condition: 'like_new', price: 42000, original_price: 180000, status: 'active', images: [], author: 'GS. Nguyễn Đình Thọ', publisher: 'NXB ĐHQGHN', edition: 'TB2', school: 'ĐH Kinh tế Quốc dân', year: 2022, urgent: false, verified: true, tags: ['Đã kiểm định'], view_count: 120, is_sold: false, created_at: '2026-04-01', seller: { name: 'Nguyễn Minh Anh', rating: 4.9, response_time: '3 phút' } },
    { id: 'b2', seller_id: 'u1', title: 'Phát triển sản phẩm mới', description: 'Sách marketing', category: { id: 'c2', name: 'Kinh tế' }, condition: 'very_good', price: 55000, original_price: 245000, status: 'active', images: [], author: 'Philip Kotler', publisher: 'NXB Lao động', edition: 'L4', school: 'ĐH Kinh tế TP.HCM', year: 2022, urgent: false, verified: true, tags: ['Đã kiểm định'], view_count: 85, is_sold: false, created_at: '2026-04-05', seller: { name: 'Nguyễn Minh Anh', rating: 4.9, response_time: '3 phút' } },
  ],
  transactions: [
    { id: 't1', book_id: 'b1', buyer_id: 'u2', seller_id: 'u1', amount: 42000, fee_amount: 2100, fee_rate: 5.00, net_amount: 39900, type: 'buy', status: 'completed', payment_method: 'cash', created_at: '2026-05-18T10:00:00', completed_at: '2026-05-18T15:00:00', book: 'Giáo trình Kinh tế vi mô', partner: 'Trần Hoàng', when_time: '2026-05-18' },
    { id: 't2', book_id: null, buyer_id: 'u2', seller_id: 'u1', amount: 28000, fee_amount: 1400, fee_rate: 5.00, net_amount: 26600, type: 'buy', status: 'completed', payment_method: 'cash', created_at: '2026-05-17T14:00:00', completed_at: '2026-05-17T16:00:00', book: 'Xã hội học đại cương', partner: 'Hoàng Yến', when_time: '2026-05-17' },
    { id: 't3', book_id: 'b1', buyer_id: 'u1', seller_id: 'u6', amount: 48000, fee_amount: 0, fee_rate: 0, net_amount: 48000, type: 'buy', status: 'awaiting_meet', payment_method: null, created_at: '2026-05-16T09:00:00', completed_at: null, book: 'Công nghệ màng lọc', partner: 'Đặng Thị Lan', when_time: '2026-05-16' },
  ],
  categories: [
    { id: 'c1', name: 'Công nghệ thông tin', slug: 'cong-nghe-thong-tin', accent: 'blue', books_count: 0, "order": 1, is_active: true },
    { id: 'c2', name: 'Kinh tế', slug: 'kinh-te', accent: 'green', books_count: 0, "order": 2, is_active: true },
    { id: 'c3', name: 'Ngoại ngữ', slug: 'ngoai-ngu', accent: 'purple', books_count: 0, "order": 3, is_active: true },
  ],
  disputes: [
    { id: 'd1', complaint_id: null, transaction_id: 't1', buyer_id: 'u2', seller_id: 'u1', title: 'Sách không đúng mô tả', description: 'Sách có nhiều ghi chú', amount_involved: 250000, status: 'open', dispute_date: '2026-05-15' },
  ],
  reports: [
    { id: 'r1', reporter_id: 'u1', target_type: 'user', target_id: 'fake-user-01', report_type: 'spam', description: 'Spam tin nhắn', status: 'open', report_date: '2026-05-18' },
  ],
  analytics: [
    { id: 'a1', date: '2026-05-18', metric_type: 'overview', total_users: 9, total_listings: 25, total_transactions: 8, completed_transactions: 5, total_revenue: 1800000, platform_fee: 90000 },
    { id: 'a2', date: '2026-05-17', metric_type: 'overview', total_users: 9, total_listings: 24, total_transactions: 5, completed_transactions: 4, total_revenue: 1350000, platform_fee: 67500 },
  ],
  settings: [
    { key: 'maintenance_mode', value: 'false', group_name: 'general', is_public: true },
    { key: 'app_name', value: 'LoopBook', group_name: 'general', is_public: true },
    { key: 'commission_rate', value: '5', group_name: 'fee', is_public: true },
  ],
};

// ============================================================================
// HELPERS
// ============================================================================
function applyPagination(data, page, perPage) {
  const p = page || 1;
  const pp = perPage || 15;
  return { data: data.slice((p - 1) * pp, p * pp), total: data.length, page: p, perPage: pp, totalPages: Math.ceil(data.length / pp) };
}

function formatUserForDisplay(u) {
  const ratingCount = u.rating_count || 0;
  return {
    ...u,
    avg_rating: ratingCount > 0 ? (u.rating_sum / ratingCount).toFixed(1) : '0.0',
  };
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function getUsers(filters = {}, page = 1, perPage = 20) {
  try {
    let query = supabase.from('lb_users').select('*', { count: 'exact' });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.role) query = query.eq('role', filters.role);
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
    if (error) throw error;
    return { data: (data || []).map(formatUserForDisplay), total: count || 0, page, perPage, totalPages: Math.ceil((count || 0) / perPage) };
  } catch (err) {
    console.warn('getUsers fallback:', err?.message);
    let mock = [...MOCK.users];
    if (filters.status) mock = mock.filter(u => u.status === filters.status);
    if (filters.role) mock = mock.filter(u => u.role === filters.role);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      mock = mock.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    return applyPagination(mock.map(formatUserForDisplay), page, perPage);
  }
}

export async function getUserById(id) {
  try {
    const { data, error } = await supabase.from('lb_users').select('*').eq('id', id).single();
    if (error) throw error;
    return formatUserForDisplay(data);
  } catch (err) {
    console.warn('getUserById fallback:', err?.message);
    const u = MOCK.users.find(u => u.id === id);
    return u ? formatUserForDisplay(u) : null;
  }
}

export async function updateUserStatus(userId, status) {
  try {
    const { data, error } = await supabase.from('lb_users').update({ status, updated_at: new Date().toISOString() }).eq('id', userId).select();
    if (error) throw error;
    return data[0];
  } catch (err) {
    console.warn('updateUserStatus fallback:', err?.message);
    const u = MOCK.users.find(u => u.id === userId);
    if (u) { u.status = status; return u; }
    throw err;
  }
}

export async function updateUserRole(userId, role) {
  try {
    const { data, error } = await supabase.from('lb_users').update({ role, updated_at: new Date().toISOString() }).eq('id', userId).select();
    if (error) throw error;
    return data[0];
  } catch (err) {
    console.warn('updateUserRole fallback:', err?.message);
    const u = MOCK.users.find(u => u.id === userId);
    if (u) { u.role = role; return u; }
    throw err;
  }
}

export async function updateUserProfile(userId, updates) {
  try {
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('lb_users').update(updates).eq('id', userId).select();
    if (error) throw error;
    return data[0];
  } catch (err) {
    console.warn('updateUserProfile fallback:', err?.message);
    const u = MOCK.users.find(u => u.id === userId);
    if (u) { Object.assign(u, updates); return u; }
    throw err;
  }
}

export async function createUser(userData) {
  try {
    const { data, error } = await supabase.from('lb_users').insert([userData]).select();
    if (error) throw error;
    return data[0];
  } catch (err) {
    console.warn('createUser fallback:', err?.message);
    const newUser = { id: 'u' + Date.now(), ...userData };
    MOCK.users.push(newUser);
    return newUser;
  }
}

// ============================================================================
// LISTINGS / BOOKS
// ============================================================================

export async function getListings(filters = {}, page = 1, perPage = 20) {
  try {
    let query = supabase.from('lb_books').select('*, seller:seller_id(id, name, rating_sum, rating_count)', { count: 'exact' });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.search) query = query.ilike('title', `%${filters.search}%`);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
    if (error) throw error;
    const enriched = (data || []).map(b => ({
      ...b,
      seller: b.seller ? { name: b.seller.name, rating: (b.seller.rating_count || 0) > 0 ? (b.seller.rating_sum / b.seller.rating_count).toFixed(1) : '0.0', response_time: '—' } : { name: 'Người bán', rating: '0.0', response_time: '—' },
    }));
    return { data: enriched, total: count || 0, page, perPage, totalPages: Math.ceil((count || 0) / perPage) };
  } catch (err) {
    console.warn('getListings fallback:', err?.message);
    let mock = [...MOCK.listings];
    if (filters.status) mock = mock.filter(l => l.status === filters.status);
    if (filters.search) mock = mock.filter(l => l.title.toLowerCase().includes(filters.search.toLowerCase()));
    return applyPagination(mock, page, perPage);
  }
}

export async function getListingById(id) {
  try {
    const { data, error } = await supabase.from('lb_books').select('*, seller:seller_id(id, name, rating_sum, rating_count)').eq('id', id).single();
    if (error) throw error;
    if (data) {
      data.seller = data.seller ? { name: data.seller.name, rating: (data.seller.rating_count || 0) > 0 ? (data.seller.rating_sum / data.seller.rating_count).toFixed(1) : '0.0', response_time: '—' } : { name: 'Người bán', rating: '0.0', response_time: '—' };
    }
    return data;
  } catch (err) {
    console.warn('getListingById fallback:', err?.message);
    return MOCK.listings.find(l => l.id === id) || null;
  }
}

export async function updateListingStatus(listingId, status, rejectReason) {
  try {
    const updates = { status, updated_at: new Date().toISOString() };
    if (status === 'rejected') updates.reject_reason = rejectReason || '';
    if (status === 'sold') { updates.is_sold = true; updates.sold_at = new Date().toISOString(); }
    const { data, error } = await supabase.from('lb_books').update(updates).eq('id', listingId).select();
    if (error) throw error;
    return data[0];
  } catch (err) {
    console.warn('updateListingStatus fallback:', err?.message);
    const l = MOCK.listings.find(l => l.id === listingId);
    if (l) { l.status = status; return l; }
    throw err;
  }
}

export async function deleteListing(listingId) {
  try {
    const { error } = await supabase.from('lb_books').delete().eq('id', listingId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('deleteListing fallback:', err?.message);
    const idx = MOCK.listings.findIndex(l => l.id === listingId);
    if (idx > -1) { MOCK.listings.splice(idx, 1); return true; }
    throw err;
  }
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

export async function getTransactions(filters = {}, page = 1, perPage = 20) {
  try {
    let query = supabase.from('lb_transactions').select('*, buyer:buyer_id(id, name), seller:seller_id(id, name)', { count: 'exact' });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.search) query = query.or(`book.ilike.%${filters.search}%,buyer.name.ilike.%${filters.search}%,seller.name.ilike.%${filters.search}%`);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
    if (error) throw error;
    const enriched = (data || []).map(t => ({
      ...t,
      buyer_name: t.buyer?.name || '—',
      seller_name: t.seller?.name || '—',
    }));
    return { data: enriched, total: count || 0, page, perPage, totalPages: Math.ceil((count || 0) / perPage) };
  } catch (err) {
    console.warn('getTransactions fallback:', err?.message);
    let mock = [...MOCK.transactions];
    if (filters.status) mock = mock.filter(t => t.status === filters.status);
    return applyPagination(mock, page, perPage);
  }
}

export async function updateTransactionStatus(transactionId, status, isCompleted) {
  try {
    const updates = { status, updated_at: new Date().toISOString() };
    if (isCompleted !== undefined) {
      updates.is_completed = isCompleted;
      if (isCompleted) updates.completed_at = new Date().toISOString();
    }
    const { data, error } = await supabase.from('lb_transactions').update(updates).eq('id', transactionId).select();
    if (error) throw error;
    return data[0];
  } catch (err) {
    console.warn('updateTransactionStatus fallback:', err?.message);
    const t = MOCK.transactions.find(t => t.id === transactionId);
    if (t) { t.status = status; return t; }
    throw err;
  }
}

// ============================================================================
// CATEGORIES
// ============================================================================

export async function getCategories() {
  try {
    const { data, error } = await supabase.from('lb_categories').select('*').order('order', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('getCategories fallback:', err?.message);
    return [...MOCK.categories];
  }
}

export async function getCategoryById(id) {
  try {
    const { data, error } = await supabase.from('lb_categories').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('getCategoryById fallback:', err?.message);
    return MOCK.categories.find(c => c.id === id) || null;
  }
}

export async function createCategory(data) {
  try {
    const { data: result, error } = await supabase.from('lb_categories').insert([data]).select();
    if (error) throw error;
    return result[0];
  } catch (err) {
    console.warn('createCategory fallback:', err?.message);
    const cat = { id: 'c' + Date.now(), ...data };
    MOCK.categories.push(cat);
    return cat;
  }
}

export async function updateCategory(id, updates) {
  try {
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('lb_categories').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
  } catch (err) {
    console.warn('updateCategory fallback:', err?.message);
    const c = MOCK.categories.find(c => c.id === id);
    if (c) { Object.assign(c, updates); return c; }
    throw err;
  }
}

export async function deleteCategory(id) {
  try {
    const { error } = await supabase.from('lb_categories').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('deleteCategory fallback:', err?.message);
    const idx = MOCK.categories.findIndex(c => c.id === id);
    if (idx > -1) { MOCK.categories.splice(idx, 1); return true; }
    throw err;
  }
}

// ============================================================================
// DISPUTES
// ============================================================================

export async function getDisputes(filters = {}, page = 1, perPage = 20) {
  try {
    let query = supabase.from('lb_disputes').select('*, buyer:buyer_id(id, name), seller:seller_id(id, name)', { count: 'exact' });
    if (filters.status) query = query.eq('status', filters.status);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
    if (error) throw error;
    const enriched = (data || []).map(d => ({
      ...d,
      buyer_name: d.buyer?.name || '—',
      seller_name: d.seller?.name || '—',
      dispute_date: d.created_at?.split('T')[0],
    }));
    return { data: enriched, total: count || 0, page, perPage, totalPages: Math.ceil((count || 0) / perPage) };
  } catch (err) {
    console.warn('getDisputes fallback:', err?.message);
    let mock = [...MOCK.disputes];
    if (filters.status) mock = mock.filter(d => d.status === filters.status);
    return applyPagination(mock, page, perPage);
  }
}

export async function updateDisputeStatus(disputeId, status, resolutionNote, resolvedBy) {
  try {
    const updates = { status, updated_at: new Date().toISOString() };
    if (resolutionNote) updates.resolution_note = resolutionNote;
    if (resolvedBy) updates.resolved_by = resolvedBy;
    if (['resolved_buyer', 'resolved_seller', 'resolved_partial', 'dismissed'].includes(status)) updates.resolved_at = new Date().toISOString();
    const { data, error } = await supabase.from('lb_disputes').update(updates).eq('id', disputeId).select();
    if (error) throw error;
    return data[0];
  } catch (err) {
    console.warn('updateDisputeStatus fallback:', err?.message);
    const d = MOCK.disputes.find(d => d.id === disputeId);
    if (d) { d.status = status; return d; }
    throw err;
  }
}

// ============================================================================
// REPORTS
// ============================================================================

export async function getReports(filters = {}, page = 1, perPage = 20) {
  try {
    let query = supabase.from('lb_reports').select('*, reporter:reporter_id(id, name)', { count: 'exact' });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.type) query = query.eq('report_type', filters.type);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
    if (error) throw error;
    const enriched = (data || []).map(r => ({
      ...r,
      reporter_name: r.reporter?.name || '—',
      report_date: r.created_at?.split('T')[0],
    }));
    return { data: enriched, total: count || 0, page, perPage, totalPages: Math.ceil((count || 0) / perPage) };
  } catch (err) {
    console.warn('getReports fallback:', err?.message);
    let mock = [...MOCK.reports];
    if (filters.status) mock = mock.filter(r => r.status === filters.status);
    if (filters.type) mock = mock.filter(r => r.report_type === filters.type);
    return applyPagination(mock, page, perPage);
  }
}

export async function updateReportStatus(reportId, status, actionTaken, handledBy) {
  try {
    const updates = { status, updated_at: new Date().toISOString() };
    if (actionTaken) updates.action_taken = actionTaken;
    if (handledBy) updates.handled_by = handledBy;
    if (['resolved', 'dismissed', 'reviewed'].includes(status)) updates.handled_at = new Date().toISOString();
    const { data, error } = await supabase.from('lb_reports').update(updates).eq('id', reportId).select();
    if (error) throw error;
    return data[0];
  } catch (err) {
    console.warn('updateReportStatus fallback:', err?.message);
    const r = MOCK.reports.find(r => r.id === reportId);
    if (r) { r.status = status; return r; }
    throw err;
  }
}

// ============================================================================
// ANALYTICS
// ============================================================================

// Parse amount từ text dạng "125.000đ", "99,000", "125000" → number
function parseAmount(raw) {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return raw;
  // Xoá ký tự không phải số, dấu chấm, dấu phẩy
  const cleaned = String(raw).replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;
  // Nếu có dấu chấm hàng nghìn kiểu Việt Nam: "125.000" → 125000
  // Phân biệt: nếu có dấu chấm mà phần sau chấm cuối là 3 chữ số → hàng nghìn
  if (cleaned.includes('.') && !cleaned.includes(',')) {
    const parts = cleaned.split('.');
    const lastPart = parts[parts.length - 1];
    if (lastPart.length === 3) {
      // dạng "125.000" hoặc "1.125.000" → loại dấu chấm
      return parseInt(cleaned.replace(/\./g, ''), 10) || 0;
    }
    // dạng "125.5" → số thập phân
    return parseFloat(cleaned) || 0;
  }
  // Có dấu phẩy: "125,000" → loại dấu phẩy
  if (cleaned.includes(',')) {
    return parseInt(cleaned.replace(/,/g, ''), 10) || 0;
  }
  return parseInt(cleaned, 10) || 0;
}

export async function getAnalytics(filters = {}) {
  try {
    const { startDate, endDate } = filters;

    // Fetch completed transactions for revenue
    let txnQuery = supabase
      .from('lb_transactions')
      .select('created_at, amount')
      .eq('status', 'completed');
    if (startDate) txnQuery = txnQuery.gte('created_at', startDate);
    if (endDate)   txnQuery = txnQuery.lte('created_at', endDate + ' 23:59:59');
    const { data: txns, error: txnErr } = await txnQuery;
    if (txnErr) throw txnErr;

    // Fetch users for growth
    let userQuery = supabase.from('lb_users').select('join_date, created_at');
    if (startDate) userQuery = userQuery.gte('join_date', startDate);
    if (endDate)   userQuery = userQuery.lte('join_date', endDate);
    const { data: users, error: userErr } = await userQuery;
    if (userErr) throw userErr;

    // Aggregate revenue by date
    const revenueByDate = {};
    (txns || []).forEach(t => {
      const d = t.created_at ? String(t.created_at).slice(0, 10) : null;
      if (!d) return;
      if (!revenueByDate[d]) revenueByDate[d] = 0;
      revenueByDate[d] += parseAmount(t.amount);
    });

    // Aggregate users by join_date
    const usersByDate = {};
    (users || []).forEach(u => {
      const d = u.join_date ? String(u.join_date).slice(0, 10) : (u.created_at ? String(u.created_at).slice(0, 10) : null);
      if (!d) return;
      if (!usersByDate[d]) usersByDate[d] = 0;
      usersByDate[d]++;
    });

    // Merge into sorted array
    const allDates = new Set([...Object.keys(revenueByDate), ...Object.keys(usersByDate)]);
    const sorted = [...allDates].sort();
    return sorted.map(date => ({
      date,
      total_revenue: revenueByDate[date] || 0,
      revenue: revenueByDate[date] || 0,
      new_users: usersByDate[date] || 0,
      total_users: 0,
      total_listings: 0,
      total_transactions: 0,
      completed_transactions: 0,
      platform_fee: 0,
    }));
  } catch (err) {
    console.warn('getAnalytics fallback:', err?.message);
    try {
      // Fallback: compute from transactions manually
      const { data: allTxns } = await supabase
        .from('lb_transactions')
        .select('created_at, amount, status');
      if (!allTxns) return [];

      const fallbackRevenue = {};
      (allTxns || []).forEach(t => {
        const d = t.created_at ? String(t.created_at).slice(0, 10) : null;
        if (!d || t.status !== 'completed') return;
        if (!fallbackRevenue[d]) fallbackRevenue[d] = 0;
        fallbackRevenue[d] += parseAmount(t.amount);
      });
      return Object.entries(fallbackRevenue)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, revenue]) => ({
          date,
          total_revenue: revenue,
          revenue,
          new_users: 0, total_users: 0, total_listings: 0,
          total_transactions: 0, completed_transactions: 0, platform_fee: 0,
        }));
    } catch {
      return [];
    }
  }
}

export async function getCategoryStats() {
  // Đếm số sách active theo từng category trực tiếp từ lb_books
  try {
    const { data, error } = await supabase
      .from('lb_books')
      .select('category')
      .eq('status', 'active');
    if (error) throw error;
    const map = {};
    (data || []).forEach(b => {
      if (b.category) map[b.category] = (map[b.category] || 0) + 1;
    });
    return map; // { "kinh-te": 12, "luat": 5, ... }
  } catch (err) {
    console.warn('getCategoryStats fallback:', err?.message);
    return {};
  }
}

export async function getDashboardStats() {
  try {
    const [users, listings, transactions, disputes, reports, premiums] = await Promise.all([
      supabase.from('lb_users').select('*', { count: 'exact', head: true }),
      supabase.from('lb_books').select('*', { count: 'exact', head: true }),
      supabase.from('lb_transactions').select('*', { count: 'exact', head: true }),
      supabase.from('lb_disputes').select('*', { count: 'exact', head: true }),
      supabase.from('lb_reports').select('*', { count: 'exact', head: true }),
      supabase.from('lb_listing_promotions').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);
    return {
      totalUsers: users.count || 0,
      totalListings: listings.count || 0,
      totalTransactions: transactions.count || 0,
      totalDisputes: disputes.count || 0,
      totalReports: reports.count || 0,
      totalPremium: premiums.count || 0,
    };
  } catch (err) {
    console.warn('getDashboardStats fallback:', err?.message);
    return {
      totalUsers: MOCK.users.length,
      totalListings: MOCK.listings.length,
      totalTransactions: MOCK.transactions.length,
      totalDisputes: MOCK.disputes.length,
      totalReports: MOCK.reports.length,
      totalPremium: 0,
    };
  }
}

// ============================================================================
// SETTINGS
// ============================================================================

export async function getSetting(key) {
  try {
    const { data, error } = await supabase.from('lb_settings').select('*').eq('key', key).single();
    if (error) throw error;
    return data?.value || null;
  } catch (err) {
    console.warn('getSetting fallback:', err?.message);
    return MOCK.settings.find(s => s.key === key)?.value || null;
  }
}

export async function getAllSettings() {
  try {
    const { data, error } = await supabase.from('lb_settings').select('*');
    if (error) throw error;
    const settings = {};
    data?.forEach(s => { settings[s.key] = s.value; });
    settings._raw = data || [];
    return settings;
  } catch (err) {
    console.warn('getAllSettings fallback:', err?.message);
    const settings = {};
    MOCK.settings.forEach(s => { settings[s.key] = s.value; });
    settings._raw = [...MOCK.settings];
    return settings;
  }
}

export async function updateSetting(key, value) {
  try {
    const { data, error } = await supabase.from('lb_settings').upsert({ key, value, updated_at: new Date().toISOString() }).eq('key', key).select();
    if (error) throw error;
    return data[0];
  } catch (err) {
    console.warn('updateSetting fallback:', err?.message);
    const s = MOCK.settings.find(s => s.key === key);
    if (s) { s.value = value; return s; }
    const ns = { key, value };
    MOCK.settings.push(ns);
    return ns;
  }
}

// ============================================================================
// COMPLAINTS (khiếu nại người dùng)
// ============================================================================

export async function getComplaints(filters = {}, page = 1, perPage = 20) {
  try {
    let query = supabase.from('lb_complaints').select('*, complainant:complainant_id(id, name), defendant:defendant_id(id, name)', { count: 'exact' });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.type) query = query.eq('type', filters.type);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
    if (error) throw error;
    return { data: (data || []).map(c => ({ ...c, complainant_name: c.complainant?.name, defendant_name: c.defendant?.name })), total: count || 0, page, perPage, totalPages: Math.ceil((count || 0) / perPage) };
  } catch (err) {
    console.warn('getComplaints fallback:', err?.message);
    return { data: [], total: 0, page, perPage };
  }
}

export async function updateComplaintStatus(complaintId, status, resolutionNote, resolvedBy) {
  try {
    const updates = { status, updated_at: new Date().toISOString() };
    if (resolutionNote) updates.resolution_note = resolutionNote;
    if (resolvedBy) updates.resolved_by = resolvedBy;
    if (['resolved_buyer', 'resolved_seller', 'resolved_both', 'dismissed'].includes(status)) updates.resolved_at = new Date().toISOString();
    const { data, error } = await supabase.from('lb_complaints').update(updates).eq('id', complaintId).select();
    if (error) throw error;
    return data[0];
  } catch (err) {
    console.warn('updateComplaintStatus fallback:', err?.message);
    throw err;
  }
}

// ============================================================================
// PROMOTIONS / PREMIUM
// ============================================================================

export async function getPromotions(filters = {}, page = 1, perPage = 20) {
  try {
    let query = supabase.from('lb_listing_promotions').select('*', { count: 'exact' });
    if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
    if (error) throw error;
    const enriched = await Promise.all((data || []).map(async (p) => {
      let book_title = '—';
      if (p.book_id) {
        const { data: book } = await supabase.from('lb_books').select('title').eq('id', p.book_id).maybeSingle();
        if (book) book_title = book.title;
      }
      let user_name = '—';
      if (p.user_id) {
        const { data: u } = await supabase.from('lb_users').select('name').eq('id', p.user_id).maybeSingle();
        if (u) user_name = u.name;
      }
      return { ...p, book_title, user_name };
    }));
    return { data: enriched, total: count || 0, page, perPage, totalPages: Math.ceil((count || 0) / perPage) };
  } catch (err) {
    console.warn('getPromotions fallback:', err?.message);
    return { data: [], total: 0, page, perPage };
  }
}

// ============================================================================
// FEE CONFIG
// ============================================================================

export async function getFeeConfigs() {
  try {
    const { data, error } = await supabase.from('lb_fee_config').select('*').order('priority', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('getFeeConfigs fallback:', err?.message);
    return [];
  }
}

export async function updateFeeConfig(id, updates) {
  try {
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('lb_fee_config').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
  } catch (err) {
    console.warn('updateFeeConfig fallback:', err?.message);
    throw err;
  }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function getNotifications(userId, filters = {}, page = 1, perPage = 20) {
  try {
    let query = supabase.from('lb_notifications').select('*', { count: 'exact' }).eq('user_id', userId);
    if (filters.is_read !== undefined) query = query.eq('is_read', filters.is_read);
    if (filters.type) query = query.eq('type', filters.type);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
    if (error) throw error;
    return { data: data || [], total: count || 0, page, perPage, totalPages: Math.ceil((count || 0) / perPage) };
  } catch (err) {
    console.warn('getNotifications fallback:', err?.message);
    return { data: [], total: 0, page, perPage };
  }
}

export async function markNotificationRead(notificationId) {
  try {
    const { error } = await supabase.from('lb_notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', notificationId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('markNotificationRead fallback:', err?.message);
    return true;
  }
}

export async function getVerifications(filters = {}, page = 1, perPage = 20) {
  try {
    let query = supabase.from('lb_student_verifications').select('*, user:user_id(id, name, email)', { count: 'exact' });
    if (filters.status) query = query.eq('status', filters.status);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
    if (error) throw error;
    return { data: data || [], total: count || 0, page, perPage, totalPages: Math.ceil((count || 0) / perPage) };
  } catch (err) {
    console.warn('getVerifications fallback:', err?.message);
    return { data: [], total: 0, page, perPage, totalPages: 1 };
  }
}

export async function approveVerification(id, userId) {
  try {
    const { error: vErr } = await supabase
      .from('lb_student_verifications')
      .update({ status: 'approved' })
      .eq('id', id);
    if (vErr) throw vErr;

    const { error: uErr } = await supabase
      .from('lb_users')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (uErr) throw uErr;

    return true;
  } catch (err) {
    console.error('approveVerification error:', err);
    throw err;
  }
}

export async function rejectVerification(id, userId) {
  try {
    const { error: vErr } = await supabase
      .from('lb_student_verifications')
      .update({ status: 'rejected' })
      .eq('id', id);
    if (vErr) throw vErr;

    const { error: uErr } = await supabase
      .from('lb_users')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (uErr) throw uErr;

    return true;
  } catch (err) {
    console.error('rejectVerification error:', err);
    throw err;
  }
}

export default {
  getUsers, getUserById, updateUserStatus, updateUserRole, updateUserProfile, createUser,
  getListings, getListingById, updateListingStatus, deleteListing,
  getTransactions, updateTransactionStatus,
  getCategories, getCategoryById, createCategory, updateCategory, deleteCategory,
  getDisputes, updateDisputeStatus,
  getReports, updateReportStatus,
  getAnalytics, getDashboardStats,
  getSetting, getAllSettings, updateSetting,
  getComplaints, updateComplaintStatus,
  getPromotions,
  getFeeConfigs, updateFeeConfig,
  getNotifications, markNotificationRead,
  getVerifications, approveVerification, rejectVerification,
};
