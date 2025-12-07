// server.js
require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const socketio = require('socket.io');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const formatMessage = require('./utils/messages');
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users');
const { getAIResponse } = require('./utils/ai');
const { saveMessage, getRoomMessages, updateMessage, deleteMessage } = require('./utils/db');

const app = express();
const server = http.createServer(app);

// FIX: Allow up to 50MB files (images)
const io = socketio(server, {
  maxHttpBufferSize: 5e7,
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));



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
    const welcomeMsg = formatMessage(botname, 'Welcome to TrimChat!', botAvatar);
    saveMessage(welcomeMsg.username, welcomeMsg.text, user.room, welcomeMsg.avatar, welcomeMsg.time, (newId) => {
        if(newId) welcomeMsg.id = newId;
        socket.emit('message', welcomeMsg);
    });

    // Broadcast to others
    const joinMsg = formatMessage(botname, `${user.username} has joined the chat`, botAvatar);
    saveMessage(joinMsg.username, joinMsg.text, user.room, joinMsg.avatar, joinMsg.time, (newId) => {
        if(newId) joinMsg.id = newId;
        socket.broadcast.to(user.room).emit('message', joinMsg);
    });

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room),
    });

    // Load Chat History - DISABLED per user request
    // getRoomMessages(user.room, (history) => {
    //   history.forEach((msg) => {
    //     socket.emit('message', msg);
    //   });
    // });
  });

  // Listen for chatMessage
  socket.on('chatMessage', (msg) => {
    const user = getCurrentUser(socket.id);
    if (user) {
      // Send the message with the User's avatar
      const messageObj = formatMessage(user.username, msg, user.avatar);
      
      // Save to DB and THEN emit with Real ID
      saveMessage(messageObj.username, messageObj.text, user.room, messageObj.avatar, messageObj.time, (newId) => {
          if (newId) messageObj.id = newId; // Overwrite temp ID with DB ID
          io.to(user.room).emit('message', messageObj);
      });

      // AI Bot Trigger
      // Responds if message starts with "@bot" or contains the bot name (case-insensitive)
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.startsWith('@bot') || lowerMsg.includes('trimchat bot')) {
        // Run AI response asynchronously
        (async () => {
          // Send "Typing..." indicator
          io.to(user.room).emit('typing', { username: botname, avatar: botAvatar });

          const aiReply = await getAIResponse(msg);
          
          // Stop typing indicator
          io.to(user.room).emit('stopTyping', { username: botname });

          const aiMessageObj = formatMessage(botname, aiReply, botAvatar);
          
          // Save Bot Message to DB and THEN emit
          saveMessage(aiMessageObj.username, aiMessageObj.text, user.room, aiMessageObj.avatar, aiMessageObj.time, (newId) => {
             if (newId) aiMessageObj.id = newId;
             io.to(user.room).emit('message', aiMessageObj);
          });
        })();

      }
    }
  });

  // Typing Events
  socket.on('typing', () => {
    const user = getCurrentUser(socket.id);
    if (user) socket.broadcast.to(user.room).emit('typing', { username: user.username, avatar: user.avatar });
  });

  socket.on('stopTyping', () => {
    const user = getCurrentUser(socket.id);
    if (user) socket.broadcast.to(user.room).emit('stopTyping', { username: user.username });
  });

  // Delete/Edit Events
  socket.on('deleteMessage', (msgId) => {
    const user = getCurrentUser(socket.id);
    if (user) {
      io.to(user.room).emit('messageDeleted', msgId);
      deleteMessage(msgId); // Save to DB
    }
  });

  socket.on('editMessage', ({ id, text }) => {
    const user = getCurrentUser(socket.id);
    if (user) {
      io.to(user.room).emit('messageUpdated', { id, text });
      updateMessage(id, text); // Save to DB
    }
  });

  socket.on('readMessage', (msgId) => {
    const user = getCurrentUser(socket.id);
    if (user) io.to(user.room).emit('messageStatusUpdated', { id: msgId, status: 'Seen' });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);
    if (user) {
      const leaveMsg = formatMessage(botname, `${user.username} has left the chat`, botAvatar);
      saveMessage(leaveMsg.username, leaveMsg.text, user.room, leaveMsg.avatar, leaveMsg.time, (newId) => {
          if(newId) leaveMsg.id = newId;
          io.to(user.room).emit('message', leaveMsg);
      });
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));