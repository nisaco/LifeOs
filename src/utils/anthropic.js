// src/utils/anthropic.js

export async function sendMessage(apiKey, messages) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: `You are LifeOS Assistant — a smart, friendly, and concise AI built into the LifeOS app. 
You help users with anything: questions, advice, planning, ideas, explanations, and more.
You know the app has modules for Tasks, Budget, Health/Habits, and Focus Timer.
Be warm, direct, and genuinely helpful. Keep responses readable on a mobile screen.`,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'API request failed');
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}
