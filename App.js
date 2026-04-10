import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Screen Imports
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import TasksScreen from './src/screens/TasksScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import FocusScreen from './src/screens/FocusScreen';
import GameScreen from './src/screens/GameScreen';
import DataScreen from './src/screens/DataScreen';
import AuthScreen from './src/screens/AuthScreen';

import { colors } from './src/utils/theme';
import { Storage } from './src/utils/storage';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

// Premium Color Mapping from your template
const UI_COLORS = {
  Home: colors.primary,
  Tasks: '#43E8D8',
  Budget: '#FFD166',
  Chat: '#6C63FF',
  Focus: '#FF6584',
  Game: '#FF6584',
  Data: '#43E8D8'
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const userId = await Storage.get('lifeos_user_id');
    setIsAuthenticated(!!userId);
    setIsInitializing(false);
  }

  if (isInitializing) return null;

  if (!isAuthenticated) return <AuthScreen onComplete={() => setIsAuthenticated(true)} />;

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
          tabBarIcon: ({ focused }) => {
            const iconName = {
              Home: 'home', Chat: 'message-circle', Tasks: 'check-square',
              Budget: 'credit-card', Focus: 'clock', Game: 'crosshair'
            }[route.name];
            const color = focused ? UI_COLORS[route.name] : '#5A5A80';
            return (
              <View style={styles.tabIconWrapper}>
                <Feather name={iconName} size={22} color={color} />
                <Text style={[styles.tabLabel, { color, fontWeight: focused ? '900' : '600' }]}>{route.name}</Text>
              </View>
            );
          }
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Tasks" component={TasksScreen} />
        <Tab.Screen name="Budget" component={BudgetScreen} />
        <Tab.Screen name="Chat" component={ChatScreen} />
        <Tab.Screen name="Focus" component={FocusScreen} />
        <Tab.Screen name="Game" component={GameScreen} />
        <Tab.Screen name="Data" component={DataScreen} options={{ tabBarButton: () => null }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: 'rgba(21, 21, 37, 0.95)',
    borderTopColor: '#2A2A45',
    height: 85,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    elevation: 0,
    borderTopWidth: 1,
  },
  tabIconWrapper: { alignItems: 'center', justifyContent: 'center', paddingTop: 10 },
  tabLabel: { fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }
});