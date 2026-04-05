// App.js
import React, { useState, useEffect } from 'react'; 
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Screen Imports
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import TasksScreen from './src/screens/TasksScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import HealthScreen from './src/screens/HealthScreen';
import FocusScreen from './src/screens/FocusScreen';
import GameScreen from './src/screens/GameScreen';
import WelcomeScreen from './src/screens/WelcomeScreen'; 
import AuthScreen from './src/screens/AuthScreen';
//import SignupScreen from './src/screens/SignupScreen'; 

// Utility Imports
import { colors } from './src/utils/theme';
import { Storage } from './src/utils/storage'; 

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home:   { icon: 'home', label: 'Home', color: colors.primary },
  Chat:   { icon: 'message-circle', label: 'AI', color: colors.chat },
  Tasks:  { icon: 'check-square', label: 'Tasks', color: colors.tasks },
  Budget: { icon: 'credit-card', label: 'Budget', color: colors.budget },
  Health: { icon: 'activity', label: 'Health', color: colors.health },
  Focus:  { icon: 'clock', label: 'Focus', color: colors.focus },
  Game:   { icon: 'crosshair', label: 'Games', color: colors.secondary },
};

function TabIcon({ name, focused }) {
  const { icon, label, color } = TAB_ICONS[name];
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 12 }}>
      <Feather name={icon} size={22} color={focused ? color : colors.textMuted} />
      <Text style={{ fontSize: 10, fontWeight: focused ? '800' : '600', color: focused ? color : colors.textMuted, marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ✅ Persists session and listens for Auth changes
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const savedUserId = await Storage.get('lifeos_user_id');
    if (savedUserId) {
      setIsAuthenticated(true);
      // If returning user, skip welcome after the first load of the session
      setShowWelcome(false); 
    } else {
      setIsAuthenticated(false);
    }
    setIsInitializing(false);
  }

  if (isInitializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style="light" />
        <SignupScreen onComplete={() => {
          setIsAuthenticated(true);
          setShowWelcome(true); // Show welcome only for brand new signups
        }} />
      </>
    );
  }

  if (showWelcome) {
    return (
      <>
        <StatusBar style="light" />
        <WelcomeScreen onComplete={() => setShowWelcome(false)} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: colors.bgCard,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 72,
            paddingBottom: 12,
          },
          tabBarIcon: ({ focused }) => (
            <TabIcon name={route.name} focused={focused} />
          ),
        })}
      >
        <Tab.Screen name="Home"   component={HomeScreen} />
        <Tab.Screen name="Chat"   component={ChatScreen} />
        <Tab.Screen name="Tasks"  component={TasksScreen} />
        <Tab.Screen name="Budget" component={BudgetScreen} />
        <Tab.Screen name="Health" component={HealthScreen} />
        <Tab.Screen name="Focus"  component={FocusScreen} />
        <Tab.Screen name="Game"   component={GameScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}