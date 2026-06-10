import { supabase } from './supabase';

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
  let query = supabase.from('lb_users').select('*', { count: 'exact' });
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.role) query = query.eq('role', filters.role);
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }
  }
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
  if (error) throw error;

  const userIds = (data || []).map(u => u.id);
  let verificationsMap = {};
  if (userIds.length > 0) {
    const { data: vData } = await supabase
      .from('lb_student_verifications')
      .select('user_id, status')
      .in('user_id', userIds);
    (vData || []).forEach(v => {
      verificationsMap[v.user_id] = v.status;
    });
  }

  const enrichedData = (data || []).map(u => {
    const displayUser = formatUserForDisplay(u);
    displayUser.verification_status = verificationsMap[u.id] || null;
    return displayUser;
  });

  return { data: enrichedData, total: count || 0, page, perPage, totalPages: Math.ceil((count || 0) / perPage) };
}

export async function getUserById(id) {
  const { data, error } = await supabase.from('lb_users').select('*').eq('id', id).single();
  if (error) throw error;
  return formatUserForDisplay(data);
}

export async function updateUserStatus(userId, status) {
  const { data, error } = await supabase
    .from('lb_users')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Không tìm thấy người dùng hoặc không có quyền cập nhật');
  return data[0];
}

export async function updateUserRole(userId, role) {
  const { error } = await supabase
    .from('lb_users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
  return true;
}

export async function updateUserProfile(userId, updates) {
  updates.updated_at = new Date().toISOString();
  const { error } = await supabase
    .from('lb_users')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
  return true;
}

export async function createUser(userData) {
  const { data, error } = await supabase.from('lb_users').insert([userData]).select();
  if (error) throw error;
  return data[0];
}

// ============================================================================
// LISTINGS / BOOKS
// ============================================================================

export async function getListings(filters = {}, page = 1, perPage = 20) {
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
}

export async function getListingById(id) {
  const { data, error } = await supabase.from('lb_books').select('*, seller:seller_id(id, name, rating_sum, rating_count)').eq('id', id).single();
  if (error) throw error;
  if (data) {
    data.seller = data.seller ? { name: data.seller.name, rating: (data.seller.rating_count || 0) > 0 ? (data.seller.rating_sum / data.seller.rating_count).toFixed(1) : '0.0', response_time: '—' } : { name: 'Người bán', rating: '0.0', response_time: '—' };
  }
  return data;
}

export async function updateListingStatus(listingId, status, rejectReason) {
  const updates = { status, updated_at: new Date().toISOString() };
  if (status === 'rejected') {
    updates.reject_reason = rejectReason || '';
  } else if (status === 'active' || status === 'pending') {
    updates.reject_reason = null;
  }
  if (status === 'sold') { updates.is_sold = true; updates.sold_at = new Date().toISOString(); }
  const { data, error } = await supabase.from('lb_books').update(updates).eq('id', listingId).select();
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Không tìm thấy bài đăng hoặc không có quyền cập nhật');
  return data[0];
}

export async function deleteListing(listingId) {
  const { error } = await supabase.from('lb_books').delete().eq('id', listingId);
  if (error) throw error;
  return true;
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

export async function getTransactions(filters = {}, page = 1, perPage = 20) {
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
}

export async function updateTransactionStatus(transactionId, status, isCompleted) {
  const updates = { status, updated_at: new Date().toISOString() };
  if (isCompleted !== undefined) {
    updates.is_completed = isCompleted;
    if (isCompleted) updates.completed_at = new Date().toISOString();
  }
  const { data, error } = await supabase.from('lb_transactions').update(updates).eq('id', transactionId).select();
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Không tìm thấy giao dịch');
  return data[0];
}

// ============================================================================
// CATEGORIES
// ============================================================================

export async function getCategories() {
  const { data, error } = await supabase.from('lb_categories').select('*').order('order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getCategoryById(id) {
  const { data, error } = await supabase.from('lb_categories').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createCategory(data) {
  const { data: result, error } = await supabase.from('lb_categories').insert([data]).select();
  if (error) throw error;
  return result[0];
}

export async function updateCategory(id, updates) {
  updates.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('lb_categories').update(updates).eq('id', id).select();
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Không tìm thấy danh mục');
  return data[0];
}

export async function deleteCategory(id) {
  const { error } = await supabase.from('lb_categories').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============================================================================
// DISPUTES
// ============================================================================

export async function getDisputes(filters = {}, page = 1, perPage = 20) {
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
}

export async function updateDisputeStatus(disputeId, status, resolutionNote, resolvedBy) {
  const updates = { status, updated_at: new Date().toISOString() };
  if (resolutionNote) updates.resolution_note = resolutionNote;
  if (resolvedBy) updates.resolved_by = resolvedBy;
  if (['resolved_buyer', 'resolved_seller', 'resolved_partial', 'dismissed'].includes(status)) updates.resolved_at = new Date().toISOString();
  const { data, error } = await supabase.from('lb_disputes').update(updates).eq('id', disputeId).select();
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Không tìm thấy khiếu nại');
  return data[0];
}

// ============================================================================
// REPORTS
// ============================================================================

export async function getReports(filters = {}, page = 1, perPage = 20) {
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
}

export async function updateReportStatus(reportId, status, actionTaken, handledBy) {
  const updates = { status, updated_at: new Date().toISOString() };
  if (actionTaken) updates.action_taken = actionTaken;
  if (handledBy) updates.handled_by = handledBy;
  if (['resolved', 'dismissed', 'reviewed'].includes(status)) updates.handled_at = new Date().toISOString();
  const { data, error } = await supabase.from('lb_reports').update(updates).eq('id', reportId).select();
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Không tìm thấy báo cáo');
  return data[0];
}

// ============================================================================
// ANALYTICS
// ============================================================================

function parseAmount(raw) {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return raw;
  const cleaned = String(raw).replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;
  if (cleaned.includes('.') && !cleaned.includes(',')) {
    const parts = cleaned.split('.');
    const lastPart = parts[parts.length - 1];
    if (lastPart.length === 3) {
      return parseInt(cleaned.replace(/\./g, ''), 10) || 0;
    }
    return parseFloat(cleaned) || 0;
  }
  if (cleaned.includes(',')) {
    return parseInt(cleaned.replace(/,/g, ''), 10) || 0;
  }
  return parseInt(cleaned, 10) || 0;
}

export async function getAnalytics(filters = {}) {
  const { startDate, endDate } = filters;

  let txnQuery = supabase
    .from('lb_transactions')
    .select('created_at, amount')
    .eq('status', 'completed');
  if (startDate) txnQuery = txnQuery.gte('created_at', startDate);
  if (endDate)   txnQuery = txnQuery.lte('created_at', endDate + ' 23:59:59');
  const { data: txns, error: txnErr } = await txnQuery;
  if (txnErr) throw txnErr;

  let userQuery = supabase.from('lb_users').select('join_date, created_at');
  if (startDate) userQuery = userQuery.gte('join_date', startDate);
  if (endDate)   userQuery = userQuery.lte('join_date', endDate);
  const { data: users, error: userErr } = await userQuery;
  if (userErr) throw userErr;

  const revenueByDate = {};
  (txns || []).forEach(t => {
    const d = t.created_at ? String(t.created_at).slice(0, 10) : null;
    if (!d) return;
    if (!revenueByDate[d]) revenueByDate[d] = 0;
    revenueByDate[d] += parseAmount(t.amount);
  });

  const usersByDate = {};
  (users || []).forEach(u => {
    const d = u.join_date ? String(u.join_date).slice(0, 10) : (u.created_at ? String(u.created_at).slice(0, 10) : null);
    if (!d) return;
    if (!usersByDate[d]) usersByDate[d] = 0;
    usersByDate[d]++;
  });

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
}

export async function getCategoryStats() {
  const { data, error } = await supabase
    .from('lb_books')
    .select('category')
    .eq('status', 'active');
  if (error) throw error;
  const map = {};
  (data || []).forEach(b => {
    if (b.category) map[b.category] = (map[b.category] || 0) + 1;
  });
  return map;
}

export async function getDashboardStats() {
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
}

// ============================================================================
// SETTINGS
// ============================================================================

export async function getSetting(key) {
  const { data, error } = await supabase.from('lb_settings').select('*').eq('key', key).single();
  if (error) throw error;
  return data?.value || null;
}

export async function getAllSettings() {
  const { data, error } = await supabase.from('lb_settings').select('*');
  if (error) throw error;
  const settings = {};
  data?.forEach(s => { settings[s.key] = s.value; });
  settings._raw = data || [];
  return settings;
}

export async function updateSetting(key, value) {
  const { data, error } = await supabase.from('lb_settings').upsert({ key, value, updated_at: new Date().toISOString() }).eq('key', key).select();
  if (error) throw error;
  return data?.[0] || true;
}

// ============================================================================
// COMPLAINTS
// ============================================================================

export async function getComplaints(filters = {}, page = 1, perPage = 20) {
  let query = supabase.from('lb_complaints').select('*, complainant:complainant_id(id, name), defendant:defendant_id(id, name)', { count: 'exact' });
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.type) query = query.eq('type', filters.type);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
  if (error) throw error;
  return { data: (data || []).map(c => ({ ...c, complainant_name: c.complainant?.name, defendant_name: c.defendant?.name })), total: count || 0, page, perPage, totalPages: Math.ceil((count || 0) / perPage) };
}

export async function updateComplaintStatus(complaintId, status, resolutionNote, resolvedBy) {
  const updates = { status, updated_at: new Date().toISOString() };
  if (resolutionNote) updates.resolution_note = resolutionNote;
  if (resolvedBy) updates.resolved_by = resolvedBy;
  if (['resolved_buyer', 'resolved_seller', 'resolved_both', 'dismissed'].includes(status)) updates.resolved_at = new Date().toISOString();
  const { error } = await supabase.from('lb_complaints').update(updates).eq('id', complaintId);
  if (error) throw error;
  return true;
}

// ============================================================================
// PROMOTIONS / PREMIUM
// ============================================================================

export async function getPromotions(filters = {}, page = 1, perPage = 20) {
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
}

// ============================================================================
// FEE CONFIG
// ============================================================================

export async function getFeeConfigs() {
  const { data, error } = await supabase.from('lb_fee_config').select('*').order('priority', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateFeeConfig(id, updates) {
  updates.updated_at = new Date().toISOString();
  const { error } = await supabase.from('lb_fee_config').update(updates).eq('id', id);
  if (error) throw error;
  return true;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function getNotifications(userId, filters = {}, page = 1, perPage = 20) {
  let query = supabase.from('lb_notifications').select('*', { count: 'exact' }).eq('user_id', userId);
  if (filters.is_read !== undefined) query = query.eq('is_read', filters.is_read);
  if (filters.type) query = query.eq('type', filters.type);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
  if (error) throw error;
  return { data: data || [], total: count || 0, page, perPage, totalPages: Math.ceil((count || 0) / perPage) };
}

export async function markNotificationRead(notificationId) {
  const { error } = await supabase.from('lb_notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', notificationId);
  if (error) throw error;
  return true;
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
};
