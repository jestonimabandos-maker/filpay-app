import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhoneStatusBar from '@/components/PhoneStatusBar';
import BottomNav from '@/components/BottomNav';
import { themeSheet, C } from '@/theme';
import { useFilPay, formatPeso, mapTx, type Tx } from '@/store';
import { getAccount, getCard, getRecentTransactions, toggleFreezeCard } from '@/services/db';

// 7. FilPay Card (1:290)
export default function FilPayCard() {
  const { userId, card, cardTransactions, reload } = useFilPay();
  const [showDetail, setShowDetail] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<Tx | null>(null);

  // CLO 2.3 — SELECT * FROM cards / accounts / transactions WHERE userId = ?
  const cardRow = userId !== null ? getCard(userId) : null;
  const account = userId !== null ? getAccount(userId) : null;
  const activity = userId !== null ? getRecentTransactions(userId, 5).map(mapTx) : cardTransactions;

  const cashback = cardRow?.cashback ?? 0;
  const walletBalance = account ? account.balance : 0;

  const digits = card.number.replace(/\D/g, '');
  const groups = digits.match(/.{1,4}/g) ?? [];
  const displayNumber = revealed
    ? groups.join('  ')
    : groups.map((g, i) => (i === groups.length - 1 ? g : '••••')).join('  ');

  /** CLO 2.4 — the freeze flag is written against the card's own row id. */
  const toggle = () => {
    if (userId === null || cardRow === null) return;
    toggleFreezeCard(cardRow.id, cardRow.isFrozen);
    reload();
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
        <View style={styles.header}>
          <PhoneStatusBar dark />
          <View style={styles.nav}>
            <Pressable onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Go back">
              <Feather name="arrow-left" size={22} color={C.textOnPrimary} />
            </Pressable>
            <Text style={styles.title}>FilPay Card</Text>
            <View style={{ width: 22 }} />
          </View>
          <View style={styles.card}>
            <View style={styles.glow} />
            <View style={card.frozen ? styles.cardFrozen : undefined}>
              <View style={styles.cardTop}>
                <View style={styles.logoBox}><Text style={styles.logoF}>F</Text></View>
                <Text style={styles.logoName}>FilPay</Text>
              </View>
              <Text style={styles.virtual}>Virtual Debit Card</Text>
              <Pressable
                style={styles.numberRow}
                onPress={() => setRevealed((r) => !r)}
                accessibilityRole="button"
                accessibilityLabel={revealed ? 'Hide card number' : 'Reveal card number'}>
                <Text style={styles.number}>{displayNumber}</Text>
                <Feather name={revealed ? 'eye-off' : 'eye'} size={16} color={C.textOnPrimaryMuted} />
              </Pressable>
              <View style={styles.cardBottom}>
                <Text style={styles.holder}>{card.holder}</Text>
                <View style={styles.mc}>
                  <View style={styles.mcGold} />
                  <View style={styles.mcWhite} />
                </View>
              </View>
            </View>
            {card.frozen && (
              <View style={styles.frozenTag}>
                <Feather name="lock" size={10} color={C.textPrimary} />
                <Text style={styles.frozenTagText}>Frozen</Text>
              </View>
            )}
          </View>
        </View>

        <Pressable style={styles.rewards} onPress={() => setShowRewards(true)} accessibilityRole="button">
          <View style={styles.rIcon}><Text style={styles.rEmoji}>🎁</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rTitle}>Cashback Rewards</Text>
            <Text style={styles.rSub}>{formatPeso(cashback)} earned • Up to 2% on selected merchants</Text>
          </View>
          <Feather name="chevron-right" size={22} color={C.textSecondary} />
        </Pressable>

        <View style={styles.grid}>
          <Pressable style={styles.tile} onPress={toggle} accessibilityRole="button" accessibilityLabel="Freeze card">
            <View style={styles.tileTop}>
              <View style={styles.tIcon}><Feather name="lock" size={16} color={C.primary} /></View>
              <View style={[styles.pill, card.frozen ? styles.pillUnfreeze : styles.pillFreeze]}>
                <Text style={[styles.pillText, card.frozen ? styles.pillTextUnfreeze : styles.pillTextFreeze]}>
                  {card.frozen ? 'Unfreeze' : 'Freeze'}
                </Text>
              </View>
            </View>
            <Text style={styles.tTitle}>Freeze Card</Text>
            <Text style={styles.tSub}>{card.frozen ? 'Card is frozen' : 'Card is active'}</Text>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => setShowDetail(true)} accessibilityRole="button">
            <View style={styles.tileTop}>
              <View style={styles.tIcon}><Feather name="credit-card" size={16} color={C.primary} /></View>
            </View>
            <Text style={styles.tTitle}>Card Details</Text>
            <Text style={styles.tSub}>View CVV & Limits</Text>
          </Pressable>
        </View>

        <View style={styles.limitRow}>
          <View style={styles.tIcon}><Feather name="bar-chart-2" size={16} color={C.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tTitle}>Transaction limit</Text>
            <Text style={styles.tSub}>Daily spending limit</Text>
          </View>
          <Text style={styles.limitValue}>{formatPeso(card.dailyLimit)}</Text>
        </View>

        <View style={styles.secRow}>
          <Text style={styles.secTitle}>Recent Card Activity</Text>
          <Pressable onPress={() => router.push('/transactions')} hitSlop={8} accessibilityRole="button">
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        <View style={styles.txCard}>
          {activity.length === 0 ? (
            <Text style={styles.txEmpty}>No card activity yet</Text>
          ) : (
            activity.map((t) => (
              <Pressable key={t.id} style={styles.txRow} onPress={() => setSelected(t)} accessibilityRole="button">
                <View style={styles.txAv}><Text style={styles.txL}>{t.title.charAt(0)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txN}>{t.title}</Text>
                  <Text style={styles.txM}>{t.subtitle}</Text>
                </View>
                <Text style={styles.txA}>{formatPeso(t.amount)}</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
      <BottomNav active="card" />

      {/* Card details */}
      <Modal visible={showDetail} transparent animationType="slide" onRequestClose={() => setShowDetail(false)}>
        <Pressable style={styles.bg} onPress={() => setShowDetail(false)}>
          <Pressable style={styles.modal}>
            <View style={styles.mHead}>
              <Text style={styles.mTitle}>Card Details</Text>
              <Pressable onPress={() => setShowSecret((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Toggle card secrets">
                <Feather name={showSecret ? 'eye-off' : 'eye'} size={20} color={C.primary} />
              </Pressable>
            </View>
            <Detail label="Number" value={showSecret ? groups.join('  ') : `••••  ••••  ••••  ${groups[groups.length - 1] ?? ''}`} />
            <Detail label="CVV" value={showSecret ? card.cvv : '•••'} />
            <Detail label="Expiry" value={card.expiry} />
            <Detail label="Daily limit" value={formatPeso(card.dailyLimit)} />
            <Detail label="Monthly limit" value={formatPeso(card.monthlyLimit)} last />
            <Pressable style={styles.done} onPress={() => setShowDetail(false)}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Cashback programme */}
      <Modal visible={showRewards} transparent animationType="slide" onRequestClose={() => setShowRewards(false)}>
        <Pressable style={styles.bg} onPress={() => setShowRewards(false)}>
          <Pressable style={styles.modal}>
            <View style={styles.mHead}>
              <Text style={styles.mTitle}>Cashback Rewards</Text>
              <Pressable onPress={() => setShowRewards(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                <Feather name="x" size={20} color={C.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.rwIcon}><Text style={styles.rwEmoji}>🎁</Text></View>
            <Text style={styles.rwLead}>Up to 2% cashback on selected merchants</Text>
            <Detail label="Cashback earned" value={formatPeso(cashback)} />
            <Detail label="Wallet balance" value={formatPeso(walletBalance)} last />
            <Text style={styles.rwBody}>
              Every time you pay with your FilPay Card at a participating merchant, a percentage of your purchase is returned to your wallet. Cashback posts within 24 hours of a successful payment and does not expire.
            </Text>
            <Text style={styles.rwBody}>Transfers between FilPay accounts and bill payments do not earn cashback.</Text>
            <Pressable style={styles.done} onPress={() => setShowRewards(false)}>
              <Text style={styles.doneText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Transaction detail */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.bg} onPress={() => setSelected(null)}>
          <Pressable style={styles.modal}>
            <Text style={styles.mTitle}>Transaction Details</Text>
            {selected ? (
              <>
                <Text style={styles.txModalTitle}>{selected.title}</Text>
                <Text style={styles.txModalAmt}>{formatPeso(selected.amount)}</Text>
                <Detail label="Date" value={selected.date} />
                <Detail label="Time" value={selected.time} />
                <Detail label="Reference" value={selected.ref} />
                <Detail label="Status" value={selected.status} last />
              </>
            ) : null}
            <Pressable style={styles.done} onPress={() => setSelected(null)}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Detail({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detail, last && styles.detailLast]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = themeSheet(() => ({
  safe: { flex: 1, backgroundColor: C.background },
  header: { backgroundColor: C.primary, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingBottom: 14, paddingHorizontal: 20 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  title: { flex: 1, color: C.textOnPrimary, fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  card: { backgroundColor: C.primary, borderRadius: 22, padding: 20, marginTop: 8, minHeight: 188, overflow: 'hidden', borderWidth: 1, borderColor: C.cardBorderOnPrimary },
  glow: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: C.glow, right: -40, top: -40 },
  cardFrozen: { opacity: 0.55 },
  frozenTag: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.accent, borderRadius: 11, paddingHorizontal: 8, height: 22 },
  frozenTagText: { color: C.textPrimary, fontSize: 10, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox: { width: 28, height: 28, borderRadius: 9, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  logoF: { color: C.primary, fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  logoName: { color: C.textOnPrimary, fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  virtual: { color: C.textOnPrimaryMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 16 },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24 },
  number: { color: C.textOnPrimary, fontSize: 19, fontWeight: '500', fontFamily: 'Inter_500Medium', letterSpacing: 1 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  holder: { color: C.textOnPrimary, fontSize: 11, fontWeight: '500', fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
  mc: { flexDirection: 'row' },
  mcGold: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.accent },
  mcWhite: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.surface, marginLeft: -14, opacity: 0.9 },
  rewards: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 16, marginHorizontal: 20, marginTop: 14, padding: 12, minHeight: 64 },
  rIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  rEmoji: { fontSize: 18 },
  rTitle: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  rSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: C.textSecondary, marginTop: 2 },
  grid: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 12 },
  tile: { flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 12, minHeight: 104 },
  tileTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  tIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  tTitle: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary, marginTop: 10 },
  tSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: C.textSecondary, marginTop: 2 },
  pill: { borderRadius: 11, paddingHorizontal: 8, height: 22, alignItems: 'center', justifyContent: 'center' },
  pillFreeze: { backgroundColor: C.accent },
  pillUnfreeze: { backgroundColor: C.primary },
  pillText: { fontSize: 10, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  pillTextFreeze: { color: C.textPrimary },
  pillTextUnfreeze: { color: C.textOnPrimary },
  limitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 18, marginHorizontal: 20, marginTop: 12, padding: 12 },
  limitValue: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.primary },
  secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 16 },
  secTitle: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  seeAll: { fontSize: 12, fontFamily: 'Inter_500Medium', color: C.primary, fontWeight: '500' },
  txCard: { backgroundColor: C.surface, borderRadius: 18, marginHorizontal: 20, marginTop: 8, padding: 8 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8 },
  txAv: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  txL: { color: C.primary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  txN: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  txM: { fontSize: 11, fontFamily: 'Inter_400Regular', color: C.textSecondary, marginTop: 2 },
  txA: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  txEmpty: { fontSize: 12, fontFamily: 'Inter_400Regular', color: C.textSecondary, textAlign: 'center', padding: 14 },
  bg: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  mHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary, marginBottom: 8 },
  detail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  detailLast: { borderBottomWidth: 0 },
  detailLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: C.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium', color: C.textPrimary },
  done: { backgroundColor: C.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  doneText: { color: C.textOnPrimary, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  rwIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 12 },
  rwEmoji: { fontSize: 26 },
  rwLead: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  rwBody: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular', color: C.textSecondary, marginTop: 10 },
  txModalTitle: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  txModalAmt: { fontSize: 24, fontWeight: '700', fontFamily: 'Inter_700Bold', color: C.primary, marginTop: 4, marginBottom: 8 },
}));
