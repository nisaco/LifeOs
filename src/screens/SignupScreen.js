// src/screens/SignupScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../utils/theme';
import { Storage } from '../utils/storage';

export default function SignupScreen({ onComplete }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);

  async function handleSignup() {
    if (!name.trim() || !email.trim()) {
      setError('Please fill in your name and email.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://lifeos-api-js9i.onrender.com/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to server.');
      }

      await Storage.set('lifeos_user_id', data.userId);
      await Storage.set('lifeos_user_name', data.name);
      await Storage.set('lifeos_user_email', email.trim().toLowerCase());

      onComplete();
    } catch (err) {
      setError(err.message || 'Check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        
        <View style={styles.logoBg}>
          <Feather name="hexagon" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>Welcome to LifeOS</Text>
        <Text style={styles.subtitle}>Create your private workspace.</Text>

        <View style={styles.formContainer}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          <View style={[styles.inputWrapper, focusedInput === 'name' && { borderColor: colors.primary }]}>
            <Feather name="user" size={20} color={focusedInput === 'name' ? colors.primary : colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { outlineStyle: 'none' }]}
              placeholder="First Name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              onFocus={() => setFocusedInput('name')}
              onBlur={() => setFocusedInput(null)}
              autoCapitalize="words"
            />
          </View>

          <View style={[styles.inputWrapper, focusedInput === 'email' && { borderColor: colors.primary }]}>
            <Feather name="mail" size={20} color={focusedInput === 'email' ? colors.primary : colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { outlineStyle: 'none' }]}
              placeholder="Email Address"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity 
            style={[styles.btn, (!name || !email) && styles.btnDisabled]} 
            onPress={handleSignup} 
            disabled={!name || !email || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Get Started</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          Your data is stored securely and synced across your sessions.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  logoBg: { width: 90, height: 90, borderRadius: 28, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow.md },
  title: { fontSize: 28, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: spacing.xs },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: spacing.xxl },
  
  formContainer: { width: '100%', maxWidth: 360, backgroundColor: colors.bgElevated, padding: spacing.xl, borderRadius: radius.xl, ...shadow.sm },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '600', marginBottom: spacing.md, textAlign: 'center' },
  
  // ✅ Removed outer border to keep it clean, added bottom border logic
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', borderBottomWidth: 1.5, borderColor: colors.border, marginBottom: spacing.lg, paddingHorizontal: 4 },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, color: colors.textPrimary, fontSize: 16, fontWeight: '600', paddingVertical: 16 },
  
  btn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  
  footerText: { marginTop: spacing.xxl, fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
});