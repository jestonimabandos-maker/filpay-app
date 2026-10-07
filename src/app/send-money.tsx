import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhoneStatusBar from '@/components/PhoneStatusBar';
import { themeSheet, C } from '@/theme';
import { useFilPay, formatPeso } from '@/store';
import {
  getRecipients,
  addRecipient,
  updateRecipientImage,
  getVouchers,
  useVoucher as redeemVoucher,
  recordTransaction,
} from '@/services/db';
import type { DbRecipient } from '@/services/db';
import { QUICK_AMOUNTS, PURPOSES, parseAmount, initialsOf } from '@/lib/ui';

// Transfer Money — To FilPay / To Another Bank / To E-Wallet, InstaPay/PESONet,
// recipients from SQLite, vouchers, confirmation + result with reference number.
type Tab = 'FilPay' | 'Other Bank' | 'E-Wallet';
const TABS: Tab[] = ['FilPay', 'Other Bank', 'E-Wallet'];
const TAB_LABEL: Record<Tab, string> = {
  FilPay: 'To FilPay',
  'Other Bank': 'To Another Bank',
  'E-Wallet': 'To E-Wallet',
};
const INSTAPAY_FEE = 15;

export default function TransferMoney() {
  const { userId, walletBalance, reload, pushNotification } = useFilPay();

  const [tab, setTab] = useState<Tab>('FilPay');
  const [transferType, setTransferType] = useState<'InstaPay' | 'PESONet'>('InstaPay');
  const [recipient, setRecipient] = useState<DbRecipient | null>(null);
  const [amount, setAmount] = useState('1000.00');
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [voucherId, setVoucherId] = useState<number | null>(null);
  const [showReceivers, setShowReceivers] = useState(false);
  const [showPurposes, setShowPurposes] = useState(false);
  const [showVouchers, setShowVouchers] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [resultRef, setResultRef] = useState<string | null>(null);

  // Add-recipient form.
  const [nName, setNName] = useState('');
  const [nAccount, setNAccount] = useState('');
  const [nBank, setNBank] = useState('FilPay');
  const [nImage, setNImage] = useState<string | null>(null);

  // Live SQLite reads during render — `reload()` after any write forces a re-render.
  const recipients = userId !== null ? getRecipients(userId) : [];
  const vouchers =
    userId !== null
      ? getVouchers(userId).filter((v) => v.category === 'Transfer' && v.isClaimed === 1 && v.isUsed === 0)
      : [];

  const list = recipients.filter((r) => (r.type ?? 'FilPay') === tab);

  const value = parseAmount(amount);
  const baseFee = tab === 'FilPay' || tab === 'E-Wallet' ? 0 : transferType === 'InstaPay' ? INSTAPAY_FEE : 0;
  const voucher = vouchers.find((v) => v.id === voucherId) ?? null;
  const fee = Math.max(0, baseFee - (voucher?.discount ?? 0));
  const total = value + fee;
  const exceeds = total > walletBalance;

  const pickTab = (t: Tab) => {
    setTab(t);
    setRecipient(null);
    if (t === 'FilPay' || t === 'E-Wallet') setTransferType('InstaPay');
  };

  const openReceivers = () => {
    setShowReceivers(true);
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a recipient picture.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!res.canceled && res.assets[0]) setNImage(res.assets[0].uri);
  };

  const saveRecipient = () => {
    if (!nName.trim()) return Alert.alert('Name', 'Enter the recipient name.');
    if (nAccount.trim().length < 4) return Alert.alert('Account', 'Enter at least 4 characters.');
    if (userId === null) return Alert.alert('Cannot save', 'No active session.');

    addRecipient(userId, nName.trim(), nAccount.trim(), nBank.trim() || 'FilPay', tab);
    if (nImage) {
      const rows = getRecipients(userId);
      const created = rows[rows.length - 1];
      if (created) updateRecipientImage(created.id, nImage);
    }

    setNName('');
    setNAccount('');
    setNBank('FilPay');
    setNImage(null);
    setShowAdd(false);
  };

  const openReview = () => {
    if (!recipient) return Alert.alert('Choose recipient', 'Pick who you are sending money to.');
    if (!value || value <= 0) return Alert.alert('Invalid', 'Enter an amount.');
    if (exceeds) return Alert.alert('Insufficient', 'Total exceeds your wallet balance.');
    setShowReview(true);
  };

  const confirm = () => {
    if (!recipient || userId === null) return;
    if (exceeds) return Alert.alert('Insufficient', 'Total exceeds your wallet balance.');

    const ref = recordTransaction(userId, {
      type: 'transfer',
      category: 'Transfers',
      recipientName: recipient.name ?? 'Recipient',
      recipientAccount: recipient.accountNumber ?? '',
      recipientImage: recipient.image ?? null,
      amount: -total,
      purpose,
      bankName: recipient.bankName ?? tab,
      transferType: tab === 'Other Bank' ? transferType : 'Instant',
    });

    if (voucher) redeemVoucher(voucher.id);

    reload();
    pushNotification({ title: 'Transfer sent', body: `${formatPeso(total)} sent to ${recipient.name ?? 'recipient'}.`, kind: 'tx' });
    setShowReview(false);
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
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Feather name="arrow-left" size={22} color={C.textOnPrimary} />
        </Pressable>
        <Text style={styles.title}>Transfer Money</Text>
        <Pressable onPress={openReceivers} accessibilityRole="button" accessibilityLabel="Manage recipients" hitSlop={8}>
          <Feather name="users" size={20} color={C.textOnPrimary} />
        </Pressable>
      </View>

      <View style={styles.sheet}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={styles.tabs}>
            {TABS.map((t) => {
              const active = t === tab;
              return (
                <Pressable key={t} style={[styles.tab, active && styles.tabOn]} onPress={() => pickTab(t)} accessibilityRole="button">
                  <Text style={[styles.tabText, active && styles.tabTextOn]} numberOfLines={1}>{TAB_LABEL[t]}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Recipient</Text>
          <Pressable style={styles.card} onPress={() => setShowReceivers(true)}>
            <Avatar uri={recipient?.image} name={recipient?.name ?? '?'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{recipient ? recipient.name : 'Choose a recipient'}</Text>
              <Text style={styles.sub}>{recipient ? `${recipient.bankName} • ${recipient.accountNumber}` : 'Tap to pick from your recipients'}</Text>
            </View>
            <Feather name="chevron-right" size={22} color={C.textSecondary} />
          </Pressable>

          {tab === 'Other Bank' ? (
            <>
              <Text style={styles.label}>Transfer type</Text>
              <View style={styles.seg}>
                {(['InstaPay', 'PESONet'] as const).map((t) => {
                  const active = t === transferType;
                  return (
                    <Pressable key={t} style={[styles.segItem, active && styles.segItemOn]} onPress={() => setTransferType(t)} accessibilityRole="button">
                      <Text style={[styles.segTitle, active && styles.segTitleOn]}>{t}</Text>
                      <Text style={[styles.segSub, active && styles.segSubOn]}>{t === 'InstaPay' ? `Instant • ₱${INSTAPAY_FEE}` : 'Next day • Free'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          <Text style={styles.label}>Amount</Text>
          <View style={styles.card}>
            <View style={styles.pesoBox}><Text style={styles.peso}>₱</Text></View>
            <TextInput style={styles.amount} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={C.textSecondary} />
          </View>
          {exceeds ? <Text style={styles.helper}>Total exceeds your balance of {formatPeso(walletBalance)}</Text> : null}
          <View style={styles.chips}>
            {QUICK_AMOUNTS.map((q) => (
              <Pressable key={q} style={styles.chip} onPress={() => setAmount(q.toFixed(2))} accessibilityRole="button">
                <Text style={styles.chipText}>{formatPeso(q)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Purpose</Text>
          <Pressable style={styles.cardSm} onPress={() => setShowPurposes(true)}>
            <View style={styles.heartBox}><Feather name="heart" size={14} color={C.primary} /></View>
            <Text style={styles.purpose}>{purpose}</Text>
            <Feather name="chevron-down" size={18} color={C.textSecondary} />
          </Pressable>

          <Text style={styles.label}>Voucher</Text>
          <Pressable style={styles.cardSm} onPress={() => setShowVouchers(true)}>
            <View style={styles.heartBox}><Feather name="tag" size={14} color={C.primary} /></View>
            <Text style={styles.purpose}>{voucher ? `${voucher.title} (−${formatPeso(voucher.discount ?? 0)})` : 'Apply a transfer voucher'}</Text>
            {voucher ? (
              <Pressable hitSlop={8} onPress={() => setVoucherId(null)} accessibilityRole="button" accessibilityLabel="Remove voucher">
                <Feather name="x" size={16} color={C.textSecondary} />
              </Pressable>
            ) : (
              <Feather name="chevron-down" size={18} color={C.textSecondary} />
            )}
          </Pressable>

          <Text style={styles.avail}>Available: {formatPeso(walletBalance)}</Text>

          <View style={styles.summary}>
            <View style={styles.sumTop}>
              <Text style={styles.sumLabel}>You will send</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{fee === 0 ? 'Free' : `Fee ${formatPeso(fee)}`}</Text></View>
            </View>
            <Text style={styles.sumAmount}>{formatPeso(total)}</Text>
            <Text style={styles.sumFee}>Fee: {formatPeso(fee)}  •  Total: {formatPeso(total)}</Text>
          </View>

          <Pressable style={[styles.review, exceeds && { opacity: 0.5 }]} onPress={openReview} disabled={exceeds}>
            <Text style={styles.reviewText}>Review</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Recipients picker */}
      <Modal visible={showReceivers} transparent animationType="slide" onRequestClose={() => setShowReceivers(false)}>
        <Pressable style={styles.bg} onPress={() => setShowReceivers(false)}>
          <Pressable style={styles.modal}>
            <View style={styles.mHead}>
              <Text style={styles.mTitle}>Choose Recipient</Text>
              <Pressable onPress={() => setShowReceivers(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <Feather name="x" size={18} color={C.textSecondary} />
              </Pressable>
            </View>
            {list.length === 0 ? (
              <Text style={styles.emptyText}>No recipients in this tab yet.</Text>
            ) : (
              list.map((r) => (
                <Pressable key={r.id} style={styles.mRow} onPress={() => { setRecipient(r); setShowReceivers(false); }} accessibilityRole="button">
                  <Avatar uri={r.image} name={r.name ?? '?'} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{r.name}</Text>
                    <Text style={styles.sub}>{r.bankName} • {r.accountNumber}</Text>
                  </View>
                  {recipient?.id === r.id ? <Feather name="check" size={18} color={C.primary} /> : null}
                </Pressable>
              ))
            )}
            <Pressable style={styles.addBtn} onPress={() => { setShowReceivers(false); setShowAdd(true); }} accessibilityRole="button">
              <Feather name="plus" size={16} color={C.primary} />
              <Text style={styles.addBtnText}>Add recipient</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add recipient */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <Pressable style={styles.bg} onPress={() => setShowAdd(false)}>
          <Pressable style={styles.modal}>
            <View style={styles.mHead}>
              <Text style={styles.mTitle}>Add Recipient</Text>
              <Pressable onPress={() => setShowAdd(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <Feather name="x" size={18} color={C.textSecondary} />
              </Pressable>
            </View>

            <Pressable style={styles.picRow} onPress={pickImage} accessibilityRole="button" accessibilityLabel="Add recipient picture">
              <Avatar uri={nImage} name={nName || '?'} />
              <Text style={styles.picText}>{nImage ? 'Change picture' : 'Add picture (optional)'}</Text>
            </Pressable>

            <Text style={styles.mLabel}>Name</Text>
            <TextInput style={styles.input} value={nName} onChangeText={setNName} placeholder="Recipient name" placeholderTextColor={C.textSecondary} />
            <Text style={styles.mLabel}>Account number</Text>
            <TextInput style={styles.input} value={nAccount} onChangeText={setNAccount} placeholder="09XX XXX XXXX" placeholderTextColor={C.textSecondary} keyboardType="phone-pad" />
            <Text style={styles.mLabel}>Bank / Wallet</Text>
            <TextInput style={styles.input} value={nBank} onChangeText={setNBank} placeholder="FilPay / BPI / GCash" placeholderTextColor={C.textSecondary} />
            <Text style={styles.mLabel}>Type</Text>
            <View style={styles.segSmall}>
              {TABS.map((t) => {
                const active = t === tab;
                return (
                  <Pressable key={t} style={[styles.segSmallItem, active && styles.segItemOn]} onPress={() => setTab(t)} accessibilityRole="button">
                    <Text style={[styles.segSmallText, active && styles.segTitleOn]}>{TAB_LABEL[t]}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.review} onPress={saveRecipient}>
              <Text style={styles.reviewText}>Save recipient</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Purposes */}
      <Modal visible={showPurposes} transparent animationType="slide" onRequestClose={() => setShowPurposes(false)}>
        <Pressable style={styles.bg} onPress={() => setShowPurposes(false)}>
          <Pressable style={styles.modal}>
            <Text style={styles.mTitle}>Purpose</Text>
            {PURPOSES.map((p) => (
              <Pressable key={p} style={styles.mRow} onPress={() => { setPurpose(p); setShowPurposes(false); }} accessibilityRole="button">
                <Text style={styles.name}>{p}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Vouchers */}
      <Modal visible={showVouchers} transparent animationType="slide" onRequestClose={() => setShowVouchers(false)}>
        <Pressable style={styles.bg} onPress={() => setShowVouchers(false)}>
          <Pressable style={styles.modal}>
            <Text style={styles.mTitle}>Apply Voucher</Text>
            {vouchers.length === 0 ? (
              <Text style={styles.emptyText}>No transfer vouchers available.</Text>
            ) : (
              vouchers.map((v) => (
                <Pressable key={v.id} style={styles.mRow} onPress={() => { setVoucherId(v.id); setShowVouchers(false); }} accessibilityRole="button">
                  <View style={styles.heartBox}><Feather name="tag" size={14} color={C.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{v.title}</Text>
                    <Text style={styles.sub}>{v.code} • expires {v.expiry}</Text>
                  </View>
                  {voucherId === v.id ? <Feather name="check" size={18} color={C.primary} /> : null}
                </Pressable>
              ))
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirmation */}
      <Modal visible={showReview} transparent animationType="slide" onRequestClose={() => setShowReview(false)}>
        <Pressable style={styles.bg} onPress={() => setShowReview(false)}>
          <Pressable style={styles.modal}>
            <Text style={styles.mTitle}>Confirm Transfer</Text>
            <Row label="Recipient" value={recipient?.name ?? '-'} />
            <Row label="Account" value={recipient?.accountNumber ?? '-'} />
            <Row label="Bank / Wallet" value={recipient?.bankName ?? tab} />
            <Row label="Transfer type" value={tab === 'Other Bank' ? transferType : 'Instant'} />
            <Row label="Amount" value={formatPeso(value)} />
            <Row label="Voucher" value={voucher ? `−${formatPeso(voucher.discount ?? 0)}` : 'None'} />
            <Row label="Fee" value={formatPeso(fee)} />
            <Row label="Total" value={formatPeso(total)} total />
            <Row label="Reference" value="Generated on confirm" />
            <Pressable style={styles.review} onPress={confirm}>
              <Text style={styles.reviewText}>Confirm &amp; Send</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Result */}
      <Modal visible={!!resultRef} transparent animationType="slide" onRequestClose={done}>
        <Pressable style={styles.bg} onPress={done}>
          <Pressable style={styles.modal}>
            <View style={styles.resultIcon}><Feather name="check" size={26} color={C.success} /></View>
            <Text style={styles.resultTitle}>Transfer sent</Text>
            <Text style={styles.resultSub}>{formatPeso(total)} to {recipient?.name ?? 'recipient'}</Text>
            <Row label="Reference" value={resultRef ?? '-'} />
            <Pressable style={styles.review} onPress={done}>
              <Text style={styles.reviewText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/** Picture when we have one, otherwise the name's initials. */
function Avatar({ uri, name }: { uri?: string | null; name: string }) {
  if (uri) return <Image source={{ uri }} style={styles.avatar} />;
  return (
    <View style={styles.avatar}>
      <Text style={styles.init}>{initialsOf(name) || '?'}</Text>
    </View>
  );
}

function Row({ label, value, total }: { label: string; value: string; total?: boolean }) {
  return (
    <View style={[styles.mRow, total && styles.mTotalRow]}>
      <Text style={[styles.mKey, total && styles.mTotalKey]}>{label}</Text>
      <Text style={[styles.mVal, total && styles.mTotalVal]}>{value}</Text>
    </View>
  );
}

const styles = themeSheet(() => ({
  safe: { flex: 1, backgroundColor: C.primary },
  head: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 12 },
  title: { flex: 1, color: C.textOnPrimary, fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  sheet: { flex: 1, backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 16, marginTop: 8 },
  tabs: { flexDirection: 'row', gap: 6, backgroundColor: C.inputBg, borderRadius: 14, padding: 4 },
  tab: { flex: 1, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: C.primary },
  tabText: { color: C.textSecondary, fontSize: 11, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  tabTextOn: { color: C.textOnPrimary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  label: { color: C.textSecondary, fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 14, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.inputBg, borderRadius: 14, padding: 14, minHeight: 68 },
  cardSm: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.inputBg, borderRadius: 14, padding: 12, minHeight: 56 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  init: { color: C.primary, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  name: { color: C.textPrimary, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  sub: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  pesoBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  peso: { color: C.primary, fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  amount: { flex: 1, fontSize: 26, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  helper: { color: C.error, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { backgroundColor: C.iconBg, borderRadius: 13, paddingHorizontal: 12, height: 30, alignItems: 'center', justifyContent: 'center' },
  chipText: { color: C.primary, fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  purpose: { flex: 1, color: C.textPrimary, fontSize: 14, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  heartBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', gap: 10 },
  segItem: { flex: 1, borderRadius: 14, padding: 12, backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: 'transparent' },
  segItemOn: { borderColor: C.primary, backgroundColor: C.iconBg },
  segTitle: { color: C.textPrimary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  segTitleOn: { color: C.primary },
  segSub: { color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3 },
  segSubOn: { color: C.primary },
  segSmall: { flexDirection: 'row', gap: 6, marginTop: 4 },
  segSmallItem: { flex: 1, height: 34, borderRadius: 11, backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  segSmallText: { color: C.textSecondary, fontSize: 11, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  avail: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 14 },
  summary: { backgroundColor: C.iconBg, borderRadius: 14, padding: 16, marginTop: 8, minHeight: 108 },
  sumTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { color: C.primary, fontSize: 11, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  badge: { backgroundColor: C.accent, borderRadius: 11, paddingHorizontal: 8, height: 22, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: C.textPrimary, fontSize: 9.5, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  sumAmount: { color: C.textPrimary, fontSize: 26, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 6 },
  sumFee: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  review: { backgroundColor: C.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  reviewText: { color: C.textOnPrimary, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  bg: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  mHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  mTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary, marginBottom: 12 },
  mRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  mKey: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },
  mVal: { color: C.textPrimary, fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium', flexShrink: 1, textAlign: 'right' },
  mTotalRow: { borderTopWidth: 1, borderTopColor: C.border, marginTop: 4, paddingTop: 12 },
  mTotalKey: { color: C.textPrimary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  mTotalVal: { color: C.primary, fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  mLabel: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: C.border, backgroundColor: C.inputBg, borderRadius: 14, padding: 12, fontSize: 14, fontFamily: 'Inter_500Medium', color: C.textPrimary },
  emptyText: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', paddingVertical: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.iconBg, borderRadius: 14, height: 48, marginTop: 12 },
  addBtnText: { color: C.primary, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  picRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  picText: { color: C.primary, fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  resultIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.catSuccessBg, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  resultTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center', marginTop: 12 },
  resultSub: { color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 4, marginBottom: 8 },
}));
