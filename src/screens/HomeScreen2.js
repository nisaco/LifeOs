// src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
// Added 'shadow' to the import list
import { colors, spacing, radius, shadow } from '../utils/theme';
import { Storage, KEYS } from '../utils/storage';
import { Card, Row, Spacer } from '../components/shared';
import { format } from 'date-fns';

const modules = [
  { key: 'Chat',   icon: '🤖', label: 'AI Chat',      color: colors.chat,   nav: 'Chat' },
  { key: 'Tasks',  icon: '✅', label: 'Tasks',         color: colors.tasks,  nav: 'Tasks' },
  { key: 'Budget', icon: '💰', label: 'Budget',        color: colors.budget, nav: 'Budget' },
  { key: 'Health', icon: '🏋️', label: 'Health',        color: colors.health, nav: 'Health' },
  { key: 'Focus',  icon: '⏱️', label: 'Focus',         color: colors.focus,  nav: 'Focus' },
];

export default function HomeScreen({ navigation }) {
  const [greeting, setGreeting] = useState('');
  const [stats, setStats] = useState({ tasks: 0, habits: 0, budget: 0 });

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
    loadStats();
  }, []);

  async function loadStats() {
    const tasks = await Storage.get(KEYS.TASKS) || [];
    const habits = await Storage.get(KEYS.HABITS) || [];
    const entries = await Storage.get(KEYS.BUDGET_ENTRIES) || [];
    const todaySpend = entries
      .filter(e => e.type === 'expense' && format(new Date(e.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))
      .reduce((s, e) => s + e.amount, 0);
    setStats({
      tasks: tasks.filter(t => !t.done).length,
      habits: habits.length,
      budget: todaySpend,
    });
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          </View>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>L</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <Row style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
          <StatPill icon="✅" label={`${stats.tasks} tasks`} color={colors.tasks} />
          <StatPill icon="🔥" label={`${stats.habits} habits`} color={colors.health} />
          <StatPill icon="💸" label={`$${stats.budget.toFixed(0)} today`} color={colors.budget} />
        </Row>

        {/* Module Grid */}
        <Text style={styles.sectionLabel}>Your modules</Text>
        <View style={styles.grid}>
          {modules.map(m => (
            <TouchableOpacity
              key={m.key}
              onPress={() => navigation.navigate(m.nav)}
              style={[styles.moduleCard, { borderColor: m.color + '30' }]}
              activeOpacity={0.7}
            >
              <View style={[styles.moduleIcon, { backgroundColor: m.color + '15' }]}>
                <Text style={styles.moduleEmoji}>{m.icon}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.moduleLabel}>{m.label}</Text>
                <View style={[styles.moduleDot, { backgroundColor: m.color }]} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tip Card */}
        <Card style={{ borderColor: colors.primary + '30', marginTop: spacing.lg, backgroundColor: colors.primary + '0A' }}>
          <Row>
            <View style={styles.tipIconBox}>
              <Text style={{ fontSize: 22 }}>💡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Tip of the day</Text>
              <Text style={styles.tipText}>
                Use the Focus timer with the Pomodoro technique — 25 min work, 5 min break — to maximise deep work sessions.
              </Text>
            </View>
          </Row>
        </Card>

        <Spacer size={spacing.xl} />
      </ScrollView>
    </View>
  );
}

function StatPill({ icon, label, color }) {
  return (
    <View style={[styles.statPill, { borderColor: color + '30', backgroundColor: color + '10' }]}>
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingTop: spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: { fontSize: 30, fontWeight: '900', color: colors.textPrimary, letterSpacing: -1 },
  date: { fontSize: 15, color: colors.textSecondary, marginTop: 4, fontWeight: '500' },
  logoMark: {
    width: 48, height: 48, borderRadius: 24, // Perfect circle
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.sm,
  },
  logoText: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  statPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.xl, borderWidth: 1,
    paddingVertical: 10, paddingHorizontal: 12, gap: 6,
  },
  statLabel: { fontSize: 13, fontWeight: '700' },
  sectionLabel: {
    fontSize: 14, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md,
  },
  moduleCard: {
    width: '47.5%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl, // Softer curves
    borderWidth: 1.5, // Slightly thicker border for definition
    padding: spacing.lg,
    minHeight: 120,
    justifyContent: 'space-between',
    ...shadow.sm, // Makes the cards float
  },
  moduleIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  moduleEmoji: { fontSize: 24 },
  moduleLabel: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  moduleDot: { width: 8, height: 8, borderRadius: 4 },
  tipIconBox: {
    width: 40, height: 40, borderRadius: 20, 
    backgroundColor: colors.primary + '20', 
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md
  },
  tipTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  tipText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
});