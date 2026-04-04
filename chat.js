const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

// Initialize the SDK with your secure key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    // 1. Initialize the Gemini 1.5 Flash model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. Format the messages for the SDK
    // Gemini expects the history array, and then the final message separately
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    
    const latestMessage = messages[messages.length - 1].content;

    // 3. Start the chat with history, then send the new message
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(latestMessage);
    const replyText = result.response.text();

    // 4. Send the text back to the mobile app
    res.json({ reply: replyText });

  } catch (error) {
    console.error("Backend AI Error:", error);
    res.status(500).json({ error: "Failed to generate AI response." });
  }
});

module.exports = router;