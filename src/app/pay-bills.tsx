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
import { getBillers, getVouchers, useVoucher as redeemVoucher, recordTransaction } from '@/services/db';
import type { DbBiller } from '@/services/db';
import { QUICK_AMOUNTS, parseAmount } from '@/lib/ui';

// Pay Bills — pick a biller -> bill details -> confirmation -> receipt with ref.
const ORDER = [
  'Cable & Internet', 'Credit Card', 'Electricity', 'Finance', 'Government',
  'Insurance', 'Postpaid Mobile', 'Telecom', 'Water',
];

interface Receipt {
  ref: string;
  biller: string;
  icon: string;
  accountNo: string;
  purpose: string;
  amount: number;
  discount: number;
  total: number;
  date: string;
}

export default function PayBills() {
  const { walletBalance, userId, reload, pushNotification } = useFilPay();

  const [category, setCategory] = useState('All');
  const [biller, setBiller] = useState<DbBiller | null>(null);
  const [accountNo, setAccountNo] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('Bills Payment');
  const [voucherId, setVoucherId] = useState<number | null>(null);

  const [showDetails, setShowDetails] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  // Live SQLite reads during render (reference + user-scoped data).
  const billers = getBillers();
  const vouchers =
    userId !== null
      ? getVouchers(userId).filter((v) => v.category === 'Pay Bills' && v.isClaimed === 1 && v.isUsed === 0)
      : [];

  const categories = useMemo(() => {
    const set = new Set(billers.map((b) => b.category ?? 'Others'));
    const ordered = ORDER.filter((c) => set.has(c));
    const extra = [...set].filter((c) => !ORDER.includes(c));
    return ['All', ...ordered, ...extra];
  }, [billers]);

  const list = category === 'All' ? billers : billers.filter((b) => (b.category ?? 'Others') === category);

  const value = parseAmount(amount);
  const voucher = vouchers.find((v) => v.id === voucherId) ?? null;
  const discount = voucher?.discount ?? 0;
  const total = Math.max(0, value - discount);
  const canReview = !!biller && value > 0 && accountNo.trim().length >= 4;

  /** Step 1: tap a biller to open its bill-details sheet. */
  const openBiller = (b: DbBiller) => {
    setBiller(b);
    setAccountNo('');
    setAmount('');
    setPurpose('Bills Payment');
    setVoucherId(null);
    setShowDetails(true);
  };

  /** Step 2: validate details, then show the confirmation. */
  const toReview = () => {
    if (!biller) return;
    if (accountNo.trim().length < 4) return Alert.alert('Account number', 'Enter at least 4 characters.');
    if (!value || value <= 0) return Alert.alert('Invalid', 'Enter an amount.');
    if (total > walletBalance) return Alert.alert('Insufficient', 'Total exceeds your wallet balance.');
    setShowDetails(false);
    setShowReview(true);
  };

  /** Step 3: confirm -> write to SQLite -> show the receipt. */
  const confirm = () => {
    if (!biller || userId === null) return;
    if (total > walletBalance) return Alert.alert('Insufficient', 'Total exceeds your wallet balance.');

    const ref = recordTransaction(userId, {
      type: 'bills',
      category: 'Payments',
      recipientName: biller.name ?? 'Biller',
      recipientAccount: accountNo.trim(),
      amount: -total,
      purpose: `${purpose} • ${accountNo.trim()}`,
      bankName: biller.category ?? 'Bill',
    });

    if (voucher) redeemVoucher(voucher.id);

    const stamp = new Date().toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });

    reload();
    pushNotification({ title: 'Payment successful', body: `${formatPeso(total)} paid to ${biller.name ?? 'biller'}.`, kind: 'tx' });
    setShowReview(false);
    setReceipt({
      ref,
      biller: biller.name ?? 'Biller',
      icon: biller.icon ?? '•',
      accountNo: accountNo.trim(),
      purpose,
      amount: value,
      discount,
      total,
      date: stamp,
    });
  };

  const done = () => {
    setReceipt(null);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Pay Bills" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={styles.strip}>
          <Text style={styles.stripLabel}>Wallet Balance</Text>
          <Text style={styles.stripValue}>{formatPeso(walletBalance)}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {categories.map((c) => {
            const active = c === category;
            return (
              <Pressable key={c} style={[styles.chip, active ? styles.chipOn : styles.chipOff]} onPress={() => setCategory(c)} accessibilityRole="button">
                <Text style={[styles.chipText, active && styles.chipTextOn]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="inbox" size={22} color={C.textSecondary} />
            <Text style={styles.emptyText}>No billers in this category yet.</Text>
          </View>
        ) : (
          list.map((b) => (
            <Pressable key={b.id} style={styles.biller} onPress={() => openBiller(b)} accessibilityRole="button" accessibilityLabel={`Pay ${b.name}`}>
              <View style={styles.billerIcon}><Text style={styles.billerEmoji}>{b.icon ?? '•'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.billerName}>{b.name}</Text>
                <Text style={styles.billerCat}>{b.category}</Text>
              </View>
              <Text style={styles.payLabel}>Pay</Text>
              <Feather name="chevron-right" size={18} color={C.textSecondary} />
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Step 1 — bill details */}
      <Modal visible={showDetails} transparent animationType="slide" onRequestClose={() => setShowDetails(false)}>
        <Pressable style={styles.bg} onPress={() => setShowDetails(false)}>
          <Pressable style={styles.sheet}>
            <View style={styles.mHead}>
              <View style={styles.mBiller}>
                <View style={styles.billerIcon}><Text style={styles.billerEmoji}>{biller?.icon ?? '•'}</Text></View>
                <View>
                  <Text style={styles.mTitle}>{biller?.name ?? 'Biller'}</Text>
                  <Text style={styles.mSub}>{biller?.category}</Text>
                </View>
              </View>
              <Pressable onPress={() => setShowDetails(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <Feather name="x" size={18} color={C.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.label}>Reference / Account Number</Text>
            <TextInput
              style={styles.input}
              value={accountNo}
              onChangeText={setAccountNo}
              placeholder="e.g. 1234 5678 9012"
              placeholderTextColor={C.textSecondary}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={C.textSecondary}
              keyboardType="decimal-pad"
            />
            <View style={styles.quickRow}>
              {QUICK_AMOUNTS.map((q) => (
                <Pressable key={q} style={[styles.quick, value === q && styles.quickOn]} onPress={() => setAmount(q.toFixed(2))} accessibilityRole="button">
                  <Text style={[styles.quickText, value === q && styles.quickTextOn]}>{formatPeso(q)}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Purpose</Text>
            <View style={styles.quickRow}>
              {['Bills Payment', 'Rent', 'Utilities'].map((p) => {
                const on = p === purpose;
                return (
                  <Pressable key={p} style={[styles.quick, on && styles.quickOn]} onPress={() => setPurpose(p)} accessibilityRole="button">
                    <Text style={[styles.quickText, on && styles.quickTextOn]}>{p}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Voucher</Text>
            <Pressable
              style={styles.voucher}
              onPress={() => {
                if (voucher) return setVoucherId(null);
                if (vouchers.length === 0) return Alert.alert('No vouchers', 'No active Pay Bills vouchers.');
                setVoucherId(vouchers[0].id);
              }}
              accessibilityRole="button"
            >
              <Feather name="tag" size={14} color={C.primary} />
              <Text style={styles.voucherText}>{voucher ? `${voucher.title} (−${formatPeso(discount)})` : vouchers.length ? 'Apply a voucher' : 'No vouchers available'}</Text>
              {voucher ? <Feather name="x" size={16} color={C.textSecondary} /> : null}
            </Pressable>

            <View style={styles.summary}>
              <Text style={styles.sumLabel}>You will pay</Text>
              <Text style={styles.sumAmount}>{formatPeso(total)}</Text>
              <Text style={styles.sumFee}>{discount > 0 ? `Voucher: −${formatPeso(discount)}  •  ` : ''}Fee: ₱0.00</Text>
            </View>

            <Pressable style={[styles.primary, !canReview && { opacity: 0.5 }]} onPress={toReview} disabled={!canReview} accessibilityRole="button">
              <Text style={styles.primaryText}>Continue</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Step 2 — confirmation */}
      <Modal visible={showReview} transparent animationType="slide" onRequestClose={() => setShowReview(false)}>
        <Pressable style={styles.bg} onPress={() => setShowReview(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.mTitle}>Confirm Payment</Text>
            <Text style={styles.confirmLead}>Please review the details before paying.</Text>
            <MRow label="Biller" value={biller?.name ?? '-'} />
            <MRow label="Account no" value={accountNo.trim()} />
            <MRow label="Purpose" value={purpose} />
            <MRow label="Amount" value={formatPeso(value)} />
            {discount > 0 ? <MRow label="Voucher" value={`−${formatPeso(discount)}`} /> : null}
            <MRow label="Service fee" value={formatPeso(0)} />
            <MRow label="Total to pay" value={formatPeso(total)} total />
            <View style={styles.payFrom}>
              <Feather name="briefcase" size={15} color={C.primary} />
              <Text style={styles.payFromText}>Wallet balance · {formatPeso(walletBalance)}</Text>
            </View>
            <Pressable style={styles.primary} onPress={confirm} accessibilityRole="button">
              <Text style={styles.primaryText}>Confirm &amp; Pay {formatPeso(total)}</Text>
            </Pressable>
            <Pressable style={styles.backLink} onPress={() => { setShowReview(false); setShowDetails(true); }} accessibilityRole="button">
              <Text style={styles.backText}>Back to details</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Step 3 — receipt */}
      <Modal visible={!!receipt} transparent animationType="slide" onRequestClose={done}>
        <Pressable style={styles.bg} onPress={done}>
          <Pressable style={styles.sheet}>
            {receipt ? (
              <>
                <View style={styles.receiptTop}>
                  <View style={styles.successIcon}><Feather name="check" size={28} color={C.textOnPrimary} /></View>
                  <Text style={styles.receiptTitle}>Payment Successful</Text>
                  <Text style={styles.receiptAmt}>{formatPeso(receipt.total)}</Text>
                  <View style={styles.paidPill}>
                    <Feather name="check-circle" size={12} color={C.success} />
                    <Text style={styles.paidPillText}>Paid</Text>
                  </View>
                </View>

                <View style={styles.receiptCard}>
                  <View style={styles.receiptBiller}>
                    <View style={styles.billerIcon}><Text style={styles.billerEmoji}>{receipt.icon}</Text></View>
                    <Text style={styles.receiptBillerName}>{receipt.biller}</Text>
                  </View>
                  <View style={styles.dash} />
                  <MRow label="Account number" value={receipt.accountNo} />
                  <MRow label="Purpose" value={receipt.purpose} />
                  <MRow label="Amount" value={formatPeso(receipt.amount)} />
                  {receipt.discount > 0 ? <MRow label="Voucher" value={`−${formatPeso(receipt.discount)}`} /> : null}
                  <MRow label="Total paid" value={formatPeso(receipt.total)} total />
                  <MRow label="Reference no." value={receipt.ref} />
                  <MRow label="Date & time" value={receipt.date} last />
                </View>

                <Pressable style={styles.primary} onPress={done} accessibilityRole="button">
                  <Text style={styles.primaryText}>Done</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function MRow({ label, value, total, last }: { label: string; value: string; total?: boolean; last?: boolean }) {
  return (
    <View style={[styles.mRow, total && styles.mTotalRow, last && { borderBottomWidth: 0 }]}>
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
  chips: { gap: 8, paddingHorizontal: 20, paddingVertical: 14 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: C.primary },
  chipOff: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipText: { color: C.textPrimary, fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  chipTextOn: { color: C.textOnPrimary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  biller: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 14, marginHorizontal: 20, marginTop: 10, padding: 12 },
  billerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  billerEmoji: { fontSize: 18 },
  billerName: { color: C.textPrimary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  billerCat: { color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  payLabel: { color: C.primary, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 32, marginHorizontal: 20, backgroundColor: C.surface, borderRadius: 18 },
  emptyText: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  bg: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 28 },
  mHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mBiller: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  mSub: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  confirmLead: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4, marginBottom: 10 },
  label: { color: C.textSecondary, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 14, marginBottom: 8 },
  input: { backgroundColor: C.inputBg, borderRadius: 14, padding: 14, fontSize: 15, fontFamily: 'Inter_500Medium', color: C.textPrimary },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  quick: { backgroundColor: C.iconBg, borderRadius: 13, paddingHorizontal: 12, height: 30, alignItems: 'center', justifyContent: 'center' },
  quickOn: { backgroundColor: C.primary },
  quickText: { color: C.primary, fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  quickTextOn: { color: C.textOnPrimary },
  voucher: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.inputBg, borderRadius: 14, padding: 12, minHeight: 52 },
  voucherText: { flex: 1, color: C.textPrimary, fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  summary: { backgroundColor: C.iconBg, borderRadius: 14, padding: 16, marginTop: 16 },
  sumLabel: { color: C.primary, fontSize: 11, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  sumAmount: { color: C.textPrimary, fontSize: 26, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 6 },
  sumFee: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  primary: { backgroundColor: C.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryText: { color: C.textOnPrimary, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  backLink: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  backText: { color: C.textSecondary, fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  mRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, gap: 12, borderBottomWidth: 1, borderBottomColor: C.divider },
  mLabel: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  mValue: { color: C.textPrimary, fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium', flexShrink: 1, textAlign: 'right' },
  mTotalRow: { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: C.border, marginTop: 4, paddingTop: 12 },
  mTotalLabel: { color: C.textPrimary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  mTotalValue: { color: C.primary, fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  payFrom: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.iconBg, borderRadius: 12, padding: 12, marginTop: 12 },
  payFromText: { color: C.primary, fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  receiptTop: { alignItems: 'center' },
  successIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' },
  receiptTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 12 },
  receiptAmt: { color: C.primary, fontSize: 30, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 4 },
  paidPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.catSuccessBg, borderRadius: 11, paddingHorizontal: 10, height: 24, marginTop: 10 },
  paidPillText: { color: C.success, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  receiptCard: { backgroundColor: C.inputBg, borderRadius: 18, padding: 16, marginTop: 18 },
  receiptBiller: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  receiptBillerName: { color: C.textPrimary, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  dash: { height: 1, backgroundColor: C.border, marginVertical: 12, borderStyle: 'dashed' },
}));
