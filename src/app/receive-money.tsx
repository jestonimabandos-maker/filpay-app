import { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import { themeSheet, C } from '@/theme';
import { useFilPay } from '@/store';
import { initialsOf } from '@/lib/ui';

// Receive Money - coloured header + white QR card (Figma CEZTLAzKxhQ1Z80K4r9I9E)
export default function ReceiveMoney() {
  const { user, topUp } = useFilPay();

  const payload = useMemo(
    () => `upi://filpay?pa=${user.phone.replace(/\s/g, '')}&pn=${encodeURIComponent(user.name)}&am=0`,
    [user.phone, user.name],
  );

  const share = () => {
    Alert.alert('Share link', payload);
  };

  const simulate = () => {
    const r = topUp(1000, 'Incoming transfer');
    Alert.alert(r.ok ? 'Received' : 'Cannot receive', r.message);
  };

  const details: { label: string; value: string }[] = [
    { label: 'Account Number', value: user.accountNo },
    { label: 'Account Type', value: user.accountType },
    { label: 'Holder', value: user.name },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Receive Money" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.init}>{initialsOf(user.name)}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.phone}>{user.phone}</Text>

          <View style={styles.qrBox}>
            <QRCode value={payload} size={180} backgroundColor={C.textOnPrimary} color={C.textPrimary} />
          </View>
          <Text style={styles.caption}>Scan to receive</Text>
        </View>

        <View style={styles.details}>
          <Text style={styles.secTitle}>Account details</Text>
          {details.map((d, i) => (
            <View key={d.label} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{d.label}</Text>
              <Text style={styles.rowValue}>{d.value}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.primary} onPress={share}>
          <Text style={styles.primaryText}>Share</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={simulate}>
          <Text style={styles.secondaryText}>Simulate incoming ₱1,000</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themeSheet(() => ({
  safe: { flex: 1, backgroundColor: C.background },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    alignItems: 'center',
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  init: { color: C.primary, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  name: { color: C.textPrimary, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 10 },
  phone: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  qrBox: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  caption: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 12 },
  details: {
    backgroundColor: C.surface,
    borderRadius: 18,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 16,
  },
  secTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  rowLabel: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  rowValue: { color: C.textPrimary, fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium', flexShrink: 1, textAlign: 'right' },
  primary: {
    backgroundColor: C.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 18,
  },
  primaryText: { color: C.textOnPrimary, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  secondary: {
    backgroundColor: C.surface,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  secondaryText: { color: C.primary, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
}));
