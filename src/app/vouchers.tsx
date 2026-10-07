import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import { themeSheet, type Palette, C } from '@/theme';
import { useFilPay, formatPeso } from '@/store';
import { getVouchers, claimVoucher, useVoucher as redeemVoucher } from '@/services/db';

// Vouchers & Promos — claim and use vouchers, all stored in SQLite.
export default function Vouchers() {
  const { userId, reload, pushNotification } = useFilPay();
  const [tick, setTick] = useState(0);

  // Live SQLite read.
  const vouchers = userId !== null ? getVouchers(userId) : [];

  const claim = (id: number, title: string | null) => {
    claimVoucher(id);
    reload();
    setTick((n) => n + 1);
    pushNotification({ title: 'Voucher claimed', body: `${title ?? 'Voucher'} is now in your wallet.`, kind: 'promo' });
  };

  const use = (id: number, title: string | null) => {
    redeemVoucher(id);
    reload();
    setTick((n) => n + 1);
    Alert.alert('Voucher used', `${title ?? 'Voucher'} has been applied.`);
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Vouchers & Promos" onBack={goBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }} key={tick}>
        <View style={styles.banner}>
          <View style={styles.bannerIcon}><Feather name="gift" size={22} color={C.textOnPrimary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Save more every day</Text>
            <Text style={styles.bannerSub}>Claim vouchers and use them on transfers, bills and load.</Text>
          </View>
        </View>

        <Text style={styles.secTitle}>Your Vouchers</Text>

        {vouchers.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="tag" size={26} color={C.textSecondary} />
            <Text style={styles.emptyText}>No vouchers available yet.</Text>
          </View>
        ) : (
          vouchers.map((v) => {
            const claimed = v.isClaimed === 1;
            const used = v.isUsed === 1;
            return (
              <View key={v.id} style={styles.card}>
                <View style={styles.discount}>
                  <Text style={styles.discountValue}>{v.discount && v.discount > 0 ? formatPeso(v.discount) : 'FREE'}</Text>
                  <Text style={styles.discountLabel}>OFF</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{v.title}</Text>
                  <Text style={styles.sub}>Code {v.code} · {v.category}</Text>
                  <Text style={styles.expiry}>Expires {v.expiry}</Text>
                  <View style={styles.pillRow}>
                    {claimed ? <Text style={[styles.pill, styles.pillClaimed]}>Claimed</Text> : <Text style={[styles.pill, styles.pillNew]}>New</Text>}
                    {used ? <Text style={[styles.pill, styles.pillUsed]}>Used</Text> : null}
                  </View>
                </View>
                {used ? (
                  <View style={styles.usedBtn}><Text style={styles.usedText}>Used</Text></View>
                ) : claimed ? (
                  <Pressable style={styles.useBtn} onPress={() => use(v.id, v.title)} accessibilityRole="button">
                    <Text style={styles.useText}>Use</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.claimBtn} onPress={() => claim(v.id, v.title)} accessibilityRole="button">
                    <Text style={styles.claimText}>Claim</Text>
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themeSheet((C: Palette) => ({
  safe: { flex: 1, backgroundColor: C.background },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.primary, borderRadius: 18, marginHorizontal: 20, marginTop: 14, padding: 16 },
  bannerIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { color: C.textOnPrimary, fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  bannerSub: { color: C.textOnPrimaryMuted, fontSize: 11.5, fontFamily: 'Inter_400Regular', marginTop: 3 },
  secTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginHorizontal: 20, marginTop: 18, marginBottom: 4 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 40, marginHorizontal: 20, backgroundColor: C.surface, borderRadius: 18, marginTop: 10 },
  emptyText: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderRadius: 18, marginHorizontal: 20, marginTop: 10, padding: 14 },
  discount: { width: 64, height: 64, borderRadius: 14, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  discountValue: { color: C.primary, fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  discountLabel: { color: C.primary, fontSize: 10, fontWeight: '600', fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  title: { color: C.textPrimary, fontSize: 13.5, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  sub: { color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  expiry: { color: C.textTertiary, fontSize: 10.5, fontFamily: 'Inter_400Regular', marginTop: 2 },
  pillRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  pill: { fontSize: 9.5, fontWeight: '600', fontFamily: 'Inter_600SemiBold', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  pillNew: { color: C.primary, backgroundColor: C.primarySoft },
  pillClaimed: { color: C.success, backgroundColor: C.catSuccessBg },
  pillUsed: { color: C.textSecondary, backgroundColor: C.catSpendBg },
  claimBtn: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 16, height: 38, alignItems: 'center', justifyContent: 'center' },
  claimText: { color: C.textOnPrimary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  useBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 16, height: 38, alignItems: 'center', justifyContent: 'center' },
  useText: { color: C.textPrimary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  usedBtn: { backgroundColor: C.catSpendBg, borderRadius: 12, paddingHorizontal: 16, height: 38, alignItems: 'center', justifyContent: 'center' },
  usedText: { color: C.textSecondary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
}));
