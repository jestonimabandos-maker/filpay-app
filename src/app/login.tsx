import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhoneStatusBar from '@/components/PhoneStatusBar';
import { themeSheet, C } from '@/theme';
import { useFilPay } from '@/store';
import { db, getCurrentUser } from '@/services/db';
import { isValidPhone } from '@/lib/ui';

/** Single source of truth for every message this screen can show. */
const PHONE_ERROR = 'Enter a valid mobile number.';
const PIN_ERROR = 'Enter your 4-digit PIN.';
const AUTH_ERROR = 'Mobile number or PIN is incorrect.';
const BIO_OFF = 'Biometric is turned off in Settings.';
const BIO_NONE = 'No fingerprint or Face ID is set up on this device.';
const BIO_FAIL = 'Biometric authentication was not successful.';

const PIN_RE = /^\d{4}$/;
const OTP_LENGTH = 6;
const MOCK_OTP = '123456';

type ErrorField = 'phone' | 'pin' | 'bio';
type Busy = null | 'login' | 'bio';

// 2. Login Screen (1:19) - 360x800 white
export default function Login() {
  const { login, settings, hydrated, user } = useFilPay();

  const [phone, setPhone] = useState(user.phone);
  const [pinValue, setPinValue] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<ErrorField>('phone');
  const [showForgot, setShowForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [bioType, setBioType] = useState<LocalAuthentication.AuthenticationType | null>(null);

  // OTP verification step (after PIN, before Home).
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpErr, setOtpErr] = useState('');
  const [pendingUser, setPendingUser] = useState<number | null>(null);

  // Detect whether this device has an enrolled fingerprint or Face ID.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const has = await LocalAuthentication.hasHardwareAsync();
        const enrolled = has && (await LocalAuthentication.isEnrolledAsync());
        const types = enrolled ? await LocalAuthentication.supportedAuthenticationTypesAsync() : [];
        if (!alive) return;
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) setBioType(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
        else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) setBioType(LocalAuthentication.AuthenticationType.FINGERPRINT);
        else setBioType(null);
      } catch {
        if (alive) setBioType(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const phoneValid = isValidPhone(phone);
  const pinValid = PIN_RE.test(pinValue);
  const loginDisabled = !phoneValid || !hydrated || busy !== null;

  const onPhoneChange = (v: string) => {
    setPhone(v);
    setErrorField('phone');
    setError(isValidPhone(v) ? '' : PHONE_ERROR);
  };

  const onPinChange = (v: string) => {
    setPinValue(v.replace(/\D/g, '').slice(0, 4));
    if (errorField === 'pin') setError('');
  };

  const goToApp = (uid: number) => {
    login(uid);
    router.replace('/(tabs)');
    setBusy(null);
  };

  const verifyOtp = () => {
    if (otp.replace(/\D/g, '').length !== OTP_LENGTH) {
      setOtpErr(`Enter the ${OTP_LENGTH}-digit code.`);
      return;
    }
    if (otp !== MOCK_OTP) {
      setOtpErr('Incorrect code. Try 123456.');
      return;
    }
    setOtpErr('');
    const uid = pendingUser;
    setShowOtp(false);
    setPendingUser(null);
    if (uid !== null) goToApp(uid);
  };

  const resendOtp = () => {
    setOtp('');
    setOtpErr('');
  };

  /**
   * CLO 2.4 / 2.5 — credentials are checked with a parameterised SELECT, never
   * by interpolating what the user typed into the SQL string. `LIKE ?` is used
   * per the Lab 5 spec; no wildcards are appended, so it matches the number
   * exactly while still binding the value.
   */
  const authenticate = (mobile: string, pin: string): number | null => {
    const row = db.getFirstSync<{ id: number }>(
      'SELECT * FROM users WHERE mobileNumber LIKE ? AND pin = ?',
      [mobile, pin],
    );
    return row ? row.id : null;
  };

  const handleLogin = () => {
    if (busy) return;
    if (!phoneValid) {
      setErrorField('phone');
      setError(PHONE_ERROR);
      return;
    }
    if (!pinValid) {
      setErrorField('pin');
      setError(PIN_ERROR);
      return;
    }
    setError('');
    setBusy('login');

    const uid = authenticate(phone.trim(), pinValue);
    if (uid === null) {
      setErrorField('pin');
      setError(AUTH_ERROR);
      setBusy(null);
      return;
    }

    // Step 2 of login — ask for the 6-digit code before entering the app.
    setBusy(null);
    setOtp('');
    setOtpErr('');
    setPendingUser(uid);
    setShowOtp(true);
  };

  /** Real device biometric (fingerprint / Face ID) via expo-local-authentication. */
  const handleBiometric = async () => {
    if (busy) return;
    if (!settings.biometric) {
      setErrorField('bio');
      setError(BIO_OFF);
      return;
    }
    setError('');
    setBusy('bio');

    try {
      const has = await LocalAuthentication.hasHardwareAsync();
      const enrolled = has && (await LocalAuthentication.isEnrolledAsync());
      if (!enrolled) {
        setErrorField('bio');
        setError(BIO_NONE);
        setBusy(null);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Log in to FilPay',
        promptSubtitle: 'Confirm your identity',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
      });

      if (!result.success) {
        setErrorField('bio');
        setError(BIO_FAIL);
        setBusy(null);
        return;
      }

      const row = getCurrentUser();
      if (!row) {
        setErrorField('bio');
        setError(AUTH_ERROR);
        setBusy(null);
        return;
      }
      goToApp(row.id);
    } catch {
      setErrorField('bio');
      setError(BIO_FAIL);
      setBusy(null);
    }
  };

  const sendResetLink = () => {
    setShowForgot(false);
    setResetSent(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PhoneStatusBar />
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoF}>F</Text>
            <View style={styles.logoDot} />
          </View>
          <Text style={styles.appName}>FilPay</Text>
          <Text style={styles.welcome}>Welcome back!</Text>
          <Text style={styles.subtitle}>Log in to your account</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <View style={styles.fieldIcon}>
              <Feather name="phone" size={14} color={C.primary} />
            </View>
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <TextInput
                style={[styles.fieldValue, styles.input]}
                value={phone}
                onChangeText={onPhoneChange}
                placeholder="09XX XXX XXXX"
                placeholderTextColor={C.textSecondary}
                keyboardType="phone-pad"
                maxLength={20}
                accessibilityLabel="Mobile number"
              />
            </View>
          </View>
          {errorField === 'phone' && error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.field}>
            <View style={styles.fieldIcon}>
              <Feather name="lock" size={14} color={C.primary} />
            </View>
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>PIN</Text>
              <TextInput
                style={[styles.pinInput, styles.input]}
                value={pinValue}
                onChangeText={onPinChange}
                placeholder="Enter 4 digits"
                placeholderTextColor={C.textSecondary}
                keyboardType="number-pad"
                secureTextEntry={!showPin}
                maxLength={4}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                accessibilityLabel="Four digit PIN"
              />
            </View>
            <Pressable
              onPress={() => setShowPin((s) => !s)}
              accessibilityRole="button"
              accessibilityLabel={showPin ? 'Hide PIN' : 'Show PIN'}
              hitSlop={8}
            >
              <Feather name={showPin ? 'eye' : 'eye-off'} size={18} color={C.textSecondary} />
            </Pressable>
          </View>
          {errorField === 'pin' && error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.hint}>Demo PIN: 1234</Text>
          )}

          <Pressable
            style={[styles.loginBtn, loginDisabled && styles.loginBtnOff]}
            onPress={handleLogin}
            disabled={loginDisabled}
            accessibilityRole="button"
            accessibilityLabel="Log in"
            accessibilityState={{ disabled: loginDisabled, busy: busy === 'login' }}
          >
            {busy === 'login' ? (
              <ActivityIndicator size="small" color={C.textOnPrimary} />
            ) : (
              <Text style={styles.loginText}>Log In</Text>
            )}
          </Pressable>

          <Text style={styles.or}>or</Text>

          <Pressable
            style={styles.bioCard}
            onPress={handleBiometric}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Use biometric login"
            accessibilityState={{ disabled: busy !== null, busy: busy === 'bio' }}
          >
            <View style={styles.bioIcon}>
              {bioType === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION ? (
                <MaterialCommunityIcons name="face-recognition" size={19} color={C.primary} />
              ) : (
                <MaterialCommunityIcons name="fingerprint" size={19} color={C.primary} />
              )}
            </View>
            <View style={styles.fieldBody}>
              <Text style={styles.bioTitle}>
                {bioType === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
                  ? 'Use Face ID'
                  : 'Use Fingerprint'}
              </Text>
              <Text style={styles.bioSub}>Biometric login</Text>
            </View>
            {busy === 'bio' ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <Feather name="chevron-right" size={22} color={C.textSecondary} />
            )}
          </Pressable>
          {errorField === 'bio' && error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.links}>
            <Pressable
              onPress={() => setShowForgot(true)}
              accessibilityRole="button"
              accessibilityLabel="Forgot PIN"
              hitSlop={8}
            >
              <Text style={styles.link}>Forgot PIN?</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/help')}
              accessibilityRole="button"
              accessibilityLabel="Need help"
              hitSlop={8}
            >
              <Text style={styles.link}>Need Help?</Text>
            </Pressable>
          </View>

          {resetSent ? <Text style={styles.notice}>Reset link sent to {user.phone}.</Text> : null}
        </View>
      </ScrollView>
      <View style={styles.homeBar} />

      <Modal
        visible={showForgot}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowForgot(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Forgot PIN?</Text>
              <Pressable
                onPress={() => setShowForgot(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
                style={styles.modalClose}
              >
                <Feather name="x" size={18} color={C.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalBody}>
              {`We will send a reset link to your registered mobile number ${user.phone}. Open the link to set a new 4-digit PIN.`}
            </Text>
            <Pressable
              style={styles.modalPrimary}
              onPress={sendResetLink}
              accessibilityRole="button"
              accessibilityLabel="Send reset link"
            >
              <Text style={styles.modalPrimaryText}>Send reset link</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowForgot(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showOtp}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowOtp(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Verify it&apos;s you</Text>
              <Pressable
                onPress={() => setShowOtp(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
                style={styles.modalClose}
              >
                <Feather name="x" size={18} color={C.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalBody}>
              {`Enter the 6-digit code sent to ${phone.trim()}. Demo code: ${MOCK_OTP}.`}
            </Text>
            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={(v) => {
                setOtp(v.replace(/\D/g, '').slice(0, OTP_LENGTH));
                if (otpErr) setOtpErr('');
              }}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              placeholder="••••••"
              placeholderTextColor={C.textSecondary}
              autoFocus
              accessibilityLabel="Six digit verification code"
            />
            {otpErr ? <Text style={styles.otpError}>{otpErr}</Text> : null}
            <Pressable
              style={styles.modalPrimary}
              onPress={verifyOtp}
              accessibilityRole="button"
              accessibilityLabel="Verify and continue"
            >
              <Text style={styles.modalPrimaryText}>Verify</Text>
            </Pressable>
            <Pressable onPress={resendOtp} accessibilityRole="button" accessibilityLabel="Resend code">
              <Text style={styles.modalCancel}>Resend code</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = themeSheet(() => ({
  safe: { flex: 1, backgroundColor: C.surface },
  content: { paddingBottom: 16, alignItems: 'center' },
  brand: { alignItems: 'center', paddingTop: 24 },
  logo: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  logoF: { color: C.textOnPrimary, fontSize: 32, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  logoDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent, right: 6, top: 4 },
  appName: { color: C.primary, fontSize: 26, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 12 },
  welcome: { color: C.textPrimary, fontSize: 22, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginTop: 22 },
  subtitle: { color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4 },
  form: { width: 312, marginTop: 24 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.inputBg, borderRadius: 14, padding: 14, marginBottom: 12, minHeight: 64,
  },
  fieldIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  fieldBody: { flex: 1 },
  fieldLabel: { color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_400Regular' },
  fieldValue: { color: C.textPrimary, fontSize: 14, fontWeight: '500', fontFamily: 'Inter_500Medium', marginTop: 2 },
  input: { padding: 0 },
  pinInput: { color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 2, padding: 0 },
  errorText: { color: C.error, fontSize: 11, fontFamily: 'Inter_400Regular', marginLeft: 6, marginTop: -6, marginBottom: 8 },
  hint: { color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_400Regular', marginLeft: 6, marginTop: -6, marginBottom: 8 },
  loginBtn: { backgroundColor: C.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  loginBtnOff: { opacity: 0.5 },
  loginText: { color: C.textOnPrimary, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  or: { textAlign: 'center', color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginVertical: 12 },
  bioCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.inputBg, borderRadius: 14, padding: 14, minHeight: 64 },
  bioIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.iconBg, alignItems: 'center', justifyContent: 'center' },
  bioTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  bioSub: { color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 8 },
  link: { color: C.primary, fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  notice: { color: C.primary, fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 12 },
  modalBackdrop: { flex: 1, backgroundColor: C.shadowFade, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 312, backgroundColor: C.surface, borderRadius: 20, padding: 20 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  modalClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center' },
  modalBody: { color: C.textSecondary, fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular', marginBottom: 18 },
  otpInput: {
    backgroundColor: C.inputBg, borderRadius: 14, height: 58, textAlign: 'center',
    fontSize: 26, letterSpacing: 10, fontFamily: 'Inter_700Bold', color: C.textPrimary, marginBottom: 10,
  },
  otpError: { color: C.error, fontSize: 11, fontFamily: 'Inter_400Regular', marginBottom: 8 },
  modalPrimary: { backgroundColor: C.primary, borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center' },
  modalPrimaryText: { color: C.textOnPrimary, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  modalCancel: { color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 14 },
  homeBar: { width: 108, height: 4, borderRadius: 2, backgroundColor: C.textPrimary, alignSelf: 'center', marginBottom: 8 },
}));
