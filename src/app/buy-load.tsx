import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import { themeSheet, C } from '@/theme';
import { useFilPay, formatPeso } from '@/store';
import { recordTransaction } from '@/services/db';
import { isValidPhone, parseAmount } from '@/lib/ui';

// Buy Load — GCash-style: number, telco, regular/promo, amount, review → ref.
type Mode = 'Regular' | 'Promos';

const TELCOS = [
  { id: 'globe', name: 'Globe', icon: 'globe' as const, promos: ['Go50', 'Go90', 'Go+99'] },
  { id: 'smart', name: 'Smart', icon: 'wifi' as const, promos: ['Giga50', 'Giga99', 'Magic Data'] },
  { id: 'dito', name: 'DITO', icon: 'zap' as const, promos: ['DITO 50', 'DITO 100'] },
  { id: 'tnt', name: 'TNT', icon: 'phone' as const, promos: ['TNT 50', 'TNT 100'] },
];

const AMOUNTS = [50, 100, 200, 500];

export default function BuyLoad() {
  const { walletBalance, userId, reload, pushNotification } = useFilPay();
  const [phone, setPhone] = useState('');
  const [telco, setTelco] = useState(TELCOS[0]);
  const [mode, setMode] = useState<Mode>('Regular');
  const [promo, setPromo] = useState<string | null>(null);
  const [amount, setAmount] = useState('100');
  const [showReview, setShowReview] = useState(false);
  const [resultRef, setResultRef] = useState<string | null>(null);

  const value = useMemo(() => (mode === 'Promos' && promo ? parseAmount(promo.replace(/\D/g, '')) : parseAmount(amount)), [mode, promo, amount]);
  const phoneValid = isValidPhone(phone);
  const exceeds = value > walletBalance;

  const openReview = () => {
    if (!phoneValid) return Alert.alert('Mobile number', 'Enter a valid mobile number.');
    if (!value || value <= 0) return Alert.alert('Invalid', 'Choose or enter an amount.');
    if (exceeds) return Alert.alert('Insufficient', 'Amount exceeds your wallet balance.');
    setShowReview(true);
  };

  const confirm = () => {
    if (userId === null) return;
    if (!phoneValid) return Alert.alert('Mobile number', 'Enter a valid mobile number.');
    if (exceeds) return Alert.alert('Insufficient', 'Amount exceeds your wallet balance.');

    const label = mode === 'Promos' && promo ? promo : 'Regular Load';
    const ref = recordTransaction(userId, {
      type: 'load',
      category: 'Payments',
      recipientName: `${telco.name} Load`,
      recipientAccount: phone.trim(),
      amount: -value,
      purpose: `${label} • ${telco.name}`,
      bankName: telco.name,
      transferType: label,
    });

    reload();
    pushNotification({ title: 'Load sent', body: `${formatPeso(value)} ${telco.name} load to ${phone.trim()}.`, kind: 'tx' });
    setShowReview(false);
    setResultRef(ref);
  };

  const done = () => {
    setResultRef(null);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Buy Load" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={styles.strip}>
          <Text style={styles.stripLabel}>Wallet Balance</Text>
          <Text style={styles.stripValue}>{formatPeso(walletBalance)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.pesoBox}><Feather name="smartphone" size={16} color={C.primary} /></View>
            <TextInput
              style={styles.phone}
              value={phone}
              onChangeText={setPhone}
              placeholder="09XX XXX XXXX"
              placeholderTextColor={C.textSecondary}
              keyboardType="phone-pad"
              maxLength={20}
            />
          </View>

          <Text style={styles.label}>Network</Text>
          <View style={styles.telcos}>
            {TELCOS.map((t) => {
              const active = t.id === telco.id;
              return (
                <Pressable key={t.id} style={[styles.telco, active && styles.telcoOn]} onPress={() => { setTelco(t); setPromo(null); }} accessibilityRole="button">
                  <Feather name={t.icon} size={18} color={active ? C.primary : C.textSecondary} />
                  <Text style={[styles.telcoName, active && styles.telcoNameOn]}>{t.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Type</Text>
          <View style={styles.seg}>
            {(['Regular', 'Promos'] as const).map((m) => {
              const active = m === mode;
              return (
                <Pressable key={m} style={[styles.segItem, active && styles.segItemOn]} onPress={() => setMode(m)} accessibilityRole="button">
                  <Text style={[styles.segTitle, active && styles.segTitleOn]}>{m === 'Regular' ? 'Regular load' : 'Promos'}</Text>
                </Pressable>
              );
            })}
          </View>

          {mode === 'Regular' ? (
            <>
              <Text style={styles.label}>Amount</Text>
              <View style={styles.amounts}>
                {AMOUNTS.map((a) => {
                  const active = parseAmount(amount) === a;
                  return (
                    <Pressable key={a} style={[styles.amtChip, active && styles.amtChipOn]} onPress={() => setAmount(String(a))} accessibilityRole="button">
                      <Text style={[styles.amtChipText, active && styles.amtChipTextOn]}>{formatPeso(a)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.label}>Promos</Text>
              <View style={styles.promos}>
                {telco.promos.map((p) => {
                  const active = p === promo;
                  return (
                    <Pressable key={p} style={[styles.promo, active && styles.promoOn]} onPress={() => setPromo(p)} accessibilityRole="button">
                      <Text style={[styles.promoText, active && styles.promoTextOn]}>{p}</Text>
                      <Text style={[styles.promoPrice, active && styles.promoTextOn]}>{formatPeso(parseAmount(p.replace(/\D/g, '')))}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.summary}>
            <Text style={styles.sumLabel}>You will pay</Text>
            <Text style={styles.sumAmount}>{formatPeso(value)}</Text>
            <Text style={styles.sumFee}>Deducted from your wallet • No fee</Text>
          </View>

          <Pressable style={[styles.primary, (!phoneValid || exceeds) && { opacity: 0.5 }]} onPress={openReview} disabled={!phoneValid || exceeds}>
            <Text style={styles.primaryText}>Review &amp; Buy</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={showReview} transparent animationType="slide" onRequestClose={() => setShowReview(false)}>
        <Pressable style={styles.bg} onPress={() => setShowReview(false)}>
          <Pressable style={styles.modal}>
            <Text style={styles.mTitle}>Confirm Load Purchase</Text>
            <MRow label="Mobile number" value={phone.trim()} />
            <MRow label="Network" value={telco.name} />
            <MRow label="Type" value={mode === 'Promos' && promo ? promo : 'Regular load'} />
            <MRow label="Amount" value={formatPeso(value)} />
            <MRow label="Total deduct" value={formatPeso(value)} total />
            <Pressable style={styles.primary} onPress={confirm}>
              <Text style={styles.primaryText}>Buy {formatPeso(value)} load</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!resultRef} transparent animationType="slide" onRequestClose={done}>
        <Pressable style={styles.bg} onPress={done}>
          <Pressable style={styles.modal}>
            <View style={styles.resultIcon}><Feather name="check" size={26} color={C.success} /></View>
            <Text style={styles.resultTitle}>Load sent</Text>
            <Text style={styles.resultSub}>{formatPeso(value)} {telco.name} load to {phone.trim()}</Text>
            <MRow label="Reference" value={resultRef ?? '-'} />
            <Pressable style={styles.primary} onPress={done}>
              <Text style={styles.primaryText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function MRow({ label, value, total }: { label: string; value: string; total?: boolean }) {
  return (
    <View style={[styles.mRow, total && styles.mTotalRow]}>
      <Text style={[styles.mLabel, total && styles.mTotalLabel]}>{label}</Text>
      <Text style={[styles.mValue, total && styles.mTotalValue]}>{value}</Text>
    </View>
  );
}

const styles = themeSheet(() => ({
  safe: { flex: 1, backgroundColor: C.background },
  strip: { backgroundColor: C.primaryDark, borderRadius: 18, marginHorizontal: 20, marginTop: 12, padding: 16 },
  stripLabel: { color: C.textOnPrimaryMuted, fontSize: 12, fontFamily: 'Inter_400Regular' },
  stripValue: { color: C.textOnPrimary, fontSize: 26, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 4 },
  card: { backgroundColor: C.surface, borderRadius: 18, marginHorizontal: 20, marginTop: 14, padding: 16 },
  label: { color: C.textSecondary, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 14, marginBottom: 8 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.inputBg, borderRadius: 14, padding: 14, minHeight: 60 },
  pesoBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  phone: { flex: 1, fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  telcos: { flexDirection: 'row', gap: 8 },
  telco: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: 'transparent' },
  telcoOn: { borderColor: C.primary, backgroundColor: C.iconBg },
  telcoName: { color: C.textSecondary, fontSize: 11, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  telcoNameOn: { color: C.primary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  seg: { flexDirection: 'row', gap: 10 },
  segItem: { flex: 1, height: 44, borderRadius: 14, backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  segItemOn: { borderColor: C.primary, backgroundColor: C.iconBg },
  segTitle: { color: C.textSecondary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  segTitleOn: { color: C.primary },
  amounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amtChip: { flex: 1, minWidth: 70, height: 42, borderRadius: 13, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  amtChipOn: { backgroundColor: C.primary },
  amtChipText: { color: C.primary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  amtChipTextOn: { color: C.textOnPrimary },
  promos: { gap: 8 },
  promo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.inputBg, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: 'transparent' },
  promoOn: { borderColor: C.primary, backgroundColor: C.iconBg },
  promoText: { color: C.textPrimary, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  promoTextOn: { color: C.primary },
  promoPrice: { color: C.textSecondary, fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  summary: { backgroundColor: C.iconBg, borderRadius: 14, padding: 16, marginTop: 16 },
  sumLabel: { color: C.primary, fontSize: 11, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  sumAmount: { color: C.textPrimary, fontSize: 26, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 6 },
  sumFee: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  primary: { backgroundColor: C.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryText: { color: C.textOnPrimary, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  bg: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  mTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  mRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, gap: 12 },
  mLabel: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  mValue: { color: C.textPrimary, fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium', flexShrink: 1, textAlign: 'right' },
  mTotalRow: { borderTopWidth: 1, borderTopColor: C.border, marginTop: 4, paddingTop: 12 },
  mTotalLabel: { color: C.textPrimary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  mTotalValue: { color: C.primary, fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  resultIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.catSuccessBg, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  resultTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center', marginTop: 12 },
  resultSub: { color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 4, marginBottom: 8 },
}));
