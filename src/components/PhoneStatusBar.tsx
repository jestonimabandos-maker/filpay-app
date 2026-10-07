import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { themeSheet, C } from '../theme';

const SIGNAL_BARS = [3, 5, 7, 9];

/**
 * Fake Android status bar used at the top of every screen so the app reads as a
 * real 360x800 device canvas.
 *
 * `dark = true` → white glyphs, for use on the teal / near-black headers.
 * `dark = false` → dark glyphs, for use on light backgrounds.
 */
export default function PhoneStatusBar({ dark = false }: { dark?: boolean }) {
  const fg = dark ? C.textOnPrimary : C.textPrimary;

  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no">
      <Text style={[styles.time, { color: fg }]}>9:41</Text>

      <View style={styles.right}>
        {/* cellular signal */}
        <View style={styles.signal}>
          {SIGNAL_BARS.map((h, i) => (
            <View key={i} style={[styles.bar, { height: h, backgroundColor: fg, opacity: i === 3 ? 0.45 : 1 }]} />
          ))}
        </View>

        {/* wifi */}
        <Feather name="wifi" size={13} color={fg} style={styles.wifi} />

        {/* battery */}
        <View style={styles.batteryWrap}>
          <View style={[styles.battery, { borderColor: fg }]}>
            <View style={[styles.batteryFill, { backgroundColor: fg }]} />
          </View>
          <View style={[styles.nub, { backgroundColor: fg }]} />
        </View>
      </View>
    </View>
  );
}

const styles = themeSheet(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    height: 44,
  },
  time: { fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium', letterSpacing: 0.2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  signal: { flexDirection: 'row', alignItems: 'flex-end', gap: 1.5 },
  bar: { width: 2.5, borderRadius: 1 },
  wifi: { marginRight: -1 },
  batteryWrap: { flexDirection: 'row', alignItems: 'center' },
  battery: {
    width: 22,
    height: 11,
    borderRadius: 3,
    borderWidth: 1.2,
    paddingHorizontal: 1.5,
    paddingVertical: 1.5,
    justifyContent: 'center',
  },
  batteryFill: { width: 13, height: 5, borderRadius: 1.5 },
  nub: { width: 1.5, height: 4, borderRadius: 1, marginLeft: 1.5 },
}));
