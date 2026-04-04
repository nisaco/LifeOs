// src/screens/WelcomeScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, shadow } from '../utils/theme';

const { height, width } = Dimensions.get('window');

// We use your theme colors so the bubbles match the brand perfectly
const BUBBLE_COLORS = [colors.primary, colors.secondary, colors.focus, colors.health, colors.budget];

// 🎈 The Bubble Component
function FloatingBubble({ size, left, duration, delay, color }) {
  const translateY = useRef(new Animated.Value(height + 100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      // Fade the bubble in softly
      Animated.timing(opacity, {
        toValue: 0.15, // Highly transparent so it looks professional, not like a kid's game
        duration: 1000,
        delay: delay,
        useNativeDriver: true,
      }),
      // Float it upward
      Animated.timing(translateY, {
        toValue: -200,
        duration: duration,
        delay: delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

export default function WelcomeScreen({ onComplete }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Generate random data for 15 background bubbles
  const bubbles = useRef(
    Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      size: Math.random() * 60 + 20, // Between 20px and 80px
      left: Math.random() * width, // Random horizontal position
      duration: Math.random() * 3000 + 4000, // Float duration between 4s and 7s
      delay: Math.random() * 1500, // Stagger their start times
      color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
    }))
  ).current;

  useEffect(() => {
    // 1. Fade in the logo
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 1000, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true })
    ]).start(() => {
      // 2. Hold for a moment, then fade the whole screen out to launch the app!
      setTimeout(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 600, useNativeDriver: true })
          .start(() => onComplete());
      }, 2500); 
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Render the background bubbles */}
      {bubbles.map(b => (
        <FloatingBubble key={b.id} {...b} />
      ))}

      {/* Foreground Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoBg}>
          <Feather name="hexagon" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>LifeOS</Text>
        <Text style={styles.subtitle}>Organize your world.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  content: { alignItems: 'center', zIndex: 10 },
  logoBg: { width: 100, height: 100, borderRadius: 32, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow.lg },
  title: { fontSize: 36, fontWeight: '900', color: colors.textPrimary, letterSpacing: -1, marginBottom: spacing.xs },
  subtitle: { fontSize: 16, color: colors.textSecondary, fontWeight: '600', letterSpacing: 1 },
});