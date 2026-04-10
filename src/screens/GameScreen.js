import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, ActivityIndicator, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, shadow } from '../utils/theme';
import { PrimaryButton, Card, Row, Chip } from '../components/shared';
// ✅ ORIGINAL LOGIC IMPORTS PRESERVED
import { Storage } from '../utils/storage'; 
import { io } from 'socket.io-client';
import NetInfo from '@react-native-community/netinfo';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const SOCKET_URL = 'https://lifeos-api-js9i.onrender.com';
let socket;

export default function GameScreen({ navigation }) {
  // ==========================================
  // STATE LOGIC
  // ==========================================
  const [isPro, setIsPro] = useState(false);
  const [playMode, setPlayMode] = useState('menu'); 
  const [difficulty, setDifficulty] = useState('Medium');
  const [board, setBoard] = useState(Array(9).fill(null));
  const [startingPlayer, setStartingPlayer] = useState('X');
  const [xIsNext, setXIsNext] = useState(true);
  const [multiState, setMultiState] = useState('menu'); 
  const [joinCode, setJoinCode] = useState('');
  const [myCode, setMyCode] = useState('');
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [playerSymbol, setPlayerSymbol] = useState(null); 
  const [isOffline, setIsOffline] = useState(false);

  // ==========================================
  // LISTENERS
  // ==========================================
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected;
      setIsOffline(offline);
      if (offline && playMode === 'multi') {
        setPlayMode('menu');
        fullReset();
        Alert.alert("You're Offline 📡", "Multiplayer connection lost. Returning to Menu!");
      }
    });
    return () => unsubscribe();
  }, [playMode]);

  useEffect(() => {
    const checkPro = async () => {
      const status = await Storage.get('lifeos_is_pro');
      setIsPro(!!status);
    };
    checkPro();

    if (playMode === 'multi' && !isOffline) {
      if (!socket || !socket.connected) {
        socket = io(SOCKET_URL, { transports: ['websocket'] });
      }
      socket.off('match_started');
      socket.off('opponent_moved');
      socket.on('match_started', (data) => {
        setBoard(Array(9).fill(null));
        setXIsNext(true); 
        setPlayerSymbol(data.symbol);
        setMultiState('playing');
      });
      socket.on('opponent_moved', (data) => {
        setBoard(data.board);
        setXIsNext(data.xIsNext); 
      });
      return () => {
        socket.off('match_started');
        socket.off('opponent_moved');
      };
    }
  }, [playMode, isOffline]);

  // ==========================================
  // LOGIC FUNCTIONS
  // ==========================================
  const calculateWinner = (squares) => {
    const lines = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
    }
    return null;
  };

  const getAvailableMoves = (squares) => squares.map((val, idx) => val === null ? idx : null).filter(val => val !== null);

  const fullReset = () => {
    if (socket && playMode === 'multi' && !isOffline) {
       socket.emit('leave_room', myCode || joinCode);
    }
    setBoard(Array(9).fill(null));
    setStartingPlayer('X');
    setXIsNext(true);
    setScores({ X: 0, O: 0, draws: 0 });
    setMultiState('menu');
    setMyCode('');
    setJoinCode('');
  };

  const createMultiplayerMatch = () => {
    if (isOffline) return Alert.alert("Offline", "Connection required.");
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setMyCode(code);
    setMultiState('waiting');
    socket.emit('create_room', code);
  };

  const handleJoinMatch = () => {
    if (isOffline) return Alert.alert("Offline", "Connection required.");
    if (joinCode.length === 6) {
      socket.emit('join_room', joinCode);
      setMultiState('waiting');
    } else {
      Alert.alert("Invalid Code", "Please enter a 6-digit code.");
    }
  };

  const nextRound = (winner, isDraw) => {
    if (winner) setScores(s => ({ ...s, [winner]: s[winner] + 1 }));
    else if (isDraw) setScores(s => ({ ...s, draws: s.draws + 1 }));
    const newStarter = startingPlayer === 'X' ? 'O' : 'X';
    setStartingPlayer(newStarter);
    setBoard(Array(9).fill(null));
    setXIsNext(newStarter === 'X'); 
    
    if (playMode === 'multi' && !isOffline) {
        socket.emit('make_move', { room: myCode || joinCode, board: Array(9).fill(null), xIsNext: newStarter === 'X' });
    }
  };

  const makeAIMove = () => {
    const available = getAvailableMoves(board);
    if (available.length === 0) return;
    let move = available[Math.floor(Math.random() * available.length)]; 

    if (difficulty !== 'Easy') {
        const findBest = (p) => {
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    const cp = [...board]; cp[i] = p;
                    if (calculateWinner(cp) === p) return i;
                }
            }
            return null;
        };
      let smartMove = findBest('O') ?? findBest('X');
      if (smartMove !== null) move = smartMove;
    }
    const newBoard = [...board];
    newBoard[move] = 'O';
    setBoard(newBoard);
    setXIsNext(true);
  };

  useEffect(() => {
    if (playMode === 'ai' && !xIsNext && !calculateWinner(board)) {
      const timer = setTimeout(() => makeAIMove(), 600); 
      return () => clearTimeout(timer);
    }
  }, [xIsNext, board]);

  const handlePress = (index) => {
    if (board[index] || calculateWinner(board)) return;
    if (playMode === 'multi' && (xIsNext ? 'X' : 'O') !== playerSymbol) return;

    const newBoard = [...board];
    newBoard[index] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    const nextTurn = !xIsNext;
    setXIsNext(nextTurn);
    if (playMode === 'multi' && !isOffline) {
      socket.emit('make_move', { room: myCode || joinCode, board: newBoard, xIsNext: nextTurn });
    }
  };

  const winner = calculateWinner(board);
  const isDraw = !winner && getAvailableMoves(board).length === 0;

  // ==========================================
  // UI RENDER
  // ==========================================
  return (
    <LinearGradient colors={['#0F172A', '#000000']} style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingTop: 60, paddingBottom: 100 }}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Game Center</Text>
          <Text style={styles.headerSub}>Take a quick break</Text>
        </View>

        {playMode === 'menu' ? (
          <View style={styles.menuGrid}>
            <TouchableOpacity onPress={() => { setPlayMode('ai'); setBoard(Array(9).fill(null)); }} style={styles.menuCard}>
              <View style={[styles.iconCircle, { backgroundColor: colors.secondary + '20' }]}>
                <MaterialCommunityIcons name="robot" size={32} color={colors.secondary} />
              </View>
              <Text style={styles.menuTitle}>Play vs AI</Text>
              <Text style={styles.menuSubText}>Practice offline</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { if (!isOffline) { setPlayMode('multi'); fullReset(); } }} style={[styles.menuCard, isOffline && { opacity: 0.5 }]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                <Feather name="users" size={32} color={colors.primary} />
              </View>
              <Text style={styles.menuTitle}>Play Online</Text>
              <Text style={styles.menuSubText}>Challenge friends</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.gameSection}>
            <View style={styles.gameHeader}>
              <TouchableOpacity 
                onPress={() => {
                    // ✅ PREVENTION: Don't allow leaving an active multiplayer match
                    if (playMode === 'multi' && !winner && !isDraw) {
                        return Alert.alert("Match in Progress", "You cannot leave until the game ends!");
                    }
                    setPlayMode('menu'); fullReset(); 
                }} 
                style={styles.iconBtn}
              >
                <Feather name="grid" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <View>
                <Text style={styles.gameTitle}>Tic-Tac-Toe</Text>
                <Text style={styles.gameSubText}>{playMode === 'ai' ? 'Solo Mode' : 'Online Match'}</Text>
              </View>
              <MaterialCommunityIcons name="trophy" size={24} color={winner ? '#FFD700' : colors.textMuted} />
            </View>

            <View style={styles.scoreboard}>
                <View style={styles.scoreItem}><Text style={styles.scoreLabel}>YOU (X)</Text><Text style={[styles.scoreValue, {color: colors.primary}]}>{scores.X}</Text></View>
                <View style={[styles.scoreItem, {borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#334155'}]}><Text style={styles.scoreLabel}>DRAWS</Text><Text style={[styles.scoreValue, {color: '#FFF'}]}>{scores.draws}</Text></View>
                <View style={styles.scoreItem}><Text style={styles.scoreLabel}>{playMode === 'ai' ? 'AI (O)' : 'OPP (O)'}</Text><Text style={[styles.scoreValue, {color: colors.secondary}]}>{scores.O}</Text></View>
            </View>

            {playMode === 'ai' && (
              <View style={styles.diffContainer}>
                {DIFFICULTIES.map(diff => (
                  <TouchableOpacity 
                    key={diff} 
                    onPress={() => {
                      if (diff === 'Hard' && !isPro) return Alert.alert("Pro Feature", "Hard AI requires LifeOS Pro.");
                      setDifficulty(diff); setBoard(Array(9).fill(null)); setXIsNext(true);
                    }}
                    style={[styles.diffBtn, difficulty === diff && { backgroundColor: colors.secondary }]}
                  >
                    <Text style={[styles.diffText, difficulty === diff && { color: '#FFF' }]}>{diff}</Text>
                    {diff === 'Hard' && !isPro && <Feather name="lock" size={10} color="#666" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {playMode === 'multi' && multiState === 'menu' && (
                <View style={styles.lobby}>
                    <TouchableOpacity style={styles.hostBtn} onPress={createMultiplayerMatch}><Text style={styles.hostBtnText}>Generate Match Code</Text></TouchableOpacity>
                    <View style={styles.joinRow}>
                        <TextInput style={styles.lobbyInput} placeholder="CODE" placeholderTextColor="#666" value={joinCode} onChangeText={setJoinCode} maxLength={6} autoCapitalize="characters" />
                        <TouchableOpacity style={styles.lobbyJoinBtn} onPress={handleJoinMatch}><Text style={styles.lobbyJoinText}>Join</Text></TouchableOpacity>
                    </View>
                </View>
            )}

            {multiState === 'waiting' && (
                <View style={styles.waitingRoom}>
                    <ActivityIndicator color={colors.secondary} />
                    <Text style={styles.waitingText}>{myCode ? "Share code:" : "Connecting..."}</Text>
                    {myCode && <View style={styles.codeBox}><Text style={styles.codeText}>{myCode}</Text></View>}
                    <TouchableOpacity onPress={() => setMultiState('menu')}><Text style={{color: colors.danger, marginTop: 15}}>Cancel Match</Text></TouchableOpacity>
                </View>
            )}

            {(playMode === 'ai' || multiState === 'playing') && (
              <View style={styles.boardWrapper}>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>
                        {winner ? `Winner: ${winner} 🎉` : isDraw ? "Draw! 🤝" : `Next: ${xIsNext ? 'X' : 'O'}`}
                    </Text>
                </View>

                <View style={styles.grid}>
                  {board.map((cell, i) => (
                    <TouchableOpacity key={i} onPress={() => handlePress(i)} disabled={!!cell || !!winner} style={styles.cell}>
                      {cell === 'X' && <Feather name="x" size={42} color={colors.primary} />}
                      {cell === 'O' && <Feather name="circle" size={34} color={colors.secondary} />}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ✅ LOCKING LOGIC: In multiplayer, show reset buttons ONLY when game ends */}
                {(winner || isDraw) ? (
                    <View style={{width: '100%', gap: 10, marginTop: 25}}>
                        <PrimaryButton label="Next Round" onPress={() => nextRound(winner, isDraw)} color={colors.primary} />
                        <TouchableOpacity onPress={() => { setPlayMode('menu'); fullReset(); }} style={styles.resetBtn}>
                            <Text style={styles.resetBtnText}>End Match</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    playMode === 'ai' && (
                        <TouchableOpacity style={styles.resetBtn} onPress={() => setBoard(Array(9).fill(null))}>
                            <Text style={styles.resetBtnText}>Restart Game</Text>
                        </TouchableOpacity>
                    )
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: 30 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#FFF', letterSpacing: -1 },
  headerSub: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  menuGrid: { gap: 15 },
  menuCard: { backgroundColor: '#1E293B', padding: 25, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  menuTitle: { fontSize: 18, fontWeight: '900', color: '#FFF' },
  menuSubText: { fontSize: 13, color: '#94A3B8', fontWeight: '600', marginTop: 4 },
  gameSection: { backgroundColor: '#1E293B', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#334155' },
  gameHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  iconBtn: { padding: 8, backgroundColor: '#0F172A', borderRadius: 10 },
  gameTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  gameSubText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
  scoreboard: { flexDirection: 'row', backgroundColor: '#0F172A', borderRadius: 15, padding: 10, marginBottom: 20 },
  scoreItem: { flex: 1, alignItems: 'center' },
  scoreLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8' },
  scoreValue: { fontSize: 20, fontWeight: '900' },
  diffContainer: { flexDirection: 'row', gap: 5, marginBottom: 20 },
  diffBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  diffText: { fontSize: 11, fontWeight: '900', color: '#94A3B8' },
  lobby: { gap: 15 },
  hostBtn: { backgroundColor: colors.primary, padding: 15, borderRadius: 12, alignItems: 'center' },
  hostBtnText: { color: '#FFF', fontWeight: '900' },
  joinRow: { flexDirection: 'row', gap: 10 },
  lobbyInput: { flex: 1, backgroundColor: '#0F172A', borderRadius: 12, padding: 12, color: '#FFF', fontWeight: '800', textAlign: 'center', borderWidth: 1, borderColor: '#334155' },
  lobbyJoinBtn: { backgroundColor: colors.secondary, paddingHorizontal: 25, borderRadius: 12, justifyContent: 'center' },
  lobbyJoinText: { color: '#FFF', fontWeight: '900' },
  waitingRoom: { alignItems: 'center', padding: 20 },
  waitingText: { color: '#94A3B8', marginVertical: 10, fontWeight: '700' },
  codeBox: { backgroundColor: colors.secondary + '20', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: colors.secondary },
  codeText: { fontSize: 24, fontWeight: '900', color: colors.secondary, letterSpacing: 5 },
  boardWrapper: { alignItems: 'center' },
  statusBadge: { backgroundColor: '#0F172A', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  statusBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  grid: { width: 280, height: 280, flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  cell: { width: 85, height: 85, backgroundColor: '#0F172A', borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  resetBtn: { padding: 15, borderRadius: 15, alignItems: 'center', backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', width: '100%', marginTop: 10 },
  resetBtnText: { color: '#94A3B8', fontWeight: '800' }
});