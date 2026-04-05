// src/utils/gemini.js
import { Storage } from './storage';

// ⚠️ PASTE YOUR RENDER URL HERE (No trailing slash)
const LIVE_BACKEND_URL = '/api';

// Dynamically fetch the user ID created during Signup
async function getUserId() {
  const id = await Storage.get('lifeos_user_id');
  return id || 'guest_user'; // Fallback just in case
}

export async function sendMessage(messages, sessionId) {
  try {
    const userId = await getUserId();
    const response = await fetch(`${LIVE_BACKEND_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sessionId, messages })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return { reply: data.reply, newSessionId: data.sessionId, chatsLeft: data.chatsLeft };
  } catch (error) { throw error; }
}

export async function getChatSessions() {
  try {
    const userId = await getUserId();
    const response = await fetch(`${LIVE_BACKEND_URL}/chat/sessions/${userId}`);
    return await response.json();
  } catch (error) { return []; }
}

export async function getChatHistory(sessionId) {
  try {
    const response = await fetch(`${LIVE_BACKEND_URL}/chat/history/${sessionId}`);
    return await response.json();
  } catch (error) { return []; }
}

export async function deleteChatSession(sessionId) {
  try {
    await fetch(`${LIVE_BACKEND_URL}/chat/history/${sessionId}`, { method: 'DELETE' });
    return true;
  } catch (error) { return false; }
}