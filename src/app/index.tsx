import { useEffect, useState } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import PhoneStatusBar from '@/components/PhoneStatusBar';
import { themeSheet, C } from '@/theme';
import { useFilPay } from '@/store';

const TAGLINE = 'Banking made simple.';

// 1. Splash Screen (1:2) - 360x800, bg C.primary
export default function Splash() {
  const { hydrated } = useFilPay();

  const [dotA] = useState<Animated.Value>(() => new Animated.Value(1));
  const [dotB] = useState<Animated.Value>(() => new Animated.Value(1));

  // Subtle opacity pulse on the two loader dots — layout stays untouched.
  useEffect(() => {
    const pulse = (value: Animated.Value, delay: number) => {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 0.35,
            duration: 480,
            delay,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 1,
            duration: 480,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      anim.start();
      return anim;
    };

    const a = pulse(dotA, 0);
    const b = pulse(dotB, 200);

    return () => {
      a.stop();
      b.stop();
    };
  }, [dotA, dotB]);

  // Always start at Login — even with a saved session the splash routes to the
  // login screen first, so opening the app always asks you to sign in.
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      router.replace('/login');
    }, 1500);
    return () => clearTimeout(t);
  }, [hydrated]);

  return (
    <View style={styles.root}>
      <PhoneStatusBar dark />
      <View style={styles.ellipse1} />
      <View style={styles.ellipse2} />
      <View style={styles.center}>
        <View style={styles.icon}>
          <Text style={styles.iconF}>F</Text>
          <View style={styles.dot} />
        </View>
        <Text style={styles.wordmark}>FilPay</Text>
        <Text style={styles.tagline}>{TAGLINE}</Text>
      </View>
      <View style={styles.loader}>
        <View style={styles.barGold} />
        <Animated.View style={[styles.dotW, { opacity: dotA }]} />
        <Animated.View style={[styles.dotW, { opacity: dotB }]} />
      </View>
      <View style={styles.homeBar} />
    </View>
  );
}

const styles = themeSheet(() => ({
  root: { flex: 1, backgroundColor: C.splashBackground },
  ellipse1: {
    position: 'absolute', width: 600, height: 600, borderRadius: 300,
    backgroundColor: C.primaryDark, left: -120, top: 580, opacity: 1,
  },
  ellipse2: {
    position: 'absolute', width: 500, height: 500, borderRadius: 250,
    backgroundColor: C.primaryDark, left: 80, top: 700, opacity: 1,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -40 },
  icon: {
    width: 96, height: 96, borderRadius: 28, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  iconF: { color: C.primary, fontSize: 56, fontWeight: '700', fontFamily: 'Inter_700Bold', lineHeight: 68 },
  dot: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: C.accent, right: 12, top: 6 },
  wordmark: { color: C.textOnPrimary, fontSize: 40, fontWeight: '700', fontFamily: 'Inter_700Bold', lineHeight: 48, marginTop: 22 },
  tagline: { color: C.textOnPrimary, fontSize: 16, fontWeight: '400', fontFamily: 'Inter_400Regular', lineHeight: 19, marginTop: 8 },
  loader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 40 },
  barGold: { width: 20, height: 8, borderRadius: 4, backgroundColor: C.accent },
  dotW: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.surface },
  homeBar: { width: 108, height: 4, borderRadius: 2, backgroundColor: C.surface, alignSelf: 'center', marginBottom: 12 },
}));
