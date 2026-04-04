// src/utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const Storage = {
  async get(key) {
    try {
      const val = await AsyncStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },
  async set(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch { return false; }
  },
  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch { return false; }
  },
};

// Storage keys
export const KEYS = {
  CHAT_HISTORY: 'lifeos_chat_history',
  TASKS: 'lifeos_tasks',
  BUDGET_ENTRIES: 'lifeos_budget',
  BUDGET_LIMIT: 'lifeos_budget_limit',
  HABITS: 'lifeos_habits',
  HABIT_LOGS: 'lifeos_habit_logs',
  FOCUS_SESSIONS: 'lifeos_focus_sessions',
  API_KEY: 'lifeos_api_key',
};
