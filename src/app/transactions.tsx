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
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { themeSheet, C } from '@/theme';
import { useFilPay, formatPeso } from '@/store';
import { getTransactions, deleteTransaction, recordTransaction } from '@/services/db';
import type { DbTransaction } from '@/services/db';
import { parseAmount, initialsOf } from '@/lib/ui';

// Transaction History — view, add, store and delete (with refund), all SQLite.

const TABS = [
  { key: 'All', cat: '' },
  { key: 'Deposits', cat: 'Deposits' },
  { key: 'Transfers', cat: 'Transfers' },
  { key: 'Payments', cat: 'Payments' },
  { key: 'Withdrawals', cat: 'Withdrawals' },
  { key: 'Card', cat: 'Card' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const ADD_TYPES = [
  { key: 'receive', label: 'Receive', category: 'Deposits', credit: true },
  { key: 'send', label: 'Send', category: 'Transfers', credit: false },
  { key: 'transfer', label: 'Transfer', category: 'Transfers', credit: false },
  { key: 'pay', label: 'Pay', category: 'Payments', credit: false },
] as const;

const STATUS_COLOR: Record<string, string> = {
  completed: C.success,
  pending: C.accent,
  failed: C.error,
};

export default function Transactions() {
  const { userId, reload, pushNotification } = useFilPay();
  const [tab, setTab] = useState<TabKey>('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DbTransaction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DbTransaction | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Add form.
  const [addType, setAddType] = useState<(typeof ADD_TYPES)[number]>(ADD_TYPES[0]);
  const [aName, setAName] = useState('');
  const [aAmount, setAAmount] = useState('');
  const [aPurpose, setAPurpose] = useState('');
  const [aImage, setAImage] = useState<string | null>(null);

  // Live SQLite read during render — search (LIKE) and category filter run in SQL.
  const cat = TABS.find((t) => t.key === tab)?.cat ?? '';
  const rows = userId !== null ? getTransactions(userId, search, cat) : [];

  const moneyIn = rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const moneyOut = rows.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow photo access to attach a picture.');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!res.canceled && res.assets[0]) setAImage(res.assets[0].uri);
  };

  const saveAdd = () => {
    if (userId === null) return Alert.alert('Cannot save', 'No active session.');
    const v = parseAmount(aAmount);
    if (!aName.trim()) return Alert.alert('Name', 'Enter a name.');
    if (!v || v <= 0) return Alert.alert('Amount', 'Enter an amount greater than zero.');

    recordTransaction(userId, {
      type: addType.key,
      category: addType.category,
      recipientName: aName.trim(),
      recipientImage: aImage,
      amount: addType.credit ? v : -v,
      purpose: aPurpose.trim() || addType.label,
    });

    reload();
    pushNotification({ title: 'Transaction added', body: `${aName.trim()} • ${formatPeso(v)}.`, kind: 'tx' });
    setAName('');
    setAAmount('');
    setAPurpose('');
    setAImage(null);
    setShowAdd(false);
  };

  const remove = (row: DbTransaction) => {
    if (userId === null) return;
    deleteTransaction(row.id, userId, row.amount, row.type);
    reload();
    pushNotification({ title: 'Transaction deleted', body: `${row.recipientName ?? 'Transaction'} • ${formatPeso(row.amount)} refunded.`, kind: 'tx' });
    setConfirmDelete(null);
    setSelected(null);
    Alert.alert('Deleted', 'Transaction removed and balance refunded.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Transactions" right={<Text style={styles.count}>{rows.length} total</Text>} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <View style={styles.sumCol}>
            <Text style={styles.sumLabel}>Money in</Text>
            <Text style={[styles.sumVal, { color: C.success }]}>{formatPeso(moneyIn)}</Text>
          </View>
          <View style={styles.sumDivider} />
          <View style={styles.sumCol}>
            <Text style={styles.sumLabel}>Money out</Text>
            <Text style={[styles.sumVal, { color: C.error }]}>{formatPeso(moneyOut)}</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Feather name="search" size={14} color={C.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search recipient, type or purpose"
            placeholderTextColor={C.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search transactions"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
              <Feather name="x" size={14} color={C.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Pressable key={t.key} style={[styles.chip, active ? styles.chipActive : styles.chipIdle]} onPress={() => setTab(t.key)} accessibilityRole="button">
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.key}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.hint}>Tap to view · long-press to delete</Text>

        <View style={styles.card}>
          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="inbox" size={28} color={C.textSecondary} />
              <Text style={styles.emptyTitle}>No transactions found</Text>
              <Text style={styles.emptySub}>Nothing here for this filter yet.</Text>
            </View>
          ) : (
            rows.map((t) => (
              <Pressable
                key={t.id}
                style={styles.row}
                accessibilityRole="button"
                onPress={() => setSelected(t)}
                onLongPress={() => setConfirmDelete(t)}
              >
                <Avatar uri={t.recipientImage} name={t.recipientName ?? '?'} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{t.recipientName ?? 'Transaction'}</Text>
                  <Text style={styles.rowSub}>{t.purpose ?? t.type} • {t.category}</Text>
                </View>
                <Text style={[styles.amount, { color: t.amount > 0 ? C.success : C.textPrimary }]}>{formatPeso(t.amount)}</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setShowAdd(true)} accessibilityRole="button" accessibilityLabel="Add transaction">
        <Feather name="plus" size={24} color={C.textOnPrimary} />
      </Pressable>

      <BottomNav active="home" />

      {/* View / detail receipt */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.bg} onPress={() => setSelected(null)}>
          <Pressable style={styles.sheet}>
            {selected ? (
              <>
                <View style={styles.dHead}>
                  <Avatar uri={selected.recipientImage} name={selected.recipientName ?? '?'} big />
                  <Text style={styles.dTitle}>{selected.recipientName ?? 'Transaction'}</Text>
                  <Text style={[styles.dAmt, { color: selected.amount > 0 ? C.success : C.textPrimary }]}>{formatPeso(selected.amount)}</Text>
                  <View style={[styles.statusPill, { backgroundColor: (STATUS_COLOR[selected.status] ?? C.success) + '22' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[selected.status] ?? C.success }]}>{selected.status}</Text>
                  </View>
                </View>
                <View style={styles.dList}>
                  <DRow k="Type" v={selected.type} />
                  <DRow k="Category" v={selected.category || '-'} />
                  <DRow k="Purpose" v={selected.purpose || '-'} />
                  {selected.recipientAccount ? <DRow k="Account" v={selected.recipientAccount} /> : null}
                  {selected.bankName ? <DRow k="Bank / Wallet" v={selected.bankName} /> : null}
                  {selected.transferType ? <DRow k="Transfer type" v={selected.transferType} /> : null}
                  <DRow k="Date" v={selected.timestamp} />
                  <DRow k="Reference" v={selected.referenceNo || `FP${String(selected.id).padStart(8, '0')}`} />
                  <DRow k="Status" v={selected.status} last />
                </View>
                <Pressable style={styles.delete} onPress={() => setConfirmDelete(selected)} accessibilityRole="button">
                  <Feather name="trash-2" size={16} color={C.error} />
                  <Text style={styles.deleteText}>Delete transaction</Text>
                </Pressable>
                <Pressable style={styles.done} onPress={() => setSelected(null)} accessibilityRole="button">
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <Pressable style={styles.bgCenter} onPress={() => setConfirmDelete(null)}>
          <Pressable style={styles.confirmCard}>
            <Text style={styles.mTitle}>Delete transaction?</Text>
            <Text style={styles.confirmBody}>
              {confirmDelete
                ? `${confirmDelete.recipientName ?? 'This transaction'} • ${formatPeso(confirmDelete.amount)}. The amount will be refunded to your balance.`
                : ''}
            </Text>
            <View style={styles.confirmRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setConfirmDelete(null)} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.dangerBtn} onPress={() => confirmDelete && remove(confirmDelete)} accessibilityRole="button">
                <Text style={styles.dangerText}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add transaction */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <Pressable style={styles.bg} onPress={() => setShowAdd(false)}>
          <Pressable style={styles.sheet}>
            <View style={styles.mHead}>
              <Text style={styles.mTitleLeft}>Add Transaction</Text>
              <Pressable onPress={() => setShowAdd(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <Feather name="x" size={18} color={C.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.mLabel}>Type</Text>
            <View style={styles.typeRow}>
              {ADD_TYPES.map((t) => {
                const active = t.key === addType.key;
                return (
                  <Pressable key={t.key} style={[styles.typeChip, active && styles.typeChipOn]} onPress={() => setAddType(t)} accessibilityRole="button">
                    <Text style={[styles.typeText, active && styles.typeTextOn]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.picRow} onPress={pickImage} accessibilityRole="button" accessibilityLabel="Attach picture">
              <Avatar uri={aImage} name={aName || '?'} />
              <Text style={styles.picText}>{aImage ? 'Change picture' : 'Attach picture (optional)'}</Text>
            </Pressable>

            <Text style={styles.mLabel}>Name</Text>
            <TextInput style={styles.input} value={aName} onChangeText={setAName} placeholder="Recipient / source" placeholderTextColor={C.textSecondary} />
            <Text style={styles.mLabel}>Amount</Text>
            <TextInput style={styles.input} value={aAmount} onChangeText={setAAmount} placeholder="0.00" placeholderTextColor={C.textSecondary} keyboardType="decimal-pad" />
            <Text style={styles.mLabel}>Purpose</Text>
            <TextInput style={styles.input} value={aPurpose} onChangeText={setAPurpose} placeholder="e.g. Family Support" placeholderTextColor={C.textSecondary} />

            <Pressable style={styles.done} onPress={saveAdd} accessibilityRole="button">
              <Text style={styles.doneText}>Save transaction</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Avatar({ uri, name, big }: { uri?: string | null; name: string; big?: boolean }) {
  const style = big ? styles.dAvatar : styles.avatar;
  if (uri) return <Image source={{ uri }} style={style} />;
  return (
    <View style={style}>
      <Text style={[styles.init, big && styles.initBig]}>{initialsOf(name) || '?'}</Text>
    </View>
  );
}

function DRow({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <View style={[styles.dRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.dKey}>{k}</Text>
      <Text style={styles.dVal}>{v}</Text>
    </View>
  );
}

const styles = themeSheet(() => ({
  safe: { flex: 1, backgroundColor: C.background },
  content: { paddingBottom: 96 },
  count: { color: C.textOnPrimary, fontSize: 11, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  summary: { flexDirection: 'row', backgroundColor: C.surface, marginHorizontal: 20, marginTop: 16, borderRadius: 18, padding: 16 },
  sumCol: { flex: 1 },
  sumDivider: { width: 1, backgroundColor: C.border, marginHorizontal: 12 },
  sumLabel: { color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_400Regular' },
  sumVal: { color: C.textPrimary, fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 14, marginHorizontal: 20, marginTop: 14, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_400Regular', padding: 0 },
  chips: { paddingHorizontal: 20, marginTop: 14, gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 13, borderWidth: 1 },
  chipIdle: { backgroundColor: C.surface, borderColor: C.border },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { color: C.textPrimary, fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  chipTextActive: { color: C.textOnPrimary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  hint: { color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_400Regular', marginHorizontal: 20, marginTop: 12 },
  card: { backgroundColor: C.surface, marginHorizontal: 20, marginTop: 8, borderRadius: 18, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  init: { color: C.primary, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  initBig: { fontSize: 20 },
  rowTitle: { color: C.textPrimary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  rowSub: { color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  amount: { color: C.textPrimary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 28 },
  emptyTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 4 },
  emptySub: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  fab: { position: 'absolute', right: 20, bottom: 100, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  bg: { flex: 1, backgroundColor: C.overlaySoft, justifyContent: 'flex-end' },
  bgCenter: { flex: 1, backgroundColor: C.overlay, justifyContent: 'center', paddingHorizontal: 32 },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  dHead: { alignItems: 'center' },
  dAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 10, textAlign: 'center' },
  dAmt: { color: C.textPrimary, fontSize: 26, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 6 },
  statusPill: { borderRadius: 11, paddingHorizontal: 10, height: 22, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  statusText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize' },
  dList: { marginTop: 16 },
  dRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.divider },
  dKey: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' },
  dVal: { color: C.textPrimary, fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.errorSoft, borderRadius: 14, height: 48, marginTop: 16 },
  deleteText: { color: C.error, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  done: { backgroundColor: C.primary, borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  doneText: { color: C.textOnPrimary, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  confirmCard: { backgroundColor: C.surface, borderRadius: 20, padding: 24 },
  mTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  mTitleLeft: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  mHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  confirmBody: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular', color: C.textSecondary, marginTop: 8 },
  confirmRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, height: 46, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  dangerBtn: { flex: 1, height: 46, borderRadius: 14, backgroundColor: C.error, alignItems: 'center', justifyContent: 'center' },
  dangerText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textOnPrimary },
  mLabel: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: C.border, backgroundColor: C.inputBg, borderRadius: 14, padding: 12, fontSize: 14, fontFamily: 'Inter_500Medium', color: C.textPrimary },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { backgroundColor: C.iconBg, borderRadius: 13, paddingHorizontal: 14, height: 32, alignItems: 'center', justifyContent: 'center' },
  typeChipOn: { backgroundColor: C.primary },
  typeText: { color: C.primary, fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  typeTextOn: { color: C.textOnPrimary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  picRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  picText: { color: C.primary, fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium' },
}));
