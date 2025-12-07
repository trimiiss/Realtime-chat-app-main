# TrimChat AI - Realtime Chat Application

> **🎥 Video Demo**: [DEMO](https://youtu.be/HqtXw6dBCH8)

A modern, full‑stack realtime chat application built with **HTML**, **CSS**, **Vanilla JavaScript**, **Node.js**, **Socket.io**, and **SQLite**. Features include instant messaging, secure authentication, avatar customization, typing indicators, and a built‑in AI chatbot.

## 🚀 Features

- **Realtime Messaging**: Instant communication using Socket.io.
- **🤖 AI Chatbot**: Integrated AI (Pollinations.ai) that responds to `@bot`.
- **🔐 Secure Authentication**: User registration & login with bcrypt + JWT.
- **💾 Data Persistence**: User accounts saved in SQLite (`chat.db`). *Chat history loading is disabled for privacy.*
- **📝 Inline Editing**: Edit or delete your own messages.
- **🎨 Modern UI**: Built with HTML, CSS, and JavaScript (Light/Dark Mode toggle).
- **🖼️ Avatar Customization**: Upload your own photo or generate a random robot avatar.
- **Typing Indicators**: See when users (with their real avatar) or the bot are typing.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+).
- **Backend**: Node.js, Express, Socket.io.
- **Database**: SQLite (handled via `sqlite3`).
- **Security**: bcryptjs, jsonwebtoken.

## 📦 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd Realtime-chat-app-main
   ```
2. **Install backend dependencies**
   ```bash
   npm install
   ```

## ⚙️ Configuration

Create a `.env` file in the root directory and add:
```env
JWT_SECRET=your_super_secret_key_here
```
You can generate a random string for better security.

## 🏃‍♂️ How to Run

The backend server also serves the static frontend from the `public/` directory.
```bash
npm start
# App runs on http://localhost:3001
```

## 🤖 How to use the Bot

Simply mention `@bot` in any message to get a response from the AI.
> "Hey @bot, tell me a joke!"

## 📂 Project Structure

- `server.js`: Main backend server entry point.
- `utils/`: Database and helper functions.
- `routes/`: Authentication API routes.
- `public/`: Frontend (HTML, CSS, JS).
- `uploads/`: Uploaded avatar images.
- `chat.db`: SQLite database file.
