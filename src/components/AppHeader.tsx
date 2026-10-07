import { View, Text, Pressable, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import PhoneStatusBar from './PhoneStatusBar';
import { themeSheet, C } from '@/theme';

/**
 * Shared coloured page header used by every non-tab screen.
 * Matches the prototype: `C.primary` block with a 28px bottom radius.
 */
export default function AppHeader({
  title,
  onBack,
  right,
  background = C.primary,
  lightTitle = true,
  children,
  contentStyle,
}: {
  title?: string;
  onBack?: (() => void) | null;
  right?: ReactNode;
  background?: string;
  lightTitle?: boolean;
  children?: ReactNode;
  contentStyle?: ViewStyle;
}) {
  const showBack = onBack !== null;
  const handleBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const fg = lightTitle ? C.textOnPrimary : C.textPrimary;

  return (
    <View style={[styles.header, { backgroundColor: background }]}>
      <PhoneStatusBar dark={lightTitle} />
      {(showBack || title || right) && (
        <View style={styles.row}>
          {showBack ? (
            <Pressable onPress={handleBack} style={styles.back} hitSlop={10} accessibilityRole="button" accessibilityLabel="Go back">
              <Feather name="arrow-left" size={22} color={fg} />
            </Pressable>
          ) : (
            <View style={styles.back} />
          )}
          {title ? (
            <Text style={[styles.title, { color: fg }]} numberOfLines={1}>
              {title}
            </Text>
          ) : (
            <View style={styles.spacer} />
          )}
          <View style={styles.rightBox}>{right}</View>
        </View>
      )}
      {children ? <View style={contentStyle}>{children}</View> : null}
    </View>
  );
}

const styles = themeSheet(() => ({
  header: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  back: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textAlign: 'left' },
  spacer: { flex: 1 },
  rightBox: { minWidth: 24, alignItems: 'flex-end' },
}));
