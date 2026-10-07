import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  db,
  initDatabase,
  getUserById,
  getAccount,
  getCard,
  getSavingsGoals,
  getTransactions,
  addTransaction as addTransactionRow,
} from '@/services/db';
import type { DbTransaction, DbGoal } from '@/services/db';
import { setThemeMode } from '@/theme';

export type TxKind =
  | 'food'
  | 'bills'
  | 'transport'
  | 'shopping'
  | 'transfer'
  | 'savings'
  | 'card'
  | 'receive'
  | 'topup';

export interface Tx {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  kind: TxKind;
  date: string;
  time: string;
  ref: string;
  status: 'success' | 'pending' | 'failed';
}

export interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
  current: number;
  target: number;
  pct: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  kind: 'tx' | 'promo' | 'security';
}

export interface CardState {
  frozen: boolean;
  number: string;
  cvv: string;
  expiry: string;
  holder: string;
  dailyLimit: number;
  monthlyLimit: number;
}

export interface Settings {
  biometric: boolean;
  notifTx: boolean;
  notifPromo: boolean;
  hideBalance: boolean;
  language: string;
}

export type ThemeMode = 'light' | 'dark';

export interface User {
  name: string;
  email: string;
  phone: string;
  accountNo: string;
  accountType: string;
  joinDate: string;
}

export interface Biller {
  id: string;
  name: string;
  category: string;
  icon: string;
}

export function formatPeso(n: number): string {
  const abs = Math.abs(n).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? '-' : ''}₱${abs}`;
}

export function maskedBalance(): string {
  return `₱${'•'.repeat(6)}`;
}

const SESSION_KEY = 'filpay:session';
const PREFS_KEY = 'filpay:prefs:v1';

function refNo(id?: number): string {
  return `FP${String(id ?? Date.now()).slice(-8)}`;
}

/** Map a stored transaction row onto the shape every screen already renders. */
export function mapTx(row: DbTransaction): Tx {
  const purpose = (row.purpose ?? '').toLowerCase();
  const type = (row.type ?? '').toLowerCase();

  let kind: TxKind = 'transfer';
  if (purpose === 'grocery' || purpose === 'shopping') kind = 'shopping';
  else if (purpose === 'food') kind = 'food';
  else if (purpose === 'transport') kind = 'transport';
  else if (purpose === 'bills') kind = 'bills';
  else if (purpose === 'savings') kind = 'savings';
  else if (type === 'salary' || type === 'receive' || type === 'topup') kind = 'receive';
  else if (type === 'pay') kind = 'transfer';

  const status: Tx['status'] =
    row.status === 'pending' ? 'pending' : row.status === 'failed' ? 'failed' : 'success';

  return {
    id: String(row.id),
    title: row.recipientName ?? 'Transaction',
    subtitle: row.purpose ?? '',
    amount: row.amount,
    kind,
    date: row.timestamp,
    time: '',
    ref: refNo(row.id),
    status,
  };
}

function goalIcon(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('home')) return '⌂';
  if (t.includes('travel')) return '✈';
  if (t.includes('car')) return '🚗';
  if (t.includes('emergency')) return '🛟';
  return '◎';
}

function mapGoal(row: DbGoal): SavingsGoal {
  const target = row.targetAmount ?? 0;
  const current = row.currentAmount ?? 0;
  return {
    id: String(row.id),
    name: row.title,
    icon: goalIcon(row.title),
    current,
    target,
    pct: row.percent ?? (target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0),
  };
}

interface FilPayState {
  hydrated: boolean;
  authed: boolean;
  userId: number | null;
  login: (userId?: number) => void;
  logout: () => void;

  walletBalance: number;
  availableBalance: number;
  savingsBalance: number;
  hiddenBalance: boolean;

  goals: SavingsGoal[];
  transactions: Tx[];
  cardTransactions: Tx[];
  notifications: NotificationItem[];
  unreadCount: number;
  /** Latest notification surfaced as a top banner; auto-dismisses, stays in the list. */
  toast: NotificationItem | null;
  dismissToast: () => void;
  user: User;
  card: CardState;
  settings: Settings;

  sendMoney: (p: { to: string; amount: number; purpose: string }) => { ok: boolean; message: string };
  payBills: (p: { biller: string; accountNo: string; amount: number }) => { ok: boolean; message: string };
  topUp: (amount: number, source: string) => { ok: boolean; message: string };
  payScan: (amount: number, merchant: string) => { ok: boolean; message: string };
  depositToGoal: (goalId: string, amount: number) => { ok: boolean; message: string };
  withdrawFromGoal: (goalId: string, amount: number) => { ok: boolean; message: string };
  /** Re-read every screen's data from SQLite — call after issuing raw SQL. */
  reload: () => void;
  addTransaction: (
    t: Omit<Tx, 'id' | 'date' | 'time' | 'ref' | 'status'> & Partial<Pick<Tx, 'date' | 'time' | 'ref' | 'status'>>,
  ) => void;

  markAllRead: () => void;
  markRead: (id: string) => void;
  pushNotification: (n: Omit<NotificationItem, 'id' | 'read' | 'time'>) => void;
  clearNotifications: () => void;
  /** Delete a single notification row. */
  removeNotification: (id: string) => void;

  setFrozen: (v: boolean) => void;
  updateCard: (p: Partial<CardState>) => void;
  setBiometric: (v: boolean) => void;
  updateSettings: (p: Partial<Settings>) => void;
  /** Light/dark mode — re-themes the whole app. */
  theme: ThemeMode;
  setTheme: (m: ThemeMode) => void;
  toggleTheme: () => void;
  toggleBalance: () => void;
  setPin: (v: string) => void;
  setUser: (u: User) => void;
  resetAll: () => void;
}

const FilPayContext = createContext<FilPayState | null>(null);

const SEED_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', title: 'Payment successful', body: 'Your payment went through.', time: '2h ago', read: false, kind: 'tx' },
  { id: 'n2', title: 'Salary received', body: 'Salary Credit has been deposited.', time: '1d ago', read: false, kind: 'tx' },
  { id: 'n3', title: '2% cashback promo', body: 'Earn cashback on selected merchants this May.', time: '2d ago', read: true, kind: 'promo' },
  { id: 'n4', title: 'New device sign-in', body: 'Your account was accessed on Android.', time: '3d ago', read: true, kind: 'security' },
];

const NOTIF_KINDS = new Set<NotificationItem['kind']>(['tx', 'promo', 'security']);

/**
 * Persisted notifications may predate the current `kind` union (the store was
 * rewritten more than once). Drop anything malformed so no consumer can hit an
 * undefined metadata lookup.
 */
function sanitizeNotifications(raw: unknown): NotificationItem[] {
  if (!Array.isArray(raw)) return SEED_NOTIFICATIONS;
  const out: NotificationItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const n = item as Partial<NotificationItem>;
    if (typeof n.id !== 'string' || typeof n.title !== 'string') continue;
    if (!n.kind || !NOTIF_KINDS.has(n.kind)) continue;
    out.push({
      id: n.id,
      title: n.title,
      body: typeof n.body === 'string' ? n.body : '',
      time: typeof n.time === 'string' ? n.time : '',
      read: n.read === true,
      kind: n.kind,
    });
  }
  return out;
}

const DEFAULT_SETTINGS: Settings = {
  biometric: true,
  notifTx: true,
  notifPromo: true,
  hideBalance: false,
  language: 'English',
};

const DEFAULT_CARD: CardState = {
  frozen: false,
  number: '**** **** **** 4821',
  cvv: '418',
  expiry: '08/29',
  holder: 'JESTONI MABANDOS',
  dailyLimit: 50000,
  monthlyLimit: 200000,
};

/** Fields that live in the users table are read from SQLite; the rest stay local. */
const DEFAULT_USER: User = {
  name: 'Jestoni Mabandos',
  email: 'juan.delacruz@email.com',
  phone: '+63 972 345 5789',
  accountNo: '**** 4821',
  accountType: 'Savings Account',
  joinDate: 'Jan 15, 2026',
};

let seq = 1000;

export function FilPayProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  const [walletBalance, setWalletBalance] = useState(0);
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [card, setCard] = useState<CardState>(DEFAULT_CARD);
  const [user, setUserState] = useState<User>(DEFAULT_USER);

  const [notifications, setNotifications] = useState<NotificationItem[]>(SEED_NOTIFICATIONS);
  const [toast, setToast] = useState<NotificationItem | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const [authed, setAuthed] = useState(false);

  /** Read every screen's data straight from SQLite. */
  const loadFromDb = useCallback((uid: number) => {
    const account = getAccount(uid);
    if (account) {
      setWalletBalance(account.balance);
      setSavingsBalance(account.savingsBalance);
    }

    const rows = getTransactions(uid);
    setTransactions(rows.map(mapTx));

    setGoals(getSavingsGoals(uid).map(mapGoal));

    const cardRow = getCard(uid);
    if (cardRow) {
      setCard({
        ...DEFAULT_CARD,
        frozen: cardRow.isFrozen === 1,
        number: cardRow.cardNumber ?? DEFAULT_CARD.number,
        holder: cardRow.cardHolder ?? DEFAULT_CARD.holder,
      });
    }

    const userRow = getUserById(uid);
    if (userRow) {
      setUserState((prev) => ({
        ...prev,
        name: userRow.fullName,
        phone: userRow.mobileNumber,
        accountNo: userRow.accountNumber ?? prev.accountNo,
        joinDate: userRow.joinDate ?? prev.joinDate,
      }));
    }
  }, []);

  // ---- launch: create tables, seed, restore session ----
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        initDatabase();

        const raw = await AsyncStorage.getItem(SESSION_KEY);
        const storedUserId = raw ? parseInt(raw, 10) : NaN;

        let uid: number | null = Number.isFinite(storedUserId) ? storedUserId : null;
        if (uid !== null && !getUserById(uid)) uid = null;

        if (uid !== null) {
          if (alive) {
            setUserId(uid);
            setAuthed(true);
          }
          loadFromDb(uid);
        }

        const prefs = await AsyncStorage.getItem(PREFS_KEY);
        if (prefs && alive) {
          const p = JSON.parse(prefs);
          if (p.settings) setSettings({ ...DEFAULT_SETTINGS, ...p.settings });
          if (p.theme === 'dark' || p.theme === 'light') {
            setThemeMode(p.theme);
            setTheme(p.theme);
          }
          if (Array.isArray(p.notifications)) setNotifications(sanitizeNotifications(p.notifications));
          if (p.userExtras) setUserState((prev) => ({ ...prev, ...p.userExtras }));
        }
      } catch {
        // storage unavailable — continue with whatever SQLite returned
      } finally {
        if (alive) setHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadFromDb]);

  // ---- persist non-SQLite preferences ----
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      AsyncStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          settings,
          theme,
          notifications,
          userExtras: { email: user.email, accountType: user.accountType },
        }),
      ).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [hydrated, settings, theme, notifications, user.email, user.accountType]);

  // Push the theme mode into the live palette; the state change re-renders every
  // screen so all themed styles pick up the new mode.
  useEffect(() => {
    setThemeMode(theme);
  }, [theme]);

  const refresh = useCallback(() => {
    if (userId !== null) loadFromDb(userId);
  }, [userId, loadFromDb]);

  const guard = (amount: number, available?: number) => {
    if (!Number.isFinite(amount) || amount <= 0)
      return { ok: false, message: 'Enter a valid amount greater than zero.' };
    if (available !== undefined && amount > available)
      return { ok: false, message: 'Insufficient balance for this transaction.' };
    return { ok: true, message: '' };
  };

  const notify = useCallback((n: Omit<NotificationItem, 'id' | 'read' | 'time'>) => {
    seq += 1;
    const item = { ...n, id: `n${seq}`, read: false, time: 'Just now' };
    setNotifications((prev) => [item, ...prev]);
    setToast(item);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  // ---- session ----
  const login = useCallback((uid?: number) => {
    const target = uid ?? userId;
    if (target !== null && target !== undefined) {
      setUserId(target);
      AsyncStorage.setItem(SESSION_KEY, String(target)).catch(() => {});
      setAuthed(true);
    }
  }, [userId]);

  const logout = useCallback(() => {
    setAuthed(false);
    setUserId(null);
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  }, []);

  // ---- money movement (CLO 2.4: parameterised writes only) ----
  const sendMoney = useCallback(
    (p: { to: string; amount: number; purpose: string }) => {
      const check = guard(p.amount, walletBalance);
      if (!check.ok) return check;
      if (userId === null) return { ok: false, message: 'No active session.' };

      addTransactionRow(userId, 'send', p.to, -p.amount, p.purpose);

      refresh();
      notify({ title: 'Money sent', body: `${formatPeso(p.amount)} sent to ${p.to}.`, kind: 'tx' });
      return { ok: true, message: `${formatPeso(p.amount)} sent to ${p.to}.` };
    },
    [userId, walletBalance, refresh, notify],
  );

  const payBills = useCallback(
    (p: { biller: string; accountNo: string; amount: number }) => {
      const check = guard(p.amount, walletBalance);
      if (!check.ok) return check;
      if (userId === null) return { ok: false, message: 'No active session.' };

      addTransactionRow(userId, 'pay', p.biller, -p.amount, `Bills • ${p.accountNo}`);

      refresh();
      notify({ title: 'Bills paid', body: `${formatPeso(p.amount)} paid to ${p.biller}.`, kind: 'tx' });
      return { ok: true, message: `${formatPeso(p.amount)} paid to ${p.biller}.` };
    },
    [userId, walletBalance, refresh, notify],
  );

  const topUp = useCallback(
    (amount: number, source: string) => {
      const check = guard(amount);
      if (!check.ok) return check;
      if (userId === null) return { ok: false, message: 'No active session.' };

      db.runSync(
        `INSERT INTO transactions (userId, type, recipientName, amount, purpose, timestamp, status)
         VALUES (?, 'receive', ?, ?, ?, datetime('now'), 'completed')`,
        [userId, source, amount, 'Top up'],
      );
      db.runSync('UPDATE accounts SET balance = balance + ? WHERE userId = ?', [amount, userId]);

      refresh();
      notify({ title: 'Top up received', body: `${formatPeso(amount)} added from ${source}.`, kind: 'tx' });
      return { ok: true, message: `${formatPeso(amount)} added.` };
    },
    [userId, refresh, notify],
  );

  const payScan = useCallback(
    (amount: number, merchant: string) => {
      const check = guard(amount, walletBalance);
      if (!check.ok) return check;
      if (card.frozen) return { ok: false, message: 'Your card is frozen. Unfreeze it to pay.' };
      if (userId === null) return { ok: false, message: 'No active session.' };

      addTransactionRow(userId, 'pay', merchant, -amount, 'Scan & Pay');

      refresh();
      notify({ title: 'Payment successful', body: `${formatPeso(amount)} paid to ${merchant}.`, kind: 'tx' });
      return { ok: true, message: `${formatPeso(amount)} paid to ${merchant}.` };
    },
    [userId, walletBalance, card.frozen, refresh, notify],
  );

  const depositToGoal = useCallback(
    (goalId: string, amount: number) => {
      const check = guard(amount, walletBalance);
      if (!check.ok) return check;
      if (userId === null) return { ok: false, message: 'No active session.' };

      const goalIdNum = parseInt(goalId, 10);
      const goal = getSavingsGoals(userId).find((g) => String(g.id) === goalId);
      if (!goal) return { ok: false, message: 'Savings goal not found.' };

      const nextCurrent = (goal.currentAmount ?? 0) + amount;
      const target = goal.targetAmount ?? 0;
      const nextPct = target > 0 ? Math.min(100, Math.round((nextCurrent / target) * 100)) : 0;

      db.runSync('UPDATE savings_goals SET currentAmount = ?, percent = ? WHERE id = ? AND userId = ?', [
        nextCurrent,
        nextPct,
        goalIdNum,
        userId,
      ]);
      db.runSync('UPDATE accounts SET savingsBalance = savingsBalance + ?, balance = balance - ? WHERE userId = ?', [
        amount,
        amount,
        userId,
      ]);
      db.runSync(
        `INSERT INTO transactions (userId, type, recipientName, amount, purpose, timestamp, status)
         VALUES (?, 'send', ?, ?, 'Savings', datetime('now'), 'completed')`,
        [userId, `To ${goal.title}`, -amount],
      );

      refresh();
      notify({ title: 'Savings updated', body: `${formatPeso(amount)} added to ${goal.title}.`, kind: 'tx' });
      return { ok: true, message: `${formatPeso(amount)} added to ${goal.title}.` };
    },
    [userId, walletBalance, refresh, notify],
  );

  const withdrawFromGoal = useCallback(
    (goalId: string, amount: number) => {
      if (userId === null) return { ok: false, message: 'No active session.' };
      const goalIdNum = parseInt(goalId, 10);
      const goal = getSavingsGoals(userId).find((g) => String(g.id) === goalId);
      if (!goal) return { ok: false, message: 'Savings goal not found.' };

      const check = guard(amount, goal.currentAmount ?? 0);
      if (!check.ok) return check;

      const nextCurrent = Math.max(0, (goal.currentAmount ?? 0) - amount);
      const target = goal.targetAmount ?? 0;
      const nextPct = target > 0 ? Math.min(100, Math.round((nextCurrent / target) * 100)) : 0;

      db.runSync('UPDATE savings_goals SET currentAmount = ?, percent = ? WHERE id = ? AND userId = ?', [
        nextCurrent,
        nextPct,
        goalIdNum,
        userId,
      ]);
      db.runSync('UPDATE accounts SET savingsBalance = savingsBalance - ?, balance = balance + ? WHERE userId = ?', [
        amount,
        amount,
        userId,
      ]);
      db.runSync(
        `INSERT INTO transactions (userId, type, recipientName, amount, purpose, timestamp, status)
         VALUES (?, 'receive', ?, ?, 'Savings', datetime('now'), 'completed')`,
        [userId, `From ${goal.title}`, amount],
      );

      refresh();
      notify({ title: 'Withdrawal complete', body: `${formatPeso(amount)} moved to wallet.`, kind: 'tx' });
      return { ok: true, message: `${formatPeso(amount)} moved to your wallet.` };
    },
    [userId, refresh, notify],
  );

  const addTransaction = useCallback(
    (t: Omit<Tx, 'id' | 'date' | 'time' | 'ref' | 'status'> & Partial<Pick<Tx, 'date' | 'time' | 'ref' | 'status'>>) => {
      if (userId === null) return;
      db.runSync(
        `INSERT INTO transactions (userId, type, recipientName, amount, purpose, timestamp, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, t.kind, t.title, t.amount, t.subtitle, t.date ?? new Date().toISOString(), t.status ?? 'success'],
      );
      refresh();
    },
    [userId, refresh],
  );

  // ---- notifications ----
  const markAllRead = useCallback(() => setNotifications((p) => p.map((n) => ({ ...n, read: true }))), []);
  const markRead = useCallback((id: string) => setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n))), []);
  const clearNotifications = useCallback(() => setNotifications([]), []);
  const removeNotification = useCallback((id: string) => {
    setNotifications((p) => p.filter((n) => n.id !== id));
    setToast((t) => (t && t.id === id ? null : t));
  }, []);
  const pushNotification = useCallback((n: Omit<NotificationItem, 'id' | 'read' | 'time'>) => notify(n), [notify]);

  // ---- card / settings ----
  const setFrozen = useCallback(
    (v: boolean) => {
      setCard((c) => ({ ...c, frozen: v }));
      if (userId !== null) {
        db.runSync('UPDATE cards SET isFrozen = ? WHERE userId = ?', [v ? 1 : 0, userId]);
      }
    },
    [userId],
  );

  const updateCard = useCallback((p: Partial<CardState>) => {
    setCard((c) => ({ ...c, ...p }));
  }, []);

  const setBiometric = useCallback((v: boolean) => setSettings((s) => ({ ...s, biometric: v })), []);
  const updateSettings = useCallback((p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p })), []);
  /** Set the palette synchronously BEFORE the state update, so the re-render
   *  that follows already reads the new mode (no one-frame lag). */
  const applyTheme = useCallback((m: ThemeMode) => {
    setThemeMode(m);
    setTheme(m);
  }, []);
  const toggleTheme = useCallback(() => applyTheme(theme === 'dark' ? 'light' : 'dark'), [applyTheme, theme]);
  const toggleBalance = useCallback(() => setSettings((s) => ({ ...s, hideBalance: !s.hideBalance })), []);

  const setPin = useCallback(
    (v: string) => {
      if (userId !== null) db.runSync('UPDATE users SET pin = ? WHERE id = ?', [v, userId]);
    },
    [userId],
  );

  const setUser = useCallback(
    (u: User) => {
      setUserState(u);
      if (userId !== null) {
        db.runSync('UPDATE users SET fullName = ?, mobileNumber = ? WHERE id = ?', [
          u.name,
          u.phone,
          userId,
        ]);
      }
    },
    [userId],
  );

  const resetAll = useCallback(() => {
    if (userId === null) return;
    // Wipe every dependent row first, otherwise initDatabase()'s "seed only when
    // users is empty" guard would leave the goal and card tables empty forever.
    db.runSync('DELETE FROM transactions WHERE userId = ?', [userId]);
    db.runSync('DELETE FROM savings_goals WHERE userId = ?', [userId]);
    db.runSync('DELETE FROM cards WHERE userId = ?', [userId]);
    db.runSync('DELETE FROM accounts WHERE userId = ?', [userId]);
    db.runSync('DELETE FROM users WHERE id = ?', [userId]);

    AsyncStorage.removeItem(PREFS_KEY).catch(() => {});
    setSettings(DEFAULT_SETTINGS);
    setNotifications(SEED_NOTIFICATIONS);
    setUserState(DEFAULT_USER);

    const freshId = initDatabase();
    if (freshId !== null) {
      setUserId(freshId);
      AsyncStorage.setItem(SESSION_KEY, String(freshId)).catch(() => {});
      loadFromDb(freshId);
    }
  }, [userId, loadFromDb]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const cardTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

  const value = useMemo<FilPayState>(
    () => ({
      hydrated,
      authed,
      userId,
      login,
      logout,
      walletBalance,
      availableBalance: walletBalance,
      savingsBalance,
      hiddenBalance: settings.hideBalance,
      goals,
      transactions,
      cardTransactions,
      notifications,
      unreadCount,
      toast,
      dismissToast,
      user,
      card,
      settings,
      sendMoney,
      payBills,
      topUp,
      payScan,
      depositToGoal,
      withdrawFromGoal,
      reload: refresh,
      addTransaction,
      markAllRead,
      markRead,
      pushNotification,
      clearNotifications,
      removeNotification,
      setFrozen,
      updateCard,
      setBiometric,
      updateSettings,
      theme,
      setTheme: applyTheme,
      toggleTheme,
      toggleBalance,
      setPin,
      setUser,
      resetAll,
    }),
    [
      hydrated, authed, userId, login, logout, walletBalance, savingsBalance,
      goals, transactions, cardTransactions, notifications, unreadCount, toast, dismissToast, user, card, settings,
      sendMoney, payBills, topUp, payScan, depositToGoal, withdrawFromGoal, refresh, addTransaction,
      markAllRead, markRead, pushNotification, clearNotifications, removeNotification, setFrozen, updateCard,
      setBiometric, updateSettings, theme, applyTheme, toggleTheme, toggleBalance, setPin, setUser, resetAll,
    ],
  );

  return <FilPayContext.Provider value={value}>{children}</FilPayContext.Provider>;
}

export function useFilPay(): FilPayState {
  const ctx = useContext(FilPayContext);
  if (!ctx) throw new Error('useFilPay must be used inside FilPayProvider');
  return ctx;
}
