import { StyleSheet, Dimensions, Platform, Appearance } from 'react-native';
import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { AppSettings } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// DARK palette — original industrial gym aesthetic.  Steel slabs, neon lime
// CTA, rust accent for "active / hot" states.  No pastel gradients, no soft
// glassmorphism, no playful rounded corners.
// ============================================================================

export type Colors = {
  bg: string;
  surface: string;
  surfaceElevated: string;
  surfaceBorder: string;
  surfaceDivider: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  primary: string;
  primaryHover: string;
  primaryDim: string;
  primaryStroke: string;
  accent: string;
  accentDim: string;
  accentStroke: string;
  info: string;
  infoDim: string;
  success: string;
  warning: string;
  danger: string;
  muscle: {
    back: string;
    cardio: string;
    chest: string;
    'lower arms': string;
    'lower legs': string;
    neck: string;
    shoulders: string;
    'upper arms': string;
    'upper legs': string;
    waist: string;
  };
};

export const darkColors: Colors = {
  bg: '#07090C',
  surface: '#0F1319',
  surfaceElevated: '#171D28',
  surfaceBorder: '#252C3B',
  surfaceDivider: '#1A202D',
  textPrimary: '#EEF1F6',
  textSecondary: '#8A92A6',
  textTertiary: '#515A6E',
  textInverse: '#07090C',
  primary: '#BFF23D',
  primaryHover: '#CFF76A',
  primaryDim: 'rgba(191, 242, 61, 0.14)',
  primaryStroke: 'rgba(191, 242, 61, 0.35)',
  accent: '#FF6A3D',
  accentDim: 'rgba(255, 106, 61, 0.14)',
  accentStroke: 'rgba(255, 106, 61, 0.35)',
  info: '#48C6FF',
  infoDim: 'rgba(72, 198, 255, 0.12)',
  success: '#3BD17C',
  warning: '#F5B543',
  danger: '#EF4545',
  muscle: {
    back: '#FF6A3D',
    cardio: '#48C6FF',
    chest: '#BFF23D',
    'lower arms': '#F5B543',
    'lower legs': '#C061FF',
    neck: '#F272AC',
    shoulders: '#34D399',
    'upper arms': '#FB923C',
    'upper legs': '#5D9CFF',
    waist: '#A78BFA',
  },
} as Colors;

// ============================================================================
// LIGHT palette — same accent family so the app keeps its gym identity.
// Backgrounds inverted to off-white/white, borders softened, high contrast
// for readability on light hardware.
// ============================================================================

export const lightColors: Colors = {
  bg: '#F4F6F9',
  surface: '#FFFFFF',
  surfaceElevated: '#EEF1F5',
  surfaceBorder: '#D9DEE6',
  surfaceDivider: '#E7EBF1',
  textPrimary: '#101418',
  textSecondary: '#586172',
  textTertiary: '#919AA9',
  textInverse: '#FFFFFF',
  primary: '#8AC01A',
  primaryHover: '#7AAA15',
  primaryDim: 'rgba(138, 192, 26, 0.14)',
  primaryStroke: 'rgba(138, 192, 26, 0.35)',
  accent: '#E54C20',
  accentDim: 'rgba(229, 76, 32, 0.12)',
  accentStroke: 'rgba(229, 76, 32, 0.32)',
  info: '#2E9EDD',
  infoDim: 'rgba(46, 158, 221, 0.12)',
  success: '#169A54',
  warning: '#D89A1C',
  danger: '#D43030',
  muscle: {
    back: '#D64A1C',
    cardio: '#2E9EDD',
    chest: '#8AC01A',
    'lower arms': '#C4830F',
    'lower legs': '#9447D2',
    neck: '#D85092',
    shoulders: '#168B5B',
    'upper arms': '#D06D20',
    'upper legs': '#3F75C2',
    waist: '#7B63CB',
  },
} as Colors;

// ============================================================================
// Backwards-compatible default — keeps `import { colors } from '@/theme'`
// working in modules that still need the static dark palette for non-render
// contexts (e.g., default values).  Render components MUST use
// `useThemeColors()` so they react to setting/theme changes.
// ============================================================================
export const colors = darkColors;

// ============================================================================
// Theme resolution
// ============================================================================

function normalizeScheme(
  scheme: string | null | undefined
): 'light' | 'dark' | null {
  if (scheme === 'light' || scheme === 'dark') return scheme;
  return null;
}

function resolveFromSetting(
  theme: AppSettings['theme'],
  systemScheme: 'light' | 'dark' | null
): Colors {
  if (theme === 'light') return lightColors;
  if (theme === 'dark') return darkColors;
  return systemScheme === 'light' ? lightColors : darkColors;
}

export function getResolvedTheme(theme: AppSettings['theme']): 'dark' | 'light' {
  if (theme === 'light') return 'light';
  if (theme === 'dark') return 'dark';
  const scheme = Appearance.getColorScheme();
  return scheme === 'light' ? 'light' : 'dark';
}

// ============================================================================
// React Context + Hook
// ============================================================================

const ThemeCtx = createContext<Colors>(darkColors);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useAppStore((s) => s.settings.theme);
  const [resolved, setResolved] = useState<Colors>(() => {
    const scheme = normalizeScheme(Appearance.getColorScheme());
    return resolveFromSetting(theme, scheme);
  });

  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      setResolved(resolveFromSetting(theme, normalizeScheme(colorScheme)));
    });
    // Also resolve immediately when the user's `theme` preference changes
    // (e.g. they toggle from "dark" to "system").
    setResolved(resolveFromSetting(theme, normalizeScheme(Appearance.getColorScheme())));
    return () => listener.remove();
  }, [theme]);

  return <ThemeCtx.Provider value={resolved}>{children}</ThemeCtx.Provider>;
}

export function useThemeColors(): Colors {
  return useContext(ThemeCtx);
}

// ============================================================================
// Shared tokens — NOT theme-dependent.  These stay as plain constants because
// typography/spacing/radius/layout rarely change between themes.
// ============================================================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
  xxxxl: 56,
} as const;

export const typography = {
  display: {
    fontSize: 36,
    fontWeight: '900' as const,
    letterSpacing: -1.2,
    lineHeight: 40,
  },
  h1: {
    fontSize: 28,
    fontWeight: '900' as const,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  h2: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  h3: {
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    fontWeight: '500' as const,
    letterSpacing: -0.1,
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '800' as const,
    letterSpacing: -0.1,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  captionBold: {
    fontSize: 13,
    fontWeight: '800' as const,
    lineHeight: 18,
  },
  small: {
    fontSize: 11,
    fontWeight: '800' as const,
    lineHeight: 14,
    letterSpacing: 0.6,
  },
  mono: {
    fontSize: 16,
    fontWeight: '800' as const,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

export const shadows = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.28, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.38, shadowRadius: 10, elevation: 5 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.48, shadowRadius: 20, elevation: 10 },
} as const;

export const layout = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  maxContentWidth: 720,
  tabBarHeight: Platform.OS === 'ios' ? 88 : 70,
  statusBarInset: Platform.OS === 'ios' ? 44 : 0,
  safeBottom: Platform.OS === 'ios' ? 34 : 0,
  paddingHorizontal: spacing.lg,
} as const;

// ============================================================================
// Convenience: default dark global styles.  Render components should recreate
// these with useMemo when using useThemeColors().  Kept here for legacy.
// ============================================================================
export function createGlobalStyles(c: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    screenContent: {
      paddingHorizontal: layout.paddingHorizontal,
      paddingBottom: layout.tabBarHeight + spacing.lg,
    },
    surfaceCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    row: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    column: { flexDirection: 'column' },
    center: { alignItems: 'center', justifyContent: 'center' },
    divider: {
      height: 1,
      backgroundColor: c.surfaceDivider,
      marginVertical: spacing.md,
    },
    spacer: { height: spacing.lg },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      backgroundColor: c.surface,
    },
    chipSelected: {
      backgroundColor: c.primaryDim,
      borderColor: c.primary,
    },
    primaryButton: {
      backgroundColor: c.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: { color: c.textInverse, ...typography.bodyBold },
    ghostButton: {
      backgroundColor: 'transparent',
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    textPrimary: { color: c.textPrimary },
    textSecondary: { color: c.textSecondary },
    textAccent: { color: c.primary },
    flex1: { flex: 1 },
  });
}

export const globalStyles = createGlobalStyles(darkColors);
