// public/js/main.js

const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const typingArea = document.getElementById('typing-area');

// Get Username and Room from URL
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const socket = io();

// --- 1. GET THE SAVED IMAGE ---
const savedAvatar = localStorage.getItem('customAvatar');

// --- 2. SEND JOIN REQUEST WITH IMAGE ---
socket.emit('joinRoom', { 
    username, 
    room, 
    customAvatar: savedAvatar 
});

// Socket Events
socket.on('roomUsers', ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

socket.on('message', (message) => {
  outputMessage(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('messageDeleted', (id) => {
  const el = document.getElementById(`message-${id}`);
  if (el) el.remove();
});

socket.on('messageUpdated', (data) => {
  const el = document.getElementById(`msg-text-${data.id}`);
  if (el) {
      el.innerText = data.text;
      const meta = el.parentElement.querySelector('.msg-meta');
      if(!meta.innerText.includes('(edited)')) {
          meta.innerHTML += ' <small style="font-style:italic; opacity:0.7">(edited)</small>';
      }
  }
});

// Chat Form Submit
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = e.target.elements.msg.value.trim();
  if (!msg) return;
  socket.emit('chatMessage', msg);
  e.target.elements.msg.value = '';
  e.target.elements.msg.focus();
});

// Click events for Edit/Delete
chatMessages.addEventListener('click', (e) => {
  if (e.target.classList.contains('delete-btn')) {
    const msgId = e.target.getAttribute('data-id');
    if (confirm('Delete?')) socket.emit('deleteMessage', msgId);
  }
  if (e.target.classList.contains('edit-btn')) {
    const msgId = e.target.getAttribute('data-id');
    const currentText = document.getElementById(`msg-text-${msgId}`).innerText;
    const newText = prompt('Edit:', currentText);
    if (newText && newText !== currentText) socket.emit('editMessage', { id: msgId, text: newText });
  }
});

// Output Message to DOM
function outputMessage(message) {
  const div = document.createElement('div');
  div.classList.add('message');
  div.setAttribute('id', `message-${message.id}`);

  const isMyMessage = message.username === username;

  const actionsHtml = isMyMessage
    ? `<span class="message-actions">
         <i class="fas fa-edit edit-btn" data-id="${message.id}"></i>
         <i class="fas fa-trash delete-btn" data-id="${message.id}"></i>
       </span>`
    : '';

  div.innerHTML = `
    <img src="${message.avatar}" alt="avatar" class="msg-avatar">
    <div class="msg-content">
        <div class="msg-meta">
            <span class="msg-username">${escapeHtml(message.username)}</span>
            <span class="msg-time">${message.time}</span>
            ${actionsHtml}
        </div>
        <p class="msg-text" id="msg-text-${message.id}">${escapeHtml(message.text)}</p>
        <div class="msg-status" id="status-${message.id}">${message.status || ''}</div>
    </div>
  `;
  chatMessages.appendChild(div);

  if (message.username !== username) {
    socket.emit('readMessage', message.id);
  }
}

function outputUsers(users) {
  userList.innerHTML = `
    ${users.map((user) => `
      <li style="display:flex; align-items:center; margin-bottom:10px;">
        <img src="${user.avatar}" style="width:30px; height:30px; border-radius:50%; margin-right:10px; object-fit:cover;">
        <span>${escapeHtml(user.username)}</span>
      </li>
    `).join('')}
  `;
}

function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return unsafe.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function outputRoomName(r) { roomName.innerText = r; }

// Typing Indicator
const msgInput = document.getElementById('msg');
let typingTimeout;
msgInput.addEventListener('input', () => {
  socket.emit('typing');
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit('stopTyping'), 1000);
});

const typingUsers = new Set();
socket.on('typing', (d) => { if(d.username !== username) { typingUsers.add(d.username); updateTyping(); }});
socket.on('stopTyping', (d) => { typingUsers.delete(d.username); updateTyping(); });

function updateTyping() {
    const arr = Array.from(typingUsers);
    if(arr.length > 0) {
        typingArea.innerText = `${arr.join(', ')} is typing...`;
        typingArea.style.display = 'block';
    } else {
        typingArea.style.display = 'none';
    }
}

socket.on('messageStatusUpdated', (data) => {
  const el = document.getElementById(`status-${data.id}`);
  if (el) el.innerText = data.status;
});