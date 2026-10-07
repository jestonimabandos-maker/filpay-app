import { Component, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Linking,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, PermissionStatus } from 'expo-camera';
import PhoneStatusBar from '@/components/PhoneStatusBar';
import { themeSheet, C } from '@/theme';
import { useFilPay, formatPeso } from '@/store';
import { getCards, getVouchers, useVoucher as redeemVoucher, recordTransaction } from '@/services/db';
import { QUICK_AMOUNTS, parseAmount } from '@/lib/ui';

// Scan & Pay — real QR scanner, then amount + payment method + voucher + confirm.
class CameraBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export default function ScanPay() {
  const { walletBalance, userId, reload, pushNotification, card: storeCard } = useFilPay();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState<string | null>(null);
  const [merchant, setMerchant] = useState('QR Merchant');
  const [amount, setAmount] = useState('250.00');
  const [method, setMethod] = useState<'balance' | number>('balance');
  const [voucherId, setVoucherId] = useState<number | null>(null);
  const [showPay, setShowPay] = useState(false);
  const [resultRef, setResultRef] = useState<string | null>(null);

  const granted = !!permission?.granted;
  const undetermined = !permission || permission.status === PermissionStatus.UNDETERMINED;
  const denied = !!permission && !granted && permission.status === PermissionStatus.DENIED;

  // Live SQLite reads during render — `reload()` after a payment forces a re-render.
  const cards = userId !== null ? getCards(userId) : [];
  const vouchers =
    userId !== null ? getVouchers(userId).filter((v) => v.isClaimed === 1 && v.isUsed === 0) : [];

  const value = parseAmount(amount);
  const voucher = vouchers.find((v) => v.id === voucherId) ?? null;
  const discount = voucher?.discount ?? 0;
  const total = Math.max(0, value - discount);
  const overBalance = total > walletBalance;
  const payCard = typeof method === 'number' ? cards.find((c) => c.id === method) ?? null : null;
  const frozen = payCard ? payCard.isFrozen === 1 : storeCard.frozen;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const onScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(data);
    // A real QR payload is used as the merchant reference.
    const label = data.length <= 32 ? data : data.slice(0, 32);
    setMerchant(label || 'QR Merchant');
    setShowPay(true);
  };

  const pay = () => {
    if (!value || value <= 0) return Alert.alert('Invalid', 'Enter amount.');
    if (method === 'balance' && overBalance) return Alert.alert('Cannot pay', 'Amount exceeds your available balance.');
    if (frozen) return Alert.alert('Cannot pay', 'Card is frozen — unfreeze it to pay.');
    if (userId === null) return Alert.alert('Cannot pay', 'No active session.');

    const methodLabel = payCard ? `FilPay ${payCard.type ?? 'Card'} •••• ${(payCard.cardNumber ?? '').slice(-4)}` : 'Wallet Balance';
    const name = merchant.trim() || 'QR Merchant';

    const ref = recordTransaction(userId, {
      type: 'pay',
      category: 'Payments',
      recipientName: name,
      amount: -total,
      purpose: `Scan & Pay • ${methodLabel}`,
      bankName: methodLabel,
    });

    if (voucher) redeemVoucher(voucher.id);
    reload();
    pushNotification({ title: 'Payment successful', body: `${formatPeso(total)} paid to ${name}.`, kind: 'tx' });
    setShowPay(false);
    setResultRef(ref);
  };

  const done = () => {
    setResultRef(null);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PhoneStatusBar dark />
      <View style={styles.head}>
        <Pressable onPress={goBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <Feather name="arrow-left" size={22} color={C.textOnPrimary} />
        </Pressable>
        <Text style={styles.title}>Scan &amp; Pay</Text>
        {granted ? (
          <Pressable onPress={() => setTorch((t) => !t)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Toggle flashlight" style={styles.torch}>
            <Feather name={torch ? 'zap' : 'zap-off'} size={20} color={torch ? C.accent : C.textOnPrimary} />
          </Pressable>
        ) : (
          <View style={{ width: 22 }} />
        )}
      </View>

      <View style={styles.finder}>
        {granted ? (
          <CameraBoundary
            fallback={
              <View style={styles.permBox}>
                <Feather name="camera-off" size={30} color={C.scanCorner} />
                <Text style={styles.permText}>Camera is not available on this device.</Text>
                <Pressable style={styles.allowBtn} onPress={() => setShowPay(true)} accessibilityRole="button">
                  <Text style={styles.allowText}>Enter code manually</Text>
                </Pressable>
              </View>
            }
          >
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : onScanned}
            />
          </CameraBoundary>
        ) : null}

        {/* White QR frame overlay from the design, kept on top of the preview */}
        {granted ? <View style={styles.qrFrame} pointerEvents="none" /> : null}

        {!granted && undetermined ? (
          <View style={styles.permBox}>
            <View style={styles.qr}>
              <Feather name="grid" size={34} color={C.scanBg} />
            </View>
            <Pressable style={styles.allowBtn} onPress={() => { requestPermission().catch(() => {}); }} accessibilityRole="button" accessibilityLabel="Allow camera">
              <Text style={styles.allowText}>Allow camera</Text>
            </Pressable>
          </View>
        ) : null}

        {denied ? (
          <View style={styles.permBox}>
            <Feather name="camera-off" size={30} color={C.scanCorner} />
            <Text style={styles.permText}>Camera access is required to scan QR codes.</Text>
            <View style={styles.permRow}>
              <Pressable style={styles.permBtn} onPress={() => { Linking.openSettings().catch(() => {}); }} accessibilityRole="button">
                <Text style={styles.permBtnText}>Open settings</Text>
              </Pressable>
              <Pressable style={[styles.permBtn, styles.permBtnGhost]} onPress={() => setShowPay(true)} accessibilityRole="button">
                <Text style={styles.permBtnText}>Enter code</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.scanLabel}>{scanned ? 'Code scanned' : 'Scan QR Code'}</Text>
        <View style={styles.sheet}>
          {frozen ? (
            <View style={styles.frozen}>
              <Feather name="lock" size={14} color={C.textOnPrimary} />
              <Text style={styles.frozenText}>Card is frozen — unfreeze it to pay</Text>
            </View>
          ) : null}
          {scanned ? (
            <View style={styles.scannedRow}>
              <Feather name="check-circle" size={14} color={C.success} />
              <Text style={styles.scannedText} numberOfLines={1}>{scanned}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Merchant</Text>
          <TextInput
            style={styles.merchantInput}
            value={merchant}
            onChangeText={setMerchant}
            placeholder="Merchant name"
            placeholderTextColor={C.textSecondary}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Amount</Text>
          <View style={styles.amtRow}>
            <Text style={styles.amt}>₱ {amount}</Text>
            <Pressable style={styles.edit} onPress={() => setShowPay(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit payment">
              <Feather name="edit-2" size={14} color={C.primary} />
            </Pressable>
          </View>

          <View style={styles.chips}>
            {QUICK_AMOUNTS.map((q) => (
              <Pressable key={q} style={[styles.chip, value === q && styles.chipOn]} onPress={() => setAmount(String(q))} accessibilityRole="button">
                <Text style={[styles.chipText, value === q && styles.chipTextOn]}>₱{q}</Text>
              </Pressable>
            ))}
          </View>

          {overBalance && method === 'balance' ? <Text style={styles.helper}>Amount exceeds your balance of {formatPeso(walletBalance)}.</Text> : null}

          <View style={styles.divider} />
          <Pressable style={styles.cardRow} onPress={() => setShowPay(true)} accessibilityRole="button" accessibilityLabel="Change payment method">
            <View style={styles.cardIcon}><Text style={styles.cardF}>F</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{payCard ? `FilPay ${payCard.type ?? 'Card'}` : 'Wallet Balance'}</Text>
              <Text style={styles.cardNo}>{payCard ? `•••• ${(payCard.cardNumber ?? '').slice(-4)}` : formatPeso(walletBalance)}</Text>
            </View>
            <Pressable style={[styles.payBtn, frozen && styles.payBtnOff]} onPress={() => setShowPay(true)} disabled={frozen} accessibilityRole="button" accessibilityLabel="Pay">
              <Text style={styles.payText}>Pay</Text>
            </Pressable>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={showPay} transparent animationType="slide" onRequestClose={() => setShowPay(false)}>
        <Pressable style={styles.bg} onPress={() => setShowPay(false)}>
          <Pressable style={styles.modal}>
            <Text style={styles.mTitle}>Confirm Payment</Text>
            <Text style={styles.mLabel}>Merchant</Text>
            <TextInput style={styles.mInput} value={merchant} onChangeText={setMerchant} placeholder="Merchant name" placeholderTextColor={C.textSecondary} autoCapitalize="words" />
            <Text style={styles.mLabel}>Amount (₱)</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

            <Text style={styles.mLabel}>Payment method</Text>
            <View style={styles.methods}>
              <Pressable style={[styles.method, method === 'balance' && styles.methodOn]} onPress={() => setMethod('balance')} accessibilityRole="button">
                <Feather name="briefcase" size={16} color={method === 'balance' ? C.primary : C.textSecondary} />
                <Text style={[styles.methodName, method === 'balance' && styles.methodNameOn]}>Wallet</Text>
                <Text style={styles.methodSub}>{formatPeso(walletBalance)}</Text>
              </Pressable>
              {cards.map((c) => {
                const active = method === c.id;
                const hidden = c.isHidden === 1;
                return (
                  <Pressable key={c.id} style={[styles.method, active && styles.methodOn]} onPress={() => setMethod(c.id)} accessibilityRole="button">
                    <Feather name="credit-card" size={16} color={active ? C.primary : C.textSecondary} />
                    <Text style={[styles.methodName, active && styles.methodNameOn]}>{c.type ?? 'Card'}</Text>
                    <Text style={styles.methodSub}>{hidden ? `•••• ${(c.cardNumber ?? '').slice(-4)}` : c.cardNumber}</Text>
                    {c.isFrozen === 1 ? <Text style={styles.methodFrozen}>Frozen</Text> : null}
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.mLabel}>Voucher</Text>
            <View style={styles.voucherRow}>
              <Pressable
                style={[styles.voucherPick, voucher && styles.voucherPickOn]}
                onPress={() => setVoucherId(voucher ? null : (vouchers[0]?.id ?? null))}
                accessibilityRole="button"
              >
                <Feather name="tag" size={14} color={C.primary} />
                <Text style={styles.voucherText}>{voucher ? `${voucher.title}` : vouchers.length ? 'Apply voucher' : 'No vouchers'}</Text>
              </Pressable>
            </View>

            {discount > 0 ? <MRow label="Voucher" value={`−${formatPeso(discount)}`} /> : null}
            <MRow label="Total" value={formatPeso(total)} total />
            <Text style={styles.bal}>Balance: {formatPeso(walletBalance)}</Text>
            {overBalance && method === 'balance' ? <Text style={styles.helper}>Amount exceeds your available balance.</Text> : null}
            <Pressable style={styles.confirm} onPress={pay} accessibilityRole="button">
              <Text style={styles.confirmText}>Pay {formatPeso(total)}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!resultRef} transparent animationType="slide" onRequestClose={done}>
        <Pressable style={styles.bg} onPress={done}>
          <Pressable style={styles.modal}>
            <View style={styles.resultIcon}><Feather name="check" size={26} color={C.success} /></View>
            <Text style={styles.resultTitle}>Payment successful</Text>
            <Text style={styles.resultSub}>{formatPeso(total)} paid to {merchant.trim() || 'QR Merchant'}</Text>
            <MRow label="Reference" value={resultRef ?? '-'} />
            <Pressable style={styles.confirm} onPress={done}>
              <Text style={styles.confirmText}>Done</Text>
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
      <Text style={[styles.mLabelT, total && styles.mTotalLabel]}>{label}</Text>
      <Text style={[styles.mValue, total && styles.mTotalValue]}>{value}</Text>
    </View>
  );
}

const corner = { position: 'absolute' as const, width: 36, height: 4, backgroundColor: C.scanCorner, borderRadius: 2 };

const styles = themeSheet(() => ({
  safe: { flex: 1, backgroundColor: C.scanBg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 12 },
  title: { flex: 1, color: C.textOnPrimary, fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  torch: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  finder: { height: 340, backgroundColor: C.scanCard, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  cornerTL: { ...corner, left: 96, top: 86 },
  cornerTR: { ...corner, right: 96, top: 86 },
  cornerBL: { ...corner, left: 96, bottom: 86 },
  cornerBR: { ...corner, right: 96, bottom: 86 },
  qrFrame: { position: 'absolute', left: 96, right: 96, top: 86, bottom: 86, borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', borderRadius: 12 },
  qr: { width: 84, height: 84, backgroundColor: C.surface, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  permBox: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 14, width: '100%' },
  permText: { color: C.scanSecondary, fontSize: 12, lineHeight: 17, textAlign: 'center', fontFamily: 'Inter_400Regular' },
  permRow: { flexDirection: 'row', gap: 10 },
  permBtn: { backgroundColor: C.primary, borderRadius: 14, height: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  permBtnGhost: { backgroundColor: C.glow, borderWidth: 1, borderColor: C.scanCorner },
  permBtnText: { color: C.textOnPrimary, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  allowBtn: { backgroundColor: C.primary, borderRadius: 14, height: 48, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center' },
  allowText: { color: C.textOnPrimary, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  body: { flex: 1 },
  bodyContent: { paddingBottom: 16 },
  scanLabel: { color: C.textOnPrimary, fontSize: 14, fontWeight: '500', fontFamily: 'Inter_500Medium', textAlign: 'center', marginTop: 16 },
  sheet: { backgroundColor: C.surface, borderRadius: 20, marginHorizontal: 20, marginTop: 16, padding: 20 },
  frozen: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.error, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  frozenText: { color: C.textOnPrimary, fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium', flexShrink: 1 },
  scannedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.catSuccessBg, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  scannedText: { color: C.textPrimary, fontSize: 11, fontFamily: 'Inter_400Regular', flexShrink: 1 },
  label: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 8 },
  merchantInput: { color: C.textPrimary, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', paddingVertical: 6 },
  amtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  amt: { color: C.textPrimary, fontSize: 26, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  edit: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', gap: 6, marginTop: 12 },
  chip: { flex: 1, height: 30, borderRadius: 13, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: C.primary },
  chipText: { color: C.primary, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  chipTextOn: { color: C.textOnPrimary },
  helper: { color: C.error, fontSize: 11, marginTop: 8, fontFamily: 'Inter_400Regular' },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  cardF: { color: C.textOnPrimary, fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  cardName: { color: C.textPrimary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  cardNo: { color: C.textSecondary, fontSize: 11, marginTop: 2, fontFamily: 'Inter_400Regular' },
  payBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 20, height: 40, alignItems: 'center', justifyContent: 'center' },
  payBtnOff: { opacity: 0.5 },
  payText: { color: C.text, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  bg: { flex: 1, backgroundColor: C.overlayStrong, justifyContent: 'flex-end' },
  modal: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  mTitle: { fontSize: 16, fontWeight: '600', color: C.textPrimary, marginBottom: 12, fontFamily: 'Inter_600SemiBold' },
  mLabel: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 10, marginBottom: 6 },
  mInput: { borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, fontSize: 14, backgroundColor: C.inputBg, fontFamily: 'Inter_500Medium', color: C.textPrimary },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, fontSize: 20, backgroundColor: C.inputBg, textAlign: 'center', fontFamily: 'Inter_500Medium', color: C.textPrimary },
  methods: { gap: 8 },
  method: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.inputBg, borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: 'transparent' },
  methodOn: { borderColor: C.primary, backgroundColor: C.iconBg },
  methodName: { color: C.textPrimary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  methodNameOn: { color: C.primary },
  methodSub: { color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_400Regular', marginLeft: 'auto' },
  methodFrozen: { color: C.error, fontSize: 10, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  voucherRow: { flexDirection: 'row' },
  voucherPick: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.inputBg, borderRadius: 14, paddingHorizontal: 12, height: 44, flex: 1 },
  voucherPickOn: { backgroundColor: C.iconBg },
  voucherText: { color: C.textPrimary, fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  mRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, gap: 12 },
  mLabelT: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  mValue: { color: C.textPrimary, fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium', flexShrink: 1, textAlign: 'right' },
  mTotalRow: { borderTopWidth: 1, borderTopColor: C.border, marginTop: 4, paddingTop: 12 },
  mTotalLabel: { color: C.textPrimary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  mTotalValue: { color: C.primary, fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  bal: { textAlign: 'center', color: C.textSecondary, marginTop: 8, fontFamily: 'Inter_400Regular' },
  confirm: { backgroundColor: C.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  confirmText: { color: C.textOnPrimary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  resultIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.catSuccessBg, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  resultTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center', marginTop: 12 },
  resultSub: { color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 4, marginBottom: 8 },
}));
