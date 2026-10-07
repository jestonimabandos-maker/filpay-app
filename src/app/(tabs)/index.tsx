import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhoneStatusBar from '@/components/PhoneStatusBar';
import BottomNav from '@/components/BottomNav';
import { themeSheet, C } from '@/theme';
import { useFilPay, formatPeso } from '@/store';
import { getAccount, getCurrentUser } from '@/services/db';

// 3. Home / Dashboard (1:55)
const ACTIONS = [
  { label: 'Transfer', icon: 'arrow-up-right' as const, route: '/send-money' },
  { label: 'Pay Bills', icon: 'file-text' as const, route: '/pay-bills' },
  { label: 'Buy Load', icon: 'smartphone' as const, route: '/buy-load' },
  { label: 'Scan & Pay', icon: 'maximize' as const, route: '/scan-pay' },
  { label: 'Card', icon: 'credit-card' as const, route: '/(tabs)/card' },
  { label: 'Vouchers', icon: 'tag' as const, route: '/vouchers' },
  { label: 'Savings', icon: 'pie-chart' as const, route: '/(tabs)/savings' },
  { label: 'History', icon: 'clock' as const, route: '/transactions' },
];

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { userId, availableBalance, savingsBalance, hiddenBalance, toggleBalance, unreadCount, user } = useFilPay();

  // Everything below is a live SQLite read on every render — these are indexed
  // local queries, so no memoisation is worth the staleness risk.
  // CLO 2.3 — SELECT balance FROM accounts WHERE userId = ?
  const account = userId !== null ? getAccount(userId) : null;
  const balance = account ? account.balance : availableBalance;
  const saved = account ? account.savingsBalance : savingsBalance;
  const interest = account?.interestEarned ?? 0;

  // Profile (avatar) + visible account number straight from SQLite.
  const dbUser = userId !== null ? getCurrentUser() : null;
  const accountNo = dbUser?.savingsAccountNo ?? dbUser?.accountNumber ?? user.accountNo;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <PhoneStatusBar dark />
          <View style={styles.topRow}>
            <View>
              <Text style={styles.greet}>{timeGreeting()},</Text>
              <Text style={styles.name}>{user.name}</Text>
            </View>
            <View style={styles.topRight}>
              <Pressable style={styles.avatar} accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push('/(tabs)/profile')}>
                {dbUser?.profileImage ? (
                  <Image source={{ uri: dbUser.profileImage }} style={styles.avatarImg} />
                ) : (
                  <Feather name="user" size={18} color={C.primary} />
                )}
              </Pressable>
              <Pressable style={styles.bell} accessibilityRole="button" accessibilityLabel="Open notifications" onPress={() => router.push('/notifications')}>
                <Feather name="bell" size={16} color={C.primary} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
          <Pressable style={styles.balanceCard} accessibilityRole="button" onPress={() => router.push('/transactions')}>
            <View style={styles.balLabelRow}>
              <Text style={styles.balLabel}>Total Balance</Text>
              <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel="Toggle balance visibility" onPress={toggleBalance}>
                <Feather name={hiddenBalance ? 'eye-off' : 'eye'} size={14} color={C.textOnPrimaryMuted} />
              </Pressable>
            </View>
            <Text style={styles.balValue}>{hiddenBalance ? `₱${'•'.repeat(6)}` : formatPeso(balance)}</Text>
            <Text style={styles.acctNo}>Savings Account No  {accountNo}</Text>
            <View style={styles.pill}>
              <Text style={styles.pillArrow}>↗</Text>
              <Text style={styles.pillText}>Interest earned {formatPeso(interest)} • {formatPeso(saved)} saved</Text>
            </View>
          </Pressable>
          <Pressable style={styles.promo} accessibilityRole="button" onPress={() => router.push('/(tabs)/savings')}>
            <View style={styles.promoIcon}>
              <Text style={styles.promoEmoji}>🌱</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.promoTitle}>Your Savings is Growing!</Text>
              <Text style={styles.promoSub}>You are on track to reach your goal.</Text>
            </View>
            <Feather name="chevron-right" size={22} color={C.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.actions}>
          {ACTIONS.map((a) => (
            <Pressable key={a.label} style={styles.tile} onPress={() => router.push(a.route as never)} accessibilityRole="button" accessibilityLabel={a.label}>
              <View style={styles.tileIcon}>
                <Feather name={a.icon} size={18} color={C.primary} />
              </View>
              <Text style={styles.tileLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.viewAll} onPress={() => router.push('/transactions')} accessibilityRole="button" accessibilityLabel="View all activity">
          <View style={styles.viewAllIcon}><Feather name="list" size={18} color={C.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.viewAllTitle}>View all activity</Text>
            <Text style={styles.viewAllSub}>Search, view and manage your transactions</Text>
          </View>
          <Feather name="chevron-right" size={22} color={C.textSecondary} />
        </Pressable>
      </ScrollView>
      <BottomNav active="home" />
    </SafeAreaView>
  );
}

const styles = themeSheet(() => ({
  safe: { flex: 1, backgroundColor: C.background },
  content: { paddingBottom: 12 },
  header: { backgroundColor: C.primary, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingBottom: 16, paddingHorizontal: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  greet: { color: C.textOnPrimary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  name: { color: C.textOnPrimary, fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  bell: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  badgeText: { color: C.textOnPrimary, fontSize: 8, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  balanceCard: { backgroundColor: C.primaryDark, borderRadius: 20, padding: 16, marginTop: 14, minHeight: 112 },
  balLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balLabel: { color: C.textOnPrimary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  balValue: { color: C.textOnPrimary, fontSize: 30, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 4 },
  acctNo: { color: C.textOnPrimaryMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2, letterSpacing: 0.3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.pillBg, borderRadius: 13, height: 26, paddingHorizontal: 10, marginTop: 8, alignSelf: 'flex-start' },
  pillArrow: { color: C.accent, fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  pillText: { color: C.textOnPrimary, fontSize: 10.5, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 16, padding: 12, marginTop: 12, minHeight: 64 },
  promoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  promoEmoji: { fontSize: 18 },
  promoTitle: { color: C.textPrimary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  promoSub: { color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginTop: 14 },
  tile: { width: '22.5%', backgroundColor: C.surface, borderRadius: 16, alignItems: 'center', paddingVertical: 12, minHeight: 84, justifyContent: 'center' },
  tileIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { color: C.textPrimary, fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium', marginTop: 8 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 18, marginHorizontal: 20, marginTop: 14, padding: 16, minHeight: 68 },
  viewAllIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  viewAllTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  viewAllSub: { color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
}));
