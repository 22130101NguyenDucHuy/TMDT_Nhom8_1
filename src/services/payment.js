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
    .select('*')
    .eq('id', transactionId)
    .single();
  if (txnError) throw txnError;
  if (txn.status !== 'pending') throw new Error('Giao dịch đã được xử lý');

  // amount được lưu dạng string trong schema — parse về number
  const totalAmount = Number(txn.amount) || 0;

  const { data: buyerWallet, error: walletErr } = await supabase
    .from('lb_wallets')
    .select('*')
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
    .select('*')
    .eq('id', transactionId)
    .single();
  if (txnError) throw txnError;
  if (txn.status !== 'pending' || txn.is_completed) {
    throw new Error('Giao dịch không hợp lệ hoặc đã được xử lý');
  }
  if (txn.payment_method !== 'wallet') {
    throw new Error('Chỉ áp dụng cho giao dịch thanh toán bằng ví');
  }

  const netAmount = Number(txn.net_amount) || 0;

  // Cộng tiền vào ví người bán
  const { data: sellerWallet, error: sellerWalletErr } = await supabase
    .from('lb_wallets')
    .select('*')
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

  return updatedTxn;
}

export async function depositWallet(userId, amount) {
  if (!userId || !amount || amount <= 0) throw new Error('Thông tin nạp tiền không hợp lệ');
  const { data: wallet, error: walletErr } = await supabase
    .from('lb_wallets')
    .select('*')
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
    .select('*')
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
 * Khởi khiếu nại đơn hàng — Người mua khiếu nại trong vòng 48h
 * Chuyển trạng thái giao dịch sang disputed, chặn giải ngân
 */
export async function openDispute(transactionId, reason = '') {
  const { data: txn, error: txnError } = await supabase
    .from('lb_transactions')
    .select('*')
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

  // Chỉ cho phép khiếu nại khi giao dịch chưa bị hủy/refunded
  if (['cancelled', 'refunded', 'disputed'].includes(txn.status)) {
    throw new Error('Giao dịch này không thể khiếu nại');
  }

  const { data: updatedTxn, error: updateErr } = await supabase
    .from('lb_transactions')
    .update({
      status: 'disputed',
      notes: (txn.notes || '') + `|dispute:${reason}|dispute_at:${new Date().toISOString()}`,
    })
    .eq('id', transactionId)
    .select()
    .single();
  if (updateErr) throw updateErr;

  return updatedTxn;
}

export function getPaymentMethods() {
  return [
    { id: 'wallet', label: 'Ví LoopBook', description: 'Thanh toán bằng số dư trong ví' },
    { id: 'cash', label: 'Tiền mặt', description: 'Thanh toán khi gặp mặt trực tiếp' },
    { id: 'bank_transfer', label: 'Chuyển khoản', description: 'Chuyển khoản ngân hàng' },
  ];
}
