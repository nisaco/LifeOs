// src/screens/HealthScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Modal, TextInput, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons'; // ✅ Imported
import { colors, spacing, radius, shadow } from '../utils/theme';
import { Storage, KEYS } from '../utils/storage';
import { Card, PrimaryButton, EmptyState, Row, Spacer } from '../components/shared';
import { format, subDays, eachDayOfInterval } from 'date-fns';

// ✅ Swapped emojis for Feather icon names
const HABIT_ICONS = ['droplet', 'activity', 'heart', 'book', 'coffee', 'moon', 'sun', 'star', 'target', 'edit-2'];
const HABIT_COLORS = [colors.health, colors.tasks, colors.primary, colors.budget, colors.secondary];

export default function HealthScreen() {
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', icon: 'droplet', color: colors.health, target: '1', unit: 'times' });
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const h = await Storage.get(KEYS.HABITS) || [];
    const l = await Storage.get(KEYS.HABIT_LOGS) || {};
    setHabits(h);
    setLogs(l);
  }

  async function saveHabit() {
    if (!form.name.trim()) return;
    const habit = { ...form, id: Date.now().toString(), createdAt: new Date().toISOString(), target: parseInt(form.target) || 1 };
    const updated = [...habits, habit];
    await Storage.set(KEYS.HABITS, updated);
    setHabits(updated);
    setShowModal(false);
    setForm({ name: '', icon: 'droplet', color: colors.health, target: '1', unit: 'times' });
  }

  async function deleteHabit(id) {
    const updated = habits.filter(h => h.id !== id);
    await Storage.set(KEYS.HABITS, updated);
    setHabits(updated);
  }

  async function logHabit(habitId) {
    const key = `${today}_${habitId}`;
    const current = logs[key] || 0;
    const habit = habits.find(h => h.id === habitId);
    const next = current >= habit.target ? 0 : current + 1;
    const updated = { ...logs, [key]: next };
    await Storage.set(KEYS.HABIT_LOGS, updated);
    setLogs(updated);
  }

  function getStreak(habitId) {
    let streak = 0;
    const days = eachDayOfInterval({ start: subDays(new Date(), 30), end: new Date() }).reverse();
    for (const d of days) {
      const key = `${format(d, 'yyyy-MM-dd')}_${habitId}`;
      const habit = habits.find(h => h.id === habitId);
      if (logs[key] >= (habit?.target || 1)) streak++;
      else break;
    }
    return streak;
  }

  const last7 = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Health & Habits</Text>
          <Text style={styles.headerSub}>{format(new Date(), 'EEEE, MMM d')}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
          <Feather name="plus" size={16} color={colors.health} style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Habit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
        {habits.length === 0 ? (
          <EmptyState icon={<Feather name="activity" size={36} color={colors.textMuted} />} title="No habits yet" subtitle="Add habits to track daily — water, exercise, reading, and more" />
        ) : (
          habits.map(habit => {
            const key = `${today}_${habit.id}`;
            const done = logs[key] || 0;
            const complete = done >= habit.target;
            const streak = getStreak(habit.id);

            return (
              <TouchableOpacity
                key={habit.id}
                activeOpacity={0.8}
                onLongPress={() => Alert.alert('Delete habit?', habit.name, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteHabit(habit.id) }
                ])}
              >
                <Card style={[styles.habitCard, complete && { borderColor: habit.color + '50' }]}>
                  <Row style={{ justifyContent: 'space-between', marginBottom: spacing.md }}>
                    <Row style={{ gap: spacing.md }}>
                      <View style={[styles.habitIconBox, { backgroundColor: habit.color + '15' }]}>
                        <Feather name={habit.icon} size={22} color={habit.color} />
                      </View>
                      <View>
                        <Text style={styles.habitName}>{habit.name}</Text>
                        <Row style={{ gap: spacing.sm, marginTop: 4 }}>
                          {streak > 0 && (
                            <Row style={{ gap: 4 }}>
                              <Feather name="trending-up" size={12} color={habit.color} />
                              <Text style={[styles.streakText, { color: habit.color }]}>{streak} day streak</Text>
                            </Row>
                          )}
                          <Text style={styles.progressCount}>{done}/{habit.target} {habit.unit}</Text>
                        </Row>
                      </View>
                    </Row>
                    <TouchableOpacity
                      onPress={() => logHabit(habit.id)}
                      style={[styles.logBtn, { 
                        borderColor: complete ? habit.color : colors.border, 
                        backgroundColor: complete ? habit.color : colors.bgCard 
                      }]}
                    >
                      <Feather name={complete ? "check" : "plus"} size={20} color={complete ? '#fff' : habit.color} />
                    </TouchableOpacity>
                  </Row>

                  {/* Progress bar */}
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.min((done / habit.target) * 100, 100)}%`, backgroundColor: habit.color }]} />
                  </View>

                  {/* 7-day history */}
                  <Row style={{ gap: 6, marginTop: spacing.md }}>
                    {last7.map(d => {
                      const k = `${format(d, 'yyyy-MM-dd')}_${habit.id}`;
                      const val = logs[k] || 0;
                      const done7 = val >= habit.target;
                      return (
                        <View key={format(d, 'yyyy-MM-dd')} style={{ alignItems: 'center', flex: 1 }}>
                          <View style={[styles.dayDot, { backgroundColor: done7 ? habit.color : colors.bgElevated, borderColor: done7 ? habit.color : colors.border }]} />
                          <Text style={styles.dayLabel}>{format(d, 'E')[0]}</Text>
                        </View>
                      );
                    })}
                  </Row>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Habit</Text>
            <TextInput
              style={styles.modalInput}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              placeholder="Habit name..."
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <Text style={styles.modalLabel}>Icon</Text>
            <Row style={{ flexWrap: 'wrap', gap: 10, marginBottom: spacing.lg }}>
              {HABIT_ICONS.map(icon => (
                <TouchableOpacity key={icon} onPress={() => setForm(f => ({ ...f, icon }))}
                  style={[styles.iconOption, form.icon === icon && styles.iconOptionActive]}>
                  <Feather name={icon} size={22} color={form.icon === icon ? colors.primary : colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </Row>
            <Text style={styles.modalLabel}>Color</Text>
            <Row style={{ gap: spacing.md, marginBottom: spacing.lg }}>
              {HABIT_COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => setForm(f => ({ ...f, color: c }))}
                  style={[styles.colorDot, { backgroundColor: c }, form.color === c && styles.colorDotActive]} />
              ))}
            </Row>
            <Row style={{ gap: spacing.md, marginBottom: spacing.lg }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Daily target</Text>
                <TextInput
                  style={styles.modalInput}
                  value={form.target}
                  onChangeText={v => setForm(f => ({ ...f, target: v }))}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Unit</Text>
                <TextInput
                  style={styles.modalInput}
                  value={form.unit}
                  onChangeText={v => setForm(f => ({ ...f, unit: v }))}
                  placeholder="times"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </Row>
            <Row style={{ gap: spacing.sm }}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={[styles.modalBtn, styles.cancelBtn]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <PrimaryButton label="Add Habit" onPress={saveHabit} color={form.color} style={{ flex: 1 }} />
            </Row>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.sm },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.health + '15', borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.health + '40' },
  addBtnText: { color: colors.health, fontWeight: '700', fontSize: 14 },
  habitCard: { paddingVertical: spacing.md },
  habitIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  habitName: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  streakText: { fontSize: 12, fontWeight: '800' },
  progressCount: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  logBtn: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  progressTrack: { height: 8, backgroundColor: colors.bgElevated, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },
  dayDot: { width: 12, height: 12, borderRadius: 6, marginBottom: 4, borderWidth: 1 },
  dayLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bgElevated, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxl },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.md },
  modalLabel: { fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs },
  modalInput: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: 15, padding: spacing.md, marginBottom: spacing.md },
  iconOption: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard, borderWidth: 1.5, borderColor: colors.border },
  iconOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  colorDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'transparent' },
  colorDotActive: { borderColor: '#fff', ...shadow.sm },
  modalBtn: { flex: 1, borderRadius: radius.full, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.textSecondary, fontWeight: '700' },
});