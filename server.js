require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const crypto = require('crypto'); // ✅ Added for Webhook security
const axios = require('axios');   // ✅ Added for Paystack API calls

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. MONGODB DATABASE SETUP
// ==========================================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

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

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  isPro: { type: Boolean, default: false },
  subscriptionEnd: { type: Date, default: null },
  dailyChatCount: { type: Number, default: 0 },
  lastChatReset: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// ==========================================
// 2. GEMINI AI SETUP
// ==========================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// 3. AUTHENTICATION & PAYMENT ROUTES
// ==========================================

app.post('/api/signup', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and email are required." });

    const normalizedEmail = email.toLowerCase().trim();
    let existingUser = await User.findOne({ email: normalizedEmail });
    
    if (existingUser) {
      return res.json({ 
        message: "Welcome back!", 
        userId: existingUser.userId, 
        name: existingUser.name 
      });
    }

    const generatedUserId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newUser = new User({
      userId: generatedUserId,
      name: name.trim(),
      email: normalizedEmail
    });

    await newUser.save();
    res.json({ message: "Account created successfully!", userId: newUser.userId, name: newUser.name });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ error: "Failed to create account." });
  }
});

// ✅ NEW: Initialize Paystack Transaction
app.post('/api/paystack/initialize', async (req, res) => {
  try {
    const { email, amount } = req.body; // Amount in GHS (e.g. 20)

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: email,
        amount: amount * 100, // Convert to pesewas
        currency: "GHS",
        callback_url: "exp://10.22.31.127:8081",
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

// ✅ Webhook for Paystack to notify server of successful payment
app.post('/api/paystack/webhook', async (req, res) => {
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
                     .update(JSON.stringify(req.body))
                     .digest('hex');

  if (hash === req.headers['x-paystack-signature']) {
    const event = req.body;
    if (event.event === 'charge.success') {
      const userEmail = event.data.customer.email;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // 30 days of Pro

      await User.findOneAndUpdate(
        { email: userEmail },
        { isPro: true, subscriptionEnd: expiryDate }
      );
      console.log(`✅ User ${userEmail} upgraded to PRO via MoMo`);
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

    const activeSessionId = sessionId || Date.now().toString();
    const chatTitle = messages[0].content.substring(0, 30) + (messages[0].content.length > 30 ? '...' : '');

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" }); // Note: Ensure your model name is correct

    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    
    const latestMessage = messages[messages.length - 1].content;
    const chatSession = model.startChat({ history });
    const result = await chatSession.sendMessage(latestMessage);
    const aiResponseText = result.response.text();

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

    res.json({ reply: aiResponseText, sessionId: activeSessionId });
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
// STATIC FILE SERVING & MONITORING
// ==========================================
app.get('/', (req, res) => {
  res.send('LifeOS API is running smoothly!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});