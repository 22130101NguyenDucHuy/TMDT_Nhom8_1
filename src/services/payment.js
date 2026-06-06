import { supabase } from './supabase';

const DEFAULT_FEE_RATE = 5.00;

export async function createTransaction(bookId, buyerId) {
  const { data: book, error: bookError } = await supabase
    .from('lb_books')
    .select('id, seller_id, price, title')
    .eq('id', bookId)
    .single();
  if (bookError) throw bookError;

  const transactionId = `txn_${Date.now()}`;
  const amount = book.price;
  const feeRate = DEFAULT_FEE_RATE;
  const feeAmount = Math.round(amount * feeRate / 100);
  const netAmount = amount - feeAmount;

  const { data, error } = await supabase
    .from('lb_transactions')
    .insert([{
      id: transactionId,
      book_id: bookId,
      buyer_id: buyerId,
      seller_id: book.seller_id,
      amount,
      fee_amount: feeAmount,
      fee_rate: feeRate,
      net_amount: netAmount,
      type: 'buy',
      status: 'pending',
      is_completed: false,
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

  const { data: buyerWallet, error: walletErr } = await supabase
    .from('lb_wallets')
    .select('*')
    .eq('user_id', txn.buyer_id)
    .maybeSingle();
  if (walletErr) throw walletErr;
  if (!buyerWallet) throw new Error('Không tìm thấy ví người mua');
  if (buyerWallet.balance < txn.amount) throw new Error('Số dư không đủ');

  const { error: deductErr } = await supabase
    .from('lb_wallets')
    .update({
      balance: buyerWallet.balance - txn.amount,
      total_out: (buyerWallet.total_out || 0) + txn.amount,
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
        balance: sellerWallet.balance + txn.net_amount,
        total_in: (sellerWallet.total_in || 0) + txn.net_amount,
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

export function getPaymentMethods() {
  return [
    { id: 'wallet', label: 'Ví LoopBook', description: 'Thanh toán bằng số dư trong ví' },
    { id: 'cash', label: 'Tiền mặt', description: 'Thanh toán khi gặp mặt trực tiếp' },
    { id: 'bank_transfer', label: 'Chuyển khoản', description: 'Chuyển khoản ngân hàng' },
  ];
}
