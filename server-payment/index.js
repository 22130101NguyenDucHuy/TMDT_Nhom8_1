const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { PayOS } = require('@payos/node');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ehvgtgzleukxtqgstivd.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fulfillPayment(orderCode) {
  try {
    console.log(`[PayOS] Bắt đầu xử lý giải ngân cho đơn hàng: ${orderCode}`);
    const { data: transactions, error: searchErr } = await supabase
      .from('lb_transactions')
      .select('*')
      .like('notes', `%payos_order_code:${orderCode}%`);

    if (searchErr) throw searchErr;
    if (!transactions || transactions.length === 0) {
      console.warn(`[PayOS] Không tìm thấy giao dịch với mã: ${orderCode}`);
      return { success: false, error: 'Không tìm thấy giao dịch' };
    }

    const txn = transactions[0];
    const notes = txn.notes || '';
    const isDeposit = notes.includes('type:deposit');

    if (txn.is_completed || notes.includes('escrow:locked') || txn.status === 'completed') {
      console.log(`[PayOS] Giao dịch ${txn.id} đã được xử lý từ trước.`);
      return { success: true, alreadyProcessed: true, txn };
    }

    if (isDeposit) {
      const amount = Number(txn.amount) || 0;
      const userId = txn.buyer_id;

      console.log(`[PayOS] Thực hiện nạp ${amount}đ cho User: ${userId}`);

      const { data: wallet, error: walletErr } = await supabase
        .from('lb_wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (walletErr) throw walletErr;

      if (wallet) {
        const { error: updateErr } = await supabase
          .from('lb_wallets')
          .update({
            balance: (wallet.balance || 0) + amount,
            total_in: (wallet.total_in || 0) + amount,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('lb_wallets')
          .insert([{
            user_id: userId,
            balance: amount,
            total_in: amount,
            total_out: 0,
            created_at: new Date().toISOString(),
          }]);
        if (insertErr) throw insertErr;
      }

      const { error: txnUpdateErr } = await supabase
        .from('lb_transactions')
        .update({
          status: 'completed',
          is_completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', txn.id);
      if (txnUpdateErr) throw txnUpdateErr;

      console.log(`[PayOS] Nạp tiền thành công cho giao dịch: ${txn.id}`);
    } else {
      console.log(`[PayOS] Khóa tiền ký quỹ (Escrow) cho giao dịch: ${txn.id}`);

      const { error: txnUpdateErr } = await supabase
        .from('lb_transactions')
        .update({
          status: 'pending',
          is_completed: false,
          notes: notes + '|escrow:locked',
          updated_at: new Date().toISOString(),
        })
        .eq('id', txn.id);
      if (txnUpdateErr) throw txnUpdateErr;

      console.log(`[PayOS] Khóa tiền ký quỹ thành công cho giao dịch: ${txn.id}`);

      // Gửi tin nhắn tự động thông báo thanh toán thành công
      try {
        const sorted = [txn.buyer_id, txn.seller_id].sort();
        const convId = `${sorted[0]}_${sorted[1]}_${txn.book_id}`;
        await supabase.from('lb_messages').insert({
          conversation_id: convId,
          sender_id: txn.buyer_id,
          receiver_id: txn.seller_id,
          book_id: txn.book_id,
          text: `[HỆ THỐNG] Tôi đã thanh toán thành công qua PayOS cho tài liệu "${txn.book}". Số tiền đang được tạm giữ an toàn trong Escrow.`,
          message_type: 'text',
        });
      } catch (msgErr) {
        console.error('Error sending PayOS fulfill message:', msgErr);
      }
    }

    return { success: true, alreadyProcessed: false, txn };
  } catch (err) {
    console.error('[PayOS] Lỗi xử lý giải ngân:', err.message);
    throw err;
  }
}

app.post('/api/payment/create-payment-link', async (req, res) => {
  const { amount, userId, type, bookId, buyerName, buyerPhone, deliveryAddress, deliveryMethod, deliveryFee } = req.body;

  if (!amount || amount <= 0 || !userId) {
    return res.status(400).json({ error: 'Thông tin thanh toán không hợp lệ' });
  }

  try {
    const orderCode = Date.now() + Math.floor(Math.random() * 1000);

    let cancelUrl = '';
    let returnUrl = '';
    let description = '';
    let txnId = '';

    if (type === 'deposit') {
      description = 'Nap tien vi LoopBook';
      cancelUrl = `${process.env.APP_URL || 'http://localhost:3000'}/wallet?status=cancelled&orderCode=${orderCode}`;
      returnUrl = `${process.env.APP_URL || 'http://localhost:3000'}/wallet?status=success&orderCode=${orderCode}`;

      txnId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const { data: txn, error: txnErr } = await supabase
        .from('lb_transactions')
        .insert([{
          id: txnId,
          book: 'Nạp tiền ví (PayOS)',
          partner: 'Hệ thống',
          buyer_id: userId,
          seller_id: null,
          amount: String(amount),
          fee_amount: 0,
          fee_rate: 0,
          net_amount: amount,
          type: 'buy',
          status: 'pending',
          is_completed: false,
          payment_method: 'payos',
          notes: `payos_order_code:${orderCode}|type:deposit`,
          when_time: new Date().toLocaleString('vi-VN'),
        }])
        .select()
        .single();

      if (txnErr) throw txnErr;
    } else if (type === 'checkout') {
      description = 'Mua sach LoopBook';

      const { data: book, error: bookErr } = await supabase
        .from('lb_books')
        .select('*')
        .eq('id', bookId)
        .single();
      if (bookErr) throw bookErr;

      const feeRate = 5.00;
      const feeAmount = Math.round((book.price || 0) * feeRate / 100);
      const netAmount = (book.price || 0) - feeAmount;

      txnId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const { data: txn, error: txnErr } = await supabase
        .from('lb_transactions')
        .insert([{
          id: txnId,
          book: book.title,
          partner: buyerName || 'Khách hàng',
          book_id: bookId,
          buyer_id: userId,
          seller_id: book.seller_id,
          amount: String(amount),
          fee_amount: feeAmount,
          fee_rate: feeRate,
          net_amount: netAmount,
          type: 'buy',
          status: 'pending',
          is_completed: false,
          payment_method: 'payos',
          delivery_method: deliveryMethod || 'meet',
          delivery_address: deliveryAddress || '',
          buyer_phone: buyerPhone || '',
          buyer_name: buyerName || 'Khách hàng',
          notes: `payos_order_code:${orderCode}|type:checkout|ship:${deliveryMethod || 'meet'}|addr:${deliveryAddress || ''}|tel:${buyerPhone || ''}`,
          when_time: new Date().toLocaleString('vi-VN'),
        }])
        .select()
        .single();

      if (txnErr) throw txnErr;

      // Gửi tin nhắn tự động thông báo đặt mua qua PayOS (chờ thanh toán)
      try {
        const sorted = [userId, book.seller_id].sort();
        const convId = `${sorted[0]}_${sorted[1]}_${bookId}`;
        await supabase.from('lb_messages').insert({
          conversation_id: convId,
          sender_id: userId,
          receiver_id: book.seller_id,
          book_id: bookId,
          text: `[HỆ THỐNG] Tôi đã đặt mua tài liệu "${book.title}" của bạn qua PayOS (Đang chờ thanh toán).\n- Hình thức vận chuyển: ${deliveryMethod === 'meet' ? 'Gặp trực tiếp' : 'Giao hàng'}\n- Địa chỉ/Điểm hẹn: ${deliveryAddress || 'Chưa chọn'}\n- Họ tên người nhận: ${buyerName || 'Khách hàng'}\n- Số điện thoại: ${buyerPhone || 'Chưa nhập'}`,
          message_type: 'text',
        });
      } catch (msgErr) {
        console.error('Error sending PayOS checkout message:', msgErr);
      }
      cancelUrl = `${process.env.APP_URL || 'http://localhost:3000'}/checkout/${bookId}?status=cancelled&orderCode=${orderCode}`;
      returnUrl = `${process.env.APP_URL || 'http://localhost:3000'}/transaction/${txnId}/success?status=success&orderCode=${orderCode}`;
    } else {
      return res.status(400).json({ error: 'Loại thanh toán không hợp lệ' });
    }

    const paymentData = {
      orderCode,
      amount,
      description: description.slice(0, 25),
      cancelUrl,
      returnUrl,
    };

    const paymentLink = await payos.paymentRequests.create(paymentData);
    res.json({ checkoutUrl: paymentLink.checkoutUrl, orderCode, txnId });
  } catch (err) {
    console.error('[PayOS] Lỗi tạo payment link:', err.message);
    res.status(500).json({ error: err.message || 'Lỗi khi tạo link thanh toán' });
  }
});

app.get('/api/payment/check-payment/:orderCode', async (req, res) => {
  const { orderCode } = req.params;
  try {
    const paymentInfo = await payos.paymentRequests.getPaymentLinkInformation(orderCode);
    if (paymentInfo.status === 'PAID') {
      const result = await fulfillPayment(orderCode);
      return res.json({ status: 'PAID', result });
    } else {
      return res.json({ status: paymentInfo.status });
    }
  } catch (err) {
    console.error('[PayOS] Lỗi kiểm tra thanh toán:', err.message);
    res.status(500).json({ error: err.message || 'Lỗi kiểm tra thanh toán' });
  }
});

app.post('/api/payment/payos-webhook', async (req, res) => {
  try {
    const webhookData = payos.webhooks ? payos.webhooks.verify(req.body) : payos.verifyPaymentWebhookData(req.body);

    if (webhookData.description === 'ma giao dich thu nghiem' || webhookData.amount === 0) {
      return res.status(200).send('OK');
    }

    const orderCode = webhookData.orderCode;
    await fulfillPayment(orderCode);

    res.status(200).send('OK');
  } catch (err) {
    console.error('[PayOS Webhook] Lỗi:', err.message);
    res.status(400).send('Webhook failed');
  }
});

const PORT = process.env.PAYMENT_PORT || 3002;
app.listen(PORT, () => {
  console.log(`PAYMENT SERVER RUNNING ON PORT ${PORT}`);
});
