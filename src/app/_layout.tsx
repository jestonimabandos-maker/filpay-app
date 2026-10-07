import { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { FilPayProvider, useFilPay } from '@/store';
import { initDatabase } from '@/services/db';
import NotificationToast from '@/components/NotificationToast';
import { C } from '@/theme';

/** Routes reachable before the user signs in. Everything else needs `authed`. */
const PUBLIC_PATHS = ['/', '/login'];

/**
 * There is no App.js in an Expo Router project — this root layout is the app
 * entry, so the database lifecycle hook lives here. `initDatabase()` enables
 * WAL (CLO 2.2), creates the five tables and seeds them once (CLO 2.3).
 * It is idempotent, so the store calling it during hydration is harmless.
 */
function useDatabase() {
  useEffect(() => {
    initDatabase();
  }, []);
}

function Guards({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { authed, hydrated } = useFilPay();
  const isPublic = PUBLIC_PATHS.includes(pathname ?? '/');

  useEffect(() => {
    if (!hydrated) return;
    if (!isPublic && !authed) {
      router.replace('/login');
    }
  }, [hydrated, authed, isPublic, pathname, router]);

  return <>{children}</>;
}

function ThemedApp() {
  const { theme } = useFilPay();
  const dark = theme === 'dark';

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Guards>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            animationDuration: 260,
            gestureEnabled: true,
            contentStyle: { backgroundColor: C.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="send-money" />
          <Stack.Screen name="receive-money" />
          <Stack.Screen name="pay-bills" />
          <Stack.Screen name="buy-load" />
          <Stack.Screen name="scan-pay" />
          <Stack.Screen name="vouchers" />
          <Stack.Screen name="transactions" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="help" />
          <Stack.Screen name="account" />
        </Stack>
        <NotificationToast />
      </Guards>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default function RootLayout() {
  useDatabase();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <FilPayProvider>
      <ThemedApp />
    </FilPayProvider>
  );
}
