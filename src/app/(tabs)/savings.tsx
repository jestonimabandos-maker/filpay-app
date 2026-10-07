import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle } from 'react-native-svg';
import PhoneStatusBar from '@/components/PhoneStatusBar';
import BottomNav from '@/components/BottomNav';
import { themeSheet, C } from '@/theme';
import { useFilPay, formatPeso, type SavingsGoal } from '@/store';
import { getAccount } from '@/services/db';
import { QUICK_AMOUNTS, parseAmount } from '@/lib/ui';

// 6. Savings (1:229)

/** "See all" cycles the Savings Goals list through these three scopes. */
const FILTER_LABEL = { all: 'See all', active: 'Active only', done: 'Completed' } as const;
const FILTER_NEXT = { all: 'active', active: 'done', done: 'all' } as const;
type GoalFilter = keyof typeof FILTER_LABEL;

/**
 * Daily Interest Growth — same polyline and axes as the Figma frame, but the
 * series is reconstructed from `savings_goals` (total saved + goal progress).
 */
function useSavingsChart(goals: SavingsGoal[]) {
  return useMemo(() => {
    const total = goals.reduce((sum, g) => sum + g.current, 0);
    const avgPct = goals.length
      ? goals.reduce((sum, g) => sum + Math.min(100, Math.max(0, g.pct)), 0) / goals.length
      : 100;

    // Walk back from today's goal progress: the window opens one week of growth
    // below it, so the line always climbs into the current savings total.
    const startFactor = Math.max(0, avgPct - 7) / 100;
    const vals = Array.from({ length: 7 }, (_, i) =>
      Math.round(total * (startFactor + (1 - startFactor) * (i / 6)) * 100) / 100,
    );

    const today = new Date();
    const labels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      labels.push(d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }));
    }

    const todayGrowth = Math.round((vals[6] - vals[5]) * 100) / 100;
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const yOf = (v: number) => (hi - lo < 0.005 ? 46 : 66 - ((v - lo) / (hi - lo)) * 40);
    const xs = [20, 60, 100, 140, 180, 220, 260];

    return {
      labels,
      ys: vals.map(yOf),
      points: xs.map((x, i) => `${x},${yOf(vals[i])}`).join(' '),
      todayText: `${todayGrowth >= 0 ? '+' : ''}${formatPeso(todayGrowth)} today`,
    };
  }, [goals]);
}

export default function Savings() {
  const {
    userId, goals, walletBalance,
    depositToGoal, withdrawFromGoal, hiddenBalance, toggleBalance, savingsBalance: fallbackSavings,
  } = useFilPay();

  const [goalId, setGoalId] = useState<string | null>(null);
  const [mode, setMode] = useState<'detail' | 'add' | 'withdraw'>('detail');
  const [amount, setAmount] = useState('');
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('all');

  // CLO 2.3 — SELECT savingsBalance FROM accounts WHERE userId = ?
  const account = userId !== null ? getAccount(userId) : null;
  const savingsBalance = account ? account.savingsBalance : fallbackSavings;

  // "See all" filters the goal list rather than navigating away from it.
  const visibleGoals = goals.filter((g) =>
    goalFilter === 'all' ? true : goalFilter === 'active' ? g.pct < 100 : g.pct >= 100,
  );

  const goal = goals.find((g) => g.id === goalId) ?? null;
  const chart = useSavingsChart(goals);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const openDetail = (id: string) => {
    setGoalId(id);
    setMode('detail');
    setAmount('');
  };
  const openAdd = (id: string) => {
    setGoalId(id);
    setMode('add');
    setAmount('');
  };
  const close = () => {
    setGoalId(null);
    setAmount('');
  };

  const confirm = () => {
    if (!goal) return;
    const v = parseAmount(amount);
    if (!v || v <= 0) return Alert.alert('Invalid', 'Enter amount.');
    if (mode === 'add') {
      const res = depositToGoal(goal.id, v);
      if (!res.ok) return Alert.alert('Cannot deposit', res.message);
      close();
      Alert.alert('Saved', res.message);
    } else {
      const res = withdrawFromGoal(goal.id, v);
      if (!res.ok) return Alert.alert('Cannot withdraw', res.message);
      close();
      Alert.alert('Withdrawn', res.message);
    }
  };

  const subtitleFor = (pct: number, target: number, current: number) =>
    pct >= 100 ? 'Completed' : `${formatPeso(Math.max(0, target - current))} to go`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
        <View style={styles.header}>
          <PhoneStatusBar dark />
          <View style={styles.nav}>
            <Pressable onPress={goBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
              <Feather name="arrow-left" size={22} color={C.textOnPrimary} />
            </Pressable>
            <Text style={styles.title}>Savings</Text>
            <View style={{ width: 22 }} />
          </View>
          <View style={styles.balCard}>
            <View style={styles.balLabelRow}>
              <Text style={styles.balLabel}>Total Savings Balance</Text>
              <Pressable
                onPress={toggleBalance}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={hiddenBalance ? 'Show balance' : 'Hide balance'}
              >
                <Feather name={hiddenBalance ? 'eye-off' : 'eye'} size={16} color={C.textOnPrimary} />
              </Pressable>
            </View>
            <Text style={styles.balValue}>{hiddenBalance ? '₱' + '•'.repeat(6) : formatPeso(savingsBalance)}</Text>
          </View>
        </View>

        <View style={styles.chart}>
          <Text style={styles.chartTitle}>Daily Interest Growth</Text>
          <Text style={styles.chartSub}>{chart.todayText}</Text>
          <Svg width={280} height={90} style={{ marginTop: 8 }}>
            <Polyline
              points={chart.points}
              fill="none"
              stroke={C.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {chart.ys.map((cy, i) => (
              <Circle
                key={i}
                cx={20 + i * 40}
                cy={cy}
                r={i === 6 ? 5 : 4}
                fill={i === 6 ? C.accent : C.surface}
                stroke={i === 6 ? C.accent : C.primary}
                strokeWidth={2}
              />
            ))}
          </Svg>
          <View style={styles.days}>
            {chart.labels.map((d) => (
              <Text key={d} style={styles.day}>{d}</Text>
            ))}
          </View>
        </View>

        <View style={styles.secRow}>
          <Text style={styles.secTitle}>Savings Goals</Text>
          <Pressable
            onPress={() => setGoalFilter((f) => FILTER_NEXT[f])}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Goal filter: ${FILTER_LABEL[goalFilter]}. Tap to change.`}
          >
            <Text style={styles.seeAll}>{FILTER_LABEL[goalFilter]}</Text>
          </Pressable>
        </View>

        {visibleGoals.length === 0 ? (
          <Text style={styles.goalEmpty}>No goals match this filter</Text>
        ) : null}

        {visibleGoals.map((g) => {
          const pct = Math.min(100, Math.max(0, g.pct));
          return (
            <Pressable key={g.id} style={styles.goal} onPress={() => openDetail(g.id)} accessibilityRole="button">
              <View style={styles.goalIcon}><Text style={styles.goalEmoji}>{g.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={styles.goalTop}>
                  <Text style={styles.goalName}>{g.name}</Text>
                  <Text style={styles.goalPct}>{g.pct}%</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.goalVals}>{formatPeso(g.current)} / {formatPeso(g.target)}</Text>
                <Text style={[styles.goalSub, g.pct >= 100 && styles.goalDone]}>
                  {subtitleFor(g.pct, g.target, g.current)}
                </Text>
              </View>
              <Pressable
                style={styles.addBtn}
                onPress={() => openAdd(g.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Add money to ${g.name}`}
              >
                <Feather name="plus" size={16} color={C.primary} />
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>
      <BottomNav active="savings" />

      <Modal visible={!!goalId} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.bg} onPress={close}>
          <Pressable style={styles.modal}>
            {goal ? (
              <>
                <View style={styles.mHead}>
                  <View style={styles.goalIcon}><Text style={styles.goalEmoji}>{goal.icon}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mTitle}>{goal.name}</Text>
                    <Text style={styles.mSub}>{formatPeso(goal.current)} of {formatPeso(goal.target)}</Text>
                  </View>
                  <Text style={styles.goalPct}>{goal.pct}%</Text>
                  <Pressable onPress={close} hitSlop={10} style={styles.mClose} accessibilityRole="button" accessibilityLabel="Close">
                    <Feather name="x" size={18} color={C.textSecondary} />
                  </Pressable>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, goal.pct))}%` }]} />
                </View>
                <Text style={styles.goalSub}>{subtitleFor(goal.pct, goal.target, goal.current)}</Text>

                {mode === 'detail' ? (
                  <>
                    <Pressable style={styles.confirm} onPress={() => setMode('add')} accessibilityRole="button">
                      <Text style={styles.confirmText}>Add money</Text>
                    </Pressable>
                    <Pressable style={styles.secondary} onPress={() => setMode('withdraw')} accessibilityRole="button">
                      <Text style={styles.secondaryText}>Withdraw</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.mLabel}>{mode === 'add' ? 'Amount to add (₱)' : 'Amount to withdraw (₱)'}</Text>
                    <TextInput
                      style={styles.input}
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={C.textSecondary}
                    />
                    <View style={styles.chips}>
                      {QUICK_AMOUNTS.map((q) => (
                        <Pressable
                          key={q}
                          style={[styles.chip, parseAmount(amount) === q && styles.chipOn]}
                          onPress={() => setAmount(String(q))}
                          accessibilityRole="button"
                        >
                          <Text style={[styles.chipText, parseAmount(amount) === q && styles.chipTextOn]}>₱{q}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={styles.mBal}>
                      {mode === 'add' ? `Wallet: ${formatPeso(walletBalance)}` : `In goal: ${formatPeso(goal.current)}`}
                    </Text>
                    <Pressable style={styles.confirm} onPress={confirm} accessibilityRole="button">
                      <Text style={styles.confirmText}>{mode === 'add' ? 'Deposit' : 'Withdraw'}</Text>
                    </Pressable>
                    <Pressable style={styles.backLink} onPress={() => setMode('detail')} accessibilityRole="button">
                      <Text style={styles.backText}>Back to goal</Text>
                    </Pressable>
                  </>
                )}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = themeSheet(() => ({
  safe: { flex: 1, backgroundColor: C.background },
  header: { backgroundColor: C.primary, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingBottom: 14, paddingHorizontal: 20 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  title: { flex: 1, color: C.textOnPrimary, fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  balCard: { backgroundColor: C.primaryDark, borderRadius: 18, padding: 16, marginTop: 8, minHeight: 92 },
  balLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balLabel: { color: C.textOnPrimary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  balValue: { color: C.textOnPrimary, fontSize: 28, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 6 },
  chart: { backgroundColor: C.surface, borderRadius: 18, marginHorizontal: 20, marginTop: 14, padding: 16 },
  chartTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  chartSub: { color: C.primary, fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium', marginTop: 4 },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  day: { color: C.textSecondary, fontSize: 9, fontFamily: 'Inter_400Regular' },
  secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 16 },
  secTitle: { fontSize: 14, fontWeight: '600', color: C.textPrimary, fontFamily: 'Inter_600SemiBold' },
  seeAll: { fontSize: 12, fontWeight: '500', color: C.primary, fontFamily: 'Inter_500Medium' },
  goalEmpty: { fontSize: 12, color: C.textSecondary, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 18 },
  goal: { flexDirection: 'row', gap: 12, backgroundColor: C.surface, borderRadius: 18, marginHorizontal: 20, marginTop: 10, padding: 14, alignItems: 'center' },
  goalIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  goalEmoji: { fontSize: 18, color: C.primary, fontFamily: 'Inter_500Medium' },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between' },
  goalName: { fontSize: 13, fontWeight: '600', color: C.textPrimary, fontFamily: 'Inter_600SemiBold' },
  goalPct: { fontSize: 12, fontWeight: '600', color: C.primary, fontFamily: 'Inter_600SemiBold' },
  track: { height: 6, borderRadius: 3, backgroundColor: C.iconBg, marginTop: 8 },
  fill: { height: 6, borderRadius: 3, backgroundColor: C.accent },
  goalVals: { fontSize: 11, color: C.textSecondary, marginTop: 6, fontFamily: 'Inter_400Regular' },
  goalSub: { fontSize: 11, color: C.primary, marginTop: 3, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  goalDone: { color: C.success },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  bg: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  mHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  mTitle: { fontSize: 16, fontWeight: '600', color: C.textPrimary, fontFamily: 'Inter_600SemiBold' },
  mSub: { color: C.textSecondary, marginTop: 4, fontSize: 12, fontFamily: 'Inter_400Regular' },
  mLabel: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 16, marginBottom: 6 },
  mBal: { color: C.textSecondary, fontSize: 12, marginTop: 10, fontFamily: 'Inter_400Regular' },
  input: { borderWidth: 1, borderColor: C.border, backgroundColor: C.inputBg, borderRadius: 14, padding: 14, fontSize: 20, textAlign: 'center', marginTop: 2, fontFamily: 'Inter_500Medium' },
  chips: { flexDirection: 'row', gap: 6, marginTop: 10 },
  chip: { flex: 1, height: 30, borderRadius: 13, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: C.primary },
  chipText: { color: C.primary, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  chipTextOn: { color: C.textOnPrimary },
  confirm: { backgroundColor: C.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  confirmText: { color: C.textOnPrimary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  secondary: { backgroundColor: C.iconBg, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { color: C.primary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  backLink: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  backText: { color: C.textSecondary, fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium' },
}));
