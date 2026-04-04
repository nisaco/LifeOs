require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. MONGODB DATABASE SETUP
// ==========================================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ✅ UPDATED SCHEMA: Now groups messages by sessionId and creates a Title
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

// ✅ NEW: User Schema
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
// ==========================================
// 2. GEMINI AI SETUP
// ==========================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// 3. AUTHENTICATION ROUTES
// ==========================================
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and email are required." });

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if the user already exists (Smart Login)
    let existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.json({ 
        message: "Welcome back!", 
        userId: existingUser.userId, 
        name: existingUser.name 
      });
    }

    // 2. Create a brand new user
    const generatedUserId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    
    const newUser = new User({
      userId: generatedUserId,
      name: name.trim(),
      email: normalizedEmail
    });

    await newUser.save();

    res.json({ 
      message: "Account created successfully!", 
      userId: newUser.userId, 
      name: newUser.name 
    });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ error: "Failed to create account." });
  }
});

// ==========================================
// 4. THE CHAT ROUTES
// ==========================================

// A. Send a message
app.post('/api/chat', async (req, res) => {
  try {
    const { userId, sessionId, messages } = req.body;

    if (!userId || !messages || messages.length === 0) {
      return res.status(400).json({ error: "Missing userId or messages" });
    }

    // Generate a session ID if this is a brand new chat
    const activeSessionId = sessionId || Date.now().toString();
    // Auto-generate a title based on the first message
    const chatTitle = messages[0].content.substring(0, 30) + (messages[0].content.length > 30 ? '...' : '');

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    
    const latestMessage = messages[messages.length - 1].content;

    const chatSession = model.startChat({ history });
    const result = await chatSession.sendMessage(latestMessage);
    const aiResponseText = result.response.text();

    // Save to the specific session thread
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

    // Send back the reply AND the sessionId so the frontend knows which thread it's in
    res.json({ reply: aiResponseText, sessionId: activeSessionId });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Failed to process chat." });
  }
});

// B. Fetch the list of sessions for the Sidebar
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

// C. Fetch the messages for a specific session
app.get('/api/chat/history/:sessionId', async (req, res) => {
  try {
    const chat = await Chat.findOne({ sessionId: req.params.sessionId });
    res.json(chat ? chat.messages : []);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// D. Delete a specific session
app.delete('/api/chat/history/:sessionId', async (req, res) => {
  try {
    await Chat.findOneAndDelete({ sessionId: req.params.sessionId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear history" });
  }
});

// ==========================================
// STATIC FILE SERVING (FOR RENDER DEPLOYMENT)
// ==========================================
const frontendDistPath = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(frontendDistPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// ==========================================
// 4. START THE SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} (Accepting external connections)`);
});