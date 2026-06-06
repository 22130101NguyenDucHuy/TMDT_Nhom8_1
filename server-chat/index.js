const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"]
  }
});

// Supabase client for persisting messages
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ehvgtgzleukxtqgstivd.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_room', (data) => {
    socket.join(data);
    console.log(`User ${socket.id} joined room: ${data}`);
  });

  socket.on('send_message', async (data) => {
    console.log('Message received:', data);

    // Lưu tin nhắn vào lb_messages
    try {
      const { error } = await supabase.from('lb_messages').insert([{
        conversation_id: data.room,
        sender_id: data.senderId,
        receiver_id: data.receiverId,
        book_id: data.bookId || null,
        text: data.text,
        message_type: data.messageType || 'text',
        offer_amount: data.offerAmount || null,
        offer_status: data.offerStatus || null,
      }]);
      if (error) console.warn('Failed to persist message:', error.message);
    } catch (err) {
      console.warn('Error saving message:', err.message);
    }

    // Relay real-time
    socket.to(data.room).emit('receive_message', data);
  });

  socket.on('mark_read', async (data) => {
    try {
      const { error } = await supabase
        .from('lb_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', data.room)
        .eq('receiver_id', data.userId)
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

server.listen(3001, () => {
  console.log('SOCKET.IO SERVER RUNNING ON PORT 3001');
});
