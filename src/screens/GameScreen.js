// src/screens/GameScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../utils/theme';
import { PrimaryButton, Card, Row, Chip } from '../components/shared';
import { useAudioPlayer } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export default function GameScreen() {
  const [playMode, setPlayMode] = useState('ai'); 
  const [difficulty, setDifficulty] = useState('Medium');
  const [board, setBoard] = useState(Array(9).fill(null));
  
  // ✅ New States for Alternating Turns
  const [startingPlayer, setStartingPlayer] = useState('X');
  const [xIsNext, setXIsNext] = useState(true);
  
  const [multiState, setMultiState] = useState('menu'); 
  const [joinCode, setJoinCode] = useState('');
  const [myCode, setMyCode] = useState('');
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });

  const calculateWinner = (squares) => {
    const lines = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
    }
    return null;
  };

  const getAvailableMoves = (squares) => squares.map((val, idx) => val === null ? idx : null).filter(val => val !== null);

  useEffect(() => {
    // If it is the AI's turn (xIsNext is false) and the game isn't over, make a move!
    if (playMode === 'ai' && !xIsNext && !calculateWinner(board)) {
      const timer = setTimeout(() => makeAIMove(), 600); 
      return () => clearTimeout(timer);
    }
  }, [xIsNext, board, playMode]);

  const makeAIMove = () => {
    const available = getAvailableMoves(board);
    if (available.length === 0) return;

    let move = available[Math.floor(Math.random() * available.length)]; 

    if (difficulty === 'Medium' || difficulty === 'Hard') {
      let smartMove = findBestMove('O') ?? findBestMove('X');
      if (smartMove === null && difficulty === 'Hard') {
        if (board[4] === null) smartMove = 4; 
        else {
          const corners = [0, 2, 6, 8].filter(c => board[c] === null);
          if (corners.length > 0) smartMove = corners[Math.floor(Math.random() * corners.length)];
        }
      }
      if (smartMove !== null && (difficulty === 'Hard' || Math.random() > 0.3)) {
        move = smartMove;
      }
    }

    const newBoard = [...board];
    newBoard[move] = 'O';
    setBoard(newBoard);
    setXIsNext(true); // Passes turn back to user
  };

  const findBestMove = (player) => {
    const lines = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      const vals = [board[a], board[b], board[c]];
      if (vals.filter(v => v === player).length === 2 && vals.filter(v => v === null).length === 1) {
        return [a, b, c].find(idx => board[idx] === null);
      }
    }
    return null;
  };

  const handlePress = (index) => {
    if (board[index] || calculateWinner(board)) return;
    if (playMode === 'ai' && !xIsNext) return; 

    const newBoard = [...board];
    newBoard[index] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    setXIsNext(!xIsNext);
  };

  const fullReset = () => {
    setBoard(Array(9).fill(null));
    setStartingPlayer('X');
    setXIsNext(true);
    setScores({ X: 0, O: 0, draws: 0 });
    setMultiState('menu');
  };

  // ✅ Alternates who starts the next round
  const nextRound = (winner, isDraw) => {
    if (winner) {
      setScores(s => ({ ...s, [winner]: s[winner] + 1 }));
    } else if (isDraw) {
      setScores(s => ({ ...s, draws: s.draws + 1 }));
    }
    
    // Swap the starting player
    const newStarter = startingPlayer === 'X' ? 'O' : 'X';
    setStartingPlayer(newStarter);
    
    setBoard(Array(9).fill(null));
    setXIsNext(newStarter === 'X'); 
  };

  const createMultiplayerMatch = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setMyCode(code);
    setMultiState('waiting');
  };

  const winner = calculateWinner(board);
  const isDraw = !winner && getAvailableMoves(board).length === 0;

  const renderSquare = (index) => {
    const value = board[index];
    return (
      <TouchableOpacity
        style={styles.square}
        onPress={() => handlePress(index)}
        activeOpacity={0.6}
      >
        {value === 'X' && <Feather name="x" size={48} color={colors.primary} />}
        {value === 'O' && <Feather name="circle" size={40} color={colors.secondary} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tic-Tac-Toe</Text>
        <Text style={styles.headerSub}>Challenge the AI or play with a friend</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md }}>
        
        <Row style={styles.modeToggle}>
          <TouchableOpacity onPress={() => { setPlayMode('ai'); fullReset(); }} style={[styles.modeBtn, playMode === 'ai' && styles.modeBtnActive]}>
            <Feather name="cpu" size={18} color={playMode === 'ai' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.modeText, playMode === 'ai' && { color: '#fff' }]}>Solo vs AI</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setPlayMode('multi'); fullReset(); }} style={[styles.modeBtn, playMode === 'multi' && styles.modeBtnActive]}>
            <Feather name="globe" size={18} color={playMode === 'multi' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.modeText, playMode === 'multi' && { color: '#fff' }]}>Online Match</Text>
          </TouchableOpacity>
        </Row>

        {playMode === 'ai' && (
          <Row style={{ justifyContent: 'center', marginBottom: spacing.lg, gap: spacing.sm }}>
            {DIFFICULTIES.map(diff => (
              <Chip 
                key={diff} label={diff} active={difficulty === diff} 
                color={diff === 'Easy' ? colors.health : diff === 'Medium' ? colors.warning : colors.danger} 
                onPress={() => { setDifficulty(diff); fullReset(); }} 
              />
            ))}
          </Row>
        )}

        {playMode === 'multi' && multiState === 'menu' && (
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={styles.lobbyTitle}>Create or Join a Match</Text>
            <PrimaryButton label="Generate Match Code" onPress={createMultiplayerMatch} color={colors.primary} style={{ marginBottom: spacing.xl }} />
            
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
              <Text style={styles.lobbySub}>Have a code from a friend?</Text>
              <Row style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                <TextInput
                  style={styles.codeInput} value={joinCode} onChangeText={setJoinCode}
                  placeholder="Enter 6-digit code..." placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters" maxLength={6}
                />
                <TouchableOpacity style={styles.joinBtn} onPress={() => setMultiState('waiting')}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Join</Text>
                </TouchableOpacity>
              </Row>
            </View>
          </Card>
        )}

        {playMode === 'multi' && multiState === 'waiting' && (
          <Card style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <ActivityIndicator size="large" color={colors.secondary} style={{ marginBottom: spacing.lg }} />
            <Text style={styles.lobbyTitle}>Waiting for opponent...</Text>
            {myCode ? (
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{myCode}</Text>
              </View>
            ) : null}
            <Text style={[styles.lobbySub, { textAlign: 'center', marginTop: spacing.sm }]}>
              {myCode ? "Share this code with your friend to connect." : "Attempting to connect to host..."}
            </Text>
            <TouchableOpacity onPress={() => setMultiState('menu')} style={{ marginTop: spacing.xl }}>
              <Text style={{ color: colors.danger, fontWeight: '700' }}>Cancel Match</Text>
            </TouchableOpacity>
          </Card>
        )}

        {(playMode === 'ai' || (playMode === 'multi' && multiState === 'playing')) && (
          <Card style={styles.gameCard}>
            
            <Row style={styles.scoreboard}>
              <View style={styles.scoreCol}>
                <Text style={styles.scoreLabel}>Player (X)</Text>
                <Text style={[styles.scoreValue, { color: colors.primary }]}>{scores.X}</Text>
              </View>
              <View style={[styles.scoreCol, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border }]}>
                <Text style={styles.scoreLabel}>Draws</Text>
                <Text style={[styles.scoreValue, { color: colors.textSecondary }]}>{scores.draws}</Text>
              </View>
              <View style={styles.scoreCol}>
                <Text style={styles.scoreLabel}>{playMode === 'ai' ? 'AI (O)' : 'Opponent (O)'}</Text>
                <Text style={[styles.scoreValue, { color: colors.secondary }]}>{scores.O}</Text>
              </View>
            </Row>

            <View style={styles.statusBox}>
              {winner ? (
                <Text style={[styles.statusText, { color: winner === 'X' ? colors.primary : colors.secondary }]}>
                  {winner === 'X' ? 'Player X Wins! 🎉' : 'Player O Wins! 🤖'}
                </Text>
              ) : isDraw ? (
                <Text style={[styles.statusText, { color: colors.warning }]}>It's a Draw! 🤝</Text>
              ) : (
                <Row style={{ justifyContent: 'center', gap: 8 }}>
                  <Text style={styles.statusText}>
                    {xIsNext ? 'Your Turn (X)' : (playMode === 'ai' ? 'AI is thinking...' : 'Opponent Turn (O)')}
                  </Text>
                  {!xIsNext && playMode === 'ai' && <ActivityIndicator size="small" color={colors.secondary} />}
                </Row>
              )}
            </View>

            <View style={styles.grid}>
              <View style={styles.row}>
                {renderSquare(0)}<View style={styles.vDivider} />{renderSquare(1)}<View style={styles.vDivider} />{renderSquare(2)}
              </View>
              <View style={styles.hDivider} />
              <View style={styles.row}>
                {renderSquare(3)}<View style={styles.vDivider} />{renderSquare(4)}<View style={styles.vDivider} />{renderSquare(5)}
              </View>
              <View style={styles.hDivider} />
              <View style={styles.row}>
                {renderSquare(6)}<View style={styles.vDivider} />{renderSquare(7)}<View style={styles.vDivider} />{renderSquare(8)}
              </View>
            </View>

            {(winner || isDraw) && (
              <View style={{ width: '100%', marginTop: spacing.xl, gap: spacing.sm }}>
                <PrimaryButton 
                  label="Next Round" 
                  onPress={() => nextRound(winner, isDraw)} 
                  color={colors.primary} 
                />
                <PrimaryButton 
                  label="End Match" 
                  onPress={fullReset} 
                  color={colors.bgElevated} 
                  style={{ borderWidth: 1, borderColor: colors.border }} 
                />
              </View>
            )}
          </Card>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.md },
  headerTitle: { fontSize: 28, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  
  modeToggle: { backgroundColor: colors.bgCard, borderRadius: radius.full, padding: 4, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radius.full, gap: 8 },
  modeBtnActive: { backgroundColor: colors.secondary, ...shadow.sm },
  modeText: { fontSize: 14, fontWeight: '800', color: colors.textSecondary },

  lobbyTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.md, textAlign: 'center' },
  lobbySub: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  codeInput: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: 16, fontWeight: '800', padding: spacing.md, textAlign: 'center', letterSpacing: 2 },
  joinBtn: { backgroundColor: colors.secondary, borderRadius: radius.md, paddingHorizontal: spacing.xl, justifyContent: 'center', alignItems: 'center' },
  codeBox: { backgroundColor: colors.secondary + '20', paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.secondary + '50' },
  codeText: { fontSize: 32, fontWeight: '900', color: colors.secondary, letterSpacing: 4 },

  gameCard: { alignItems: 'center', paddingVertical: spacing.xl },
  
  scoreboard: { width: '100%', backgroundColor: colors.bgElevated, borderRadius: radius.lg, paddingVertical: spacing.sm, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border },
  scoreCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scoreLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreValue: { fontSize: 24, fontWeight: '900', marginTop: 4 },

  statusBox: { marginBottom: spacing.lg, height: 30, justifyContent: 'center' },
  statusText: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  grid: { width: 280, height: 280 },
  row: { flex: 1, flexDirection: 'row' },
  square: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard },
  vDivider: { width: 6, backgroundColor: colors.border, borderRadius: 3 },
  hDivider: { height: 6, backgroundColor: colors.border, borderRadius: 3 },
});