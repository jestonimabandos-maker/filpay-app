import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { themeSheet, type Palette, C } from '@/theme';

type TabKey = 'home' | 'savings' | 'card' | 'more';

const TABS: { key: TabKey; label: string; icon: keyof typeof Feather.glyphMap; route: string; paths: string[] }[] = [
  { key: 'home', label: 'Home', icon: 'home', route: '/(tabs)', paths: ['/(tabs)', '/'] },
  { key: 'savings', label: 'Savings', icon: 'pie-chart', route: '/(tabs)/savings', paths: ['/(tabs)/savings'] },
  { key: 'card', label: 'Card', icon: 'credit-card', route: '/(tabs)/card', paths: ['/(tabs)/card'] },
  { key: 'more', label: 'More', icon: 'more-horizontal', route: '/(tabs)/profile', paths: ['/(tabs)/profile'] },
];

function deriveActive(pathname: string): TabKey {
  const match = TABS.find((t) => t.paths.some((p) => pathname === p || pathname.startsWith(p + '/')));
  return match ? match.key : 'home';
}

/**
 * Custom bottom navigation (84px tall) that replaces the system tab bar.
 * `active` is optional — when omitted the highlighted tab is derived from the
 * current route, so a screen can never show the wrong tab as selected.
 */
export default function BottomNav({ active }: { active?: TabKey }) {
  const pathname = usePathname();
  const current = active ?? deriveActive(pathname);

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {TABS.map((t) => {
          const isActive = t.key === current;
          return (
            <Pressable
              key={t.key}
              style={styles.item}
              onPress={() => (isActive ? undefined : router.replace(t.route as never))}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={t.label}>
              {isActive && <View style={styles.indicator} />}
              <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
                <Feather name={t.icon} size={16} color={isActive ? C.textOnPrimary : C.textPrimary} />
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.homeBar} />
    </View>
  );
}

const styles = themeSheet((C: Palette) => ({
  wrap: { backgroundColor: C.bottomNavBg },
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 12,
    minHeight: 84,
  },
  item: { flex: 1, alignItems: 'center', gap: 4, paddingTop: 2 },
  indicator: { width: 28, height: 3, borderRadius: 2, backgroundColor: C.accent, marginBottom: 2 },
  iconBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: C.bottomNavInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: { backgroundColor: C.primary },
  label: { fontSize: 11, fontWeight: '400', fontFamily: 'Inter_400Regular', color: C.textSecondary },
  labelActive: { fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: C.primary },
  homeBar: { width: 108, height: 4, borderRadius: 2, backgroundColor: C.textPrimary, alignSelf: 'center', marginBottom: 8 },
}));
