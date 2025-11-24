// utils/messages.js
const moment = require('moment');

function formatMessage(username, text, avatar) {
  return {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    username,
    text,
    avatar, // The avatar URL
    time: moment().format('h:mm a'),
    status: 'sent'
  };
}

module.exports = formatMessage;