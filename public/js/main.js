// public/js/main.js

const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const typingArea = document.getElementById('typing-area');

// Parse query parameters (username, room)
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const socket = io();

// Join chatroom
socket.emit('joinRoom', { username, room });

// Get room and users info from server
socket.on('roomUsers', ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

// Listen for messages
socket.on('message', (message) => {
  outputMessage(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// --- NEW: Listen for Message Deletion ---
socket.on('messageDeleted', (id) => {
  removeMessageFromDOM(id);
});

// --- NEW: Listen for Message Updates (Edits) ---
socket.on('messageUpdated', (data) => {
  updateMessageInDOM(data);
});

// Message form submit
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = e.target.elements.msg.value.trim();
  if (!msg) return;
  socket.emit('chatMessage', msg);
  e.target.elements.msg.value = '';
  e.target.elements.msg.focus();
});

// --- NEW: Event Delegation for Edit/Delete Clicks ---
chatMessages.addEventListener('click', (e) => {
  // Handle Delete
  if (e.target.classList.contains('delete-btn')) {
    const msgId = e.target.getAttribute('data-id');
    const confirmDelete = confirm('Are you sure you want to delete this message?');
    if (confirmDelete) {
      socket.emit('deleteMessage', msgId);
    }
  }

  // Handle Edit
  if (e.target.classList.contains('edit-btn')) {
    const msgId = e.target.getAttribute('data-id');
    const msgElement = document.getElementById(`msg-text-${msgId}`);
    const currentText = msgElement.innerText;
    
    // Simple prompt for editing
    const newText = prompt('Edit your message:', currentText);
    
    if (newText && newText !== currentText) {
      socket.emit('editMessage', { id: msgId, text: newText });
    }
  }
});

// Output message to DOM
function outputMessage(message) {
  const div = document.createElement('div');
  div.classList.add('message');
  // Add ID to div for finding it later
  div.setAttribute('id', `message-${message.id}`);

  // Check if this is my message to show edit/delete buttons
  const isMyMessage = message.username === username;

  const actionsHtml = isMyMessage
    ? `<div class="message-actions">
         <i class="fas fa-edit edit-btn" data-id="${message.id}" title="Edit"></i>
         <i class="fas fa-trash delete-btn" data-id="${message.id}" title="Delete"></i>
       </div>`
    : '';

  div.innerHTML = `
    <p class="meta">
      ${escapeHtml(message.username)} 
      <span>${message.time}</span>
      ${actionsHtml}
    </p>
    <p class="text" id="msg-text-${message.id}">${escapeHtml(message.text)}</p>
    <p class="status" id="status-${message.id}">${message.status || ''}</p>
  `;
  document.querySelector('.chat-messages').appendChild(div);

  if (message.username !== username) {
    socket.emit('readMessage', message.id);
  }
}

// --- NEW: Helper to Remove Message from DOM ---
function removeMessageFromDOM(id) {
  const element = document.getElementById(`message-${id}`);
  if (element) {
    element.style.opacity = '0';
    setTimeout(() => element.remove(), 300);
  }
}

// --- NEW: Helper to Update Message in DOM ---
function updateMessageInDOM(data) {
  const textElement = document.getElementById(`msg-text-${data.id}`);
  if (textElement) {
    textElement.innerText = data.text;
    
    // Add 'edited' label if not present
    const metaElement = textElement.parentElement.querySelector('.meta');
    if (!metaElement.querySelector('.edited-label')) {
      const editedSpan = document.createElement('span');
      editedSpan.classList.add('edited-label');
      editedSpan.innerText = ' (edited)';
      editedSpan.style.fontSize = '11px';
      editedSpan.style.fontStyle = 'italic';
      metaElement.appendChild(editedSpan);
    }
  }
}

// Utility to prevent XSS
function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return unsafe
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function outputRoomName(r) {
  roomName.innerText = r;
}

function outputUsers(users) {
  userList.innerHTML = `
    ${users.map((user) => `<li>${escapeHtml(user.username)}</li>`).join('')}
  `;
}

/* ---------- Typing indicator ---------- */
const msgInput = document.getElementById('msg');
let typingTimeout = null;
let isTyping = false;
const STOP_TYPING_DELAY = 1200;

msgInput.addEventListener('input', () => {
  if (!isTyping) {
    isTyping = true;
    socket.emit('typing');
  }
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    isTyping = false;
    socket.emit('stopTyping');
  }, STOP_TYPING_DELAY);
});

const typingUsers = new Set();

function updateTypingArea() {
  const arr = Array.from(typingUsers);
  if (arr.length === 0) {
    typingArea.innerText = '';
    typingArea.style.display = 'none';
    return;
  }

  typingArea.style.display = 'block';
  let text = '';
  if (arr.length === 1) {
    text = `${arr[0]} is typing...`;
  } else if (arr.length === 2) {
    text = `${arr[0]} and ${arr[1]} are typing...`;
  } else {
    const others = arr.length - 2;
    text = `${arr[0]}, ${arr[1]} and ${others} others are typing...`;
  }
  typingArea.innerText = text;
}

socket.on('typing', (data) => {
  if (!data || !data.username) return;
  if (data.username === username) return;
  typingUsers.add(data.username);
  updateTypingArea();
});

socket.on('stopTyping', (data) => {
  if (!data || !data.username) return;
  typingUsers.delete(data.username);
  updateTypingArea();
});

socket.on('messageStatusUpdated', (data) => {
  const statusEl = document.getElementById(`status-${data.id}`);
  if (statusEl) {
    statusEl.innerText = data.status;
  }
});