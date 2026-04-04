// src/utils/theme.js
// LifeOS Design System

export const colors = {
  // Base
  bg: '#0D0D1A',
  bgCard: '#151525',
  bgElevated: '#1C1C30',
  border: '#2A2A45',

  // Brand accents
  primary: '#6C63FF',       // violet
  primaryLight: '#8B85FF',
  secondary: '#FF6584',     // coral
  accent: '#43E8D8',        // teal

  // Module colors
  chat: '#6C63FF',          // violet
  tasks: '#43E8D8',         // teal
  budget: '#FFD166',        // gold
  health: '#06D6A0',        // green
  focus: '#FF6584',         // coral

  // Text
  textPrimary: '#F0F0FF',
  textSecondary: '#9090B0',
  textMuted: '#5A5A80',

  // Status
  success: '#06D6A0',
  warning: '#FFD166',
  danger: '#FF6584',
};

export const fonts = {
  // Use system fonts for reliability; customize if loading custom fonts
  display: 'System',
  body: 'System',
  mono: 'Courier New',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

export const shadow = {
  sm: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
};
