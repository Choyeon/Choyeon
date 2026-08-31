import React, { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors, spacing, layout } from '@/theme';
import { Icon } from '@/components/UIKit';

type TabName = 'index' | 'library' | 'workout' | 'profile';

function TabBarIcon({
  name,
  focused,
  color,
}: {
  name: string;
  focused: boolean;
  color: string;
}) {
  return (
    <View style={styles.iconWrap}>
      <Icon name={name} size={22} color={color} />
      {focused ? <View style={[styles.focusPill, { backgroundColor: color }]} /> : null}
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const TAB_ICON_BASE = useMemo<Record<TabName, { icon: string; activeIcon: string; accent: string }>>(() => ({
    index: {
      icon: 'home-outline',
      activeIcon: 'home',
      accent: colors.primary,
    },
    library: {
      icon: 'book-open-variant',
      activeIcon: 'book-open-variant',
      accent: colors.info,
    },
    workout: {
      icon: 'clipboard-outline',
      activeIcon: 'clipboard-play-outline',
      accent: colors.accent,
    },
    profile: {
      icon: 'account-outline',
      activeIcon: 'account',
      accent: colors.muscle.shoulders,
    },
  }), [colors]);

  const labels = useMemo(
    () => ({
      index: t('tabs.home'),
      library: t('tabs.library'),
      workout: t('tabs.workout'),
      profile: t('tabs.profile'),
    }),
    [t]
  );

  const screenOptions = useMemo(() => ({
    headerShown: false,
    tabBarShowLabel: true,
    tabBarActiveTintColor: colors.primary as any,
    tabBarInactiveTintColor: colors.textTertiary as any,
    tabBarLabelStyle: styles.label,
    tabBarStyle: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: layout.tabBarHeight,
      paddingTop: spacing.xs,
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.surface + 'F2',
      borderTopWidth: 1,
      borderTopColor: colors.surfaceDivider,
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
    },
    tabBarItemStyle: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
  }), [colors]);

  return (
    <Tabs
      screenOptions={screenOptions}
      backBehavior="history"
    >
      <Tabs.Screen
        name="index"
        options={{
          title: labels.index,
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name={focused ? TAB_ICON_BASE.index.activeIcon : TAB_ICON_BASE.index.icon}
              focused={focused}
              color={String(focused ? TAB_ICON_BASE.index.accent : color)}
            />
          ),
          tabBarActiveTintColor: TAB_ICON_BASE.index.accent as any,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: labels.library,
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name={TAB_ICON_BASE.library.icon}
              focused={focused}
              color={String(focused ? TAB_ICON_BASE.library.accent : color)}
            />
          ),
          tabBarActiveTintColor: TAB_ICON_BASE.library.accent as any,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: labels.workout,
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name={focused ? TAB_ICON_BASE.workout.activeIcon : TAB_ICON_BASE.workout.icon}
              focused={focused}
              color={String(focused ? TAB_ICON_BASE.workout.accent : color)}
            />
          ),
          tabBarActiveTintColor: TAB_ICON_BASE.workout.accent as any,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: labels.profile,
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name={focused ? TAB_ICON_BASE.profile.activeIcon : TAB_ICON_BASE.profile.icon}
              focused={focused}
              color={String(focused ? TAB_ICON_BASE.profile.accent : color)}
            />
          ),
          tabBarActiveTintColor: TAB_ICON_BASE.profile.accent as any,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 0,
  },
  iconWrap: {
    position: 'relative',
    width: 38,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusPill: {
    position: 'absolute',
    bottom: 0,
    width: 18,
    height: 3,
    borderRadius: 3,
    opacity: 0.9,
  },
});
