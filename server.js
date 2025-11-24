// server.js
const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');

const formatMessage = require('./utills/messages');
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utills/users');

const app = express();
const server = http.createServer(app);

// FIX: Allow up to 50MB files (images)
const io = socketio(server, {
  maxHttpBufferSize: 5e7 
});

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botname = 'TrimChat Bot';
// Bot uses a fixed robot image
const botAvatar = `https://api.dicebear.com/9.x/bottts/svg?seed=${botname}`;

io.on('connection', (socket) => {
  
  // LISTEN FOR JOIN: Accept customAvatar
  socket.on('joinRoom', ({ username, room, customAvatar }) => {
    
    // Pass the image to the user creation logic
    const user = userJoin(socket.id, username, room, customAvatar);
    
    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botname, 'Welcome to TrimChat!', botAvatar));

    // Broadcast to others
    socket.broadcast
      .to(user.room)
      .emit('message', formatMessage(botname, `${user.username} has joined the chat`, botAvatar));

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', (msg) => {
    const user = getCurrentUser(socket.id);
    if (user) {
      // Send the message with the User's avatar
      io.to(user.room).emit('message', formatMessage(user.username, msg, user.avatar));
    }
  });

  // Typing Events
  socket.on('typing', () => {
    const user = getCurrentUser(socket.id);
    if (user) socket.broadcast.to(user.room).emit('typing', { username: user.username });
  });

  socket.on('stopTyping', () => {
    const user = getCurrentUser(socket.id);
    if (user) socket.broadcast.to(user.room).emit('stopTyping', { username: user.username });
  });

  // Delete/Edit Events
  socket.on('deleteMessage', (msgId) => {
    const user = getCurrentUser(socket.id);
    if (user) io.to(user.room).emit('messageDeleted', msgId);
  });

  socket.on('editMessage', ({ id, text }) => {
    const user = getCurrentUser(socket.id);
    if (user) io.to(user.room).emit('messageUpdated', { id, text });
  });

  socket.on('readMessage', (msgId) => {
    const user = getCurrentUser(socket.id);
    if (user) io.to(user.room).emit('messageStatusUpdated', { id: msgId, status: 'Seen' });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);
    if (user) {
      io.to(user.room).emit('message', formatMessage(botname, `${user.username} has left the chat`, botAvatar));
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));