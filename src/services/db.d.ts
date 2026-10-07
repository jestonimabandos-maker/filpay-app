import type { SQLiteDatabase } from 'expo-sqlite';

export interface DbUser {
  id: number;
  fullName: string;
  email: string | null;
  mobileNumber: string;
  pin: string;
  accountNumber: string | null;
  savingsAccountNo: string | null;
  joinDate: string | null;
  profileImage: string | null;
  isBiometricEnabled: number;
}

export interface DbAccount {
  id: number;
  userId: number;
  balance: number;
  savingsBalance: number;
  interestEarned: number | null;
}

export interface DbTransaction {
  id: number;
  userId: number;
  type: string;
  category: string | null;
  recipientName: string | null;
  recipientImage: string | null;
  recipientAccount: string | null;
  amount: number;
  purpose: string | null;
  timestamp: string;
  status: string;
  referenceNo: string | null;
  bankName: string | null;
  transferType: string | null;
}

export interface DbGoal {
  id: number;
  userId: number;
  title: string;
  targetAmount: number | null;
  currentAmount: number | null;
  percent: number | null;
}

export interface DbCard {
  id: number;
  userId: number;
  type: string | null;
  cardNumber: string | null;
  cardHolder: string | null;
  isFrozen: number;
  isHidden: number;
  expiry: string | null;
  cvv: string | null;
  cashback: number | null;
}

export interface DbRecipient {
  id: number;
  userId: number;
  name: string | null;
  accountNumber: string | null;
  bankName: string | null;
  type: string | null;
  image: string | null;
}

export interface DbVoucher {
  id: number;
  userId: number;
  title: string | null;
  code: string | null;
  discount: number | null;
  expiry: string | null;
  isClaimed: number;
  isUsed: number;
  category: string | null;
}

export interface DbBiller {
  id: number;
  name: string | null;
  category: string | null;
  icon: string | null;
}

export interface DbStatement {
  id: number;
  userId: number;
  month: string | null;
  year: string | null;
  pdfUrl: string | null;
  totalDeposit: number | null;
  totalWithdrawal: number | null;
}

/** Input accepted by `recordTransaction` (all fields optional but the essentials). */
export interface NewTransaction {
  type: string;
  category?: string;
  recipientName?: string;
  recipientImage?: string | null;
  recipientAccount?: string;
  amount: number;
  purpose?: string;
  timestamp?: string;
  status?: string;
  referenceNo?: string;
  bankName?: string;
  transferType?: string;
}

export declare const db: SQLiteDatabase;

/** Creates all tables (WAL mode) and seeds demo rows only when empty. Returns the user id. */
export declare function initDatabase(): number | null;
/** Spec-facing alias for `initDatabase`. */
export declare function initDB(): number | null;

export declare function listUsers(): DbUser[];
/** The signed-in profile (single seeded demo account). */
export declare function getCurrentUser(): DbUser | null;
export declare function findUserByCredentials(mobileNumber: string, pin: string): DbUser | null;
export declare function getUserById(id: number): DbUser | null;
export declare function getAccount(userId: number): DbAccount | null;
/** The primary (first) card — used by the existing Card screen. */
export declare function getCard(userId: number): DbCard | null;
/** Every card (Virtual + Physical). */
export declare function getCards(userId: number): DbCard[];
/** Spec name — every savings goal for a user. */
export declare function getSavingsGoals(userId: number): DbGoal[];
/** Back-compat alias for `getSavingsGoals`. */
export declare function getGoals(userId: number): DbGoal[];
/** Pass a `search` term and/or a `category` to filter in SQL; omit both for the full history. */
export declare function getTransactions(userId: number, search?: string, category?: string): DbTransaction[];
/** Newest-first slice for the Home / Card recent lists. */
export declare function getRecentTransactions(userId: number, limit?: number): DbTransaction[];
export declare function searchTransactions(userId: number, term: string): DbTransaction[];
/**
 * Inserts a transaction and moves the wallet balance in one parameterised call.
 * Returns the generated reference number.
 */
export declare function recordTransaction(userId: number, t: NewTransaction): string;
/**
 * Legacy convenience: inserts a transaction and debits `accounts.balance`
 * with a parameterised `UPDATE ... SET balance = balance - ?`.
 */
export declare function addTransaction(
  userId: number,
  type: string,
  recipientName: string | null,
  amount: number,
  purpose: string | null,
  category?: string,
): void;
/** Deletes a transaction and refunds the wallet when it was a debit. */
export declare function deleteTransaction(
  id: number,
  userId: number,
  amount: number,
  type: string,
): void;
/** Flips `cards.isFrozen` for the given row id; returns the new state (0 | 1). */
export declare function toggleFreezeCard(cardId: number, currentStatus: number | boolean): number;
/** Flips `cards.isHidden` for the given row id; returns the new state (0 | 1). */
export declare function toggleHideCard(cardId: number, currentStatus: number | boolean): number;

export declare function getRecipients(userId: number): DbRecipient[];
export declare function addRecipient(
  userId: number,
  name: string,
  accountNumber: string,
  bankName: string,
  type: string,
): void;
export declare function updateRecipientImage(id: number, uri: string): void;
export declare function getVouchers(userId: number): DbVoucher[];
export declare function claimVoucher(id: number): void;
export declare function useVoucher(id: number): void;
export declare function getBillers(): DbBiller[];
export declare function getStatements(userId: number): DbStatement[];
export declare function updateProfileImage(userId: number, uri: string): void;
export declare function setBiometricEnabled(userId: number, enabled: boolean | number): void;
export declare function setPin(userId: number, pin: string): void;
export declare function updateUserProfile(userId: number, fullName: string, email: string): void;

declare const _default: {
  db: SQLiteDatabase;
  initDB: typeof initDB;
  initDatabase: typeof initDatabase;
  listUsers: typeof listUsers;
  getCurrentUser: typeof getCurrentUser;
  findUserByCredentials: typeof findUserByCredentials;
  getUserById: typeof getUserById;
  getAccount: typeof getAccount;
  getCard: typeof getCard;
  getCards: typeof getCards;
  getSavingsGoals: typeof getSavingsGoals;
  getGoals: typeof getGoals;
  getTransactions: typeof getTransactions;
  getRecentTransactions: typeof getRecentTransactions;
  searchTransactions: typeof searchTransactions;
  recordTransaction: typeof recordTransaction;
  addTransaction: typeof addTransaction;
  deleteTransaction: typeof deleteTransaction;
  toggleFreezeCard: typeof toggleFreezeCard;
  toggleHideCard: typeof toggleHideCard;
  getRecipients: typeof getRecipients;
  addRecipient: typeof addRecipient;
  updateRecipientImage: typeof updateRecipientImage;
  getVouchers: typeof getVouchers;
  claimVoucher: typeof claimVoucher;
  useVoucher: typeof useVoucher;
  getBillers: typeof getBillers;
  getStatements: typeof getStatements;
  updateProfileImage: typeof updateProfileImage;
  setBiometricEnabled: typeof setBiometricEnabled;
  setPin: typeof setPin;
  updateUserProfile: typeof updateUserProfile;
};
export default _default;
