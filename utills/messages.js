// utils/messages.js
const moment = require('moment');

function formatMessage(username, text) {
  return {
    id: Date.now() + Math.random().toString(36).substr(2, 9), // Slightly stronger unique ID
    username,
    text,
    time: moment().format('h:mm a'),
    status: 'sent'
  };
}

module.exports = formatMessage;