const socket = io();

// State
let user = null;
let token = localStorage.getItem('token');
let currentRoom = '';
let isLoginMode = true;
let avatarUrl = '';

// DOM Elements
const body = document.body;
const authScreen = document.getElementById('auth-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const chatScreen = document.getElementById('chat-screen');

// Auth DOM
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authError = document.getElementById('auth-error');
const btnSwitch = document.getElementById('btn-switch');
const switchText = document.getElementById('switch-text');
const avatarSection = document.getElementById('avatar-section');
const avatarPreview = document.getElementById('avatar-preview');
const btnShuffle = document.getElementById('btn-shuffle');
const fileUpload = document.getElementById('file-upload');

// Lobby DOM
const lobbyForm = document.getElementById('lobby-form');
const lobbyAvatar = document.getElementById('lobby-avatar');
const lobbyGreeting = document.getElementById('lobby-greeting');
const lobbyShuffle = document.getElementById('lobby-shuffle');
const lobbyFileUpload = document.getElementById('lobby-file-upload');
const btnLogoutLobby = document.getElementById('btn-logout-lobby');

// Chat DOM
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const msgInput = document.getElementById('msg-input');
const usersList = document.getElementById('users-list');
const roomName = document.getElementById('room-name');
const btnLeave = document.getElementById('btn-leave');
const btnLogoutChat = document.getElementById('btn-logout-chat');
const btnTheme = document.getElementById('btn-theme');
const btnAvatarRandom = document.getElementById('btn-avatar-random');

// --- INITIALIZATION ---
init();

function init() {
    // Check Theme
    if (localStorage.getItem('theme') === 'light') {
        body.setAttribute('data-theme', 'light');
        btnTheme.innerHTML = '<i class="fas fa-sun"></i> <span>Light Mode</span>';
    } else {
        body.setAttribute('data-theme', 'dark');
        btnTheme.innerHTML = '<i class="fas fa-moon"></i> <span>Dark Mode</span>';
    }

    // Check Auth
    if (token) {
        verifyToken();
    } else {
        showScreen('auth');
        randomizeAvatar(); // Pre-load a random avatar
    }
}

// --- NAVIGATION ---
function showScreen(screen) {
    authScreen.classList.add('hidden');
    lobbyScreen.classList.add('hidden');
    chatScreen.classList.add('hidden');

    if (screen === 'auth') authScreen.classList.remove('hidden');
    if (screen === 'lobby') lobbyScreen.classList.remove('hidden');
    if (screen === 'chat') chatScreen.classList.remove('hidden');
}

// --- AUTH LOGIC ---
async function verifyToken() {
    try {
        const res = await fetch('/api/auth/me', { headers: { 'x-auth-token': token } });
        const data = await res.json();
        if (data && data.avatar) {
            user = data;
            setupLobby();
        } else {
            throw new Error('Invalid token');
        }
    } catch (err) {
        logout();
    }
}

btnSwitch.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        authTitle.innerText = 'Welcome Back';
        authSubtitle.innerText = 'Login to continue chatting';
        document.getElementById('btn-submit').innerText = 'Login';
        switchText.innerText = "Don't have an account? ";
        btnSwitch.innerText = 'Register';
        avatarSection.classList.add('hidden');
    } else {
        authTitle.innerText = 'Create Account';
        authSubtitle.innerText = 'Get your own identity forever';
        document.getElementById('btn-submit').innerText = 'Sign Up';
        switchText.innerText = "Already have an account? ";
        btnSwitch.innerText = 'Login';
        avatarSection.classList.remove('hidden');
    }
    authError.classList.add('hidden');
});

function randomizeAvatar() {
    const seed = Math.random().toString(36).substring(7);
    avatarUrl = `https://robohash.org/${seed}.png`;
    avatarPreview.src = avatarUrl;
    if(user) user.avatar = avatarUrl; // For lobby update
    lobbyAvatar.src = avatarUrl;
}
btnShuffle.addEventListener('click', randomizeAvatar);
lobbyShuffle.addEventListener('click', (e) => { e.preventDefault(); updateAvatar(true); });

async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const res = await fetch('/api/auth/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) {
            avatarUrl = data.url;
            avatarPreview.src = avatarUrl;
            lobbyAvatar.src = avatarUrl;
            if (user) await updateApiAvatar(data.url); // If logged in
        }
    } catch (err) {
        console.error(err);
    }
}
fileUpload.addEventListener('change', handleUpload);
lobbyFileUpload.addEventListener('change', async (e) => {
    await handleUpload(e);
    // handleUpload updates state, we also need to persist it if user is logged in
    // wait, handleUpload calls updateApiAvatar if user exists
});

async function updateApiAvatar(url) {
    const res = await fetch('/api/auth/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ avatar: url })
    });
    if(res.ok) user.avatar = url;
}

// Only for Shuffle in lobby/chat
async function updateAvatar(random = false) {
    if (random) randomizeAvatar();
    await updateApiAvatar(avatarUrl);
}
btnAvatarRandom.addEventListener('click', () => updateAvatar(true));

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
    const body = { username, password };
    if (!isLoginMode) body.avatar = avatarUrl;

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            user = data.user;
            setupLobby();
        } else {
            authError.innerText = data.msg;
            authError.classList.remove('hidden');
        }
    } catch (err) {
        console.error(err);
    }
});

function logout() {
    localStorage.removeItem('token');
    token = null;
    user = null;
    showScreen('auth');
}
btnLogoutLobby.addEventListener('click', logout);
btnLogoutChat.addEventListener('click', logout);

// --- LOBBY LOGIC ---
function setupLobby() {
    lobbyGreeting.innerText = `Hello, ${user.username}!`;
    avatarUrl = user.avatar;
    lobbyAvatar.src = user.avatar;
    showScreen('lobby');
}

lobbyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const room = document.getElementById('room-select').value;
    currentRoom = room;
    joinRoom(room);
});

// --- CHAT LOGIC ---
function joinRoom(room) {
    socket.emit('joinRoom', { username: user.username, room: room, customAvatar: user.avatar });
    roomName.innerText = `${room} Room`;
    chatMessages.innerHTML = ''; // Clear chat
    showScreen('chat');
}

btnLeave.addEventListener('click', () => {
    // socket.emit('leaveRoom'); // Server handles disconnect, but we can just reload or re-join
    window.location.reload(); 
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = msgInput.value;
    if (msg) {
        socket.emit('chatMessage', msg);
        msgInput.value = '';
    }
});

// TYPING
let typingTimeout = null;
msgInput.addEventListener('input', () => {
    socket.emit('typing');
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => socket.emit('stopTyping'), 1000);
});

// SOCKET EVENTS
socket.on('message', (msg) => {
    renderMessage(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('roomUsers', ({ users }) => {
    renderUsers(users);
});

// Typing indicator management
let typingElement = null;
socket.on('typing', ({ username, avatar }) => {
    if (typingElement) typingElement.remove();
    typingElement = document.createElement('div');
    typingElement.className = 'typing-indicator';
    typingElement.innerHTML = `
        <img src="${avatar}" class="typing-avatar">
        <span>${username} is typing...</span>
    `;
    chatMessages.appendChild(typingElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('stopTyping', () => {
    if (typingElement) typingElement.remove();
    typingElement = null;
});

// RENDERING
function renderMessage(msg) {
    if (typingElement) typingElement.remove(); // Push typing down

    const div = document.createElement('div');
    const isOwn = msg.username === user.username;
    div.classList.add('message');
    if (isOwn) div.classList.add('own');

    div.innerHTML = `
        <img src="${msg.avatar}" class="message-avatar">
        <div class="message-content">
            <div class="meta">
                <span class="username">${msg.username}</span>
                <span class="time">${msg.time}</span>
            </div>
            <div class="text">${msg.text}</div>
        </div>
    `;
    chatMessages.appendChild(div);
    if (typingElement) chatMessages.appendChild(typingElement); // Re-append typing
}

function renderUsers(users) {
    usersList.innerHTML = users.map(u => `
        <li>
            <img src="${u.avatar}" class="user-avatar-small">
            <span>${u.username}</span>
        </li>
    `).join('');
}

// THEME
btnTheme.addEventListener('click', () => {
    const current = body.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    btnTheme.innerHTML = newTheme === 'dark' 
        ? '<i class="fas fa-moon"></i> <span>Dark Mode</span>' 
        : '<i class="fas fa-sun"></i> <span>Light Mode</span>';
});
