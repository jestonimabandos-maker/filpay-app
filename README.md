# FilPay

A functional banking app built with **Expo SDK 57**, **React Native 0.86** and **Expo Router**, matching the Figma prototype `CEZTLAzKxhQ1Z80K4r9I9E` ("FilPay - Android App (8 Screens)", 360x800).

## Run it

```bash
npm install
npx expo start --port 8081 --tunnel   # scan the QR with Expo Go
```

Useful checks:

```bash
npx tsc --noEmit    # typecheck
npx expo lint       # lint
npx expo-doctor     # dependency health
```

Sign in with **any 4-digit PIN**.

## Architecture

```
src/
├─ app/                  # Expo Router — every file is a screen
│  ├─ _layout.tsx        # fonts, providers, auth guard
│  ├─ index.tsx          # Splash
│  ├─ login.tsx          # Login
│  ├─ (tabs)/            # the 4 bottom-nav tabs
│  ├─ send-money.tsx     # pushed screens
│  ├─ receive-money.tsx
│  ├─ pay-bills.tsx
│  ├─ scan-pay.tsx
│  ├─ transactions.tsx
│  ├─ notifications.tsx
│  ├─ help.tsx
│  └─ account.tsx
├─ components/
│  ├─ AppHeader.tsx      # shared teal header block (r28)
│  ├─ BottomNav.tsx      # custom 84px tab bar
│  └─ PhoneStatusBar.tsx # device status bar
├─ lib/ui.ts             # tx metadata, billers, contacts, validators
├─ store.tsx             # all state + persistence
└─ theme.ts              # design tokens
```

### State

`src/store.tsx` is a single context holding every balance, list and setting. It exposes
**intent methods** (`sendMoney`, `payBills`, `topUp`, `payScan`, `depositToGoal`,
`withdrawFromGoal`) rather than raw setters, so each one validates the balance, writes the
ledger entry, files a notification and returns `{ ok, message }` for the UI to show.

Everything is persisted to `AsyncStorage` under `filpay:state:v1` on a 250 ms debounce, and
rehydrated on launch. `resetAll()` restores the seed data.

### Auth

`_layout.tsx` guards every route except `/` and `/login`. If `authed` is false the router
redirects to the login screen, so deep links into the app cannot bypass sign-in.

## Screens

| Prototype frame | Route | Key behaviours |
|---|---|---|
| 1:2 Splash | `/` | auto-advance, skips to app if already signed in |
| 1:19 Login | `/login` | phone + PIN validation, biometric shortcut, forgot-PIN flow |
| 1:55 Home | `/(tabs)` | balance hide/show, notification badge, 4 actions, tx detail |
| 1:125 Send Money | `/send-money` | contacts, purposes, quick amounts, balance guard, review |
| 1:161 Scan & Pay | `/scan-pay` | live `expo-camera` viewfinder, permission flow, manual fallback |
| 1:229 Savings | `/(tabs)` | live chart, goal deposit/withdraw, goal detail |
| 1:290 FilPay Card | `/(tabs)` | freeze/unfreeze, reveal number & CVV, limits, activity detail |
| 1:357 Profile | `/(tabs)` | edit profile, settings, language, PIN, logout, reset |

Supporting screens in the same design language: **Receive Money** (QR), **Pay Bills**
(biller catalogue), **Transactions** (filterable ledger), **Notifications**, **Help**,
**Account**.

## Native build

```bash
npx eas-cli build --profile development   # installable dev build
npx eas-cli build                         # store build
npx eas-cli update                        # OTA update
```

App identity: `com.filpay.app` (see `app.json`). The camera permission string is provided by
the `expo-camera` config plugin.
