// src/screens/AuthScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../utils/theme';
import { Storage } from '../utils/storage';

export default function AuthScreen({ onComplete }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async () => {
    if (!username || !password || (!isLogin && (!name || !email))) {
      Alert.alert("Missing Fields", "Please fill in all required information.");
      return;
    }

    setLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    const payload = isLogin ? { username, password } : { username, name, email, password };

    try {
      const response = await fetch(`https://lifeos-api-js9i.onrender.com${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Auth Error", data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      // ✅ Save Session Data for Mass Production Persistence
      await Storage.set('lifeos_user_id', data.user.username);
      await Storage.set('lifeos_user_name', data.user.name);
      await Storage.set('lifeos_user_email', data.user.email);
      await Storage.set('lifeos_is_pro', data.user.isPro);

      onComplete(); // Navigate to Home
    } catch (err) {
      Alert.alert("Connection Error", "The server is currently waking up. Try again in 5 seconds.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Feather name="cpu" size={40} color={colors.primary} />
        </View>
        
        <Text style={styles.title}>{isLogin ? "Welcome Back" : "Join LifeOS"}</Text>
        <Text style={styles.subtitle}>{isLogin ? "Log in to sync your life." : "Create your unique workspace."}</Text>

        <View style={styles.inputGroup}>
          <View style={styles.inputWrapper}>
            <Feather name="user" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Username" 
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          {!isLogin && (
            <>
              <View style={styles.inputWrapper}>
                <Feather name="edit-3" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Full Name" 
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
              <View style={styles.inputWrapper}>
                <Feather name="mail" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Email Address" 
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </>
          )}

          <View style={styles.inputWrapper}>
            <Feather name="lock" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Password" 
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>{isLogin ? "Login" : "Sign Up"}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.toggle}>
          <Text style={styles.toggleText}>
            {isLogin ? "New user? " : "Already have an account? "}
            <Text style={styles.toggleLink}>{isLogin ? "Sign Up" : "Login"}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.bg, 
    justifyContent: 'center', 
    padding: spacing.lg 
  },
  card: { 
    backgroundColor: colors.bgCard, 
    borderRadius: radius.xxl, 
    padding: spacing.xl, 
    // Removed border here as requested
    borderWidth: 0, 
    ...shadow.md 
  },
  iconContainer: { 
    alignSelf: 'center', 
    marginBottom: spacing.lg, 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    backgroundColor: colors.primary + '15', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: colors.textPrimary, 
    textAlign: 'center', 
    marginBottom: 4 
  },
  subtitle: { 
    fontSize: 14, 
    color: colors.textSecondary, 
    textAlign: 'center', 
    marginBottom: spacing.xl 
  },
  inputGroup: { 
    gap: spacing.md, 
    marginBottom: spacing.xl 
  },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    // ✅ No outline/border
    borderWidth: 0, 
    // ✅ Subtle dark background to define the field without a line
    backgroundColor: colors.bg, 
    borderRadius: radius.lg, 
    paddingHorizontal: spacing.md 
  },
  inputIcon: { 
    marginRight: spacing.sm 
  },
  input: { 
    flex: 1, 
    height: 50, 
    color: colors.textPrimary, 
    fontSize: 16,
    // ✅ Specifically for Web/Chrome to remove the "focus" blue outline
    outlineStyle: 'none' 
  },
  button: { 
    backgroundColor: colors.primary, 
    height: 55, 
    borderRadius: radius.lg, 
    alignItems: 'center', 
    justifyContent: 'center', 
    ...shadow.sm 
  },
  buttonText: { 
    color: '#000', 
    fontSize: 18, 
    fontWeight: '800' 
  },
  toggle: { 
    marginTop: spacing.lg, 
    alignItems: 'center' 
  },
  toggleText: { 
    color: colors.textSecondary, 
    fontSize: 14 
  },
  toggleLink: { 
    color: colors.primary, 
    fontWeight: '800' 
  }
});