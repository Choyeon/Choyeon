import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// CHOSICAL DARK THEME
// Industrial dark gym aesthetic.  Steel slabs, neon lime CTA, rust accent for
// "active / hot" states.  No pastel gradients, no soft glassmorphism, no
// playful rounded corners.  Everything reads as if it belongs in a rack room.
// ============================================================================

export const colors = {
  // 4 physical depths.  Each layer is visibly darker/heavier than the one
  // in front.  There is NO soft "elevated but same tone" trickery.
  bg: '#07090C',
  surface: '#0F1319',
  surfaceElevated: '#171D28',
  surfaceBorder: '#252C3B',
  surfaceDivider: '#1A202D',

  // Text hierarchy is aggressive: tertiary text is deliberately hard to read
  // so it only gets read if the user explicitly hunts for it.
  textPrimary: '#EEF1F6',
  textSecondary: '#8A92A6',
  textTertiary: '#515A6E',
  textInverse: '#07090C',

  // Electric lime CTA.  Matte finish, not neon.  Used sparingly.
  primary: '#BFF23D',
  primaryHover: '#CFF76A',
  primaryDim: 'rgba(191, 242, 61, 0.14)',
  primaryStroke: 'rgba(191, 242, 61, 0.35)',

  // Rust / safety-orange accent.  Exclusively used for "in progress",
  // rest timer, destructive-soft states.  Never applied to primary actions.
  accent: '#FF6A3D',
  accentDim: 'rgba(255, 106, 61, 0.14)',
  accentStroke: 'rgba(255, 106, 61, 0.35)',

  // Ice blue for cardio / informational rows.
  info: '#48C6FF',
  infoDim: 'rgba(72, 198, 255, 0.12)',

  success: '#3BD17C',
  warning: '#F5B543',
  danger: '#EF4545',

  // Muscle swatches.  One color per region.  Deterministic, not generated.
  // These drive chip tints, card accent bars, and detail badges.
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
} as const;

// 4px base grid.  Every spacing number is a multiple of `xs`.
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

// Editorial weight contrast.  Display headlines use extreme 900 weights and
// tight letter-spacing so they read like stamped product labels, not AI
// landing page copy.  Numbers get tabular treatment everywhere.
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

// Radius rules: cards max out at `lg` (14).  Pill ONLY for chips and CTA pills.
// No roundness on list rows or table cells.
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

// Android uses elevation.  iOS gets contact shadows — no "glow" effects.
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.48,
    shadowRadius: 20,
    elevation: 10,
  },
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

export const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screenContent: {
    paddingHorizontal: layout.paddingHorizontal,
    paddingBottom: layout.tabBarHeight + spacing.lg,
  },
  // Standard slab card.  One border.  One radius.  Zero adornments.
  surfaceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  column: { flexDirection: 'column' },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Visible 1px divider.  Not a hairline.  It carries meaning.
  divider: {
    height: 1,
    backgroundColor: colors.surfaceDivider,
    marginVertical: spacing.md,
  },
  spacer: { height: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.textInverse,
    ...typography.bodyBold,
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  textPrimary: { color: colors.textPrimary },
  textSecondary: { color: colors.textSecondary },
  textAccent: { color: colors.primary },
  flex1: { flex: 1 },
});
