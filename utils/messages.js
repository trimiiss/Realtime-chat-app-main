// utils/messages.js
// utils/messages.js

function formatMessage(username, text, avatar) {
  return {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    username,
    text,
    avatar, // The avatar URL
    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    status: 'sent'
  };
}

module.exports = formatMessage;