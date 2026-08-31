import React, { useEffect, useState, useMemo } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemeProvider, useThemeColors, typography, spacing, getResolvedTheme } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { bootstrapI18n } from '@/i18n';
import { Text } from 'react-native';

/**
 * InnerRoot — renders AFTER i18n bootstrap and INSIDE ThemeProvider.
 * Separated so useThemeColors() hook works and StatusBar/header colors
 * react to theme changes at runtime (no static dark palette baked in).
 */
function InnerRoot() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const themeSetting = useAppStore((s) => s.settings.theme);

  // StatusBar style flips with the resolved theme.
  const resolvedTheme = useMemo(() => getResolvedTheme(themeSetting), [themeSetting]);

  const screenOptions = useMemo(() => ({
    headerStyle: { backgroundColor: colors.bg },
    headerTintColor: colors.textPrimary,
    headerTitleStyle: { fontWeight: '800' as const, fontSize: 17 },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.bg },
  }), [colors.bg, colors.textPrimary]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={screenOptions}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="exercise/[id]"
            options={{
              headerTitle: t('exercise.overview') + ' ·',
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="workout/start"
            options={{
              headerTitle: t('workout.titleActive'),
              headerStyle: { backgroundColor: colors.surface },
              headerLeft: () => null,
              gestureEnabled: false,
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * BootScreen — shown while i18n is loading, uses useThemeColors() so it
 * respects the current theme (static initial color from ThemeProvider).
 */
function BootScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    bootScreen: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
    },
    bootBrand: {
      ...typography.display,
      color: colors.primary,
      letterSpacing: 3,
      fontSize: 18,
      textAlign: 'center',
      opacity: 0.9,
    },
  }), [colors]);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={styles.bootScreen}>
          <Text style={styles.bootBrand}>CHOYEON · EXERCISES</Text>
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Root layout.  Three responsibilities:
 *  1. Kick off i18n bootstrap BEFORE any screen renders, so the first paint
 *     is in the correct locale (no "Chinese flash" for English users).
 *  2. Wrap everything in ThemeProvider so useThemeColors() works everywhere
 *     and StatusBar/header colors flip with light/dark setting.
 */
export default function RootLayout() {
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let alive = true;
    bootstrapI18n()
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[i18n] bootstrap failed, falling back to default locale', err);
      })
      .finally(() => {
        if (alive) setBootstrapped(true);
      });
    return () => { alive = false; };
  }, []);

  return (
    <ThemeProvider>
      {bootstrapped ? <InnerRoot /> : <BootScreen />}
    </ThemeProvider>
  );
}

// ============================================================
// End of file (all styles moved into components via useMemo + useThemeColors)
// ============================================================
