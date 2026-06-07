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
  const netAmount = Number(txn.net_amount) || 0;

  const { data: buyerWallet, error: walletErr } = await supabase
    .from('lb_wallets')
    .select('*')
    .eq('user_id', txn.buyer_id)
    .maybeSingle();
  if (walletErr) throw walletErr;
  if (!buyerWallet) throw new Error('Không tìm thấy ví người mua');
  if ((buyerWallet.balance || 0) < totalAmount) throw new Error('Số dư không đủ');

  const { error: deductErr } = await supabase
    .from('lb_wallets')
    .update({
      balance: buyerWallet.balance - totalAmount,
      total_out: (buyerWallet.total_out || 0) + totalAmount,
    })
    .eq('user_id', txn.buyer_id);
  if (deductErr) throw deductErr;

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

  const { data: updatedTxn, error: updateErr } = await supabase
    .from('lb_transactions')
    .update({
      status: 'completed',
      is_completed: true,
      completed_at: new Date().toISOString(),
      payment_method: 'wallet',
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

export function getPaymentMethods() {
  return [
    { id: 'wallet', label: 'Ví LoopBook', description: 'Thanh toán bằng số dư trong ví' },
    { id: 'cash', label: 'Tiền mặt', description: 'Thanh toán khi gặp mặt trực tiếp' },
    { id: 'bank_transfer', label: 'Chuyển khoản', description: 'Chuyển khoản ngân hàng' },
  ];
}
