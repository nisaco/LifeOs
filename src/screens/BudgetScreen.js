// src/screens/BudgetScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Modal, ScrollView, Alert, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../utils/theme';
import { Storage, KEYS } from '../utils/storage';
import { Card, PrimaryButton, EmptyState, Row, Spacer } from '../components/shared';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const CATEGORIES = ['Food', 'Transport', 'Bills', 'Health', 'Shopping', 'Entertainment', 'Income', 'Other'];
const CATEGORY_ICONS = { Food: 'coffee', Transport: 'navigation', Bills: 'file-text', Health: 'heart', Shopping: 'shopping-bag', Entertainment: 'tv', Income: 'briefcase', Other: 'dollar-sign' };

// ✅ Added global currency options
const CURRENCIES = ['$', '₵', '£', '€', '₦', '¥', '₹'];

export default function BudgetScreen() {
  const [entries, setEntries] = useState([]);
  const [monthlyLimit, setMonthlyLimit] = useState(1000);
  const [currency, setCurrency] = useState('₵'); // Defaulting to Cedi for you!
  
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const [limitInput, setLimitInput] = useState('');
  const [tempCurrency, setTempCurrency] = useState('');
  const [form, setForm] = useState({ amount: '', category: 'Food', type: 'expense', note: '' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await Storage.get(KEYS.BUDGET_ENTRIES) || [];
    const limit = await Storage.get(KEYS.BUDGET_LIMIT) || 1000;
    // Using a direct string key so you don't have to update your storage.js file!
    const savedCurrency = await Storage.get('lifeos_budget_currency') || '$'; 
    
    setEntries(data);
    setMonthlyLimit(limit);
    setCurrency(savedCurrency);
  }

  async function saveEntry() {
    const amt = parseFloat(form.amount);
    if (!amt || isNaN(amt)) return;
    const entry = { ...form, amount: amt, id: Date.now().toString(), date: new Date().toISOString() };
    const updated = [entry, ...entries];
    await Storage.set(KEYS.BUDGET_ENTRIES, updated);
    setEntries(updated);
    setShowModal(false);
    setForm({ amount: '', category: 'Food', type: 'expense', note: '' });
  }

  async function deleteEntry(id) {
    const confirmDelete = async () => {
      const updated = entries.filter(e => e.id !== id);
      await Storage.set(KEYS.BUDGET_ENTRIES, updated);
      setEntries(updated);
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Delete this transaction?")) confirmDelete();
    } else {
      Alert.alert('Delete?', 'Remove this transaction?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]);
    }
  }

  // ✅ New unified Settings Save function
  async function saveSettings() {
    const val = parseFloat(limitInput);
    if (!isNaN(val) && val > 0) {
      await Storage.set(KEYS.BUDGET_LIMIT, val);
      setMonthlyLimit(val);
    }
    
    await Storage.set('lifeos_budget_currency', tempCurrency);
    setCurrency(tempCurrency);
    
    setShowSettingsModal(false);
  }

  const now = new Date();
  const monthEntries = entries.filter(e => isWithinInterval(new Date(e.date), { start: startOfMonth(now), end: endOfMonth(now) }));
  const totalExpenses = monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const totalIncome = monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const progress = Math.min(totalExpenses / monthlyLimit, 1);
  const progressColor = progress > 0.9 ? colors.danger : progress > 0.7 ? colors.warning : colors.health;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Budget</Text>
          <Text style={styles.headerSub}>{format(now, 'MMMM yyyy')}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => { 
            setLimitInput(String(monthlyLimit)); 
            setTempCurrency(currency);
            setShowSettingsModal(true); 
          }} 
          style={styles.settingsBtn}
        >
          <Feather name="sliders" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary cards (✅ Currency Dynamic) */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderColor: colors.danger + '40' }]}>
            <Text style={styles.summaryLabel}>Spent</Text>
            <Text style={[styles.summaryAmount, { color: colors.danger }]}>{currency}{totalExpenses.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: colors.health + '40' }]}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryAmount, { color: colors.health }]}>{currency}{totalIncome.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: colors.budget + '40' }]}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text style={[styles.summaryAmount, { color: colors.budget }]}>{currency}{(totalIncome - totalExpenses).toFixed(2)}</Text>
          </View>
        </View>

        {/* Progress bar (✅ Currency Dynamic) */}
        <Card style={{ marginHorizontal: spacing.md }}>
          <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={styles.progressLabel}>Monthly limit</Text>
            <Text style={[styles.progressLabel, { color: progressColor }]}>
              {currency}{totalExpenses.toFixed(0)} / {currency}{monthlyLimit}
            </Text>
          </Row>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: progressColor }]} />
          </View>
          {progress > 0.9 && <Text style={styles.warningText}>⚠️ Near budget limit!</Text>}
        </Card>

        {/* Add button */}
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addEntryBtn}>
          <Feather name="plus" size={18} color={colors.budget} style={{ marginRight: 6 }} />
          <Text style={styles.addEntryBtnText}>Add Transaction</Text>
        </TouchableOpacity>

        {/* Transaction list (✅ Currency Dynamic) */}
        <Text style={styles.listLabel}>Transactions</Text>
        {entries.length === 0
          ? <EmptyState icon={<Feather name="pie-chart" size={36} color={colors.textMuted} />} title="No transactions yet" subtitle="Add income or expenses to track your budget" />
          : entries.slice(0, 50).map(entry => (
            <TouchableOpacity key={entry.id} onLongPress={() => deleteEntry(entry.id)} activeOpacity={0.7}>
              <Card style={{ marginHorizontal: spacing.md }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row style={{ gap: spacing.md }}>
                    <View style={styles.iconCircle}>
                      <Feather name={CATEGORY_ICONS[entry.category] || 'dollar-sign'} size={20} color={colors.textPrimary} />
                    </View>
                    <View>
                      <Text style={styles.entryCategory}>{entry.category}</Text>
                      {entry.note ? <Text style={styles.entryNote}>{entry.note}</Text> : null}
                      <Text style={styles.entryDate}>{format(new Date(entry.date), 'MMM d, h:mm a')}</Text>
                    </View>
                  </Row>
                  <Text style={[styles.entryAmount, { color: entry.type === 'income' ? colors.health : colors.textPrimary }]}>
                    {entry.type === 'income' ? '+' : '-'}{currency}{entry.amount.toFixed(2)}
                  </Text>
                </Row>
              </Card>
            </TouchableOpacity>
          ))
        }
        <Spacer size={spacing.xxl} />
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Transaction</Text>
            <Row style={{ gap: spacing.sm, marginBottom: spacing.md }}>
              {['expense', 'income'].map(t => (
                <TouchableOpacity key={t} onPress={() => setForm(f => ({ ...f, type: t }))}
                  style={[styles.typeBtn, form.type === t && { backgroundColor: t === 'income' ? colors.health : colors.danger, borderColor: 'transparent' }]}>
                  <Text style={[styles.typeBtnText, form.type === t && { color: '#fff' }]}>{t === 'income' ? 'Income' : 'Expense'}</Text>
                </TouchableOpacity>
              ))}
            </Row>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.currencyPrefix}>{currency}</Text>
              <TextInput
                style={styles.amountInput}
                value={form.amount}
                onChangeText={v => setForm(f => ({ ...f, amount: v }))}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <Row style={{ gap: spacing.xs }}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setForm(f => ({ ...f, category: c }))}
                    style={[styles.catChip, form.category === c && { backgroundColor: colors.budget + '25', borderColor: colors.budget }]}
                  >
                    <Feather name={CATEGORY_ICONS[c]} size={16} color={form.category === c ? colors.budget : colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={[styles.catChipText, form.category === c && { color: colors.budget }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </Row>
            </ScrollView>
            <TextInput
              style={styles.modalInput}
              value={form.note}
              onChangeText={v => setForm(f => ({ ...f, note: v }))}
              placeholder="Note (optional)"
              placeholderTextColor={colors.textMuted}
            />
            <Row style={{ gap: spacing.sm }}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={[styles.modalBtn, styles.cancelBtn]}>
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <PrimaryButton label="Save" onPress={saveEntry} color={form.type === 'income' ? colors.health : colors.budget} style={{ flex: 1 }} />
            </Row>
          </View>
        </View>
      </Modal>

      {/* ✅ New Settings Modal (Limit & Currency) */}
      <Modal visible={showSettingsModal} transparent animationType="fade">
        <View style={styles.modalOverlayCentered}>
          <View style={[styles.modalCard, { borderRadius: radius.xl, width: '90%', maxWidth: 400 }]}>
            <Row style={{ justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={styles.modalTitle}>Budget Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </Row>

            <Text style={styles.settingsLabel}>Monthly Limit</Text>
            <TextInput
              style={styles.settingsInput}
              value={limitInput}
              onChangeText={setLimitInput}
              keyboardType="decimal-pad"
            />

            <Text style={styles.settingsLabel}>Currency Symbol</Text>
            <Row style={{ flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl }}>
              {CURRENCIES.map(c => (
                <TouchableOpacity 
                  key={c} 
                  onPress={() => setTempCurrency(c)}
                  style={[styles.currencyChip, tempCurrency === c && styles.currencyChipActive]}
                >
                  <Text style={[styles.currencyText, tempCurrency === c && { color: colors.budget }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </Row>

            <PrimaryButton label="Save Settings" onPress={saveSettings} color={colors.budget} style={{ width: '100%' }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.sm },
  headerTitle: { fontSize: 28, fontWeight: '900', color: colors.textPrimary },
  headerSub: { fontSize: 14, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
  settingsBtn: { width: 44, height: 44, backgroundColor: colors.bgCard, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  
  summaryRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginVertical: spacing.md },
  summaryCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.xl, borderWidth: 1, padding: spacing.md, alignItems: 'center', ...shadow.sm },
  summaryLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  summaryAmount: { fontSize: 17, fontWeight: '900', letterSpacing: -0.5 },
  
  progressLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  progressTrack: { height: 10, backgroundColor: colors.bgElevated, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },
  warningText: { fontSize: 13, color: colors.danger, marginTop: spacing.xs, fontWeight: '700' },
  
  addEntryBtn: { flexDirection: 'row', margin: spacing.md, backgroundColor: colors.budget + '15', borderRadius: radius.full, padding: spacing.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.budget + '40' },
  addEntryBtnText: { color: colors.budget, fontWeight: '800', fontSize: 15 },
  
  listLabel: { fontSize: 13, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginHorizontal: spacing.md, marginBottom: spacing.md, marginTop: spacing.sm },
  iconCircle: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  entryCategory: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  entryNote: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  entryDate: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  entryAmount: { fontSize: 17, fontWeight: '900', letterSpacing: -0.5 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalOverlayCentered: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: colors.bgElevated, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxl },
  modalTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, marginBottom: spacing.sm },
  
  typeBtn: { flex: 1, borderRadius: radius.full, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard },
  typeBtnText: { fontWeight: '800', fontSize: 14, color: colors.textSecondary },
  
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, paddingHorizontal: spacing.lg },
  currencyPrefix: { fontSize: 28, fontWeight: '900', color: colors.textMuted, marginRight: 8 },
  amountInput: { flex: 1, color: colors.textPrimary, fontSize: 32, fontWeight: '900', paddingVertical: spacing.lg },
  
  catChip: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.full, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1.5, borderColor: colors.border, marginRight: spacing.xs },
  catChipText: { fontSize: 14, color: colors.textSecondary, fontWeight: '700' },
  modalInput: { backgroundColor: colors.bgCard, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: 16, padding: spacing.md, marginBottom: spacing.md },
  
  modalBtn: { flex: 1, borderRadius: radius.full, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },

  /* Settings Styles */
  settingsLabel: { fontSize: 13, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  settingsInput: { backgroundColor: colors.bgCard, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: 24, fontWeight: '900', padding: spacing.md, marginBottom: spacing.lg, textAlign: 'center' },
  currencyChip: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bgCard, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  currencyChipActive: { backgroundColor: colors.budget + '15', borderColor: colors.budget },
  currencyText: { fontSize: 20, fontWeight: '800', color: colors.textSecondary },
});