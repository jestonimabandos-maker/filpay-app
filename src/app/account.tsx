import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Switch, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhoneStatusBar from '@/components/PhoneStatusBar';
import { themeSheet, C } from '@/theme';
import { useFilPay } from '@/store';
import { isValidEmail, isValidPhone } from '@/lib/ui';

export default function Account() {
  const { user, setUser, setPin, settings, setBiometric, logout, resetAll } = useFilPay();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [nameErr, setNameErr] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [phoneErr, setPhoneErr] = useState('');

  const [pinOpen, setPinOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinErr, setPinErr] = useState('');

  const [signoutOpen, setSignoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const save = () => {
    let ok = true;
    const n = name.trim();
    const e = email.trim();
    const p = phone.trim();

    if (!n) {
      setNameErr('Enter your full name.');
      ok = false;
    } else setNameErr('');

    if (!isValidEmail(e)) {
      setEmailErr('Enter a valid email address.');
      ok = false;
    } else setEmailErr('');

    if (!isValidPhone(p)) {
      setPhoneErr('Enter a valid mobile number.');
      ok = false;
    } else setPhoneErr('');

    if (!ok) return;
    setUser({ ...user, name: n, email: e, phone: p });
    Alert.alert('Saved', 'Account updated.');
    router.back();
  };

  const openPin = () => {
    setNewPin('');
    setPinConfirm('');
    setPinErr('');
    setPinOpen(true);
  };

  const savePin = () => {
    if (!/^\d{4}$/.test(newPin)) return setPinErr('Use exactly 4 digits.');
    if (newPin !== pinConfirm) return setPinErr('The PINs do not match.');
    setPin(newPin);
    setPinOpen(false);
    Alert.alert('PIN updated', 'Your new PIN is saved.');
  };

  const confirmSignout = () => {
    setSignoutOpen(false);
    logout();
    router.replace('/login');
  };

  const confirmDelete = () => {
    setDeleteOpen(false);
    resetAll();
    logout();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <PhoneStatusBar />
        <View style={styles.nav}>
          <Pressable style={styles.back} onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
            <Feather name="arrow-left" size={20} color={C.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Account</Text>
          <Pressable onPress={save} hitSlop={8} accessibilityRole="button">
            <Text style={styles.saveLink}>Save</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sec}>Personal Information</Text>
          <Text style={styles.lbl}>Full Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
          {nameErr ? <Text style={styles.err}>{nameErr}</Text> : null}
          <Text style={styles.lbl}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          {emailErr ? <Text style={styles.err}>{emailErr}</Text> : null}
          <Text style={styles.lbl}>Mobile</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          {phoneErr ? <Text style={styles.err}>{phoneErr}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sec}>Security</Text>
          <Pressable style={styles.row} onPress={openPin} accessibilityRole="button">
            <Text style={styles.rowT}>Change PIN</Text>
            <Feather name="chevron-right" size={20} color={C.textSecondary} />
          </Pressable>
          <View style={styles.div} />
          <View style={styles.row}>
            <Text style={styles.rowT}>Biometric</Text>
            <Switch value={settings.biometric} onValueChange={setBiometric} trackColor={{ true: C.primary }} />
          </View>
          <View style={styles.div} />
          <Pressable style={styles.row} onPress={() => setSignoutOpen(true)} accessibilityRole="button">
            <Text style={styles.rowT}>Sign out of all devices</Text>
            <Feather name="chevron-right" size={20} color={C.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sec}>Danger Zone</Text>
          <Pressable style={styles.dangerRow} onPress={() => setDeleteOpen(true)} accessibilityRole="button">
            <Text style={styles.dangerText}>Delete account</Text>
            <Feather name="trash-2" size={18} color={C.error} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Change PIN */}
      <Modal visible={pinOpen} transparent animationType="slide" onRequestClose={() => setPinOpen(false)}>
        <Pressable style={styles.bg} onPress={() => setPinOpen(false)}>
          <Pressable style={styles.modal}>
            <Text style={styles.mTitle}>Change PIN</Text>
            <Text style={styles.mSub}>Enter a new 4 digit PIN, then type it again to confirm.</Text>
            <Text style={styles.mLbl}>New PIN</Text>
            <TextInput
              style={styles.pin}
              value={newPin}
              onChangeText={(v) => setNewPin(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />
            <Text style={styles.mLbl}>Confirm new PIN</Text>
            <TextInput
              style={styles.pin}
              value={pinConfirm}
              onChangeText={(v) => setPinConfirm(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />
            {pinErr ? <Text style={styles.err}>{pinErr}</Text> : null}
            <Pressable style={styles.confirm} onPress={savePin}>
              <Text style={styles.confirmT}>Save PIN</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sign out of all devices */}
      <Modal visible={signoutOpen} transparent animationType="fade" onRequestClose={() => setSignoutOpen(false)}>
        <Pressable style={styles.bgCenter} onPress={() => setSignoutOpen(false)}>
          <Pressable style={styles.confirmCard}>
            <Text style={styles.mTitle}>Sign out of all devices</Text>
            <Text style={styles.confirmBody}>Every session ends and you will be returned to the login screen.</Text>
            <View style={styles.confirmRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setSignoutOpen(false)}>
                <Text style={styles.cancelT}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={confirmSignout}>
                <Text style={styles.primaryT}>Sign out</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete account */}
      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <Pressable style={styles.bgCenter} onPress={() => setDeleteOpen(false)}>
          <Pressable style={styles.confirmCard}>
            <Text style={styles.mTitle}>Delete account</Text>
            <Text style={styles.confirmBody}>
              This removes the demo account, balances, cards and history, then signs you out. It cannot be undone.
            </Text>
            <View style={styles.confirmRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setDeleteOpen(false)}>
                <Text style={styles.cancelT}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.dangerBtn} onPress={confirmDelete}>
                <Text style={styles.dangerT}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = themeSheet(() => ({
  safe: { flex: 1, backgroundColor: C.background },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 8, gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 20, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary, textAlign: 'center' },
  saveLink: { color: C.primary, fontWeight: '600', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  card: { backgroundColor: C.surface, borderRadius: 18, marginHorizontal: 20, marginTop: 14, padding: 16 },
  sec: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary, marginBottom: 8 },
  lbl: { fontSize: 12, fontFamily: 'Inter_400Regular', color: C.textSecondary, marginTop: 8 },
  err: { color: C.error, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 },
  input: { borderWidth: 1, borderColor: C.border, backgroundColor: C.inputBg, borderRadius: 14, padding: 12, marginTop: 4, fontSize: 13, fontFamily: 'Inter_400Regular', color: C.textPrimary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  rowT: { fontSize: 13, color: C.textPrimary, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  div: { height: 1, backgroundColor: C.border },
  dangerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  dangerText: { fontSize: 13, color: C.error, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  bg: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  bgCenter: { flex: 1, backgroundColor: C.overlay, justifyContent: 'center', paddingHorizontal: 32 },
  modal: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  confirmCard: { backgroundColor: C.surface, borderRadius: 20, padding: 24 },
  mTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  mSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: C.textSecondary, marginTop: 6 },
  mLbl: { fontSize: 12, fontFamily: 'Inter_400Regular', color: C.textSecondary, marginTop: 14 },
  pin: { borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, textAlign: 'center', fontSize: 20, letterSpacing: 8, marginTop: 6, backgroundColor: C.inputBg, fontFamily: 'Inter_500Medium', color: C.textPrimary },
  confirm: { backgroundColor: C.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  confirmT: { color: C.textOnPrimary, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  confirmBody: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular', color: C.textSecondary, marginTop: 8 },
  confirmRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, height: 46, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  cancelT: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  primaryBtn: { flex: 1, height: 46, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  primaryT: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textOnPrimary },
  dangerBtn: { flex: 1, height: 46, borderRadius: 14, backgroundColor: C.error, alignItems: 'center', justifyContent: 'center' },
  dangerT: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textOnPrimary },
}));
