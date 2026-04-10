import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Platform, ActivityIndicator,
  Alert, ScrollView, Modal, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../utils/theme';
import { sendMessage, getChatSessions, getChatHistory, deleteChatSession } from '../utils/gemini';
import { format } from 'date-fns';
import Markdown from 'react-native-markdown-display';

export default function ChatScreen({ navigation }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  
  // ✅ NEW: State to track remaining chats for the banner
  const [chatsLeft, setChatsLeft] = useState(null); 
  
  const [extraPadding, setExtraPadding] = useState(0);

  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sessionsList, setSessionsList] = useState([]);
  const listRef = useRef(null);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  useEffect(() => {
    loadSidebar();

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setExtraPadding(e.endCoordinates.height - (Platform.OS === 'android' ? 60 : 0));
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setExtraPadding(0)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
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
      // ✅ Now extracting chatsLeft from your gemini API call
      const { reply, newSessionId, chatsLeft: serverChatsLeft } = await sendMessage(newMessages, currentSessionId); 
      
      const assistantMsg = { role: 'assistant', content: reply, id: (Date.now() + 1).toString(), time: new Date().toISOString() };
      setMessages([...newMessages, assistantMsg]);
      
      if (serverChatsLeft !== undefined) {
        setChatsLeft(serverChatsLeft);
      }

      if (!currentSessionId) {
        setCurrentSessionId(newSessionId);
        loadSidebar(); 
      }
    } catch (err) {
      // Remove the user's message so it doesn't stay on screen!
      setMessages(prev => prev.slice(0, -1));

      if (err.message && err.message.includes('LIMIT_REACHED')) {
        // Extract the time we attached in gemini.js
        const nextAllowedStr = err.message.split('|')[1];
        const nextTime = new Date(nextAllowedStr);
        const formattedTime = format(nextTime, 'h:mm a'); // Formats to "2:30 PM"

        Alert.alert(
          "Out of Free Messages ⏳",
          `You are out of free messages. Wait till ${formattedTime} to chat again, or Upgrade to Pro for unlimited access!`,         
          [
            { text: "Okay", style: "cancel" },
            { text: "Upgrade Now", onPress: () => navigation.navigate('Home') }
          ]
        );
      } else {
        Alert.alert('Error', err.message || 'Failed to get response from server.');
      }
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
    <View style={[styles.container, { paddingBottom: extraPadding }]}>
      
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

      {/* ✅ The Hourly Limit Banner */}
      {chatsLeft !== null && chatsLeft !== 'Unlimited' && (
        <View style={styles.limitBanner}>
          <Feather name="zap" size={14} color="#FFD700" style={{ marginRight: 6 }} />
          <Text style={styles.limitText}>{chatsLeft} free messages left this hour</Text>
        </View>
      )}

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          {initialLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.textSecondary, marginTop: 16 }}>Loading conversation...</Text>
            </View>
          ) : messages.length === 0 ? (
            <ScrollView contentContainerStyle={styles.emptyContainer}>
              <View style={styles.emptyLogoBg}><Feather name="cpu" size={48} color={colors.primary} /></View>
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
                // ✅ Applying the iMessage wrapper
                <View style={[styles.bubbleWrapper, item.role === 'user' ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                  {!!(item.role === 'assistant') && (
                    <Text style={styles.bubbleName}>LifeOS AI</Text>
                  )}
                  
                  <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                    <Text style={[styles.bubbleText, item.role === 'user' && styles.userBubbleText]}>
                       {item.content}
                    </Text>
                  </View>
                  
                  <Text style={styles.bubbleTime}>
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

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input} value={input} onChangeText={setInput}
          placeholder="iMessage AI..." placeholderTextColor={colors.textMuted} multiline maxLength={1000}
        />
        <TouchableOpacity onPress={handleSend} style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]} disabled={!input.trim() || loading}>
          <Feather name="arrow-up" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal visible={sidebarVisible} transparent animationType="fade">
        <View style={styles.sidebarOverlay}>
          <View style={styles.sidebarContent}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Chat History</Text>
              <TouchableOpacity onPress={() => setSidebarVisible(false)}><Feather name="x" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <TouchableOpacity onPress={startNewChat} style={styles.newChatBtnSidebar}>
              <Feather name="plus" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>New Chat</Text>
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {sessionsList.map((session, index) => (
                <TouchableOpacity key={session.sessionId || index} style={[styles.sessionItem, currentSessionId === session.sessionId && styles.sessionItemActive]} onPress={() => loadSession(session.sessionId)}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sessionTitle, currentSessionId === session.sessionId && { color: colors.primary }]} numberOfLines={1}>{session.title || "Chat Session"}</Text>
                    <Text style={styles.sessionDate}>{format(new Date(session.lastUpdated || Date.now()), 'MMM d, h:mm a')}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSidebarVisible(false)} />
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.glassyOverlay}>
          <View style={styles.glassyCard}>
            <View style={styles.glassyIconBg}><Feather name="trash-2" size={28} color={colors.danger} /></View>
            <Text style={styles.glassyTitle}>Delete Chat?</Text>
            <Text style={styles.glassyDesc}>This conversation will be permanently deleted.</Text>
            <View style={styles.glassyBtnRow}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={styles.glassyCancelBtn}><Text style={styles.glassyCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={confirmDelete} style={styles.glassyDeleteBtn}><Text style={styles.glassyDeleteText}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, paddingTop: 45, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  headerSub: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  
  // ✅ Banner Styles
  limitBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A1A', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  limitText: { fontSize: 12, fontWeight: '700', color: '#AAAAAA' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyLogoBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.xs },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  promptsGrid: { width: '100%', gap: spacing.sm },
  promptChip: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  promptText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  messagesList: { padding: spacing.md, paddingBottom: spacing.xl },
  
  // ✅ NEW iMESSAGE BUBBLE STYLES
  bubbleWrapper: { marginBottom: spacing.md, width: '100%' },
  bubble: { 
    maxWidth: '80%', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2
  },
  aiBubble: { 
    backgroundColor: '#262628', // Deep sleek gray 
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 4, // 👈 The "Tail" effect
  },
  userBubble: { 
    backgroundColor: '#007AFF', // Authentic iMessage Blue
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4, // 👈 The "Tail" effect
  },
  bubbleName: { fontSize: 11, fontWeight: '800', color: colors.textMuted, marginLeft: 16, marginBottom: 4 },
  bubbleText: { fontSize: 16, color: '#E5E5EA', lineHeight: 22 }, // Crisp off-white text
  userBubbleText: { color: '#FFFFFF' },
  bubbleTime: { fontSize: 10, color: colors.textMuted, marginTop: 4, paddingHorizontal: 4 },
  
  typingIndicator: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
  typingText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  
  // ✅ Redesigned Input Row (More like iMessage)
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  input: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 24, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: 16, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14, maxHeight: 120, marginRight: 10 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  sendBtnDisabled: { backgroundColor: '#3A3A3C' },
  
  sidebarOverlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)' },
  sidebarContent: { width: '75%', maxWidth: 320, backgroundColor: colors.bgElevated, height: '100%', borderRightWidth: 1, borderRightColor: colors.border },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: 50, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  sidebarTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  newChatBtnSidebar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, margin: spacing.md, paddingVertical: 12, borderRadius: radius.lg },
  sessionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  sessionItemActive: { backgroundColor: colors.primary + '10' },
  sessionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  sessionDate: { fontSize: 12, color: colors.textMuted },
  glassyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  glassyCard: { width: '100%', maxWidth: 340, backgroundColor: colors.bgElevated + 'F2', borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadow.lg },
  glassyIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.danger + '15', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  glassyTitle: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, marginBottom: spacing.xs },
  glassyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 20 },
  glassyBtnRow: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  glassyCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.full, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  glassyCancelText: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  glassyDeleteBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.full, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  glassyDeleteText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
// Paste this right below your StyleSheet.create(...) block

const baseMarkdownStyles = {
  body: { fontSize: 16, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  strong: { fontWeight: 'bold' },
  em: { fontStyle: 'italic' },
  code_inline: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 4, borderRadius: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  fence: { backgroundColor: '#000', padding: 10, borderRadius: 8, color: '#00FF00', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 8, marginBottom: 8 },
  list_item: { marginBottom: 4 },
  bullet_list: { marginBottom: 8 },
  ordered_list: { marginBottom: 8 },
};

const aiMarkdownStyles = {
  ...baseMarkdownStyles,
  body: { ...baseMarkdownStyles.body, color: '#E5E5EA' }, // iMessage off-white
};

const userMarkdownStyles = {
  ...baseMarkdownStyles,
  body: { ...baseMarkdownStyles.body, color: '#FFFFFF' }, // Solid white for user blue bubble
  code_inline: { ...baseMarkdownStyles.code_inline, backgroundColor: 'rgba(0,0,0,0.2)' },
};