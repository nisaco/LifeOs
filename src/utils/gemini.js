// src/utils/gemini.js
const BACKEND_URL = 'http://localhost:3000/api/chat'; 
const USER_ID = "nii_kpakpo_01"; // We will replace this with real users later!

export async function sendMessage(messages, sessionId) {
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID, sessionId: sessionId, messages: messages })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return { reply: data.reply, newSessionId: data.sessionId };
  } catch (error) { throw error; }
}

export async function getChatSessions() {
  try {
    const response = await fetch(`${BACKEND_URL}/sessions/${USER_ID}`);
    return await response.json();
  } catch (error) { return []; }
}

export async function getChatHistory(sessionId) {
  try {
    const response = await fetch(`${BACKEND_URL}/history/${sessionId}`);
    return await response.json();
  } catch (error) { return []; }
}

export async function deleteChatSession(sessionId) {
  try {
    await fetch(`${BACKEND_URL}/history/${sessionId}`, { method: 'DELETE' });
    return true;
  } catch (error) { return false; }
}