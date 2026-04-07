import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { colors, spacing, radius } from '../utils/theme'; // Adjust path if needed
import { Storage } from '../utils/storage';

const NETWORKS = ['MTN', 'Telecel', 'AT-Big Time'];
const BUNDLES = [
  { id: '1GB', size: '1GB', price: 6 },
  { id: '3GB', size: '3GB', price: 17 },
  { id: '5GB', size: '5GB', price: 30 },
  { id: '10GB', size: '10GB', price: 49 },
];

export default function DataScreen() {
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState('MTN');
  const [selectedBundle, setSelectedBundle] = useState(BUNDLES[0]);
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    if (phone.length !== 10) return Alert.alert("Error", "Please enter a valid 10-digit number.");
    
    const userEmail = await Storage.get('user_email'); // Get user email from your app's storage
    if (!userEmail) return Alert.alert("Error", "You must be logged in.");

    setLoading(true);
    try {
      // Call your LifeOS initialization route
      const response = await fetch('https://YOUR_LIFEOS_RENDER_URL/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userEmail, 
          amount: selectedBundle.price, 
          metadata: {
            service: "DATA_TOPUP",
            phone: phone,
            network: network,
            bundleId: selectedBundle.id
          }
        }) 
      });

      const data = await response.json();
      if (data.authorization_url) {
        await WebBrowser.openBrowserAsync(data.authorization_url);
        Alert.alert("Processing", "If payment was successful, your data will arrive in seconds!");
      }
    } catch (err) {
      Alert.alert("Error", "Could not connect to payment server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xl }}>
        
        <View style={styles.header}>
            <View style={styles.iconBox}><Feather name="wifi" size={24} color={colors.primary} /></View>
            <Text style={styles.title}>Buy Data</Text>
            <Text style={styles.subtitle}>Powered by AJEnterprise</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Select Network</Text>
          <View style={styles.networkRow}>
            {NETWORKS.map(net => (
              <TouchableOpacity key={net} onPress={() => setNetwork(net)} style={[styles.netBtn, network === net && styles.netBtnActive]}>
                <Text style={[styles.netText, network === net && { color: '#FFF' }]}>{net === 'AT-Big Time' ? 'AT' : net}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputBox}>
            <Feather name="smartphone" size={20} color={colors.textMuted} style={{ marginRight: 10 }} />
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="numeric" maxLength={10} placeholder="054 XXX XXXX" placeholderTextColor={colors.textMuted} />
          </View>

          <Text style={styles.label}>Select Bundle</Text>
          <View style={styles.bundleGrid}>
            {BUNDLES.map(bundle => (
              <TouchableOpacity key={bundle.id} onPress={() => setSelectedBundle(bundle)} style={[styles.bundleBtn, selectedBundle.id === bundle.id && styles.bundleBtnActive]}>
                <Text style={[styles.bundleSize, selectedBundle.id === bundle.id && { color: colors.primary }]}>{bundle.size}</Text>
                <Text style={styles.bundlePrice}>GHS {bundle.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.payBtn} onPress={handlePurchase} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.payBtnText}>Pay GHS {selectedBundle.price}</Text>}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  iconBox: { width: 60, height: 60, borderRadius: 20, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  title: { fontSize: 28, fontWeight: '900', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 4 },
  card: { backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 10, marginTop: 10 },
  networkRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  netBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  netBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  netText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 15, height: 55, marginBottom: 15 },
  input: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  bundleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bundleBtn: { width: '48%', padding: 15, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  bundleBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  bundleSize: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
  bundlePrice: { fontSize: 13, color: colors.textMuted, marginTop: 5, fontWeight: '700' },
  payBtn: { backgroundColor: colors.primary, height: 60, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  payBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' }
});