import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { Feather, FontAwesome } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius } from '../utils/theme'; 
import { Storage } from '../utils/storage';

// ==========================================
// AJENTERPRISE RETAIL PRICING DATABASE
// ==========================================
const PRICING = {
    "MTN": [
            { id: '1GB', name: '1GB', price: 4.70 }, { id: '2GB', name: '2GB', price: 9.60 }, { id: '3GB', name: '3GB', price: 14.50 }, 
            { id: '4GB', name: '4GB', price: 19.60 }, { id: '5GB', name: '5GB', price: 24.00 }, { id: '6GB', name: '6GB', price: 28.00 }, 
            { id: '8GB', name: '8GB', price: 36.00 }, { id: '10GB', name: '10GB', price: 43.00 }, { id: '15GB', name: '15GB', price: 63.50 },
            { id: '20GB', name: '20GB', price: 85.00 }, { id: '25GB', name: '25GB', price: 105.00 }, { id: '30GB', name: '30GB', price: 124.00 },
            { id: '40GB', name: '40GB', price: 164.00 }, { id: '50GB', name: '50GB', price: 205.00 }
        ],
        "AirtelTigo": [
            { id: '1GB', name: '1GB', price: 4.40 }, { id: '2GB', name: '2GB', price: 8.80 }, { id: '3GB', name: '3GB', price: 13.20 },  
            { id: '4GB', name: '4GB', price: 18.00 }, { id: '5GB', name: '5GB', price: 23.00 }, { id: '6GB', name: '6GB', price: 27.00 },  
            { id: '7GB', name: '7GB', price: 31.00 }, { id: '8GB', name: '8GB', price: 36.00 }, { id: '9GB', name: '9GB', price: 39.50 },  
            { id: '10GB', name: '10GB', price: 42.00 }, { id: '12GB', name: '12GB', price: 50.00 }, { id: '15GB', name: '15GB', price: 62.00 },
            { id: '20GB', name: '20GB', price: 84.00 }
        ],
        "Telecel": [
            { id: '5GB', name: '5GB', price: 25.00 }, { id: '10GB', name: '10GB', price: 43.00 }, { id: '15GB', name: '15GB', price: 63.00 }, 
            { id: '20GB', name: '20GB', price: 83.20 }, { id: '25GB', name: '25GB', price: 102.00 }, { id: '30GB', name: '30GB', price: 120.00 },
            { id: '40GB', name: '40GB', price: 160.00 }, { id: '50GB', name: '50GB', price: 195.00 }, { id: '100GB', name: '100GB', price: 400.00}
        ],
         "AT-Big Time": [
            { id: '30GB', name: '30GB', price: 85.00 }, { id: '40GB', name: '40GB', price: 103.00 }, { id: '50GB', name: '50GB', price: 120.00 }, 
            { id: '60GB', name: '60GB', price: 160.00 }, { id: '80GB', name: '80GB', price: 200.00 },
            { id: '100GB', name: '100GB', price: 240.00 }, { id: '200GB', name: '200GB', price: 400.00}
        ]
};

const NETWORKS = Object.keys(PRICING);

function detectNetwork(phone) {
    const p = phone.toString();
    if (['024', '054', '055', '059', '025', '053'].some(pre => p.startsWith(pre))) return 'MTN';
    if (['020', '050'].some(pre => p.startsWith(pre))) return 'Telecel';
    if (['027', '057', '026', '056'].some(pre => p.startsWith(pre))) return 'AirtelTigo';
    return null;
}

export default function DataScreen({ navigation }) {
  // Navigation & Data States
  const [activeTab, setActiveTab] = useState('buy'); // 'buy', 'history', or 'support'
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Purchasing States
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState('MTN');
  const [selectedBundleId, setSelectedBundleId] = useState('');
  const [loading, setLoading] = useState(false);

  const currentPlans = PRICING[network] || [];
  const selectedPlan = currentPlans.find(p => p.id === selectedBundleId);

  // Fee Calculation Logic 
  const feeRate = 0.02; 
  const basePrice = selectedPlan?.price || 0;
  const feeAmount = basePrice > 0 ? (basePrice * feeRate) : 0;
  const totalCharge = basePrice + feeAmount;

  // Load History whenever the tab changes
  useEffect(() => {
      if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  const fetchHistory = async () => {
      setHistoryLoading(true);
      const userId = await Storage.get('lifeos_user_id');
      if (userId) {
          try {
              const res = await fetch(`https://lifeos-api-js9i.onrender.com/api/user/${userId}`);
              const data = await res.json();
              if (data.dataOrders) {
                  const sorted = data.dataOrders.sort((a,b) => new Date(b.date) - new Date(a.date));
                  setHistoryData(sorted);
              }
          } catch (e) {
              console.log("Failed to fetch history", e);
          }
      }
      setHistoryLoading(false);
  };

  const handlePhoneChange = (val) => {
      const cleanVal = val.replace(/[^0-9]/g, ''); 
      setPhone(cleanVal);
      if (cleanVal.length === 3) {
          const detected = detectNetwork(cleanVal);
          if (detected && detected !== network) {
              setNetwork(detected);
              setSelectedBundleId(''); 
          }
      }
  };

  const handlePurchase = async () => {
    if (phone.length !== 10) return Alert.alert("Invalid Number", "Please enter a valid 10-digit phone number.");
    if (!selectedPlan) return Alert.alert("No Bundle", "Please select a data bundle first.");

    const userEmail = await Storage.get('lifeos_user_email');
    if (!userEmail) return Alert.alert("Auth Error", "You must be logged in to purchase data.");

    setLoading(true);
    try {
      const response = await fetch('https://lifeos-api-js9i.onrender.com/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userEmail, 
          amount: totalCharge, 
          metadata: {
            service: "DATA_TOPUP",
            phone: phone,
            network: network,
            bundleId: selectedPlan.id
          }
        }) 
      });

      const data = await response.json();

      if (data.authorization_url) {
        await WebBrowser.openBrowserAsync(data.authorization_url);
        Alert.alert(
            "Transaction Initiated", 
            "If your payment was successful, your data will arrive soon! Check History for updates."
        );
        setPhone('');
        setSelectedBundleId('');
        setActiveTab('history');
      } else {
        throw new Error("Failed to generate payment link.");
      }
    } catch (err) {
      Alert.alert("Connection Error", "Could not reach the payment server.");
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = (msg = "") => {
    const url = `whatsapp://send?phone=233549800115&text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
        Alert.alert("WhatsApp Not Found", "Please install WhatsApp to contact support directly.");
    });
  };

  const joinCommunity = () => {
    const url = "https://chat.whatsapp.com/GueSND93GqF9vI1L0p0q0"; // Replace with your actual group ID
    Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Could not open the community link.");
    });
  };

  const getNetworkColor = (netName) => {
      if (netName === 'MTN') return '#FFCC00';
      if (netName === 'Telecel') return '#E31837';
      if (netName === 'AirtelTigo' || netName === 'AT-Big Time') return '#0033A0';
      return colors.primary;
  };

  return (
    <LinearGradient colors={['#0F172A', '#000000']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xl, paddingBottom: 100 }}>
          
          {/* Header */}
          <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                  <Feather name="arrow-left" size={24} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.iconBox}><Feather name="wifi" size={28} color="#009879" /></View>
              <Text style={styles.title}>Data Hub</Text>
              <Text style={styles.subtitle}>Powered by AJEnterprise</Text>
          </View>

          {/* TAB TOGGLE: Buy vs History vs Support */}
          <View style={styles.tabContainer}>
              <TouchableOpacity onPress={() => setActiveTab('buy')} style={[styles.tabBtn, activeTab === 'buy' && styles.tabBtnActive]}>
                  <Text style={[styles.tabText, activeTab === 'buy' && styles.tabTextActive]}>Buy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('history')} style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}>
                  <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('support')} style={[styles.tabBtn, activeTab === 'support' && styles.tabBtnActive]}>
                  <Text style={[styles.tabText, activeTab === 'support' && styles.tabTextActive]}>Support</Text>
              </TouchableOpacity>
          </View>

          {/* VIEW 1: BUY DATA */}
          {activeTab === 'buy' && (
            <View style={styles.card}>
              <Text style={styles.label}>Select Network</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.networkRow}>
                {NETWORKS.map(net => {
                  const isActive = network === net;
                  const netColor = getNetworkColor(net);
                  return (
                    <TouchableOpacity 
                      key={net} 
                      onPress={() => { setNetwork(net); setSelectedBundleId(''); }} 
                      style={[styles.netBtn, isActive && { borderColor: netColor, backgroundColor: netColor + '15' }]}
                    >
                      <Text style={[styles.netText, isActive && { color: netColor }]}>{net}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.label}>Phone Number</Text>
              <View style={[styles.inputBox, phone.length === 10 && { borderColor: colors.primary }]}>
                <Feather name="smartphone" size={20} color={colors.textMuted} style={{ marginRight: 10 }} />
                <TextInput 
                  style={styles.input} 
                  value={phone} 
                  onChangeText={handlePhoneChange} 
                  keyboardType="numeric" 
                  maxLength={10} 
                  placeholder="e.g. 054 XXX XXXX" 
                  placeholderTextColor={colors.textMuted} 
                />
                {phone.length === 10 && <Feather name="check-circle" size={20} color={colors.primary} />}
              </View>

              <Text style={styles.label}>Select Bundle</Text>
              <View style={styles.bundleGrid}>
                {currentPlans.map(bundle => (
                  <TouchableOpacity 
                    key={bundle.id} 
                    onPress={() => setSelectedBundleId(bundle.id)} 
                    style={[styles.bundleBtn, selectedBundleId === bundle.id && styles.bundleBtnActive]}
                  >
                    <Text style={[styles.bundleSize, selectedBundleId === bundle.id && { color: colors.primary }]}>{bundle.name}</Text>
                    <Text style={styles.bundlePrice}>GHS {bundle.price.toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedPlan && (
                  <View style={styles.receiptBox}>
                      <View style={styles.receiptRow}>
                          <Text style={styles.receiptText}>Total Charge:</Text>
                          <Text style={[styles.receiptValue, { fontSize: 18, color: colors.primary }]}>GHS {totalCharge.toFixed(2)}</Text>
                      </View>
                  </View>
              )}

              <TouchableOpacity 
                style={[styles.payBtn, (!selectedPlan || phone.length < 10) && { opacity: 0.5 }, { marginTop: 20 }]} 
                onPress={handlePurchase} 
                disabled={loading || !selectedPlan || phone.length < 10}
              >
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.payBtnText}>Pay GHS {totalCharge.toFixed(2)}</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* VIEW 2: HISTORY */}
          {activeTab === 'history' && (
              <View style={styles.historyContainer}>
                  {historyLoading ? (
                      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                  ) : historyData.length === 0 ? (
                      <View style={styles.emptyState}>
                          <Feather name="clock" size={48} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 15 }} />
                          <Text style={styles.emptyText}>No data purchases yet.</Text>
                      </View>
                  ) : (
                      historyData.map((order, idx) => (
                          <View key={idx} style={styles.historyCard}>
                              <View style={styles.historyRow}>
                                  <Text style={styles.historyTitle}>{order.network} {order.bundleId}</Text>
                                  <Text style={styles.historyPrice}>GHS {order.amount.toFixed(2)}</Text>
                              </View>
                              <View style={styles.historyRow}>
                                  <Text style={styles.historySub}>To: {order.phone}</Text>
                                  <Text style={styles.historySub}>{new Date(order.date).toLocaleDateString()}</Text>
                              </View>
                              <View style={styles.statusRow}>
                                  <Text style={styles.refText}>Ref: {order.reference}</Text>
                                  <View style={[styles.statusBadge, {backgroundColor: order.status === 'Completed' ? '#059669' : '#D97706'}]}>
                                      <Text style={styles.statusText}>{order.status}</Text>
                                  </View>
                              </View>
                              {order.network === 'MTN' && (
                                  <View style={styles.peakNotice}>
                                      <Feather name="info" size={12} color="#F59E0B" />
                                      <Text style={styles.peakText}>MTN delivery: Instant - 4hrs during peak.</Text>
                                  </View>
                              )}
                          </View>
                      ))
                  )}
              </View>
          )}

          {/* VIEW 3: SUPPORT & COMMUNITY */}
          {activeTab === 'support' && (
            <View style={styles.supportContainer}>
                <View style={styles.card}>
                    <Text style={styles.supportTitle}>Delivery Information</Text>
                    <View style={styles.faqBox}>
                        <Text style={styles.faqQ}>When will my data arrive?</Text>
                        <Text style={styles.faqA}>
                           • <Text style={{color: '#4ADE80', fontWeight: 'bold'}}>Instant:</Text> Telecel & AirtelTigo.{"\n"}
                           • <Text style={{color: '#FFCC00', fontWeight: 'bold'}}>Variable:</Text> MTN orders are mostly instant but can take <Text style={{color: '#FFF'}}>5 mins to 4 hours</Text> depending on network traffic.
                        </Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.whatsappBtn} onPress={() => openWhatsApp("Hello Admin, I have a question about my data delivery.")}>
                    <FontAwesome name="whatsapp" size={24} color="#FFF" />
                    <Text style={styles.btnText}>Contact Admin via WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.communityBtn} onPress={joinCommunity}>
                    <Feather name="users" size={24} color="#FFF" />
                    <Text style={styles.btnText}>Join WhatsApp Community</Text>
                </TouchableOpacity>
                
                <Text style={styles.communityNote}>Join the community to stay updated on network status and instant promos!</Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', marginBottom: spacing.md, position: 'relative' },
  backBtn: { position: 'absolute', left: 0, top: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 },
  iconBox: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#00987920', alignItems: 'center', justifyContent: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#00987940' },
  title: { fontSize: 26, fontWeight: '900', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 4 },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.lg, padding: 4, marginBottom: spacing.lg },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: radius.md },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: '800', fontSize: 14 },
  tabTextActive: { color: '#FFF' },
  card: { backgroundColor: colors.cardBg, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 12, marginTop: 15, letterSpacing: 0.5 },
  networkRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  netBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
  netText: { fontSize: 13, fontWeight: '800', color: colors.textSecondary },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 15, height: 55, backgroundColor: 'rgba(255,255,255,0.02)' },
  input: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  bundleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bundleBtn: { width: '48%', paddingVertical: 15, paddingHorizontal: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
  bundleBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  bundleSize: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
  bundlePrice: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontWeight: '700' },
  receiptBox: { marginTop: 25, backgroundColor: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  receiptValue: { fontSize: 14, color: colors.textPrimary, fontWeight: '800' },
  payBtn: { backgroundColor: colors.primary, height: 60, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  payBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  historyContainer: { marginTop: 10 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  historyCard: { backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  historyTitle: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  historyPrice: { color: colors.primary, fontWeight: '900', fontSize: 16 },
  historySub: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  refText: { color: colors.textMuted, fontSize: 10, opacity: 0.7 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: '#FFF', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  peakNotice: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 8, borderRadius: 8, gap: 6 },
  peakText: { color: '#F59E0B', fontSize: 10, fontWeight: '700', flex: 1 },
  supportContainer: { gap: 15 },
  supportTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginBottom: 10 },
  faqBox: { gap: 10 },
  faqQ: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  faqA: { color: colors.textMuted, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  whatsappBtn: { backgroundColor: '#25D366', height: 60, borderRadius: radius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  communityBtn: { backgroundColor: colors.primary, height: 60, borderRadius: radius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  communityNote: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 5, paddingHorizontal: 20, fontWeight: '600' }
});