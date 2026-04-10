import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Markdown from 'react-native-markdown-display';
import { colors, spacing, radius } from '../utils/theme';
import { Storage } from '../utils/storage';

export default function ChatScreen({ navigation }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef();

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const userId = await Storage.get('lifeos_user_id');
      const res = await fetch('https://lifeos-api-js9i.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, userId })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Network error. Try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0D0D1A', '#000000']} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <LinearGradient colors={['#6C63FF', '#43E8D8']} style={styles.botIcon}>
            <MaterialCommunityIcons name="brain" size={24} color="#FFF" />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>Assistant</Text>
            <Text style={styles.headerStatus}>Personalized for you</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => setMessages([])}>
          <Feather name="edit-3" size={18} color="#9090B0" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollRef}
        onContentSizeChange={() => scrollRef.current.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.chatScroll}
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
               <MaterialCommunityIcons name="brain" size={60} color="#6C63FF" />
            </View>
            <Text style={styles.emptyTitle}>How can I assist you?</Text>
            <Text style={styles.emptySub}>Your personal assistant, integrated with your tasks and finances.</Text>
            
            <View style={styles.promptGrid}>
                {['Analyze my spending', 'Prioritize my tasks', '5-min workout'].map((p, i) => (
                    <TouchableOpacity key={i} style={styles.promptBtn} onPress={() => setInput(p)}>
                        <Text style={styles.promptText}>{p}</Text>
                    </TouchableOpacity>
                ))}
            </View>
          </View>
        )}

        {messages.map((msg, i) => (
          <View key={i} style={[styles.msgWrapper, msg.role === 'user' ? styles.userWrapper : styles.aiWrapper]}>
            {msg.role === 'ai' && <Text style={styles.aiLabel}>ASSISTANT</Text>}
            <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              <Markdown style={mdStyles}>{msg.content}</Markdown>
            </View>
          </View>
        ))}

        {isLoading && (
          <View style={styles.thinking}>
             <ActivityIndicator color="#6C63FF" size="small" />
             <Text style={styles.thinkingText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
        <View style={styles.inputArea}>
          <View style={styles.inputWrapper}>
            <TextInput 
              style={styles.input} 
              placeholder="Ask anything..." 
              placeholderTextColor="#5A5A80"
              value={input}
              onChangeText={setInput}
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={isLoading}>
              <Feather name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}