// server.js
const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utills/messages'); // Ensure folder name matches (utils vs utills)
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utills/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

const botname = 'TrimChat Bot';

io.on('connection', (socket) => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botname, 'Welcome to TrimChat!'));

    // Broadcast to others
    socket.broadcast
      .to(user.room)
      .emit('message', formatMessage(botname, `${user.username} has joined the chat`));

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // Listen for chat messages
  socket.on('chatMessage', (msg) => {
    const user = getCurrentUser(socket.id);
    if (user) {
      const message = formatMessage(user.username, msg);
      message.status = 'delivered';
      io.to(user.room).emit('message', message);
    }
  });

  // --- NEW: Handle Message Deletion ---
  socket.on('deleteMessage', (msgId) => {
    const user = getCurrentUser(socket.id);
    if (user) {
      // In a real app, you'd verify user owns the message in DB here
      io.to(user.room).emit('messageDeleted', msgId);
    }
  });

  // --- NEW: Handle Message Editing ---
  socket.on('editMessage', ({ id, text }) => {
    const user = getCurrentUser(socket.id);
    if (user) {
      // Broadcast the update
      io.to(user.room).emit('messageUpdated', {
        id,
        text,
        owner: user.username
      });
    }
  });

  // Typing indicator events
  socket.on('typing', () => {
    const user = getCurrentUser(socket.id);
    if (user) {
      socket.broadcast.to(user.room).emit('typing', { username: user.username });
    }
  });

  socket.on('stopTyping', () => {
    const user = getCurrentUser(socket.id);
    if (user) {
      socket.broadcast.to(user.room).emit('stopTyping', { username: user.username });
    }
  });

  // Read receipt event
  socket.on('readMessage', (msgId) => {
    const user = getCurrentUser(socket.id);
    if (user) {
      io.to(user.room).emit('messageStatusUpdated', { id: msgId, status: 'Seen' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);
    if (user) {
      io.to(user.room).emit('message', formatMessage(botname, `${user.username} has left the chat`));
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));