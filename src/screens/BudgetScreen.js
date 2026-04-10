import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Storage, KEYS } from '../utils/storage';

export default function BudgetScreen() {
  const [budget, setBudget] = useState([]);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('expense');
  const [loading, setLoading] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    const data = await Storage.get(KEYS.BUDGET_ENTRIES) || [];
    setBudget(data);
  }

  const addRecord = async () => {
    if (!amount || !desc) return;
    const newEntry = { id: Date.now(), amount: parseFloat(amount), description: desc, type, date: new Date().toISOString() };
    const updated = [newEntry, ...budget];
    setBudget(updated);
    await Storage.set(KEYS.BUDGET_ENTRIES, updated);
    setAmount(''); setDesc('');
  };

  const totalInc = budget.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExp = budget.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalInc - totalExp;
  const flowWidth = (totalInc + totalExp) === 0 ? 50 : (totalInc / (totalInc + totalExp)) * 100;

  return (
    <LinearGradient colors={['#0D0D1A', '#000000']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topHeader}>
            <View style={styles.walletIcon}><Feather name="wallet" size={28} color="#FFD166" /></View>
            <Text style={styles.screenTitle}>Finances</Text>
        </View>

        <View style={styles.balanceCard}>
            <Text style={styles.cardLabel}>NET BALANCE</Text>
            <Text style={styles.balanceText}>₵{balance.toFixed(2)}</Text>
            
            <View style={styles.flowBar}>
                <View style={[styles.flowInc, { width: `${flowWidth}%` }]} />
                <View style={[styles.flowExp, { flex: 1 }]} />
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>INCOME</Text>
                    <Text style={styles.incVal}>₵{totalInc.toFixed(2)}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>EXPENSE</Text>
                    <Text style={styles.expVal}>₵{totalExp.toFixed(2)}</Text>
                </View>
            </View>
        </View>

        <View style={styles.formCard}>
            <View style={styles.typeToggle}>
                <TouchableOpacity onPress={() => setType('expense')} style={[styles.typeBtn, type === 'expense' && {backgroundColor: '#FF6584'}]}>
                    <Text style={styles.typeBtnText}>Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setType('income')} style={[styles.typeBtn, type === 'income' && {backgroundColor: '#06D6A0'}]}>
                    <Text style={styles.typeBtnText}>Income</Text>
                </TouchableOpacity>
            </View>
            <TextInput style={styles.bigInput} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="numeric" placeholderTextColor="#5A5A80" />
            <TextInput style={styles.smallInput} value={desc} onChangeText={setDesc} placeholder="What was this for?" placeholderTextColor="#5A5A80" />
            <TouchableOpacity style={[styles.addBtn, {backgroundColor: type === 'expense' ? '#FF6584' : '#06D6A0'}]} onPress={addRecord}>
                <Text style={styles.addBtnText}>Add Record</Text>
            </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>History</Text>
        {budget.map((item, i) => (
            <View key={i} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                    <View style={[styles.histIcon, {backgroundColor: item.type === 'income' ? '#06D6A020' : '#FF658420'}]}>
                        <Feather name={item.type === 'income' ? 'trending-up' : 'trending-down'} size={18} color={item.type === 'income' ? '#06D6A0' : '#FF6584'} />
                    </View>
                    <View>
                        <Text style={styles.histDesc}>{item.description}</Text>
                        <Text style={styles.histDate}>{new Date(item.date).toLocaleDateString()}</Text>
                    </View>
                </View>
                <Text style={[styles.histAmt, {color: item.type === 'income' ? '#06D6A0' : '#FFF'}]}>
                    {item.type === 'income' ? '+' : '-'}₵{item.amount.toFixed(2)}
                </Text>
            </View>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}