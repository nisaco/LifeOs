import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, ScrollView, Modal, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../utils/theme';
import { sendMessage, getChatSessions, getChatHistory, deleteChatSession } from '../utils/gemini';
import { format } from 'date-fns';

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sessionsList, setSessionsList] = useState([]);
  const listRef = useRef(null);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  useEffect(() => {
    loadSidebar();
  }, []);

  async function loadSidebar() {
    const sessions = await getChatSessions();
    setSessionsList(sessions || []);
  }

  async function loadSession(sessionId) {
    setSidebarVisible(false);
    setInitialLoading(true);
    setCurrentSessionId(sessionId);
    const history = await getChatHistory(sessionId);
    setMessages(history || []);
    setInitialLoading(false);
  }

  function startNewChat() {
    setMessages([]);
    setCurrentSessionId(null);
    setSidebarVisible(false);
  }

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input.trim(), id: Date.now().toString(), time: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { reply, newSessionId } = await sendMessage(newMessages, currentSessionId); 
      
      const assistantMsg = { role: 'assistant', content: reply, id: (Date.now() + 1).toString(), time: new Date().toISOString() };
      setMessages([...newMessages, assistantMsg]);
      
      if (!currentSessionId) {
        setCurrentSessionId(newSessionId);
        loadSidebar(); 
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to get response from server.');
    } finally {
      setLoading(false);
    }
  }

  function promptDeleteSession(sessionId) {
    setSessionToDelete(sessionId);
    setDeleteModalVisible(true);
  }

  async function confirmDelete() {
    if (!sessionToDelete) return;
    
    await deleteChatSession(sessionToDelete);
    if (currentSessionId === sessionToDelete) startNewChat();
    
    loadSidebar();
    setDeleteModalVisible(false);
    setSessionToDelete(null);
  }

  const suggestedPrompts = ['Help me plan my week', 'Explain compound interest', 'Give me a 5-min workout'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { loadSidebar(); setSidebarVisible(true); }} style={styles.iconBtn}>
          <Feather name="menu" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSub}>Powered by Gemini</Text>
        </View>

        <TouchableOpacity onPress={startNewChat} style={styles.iconBtn}>
          <Feather name="edit" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 🚀 THE ULTIMATE KEYBOARD FIX: behavior="position" */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'position'} 
        // We use a manual offset to account for the Header + Bottom Tab Bar
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : -60}
        contentContainerStyle={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            {initialLoading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.textSecondary, marginTop: 16 }}>Loading conversation...</Text>
              </View>
            ) : messages.length === 0 ? (
              <ScrollView contentContainerStyle={styles.emptyContainer}>
                <View style={styles.emptyLogoBg}>
                  <Feather name="cpu" size={48} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>LifeOS Assistant</Text>
                <Text style={styles.emptySub}>Start a new conversation</Text>
                <View style={styles.promptsGrid}>
                  {suggestedPrompts.map((p, index) => (
                    <TouchableOpacity key={`prompt_${index}`} onPress={() => setInput(p)} style={styles.promptChip}>
                      <Text style={styles.promptText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <FlatList
                ref={listRef} 
                data={messages} 
                keyExtractor={(m, index) => m._id || m.id || index.toString()} 
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => (
                  <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                    
                    {!!(item.role === 'assistant') && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Feather name="cpu" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                        <Text style={styles.bubbleName}>LifeOS AI</Text>
                      </View>
                    )}
                    
                    <Text style={[styles.bubbleText, item.role === 'user' && styles.userBubbleText]}>{item.content}</Text>
                    <Text style={[styles.bubbleTime, item.role === 'user' && { color: 'rgba(255,255,255,0.7)' }]}>
                      {item.time ? format(new Date(item.time), 'h:mm a') : 'Now'}
                    </Text>
                  </View>
                )}
              />
            )}

            {!!loading && (
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.typingText}>Thinking...</Text>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>

        {/* Input Row stays inside the AvoidingView to be pushed up */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input} value={input} onChangeText={setInput}
            placeholder="Message AI..." placeholderTextColor={colors.textMuted} multiline maxLength={1000}
          />
          <TouchableOpacity onPress={handleSend} style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]} disabled={!input.trim() || loading}>
            <Feather name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Sidebar Modal */}
      <Modal visible={sidebarVisible} transparent animationType="fade">
        <View style={styles.sidebarOverlay}>
          <View style={styles.sidebarContent}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Chat History</Text>
              <TouchableOpacity onPress={() => setSidebarVisible(false)}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity onPress={startNewChat} style={styles.newChatBtnSidebar}>
              <Feather name="plus" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>New Chat</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {sessionsList.length === 0 ? (
                <Text style={styles.sidebarEmptyText}>No previous chats found.</Text>
              ) : (
                sessionsList.map((session, index) => (
                  <TouchableOpacity 
                    key={session.sessionId || `session_${index}`} 
                    style={[styles.sessionItem, currentSessionId === session.sessionId && styles.sessionItemActive]}
                    onPress={() => loadSession(session.sessionId)}
                    onLongPress={() => promptDeleteSession(session.sessionId)} 
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sessionTitle, currentSessionId === session.sessionId && { color: colors.primary }]} numberOfLines={1}>
                        {session.title || "Chat Session"}
                      </Text>
                      <Text style={styles.sessionDate}>{format(new Date(session.lastUpdated || Date.now()), 'MMM d, h:mm a')}</Text>
                    </View>
                    {!!(currentSessionId === session.sessionId) && <Feather name="chevron-right" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSidebarVisible(false)} />
        </View>
      </Modal>

      {/* Glassy Delete Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.glassyOverlay}>
          <View style={styles.glassyCard}>
            <View style={styles.glassyIconBg}>
              <Feather name="trash-2" size={28} color={colors.danger} />
            </View>
            <Text style={styles.glassyTitle}>Delete Chat?</Text>
            <Text style={styles.glassyDesc}>This conversation will be permanently deleted. You cannot undo this action.</Text>
            
            <View style={styles.glassyBtnRow}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={styles.glassyCancelBtn}>
                <Text style={styles.glassyCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDelete} style={styles.glassyDeleteBtn}>
                <Text style={styles.glassyDeleteText}>Delete</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  headerSub: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyLogoBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.xs },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  promptsGrid: { width: '100%', gap: spacing.sm },
  promptChip: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  promptText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },

  messagesList: { padding: spacing.md, paddingBottom: spacing.xl },
  bubble: { maxWidth: '85%', borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.sm },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bubbleName: { fontSize: 11, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  bubbleText: { fontSize: 15, color: colors.textPrimary, lineHeight: 22 },
  userBubbleText: { color: '#fff', fontWeight: '500' },
  bubbleTime: { fontSize: 11, color: colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },

  typingIndicator: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
  typingText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.sm, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  input: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: 15, paddingHorizontal: spacing.md, paddingVertical: 14, maxHeight: 120 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.border },

  sidebarOverlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)' },
  sidebarContent: { width: '75%', maxWidth: 320, backgroundColor: colors.bgElevated, height: '100%', borderRightWidth: 1, borderRightColor: colors.border },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: 50, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  sidebarTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  newChatBtnSidebar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, margin: spacing.md, paddingVertical: 12, borderRadius: radius.lg },
  sessionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  sessionItemActive: { backgroundColor: colors.primary + '10' },
  sessionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  sessionDate: { fontSize: 12, color: colors.textMuted },
  sidebarEmptyText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, fontSize: 14 },

  glassyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  glassyCard: { width: '100%', maxWidth: 340, backgroundColor: colors.bgElevated + 'F2', borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadow.lg },
  glassyIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.danger + '15', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.danger + '40' },
  glassyTitle: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, marginBottom: spacing.xs },
  glassyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 20 },
  glassyBtnRow: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  glassyCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.full, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  glassyCancelText: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  glassyDeleteBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.full, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  glassyDeleteText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});