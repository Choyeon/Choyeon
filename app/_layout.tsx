import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, typography } from '@/theme';
import { bootstrapI18n } from '@/i18n';
import { Text } from 'react-native';

/**
 * Root layout.  Two responsibilities:
 *  1. Kick off i18n bootstrap BEFORE any screen renders, so the first paint
 *     is in the correct locale (no "Chinese flash" for English users).
 *  2. Render the top-level Stack with translated screen titles so the nav
 *     chrome updates reactively when the user flips language in settings.
 */
export default function RootLayout() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    let alive = true;
    bootstrapI18n()
      .catch((err) => {
        // Never swallow bootstrap failures silently — at least leave a trail
        // so users reporting "language not applied" can be diagnosed.
        // eslint-disable-next-line no-console
        console.error('[i18n] bootstrap failed, falling back to default locale', err);
      })
      .finally(() => {
        if (alive) setBootstrapped(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!bootstrapped) {
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
        <StatusBar style="light" />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.bg,
            },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: {
              fontWeight: '800',
              fontSize: 17,
            },
            headerShadowVisible: false,
            contentStyle: {
              backgroundColor: colors.bg,
            },
          }}
        >
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

const styles = StyleSheet.create({
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
});
