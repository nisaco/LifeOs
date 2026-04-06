// src/screens/TasksScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Modal, ScrollView, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons'; 
import { colors, spacing, radius, shadow } from '../utils/theme';
import { Storage, KEYS } from '../utils/storage';
import { Card, PrimaryButton, EmptyState, Row, Spacer, Chip } from '../components/shared';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

// ✅ IMPORT NOTIFICATIONS
import { scheduleLocalNotification } from '../utils/notifications';

const PRIORITIES = ['High', 'Medium', 'Low'];
const CATEGORIES = ['Work', 'Personal', 'Health', 'Learning', 'Other'];

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'Personal', priority: 'Medium', dueDate: '', notes: '' });

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    const data = await Storage.get(KEYS.TASKS) || [];
    setTasks(data);
  }

  async function saveTask() {
    if (!form.title.trim()) return;
    let updated;
    if (editTask) {
      updated = tasks.map(t => t.id === editTask.id ? { ...t, ...form, synced: false } : t);
    } else {
      const newTask = { ...form, id: Date.now().toString(), done: false, createdAt: new Date().toISOString(), synced: false };
      updated = [newTask, ...tasks];
      
      // ✅ TRIGGER NOTIFICATION: Remind them about this new task in 2 hours (7200 seconds)
      await scheduleLocalNotification(
        "Task Reminder 📝", 
        `Still pending: ${form.title}. You've got this!`, 
        7200
      );
    }
    await Storage.set(KEYS.TASKS, updated);
    setTasks(updated);
    closeModal();
  }

  async function toggleTask(id) {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done, synced: false } : t);
    await Storage.set(KEYS.TASKS, updated);
    setTasks(updated);
  }

  async function deleteTask(id) {
    const updated = tasks.filter(t => t.id !== id);
    await Storage.set(KEYS.TASKS, updated);
    setTasks(updated);
  }

  function openAdd() {
    setForm({ title: '', category: 'Personal', priority: 'Medium', dueDate: '', notes: '' });
    setEditTask(null);
    setShowModal(true);
  }

  function openEdit(task) {
    setForm({ title: task.title, category: task.category, priority: task.priority, dueDate: task.dueDate || '', notes: task.notes || '' });
    setEditTask(task);
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditTask(null); }

  const filters = ['All', 'Today', 'Pending', 'Done'];
  const filtered = tasks.filter(t => {
    if (filter === 'All') return true;
    if (filter === 'Today') return t.dueDate && isToday(new Date(t.dueDate));
    if (filter === 'Pending') return !t.done;
    if (filter === 'Done') return t.done;
    return true;
  });

  const priorityColor = { High: colors.danger, Medium: colors.warning, Low: colors.tasks };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSub}>{tasks.filter(t => !t.done).length} pending</Text>
        </View>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <Feather name="plus" size={16} color={colors.tasks} style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.xs }}>
        {filters.map(f => (
          <Chip key={f} label={f} active={filter === f} color={colors.tasks} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={t => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon={<Feather name="check-circle" size={36} color={colors.textMuted} />} title="No tasks yet" subtitle="Tap '+ Add' to create your first task" />}
        renderItem={({ item }) => (
          <TouchableOpacity onLongPress={() => {
            Alert.alert('Task options', item.title, [
              { text: 'Edit', onPress: () => openEdit(item) },
              { text: 'Delete', style: 'destructive', onPress: () => deleteTask(item.id) },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }} activeOpacity={0.7}>
            <Card style={[styles.taskCard, item.done && styles.taskDone]}>
              <Row style={{ gap: spacing.md, alignItems: 'flex-start' }}>
                <TouchableOpacity onPress={() => toggleTask(item.id)} style={[styles.checkbox, item.done && { backgroundColor: colors.tasks, borderColor: colors.tasks }]}>
                  {item.done && <Feather name="check" size={16} color="#fff" />}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, item.done && styles.taskTitleDone]}>{item.title}</Text>
                  <Row style={{ marginTop: 8, gap: spacing.sm, flexWrap: 'wrap' }}>
                    <View style={[styles.priorityBadge, { backgroundColor: priorityColor[item.priority] + '15', borderColor: priorityColor[item.priority] + '40' }]}>
                      <Text style={[styles.priorityText, { color: priorityColor[item.priority] }]}>{item.priority}</Text>
                    </View>
                    <Text style={styles.categoryText}>{item.category}</Text>
                    {item.dueDate && (
                      <Row style={{ gap: 4 }}>
                        <Feather name="calendar" size={12} color={isPast(new Date(item.dueDate)) && !item.done ? colors.danger : colors.textSecondary} />
                        <Text style={[styles.dueText, isPast(new Date(item.dueDate)) && !item.done && { color: colors.danger, fontWeight: '600' }]}>
                          {isToday(new Date(item.dueDate)) ? 'Today' : isTomorrow(new Date(item.dueDate)) ? 'Tomorrow' : format(new Date(item.dueDate), 'MMM d')}
                        </Text>
                      </Row>
                    )}
                  </Row>
                </View>
              </Row>
            </Card>
          </TouchableOpacity>
        )}
      />

      {/* Add/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editTask ? 'Edit Task' : 'New Task'}</Text>
            <TextInput
              style={styles.modalInput}
              value={form.title}
              onChangeText={v => setForm(f => ({ ...f, title: v }))}
              placeholder="Task title..."
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <Text style={styles.modalLabel}>Priority</Text>
            <Row style={{ gap: spacing.xs, marginBottom: spacing.md }}>
              {PRIORITIES.map(p => (
                <Chip key={p} label={p} active={form.priority === p} color={priorityColor[p]} onPress={() => setForm(f => ({ ...f, priority: p }))} />
              ))}
            </Row>
            <Text style={styles.modalLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <Row style={{ gap: spacing.xs }}>
                {CATEGORIES.map(c => (
                  <Chip key={c} label={c} active={form.category === c} color={colors.tasks} onPress={() => setForm(f => ({ ...f, category: c }))} />
                ))}
              </Row>
            </ScrollView>
            <TextInput
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
              value={form.notes}
              onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <Row style={{ gap: spacing.sm }}>
              <TouchableOpacity onPress={closeModal} style={[styles.modalBtn, styles.modalCancelBtn]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <PrimaryButton label={editTask ? 'Save Changes' : 'Add Task'} onPress={saveTask} color={colors.tasks} style={{ flex: 1 }} />
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
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.tasks + '15', borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.tasks + '40' },
  addBtnText: { color: colors.tasks, fontWeight: '700', fontSize: 14 },
  filterRow: { marginVertical: spacing.sm, flexGrow: 0 },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  taskCard: { marginBottom: spacing.sm, paddingVertical: spacing.md },
  taskDone: { opacity: 0.6 },
  checkbox: { width: 28, height: 28, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  taskTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  taskTitleDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
  priorityBadge: { borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  priorityText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  dueText: { fontSize: 12, color: colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bgElevated, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxl },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.md },
  modalLabel: { fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs },
  modalInput: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: 15, padding: spacing.md, marginBottom: spacing.lg },
  modalBtn: { flex: 1, borderRadius: radius.full, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  modalCancelBtn: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.textSecondary, fontWeight: '700' },
});