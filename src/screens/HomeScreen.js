import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Platform, ActivityIndicator, StatusBar, Dimensions } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import { format, isToday } from 'date-fns';

import { colors, spacing, radius, shadow } from '../utils/theme';
import { Storage, KEYS } from '../utils/storage';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [currency, setCurrency] = useState('₵'); 
  const [spentToday, setSpentToday] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [taskProgress, setTaskProgress] = useState(0);
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('User'); 
  const [isPro, setIsPro] = useState(false); 
  const [payLoading, setPayLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Activity Mock Data (Matching the React sample)
  const activityData = [40, 70, 45, 90, 65, 85, 60];
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => setIsOffline(!state.isConnected));
    calculateGreeting();
    syncUserStatus();
    return () => unsubscribe();
  }, []);

  useFocusEffect(useCallback(() => { loadDashboardData(); }, []));

  function calculateGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }

  async function syncUserStatus() {
    try {
      const userId = await Storage.get('lifeos_user_id');
      if (!userId) return;
      const response = await fetch(`https://lifeos-api-js9i.onrender.com/api/user/${userId}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data) {
        setIsPro(data.isPro);
        setUserName(data.name);
        await Storage.set('lifeos_is_pro', data.isPro);
        await Storage.set('lifeos_user_name', data.name);
      }
    } catch (err) { console.log("Sync failed"); }
  }

  async function loadDashboardData() {
    const name = await Storage.get('lifeos_user_name') || 'User';
    const savedCurrency = await Storage.get('lifeos_budget_currency') || '₵';
    setUserName(name);
    setCurrency(savedCurrency);
    setIsPro(await Storage.get('lifeos_is_pro') || false);

    const budgetData = await Storage.get(KEYS.BUDGET_ENTRIES) || [];
    setSpentToday(budgetData.filter(e => e.type === 'expense' && isToday(new Date(e.date))).reduce((sum, e) => sum + e.amount, 0));

    const tasksData = await Storage.get(KEYS.TASKS) || [];
    const open = tasksData.filter(t => !t.completed).length;
    setPendingTasks(open);
    setTaskProgress(tasksData.length === 0 ? 0 : ((tasksData.length - open) / tasksData.length) * 100);
  }

  const handleUpgrade = async () => {
    if (isOffline) return Alert.alert("Offline", "Internet connection required.");
    const email = await Storage.get('lifeos_user_email');
    if (!email) return Alert.alert("Error", "Please sign in again.");
    setPayLoading(true);
    try {
      const res = await fetch('https://lifeos-api-js9i.onrender.com/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, amount: 25 }) 
      });
      const data = await res.json();
      if (data.authorization_url) {
        await WebBrowser.openBrowserAsync(data.authorization_url);
        Alert.alert("Checking...", "Pull to refresh after payment.");
      }
    } catch (err) { Alert.alert("Error", "Server warming up. Try again."); }
    finally { setPayLoading(false); }
  };

  return (
    <LinearGradient colors={['#0F172A', '#000000']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline Mode • Local Data Only</Text>
        </View>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadDashboardData} tintColor={colors.primary} />}
      >
        
        {/* PREMIUM HEADER SECTION */}
        <View style={styles.premiumHeader}>
            <LinearGradient colors={['rgba(255,255,255,0.05)', 'transparent']} style={styles.headerGlass}>
                <View style={styles.headerTopRow}>
                    <View style={styles.badge}>
                        <Feather name="zap" size={12} color={colors.primary} />
                        <Text style={styles.badgeText}>OVERVIEW</Text>
                    </View>
                    <Text style={styles.dateText}>{format(new Date(), 'MMM dd')}</Text>
                </View>
                
                <View style={styles.headerMain}>
                    <View>
                        <Text style={styles.greetingText}>{greeting},</Text>
                        <Text style={styles.nameText}>{userName}</Text>
                        <Text style={styles.taskSummaryText}>
                            {pendingTasks > 0 ? `You have ${pendingTasks} tasks left.` : "All caught up for today!"}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.avatarCircle} onPress={() => navigation.navigate('Profile')}>
                        <Text style={styles.avatarInitial}>{userName.charAt(0).toUpperCase()}</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </View>

        {/* BENTO GRID START */}
        <View style={styles.bentoContainer}>
            
            {/* Activity Card (Large) */}
            <View style={styles.activityCard}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.cardLabel}>ACTIVITY FLOW</Text>
                        <View style={styles.scoreRow}>
                            <Text style={styles.scoreValue}>85</Text>
                            <Text style={styles.scoreTrend}>+12%</Text>
                        </View>
                    </View>
                    <View style={styles.statusPill}><Text style={styles.statusPillText}>Excellent</Text></View>
                </View>
                
                <View style={styles.chartRow}>
                    {activityData.map((val, i) => (
                        <View key={i} style={styles.barContainer}>
                            <View style={styles.barBg}>
                                <View style={[styles.barFill, { height: `${val}%` }, i === 6 && styles.barFillActive]} />
                            </View>
                            <Text style={styles.barDay}>{days[i]}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Middle Row: Two Mini Cards */}
            <View style={styles.miniCardRow}>
                <TouchableOpacity style={styles.miniCard} onPress={() => navigation.navigate('Tasks')}>
                    <View style={[styles.miniIconBg, { backgroundColor: colors.tasks + '20' }]}>
                        <Feather name="target" size={18} color={colors.tasks} />
                    </View>
                    <Text style={styles.miniValue}>{pendingTasks}</Text>
                    <Text style={styles.miniLabel}>Tasks Left</Text>
                    <View style={styles.miniProgressContainer}>
                        <View style={[styles.miniProgressBar, { width: `${taskProgress}%`, backgroundColor: colors.tasks }]} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.miniCard} onPress={() => navigation.navigate('Budget')}>
                    <View style={[styles.miniIconBg, { backgroundColor: colors.budget + '20' }]}>
                        <Feather name="trending-down" size={18} color={colors.budget} />
                    </View>
                    <Text style={styles.miniValue}>{currency}{spentToday.toFixed(0)}</Text>
                    <Text style={styles.miniLabel}>Spent Today</Text>
                </TouchableOpacity>
            </View>

            {/* Pro Upgrade Card */}
            {!isPro && (
                <TouchableOpacity style={styles.proBanner} onPress={handleUpgrade}>
                    <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.proGradient} start={{x:0, y:0}} end={{x:1, y:0}}>
                        <View style={styles.proIconBox}>
                            {payLoading ? <ActivityIndicator color="#FFD700" /> : <Feather name="star" size={24} color="#FFD700" />}
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.proTitleText}>Upgrade to Pro</Text>
                            <Text style={styles.proSubText}>Unlimited AI & Cloud Sync</Text>
                        </View>
                        <View style={styles.proBadge}><Text style={styles.proBadgeText}>GH₵25</Text></View>
                    </LinearGradient>
                </TouchableOpacity>
            )}

            {/* Data Hub Quick Action */}
            <TouchableOpacity style={styles.dataCard} onPress={() => navigation.navigate('DataScreen')}>
                <View style={styles.dataIconBg}><Feather name="wifi" size={22} color="#009879" /></View>
                <View style={{flex: 1}}>
                    <Text style={styles.dataTitle}>Need Data?</Text>
                    <Text style={styles.dataSub}>Instant MTN, Telecel & AT</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#666" />
            </TouchableOpacity>

            {/* Life Modules Section */}
            <Text style={styles.sectionHeader}>Life Modules</Text>
            <View style={styles.moduleGrid}>
                <ModuleItem icon="message-circle" label="AI Assistant" color={colors.chat} onPress={() => navigation.navigate('Chat')} />
                <ModuleItem icon="check-square" label="Tasks" color={colors.tasks} onPress={() => navigation.navigate('Tasks')} />
                <ModuleItem icon="credit-card" label="Budget" color={colors.budget} onPress={() => navigation.navigate('Budget')} />
                <ModuleItem icon="clock" label="Focus" color={colors.focus} onPress={() => navigation.navigate('Focus')} />
                <ModuleItem icon="crosshair" label="Games" color={colors.secondary} onPress={() => navigation.navigate('Game')} />
                <ModuleItem icon="activity" label="Health" color={colors.health} onPress={() => navigation.navigate('Health')} />
            </View>

        </View>
      </ScrollView>
    </LinearGradient>
  );
}

// Module Component
const ModuleItem = ({ icon, label, color, onPress }) => (
    <TouchableOpacity style={styles.moduleCard} onPress={onPress}>
        <View style={[styles.moduleIconBg, { backgroundColor: color + '15' }]}>
            <Feather name={icon} size={22} color={color} />
        </View>
        <Text style={styles.moduleLabel}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  offlineBanner: { backgroundColor: '#EF4444', paddingVertical: 10, alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  offlineText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  
  premiumHeader: { paddingHorizontal: 15, paddingTop: Platform.OS === 'ios' ? 60 : 40, marginBottom: 20 },
  headerGlass: { padding: 25, borderRadius: 35, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  badgeText: { color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  dateText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  headerMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  greetingText: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },
  nameText: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  taskSummaryText: { color: colors.primary, fontSize: 14, fontWeight: '700', marginTop: 5 },
  avatarCircle: { width: 55, height: 55, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  avatarInitial: { color: '#FFF', fontSize: 22, fontWeight: '900' },

  bentoContainer: { paddingHorizontal: 15, gap: 15 },
  activityCard: { backgroundColor: '#1E293B', padding: 20, borderRadius: 30, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  cardLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 5 },
  scoreValue: { color: '#FFF', fontSize: 28, fontWeight: '900' },
  scoreTrend: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  statusPill: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { color: '#10B981', fontSize: 10, fontWeight: '900' },
  
  chartRow: { flexDirection: 'row', justifyContent: 'space-between', height: 80, alignItems: 'flex-end' },
  barContainer: { alignItems: 'center', flex: 1 },
  barBg: { width: 12, height: '100%', backgroundColor: '#0F172A', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: '#334155', borderRadius: 6 },
  barFillActive: { backgroundColor: colors.primary },
  barDay: { color: '#64748B', fontSize: 9, fontWeight: '800', marginTop: 8 },

  miniCardRow: { flexDirection: 'row', gap: 15 },
  miniCard: { flex: 1, backgroundColor: '#1E293B', padding: 20, borderRadius: 30, borderWidth: 1, borderColor: '#334155' },
  miniIconBg: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  miniValue: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  miniLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '700', marginTop: 2 },
  miniProgressContainer: { height: 4, backgroundColor: '#0F172A', borderRadius: 2, marginTop: 10 },
  miniProgressBar: { height: '100%', borderRadius: 2 },

  proBanner: { borderRadius: 25, overflow: 'hidden' },
  proGradient: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 15 },
  proIconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255, 215, 0, 0.1)', alignItems: 'center', justifyContent: 'center' },
  proTitleText: { color: '#FFD700', fontSize: 16, fontWeight: '900' },
  proSubText: { color: '#94A3B8', fontSize: 12 },
  proBadge: { backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  proBadgeText: { color: '#000', fontSize: 10, fontWeight: '900' },

  dataCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', padding: 15, borderRadius: 25, borderWidth: 1, borderColor: '#334155' },
  dataIconBg: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(0, 152, 121, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  dataTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  dataSub: { color: '#94A3B8', fontSize: 12 },

  sectionHeader: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 10, paddingLeft: 5 },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moduleCard: { width: (width - 40) / 3, backgroundColor: '#1E293B', padding: 15, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  moduleIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  moduleLabel: { color: '#FFF', fontSize: 11, fontWeight: '700' }
});