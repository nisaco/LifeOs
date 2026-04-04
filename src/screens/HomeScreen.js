// src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../utils/theme';
import { Card, Row } from '../components/shared';
import { Storage, KEYS } from '../utils/storage';
import { format, isToday } from 'date-fns';

export default function HomeScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [currency, setCurrency] = useState('₵'); // ✅ Defaults to Cedi
  const [spentToday, setSpentToday] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    loadDashboardData();
    calculateGreeting();
  }, []);

  function calculateGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }

  async function loadDashboardData() {
    // ✅ Fetch the dynamic currency from the Budget settings
    const savedCurrency = await Storage.get('lifeos_budget_currency') || '₵';
    setCurrency(savedCurrency);

    // Get Budget Data for "Spent Today"
    const budgetData = await Storage.get(KEYS.BUDGET_ENTRIES) || [];
    const todayExpenses = budgetData
      .filter(e => e.type === 'expense' && isToday(new Date(e.date)))
      .reduce((sum, e) => sum + e.amount, 0);
    setSpentToday(todayExpenses);

    // Get Tasks Data
    const tasksData = await Storage.get(KEYS.TASKS) || [];
    const openTasks = tasksData.filter(t => !t.completed).length;
    setPendingTasks(openTasks);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const QuickAction = ({ icon, label, color, screen, subText }) => (
    <TouchableOpacity onPress={() => navigation.navigate(screen)} style={styles.actionCard} activeOpacity={0.8}>
      <View style={[styles.actionIconBg, { backgroundColor: color + '15' }]}>
        <Feather name={icon} size={24} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      {subText && <Text style={styles.actionSub}>{subText}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM do')}</Text>
        </View>
        
        {/* ✅ Updated Sign Out Button */}
        <TouchableOpacity 
          style={styles.profileBtn}
          onPress={async () => {
            // Wipe the saved user ID
            await Storage.set('lifeos_user_id', '');
            await Storage.set('lifeos_user_name', '');
            
            // Alert the user
            if (Platform.OS === 'web') {
              window.alert('Signed out successfully! Please refresh the page.');
            } else {
              Alert.alert('Signed Out', 'Please restart the app to sign in again.');
            }
          }}
        >
          <Feather name="log-out" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* At a Glance Cards */}
        <Row style={{ gap: spacing.md, marginBottom: spacing.lg }}>
          <Card style={styles.statCard}>
            <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={styles.statLabel}>Tasks Left</Text>
              <Feather name="check-circle" size={16} color={colors.tasks} />
            </Row>
            <Text style={[styles.statValue, { color: colors.tasks }]}>{pendingTasks}</Text>
          </Card>

          <Card style={styles.statCard}>
            <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={styles.statLabel}>Spent Today</Text>
              <Feather name="trending-down" size={16} color={colors.danger} />
            </Row>
            {/* ✅ Dynamically injects the synced currency */}
            <Text style={[styles.statValue, { color: colors.danger }]}>{currency}{spentToday.toFixed(2)}</Text>
          </Card>
        </Row>

        <Text style={styles.sectionTitle}>Life Modules</Text>
        
        {/* Module Grid */}
        <View style={styles.grid}>
          <QuickAction icon="check-square" label="Tasks" color={colors.tasks} screen="Tasks" subText={`${pendingTasks} pending`} />
          <QuickAction icon="credit-card" label="Budget" color={colors.budget} screen="Budget" subText="Track expenses" />
          <QuickAction icon="clock" label="Focus" color={colors.focus} screen="Focus" subText="Start timer" />
          <QuickAction icon="message-circle" label="AI Assistant" color={colors.chat} screen="Chat" subText="Ask Gemini" />
          
          {/* ✅ New Mini Games Shortcut */}
          <QuickAction icon="crosshair" label="Mini Games" color={colors.secondary} screen="Game" subText="Tic-Tac-Toe" />
          <QuickAction icon="activity" label="Health" color={colors.health} screen="Health" subText="Log data" />
        </View>

        {/* Motivational Banner */}
        <TouchableOpacity activeOpacity={0.9}>
          <Card style={styles.bannerCard}>
            <Row>
              <View style={styles.bannerIcon}>
                <Feather name="cpu" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Plan your week with AI</Text>
                <Text style={styles.bannerSub}>Tap here to ask the assistant to schedule your tasks.</Text>
              </View>
              <Feather name="arrow-right" size={20} color={colors.primary} />
            </Row>
          </Card>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.xxl, paddingBottom: spacing.lg },
  greeting: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 },
  date: { fontSize: 14, color: colors.textSecondary, marginTop: 4, fontWeight: '500' },
  profileBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  
  statCard: { flex: 1, padding: spacing.md, backgroundColor: colors.bgCard },
  statLabel: { fontSize: 13, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.md, paddingHorizontal: spacing.xs },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
  actionCard: { width: '47%', backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow.sm },
  actionIconBg: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  actionLabel: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  actionSub: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  bannerCard: { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30', borderWidth: 1 },
  bannerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  bannerTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  bannerSub: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
});