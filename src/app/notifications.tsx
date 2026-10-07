import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { themeSheet, C } from '@/theme';
import { useFilPay, type NotificationItem } from '@/store';

type NotifKind = NotificationItem['kind'];
type Glyph = keyof typeof Feather.glyphMap;

const KIND_META: Record<NotifKind, { icon: Glyph; color: string }> = {
  tx: { icon: 'bell', color: C.primary },
  promo: { icon: 'gift', color: C.accent },
  security: { icon: 'shield', color: C.error },
};

/**
 * Notifications are persisted as JSON, so an entry written by an earlier build
 * can carry a `kind` this map no longer knows about. Falling back to the generic
 * row keeps the list rendering instead of throwing on `m.icon`.
 */
const FALLBACK_META = KIND_META.tx;
const metaOf = (n: NotificationItem) => KIND_META[n.kind] ?? FALLBACK_META;

export default function Notifications() {
  const { notifications, unreadCount, markRead, markAllRead, clearNotifications, removeNotification } = useFilPay();
  const [selected, setSelected] = useState<NotificationItem | null>(null);

  const open = (n: NotificationItem) => {
    markRead(n.id);
    setSelected(n);
  };

  const confirmDelete = (n: NotificationItem) => {
    Alert.alert('Delete notification', `Remove "${n.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeNotification(n.id) },
    ]);
  };

  const deleteFromSheet = () => {
    if (!selected) return;
    const id = selected.id;
    setSelected(null);
    removeNotification(id);
  };

  const selectedMeta = selected ? metaOf(selected) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Notifications"
        right={
          unreadCount > 0 ? (
            <Pressable onPress={markAllRead} hitSlop={8} accessibilityRole="button">
              <Text style={styles.markAll}>Mark all</Text>
            </Pressable>
          ) : null
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="bell-off" size={28} color={C.primary} />
            </View>
            <Text style={styles.emptyTitle}>You are all caught up</Text>
            <Text style={styles.emptySub}>New alerts will show up here.</Text>
          </View>
        ) : (
          notifications.map((n) => {
            const m = metaOf(n);
            return (
              <Pressable
                key={n.id}
                style={[styles.row, !n.read && styles.rowUnread]}
                accessibilityRole="button"
                onPress={() => open(n)}>
                <View style={[styles.dot, { backgroundColor: n.read ? 'transparent' : C.accent }]} />
                <View style={[styles.icon, { backgroundColor: C.iconBg }]}>
                  <Feather name={m.icon} size={17} color={m.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{n.title}</Text>
                  <Text style={styles.rowBody}>{n.body}</Text>
                </View>
                <Text style={styles.time}>{n.time}</Text>
                <Pressable
                  style={styles.rowDelete}
                  onPress={() => confirmDelete(n)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete notification ${n.title}`}>
                  <Feather name="trash-2" size={15} color={C.textSecondary} />
                </Pressable>
              </Pressable>
            );
          })
        )}

        {notifications.length > 0 && (
          <Pressable style={styles.clear} onPress={clearNotifications} accessibilityRole="button">
            <Feather name="trash-2" size={15} color={C.error} />
            <Text style={styles.clearText}>Clear all</Text>
          </Pressable>
        )}
      </ScrollView>

      <BottomNav active="more" />

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.bg} onPress={() => setSelected(null)}>
          <Pressable style={styles.sheet}>
            {selected && selectedMeta ? (
              <>
                <View style={styles.dIcon}>
                  <Feather name={selectedMeta.icon} size={26} color={selectedMeta.color} />
                </View>
                <Text style={styles.dKind}>{selected.kind === 'tx' ? 'Transaction' : selected.kind === 'promo' ? 'Promotion' : 'Security'}</Text>
                <Text style={styles.dTitle}>{selected.title}</Text>
                <Text style={styles.dBody}>{selected.body}</Text>
                <Text style={styles.dTime}>{selected.time}</Text>
                <Pressable style={styles.sheetDelete} onPress={deleteFromSheet} accessibilityRole="button">
                  <Feather name="trash-2" size={16} color={C.error} />
                  <Text style={styles.sheetDeleteText}>Delete notification</Text>
                </Pressable>
                <Pressable style={styles.close} onPress={() => setSelected(null)} accessibilityRole="button">
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
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
  content: { paddingTop: 16, paddingBottom: 20 },
  markAll: { color: C.textOnPrimary, fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surface,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 16,
    padding: 14,
  },
  rowUnread: { backgroundColor: C.iconBg },
  dot: { width: 6, height: 6, borderRadius: 3 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: C.textPrimary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  rowBody: { color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3 },
  time: { color: C.textSecondary, fontSize: 10, fontFamily: 'Inter_400Regular', textAlign: 'right', width: 52 },
  rowDelete: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' },
  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  clearText: { color: C.error, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  empty: { alignItems: 'center', marginTop: 64 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 14 },
  emptySub: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  bg: { flex: 1, backgroundColor: C.overlaySoft, justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28, alignItems: 'center' },
  dIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  dKind: { color: C.textSecondary, fontSize: 11, fontWeight: '500', fontFamily: 'Inter_500Medium', marginTop: 10 },
  dTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 2, textAlign: 'center' },
  dBody: { color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 8, textAlign: 'center', lineHeight: 19 },
  dTime: { color: C.textSecondary, fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 10 },
  sheetDelete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, alignSelf: 'stretch', backgroundColor: C.errorSoft, borderRadius: 14, height: 48 },
  sheetDeleteText: { color: C.error, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  close: { marginTop: 18, alignSelf: 'stretch', backgroundColor: C.primary, borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: C.textOnPrimary, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
}));
