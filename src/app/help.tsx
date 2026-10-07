import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { themeSheet, C } from '@/theme';

const FAQS: { q: string; a: string }[] = [
  { q: 'How do I send money?', a: 'Open Send Money from the home screen, choose a recipient, enter the amount, then confirm on the review screen.' },
  { q: 'How do I scan and pay?', a: 'Open Scan and Pay, allow camera access, point the camera at the merchant QR code, enter the amount and confirm.' },
  { q: 'Is there a fee?', a: 'Transfers between FilPay accounts are free. Bill payments have no service fee.' },
  { q: 'How do I add money?', a: 'Use Receive Money to show your QR, or use the simulate incoming payment option for testing.' },
  { q: 'How do I freeze my card?', a: 'Open the FilPay Card tab and tap the Freeze Card tile. Tap Unfreeze to restore it.' },
  { q: 'How do I change my PIN?', a: 'Go to Profile, then Security, then Change PIN.' },
];

const CONTACTS: { icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { icon: 'message-circle', label: 'Live chat' },
  { icon: 'mail', label: 'Email support' },
  { icon: 'phone', label: 'Call us' },
];

export default function Help() {
  const [open, setOpen] = useState<number | null>(0);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AppHeader title="Help Center" />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>FAQ</Text>
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            const last = i === FAQS.length - 1;
            return (
              <View key={item.q} style={!last ? styles.faqBorder : undefined}>
                <Pressable
                  style={styles.faqHead}
                  onPress={() => setOpen(isOpen ? null : i)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}>
                  <Text style={styles.faqQ}>{item.q}</Text>
                  <Feather name={isOpen ? 'chevron-down' : 'chevron-right'} size={18} color={C.textSecondary} />
                </Pressable>
                {isOpen ? <Text style={styles.faqA}>{item.a}</Text> : null}
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact us</Text>
          {CONTACTS.map((c, i) => (
            <Pressable
              key={c.label}
              style={[styles.contactRow, i < CONTACTS.length - 1 && styles.contactBorder]}
              onPress={() => {
                if (c.label === 'Live chat') setChatOpen(true);
                else if (c.label === 'Email support') Alert.alert('Email', 'help@filpay.ph');
                else Alert.alert('Call', '+63 2 8888 1234');
              }}
              accessibilityRole="button">
              <View style={styles.cIcon}><Feather name={c.icon} size={16} color={C.primary} /></View>
              <Text style={styles.cLabel}>{c.label}</Text>
              <Feather name="chevron-right" size={20} color={C.textSecondary} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.version}>FilPay v1.0.0</Text>
      </ScrollView>
      <BottomNav active="more" />

      <Modal visible={chatOpen} transparent animationType="fade" onRequestClose={() => setChatOpen(false)}>
        <Pressable style={styles.bgCenter} onPress={() => setChatOpen(false)}>
          <Pressable style={styles.confirmCard}>
            <View style={styles.chatIcon}><Feather name="message-circle" size={22} color={C.primary} /></View>
            <Text style={styles.mTitle}>Live chat</Text>
            <Text style={styles.mBody}>An agent will respond here shortly. Typical reply time is under 5 minutes.</Text>
            <Pressable style={styles.done} onPress={() => setChatOpen(false)}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = themeSheet(() => ({
  safe: { flex: 1, backgroundColor: C.background },
  content: { paddingBottom: 24 },
  card: { backgroundColor: C.surface, borderRadius: 18, marginHorizontal: 20, marginTop: 14, padding: 16 },
  cardTitle: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary, marginBottom: 6 },
  faqBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  faqQ: { flex: 1, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  faqA: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular', color: C.textSecondary, paddingBottom: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  contactBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  cIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  cLabel: { flex: 1, fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium', color: C.textPrimary },
  version: { fontSize: 11, fontFamily: 'Inter_400Regular', color: C.textSecondary, textAlign: 'center', marginTop: 20 },
  bgCenter: { flex: 1, backgroundColor: C.overlay, justifyContent: 'center', paddingHorizontal: 32 },
  confirmCard: { backgroundColor: C.surface, borderRadius: 20, padding: 24, alignItems: 'center' },
  chatIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  mTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  mBody: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular', color: C.textSecondary, marginTop: 8, textAlign: 'center' },
  done: { backgroundColor: C.primary, borderRadius: 14, height: 46, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  doneText: { color: C.textOnPrimary, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
}));
