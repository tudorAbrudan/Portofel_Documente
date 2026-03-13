import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import 'react-native-reanimated';

import AppLockScreen from '@/components/AppLockScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { AppLightTheme, AppDarkTheme } from '@/constants/Theme';
import { useAppLock } from '@/hooks/useAppLock';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const appLock = useAppLock();
  const notifListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    notifListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (typeof data?.url === 'string') {
        Linking.openURL(data.url);
      }
    });
    return () => { notifListener.current?.remove(); };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? AppDarkTheme : AppLightTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      {appLock.locked && (
        <AppLockScreen
          biometricAvailable={appLock.biometricAvailable}
          onUnlockBiometric={appLock.unlockWithBiometric}
          onUnlockPin={appLock.unlockWithPin}
        />
      )}
    </ThemeProvider>
  );
}
