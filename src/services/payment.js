import { supabase } from './supabase';

const DEFAULT_FEE_RATE = 5.00;

export async function createTransaction(bookId, buyerId, options = {}) {
  const {
    paymentMethod = 'cash',
    deliveryMethod = 'meet',
    deliveryAddress = '',
    buyerName = '',
    buyerPhone = '',
    deliveryFee = 0,
  } = options;

  const { data: book, error: bookError } = await supabase
    .from('lb_books')
    .select('id, seller_id, price, title')
    .eq('id', bookId)
    .single();
  if (bookError) throw bookError;

  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const amount = (book.price || 0) + (deliveryFee || 0);
  const feeRate = DEFAULT_FEE_RATE;
  const feeAmount = Math.round((book.price || 0) * feeRate / 100);
  const netAmount = (book.price || 0) - feeAmount;

  const { data, error } = await supabase
    .from('lb_transactions')
    .insert([{
      id: transactionId,
      book: book.title,
      partner: buyerName,
      book_id: bookId,
      buyer_id: buyerId,
      seller_id: book.seller_id,
      amount: String(amount),       // cột text trong schema
      fee_amount: feeAmount,
      fee_rate: feeRate,
      net_amount: netAmount,
      type: 'buy',
      status: paymentMethod === 'wallet' ? 'pending' : 'awaiting_meet',
      is_completed: false,
      payment_method: paymentMethod,
      delivery_method: deliveryMethod,
      delivery_address: deliveryAddress,
      buyer_phone: buyerPhone,
      buyer_name: buyerName,
      notes: [
        deliveryMethod ? `ship:${deliveryMethod}` : null,
        deliveryAddress ? `addr:${deliveryAddress}` : null,
        buyerPhone ? `tel:${buyerPhone}` : null,
      ].filter(Boolean).join('|'),
      when_time: new Date().toLocaleString('vi-VN'),
    }])
    .select()
    .single();

  if (error) throw error;

  // Gửi tin nhắn tự động thông báo đặt mua tài liệu qua kênh chat
  try {
    const sorted = [buyerId, book.seller_id].sort();
    const convId = `${sorted[0]}_${sorted[1]}_${bookId}`;
    const pmLabels = {
      wallet: 'Ví LoopBook (Đang giữ tiền ký quỹ)',
      payos: 'PayOS (Đang giữ tiền ký quỹ)',
      cash: 'Tiền mặt (COD - Giao dịch trực tiếp)',
      bank_transfer: 'Chuyển khoản ngân hàng (Chờ xác nhận)',
    };
    const dmLabels = {
      meet: 'Gặp trực tiếp',
      ship_fast: 'Giao hàng nhanh',
      ship_save: 'Giao hàng tiết kiệm',
    };
    const pmLabel = pmLabels[paymentMethod] || paymentMethod;
    const dmLabel = dmLabels[deliveryMethod] || deliveryMethod;

    await supabase.from('lb_messages').insert({
      conversation_id: convId,
      sender_id: buyerId,
      receiver_id: book.seller_id,
      book_id: bookId,
      text: `[HỆ THỐNG] Tôi đã đặt mua tài liệu "${book.title}" của bạn.\n- Phương thức thanh toán: ${pmLabel}\n- Hình thức vận chuyển: ${dmLabel}\n- Địa chỉ/Điểm hẹn: ${deliveryAddress || 'Chưa chọn'}\n- Họ tên người nhận: ${buyerName || 'Chưa nhập'}\n- Số điện thoại: ${buyerPhone || 'Chưa nhập'}`,
      message_type: 'text',
    });
  } catch (msgErr) {
    console.error('Error sending order notification message:', msgErr);
  }

  return data;
}

export async function processWalletPayment(transactionId) {
  const { data: txn, error: txnError } = await supabase
    .from('lb_transactions')
    .select('id, buyer_id, seller_id, book_id, amount, net_amount, status, is_completed, payment_method, notes')
    .eq('id', transactionId)
    .single();
  if (txnError) throw txnError;
  if (txn.status !== 'pending') throw new Error('Giao dịch đã được xử lý');

  // amount được lưu dạng string trong schema — parse về number
  const totalAmount = Number(txn.amount) || 0;

  const { data: buyerWallet, error: walletErr } = await supabase
    .from('lb_wallets')
    .select('balance, total_out')
    .eq('user_id', txn.buyer_id)
    .maybeSingle();
  if (walletErr) throw walletErr;
  if (!buyerWallet) throw new Error('Không tìm thấy ví người mua');
  if ((buyerWallet.balance || 0) < totalAmount) throw new Error('Số dư không đủ');

  // ESCROW: Trừ tiền người mua, KHÔNG cộng cho người bán ngay
  const { error: deductErr } = await supabase
    .from('lb_wallets')
    .update({
      balance: buyerWallet.balance - totalAmount,
      total_out: (buyerWallet.total_out || 0) + totalAmount,
    })
    .eq('user_id', txn.buyer_id);
  if (deductErr) throw deductErr;

  // Cập nhật trạng thái giao dịch thành "escrow" (đang giữ tiền)
  const { data: updatedTxn, error: updateErr } = await supabase
    .from('lb_transactions')
    .update({
      status: 'pending', // Giữ pending, is_completed = false để đánh dấu đang escrow
      is_completed: false,
      payment_method: 'wallet',
      notes: (txn.notes || '') + '|escrow:locked',
    })
    .eq('id', transactionId)
    .select()
    .single();
  if (updateErr) throw updateErr;

  return updatedTxn;
}

/**
 * Giải ngân Escrow — Người mua xác nhận đã nhận đúng sách
 * Tiền được chuyển từ hệ thống (đã trừ từ ví người mua) sang ví người bán
 */
export async function releaseEscrow(transactionId) {
  const { data: txn, error: txnError } = await supabase
    .from('lb_transactions')
    .select('id, buyer_id, seller_id, book_id, amount, net_amount, status, is_completed, payment_method, notes')
    .eq('id', transactionId)
    .single();
  if (txnError) throw txnError;
  if (txn.status !== 'pending' || txn.is_completed) {
    throw new Error('Giao dịch không hợp lệ hoặc đã được xử lý');
  }
  if (txn.payment_method !== 'wallet' && txn.payment_method !== 'payos') {
    throw new Error('Chỉ áp dụng cho giao dịch thanh toán bằng ví hoặc PayOS');
  }

  const netAmount = Number(txn.net_amount) || 0;

  // Cộng tiền vào ví người bán
  const { data: sellerWallet, error: sellerWalletErr } = await supabase
    .from('lb_wallets')
    .select('balance, total_in')
    .eq('user_id', txn.seller_id)
    .maybeSingle();
  if (sellerWalletErr) throw sellerWalletErr;

  if (sellerWallet) {
    const { error: creditErr } = await supabase
      .from('lb_wallets')
      .update({
        balance: sellerWallet.balance + netAmount,
        total_in: (sellerWallet.total_in || 0) + netAmount,
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
      }]);
    if (insertErr) throw insertErr;
  }

  // Cập nhật trạng thái giao dịch thành completed
  const { data: updatedTxn, error: updateErr } = await supabase
    .from('lb_transactions')
    .update({
      status: 'completed',
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .select()
    .single();
  if (updateErr) throw updateErr;

  // Đánh dấu sách đã bán
  if (txn.book_id) {
    const { error: markSoldErr } = await supabase
      .from('lb_books')
      .update({ status: 'sold', is_sold: true, sold_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', txn.book_id);
    if (markSoldErr) console.error('releaseEscrow: mark book sold error', markSoldErr);
  }

  return updatedTxn;
}

export async function depositWallet(userId, amount) {
  if (!userId || !amount || amount <= 0) throw new Error('Thông tin nạp tiền không hợp lệ');
  const { data: wallet, error: walletErr } = await supabase
    .from('lb_wallets')
    .select('balance, total_in, total_out')
    .eq('user_id', userId)
    .maybeSingle();
  if (walletErr) throw walletErr;

  if (wallet) {
    const { error } = await supabase
      .from('lb_wallets')
      .update({
        balance: (wallet.balance || 0) + amount,
        total_in: (wallet.total_in || 0) + amount,
      })
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('lb_wallets')
      .insert([{ user_id: userId, balance: amount, total_in: amount, total_out: 0 }]);
    if (error) throw error;
  }
  return true;
}

export async function withdrawWallet(userId, amount, bankInfo = {}) {
  if (!userId || !amount || amount <= 0) throw new Error('Số tiền rút không hợp lệ');
  const { data: wallet, error: walletErr } = await supabase
    .from('lb_wallets')
    .select('balance, total_out')
    .eq('user_id', userId)
    .maybeSingle();
  if (walletErr) throw walletErr;
  if (!wallet || (wallet.balance || 0) < amount) throw new Error('Số dư không đủ');

  const { error } = await supabase
    .from('lb_wallets')
    .update({
      balance: wallet.balance - amount,
      total_out: (wallet.total_out || 0) + amount,
    })
    .eq('user_id', userId);
  if (error) throw error;

  const withdrawId = `wd_${Date.now()}`;
  await supabase.from('lb_withdrawals').insert([{
    id: withdrawId,
    user_id: userId,
    amount,
    bank_name: bankInfo.bankName || '',
    account_number: bankInfo.accountNumber || '',
    account_holder: bankInfo.accountHolder || '',
    status: 'pending',
    created_at: new Date().toISOString(),
  }]).maybeSingle();

  return withdrawId;
}

/**
 * Khởi khiếu nại đơn hàng — Người mua/người bán khiếu nại trong vòng 48h
 * Tạo bản ghi trong lb_disputes + chuyển trạng thái giao dịch sang disputed
 */
export async function openDispute(transactionId, userId, reason = '') {
  let { data: txn, error: txnError } = await supabase
    .from('lb_transactions')
    .select('id, buyer_id, seller_id, book_id, amount, status, payment_method, notes, completed_at, created_at')
    .eq('id', transactionId)
    .single();
  if (txnError) throw txnError;

  // Kiểm tra thời gian khiếu nại (trong vòng 48h)
  const txnTime = new Date(txn.completed_at || txn.created_at);
  const now = new Date();
  const hoursDiff = (now - txnTime) / (1000 * 60 * 60);
  if (hoursDiff > 48) {
    throw new Error('Đã quá thời hạn khiếu nại (48h). Vui lòng liên hệ Admin.');
  }

  // Không cho khiếu nại khi đã hủy/hoàn tiền/đang tranh chấp
  if (['cancelled', 'refunded', 'disputed'].includes(txn.status)) {
    throw new Error('Giao dịch này không thể khiếu nại');
  }

  // Xác thực người dùng là người tham gia giao dịch
  const isBuyer = txn.buyer_id === userId;
  const isSeller = txn.seller_id === userId;
  if (!isBuyer && !isSeller) {
    throw new Error('Bạn không phải là người tham gia giao dịch này');
  }

  // Kiểm tra đã có khiếu nại mở cho giao dịch này chưa
  const { data: existing } = await supabase
    .from('lb_disputes')
    .select('id')
    .eq('transaction_id', transactionId)
    .eq('status', 'open')
    .maybeSingle();
  if (existing) {
    throw new Error('Đã có khiếu nại cho giao dịch này, vui lòng chờ admin xử lý');
  }

  // Tạo bản ghi khiếu nại trong lb_disputes
  const nowISO = new Date().toISOString();
  const { error: insertErr } = await supabase
    .from('lb_disputes')
    .insert([{
      transaction_id: transactionId,
      buyer_id: txn.buyer_id,
      seller_id: txn.seller_id,
      title: `Khiếu nại giao dịch #${transactionId.slice(0, 8)}`,
      description: reason,
      amount_involved: txn.amount,
      status: 'open',
      dispute_date: nowISO.slice(0, 10),
      created_at: nowISO,
      updated_at: nowISO,
    }]);
  if (insertErr) throw insertErr;

  // Chuyển trạng thái giao dịch
  const { error: updateErr } = await supabase
    .from('lb_transactions')
    .update({
      status: 'disputed',
      notes: (txn.notes || '') + `|dispute:${reason}|dispute_at:${nowISO}`,
    })
    .eq('id', transactionId);
  if (updateErr) throw updateErr;
}

export function getPaymentMethods() {
  return [
    { id: 'wallet', label: 'Ví LoopBook', description: 'Thanh toán bằng số dư trong ví' },
    { id: 'payos', label: 'Cổng thanh toán PayOS (VietQR)', description: 'Quét mã QR bằng ứng dụng ngân hàng' },
    { id: 'cash', label: 'Tiền mặt', description: 'Thanh toán khi gặp mặt trực tiếp' },
    { id: 'bank_transfer', label: 'Chuyển khoản', description: 'Chuyển khoản ngân hàng' },
  ];
}

const PAYMENT_URL = import.meta.env.VITE_PAYMENT_URL || 'http://localhost:3002';

export async function createPayOSDepositLink(userId, amount) {
  try {
    const response = await fetch(`${PAYMENT_URL}/api/payment/create-payment-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        amount,
        type: 'deposit',
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Lỗi khi tạo liên kết nạp tiền');
    return data;
  } catch (err) {
    console.error('createPayOSDepositLink error:', err);
    throw err;
  }
}

export async function createPayOSCheckoutLink(bookId, buyerId, checkoutOptions = {}) {
  try {
    const {
      deliveryMethod = 'meet',
      deliveryAddress = '',
      buyerName = '',
      buyerPhone = '',
      deliveryFee = 0,
      amount, // Tổng thanh toán
    } = checkoutOptions;

    const response = await fetch(`${PAYMENT_URL}/api/payment/create-payment-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: buyerId,
        amount,
        type: 'checkout',
        bookId,
        buyerName,
        buyerPhone,
        deliveryAddress,
        deliveryMethod,
        deliveryFee,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Lỗi khi tạo liên kết mua sách');
    return data;
  } catch (err) {
    console.error('createPayOSCheckoutLink error:', err);
    throw err;
  }
}

export async function checkPayOSPaymentStatus(orderCode) {
  try {
    const response = await fetch(`${PAYMENT_URL}/api/payment/check-payment/${orderCode}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Lỗi khi kiểm tra trạng thái thanh toán');
    return data;
  } catch (err) {
    console.error('checkPayOSPaymentStatus error:', err);
    throw err;
  }
}

export async function cancelTransaction(transactionId, userId) {
  const { data: txn, error: txnError } = await supabase
    .from('lb_transactions')
    .select('*')
    .eq('id', transactionId)
    .single();
  if (txnError) throw txnError;

  // Xác thực người dùng tham gia giao dịch
  if (txn.buyer_id !== userId && txn.seller_id !== userId) {
    throw new Error('Bạn không có quyền hủy giao dịch này');
  }

  // Chỉ cho phép hủy khi đang ở trạng thái pending hoặc awaiting_meet
  if (!['pending', 'awaiting_meet'].includes(txn.status) || txn.is_completed) {
    throw new Error('Giao dịch này không thể hủy');
  }

  const totalAmount = Number(txn.amount) || 0;

  // Hoàn tiền vào ví người mua nếu đã thanh toán qua ví/PayOS (trạng thái pending)
  if (txn.status === 'pending' && (txn.payment_method === 'wallet' || txn.payment_method === 'payos')) {
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
        }]);
      if (insertErr) throw insertErr;
    }
  }

  // Cập nhật trạng thái giao dịch thành đã hủy
  const { data: updatedTxn, error: updateErr } = await supabase
    .from('lb_transactions')
    .update({
      status: 'cancelled',
      is_completed: false,
      updated_at: new Date().toISOString(),
      notes: (txn.notes || '') + `|cancelled_by:${userId}|cancelled_at:${new Date().toISOString()}`,
    })
    .eq('id', transactionId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Gửi tin nhắn tự động thông báo hủy đơn
  try {
    const sorted = [txn.buyer_id, txn.seller_id].sort();
    const convId = `${sorted[0]}_${sorted[1]}_${txn.book_id}`;
    await supabase.from('lb_messages').insert({
      conversation_id: convId,
      sender_id: userId,
      receiver_id: userId === txn.buyer_id ? txn.seller_id : txn.buyer_id,
      book_id: txn.book_id,
      text: `[HỆ THỐNG] Giao dịch cho tài liệu "${txn.book}" đã bị hủy bởi ${userId === txn.buyer_id ? 'người mua' : 'người bán'}. Số tiền tạm giữ (nếu có) đã được hoàn về ví người mua.`,
      message_type: 'text',
    });
  } catch (msgErr) {
    console.error('Error sending cancel message:', msgErr);
  }

  return updatedTxn;
}

export async function submitSellerRating(transactionId, sellerId, ratingValue) {
  if (!transactionId || !sellerId || !ratingValue || ratingValue < 1 || ratingValue > 5) {
    throw new Error('Thông tin đánh giá không hợp lệ');
  }

  const { data: txn, error: txnError } = await supabase
    .from('lb_transactions')
    .select('id, notes, status')
    .eq('id', transactionId)
    .single();
  if (txnError) throw txnError;

  if (txn.notes?.includes('|rated:true')) {
    throw new Error('Giao dịch này đã được đánh giá trước đó');
  }

  const { data: seller, error: sellerError } = await supabase
    .from('lb_users')
    .select('rating_sum, rating_count')
    .eq('id', sellerId)
    .single();
  if (sellerError) throw sellerError;

  const { error: updateSellerError } = await supabase
    .from('lb_users')
    .update({
      rating_sum: (seller.rating_sum || 0) + ratingValue,
      rating_count: (seller.rating_count || 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', sellerId);
  if (updateSellerError) throw updateSellerError;

  const newNotes = (txn.notes || '') + `|rated:true|rating:${ratingValue}`;
  const { error: updateTxnError } = await supabase
    .from('lb_transactions')
    .update({ notes: newNotes })
    .eq('id', transactionId);
  if (updateTxnError) throw updateTxnError;

  return true;
}

