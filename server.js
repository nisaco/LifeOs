require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs'); // ✅ Added for Password Hashing

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true 
});

// ==========================================
// 1. MONGODB DATABASE SETUP
// ==========================================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true }, // ✅ Primary Key
  password: { type: String, required: true }, // ✅ Added for Login
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  isPro: { type: Boolean, default: false },
  subscriptionEnd: { type: Date, default: null },
  dailyChatCount: { type: Number, default: 0 },
  lastChatReset: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const chatSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  sessionId: { type: String, required: true },
  title: { type: String, default: 'New Chat' },
  lastUpdated: { type: Date, default: Date.now },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'] },
    content: String,
    time: { type: Date, default: Date.now }
  }]
});

const Chat = mongoose.model('Chat', chatSchema);

// ==========================================
// 2. GEMINI AI SETUP
// ==========================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// 3. AUTHENTICATION & PAYMENT ROUTES
// ==========================================

// ✅ NEW: Signup Route (Create Account)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    
    // Check if username or email already exists
    const existingUser = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] });
    if (existingUser) {
      return res.status(400).json({ error: "Username or Email already exists. Try logging in!" });
    }

    // Hash the password for production security
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username: username.toLowerCase().trim(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });

    await newUser.save();
    res.json({ success: true, user: { username: newUser.username, name: newUser.name, email: newUser.email, isPro: false } });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ error: "Failed to create account." });
  }
});

// ✅ NEW: Login Route (Access Existing)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username.toLowerCase().trim() });
    
    if (!user) return res.status(404).json({ error: "User not found. Please sign up." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid password." });

    res.json({ 
      success: true, 
      user: { username: user.username, name: user.name, email: user.email, isPro: user.isPro } 
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed." });
  }
});

// ✅ NEW: Sync User Data Route (Used by HomeScreen.js)
app.get('/api/user/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.userId.toLowerCase() });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/api/paystack/initialize', async (req, res) => {
  try {
    const { email, amount } = req.body; 

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: email,
        amount: amount * 100, 
        currency: "GHS", // 
        metadata: {
          custom_fields: [{ display_name: "Service", variable_name: "service", value: "LifeOS Pro" }]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data.data);
  } catch (error) {
    console.error("Paystack Init Error:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Could not initialize payment" });
  }
});

app.post('/api/paystack/webhook', async (req, res) => {
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
                     .update(JSON.stringify(req.body))
                     .digest('hex');

  if (hash === req.headers['x-paystack-signature']) {
    const event = req.body;
    if (event.event === 'charge.success') {
      const userEmail = event.data.customer.email;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); 

      await User.findOneAndUpdate(
        { email: userEmail },
        { isPro: true, subscriptionEnd: expiryDate }
      );
      console.log(`✅ User ${userEmail} upgraded to PRO via Paystack`);
    }
  }
  res.sendStatus(200);
});

// ==========================================
// 4. THE CHAT ROUTES
// ==========================================

app.post('/api/chat', async (req, res) => {
  try {
    const { userId, sessionId, messages } = req.body;

    if (!userId || !messages || messages.length === 0) {
      return res.status(400).json({ error: "Missing userId or messages" });
    }

// 🔒 1. FIND THE USER & CHECK PRO LIMITS (20 Per Hour Logic)
const user = await User.findOne({ username: userId.toLowerCase().trim() });
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    const lastReset = user.lastChatReset || new Date(0);

    // Reset the entire penalty system at midnight
    const isSameDay = now.getFullYear() === lastReset.getFullYear() &&
                      now.getMonth() === lastReset.getMonth() &&
                      now.getDate() === lastReset.getDate();

    if (!isSameDay) {
      user.dailyChatCount = 0;
      user.limitHitCount = 0; // Reset their penalty tier every day
      user.nextAllowedChatTime = null;
      user.lastChatReset = now;
    }

    if (!user.isPro) {
      // A. Are they currently in the penalty box?
      if (user.nextAllowedChatTime && now < user.nextAllowedChatTime) {
        return res.status(403).json({ 
          error: "LIMIT_REACHED", 
          nextAllowed: user.nextAllowedChatTime 
        });
      }

      // B. Did they just finish their penalty? Welcome back!
      if (user.nextAllowedChatTime && now >= user.nextAllowedChatTime) {
        user.dailyChatCount = 0; // Give them a fresh 20 chats
        user.nextAllowedChatTime = null; // Remove the restriction
      }

      // C. Have they hit the 20 limit right now?
      if (user.dailyChatCount >= 20) {
        let penaltyHours = 1; // Default 1 hour
        if (user.limitHitCount === 1) penaltyHours = 1.5; // 1 hr 30 mins
        else if (user.limitHitCount >= 2) penaltyHours = 2; // 2 hours

        const penaltyMs = penaltyHours * 60 * 60 * 1000;
        user.nextAllowedChatTime = new Date(now.getTime() + penaltyMs);
        user.limitHitCount = (user.limitHitCount || 0) + 1; // Move them up the penalty tier
        
        await user.save();

        return res.status(403).json({ 
          error: "LIMIT_REACHED", 
          nextAllowed: user.nextAllowedChatTime 
        });
      }
    }

    // 🧠 2. IF THEY PASS, CALL GEMINI AI
    const activeSessionId = sessionId || Date.now().toString();
    const chatTitle = messages[0].content.substring(0, 30) + (messages[0].content.length > 30 ? '...' : '');

    const model = genAI.getGenerativeModel({
       model: "gemini-2.5-flash",
       systemInstruction: "You are the LifeOS AI Assistant. You are highly intelligent, helpful, and friendly. Use emojis naturally in your responses when necessary. When explaining complex mathematics or physics, strictly format your equations using LaTeX."
      }); 

    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    
    const latestMessage = messages[messages.length - 1].content;
    const chatSession = model.startChat({ history });
    const result = await chatSession.sendMessage(latestMessage);
    const aiResponseText = result.response.text();

    // 💾 3. SAVE CHAT HISTORY
    await Chat.findOneAndUpdate(
      { userId: userId, sessionId: activeSessionId },
      { 
        $set: { title: chatTitle, lastUpdated: Date.now() },
        $push: { 
          messages: { 
            $each: [
              { role: 'user', content: latestMessage },
              { role: 'assistant', content: aiResponseText }
            ] 
          } 
        } 
      },
      { upsert: true, returnDocument: 'after' }
    );

    // 📈 4. INCREMENT CHAT COUNT & SAVE
 if (!user.isPro) {
      user.dailyChatCount = (user.dailyChatCount || 0) + 1;
      await user.save();
    }

    res.json({ reply: aiResponseText, sessionId: activeSessionId, chatsLeft: user.isPro ? 'Unlimited' : 20 - user.dailyChatCount });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Failed to process chat." });
  }
});

app.get('/api/chat/sessions/:userId', async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.params.userId })
      .sort({ lastUpdated: -1 })
      .select('sessionId title lastUpdated');
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

app.get('/api/chat/history/:sessionId', async (req, res) => {
  try {
    const chat = await Chat.findOne({ sessionId: req.params.sessionId });
    res.json(chat ? chat.messages : []);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.delete('/api/chat/history/:sessionId', async (req, res) => {
  try {
    await Chat.findOneAndDelete({ sessionId: req.params.sessionId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear history" });
  }
});

// ==========================================
// 5. TIC-TAC-TOE MULTIPLAYER (SOCKET.IO)
// ==========================================

io.on('connection', (socket) => {
  console.log('🎮 User connected to Game:', socket.id);

  socket.on('create_room', (room) => {
    socket.join(room);
    console.log(`🏠 Room created: ${room}`);
  });

  socket.on('join_room', (room) => {
    const rooms = io.sockets.adapter.rooms;
    if (rooms.has(room)) {
      socket.join(room);
      console.log(`🤝 User joined room: ${room}`);
      socket.to(room).emit('match_started', { symbol: 'X' }); 
      socket.emit('match_started', { symbol: 'O' });
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('make_move', (data) => {
    socket.to(data.room).emit('opponent_moved', {
      board: data.board,
      xIsNext: data.xIsNext
    });
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected from Game');
  });
});

// ==========================================
// STATIC FILE SERVING & MONITORING
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'favicon.ico'));
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});