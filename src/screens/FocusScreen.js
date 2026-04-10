import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

export default function FocusScreen() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) setSeconds(seconds - 1);
        else if (minutes > 0) { setMinutes(minutes - 1); setSeconds(59); }
        else setIsActive(false);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds, minutes]);

  const progress = 1 - (minutes * 60 + seconds) / (25 * 60);

  return (
    <LinearGradient colors={['#0D0D1A', '#000000']} style={styles.container}>
      <View style={styles.timerHeader}>
         <View style={styles.targetIcon}><Feather name="target" size={28} color="#FFF" /></View>
         <Text style={styles.focusTitle}>Focus</Text>
         <Text style={styles.focusSub}>Session Planner</Text>
      </View>

      <View style={styles.timerContainer}>
         <Svg width="280" height="280" viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="45" stroke="#151525" strokeWidth="4" fill="none" />
            <Circle 
              cx="50" cy="50" r="45" stroke="#FF6584" strokeWidth="4" fill="none" 
              strokeDasharray="282.6" strokeDashoffset={282.6 * (1 - progress)}
              strokeLinecap="round" transform="rotate(-90 50 50)"
            />
         </Svg>
         <View style={styles.timeWrapper}>
            <Text style={styles.timeText}>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</Text>
            <Text style={styles.modeText}>FOCUS TIME</Text>
         </View>
      </View>

      <TouchableOpacity style={styles.playBtn} onPress={() => setIsActive(!isActive)}>
          <Feather name={isActive ? "pause" : "play"} size={32} color="#FFF" />
      </TouchableOpacity>
      
      <View style={styles.timelineArea}>
          <Text style={styles.tlLabel}>SESSION TIMELINE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[styles.tlStep, {borderColor: '#FF6584', backgroundColor: '#FF658420'}]}>
                  <Text style={styles.stepType}>WORK</Text>
                  <Text style={styles.stepDur}>25m</Text>
              </View>
              <View style={styles.tlStep}>
                  <Text style={styles.stepType}>BREAK</Text>
                  <Text style={styles.stepDur}>5m</Text>
              </View>
          </ScrollView>
      </View>
    </LinearGradient>
  );
}