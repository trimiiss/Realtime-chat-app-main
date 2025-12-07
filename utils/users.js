// utils/users.js
const users = [];

// Join user to chat
function userJoin(id, username, room, customAvatar) {
  
  let avatar;

  // 1. Check if a custom photo was sent
  if (customAvatar) {
    avatar = customAvatar;
  } else {
    // 2. If no photo, use Initials (Letters)
    // e.g. "Trim" becomes a generic "T" icon
    avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${username}`;
  }

  const user = { id, username, room, avatar };
  users.push(user);
  return user;
}

function getCurrentUser(id) {
  return users.find(user => user.id === id);
}

function userLeave(id) {
  const index = users.findIndex(user => user.id === id);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

function getRoomUsers(room) {
  return users.filter(user => user.room === room);
}

module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
};