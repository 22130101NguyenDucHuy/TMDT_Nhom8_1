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

  const amount = (book.price || 0) + (deliveryFee || 0);
  const feeRate = DEFAULT_FEE_RATE;
  const feeAmount = Math.round((book.price || 0) * feeRate / 100);
  const netAmount = (book.price || 0) - feeAmount;

  const { data, error } = await supabase
    .from('lb_transactions')
    .insert([{
      // Không set id — để DB tự sinh UUID
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
