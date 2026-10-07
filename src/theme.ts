import { StyleSheet } from 'react-native';

/**
 * FilPay design tokens.
 *
 * FilPay green palette:
 *  - Primary green  #0F6B3A  headers, buttons, balance card, active nav, avatar
 *  - Dark green     #0A4D2B  splash/card gradients, Scan & Pay dark screen
 *  - Medium green   #2E8B57  gradient highlights, chart line, progress bars
 *  - Light green    #3FA66A  wave shapes, scan brackets, small highlights
 *  - Soft tint      #E6F3EA  icon backgrounds, promo banner, summary boxes
 *  - Background     #F2F8F4 / #FFFFFF
 *  - Text           #1F2A24 (main), #6B7A72 (muted)
 *  - Red #D64550 (errors / log out), orange (Mastercard logo)
 *
 * `C` is a live Proxy over the active palette, so switching to dark mode
 * re-themes every screen without changing each file.
 */
export interface Palette {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
  mcOrange: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  splashBackground: string;
  iconBg: string;
  text: string;
  textMuted: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;
  textOnPrimaryMuted: string;
  success: string;
  error: string;
  errorSoft: string;
  warning: string;
  border: string;
  borderFocus: string;
  divider: string;
  scanBg: string;
  scanCard: string;
  scanCorner: string;
  scanSecondary: string;
  statusBarLight: string;
  statusBarDark: string;
  inputBg: string;
  inputBorder: string;
  inputBorderFocus: string;
  dashboardHeader: string;
  trendPillBg: string;
  trendPillText: string;
  trendPillSubText: string;
  quickActionBg: string;
  quickActionShadow: string;
  profileCardBg: string;
  profileCardBorder: string;
  progressTrackBg: string;
  progressFill: string;
  bottomNavBg: string;
  bottomNavShadow: string;
  bottomNavActive: string;
  bottomNavInactive: string;
  walletHeader: string;
  walletBalanceCardBg: string;
  walletBalanceCardBorder: string;
  actionButtonBg: string;
  actionButtonIcon: string;
  transactionCardBg: string;
  transactionCardShadow: string;
  settingsHeader: string;
  settingsCardBg: string;
  settingsDivider: string;
  accountHeader: string;
  accountCardBg: string;
  overlay: string;
  overlayStrong: string;
  overlaySoft: string;
  glow: string;
  cardBorderOnPrimary: string;
  pillBg: string;
  shadowFade: string;
  catSpendFg: string;
  catSpendBg: string;
  catPrimaryFg: string;
  catPrimaryBg: string;
  catSuccessFg: string;
  catSuccessBg: string;
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
}

export const LIGHT: Palette = {
  // ---- Primary green ----
  primary: '#0F6B3A',
  primaryDark: '#0A4D2B',
  primarySoft: '#E6F3EA',
  primaryLight: '#2E8B57',

  // ---- Accent ----
  accent: '#3FA66A',
  accentLight: '#5FBF85',
  mcOrange: '#EB6A2A',

  // ---- Neutral ----
  background: '#F2F8F4',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  splashBackground: '#0A4D2B',
  iconBg: '#E6F3EA',

  // ---- Text ----
  text: '#1F2A24',
  textMuted: '#6B7A72',
  textPrimary: '#1F2A24',
  textSecondary: '#6B7A72',
  textTertiary: '#9AA8A0',
  textOnPrimary: '#FFFFFF',
  textOnPrimaryMuted: 'rgba(255,255,255,0.85)',

  // ---- Feedback ----
  success: '#1F9D57',
  error: '#D64550',
  errorSoft: '#FDECEE',
  warning: '#F0A020',

  // ---- Lines ----
  border: '#DCE7DF',
  borderFocus: '#0F6B3A',
  divider: '#EEF4F0',

  // ---- Scan & Pay ----
  scanBg: '#0A4D2B',
  scanCard: '#0C3D24',
  scanCorner: '#3FA66A',
  scanSecondary: '#B9D6C4',

  // ---- Status bar ----
  statusBarLight: '#1F2A24',
  statusBarDark: '#FFFFFF',

  // ---- Inputs ----
  inputBg: '#F2F8F4',
  inputBorder: '#DCE7DF',
  inputBorderFocus: '#0F6B3A',

  // ---- Dashboard ----
  dashboardHeader: '#0F6B3A',
  trendPillBg: '#FFFFFF',
  trendPillText: '#3FA66A',
  trendPillSubText: '#FFFFFF',
  quickActionBg: '#FFFFFF',
  quickActionShadow: '#12201A',
  profileCardBg: '#FFFFFF',
  profileCardBorder: '#E6F3EA',
  progressTrackBg: '#E6F3EA',
  progressFill: '#2E8B57',
  bottomNavBg: '#FFFFFF',
  bottomNavShadow: '#12201A',
  bottomNavActive: '#0F6B3A',
  bottomNavInactive: '#CFE0D5',

  // ---- Wallet ----
  walletHeader: '#0F6B3A',
  walletBalanceCardBg: '#0F6B3A',
  walletBalanceCardBorder: '#0F6B3A',
  actionButtonBg: '#E6F3EA',
  actionButtonIcon: '#0F6B3A',
  transactionCardBg: '#FFFFFF',
  transactionCardShadow: '#12201A',

  // ---- Settings / Account ----
  settingsHeader: '#0F6B3A',
  settingsCardBg: '#FFFFFF',
  settingsDivider: '#EEF4F0',
  accountHeader: '#FFFFFF',
  accountCardBg: '#FFFFFF',

  // ---- Overlays ----
  overlay: 'rgba(0,0,0,0.4)',
  overlayStrong: 'rgba(0,0,0,0.5)',
  overlaySoft: 'rgba(0,0,0,0.45)',

  // ---- White-on-primary alphas ----
  glow: 'rgba(255,255,255,0.12)',
  cardBorderOnPrimary: 'rgba(255,255,255,0.15)',
  pillBg: 'rgba(255,255,255,0.18)',
  shadowFade: 'rgba(10,20,15,0.45)',

  // ---- Transaction categories ----
  catSpendFg: '#6B7A72',
  catSpendBg: '#EEF4F0',
  catPrimaryFg: '#0F6B3A',
  catPrimaryBg: '#E6F3EA',
  catSuccessFg: '#1F9D57',
  catSuccessBg: '#E6F3EA',

  // ---- Shadow ----
  shadowColor: '#12201A',
  shadowOpacity: 0.1,
  shadowRadius: 14,
};

export const DARK: Palette = {
  ...LIGHT,
  primary: '#2E8B57',
  primaryDark: '#0A4D2B',
  primarySoft: '#12261A',
  primaryLight: '#3FA66A',

  accent: '#3FA66A',
  accentLight: '#5FBF85',

  background: '#0E1611',
  surface: '#16201A',
  surfaceElevated: '#1B271F',
  splashBackground: '#0A4D2B',
  iconBg: '#1E2C23',

  text: '#EAF3ED',
  textMuted: '#93A79A',
  textPrimary: '#EAF3ED',
  textSecondary: '#93A79A',
  textTertiary: '#6F8479',

  success: '#3FA66A',
  error: '#E0606A',
  errorSoft: '#3A1E21',
  warning: '#F0A020',

  border: '#28372E',
  borderFocus: '#3FA66A',
  divider: '#1F2C24',

  scanBg: '#0A4D2B',
  scanCard: '#0C3D24',
  scanCorner: '#3FA66A',
  scanSecondary: '#B9D6C4',

  statusBarLight: '#EAF3ED',

  inputBg: '#12201A',
  inputBorder: '#28372E',
  inputBorderFocus: '#3FA66A',

  dashboardHeader: '#0A4D2B',
  trendPillBg: '#1B271F',
  trendPillText: '#3FA66A',
  quickActionBg: '#16201A',
  profileCardBg: '#16201A',
  profileCardBorder: '#28372E',
  progressTrackBg: '#1E2C23',
  progressFill: '#3FA66A',
  bottomNavBg: '#121B16',
  bottomNavActive: '#3FA66A',
  bottomNavInactive: '#2A3A30',

  walletHeader: '#0A4D2B',
  walletBalanceCardBg: '#0F6B3A',
  walletBalanceCardBorder: '#2E8B57',
  actionButtonBg: '#1E2C23',
  actionButtonIcon: '#3FA66A',
  transactionCardBg: '#16201A',

  settingsHeader: '#0A4D2B',
  settingsCardBg: '#16201A',
  settingsDivider: '#1F2C24',
  accountHeader: '#16201A',
  accountCardBg: '#16201A',

  catSpendFg: '#93A79A',
  catSpendBg: '#1E2C23',
  catPrimaryFg: '#3FA66A',
  catPrimaryBg: '#1E2C23',
  catSuccessFg: '#3FA66A',
  catSuccessBg: '#1E2C23',

  shadowColor: '#000000',
  shadowOpacity: 0.4,
};

export type ThemeMode = 'light' | 'dark';

let CURRENT: ThemeMode = 'light';

export function setThemeMode(mode: ThemeMode) {
  CURRENT = mode;
}
export function getThemeMode(): ThemeMode {
  return CURRENT;
}

/**
 * Live palette. Reading `C.primary` always returns the value for the current
 * mode, so a re-render (triggered when the store's theme mode changes) swaps
 * every inline colour automatically.
 */
export const C = new Proxy({} as Palette, {
  get(_target, prop: string) {
    return (CURRENT === 'dark' ? DARK : LIGHT)[prop as keyof Palette];
  },
}) as Palette;

/**
 * Drop-in replacement for `StyleSheet.create` that rebuilds from the active
 * palette on every property access. Usage mirrors the original exactly, except
 * the object is a factory that receives the palette:
 *
 *   const styles = themeSheet((C) => ({ title: { color: C.text } }));
 *
 * Because the returned object is a Proxy, styles read during render always use
 * the current mode — switching light/dark re-themes the screen with no extra
 * wiring.
 */
export function themeSheet<T extends StyleSheet.NamedStyles<T>>(
  fn: (c: Palette) => T,
): T {
  let cacheMode: ThemeMode | null = null;
  let cache: T | null = null;
  return new Proxy({} as T, {
    get(_target, prop) {
      if (cacheMode !== CURRENT || cache === null) {
        cache = StyleSheet.create(fn(CURRENT === 'dark' ? DARK : LIGHT));
        cacheMode = CURRENT;
      }
      return cache[prop as keyof T];
    },
  });
}

export const SHADOW = {
  shadowColor: C.shadowColor,
  shadowOpacity: C.shadowOpacity,
  shadowRadius: C.shadowRadius,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;

/** Top #0F6B3A → bottom #0A4D2B */
export const GRADIENT_PRIMARY = ['#2E8B57', '#0F6B3A'] as const;
export const GRADIENT_PRIMARY_REVERSE = ['#0F6B3A', '#2E8B57'] as const;
export const GRADIENT_ACCENT = ['#3FA66A', '#5FBF85'] as const;
export const GRADIENT_CARD = ['#0F6B3A', '#0A4D2B'] as const;

export const R = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  pill: 999,
  card: 16,
  cardLarge: 22,
  splash: 28,
  buttonRadius: 14,
  inputRadius: 14,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screen: 24,
  card: 16,
} as const;

export const FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const TYPOGRAPHY = {
  display: { fontSize: 64, fontWeight: '700' as const, lineHeight: 77, fontFamily: FONTS.bold },
  headline: { fontSize: 44, fontWeight: '700' as const, lineHeight: 53, fontFamily: FONTS.bold },
  greeting: { fontSize: 18, fontWeight: '600' as const, lineHeight: 22, fontFamily: FONTS.semiBold },
  welcome: { fontSize: 13, fontWeight: '400' as const, lineHeight: 16, fontFamily: FONTS.regular },
  balanceLabel: { fontSize: 12, fontWeight: '500' as const, lineHeight: 15, fontFamily: FONTS.medium },
  balanceValue: { fontSize: 32, fontWeight: '700' as const, lineHeight: 39, fontFamily: FONTS.bold },
  trendValue: { fontSize: 12, fontWeight: '600' as const, lineHeight: 15, fontFamily: FONTS.semiBold },
  trendLabel: { fontSize: 12, fontWeight: '400' as const, lineHeight: 15, fontFamily: FONTS.regular },
  sectionTitle: { fontSize: 16, fontWeight: '600' as const, lineHeight: 19, fontFamily: FONTS.semiBold },
  seeAll: { fontSize: 12, fontWeight: '500' as const, lineHeight: 15, fontFamily: FONTS.medium },
  actionLabel: { fontSize: 11, fontWeight: '500' as const, lineHeight: 13, fontFamily: FONTS.medium },
  profileTitle: { fontSize: 14, fontWeight: '600' as const, lineHeight: 17, fontFamily: FONTS.semiBold },
  profilePercent: { fontSize: 12, fontWeight: '600' as const, lineHeight: 15, fontFamily: FONTS.semiBold },
  profileSubtext: { fontSize: 11, fontWeight: '400' as const, lineHeight: 13, fontFamily: FONTS.regular },
  navLabel: { fontSize: 11, fontWeight: '600' as const, lineHeight: 13, fontFamily: FONTS.semiBold },
  screenTitle: { fontSize: 18, fontWeight: '600' as const, lineHeight: 22, fontFamily: FONTS.semiBold },
  walletBalanceLabel: { fontSize: 12, fontWeight: '500' as const, lineHeight: 15, fontFamily: FONTS.medium },
  walletBalanceValue: { fontSize: 30, fontWeight: '700' as const, lineHeight: 36, fontFamily: FONTS.bold },
  bodyLarge: { fontSize: 16, fontWeight: '600' as const, lineHeight: 19, fontFamily: FONTS.semiBold },
  bodyMedium: { fontSize: 14, fontWeight: '500' as const, lineHeight: 17, fontFamily: FONTS.medium },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 16, fontFamily: FONTS.regular },
  bodyRegular: { fontSize: 13, fontWeight: '400' as const, lineHeight: 16, fontFamily: FONTS.regular },
  label: { fontSize: 12, fontWeight: '400' as const, lineHeight: 14, fontFamily: FONTS.regular },
  labelMedium: { fontSize: 12, fontWeight: '500' as const, lineHeight: 14, fontFamily: FONTS.medium },
  caption: { fontSize: 11, fontWeight: '400' as const, lineHeight: 13, fontFamily: FONTS.regular },
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 19, fontFamily: FONTS.semiBold },
  buttonSmall: { fontSize: 14, fontWeight: '600' as const, lineHeight: 17, fontFamily: FONTS.semiBold },
  settingsTitle: { fontSize: 15, fontWeight: '500' as const, lineHeight: 18, fontFamily: FONTS.medium },
  settingsSubtitle: { fontSize: 12, fontWeight: '400' as const, lineHeight: 15, fontFamily: FONTS.regular },
} as const;

export const ICON_SIZES = {
  xs: 16, sm: 20, md: 24, lg: 28, xl: 32, xxl: 36, xxxl: 40,
  splash: 110, quickAction: 24, bottomNav: 24, actionButton: 24, statusBar: 16,
} as const;

export const LAYOUT = {
  screenWidth: 360,
  screenHeight: 800,
  statusBarHeight: 44,
  headerHeight: 290,
  bottomTabHeight: 84,
  inputHeight: 64,
  inputHeightLarge: 68,
  buttonHeight: 52,
  buttonHeightLarge: 64,
  avatarSm: 28, avatarMd: 36, avatarLg: 40, avatarXl: 96,
  cardRadius: 16, cardRadiusLarge: 20, buttonRadius: 14, inputRadius: 14,
  trendPillRadius: 13, actionButtonRadius: 28,
} as const;
