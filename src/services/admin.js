import { supabase } from './supabase';

// Helper for formatting user average rating
function formatUserForDisplay(u) {
  if (!u) return null;
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
  let query = supabase.from('lb_users').select('id, name, email, phone, avatar_url, role, status, rating_sum, rating_count, created_at', { count: 'exact' });
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.role) query = query.eq('role', filters.role);
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
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
  const { data, error } = await supabase.from('lb_users').update({ status, updated_at: new Date().toISOString() }).eq('id', userId).select();
  if (error) throw error;
  return data[0];
}

export async function updateUserRole(userId, role) {
  const { data, error } = await supabase.from('lb_users').update({ role, updated_at: new Date().toISOString() }).eq('id', userId).select();
  if (error) throw error;
  return data[0];
}

export async function updateUserProfile(userId, updates) {
  updates.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('lb_users').update(updates).eq('id', userId).select();
  if (error) throw error;
  return data[0];
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
  if (status === 'rejected') updates.reject_reason = rejectReason || '';
  if (status === 'sold') { updates.is_sold = true; updates.sold_at = new Date().toISOString(); }
  const { data, error } = await supabase.from('lb_books').update(updates).eq('id', listingId).select();
  if (error) throw error;
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
  // Join book_id để lấy tiêu đề sách phục vụ tìm kiếm và hiển thị
  let query = supabase.from('lb_transactions').select(
    '*, buyer:buyer_id(id, name), seller:seller_id(id, name), book_data:book_id(title)',
    { count: 'exact' }
  );
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.type) query = query.eq('type', filters.type);
  // BUG FIX: Không dùng .or() với FK join (buyer.name, seller.name) vì Supabase không hỗ trợ.
  // Thay vào đó lọc phía client sau khi đã enrich dữ liệu.
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
  if (error) throw error;

  let enriched = (data || []).map(t => ({
    ...t,
    book: t.book_data?.title || t.book || '—',
    buyer_name: t.buyer?.name || '—',
    seller_name: t.seller?.name || '—',
  }));

  // Client-side search trên dữ liệu đã enrich (tên sách, người mua, người bán)
  if (filters.search) {
    const s = filters.search.toLowerCase();
    enriched = enriched.filter(t =>
      (t.book || '').toLowerCase().includes(s) ||
      (t.buyer_name || '').toLowerCase().includes(s) ||
      (t.seller_name || '').toLowerCase().includes(s)
    );
  }

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
  if (['resolved', 'resolved_buyer', 'resolved_seller', 'resolved_partial', 'dismissed'].includes(status)) updates.resolved_at = new Date().toISOString();
  if (status === 'open') updates.resolved_at = null;
  const { data, error } = await supabase.from('lb_disputes').update(updates).eq('id', disputeId).select();
  if (error) throw error;
  return data[0];
}

// ── Dispute conversation chat ────────────────────────────────────────────

export async function getDisputeMessages(dispute) {
  const { data: txn, error: txnErr } = await supabase
    .from('lb_transactions')
    .select('book_id')
    .eq('id', dispute.transaction_id)
    .single();
  if (txnErr) throw txnErr;
  const bookId = txn?.book_id;
  if (!bookId) return [];

  const sorted = [dispute.buyer_id, dispute.seller_id].sort();
  const convId = `${sorted[0]}_${sorted[1]}_${bookId}`;

  const { data, error } = await supabase
    .from('lb_messages')
    .select('*, sender:sender_id(id, name, avatar_url)')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function sendAdminMessage(dispute, adminId, adminName, text) {
  const { data: txn, error: txnErr } = await supabase
    .from('lb_transactions')
    .select('book_id')
    .eq('id', dispute.transaction_id)
    .single();
  if (txnErr) throw txnErr;
  const bookId = txn?.book_id;
  if (!bookId) return false;

  const sorted = [dispute.buyer_id, dispute.seller_id].sort();
  const convId = `${sorted[0]}_${sorted[1]}_${bookId}`;
  const msgText = `[Admin - ${adminName}] ${text}`;
  const now = new Date().toISOString();

  await supabase.from('lb_messages').insert([
    { conversation_id: convId, sender_id: adminId, receiver_id: dispute.buyer_id, book_id: bookId, text: msgText, message_type: 'text', created_at: now },
    { conversation_id: convId, sender_id: adminId, receiver_id: dispute.seller_id, book_id: bookId, text: msgText, message_type: 'text', created_at: now },
  ]);

  return true;
}

export async function reopenDispute(disputeId) {
  return updateDisputeStatus(disputeId, 'open');
}

// ============================================================================
// REPORTS
// ============================================================================

export async function getReports(filters = {}, page = 1, perPage = 20) {
  let query = supabase.from('lb_reports').select('id, reporter_id, target_type, target_id, report_type, description, status, created_at', { count: 'exact' });
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.type) query = query.eq('report_type', filters.type);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
  if (error) throw error;

  const userIds = [...new Set((data || []).map(r => r.reporter_id).filter(Boolean))];
  const listingIds = (data || []).filter(r => r.target_type === 'listing').map(r => r.target_id);

  const [userResult, bookResult] = await Promise.all([
    userIds.length > 0
      ? supabase.from('lb_users').select('id, name').in('id', userIds)
      : Promise.resolve({ data: [] }),
    listingIds.length > 0
      ? supabase.from('lb_books').select('id, title').in('id', listingIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userMap = {};
  (userResult.data || []).forEach(u => { userMap[u.id] = u.name; });
  const bookMap = {};
  (bookResult.data || []).forEach(b => { bookMap[b.id] = b.title; });

  const enriched = (data || []).map(r => ({
    ...r,
    reporter_name: userMap[r.reporter_id] || '—',
    report_date: r.created_at?.split('T')[0],
    listing_title: r.target_type === 'listing' ? (bookMap[r.target_id] || 'Đã bị xóa') : null,
  }));
  return { data: enriched, total: count || 0, page, perPage, totalPages: Math.ceil((count || 0) / perPage) };
}

export async function updateReportStatus(reportId, status, actionTaken, handledBy) {
  const updates = { status, updated_at: new Date().toISOString() };
  if (actionTaken) updates.action_taken = actionTaken;
  if (handledBy) updates.handled_by = handledBy;
  if (['resolved', 'dismissed', 'reviewed'].includes(status)) updates.handled_at = new Date().toISOString();
  if (status === 'open') updates.handled_at = null;
  const { data, error } = await supabase.from('lb_reports').update(updates).eq('id', reportId).select();
  if (error) throw error;
  return data[0];
}

export async function reopenReport(reportId) {
  return updateReportStatus(reportId, 'open');
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

  // BUG FIX: Dùng created_at để filter thay vì join_date (join_date có thể null hoặc không tồn tại)
  let userQuery = supabase.from('lb_users').select('created_at');
  if (startDate) userQuery = userQuery.gte('created_at', startDate);
  if (endDate)   userQuery = userQuery.lte('created_at', endDate + ' 23:59:59');
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
    const d = u.created_at ? String(u.created_at).slice(0, 10) : null;
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
    .from('lb_category_book_counts')
    .select('category, count');
  if (error) throw error;
  const map = {};
  (data || []).forEach(row => {
    map[row.category] = row.count;
  });
  return map;
}

export async function getDashboardStats() {
  const [users, listings, transactions, disputes, reports, premiums] = await Promise.all([
    supabase.from('lb_users').select('*', { count: 'exact', head: true }),
    supabase.from('lb_books').select('*', { count: 'exact', head: true }),
    supabase.from('lb_transactions').select('*', { count: 'exact', head: true }),
    supabase.from('lb_disputes').select('*', { count: 'exact', head: true }).neq('status', 'resolved'),
    supabase.from('lb_reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
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
  const { data, error } = await supabase.from('lb_settings').select('value').eq('key', key).single();
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
  // BUG FIX: .upsert().eq() là cú pháp sai — dùng onConflict thay thế
  const { data, error } = await supabase
    .from('lb_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select();
  if (error) throw error;
  return data[0];
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
  const { data, error } = await supabase.from('lb_complaints').update(updates).eq('id', complaintId).select();
  if (error) throw error;
  return data[0];
}

// ============================================================================
// PROMOTIONS / PREMIUM
// ============================================================================

export async function getPromotions(filters = {}, page = 1, perPage = 20) {
  let query = supabase.from('lb_listing_promotions').select('id, book_id, user_id, is_active, created_at', { count: 'exact' });
  if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
  if (error) throw error;
  const bookIds = (data || []).map(p => p.book_id).filter(Boolean);
  const userIds = (data || []).map(p => p.user_id).filter(Boolean);

  const [{ data: books }, { data: users }] = await Promise.all([
    bookIds.length > 0
      ? supabase.from('lb_books').select('id, title').in('id', bookIds)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? supabase.from('lb_users').select('id, name').in('id', userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const bookMap = Object.fromEntries((books || []).map(b => [b.id, b.title]));
  const userMap = Object.fromEntries((users || []).map(u => [u.id, u.name]));

  const enriched = (data || []).map(p => ({
    ...p,
    book_title: bookMap[p.book_id] || '—',
    user_name: userMap[p.user_id] || '—',
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
  const { data, error } = await supabase.from('lb_fee_config').update(updates).eq('id', id).select();
  if (error) throw error;
  return data[0];
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function getNotifications(userId, filters = {}, page = 1, perPage = 20) {
  let query = supabase.from('lb_notifications').select('id, type, title, content, is_read, created_at', { count: 'exact' }).eq('user_id', userId);
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

export async function getVerifications(filters = {}, page = 1, perPage = 20) {
  try {
    let query = supabase.from('lb_student_verifications').select('id, user_id, status, image_path, created_at', { count: 'exact' });
    if (filters.status) query = query.eq('status', filters.status);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
    if (error) throw error;

    // Manual user lookup (no FK dependency)
    const userIds = [...new Set((data || []).map(r => r.user_id).filter(Boolean))];
    let userMap = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('lb_users')
        .select('id, name, email')
        .in('id', userIds);
      (users || []).forEach(u => { userMap[u.id] = u; });
    }

    const enriched = (data || []).map(r => ({
      ...r,
      user: userMap[r.user_id] ? {
        name: userMap[r.user_id].name,
        email: userMap[r.user_id].email
      } : null,
      user_name: userMap[r.user_id]?.name || '—',
      user_email: userMap[r.user_id]?.email || '—',
      submitted_date: r.created_at?.split('T')[0],
    }));
    return { data: enriched, total: count || 0, page, perPage, totalPages: Math.ceil((count || 0) / perPage) };
  } catch (err) {
    console.warn('getVerifications fallback:', err?.message);
    return { data: [], total: 0, page, perPage, totalPages: 1 };
  }
}

export async function approveVerification(id, userId) {
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

  // BUG FIX: Gửi notification cho sinh viên sau khi được duyệt
  try {
    await createSystemNotification(
      userId,
      '✅ Thẻ sinh viên đã được xác thực!',
      'Tài khoản của bạn đã được kích hoạt. Bạn có thể đăng bán và mua sách trên LoopBook ngay bây giờ!',
      'system'
    );
  } catch (notifErr) {
    // Không để lỗi notification làm fail toàn bộ approve flow
    console.warn('approveVerification: gửi notification thất bại (không nghiêm trọng):', notifErr?.message);
  }

  return true;
}

export async function rejectVerification(id, userId) {
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
}

export async function getWithdrawals(filters = {}, page = 1, perPage = 20) {
  let query = supabase.from('lb_withdrawals').select('id, user_id, amount, bank_name, account_number, account_holder, status, created_at', { count: 'exact' });
  if (filters.status) query = query.eq('status', filters.status);
  
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false });
  if (error) throw error;

  const userIds = [...new Set((data || []).map(r => r.user_id).filter(Boolean))];
  let userMap = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('lb_users')
      .select('id, name, email')
      .in('id', userIds);
    (users || []).forEach(u => { userMap[u.id] = u; });
  }

  const enriched = (data || []).map(r => ({
    ...r,
    user_name: userMap[r.user_id]?.name || '—',
    user_email: userMap[r.user_id]?.email || '—',
    amount: Number(r.amount) || 0,
  }));

  return { data: enriched, total: count || 0, page, perPage, totalPages: Math.ceil((count || 0) / perPage) };
}

export async function approveWithdrawal(id) {
  const { error } = await supabase
    .from('lb_withdrawals')
    .update({ status: 'approved' })
    .eq('id', id);
  if (error) throw error;
  return true;
}

export async function rejectWithdrawal(id, userId, amount) {
  const { error: wErr } = await supabase
    .from('lb_withdrawals')
    .update({ status: 'rejected' })
    .eq('id', id);
  if (wErr) throw wErr;

  const { data: wallet, error: walletErr } = await supabase
    .from('lb_wallets')
    .select('balance, total_out')
    .eq('user_id', userId)
    .maybeSingle();
  if (walletErr) throw walletErr;

  if (wallet) {
    const newBalance = (wallet.balance || 0) + Number(amount);
    const newTotalOut = Math.max(0, (wallet.total_out || 0) - Number(amount));
    
    const { error: uErr } = await supabase
      .from('lb_wallets')
      .update({
        balance: newBalance,
        total_out: newTotalOut,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    if (uErr) throw uErr;
  }

  return true;
}

export async function createSystemNotification(userId, title, content, type = 'system') {
  try {
    const notifType = type === 'promo' ? 'promotion' : type;
    const { data, error } = await supabase
      .from('lb_notifications')
      .insert([{
        user_id: userId,
        type: notifType,
        title,
        content,
        is_read: false,
        created_at: new Date().toISOString()
      }])
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('createSystemNotification error:', err);
    throw err;
  }
}

export async function setPromoCampaign(active) {
  try {
    const { data, error } = await supabase
      .from('lb_settings')
      .upsert([
        { key: 'promo_campaign_active', value: String(active), group_name: 'general', is_public: true }
      ], { onConflict: 'key' })
      .select();
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('setPromoCampaign database fallback:', err.message);
    return true;
  }
}

export async function getPromoCampaign() {
  try {
    const { data, error } = await supabase
      .from('lb_settings')
      .select('value')
      .eq('key', 'promo_campaign_active')
      .maybeSingle();
    if (error) throw error;
    return data ? data.value === 'true' : false;
  } catch (err) {
    console.warn('getPromoCampaign database fallback:', err.message);
    return false;
  }
}

const INSIGHT_ACTIONS_KEY = 'admin_insight_actions';

export async function getInsightActions() {
  const defaults = { demand: false, vip: false, campaign: false };
  try {
    const [{ data }, campaignActive] = await Promise.all([
      supabase.from('lb_settings').select('value').eq('key', INSIGHT_ACTIONS_KEY).maybeSingle(),
      getPromoCampaign(),
    ]);
    let actions = { ...defaults };
    if (data?.value) {
      try {
        actions = { ...defaults, ...JSON.parse(data.value) };
      } catch { /* ignore invalid JSON */ }
    }
    actions.campaign = campaignActive || actions.campaign;
    return actions;
  } catch (err) {
    console.warn('getInsightActions fallback:', err.message);
    return defaults;
  }
}

export async function saveInsightActions(actions) {
  const { error } = await supabase
    .from('lb_settings')
    .upsert({
      key: INSIGHT_ACTIONS_KEY,
      value: JSON.stringify(actions),
      group_name: 'admin',
      is_public: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
  if (error) throw error;
  return true;
}

export async function resetInsightActions() {
  const defaults = { demand: false, vip: false, campaign: false };
  await Promise.all([
    supabase.from('lb_settings').upsert({
      key: INSIGHT_ACTIONS_KEY,
      value: JSON.stringify(defaults),
      group_name: 'admin',
      is_public: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' }),
    setPromoCampaign(false),
  ]);
  return defaults;
}



export async function getRealAdminAnalytics() {
  const analytics = {
    sellerMetrics: {
      topSellers: [],
      needsBoost: [],
      highCancelSellers: [],
      liquidityRate: 0,
      avgSellingDays: 0,
    },
    buyerMetrics: { priceElasticity: [], searchToCart: [] },
    monetization: { bumpEffectiveness: 0, bumpRevenue: 0, categoryRevenue: [] },
    smartInsights: { highDemandLowSupply: null, topSellerMilestone: null, promoCampaign: null },
  };

  try {
    const [
      { data: txns },
      { data: books },
      { data: searches },
      { data: reports },
      { data: promos },
    ] = await Promise.all([
      supabase.from('lb_transactions').select('seller_id, buyer_id, amount, status, is_completed, created_at, book, book_id, type, fee_amount'),
      supabase.from('lb_books').select('id, seller_id, status, is_sold, sold_at, created_at, category, title'),
      supabase.from('lb_search_logs').select('keyword'),
      supabase.from('lb_reports').select('target_id, target_type, status').eq('target_type', 'user'),
      supabase.from('lb_listing_promotions').select('book_id, is_active, amount_paid'),
    ]);

    const sellerBooks = {};
    const bookCategoryMap = {};
    let totalListed = 0;
    let totalSold = 0;
    let sellingDaysSum = 0;
    let sellingDaysCount = 0;

    (books || []).forEach(b => {
      if (!b.seller_id) return;
      bookCategoryMap[b.id] = b.category;
      if (!sellerBooks[b.seller_id]) sellerBooks[b.seller_id] = { listed: 0, sold: 0 };
      sellerBooks[b.seller_id].listed += 1;
      totalListed += 1;
      if (b.is_sold || b.status === 'sold') {
        sellerBooks[b.seller_id].sold += 1;
        totalSold += 1;
        if (b.sold_at && b.created_at) {
          const days = (new Date(b.sold_at) - new Date(b.created_at)) / (1000 * 60 * 60 * 24);
          if (days >= 0) { sellingDaysSum += days; sellingDaysCount += 1; }
        }
      }
    });

    analytics.sellerMetrics.liquidityRate = totalListed > 0 ? Math.round((totalSold / totalListed) * 100) : 0;
    analytics.sellerMetrics.avgSellingDays = sellingDaysCount > 0 ? Math.round(sellingDaysSum / sellingDaysCount) : 0;

    const sellerTxns = {};
    const priceBuckets = { 'Dưới 50K': 0, '50K - 100K': 0, '100K - 200K': 0, 'Trên 200K': 0 };
    const categoryFees = {};

    (txns || []).forEach(t => {
      if (t.type !== 'buy' || !t.seller_id) return;
      if (!sellerTxns[t.seller_id]) sellerTxns[t.seller_id] = { completed: 0, cancelled: 0, total: 0 };
      sellerTxns[t.seller_id].total += 1;
      if (t.status === 'cancelled') sellerTxns[t.seller_id].cancelled += 1;
      if (t.is_completed && t.status === 'completed') {
        sellerTxns[t.seller_id].completed += 1;
        const amt = parseAmount(t.amount);
        if (amt < 50000) priceBuckets['Dưới 50K'] += 1;
        else if (amt < 100000) priceBuckets['50K - 100K'] += 1;
        else if (amt < 200000) priceBuckets['100K - 200K'] += 1;
        else priceBuckets['Trên 200K'] += 1;

        const cat = bookCategoryMap[t.book_id] || 'khac';
        categoryFees[cat] = (categoryFees[cat] || 0) + (Number(t.fee_amount) || 0);
      }
    });

    const sellerIds = [...new Set([
      ...Object.keys(sellerBooks),
      ...Object.keys(sellerTxns),
    ])].filter(id => id && id !== 'null' && id !== 'undefined');
    const userMap = {};
    if (sellerIds.length > 0) {
      const { data: users, error: usersErr } = await supabase.from('lb_users').select('id, name, status').in('id', sellerIds);
      if (usersErr) console.warn('getRealAdminAnalytics user lookup:', usersErr.message);
      (users || []).forEach(u => { userMap[u.id] = u; });
    }

    const reportCount = {};
    (reports || []).forEach(r => {
      reportCount[r.target_id] = (reportCount[r.target_id] || 0) + 1;
    });

    const sellerRows = sellerIds.map(id => {
      const books = sellerBooks[id] || { listed: 0, sold: 0 };
      const txn = sellerTxns[id] || { completed: 0, cancelled: 0, total: 0 };
      const closingRate = books.listed > 0 ? Math.round((books.sold / books.listed) * 100) : 0;
      const cancelRate = txn.total > 0 ? Math.round((txn.cancelled / txn.total) * 100) : 0;
      return {
        id,
        name: userMap[id]?.name || '—',
        status: userMap[id]?.status || 'active',
        listed: books.listed,
        sold: books.sold,
        completed: txn.completed,
        closingRate,
        cancelRate,
        reports: reportCount[id] || 0,
      };
    });

    analytics.sellerMetrics.topSellers = sellerRows
      .filter(s => s.listed >= 1 && s.closingRate >= 30)
      .sort((a, b) => b.closingRate - a.closingRate || b.sold - a.sold)
      .slice(0, 5);

    analytics.sellerMetrics.needsBoost = sellerRows
      .filter(s => s.listed >= 2 && s.closingRate < 30)
      .sort((a, b) => a.closingRate - b.closingRate)
      .slice(0, 5);

    analytics.sellerMetrics.highCancelSellers = sellerRows
      .filter(s => {
        const txn = sellerTxns[s.id] || { total: 0, cancelled: 0 };
        return s.cancelRate >= 30 && txn.total >= 2;
      })
      .sort((a, b) => b.cancelRate - a.cancelRate)
      .slice(0, 5);

    const maxPrice = Math.max(...Object.values(priceBuckets), 1);
    analytics.buyerMetrics.priceElasticity = Object.entries(priceBuckets).map(([range, count]) => ({
      range,
      count,
      pct: Math.round((count / maxPrice) * 100),
    }));

    const searchCount = {};
    (searches || []).forEach(s => {
      const k = (s.keyword || '').toLowerCase().trim();
      if (k) searchCount[k] = (searchCount[k] || 0) + 1;
    });

    const completedBooks = (txns || []).filter(t => t.type === 'buy' && t.is_completed);
    analytics.buyerMetrics.searchToCart = Object.entries(searchCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword, searches]) => {
        const purchases = completedBooks.filter(t =>
          (t.book || '').toLowerCase().includes(keyword) ||
          keyword.split(' ').some(w => w.length > 2 && (t.book || '').toLowerCase().includes(w))
        ).length;
        const conversion = searches > 0 ? Math.round((purchases / searches) * 100) : 0;
        let reason = '—';
        let action = '—';
        if (conversion < 5) {
          reason = 'Nguồn cung ít / giá cao';
          action = 'Thông báo cho Seller cùng khoa';
        } else if (conversion < 15) {
          reason = 'Chất lượng tin đăng chưa tốt';
          action = 'Gợi ý đẩy tin VIP';
        } else {
          reason = 'Chuyển đổi tốt';
          action = 'Duy trì nguồn hàng';
        }
        return { keyword, searches, purchases, conversion, reason, action };
      });

    const topSearch = Object.entries(searchCount).sort((a, b) => b[1] - a[1])[0];
    if (topSearch) {
      const { count: supply } = await supabase
        .from('lb_books')
        .select('id', { count: 'exact' })
        .ilike('title', `%${topSearch[0]}%`);
      analytics.smartInsights.highDemandLowSupply = {
        message: `Có ${topSearch[1]} lượt tìm kiếm sách '${topSearch[0]}' nhưng hiện tại trên sàn chỉ có ${supply || 0} tin đăng.`,
        keyword: topSearch[0],
      };
    }

    const sortedBySales = sellerRows.sort((a, b) => b.completed - a.completed);
    if (sortedBySales[0]?.completed > 0) {
      const best = sortedBySales[0];
      analytics.smartInsights.topSellerMilestone = {
        message: `Tài khoản '${best.name}' vừa đạt mốc ${best.completed} đơn hàng thành công.`,
        userId: best.id,
      };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCompleted = (txns || []).filter(t =>
      t.type === 'buy' && t.is_completed && new Date(t.created_at) >= thirtyDaysAgo
    ).length;
    if (recentCompleted < 10) {
      analytics.smartInsights.promoCampaign = {
        message: `Doanh số 30 ngày gần đây thấp (${recentCompleted} đơn). Cân nhắc kích hoạt campaign khuyến mãi.`,
      };
    }

    const promoBookIds = new Set((promos || []).filter(p => p.is_active).map(p => p.book_id));
    let promoSold = 0, promoTotal = 0, nonPromoSold = 0, nonPromoTotal = 0;
    (books || []).forEach(b => {
      const isPromo = promoBookIds.has(b.id);
      const sold = b.is_sold || b.status === 'sold';
      if (isPromo) { promoTotal++; if (sold) promoSold++; }
      else { nonPromoTotal++; if (sold) nonPromoSold++; }
    });
    const promoRate = promoTotal > 0 ? Math.round((promoSold / promoTotal) * 100) : 0;
    const nonPromoRate = nonPromoTotal > 0 ? Math.round((nonPromoSold / nonPromoTotal) * 100) : 0;
    analytics.monetization.bumpEffectiveness = promoRate - nonPromoRate;
    analytics.monetization.bumpRevenue = (promos || []).reduce((s, p) => s + (Number(p.amount_paid) || 0), 0);

    const CATEGORY_LABELS = {
      'cong-nghe-thong-tin': 'CNTT', 'khoa-hoc-tu-nhien': 'KHTN', 'kinh-te': 'Kinh Tế',
      'ky-thuat': 'Kỹ Thuật', 'luat': 'Luật', 'ngoai-ngu': 'Ngoại Ngữ',
      'nong-nghiep': 'Nông Nghiệp', 'toan-hoc': 'Toán', 'xa-hoi-hoc': 'Xã Hội Học', 'y-hoc': 'Y Học',
    };
    const maxFee = Math.max(...Object.values(categoryFees), 1);
    analytics.monetization.categoryRevenue = Object.entries(categoryFees)
      .map(([cat, fee]) => ({
        category: CATEGORY_LABELS[cat] || cat,
        fee,
        pct: Math.round((fee / maxFee) * 100),
      }))
      .sort((a, b) => b.fee - a.fee);

  } catch (err) {
    console.warn('getRealAdminAnalytics error:', err);
  }

  return analytics;
}

export async function resolveDisputeRefundBuyer(disputeId) {
  // 1. Lấy thông tin khiếu nại và giao dịch liên quan
  const { data: dispute, error: disputeErr } = await supabase
    .from('lb_disputes')
    .select('*, transaction:transaction_id(*)')
    .eq('id', disputeId)
    .single();
  if (disputeErr) throw disputeErr;
  if (!dispute) throw new Error('Không tìm thấy khiếu nại');
  if (dispute.status === 'resolved') throw new Error('Khiếu nại đã được giải quyết trước đó');

  const txn = dispute.transaction;
  if (!txn) throw new Error('Không tìm thấy giao dịch liên quan');

  // 2. Nếu thanh toán bằng Ví hoặc PayOS thì hoàn tiền cho người mua
  if (txn.status === 'pending' && (txn.payment_method === 'wallet' || txn.payment_method === 'payos')) {
    const totalAmount = Number(txn.amount) || 0;
    const { data: buyerWallet, error: walletErr } = await supabase
      .from('lb_wallets')
      .select('*')
      .eq('user_id', txn.buyer_id)
      .maybeSingle();
    if (walletErr) throw walletErr;

    if (buyerWallet) {
      const { error: refundErr } = await supabase
        .from('lb_wallets')
        .update({
          balance: (buyerWallet.balance || 0) + totalAmount,
          total_out: Math.max(0, (buyerWallet.total_out || 0) - totalAmount),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', txn.buyer_id);
      if (refundErr) throw refundErr;
    } else {
      const { error: insertErr } = await supabase
        .from('lb_wallets')
        .insert([{
          user_id: txn.buyer_id,
          balance: totalAmount,
          total_in: 0,
          total_out: 0,
          updated_at: new Date().toISOString()
        }]);
      if (insertErr) throw insertErr;
    }
  }

  // 3. Cập nhật trạng thái giao dịch sang 'cancelled'
  const newNotes = (txn.notes ? txn.notes + '|' : '') + `cancelled_by_admin:true|resolved_dispute:${disputeId}`;
  const { error: updateTxnErr } = await supabase
    .from('lb_transactions')
    .update({
      status: 'cancelled',
      is_completed: false,
      notes: newNotes,
      updated_at: new Date().toISOString()
    })
    .eq('id', txn.id);
  if (updateTxnErr) throw updateTxnErr;

  // 4. Cập nhật trạng thái khiếu nại thành 'resolved' bằng hàm có sẵn
  await updateDisputeStatus(disputeId, 'resolved', 'Hoàn tiền cho người mua (Admin xử lý)');

  // 5. Gửi thông báo hệ thống
  await createSystemNotification(
    txn.buyer_id,
    'Khiếu nại được giải quyết',
    `Khiếu nại cho đơn hàng #${txn.id.slice(0, 8)} đã được giải quyết. Bạn được hoàn trả ${txn.amount}đ về ví.`,
    'system'
  );
  await createSystemNotification(
    txn.seller_id,
    'Đơn hàng bị hủy do khiếu nại',
    `Đơn hàng #${txn.id.slice(0, 8)} bị hủy sau khi admin giải quyết khiếu nại. Sách của bạn đã được mở bán lại hoặc trả lại.`,
    'system'
  );

  return true;
}

export async function resolveDisputeReleaseSeller(disputeId) {
  // 1. Lấy thông tin khiếu nại và giao dịch liên quan
  const { data: dispute, error: disputeErr } = await supabase
    .from('lb_disputes')
    .select('*, transaction:transaction_id(*)')
    .eq('id', disputeId)
    .single();
  if (disputeErr) throw disputeErr;
  if (!dispute) throw new Error('Không tìm thấy khiếu nại');
  if (dispute.status === 'resolved') throw new Error('Khiếu nại đã được giải quyết trước đó');

  const txn = dispute.transaction;
  if (!txn) throw new Error('Không tìm thấy giao dịch liên quan');

  // 2. Nếu thanh toán bằng Ví hoặc PayOS thì giải ngân cho người bán
  if (txn.status === 'pending' && (txn.payment_method === 'wallet' || txn.payment_method === 'payos')) {
    const netAmount = Number(txn.net_amount) || 0;
    const { data: sellerWallet, error: walletErr } = await supabase
      .from('lb_wallets')
      .select('*')
      .eq('user_id', txn.seller_id)
      .maybeSingle();
    if (walletErr) throw walletErr;

    if (sellerWallet) {
      const { error: creditErr } = await supabase
        .from('lb_wallets')
        .update({
          balance: (sellerWallet.balance || 0) + netAmount,
          total_in: (sellerWallet.total_in || 0) + netAmount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', txn.seller_id);
      if (creditErr) throw creditErr;
    } else {
      const { error: insertErr } = await supabase
        .from('lb_wallets')
        .insert([{
          user_id: txn.seller_id,
          balance: netAmount,
          total_in: netAmount,
          total_out: 0,
          updated_at: new Date().toISOString()
        }]);
      if (insertErr) throw insertErr;
    }
  }

  // 3. Cập nhật trạng thái giao dịch sang 'completed'
  const newNotes = (txn.notes ? txn.notes + '|' : '') + `released_by_admin:true|resolved_dispute:${disputeId}`;
  const { error: updateTxnErr } = await supabase
    .from('lb_transactions')
    .update({
      status: 'completed',
      is_completed: true,
      notes: newNotes,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', txn.id);
  if (updateTxnErr) throw updateTxnErr;

  // 4. Đánh dấu sách đã bán
  if (txn.book_id) {
    await supabase
      .from('lb_books')
      .update({
        status: 'sold',
        is_sold: true,
        sold_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', txn.book_id);
  }

  // 5. Cập nhật trạng thái khiếu nại thành 'resolved' bằng hàm có sẵn
  await updateDisputeStatus(disputeId, 'resolved', 'Giải ngân cho người bán (Admin xử lý)');

  // 6. Gửi thông báo hệ thống
  await createSystemNotification(
    txn.buyer_id,
    'Đơn hàng hoàn tất',
    `Khiếu nại đơn hàng #${txn.id.slice(0, 8)} đã được giải quyết. Giao dịch được xác nhận hoàn tất.`,
    'system'
  );
  await createSystemNotification(
    txn.seller_id,
    'Giải ngân thành công',
    `Khiếu nại đơn hàng #${txn.id.slice(0, 8)} đã được giải quyết. Số tiền giải ngân ${txn.net_amount}đ đã được cộng vào ví của bạn.`,
    'system'
  );

  return true;
}

export default {
  getUsers, getUserById, updateUserStatus, updateUserRole, updateUserProfile, createUser,
  getListings, getListingById, updateListingStatus, deleteListing,
  getTransactions, updateTransactionStatus,
  getCategories, getCategoryById, createCategory, updateCategory, deleteCategory,
  getDisputes, updateDisputeStatus,
  resolveDisputeRefundBuyer, resolveDisputeReleaseSeller,
  getReports, updateReportStatus,
  getAnalytics, getDashboardStats, getRealAdminAnalytics,
  getSetting, getAllSettings, updateSetting,
  getComplaints, updateComplaintStatus,
  getPromotions,
  getFeeConfigs, updateFeeConfig,
  getNotifications, markNotificationRead,
  getVerifications, approveVerification, rejectVerification,
  createSystemNotification, setPromoCampaign, getPromoCampaign, getInsightActions, saveInsightActions, resetInsightActions,
  getWithdrawals, approveWithdrawal, rejectWithdrawal,
};
