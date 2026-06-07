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
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"],
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

server.listen(3001, () => {
  console.log('SOCKET.IO SERVER RUNNING ON PORT 3001');
});
