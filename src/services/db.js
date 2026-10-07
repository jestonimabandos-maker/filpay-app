import * as SQLite from 'expo-sqlite';

/**
 * FilPay x MariBank SQLite database service.
 *
 * CLO 2.2 - WAL journal mode is enabled on every launch.
 * CLO 2.3 - tables are seeded only when the users table is empty.
 * CLO 2.4 - every write uses `runSync` with `?` placeholders (no string concatenation).
 * CLO 2.5 - every read/filter uses a parameterised `SELECT` (search uses `LIKE ?`).
 * CLO 2.6 - purely local file storage, so rows survive an airplane-mode kill & relaunch.
 *
 * NOTE: the file name stays `filpay.db` on purpose. Renaming it would orphan the
 * data already written by the shipped build; instead the schema is extended in
 * place and `schemaIsCompatible()` rebuilds it once when columns change.
 */
export const db = SQLite.openDatabaseSync('filpay.db');

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    email TEXT,
    mobileNumber TEXT UNIQUE NOT NULL,
    pin TEXT NOT NULL,
    accountNumber TEXT,
    savingsAccountNo TEXT,
    joinDate TEXT,
    profileImage TEXT,
    isBiometricEnabled INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    balance REAL NOT NULL,
    savingsBalance REAL NOT NULL,
    interestEarned REAL DEFAULT 0,
    FOREIGN KEY(userId) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    type TEXT NOT NULL,
    category TEXT,
    recipientName TEXT,
    recipientImage TEXT,
    recipientAccount TEXT,
    amount REAL NOT NULL,
    purpose TEXT,
    timestamp TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    referenceNo TEXT,
    bankName TEXT,
    transferType TEXT,
    FOREIGN KEY(userId) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS savings_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    title TEXT NOT NULL,
    targetAmount REAL,
    currentAmount REAL,
    percent INTEGER,
    FOREIGN KEY(userId) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    type TEXT DEFAULT 'Virtual',
    cardNumber TEXT,
    cardHolder TEXT,
    isFrozen INTEGER DEFAULT 0,
    isHidden INTEGER DEFAULT 1,
    expiry TEXT,
    cvv TEXT,
    cashback REAL DEFAULT 0,
    FOREIGN KEY(userId) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS recipients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    name TEXT,
    accountNumber TEXT,
    bankName TEXT,
    type TEXT,
    image TEXT,
    FOREIGN KEY(userId) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    title TEXT,
    code TEXT,
    discount REAL,
    expiry TEXT,
    isClaimed INTEGER DEFAULT 0,
    isUsed INTEGER DEFAULT 0,
    category TEXT,
    FOREIGN KEY(userId) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    category TEXT,
    icon TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS statements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    month TEXT,
    year TEXT,
    pdfUrl TEXT,
    totalDeposit REAL,
    totalWithdrawal REAL,
    FOREIGN KEY(userId) REFERENCES users(id)
  )`,
];

/**
 * Columns each table must expose. `status`/`category` (transactions),
 * `cashback`/`type`/`isHidden`/`expiry`/`cvv` (cards) and the *extended* user
 * columns are additive extras layered on top of the Lab 5 DDL.
 * Table names are our own literals, never user input.
 */
const TABLE_COLUMNS = {
  users: [
    'id', 'fullName', 'email', 'mobileNumber', 'pin',
    'accountNumber', 'savingsAccountNo', 'joinDate', 'profileImage', 'isBiometricEnabled',
  ],
  accounts: ['id', 'userId', 'balance', 'savingsBalance', 'interestEarned'],
  transactions: [
    'id', 'userId', 'type', 'category', 'recipientName', 'recipientImage',
    'recipientAccount', 'amount', 'purpose', 'timestamp', 'status', 'referenceNo',
    'bankName', 'transferType',
  ],
  savings_goals: ['id', 'userId', 'title', 'targetAmount', 'currentAmount', 'percent'],
  cards: ['id', 'userId', 'type', 'cardNumber', 'cardHolder', 'isFrozen', 'isHidden', 'expiry', 'cvv', 'cashback'],
  recipients: ['id', 'userId', 'name', 'accountNumber', 'bankName', 'type', 'image'],
  vouchers: ['id', 'userId', 'title', 'code', 'discount', 'expiry', 'isClaimed', 'isUsed', 'category'],
  bills: ['id', 'name', 'category', 'icon'],
  statements: ['id', 'userId', 'month', 'year', 'pdfUrl', 'totalDeposit', 'totalWithdrawal'],
};

const ALL_TABLES = Object.keys(TABLE_COLUMNS);

/**
 * Expo Go shares one file sandbox across every project, so a `filpay.db` written
 * by an earlier build can already exist with a different shape. Because the DDL
 * below is `CREATE TABLE IF NOT EXISTS`, such a table would be silently kept and
 * every INSERT would fail with "no column named ...". Compare the live schema
 * against the expected columns first; anything unexpected triggers a rebuild.
 */
function schemaIsCompatible() {
  for (const table of ALL_TABLES) {
    let info;
    try {
      info = db.getAllSync(`PRAGMA table_info(${table})`);
    } catch {
      return false;
    }
    if (info.length === 0) continue; // table does not exist yet — DDL will create it
    const have = new Set(info.map((c) => c.name));
    if (!TABLE_COLUMNS[table].every((c) => have.has(c))) return false;
  }
  return true;
}

/**
 * Seed rows: [type, category, recipientName, amount, purpose, timestamp] — oldest
 * first so the newest-first queries read `Grocery Store` at the top.
 */
const SEED_TRANSACTIONS = [
  ['send', 'Transfers', 'Grab', -220.0, 'Transport', '2026-05-06'],
  ['send', 'Payments', 'SM Store', -1250.0, 'Shopping', '2026-05-07'],
  ['send', 'Payments', 'Jollibee', -180.0, 'Food', '2026-05-08'],
  ['receive', 'Deposits', 'Salary Credit', 1000.0, 'Salary', '2026-05-09'],
  ['send', 'Payments', 'Grocery Store', -882.5, 'Grocery', '2026-05-10'],
];

const SEED_RECIPIENTS = [
  ['Johnroi Umbokan', '09129876543', 'FilPay', 'FilPay'],
  ['Jay Panquilbay', '09182345678', 'FilPay', 'FilPay'],
  ['Maria Santos', '09193456789', 'BPI', 'Other Bank'],
  ['GCash Wallet', '09223334444', 'GCash', 'E-Wallet'],
];

const SEED_VOUCHERS = [
  ['₱50 Off Transfer Fee', 'TRANSFER50', 50, '2026-12-31', 1, 0, 'Transfer'],
  ['₱20 Load Cashback', 'LOAD20', 20, '2026-11-30', 0, 0, 'Buy Load'],
  ['Free Bills Payment', 'BILLFREE', 0, '2026-12-31', 1, 0, 'Pay Bills'],
];

const SEED_BILLS = [
  ['Meralco', 'Electricity', '⚡'],
  ['Maynilad', 'Water', '💧'],
  ['PLDT', 'Cable & Internet', '🌐'],
  ['Globe Postpaid', 'Postpaid Mobile', '📱'],
  ['BPI Credit Card', 'Credit Card', '💳'],
  ['SSS', 'Government', '🏛️'],
  ['PhilHealth', 'Government', '🏥'],
  ['Smart', 'Telecom', '📞'],
  ['Home Credit', 'Finance', '💰'],
  ['Manila Water', 'Water', '💧'],
];

/**
 * Create every table and seed demo data exactly once (only when empty).
 * Returns the active user id, or null when no user exists yet.
 */
export function initDatabase() {
  // CLO 2.2 — durable write-ahead logging so data survives kill & relaunch.
  db.execSync('PRAGMA journal_mode = WAL;');

  // Rebuild first when a stale database does not match the expected columns.
  if (!schemaIsCompatible()) {
    for (const table of ALL_TABLES) db.execSync(`DROP TABLE IF EXISTS ${table};`);
  }

  for (const sql of SCHEMA) {
    db.execSync(sql);
  }

  const row = db.getFirstSync('SELECT COUNT(*) AS n FROM users');

  // CLO 2.3 — seed only when the users table is empty.
  if (!row || row.n === 0) {
    db.runSync(
      `INSERT INTO users
        (fullName, email, mobileNumber, pin, accountNumber, savingsAccountNo, joinDate, profileImage, isBiometricEnabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Jestoni Mabandos', 'jestoni@gmail.com', '+63 972 345 5789', '1234',
        '**** 4821', '12 345 678 9012', 'Jan 15, 2026', '', 1,
      ],
    );

    const user = db.getFirstSync('SELECT id FROM users ORDER BY id ASC LIMIT 1');
    const userId = user ? user.id : 1;

    db.runSync(
      'INSERT INTO accounts (userId, balance, savingsBalance, interestEarned) VALUES (?, ?, ?, ?)',
      [userId, 25480.75, 12850.32, 342.5],
    );

    for (const [type, category, name, amount, purpose, timestamp] of SEED_TRANSACTIONS) {
      db.runSync(
        `INSERT INTO transactions
          (userId, type, category, recipientName, amount, purpose, timestamp, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')`,
        [userId, type, category, name, amount, purpose, timestamp],
      );
    }

    db.runSync(
      'INSERT INTO savings_goals (userId, title, targetAmount, currentAmount, percent) VALUES (?, ?, ?, ?, ?)',
      [userId, 'Home Fund', 150000, 148000, 98],
    );
    db.runSync(
      'INSERT INTO savings_goals (userId, title, targetAmount, currentAmount, percent) VALUES (?, ?, ?, ?, ?)',
      [userId, 'Travel Fund', 50000, 21000, 42],
    );

    // Card #1 must stay `**** **** **** 4821` / `JESTONI MABANDOS` — the existing
    // Card screen renders `getCard()` (the first row) and expects exactly that.
    db.runSync(
      `INSERT INTO cards (userId, type, cardNumber, cardHolder, isFrozen, isHidden, expiry, cvv, cashback)
       VALUES (?, 'Virtual', ?, ?, 0, 0, '08/29', '418', 0)`,
      [userId, '**** **** **** 4821', 'JESTONI MABANDOS'],
    );
    db.runSync(
      `INSERT INTO cards (userId, type, cardNumber, cardHolder, isFrozen, isHidden, expiry, cvv, cashback)
       VALUES (?, 'Physical', ?, ?, 0, 1, '12/28', '456', 0)`,
      [userId, '4821 9876 5432 1098', 'JESTONI MABANDOS'],
    );

    for (const [name, accountNumber, bankName, type] of SEED_RECIPIENTS) {
      db.runSync(
        'INSERT INTO recipients (userId, name, accountNumber, bankName, type) VALUES (?, ?, ?, ?, ?)',
        [userId, name, accountNumber, bankName, type],
      );
    }

    for (const [title, code, discount, expiry, claimed, used, category] of SEED_VOUCHERS) {
      db.runSync(
        `INSERT INTO vouchers (userId, title, code, discount, expiry, isClaimed, isUsed, category)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, title, code, discount, expiry, claimed, used, category],
      );
    }

    for (const [name, category, icon] of SEED_BILLS) {
      db.runSync('INSERT INTO bills (name, category, icon) VALUES (?, ?, ?)', [name, category, icon]);
    }

    db.runSync(
      `INSERT INTO statements (userId, month, year, totalDeposit, totalWithdrawal)
       VALUES (?, 'May', '2026', 15000, 5000)`,
      [userId],
    );
    db.runSync(
      `INSERT INTO statements (userId, month, year, totalDeposit, totalWithdrawal)
       VALUES (?, 'April', '2026', 20000, 8000)`,
      [userId],
    );
  } else {
    // Bills are reference data with no user link — top them up on any launch
    // where an older seed (or a fresh install) left the table empty.
    const bills = db.getFirstSync('SELECT COUNT(*) AS n FROM bills');
    if (!bills || bills.n === 0) {
      for (const [name, category, icon] of SEED_BILLS) {
        db.runSync('INSERT INTO bills (name, category, icon) VALUES (?, ?, ?)', [name, category, icon]);
      }
    }
  }

  const first = db.getFirstSync('SELECT id FROM users ORDER BY id ASC LIMIT 1');
  return first ? first.id : null;
}

/** Spec name for `initDatabase()` — same lifecycle, same return value. */
export function initDB() {
  return initDatabase();
}

/** Every user (used by Splash to decide whether a session exists). */
export function listUsers() {
  return db.getAllSync('SELECT * FROM users ORDER BY id ASC');
}

/** The signed-in profile — the single seeded demo account. */
export function getCurrentUser() {
  return db.getFirstSync('SELECT * FROM users ORDER BY id ASC LIMIT 1');
}

/** CLO 2.4/2.5 — parameterised credential lookup, never string-built. */
export function findUserByCredentials(mobileNumber, pin) {
  return db.getFirstSync('SELECT * FROM users WHERE mobileNumber = ? AND pin = ?', [
    mobileNumber,
    pin,
  ]);
}

export function getUserById(id) {
  return db.getFirstSync('SELECT * FROM users WHERE id = ?', [id]);
}

export function getAccount(userId) {
  return db.getFirstSync('SELECT * FROM accounts WHERE userId = ?', [userId]);
}

/** The primary (first) card — the shape the existing Card screen renders. */
export function getCard(userId) {
  return db.getFirstSync('SELECT * FROM cards WHERE userId = ? ORDER BY id ASC LIMIT 1', [userId]);
}

/** Every card (Virtual + Physical) for the two-tab Card screen. */
export function getCards(userId) {
  return db.getAllSync('SELECT * FROM cards WHERE userId = ? ORDER BY id ASC', [userId]);
}

/** Spec name — all goals for a user, oldest first. */
export function getSavingsGoals(userId) {
  return db.getAllSync('SELECT * FROM savings_goals WHERE userId = ? ORDER BY id ASC', [userId]);
}

/** Back-compat alias for `getSavingsGoals`. */
export function getGoals(userId) {
  return getSavingsGoals(userId);
}

/**
 * CLO 2.5 — the recent/filtered transaction list.
 *
 * With a `search` term the filter runs in SQL via `LIKE ?`; with a `category` it
 * filters on `category = ?`; both can combine. Nothing is filtered in JS.
 */
export function getTransactions(userId, search = '', category = '') {
  const term = String(search ?? '').trim();
  const cat = String(category ?? '').trim();

  if (term && cat) {
    const like = `%${term}%`;
    return db.getAllSync(
      `SELECT * FROM transactions
       WHERE userId = ? AND category = ?
         AND (recipientName LIKE ? OR type LIKE ? OR purpose LIKE ?)
       ORDER BY id DESC`,
      [userId, cat, like, like, like],
    );
  }
  if (cat) {
    return db.getAllSync(
      'SELECT * FROM transactions WHERE userId = ? AND category = ? ORDER BY id DESC',
      [userId, cat],
    );
  }
  if (term) {
    const like = `%${term}%`;
    return db.getAllSync(
      `SELECT * FROM transactions
       WHERE userId = ? AND (recipientName LIKE ? OR type LIKE ? OR purpose LIKE ?)
       ORDER BY id DESC`,
      [userId, like, like, like],
    );
  }
  return db.getAllSync('SELECT * FROM transactions WHERE userId = ? ORDER BY id DESC', [userId]);
}

/** Newest-first slice for the Home / Card "Recent" lists. */
export function getRecentTransactions(userId, limit) {
  if (limit) {
    return db.getAllSync(
      'SELECT * FROM transactions WHERE userId = ? ORDER BY id DESC LIMIT ?',
      [userId, limit],
    );
  }
  return getTransactions(userId);
}

/** CLO 2.5 — SQL LIKE search across recipient, type and purpose. */
export function searchTransactions(userId, term) {
  return getTransactions(userId, term);
}

/** Debit types that should reduce the wallet balance. */
const DEBIT_TYPES = ['send', 'pay', 'load', 'bank_transfer', 'bills', 'transfer', 'withdrawal'];
/** Credit types that should increase the wallet balance. */
const CREDIT_TYPES = ['receive', 'deposit', 'topup'];

/**
 * CLO 2.4 — record a transaction and move money in one parameterised helper.
 *
 * The amount is stored with the caller's sign (expenses negative so the UI can
 * render them as spend); the wallet movement always uses the absolute value, so
 * the SQL stays exactly `balance = balance - ?` / `balance = balance + ?`.
 * Returns the generated reference number.
 */
export function recordTransaction(userId, t) {
  const ref = t.referenceNo || `FILPAY${Date.now()}`;
  const amount = Number(t.amount) || 0;

  db.runSync(
    `INSERT INTO transactions
      (userId, type, category, recipientName, recipientImage, recipientAccount,
       amount, purpose, timestamp, status, referenceNo, bankName, transferType)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId, t.type ?? 'transfer', t.category ?? '', t.recipientName ?? '',
      t.recipientImage ?? null, t.recipientAccount ?? '', amount, t.purpose ?? '',
      t.timestamp ?? new Date().toISOString(), t.status ?? 'completed', ref,
      t.bankName ?? '', t.transferType ?? '',
    ],
  );

  const abs = Math.abs(amount);
  if (DEBIT_TYPES.includes(t.type)) {
    db.runSync('UPDATE accounts SET balance = balance - ? WHERE userId = ?', [abs, userId]);
  } else if (CREDIT_TYPES.includes(t.type)) {
    db.runSync('UPDATE accounts SET balance = balance + ? WHERE userId = ?', [abs, userId]);
  }
  return ref;
}

/**
 * CLO 2.4 — record a transaction and debit the wallet (legacy signature).
 *
 * `amount` keeps whatever sign the caller wants stored (expenses negative); the
 * debit itself always uses the absolute value. `category` is optional.
 */
export function addTransaction(userId, type, recipientName, amount, purpose, category = '') {
  db.runSync(
    `INSERT INTO transactions (userId, type, category, recipientName, amount, purpose, timestamp, status)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 'completed')`,
    [userId, type, category, recipientName, amount, purpose],
  );
  db.runSync('UPDATE accounts SET balance = balance - ? WHERE userId = ?', [
    Math.abs(Number(amount) || 0),
    userId,
  ]);
}

/**
 * CLO 2.4 — delete a transaction row and refund the wallet when it was a debit.
 * `type` decides the refund direction; the amount is refunded as its absolute value.
 */
export function deleteTransaction(id, userId, amount, type) {
  db.runSync('DELETE FROM transactions WHERE id = ? AND userId = ?', [id, userId]);
  const abs = Math.abs(Number(amount) || 0);
  if (DEBIT_TYPES.includes(type)) {
    db.runSync('UPDATE accounts SET balance = balance + ? WHERE userId = ?', [abs, userId]);
  } else if (CREDIT_TYPES.includes(type)) {
    db.runSync('UPDATE accounts SET balance = balance - ? WHERE userId = ?', [abs, userId]);
  }
}

/** CLO 2.4 — flip the frozen flag on a card row by its own id. Returns the new state. */
export function toggleFreezeCard(cardId, currentStatus) {
  const next = currentStatus ? 0 : 1;
  db.runSync('UPDATE cards SET isFrozen = ? WHERE id = ?', [next, cardId]);
  return next;
}

/** CLO 2.4 — flip the hidden flag on a card row by its own id. Returns the new state. */
export function toggleHideCard(cardId, currentStatus) {
  const next = currentStatus ? 0 : 1;
  db.runSync('UPDATE cards SET isHidden = ? WHERE id = ?', [next, cardId]);
  return next;
}

/** All saved recipients for a user, oldest first. */
export function getRecipients(userId) {
  return db.getAllSync('SELECT * FROM recipients WHERE userId = ? ORDER BY id ASC', [userId]);
}

export function addRecipient(userId, name, accountNumber, bankName, type) {
  db.runSync(
    'INSERT INTO recipients (userId, name, accountNumber, bankName, type) VALUES (?, ?, ?, ?, ?)',
    [userId, name, accountNumber, bankName, type],
  );
}

export function updateRecipientImage(id, uri) {
  db.runSync('UPDATE recipients SET image = ? WHERE id = ?', [uri, id]);
}

export function getVouchers(userId) {
  return db.getAllSync('SELECT * FROM vouchers WHERE userId = ? ORDER BY id ASC', [userId]);
}

export function claimVoucher(id) {
  db.runSync('UPDATE vouchers SET isClaimed = 1 WHERE id = ?', [id]);
}

export function useVoucher(id) {
  db.runSync('UPDATE vouchers SET isUsed = 1 WHERE id = ?', [id]);
}

/** Reference data — no user filter. */
export function getBillers() {
  return db.getAllSync('SELECT * FROM bills ORDER BY id ASC');
}

export function getStatements(userId) {
  return db.getAllSync(
    'SELECT * FROM statements WHERE userId = ? ORDER BY year DESC, month DESC',
    [userId],
  );
}

export function updateProfileImage(userId, uri) {
  db.runSync('UPDATE users SET profileImage = ? WHERE id = ?', [uri, userId]);
}

export function setBiometricEnabled(userId, enabled) {
  db.runSync('UPDATE users SET isBiometricEnabled = ? WHERE id = ?', [enabled ? 1 : 0, userId]);
}

export function setPin(userId, pin) {
  db.runSync('UPDATE users SET pin = ? WHERE id = ?', [pin, userId]);
}

export function updateUserProfile(userId, fullName, email) {
  db.runSync('UPDATE users SET fullName = ?, email = ? WHERE id = ?', [fullName, email, userId]);
}

export default {
  db,
  initDB,
  initDatabase,
  listUsers,
  getCurrentUser,
  findUserByCredentials,
  getUserById,
  getAccount,
  getCard,
  getCards,
  getSavingsGoals,
  getGoals,
  getTransactions,
  getRecentTransactions,
  searchTransactions,
  recordTransaction,
  addTransaction,
  deleteTransaction,
  toggleFreezeCard,
  toggleHideCard,
  getRecipients,
  addRecipient,
  updateRecipientImage,
  getVouchers,
  claimVoucher,
  useVoucher,
  getBillers,
  getStatements,
  updateProfileImage,
  setBiometricEnabled,
  setPin,
  updateUserProfile,
};
