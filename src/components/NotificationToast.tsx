import { useEffect, useState } from 'react';
import { View, Text, Pressable, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { themeSheet, C } from '@/theme';
import { useFilPay } from '@/store';

const ICON: Record<string, keyof typeof Feather.glyphMap> = {
  tx: 'check-circle',
  promo: 'gift',
  security: 'shield',
};

/**
 * Top in-app notification banner. Slides down smoothly, stays for ~4s, then
 * eases back up. The notification itself always remains in the list screen —
 * this only controls the temporary on-screen banner.
 */
export default function NotificationToast() {
  const { toast, dismissToast } = useFilPay();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!toast) return;
    // Slide down smoothly, hold ~2.5s, then ease back up (~3.7s total).
    anim.setValue(0);
    const seq = Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(anim, { toValue: 0, duration: 320, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]);
    seq.start();
    return () => seq.stop();
  }, [toast, anim]);

  if (!toast) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-140, 0] });
  const opacity = anim;

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY }], opacity }]} pointerEvents="box-none">
      <Pressable
        style={styles.card}
        onPress={() => {
          dismissToast();
          router.push('/notifications');
        }}
        accessibilityRole="button"
        accessibilityLabel={`Notification: ${toast.title}`}
      >
        <View style={styles.icon}>
          <Feather name={ICON[toast.kind] ?? 'bell'} size={16} color={C.textOnPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
          <Text style={styles.body} numberOfLines={1}>{toast.body}</Text>
        </View>
        <Pressable onPress={dismissToast} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss notification">
          <Feather name="x" size={16} color={C.textOnPrimaryMuted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = themeSheet(() => ({
  wrap: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 16, paddingTop: 52, zIndex: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.primary, borderRadius: 16, padding: 14,
    shadowColor: C.shadowColor, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.textOnPrimary, fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  body: { color: C.textOnPrimaryMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
}));
