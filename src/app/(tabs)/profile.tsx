import { View, Text, ScrollView, Pressable, Alert, Switch, Modal, TextInput, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhoneStatusBar from '@/components/PhoneStatusBar';
import BottomNav from '@/components/BottomNav';
import { themeSheet, C } from '@/theme';
import { useFilPay } from '@/store';
import { getUserById, updateProfileImage } from '@/services/db';
import { isValidEmail } from '@/lib/ui';

// 8. Profile & Settings (1:357)
export default function Profile() {
  const { user, userId, setUser, settings, setBiometric, updateSettings, logout, resetAll, reload, theme, toggleTheme } = useFilPay();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [nameErr, setNameErr] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  // CLO 2.3 — SELECT * FROM users WHERE id = ?
  const dbUser = userId !== null ? getUserById(userId) : null;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const openEdit = () => {
    setName(user.name);
    setEmail(user.email);
    setNameErr('');
    setEmailErr('');
    setEdit(true);
  };

  /** Pick a picture, persist it to SQLite, and re-render + reload the store so
   *  the Home header avatar updates instantly. */
  const pickAvatar = async () => {
    if (userId === null) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow photo access to change your picture.');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!res.canceled && res.assets[0]) {
      updateProfileImage(userId, res.assets[0].uri);
      reload();
    }
  };

  const save = () => {
    const n = name.trim();
    const e = email.trim();
    let ok = true;
    if (!n) {
      setNameErr('Enter your full name.');
      ok = false;
    } else {
      setNameErr('');
    }
    if (!isValidEmail(e)) {
      setEmailErr('Enter a valid email address.');
      ok = false;
    } else {
      setEmailErr('');
    }
    if (!ok) return;
    setUser({ ...user, name: n, email: e });
    setEdit(false);
    Alert.alert('Saved', 'Profile updated.');
  };

  const confirmLogout = () => {
    setLogoutOpen(false);
    logout();
    router.replace('/login');
  };

  const confirmReset = () => {
    setResetOpen(false);
    resetAll();
    Alert.alert('Reset complete', 'Demo balances, cards and transactions were restored.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
        <View style={styles.header}>
          <PhoneStatusBar dark />
          <View style={styles.nav}>
            <Pressable onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Go back">
              <Feather name="arrow-left" size={22} color={C.textOnPrimary} />
            </Pressable>
            <Text style={styles.title}>Profile & Settings</Text>
            <View style={{ width: 22 }} />
          </View>
          <View style={styles.profile}>
            <Pressable style={styles.avWrap} onPress={pickAvatar} accessibilityRole="button" accessibilityLabel="Change profile picture">
              <View style={styles.avatar}>
                {dbUser?.profileImage ? (
                  <Image source={{ uri: dbUser.profileImage }} style={styles.avatarImg} />
                ) : (
                  <Feather name="user" size={28} color={C.primary} />
                )}
              </View>
              <View style={styles.camDot}>
                <Feather name="camera" size={11} color={C.textOnPrimary} />
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{dbUser?.fullName ?? user.name}</Text>
              <Text style={styles.email}>{user.email}</Text>
              <Text style={styles.changeHint}>Tap picture to change</Text>
              <Pressable style={styles.editBtn} onPress={openEdit} accessibilityRole="button">
                <Text style={styles.editText}>✎ Edit Profile</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Details</Text>
          <Row label="Account Number" value={dbUser?.accountNumber ?? user.accountNo} />
          <Row label="Account Type" value={user.accountType} />
          <Row label="Join Date" value={dbUser?.joinDate ?? user.joinDate} last />
        </View>

        <View style={styles.card}>
          <Setting icon="lock" title="Security" sub="PIN, Biometric, Devices" onPress={() => router.push('/account')} />
          <View style={styles.div} />
          <Setting icon="key" title="Change PIN" sub="Update your 4 digit PIN" onPress={() => router.push('/account')} />
          <View style={styles.div} />
          <View style={styles.setting}>
            <View style={styles.sIcon}><Feather name="bell" size={16} color={C.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sTitle}>Notifications</Text>
              <Text style={styles.sSub}>Transaction alerts, updates</Text>
            </View>
            <Switch
              value={settings.notifTx}
              onValueChange={(v) => updateSettings({ notifTx: v })}
              trackColor={{ true: C.primary }}
            />
          </View>
          <View style={styles.div} />
          <View style={styles.setting}>
            <View style={styles.sIcon}><Feather name="gift" size={16} color={C.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sTitle}>Promotions</Text>
              <Text style={styles.sSub}>Offers and cashback news</Text>
            </View>
            <Switch
              value={settings.notifPromo}
              onValueChange={(v) => updateSettings({ notifPromo: v })}
              trackColor={{ true: C.primary }}
            />
          </View>
          <View style={styles.div} />
          <Setting icon="globe" title="Language" sub={settings.language} onPress={() => setLangOpen(true)} />
          <View style={styles.div} />
          <View style={styles.setting}>
            <View style={styles.sIcon}><Feather name="moon" size={16} color={C.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sTitle}>Dark Mode</Text>
              <Text style={styles.sSub}>{theme === 'dark' ? 'On' : 'Off'}</Text>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ true: C.primary }}
            />
          </View>
          <View style={styles.div} />
          <Setting icon="help-circle" title="Help Center" sub="FAQs, Contact Us" onPress={() => router.push('/help')} />
          <View style={styles.div} />
          <Setting icon="info" title="About FilPay" sub="Version 1.0.0" onPress={() => setAboutOpen(true)} />
        </View>

        <View style={styles.bioRow}>
          <View style={styles.sIcon}><Feather name="smartphone" size={16} color={C.primary} /></View>
          <Text style={[styles.sTitle, { flex: 1 }]}>Biometric Login</Text>
          <Switch
            value={settings.biometric}
            onValueChange={setBiometric}
            trackColor={{ true: C.primary }}
          />
        </View>

        <Pressable style={styles.resetRow} onPress={() => setResetOpen(true)} accessibilityRole="button">
          <View style={styles.sIcon}><Feather name="refresh-cw" size={16} color={C.primary} /></View>
          <Text style={[styles.sTitle, { flex: 1 }]}>Reset demo data</Text>
          <Feather name="chevron-right" size={22} color={C.textSecondary} />
        </Pressable>

        <Pressable style={styles.logout} onPress={() => setLogoutOpen(true)} accessibilityRole="button">
          <View style={styles.outIcon}><Feather name="log-out" size={16} color={C.error} /></View>
          <Text style={styles.outText}>Log Out</Text>
        </Pressable>
      </ScrollView>
      <BottomNav active="more" />

      {/* Edit profile */}
      <Modal visible={edit} transparent animationType="slide" onRequestClose={() => setEdit(false)}>
        <Pressable style={styles.bg} onPress={() => setEdit(false)}>
          <Pressable style={styles.modal}>
            <Text style={styles.mTitle}>Edit Profile</Text>
            <Text style={styles.mLabel}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />
            {nameErr ? <Text style={styles.err}>{nameErr}</Text> : null}
            <Text style={styles.mLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {emailErr ? <Text style={styles.err}>{emailErr}</Text> : null}
            <Pressable style={styles.save} onPress={save}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Language */}
      <Modal visible={langOpen} transparent animationType="slide" onRequestClose={() => setLangOpen(false)}>
        <Pressable style={styles.bg} onPress={() => setLangOpen(false)}>
          <Pressable style={styles.modal}>
            <Text style={styles.mTitle}>Language</Text>
            {['English', 'Filipino'].map((lang) => {
              const active = settings.language === lang;
              return (
                <Pressable
                  key={lang}
                  style={styles.langRow}
                  onPress={() => {
                    updateSettings({ language: lang });
                    setLangOpen(false);
                  }}
                  accessibilityRole="button">
                  <Text style={[styles.langText, active && styles.langTextActive]}>{lang}</Text>
                  {active ? <Feather name="check" size={18} color={C.primary} /> : null}
                </Pressable>
              );
            })}
            <Pressable style={styles.save} onPress={() => setLangOpen(false)}>
              <Text style={styles.saveText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* About */}
      <Modal visible={aboutOpen} transparent animationType="slide" onRequestClose={() => setAboutOpen(false)}>
        <Pressable style={styles.bg} onPress={() => setAboutOpen(false)}>
          <Pressable style={styles.modal}>
            <Text style={styles.mTitle}>About FilPay</Text>
            <Text style={styles.aboutBody}>
              FilPay is a demo wallet for sending money, paying bills, saving and using a virtual card.
            </Text>
            <Text style={styles.aboutVersion}>FilPay v1.0.0</Text>
            <Pressable style={styles.save} onPress={() => setAboutOpen(false)}>
              <Text style={styles.saveText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Log out confirm */}
      <Modal visible={logoutOpen} transparent animationType="fade" onRequestClose={() => setLogoutOpen(false)}>
        <Pressable style={styles.bgCenter} onPress={() => setLogoutOpen(false)}>
          <Pressable style={styles.confirmCard}>
            <Text style={styles.mTitle}>Log Out</Text>
            <Text style={styles.confirmBody}>You will be signed out of this device. Your demo data stays saved.</Text>
            <View style={styles.confirmRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setLogoutOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.dangerBtn} onPress={confirmLogout}>
                <Text style={styles.dangerText}>Log out</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Reset confirm */}
      <Modal visible={resetOpen} transparent animationType="fade" onRequestClose={() => setResetOpen(false)}>
        <Pressable style={styles.bgCenter} onPress={() => setResetOpen(false)}>
          <Pressable style={styles.confirmCard}>
            <Text style={styles.mTitle}>Reset demo data</Text>
            <Text style={styles.confirmBody}>
              Balances, cards, transactions, notifications and settings go back to the original demo values.
            </Text>
            <View style={styles.confirmRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setResetOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={confirmReset}>
                <Text style={styles.primaryText}>Reset</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Setting({ icon, title, sub, onPress }: { icon: keyof typeof Feather.glyphMap; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable style={styles.setting} onPress={onPress} accessibilityRole="button">
      <View style={styles.sIcon}><Feather name={icon} size={16} color={C.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sTitle}>{title}</Text>
        <Text style={styles.sSub}>{sub}</Text>
      </View>
      <Feather name="chevron-right" size={22} color={C.textSecondary} />
    </Pressable>
  );
}

const styles = themeSheet(() => ({
  safe: { flex: 1, backgroundColor: C.background },
  header: { backgroundColor: C.primary, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingBottom: 14, paddingHorizontal: 20 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  title: { flex: 1, color: C.textOnPrimary, fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  profile: { flexDirection: 'row', gap: 14, backgroundColor: C.surface, borderRadius: 18, padding: 16, marginTop: 8, minHeight: 116, alignItems: 'center' },
  avWrap: { position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  avDot: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: C.accent, right: 0, top: 0 },
  camDot: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: C.primary, right: -2, bottom: -2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.surface },
  changeHint: { color: C.textSecondary, fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  name: { color: C.textPrimary, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  email: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  editBtn: { backgroundColor: C.iconBg, borderRadius: 14, height: 28, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginTop: 8 },
  editText: { color: C.primary, fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  card: { backgroundColor: C.surface, borderRadius: 18, marginHorizontal: 20, marginTop: 14, padding: 16 },
  cardTitle: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.background },
  rowLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: C.textSecondary },
  rowValue: { fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium', color: C.textPrimary },
  setting: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  sIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  sTitle: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  sSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: C.textSecondary, marginTop: 2 },
  div: { height: 1, backgroundColor: C.border, marginLeft: 48 },
  bioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 16, marginHorizontal: 20, marginTop: 12, padding: 14 },
  resetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 16, marginHorizontal: 20, marginTop: 12, padding: 14, minHeight: 56 },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 16, marginHorizontal: 20, marginTop: 12, padding: 14, minHeight: 56 },
  outIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.errorSoft, alignItems: 'center', justifyContent: 'center' },
  outText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.error },
  bg: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  bgCenter: { flex: 1, backgroundColor: C.overlay, justifyContent: 'center', paddingHorizontal: 32 },
  modal: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  confirmCard: { backgroundColor: C.surface, borderRadius: 20, padding: 24 },
  confirmBody: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular', color: C.textSecondary, marginTop: 8 },
  confirmRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, height: 46, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  dangerBtn: { flex: 1, height: 46, borderRadius: 14, backgroundColor: C.error, alignItems: 'center', justifyContent: 'center' },
  dangerText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textOnPrimary },
  primaryBtn: { flex: 1, height: 46, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textOnPrimary },
  mTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  mLabel: { color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 12 },
  err: { color: C.error, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 },
  input: { borderWidth: 1, borderColor: C.border, backgroundColor: C.inputBg, borderRadius: 14, padding: 12, marginTop: 4, fontFamily: 'Inter_400Regular', fontSize: 13, color: C.textPrimary },
  save: { backgroundColor: C.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  saveText: { color: C.textOnPrimary, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  langText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: C.textPrimary },
  langTextActive: { fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.primary },
  aboutBody: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular', color: C.textSecondary, marginTop: 10 },
  aboutVersion: { fontSize: 11, fontFamily: 'Inter_400Regular', color: C.textSecondary, marginTop: 12 },
}));
