const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { PayOS } = require('@payos/node');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || '1715cb2f-7ce6-4191-afed-4f451a1769b5',
  apiKey: process.env.PAYOS_API_KEY || 'cd1aa9bf-0d07-49a7-8704-da1ac8363d3b',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || '522f4431f20dfc819b4f64ac0901327c9df09b6afcda8fc5f1a3a1164b0dd14e',
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => cb(null, true),
    methods: ["GET", "POST"]
  }
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ehvgtgzleukxtqgstivd.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_room', (data) => {
    socket.join(data);
    console.log(`User ${socket.id} joined room: ${data}`);
  });

  socket.on('send_message', async (msg) => {
    console.log('Message received:', msg);

    try {
      const { error } = await supabase.from('lb_messages').insert([{
        conversation_id: msg.room || 'default',
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id || null,
        book_id: msg.book_id || null,
        text: msg.text,
        message_type: msg.message_type || 'text',
        offer_amount: msg.offer_amount || null,
        offer_status: msg.offer_status || null,
      }]);
      if (error) console.warn('Failed to persist message:', error.message);
    } catch (err) {
      console.warn('Error saving message:', err.message);
    }

    socket.to(msg.room).emit('receive_message', msg);
  });

  socket.on('mark_read', async (data) => {
    try {
      const { error } = await supabase
        .from('lb_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', data.room)
        .eq('receiver_id', data.user_id)
        .eq('is_read', false);
      if (error) console.warn('Failed to mark messages read:', error.message);
    } catch (err) {
      console.warn('Error marking messages read:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected', socket.id);
  });
});

// ─── CỔNG THANH TOÁN PAYOS (VIETQR) API ─────────────────────────────────────

async function fulfillPayment(orderCode) {
  try {
    console.log(`[PayOS] Bắt đầu xử lý giải ngân cho đơn hàng: ${orderCode}`);
    // Tìm giao dịch tương ứng trong Supabase
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
      // 1. NẠP TIỀN VÀO VÍ
      const amount = Number(txn.amount) || 0;
      const userId = txn.buyer_id;

      console.log(`[PayOS] Thực hiện nạp ${amount}đ cho User: ${userId}`);

      // Lấy ví của người dùng
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

      // Cập nhật trạng thái giao dịch nạp ví thành completed
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
      // 2. MUA SÁCH TRỰC TIẾP (GIỮ TIỀN ESCROW)
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
    }

    return { success: true, alreadyProcessed: false, txn };
  } catch (err) {
    console.error('[PayOS] Lỗi xử lý giải ngân:', err.message);
    throw err;
  }
}

// Endpoint tạo link thanh toán
app.post('/api/payment/create-payment-link', async (req, res) => {
  const { amount, userId, type, bookId, buyerName, buyerPhone, deliveryAddress, deliveryMethod, deliveryFee } = req.body;
  
  if (!amount || amount <= 0 || !userId) {
    return res.status(400).json({ error: 'Thông tin thanh toán không hợp lệ' });
  }

  try {
    const orderCode = Date.now() + Math.floor(Math.random() * 1000); // 13 chữ số
    
    let cancelUrl = '';
    let returnUrl = '';
    let description = '';
    let txnId = '';

    if (type === 'deposit') {
      description = 'Nap tien vi LoopBook';
      cancelUrl = `http://localhost:3000/wallet?status=cancelled&orderCode=${orderCode}`;
      returnUrl = `http://localhost:3000/wallet?status=success&orderCode=${orderCode}`;

      const { data: txn, error: txnErr } = await supabase
        .from('lb_transactions')
        .insert([{
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
      txnId = txn.id;
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

      const { data: txn, error: txnErr } = await supabase
        .from('lb_transactions')
        .insert([{
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
          notes: `payos_order_code:${orderCode}|type:checkout|ship:${deliveryMethod || 'meet'}|addr:${deliveryAddress || ''}|tel:${buyerPhone || ''}`,
          when_time: new Date().toLocaleString('vi-VN'),
        }])
        .select()
        .single();

      if (txnErr) throw txnErr;
      txnId = txn.id;
      cancelUrl = `http://localhost:3000/checkout/${bookId}?status=cancelled&orderCode=${orderCode}`;
      returnUrl = `http://localhost:3000/transaction/${txnId}/success?status=success&orderCode=${orderCode}`;
    } else {
      return res.status(400).json({ error: 'Loại thanh toán không hợp lệ' });
    }

    const paymentData = {
      orderCode,
      amount,
      description: description.slice(0, 25), // Đảm bảo độ dài tối đa 25 ký tự theo quy định PayOS
      cancelUrl,
      returnUrl,
    };

    const paymentLink = await payos.createPaymentLink(paymentData);
    res.json({ checkoutUrl: paymentLink.checkoutUrl, orderCode, txnId });
  } catch (err) {
    console.error('[PayOS] Lỗi tạo payment link:', err.message);
    res.status(500).json({ error: err.message || 'Lỗi khi tạo link thanh toán' });
  }
});

// Endpoint kiểm tra trạng thái thanh toán trực tiếp
app.get('/api/payment/check-payment/:orderCode', async (req, res) => {
  const { orderCode } = req.params;
  try {
    const paymentInfo = await payos.getPaymentLinkInformation(orderCode);
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

// Endpoint Webhook PayOS nhận kết quả thanh toán tự động
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

server.listen(3001, () => {
  console.log('SOCKET.IO SERVER RUNNING ON PORT 3001');
});
