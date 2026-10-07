import type { Feather } from '@expo/vector-icons';
import type { TxKind } from '@/store';
import { C } from '@/theme';

type Glyph = keyof typeof Feather.glyphMap;

/**
 * Icon + tint for every transaction kind.
 * Hues are folded into the 60-30-10 palette: spending = muted, money in and
 * growth = success, internal movement = primary. Gold stays reserved for the
 * small highlights (growth chips, badges, notification dot, card chip).
 */
export const TX_META: Record<TxKind, { icon: Glyph; color: string; bg: string; label: string }> = {
  food: { icon: 'coffee', color: C.catSpendFg, bg: C.catSpendBg, label: 'Food' },
  bills: { icon: 'file-text', color: C.catPrimaryFg, bg: C.catPrimaryBg, label: 'Bills' },
  transport: { icon: 'navigation', color: C.catSpendFg, bg: C.catSpendBg, label: 'Transport' },
  shopping: { icon: 'shopping-bag', color: C.catSpendFg, bg: C.catSpendBg, label: 'Shopping' },
  transfer: { icon: 'arrow-up-right', color: C.catPrimaryFg, bg: C.catPrimaryBg, label: 'Transfer' },
  savings: { icon: 'trending-up', color: C.catSuccessFg, bg: C.catSuccessBg, label: 'Savings' },
  card: { icon: 'credit-card', color: C.catPrimaryFg, bg: C.catPrimaryBg, label: 'Card' },
  receive: { icon: 'arrow-down-left', color: C.catSuccessFg, bg: C.catSuccessBg, label: 'Received' },
  topup: { icon: 'plus-circle', color: C.catSuccessFg, bg: C.catSuccessBg, label: 'Top up' },
};

export function txMeta(kind: TxKind) {
  return TX_META[kind] ?? TX_META.transfer;
}

export const FILTERS: { key: TxKind | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'transfer', label: 'Transfers' },
  { key: 'bills', label: 'Bills' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'food', label: 'Food' },
  { key: 'transport', label: 'Transport' },
  { key: 'savings', label: 'Savings' },
  { key: 'receive', label: 'Received' },
];

/** Billers available on the Pay Bills screen. */
export const BILLERS = [
  { id: 'b1', name: 'Meralco', category: 'Electric', icon: 'zap' as Glyph },
  { id: 'b2', name: 'Maynilad', category: 'Water', icon: 'droplet' as Glyph },
  { id: 'b3', name: 'Manila Water', category: 'Water', icon: 'droplet' as Glyph },
  { id: 'b4', name: 'Globe Telecom', category: 'Mobile', icon: 'smartphone' as Glyph },
  { id: 'b5', name: 'Smart Communications', category: 'Mobile', icon: 'smartphone' as Glyph },
  { id: 'b6', name: 'PLDT', category: 'Internet', icon: 'wifi' as Glyph },
  { id: 'b7', name: 'Sky Fiber', category: 'Internet', icon: 'wifi' as Glyph },
  { id: 'b8', name: 'Pag-IBIG Fund', category: 'Government', icon: 'home' as Glyph },
  { id: 'b9', name: 'PhilHealth', category: 'Government', icon: 'heart' as Glyph },
  { id: 'b10', name: 'SSS', category: 'Government', icon: 'users' as Glyph },
  { id: 'b11', name: 'BIR', category: 'Government', icon: 'file-text' as Glyph },
  { id: 'b12', name: 'Viva Cinemas', category: 'Lifestyle', icon: 'film' as Glyph },
];

export const BILL_CATEGORIES = ['All', 'Electric', 'Water', 'Mobile', 'Internet', 'Government', 'Lifestyle'];

/** Quick amounts used across send / bills / scan / top-up. */
export const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

/** Contacts available on Send Money. */
export const CONTACTS = [
  { id: '1', name: 'Johnroi Umbokan', phone: '+63 912 987 6543', init: 'JU' },
  { id: '2', name: 'Jay Panquilbay', phone: '+63 918 234 5678', init: 'JP' },
  { id: '3', name: 'Maria Santos', phone: '+63 919 345 6789', init: 'MS' },
  { id: '4', name: 'Paolo Reyes', phone: '+63 920 456 7890', init: 'PR' },
  { id: '5', name: 'Angela Cruz', phone: '+63 921 567 8901', init: 'AC' },
];

export const PURPOSES = ['Family Support', 'Bills Payment', 'Food', 'Transport', 'Savings', 'Rent', 'Gift'];

/** Parse a currency-ish string into a number. */
export function parseAmount(raw: string): number {
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Strip a phone/email down to a readable initial pair. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function isValidPhone(v: string): boolean {
  return /^\+?\d[\d\s-]{8,}$/.test(v.trim());
}
