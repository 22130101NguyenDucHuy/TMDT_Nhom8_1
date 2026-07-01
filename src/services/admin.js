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
  const { data, error } = await supabase.from('lb_settings').upsert({ key, value, updated_at: new Date().toISOString() }).eq('key', key).select();
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
  let query = supabase.from('lb_notifications').select('id, type, title, body, is_read, created_at', { count: 'exact' }).eq('user_id', userId);
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
  let query = supabase.from('lb_student_verifications').select('id, user_id, status, created_at', { count: 'exact' });
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
    submitted_date: r.created_at?.split('T')[0],
  }));
  return { data: enriched, total: count || 0, page, perPage, totalPages: Math.ceil((count || 0) / perPage) };
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
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  return true;
}

export async function rejectWithdrawal(id, userId, amount) {
  const { error: wErr } = await supabase
    .from('lb_withdrawals')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
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
  getWithdrawals, approveWithdrawal, rejectWithdrawal,
};
