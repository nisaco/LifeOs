// src/screens/FocusScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, 
  StyleSheet, Vibration, Modal, TextInput, Platform 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { colors, spacing, radius, shadow } from '../utils/theme';
import { Storage, KEYS } from '../utils/storage';
import { Card, Row, PrimaryButton } from '../components/shared';
import { format } from 'date-fns';

const PRESETS = [
  { label: 'Pomodoro', work: 25, break: 5, icon: 'clock' },
  { label: 'Deep Work', work: 50, break: 10, icon: 'target' },
  { label: 'Quick Sprint', work: 15, break: 3, icon: 'zap' },
  { label: 'Custom', work: 1, break: 1, icon: 'settings' }, // Set to 1 min for easy testing!
];

export default function FocusScreen({ navigation }) {
  const [preset, setPreset] = useState(PRESETS[0]);
  const [mode, setMode] = useState('work');
  const [secondsLeft, setSecondsLeft] = useState(PRESETS[0].work * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState([]);
  
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [studyHours, setStudyHours] = useState('');
  const [sound, setSound] = useState();
  const intervalRef = useRef(null);

  // ✅ New States for the Premium Glassy Timer Modal
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [modalData, setModalData] = useState({ title: '', message: '', nextMode: 'break' });

  useEffect(() => { loadSessions(); }, []);

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => s - 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0 && running) {
      setRunning(false);
      clearInterval(intervalRef.current);
      handleTimerEnd();
    }
  }, [secondsLeft, running]);

  async function loadSessions() {
    const data = await Storage.get(KEYS.FOCUS_SESSIONS) || [];
    setSessions(data);
  }

  async function playBeep() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' }
      );
      setSound(sound);
      await sound.playAsync();
    } catch (e) { 
      console.log("Audio play failed (CORS or Web block), relying on vibration:", e); 
    }
  }

  async function handleTimerEnd() {
    Vibration.vibrate([0, 500, 200, 500]); 
    await playBeep(); 

    const session = { id: Date.now().toString(), type: mode, duration: mode === 'work' ? preset.work : preset.break, date: new Date().toISOString(), preset: preset.label };
    const all = await Storage.get(KEYS.FOCUS_SESSIONS) || [];
    await Storage.set(KEYS.FOCUS_SESSIONS, [session, ...all].slice(0, 100));
    await loadSessions();

    const nextMode = mode === 'work' ? 'break' : 'work';
    const title = nextMode === 'break' ? 'Break Time!' : 'Back to Work!';
    const msg = mode === 'work' ? 'Great job! Time to step away and take a break.' : 'Break is over! Time to get back to focus.';
    
    // ✅ Trigger our custom glassy modal instead of native alerts
    setModalData({ title, message: msg, nextMode });
    setTimerModalVisible(true);
  }

  function switchMode(newMode) {
    setMode(newMode);
    setSecondsLeft((newMode === 'work' ? preset.work : preset.break) * 60);
    setRunning(true);
  }

  function resetTimer(p = preset, m = mode) {
    clearInterval(intervalRef.current);
    setRunning(false);
    setMode(m);
    setSecondsLeft((m === 'work' ? p.work : p.break) * 60);
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Focus</Text>
        <TouchableOpacity onPress={() => setShowScheduleModal(true)} style={styles.scheduleBtn}>
          <Feather name="calendar" size={16} color={colors.primary} />
          <Text style={styles.scheduleBtnText}>Smart Schedule</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md, alignItems: 'center', paddingBottom: 100 }}>
        
        {/* Presets */}
        <Row style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
          {PRESETS.map(p => (
            <TouchableOpacity key={p.label} onPress={() => {setPreset(p); resetTimer(p, 'work');}}
              style={[styles.presetChip, preset.label === p.label && styles.presetChipActive]}>
              <Feather name={p.icon} size={18} color={preset.label === p.label ? colors.focus : colors.textSecondary} />
              <Text style={[styles.presetLabel, preset.label === p.label && { color: colors.focus }]}>{p.work}m</Text>
            </TouchableOpacity>
          ))}
        </Row>

        {/* Timer UI */}
        <View style={[styles.modeBadge, { backgroundColor: mode === 'work' ? colors.focus + '15' : colors.health + '15' }]}>
          <Feather name={mode === 'work' ? 'zap' : 'coffee'} size={16} color={mode === 'work' ? colors.focus : colors.health} style={{ marginRight: 8 }} />
          <Text style={[styles.modeText, { color: mode === 'work' ? colors.focus : colors.health }]}>{mode === 'work' ? 'WORK SESSION' : 'BREAK TIME'}</Text>
        </View>

        <View style={[styles.timerCircleOuter, { borderColor: mode === 'work' ? colors.focus : colors.health }]}>
          <View style={styles.timerInner}>
            <Text style={styles.timerText}>{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</Text>
          </View>
        </View>

        {/* Controls */}
        <Row style={{ gap: spacing.lg, marginTop: spacing.xl }}>
          <TouchableOpacity onPress={() => resetTimer()} style={styles.controlBtn}>
            <Feather name="rotate-ccw" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setRunning(!running)} style={[styles.playBtn, { backgroundColor: mode === 'work' ? colors.focus : colors.health }]}>
            <Feather name={running ? 'pause' : 'play'} size={32} color="#fff" style={{ marginLeft: running ? 0 : 4 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => switchMode(mode === 'work' ? 'break' : 'work')} style={styles.controlBtn}>
            <Feather name="skip-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </Row>

        {/* Break Activity */}
        <View style={{ alignSelf: 'stretch', marginTop: spacing.xxl }}>
          <Text style={styles.sectionLabel}>Need a break?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Game')} activeOpacity={0.8}>
            <Card style={{ borderColor: colors.secondary + '40', backgroundColor: colors.secondary + '0A' }}>
              <Row>
                <View style={[styles.iconBox, { backgroundColor: colors.secondary + '20', marginRight: spacing.md }]}>
                  <Feather name="crosshair" size={20} color={colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>Play Tic-Tac-Toe</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Reset your mind with a quick game.</Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.textMuted} />
              </Row>
            </Card>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Smart Scheduler Modal */}
      <Modal visible={showScheduleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Row style={{ justifyContent: 'space-between', marginBottom: spacing.md }}>
              <Text style={styles.modalTitle}>Smart Scheduler</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </Row>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.lg }}>How many hours do you want to study in total? We will break it down into optimal Pomodoro blocks.</Text>
            
            <TextInput
              style={styles.modalInput}
              value={studyHours}
              onChangeText={setStudyHours}
              placeholder="e.g., 4"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              autoFocus
            />

            {studyHours ? (
              <View style={styles.schedulePreview}>
                <Text style={{ color: colors.primary, fontWeight: '800', marginBottom: 8 }}>Suggested Plan:</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 16 }}>• {Math.floor((studyHours * 60) / 30)} Work Blocks (25m)</Text>
                <Text style={{ color: colors.textPrimary, fontSize: 16, marginTop: 4 }}>• {Math.floor((studyHours * 60) / 30)} Short Breaks (5m)</Text>
              </View>
            ) : null}

            <PrimaryButton 
              label="Start First Block" 
              onPress={() => {
                setShowScheduleModal(false);
                setPreset(PRESETS[0]);
                resetTimer(PRESETS[0], 'work');
                setRunning(true);
              }} 
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>

      {/* ✅ Premium Glassy Timer Complete Modal */}
      <Modal visible={timerModalVisible} transparent animationType="fade">
        <View style={styles.glassyOverlay}>
          <View style={styles.glassyCard}>
            <View style={[styles.glassyIconBg, { 
              backgroundColor: modalData.nextMode === 'break' ? colors.health + '15' : colors.focus + '15', 
              borderColor: modalData.nextMode === 'break' ? colors.health + '40' : colors.focus + '40' 
            }]}>
              <Feather 
                name={modalData.nextMode === 'break' ? "coffee" : "zap"} 
                size={28} 
                color={modalData.nextMode === 'break' ? colors.health : colors.focus} 
              />
            </View>
            
            <Text style={styles.glassyTitle}>{modalData.title}</Text>
            <Text style={styles.glassyDesc}>{modalData.message}</Text>
            
            <View style={styles.glassyBtnRow}>
              <TouchableOpacity 
                onPress={() => {
                  setTimerModalVisible(false);
                  resetTimer(preset, 'work');
                }} 
                style={styles.glassyCancelBtn}
              >
                <Text style={styles.glassyCancelText}>Stop</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => {
                  setTimerModalVisible(false);
                  switchMode(modalData.nextMode);
                }} 
                style={[styles.glassyActionBtn, { 
                  backgroundColor: modalData.nextMode === 'break' ? colors.health : colors.focus 
                }]}
              >
                <Text style={styles.glassyActionText}>
                  Start {modalData.nextMode === 'break' ? 'Break' : 'Work'}
                </Text>
              </TouchableOpacity>
            </View>
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
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '15', paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary + '40' },
  scheduleBtnText: { color: colors.primary, fontWeight: '700', marginLeft: 6 },
  presetChip: { flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  presetChipActive: { borderColor: colors.focus + '60', backgroundColor: colors.focus + '10' },
  presetLabel: { fontSize: 14, fontWeight: '800', color: colors.textSecondary, marginLeft: 8 },
  modeBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.full, paddingVertical: 10, paddingHorizontal: 20, marginBottom: spacing.xl },
  modeText: { fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  timerCircleOuter: { width: 280, height: 280, borderRadius: 140, borderWidth: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard, ...shadow.md },
  timerInner: { alignItems: 'center' },
  timerText: { fontSize: 72, fontWeight: '900', color: colors.textPrimary, letterSpacing: -2 },
  controlBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  playBtn: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', ...shadow.md },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: spacing.md },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bgElevated, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxl },
  modalTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
  modalInput: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: 24, fontWeight: '800', padding: spacing.md, textAlign: 'center' },
  schedulePreview: { backgroundColor: colors.bg, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md, borderWidth: 1, borderColor: colors.border },

  /* ✅ Premium Glassy Modal Styles */
  glassyOverlay: { 
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', alignItems: 'center', padding: spacing.xl,
  },
  glassyCard: {
    width: '100%', maxWidth: 340, backgroundColor: colors.bgElevated + 'F2', 
    borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, ...shadow.lg,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : {}), 
  },
  glassyIconBg: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md, borderWidth: 1, 
  },
  glassyTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, marginBottom: spacing.xs, textAlign: 'center' },
  glassyDesc: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 22 },
  glassyBtnRow: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  glassyCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: radius.full,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  glassyCancelText: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  glassyActionBtn: {
    flex: 1, paddingVertical: 14, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center', ...shadow.sm,
  },
  glassyActionText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});