import React, { memo, forwardRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  PressableProps,
  StyleSheet,
  TextInput,
  ViewStyle,
  StyleProp,
  Modal,
  ScrollView,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from 'react-native-reanimated';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useThemeColors, typography, spacing, radius, layout } from '@/theme';

// ==========================================================================
// Icon — single gateway for MaterialCommunityIcons.  Everything goes through
// here so icon library swaps or default size adjustments touch ONE place.
// ==========================================================================

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export const Icon = memo(function Icon({
  name,
  size = 18,
  color,
  style,
}: IconProps) {
  return (
    <MaterialCommunityIcons
      name={name as any}
      size={size}
      color={color}
      style={style}
    />
  );
});

// ==========================================================================
// PressableScale — consistent press feedback everywhere.
// 96% target scale, tight spring, zero overshoot so the "industrial slab"
// feeling stays intact rather than a bouncy AI mockup.
// ==========================================================================

const SPRING_CFG: WithSpringConfig = {
  mass: 0.55,
  stiffness: 420,
  damping: 24,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children?: React.ReactNode;
}

export const PressableScale = memo(
  forwardRef<View, PressableScaleProps>(function PressableScale(
    { style, scaleTo = 0.965, children, onPressIn, onPressOut, ...rest },
    ref
  ) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));
    const handlePressIn = (e: any) => {
      scale.value = withSpring(scaleTo, SPRING_CFG);
      onPressIn?.(e);
    };
    const handlePressOut = (e: any) => {
      scale.value = withSpring(1, SPRING_CFG);
      onPressOut?.(e);
    };
    return (
      <AnimatedPressable
        ref={ref as any}
        style={[animatedStyle, style as any]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...rest}
      >
        {children}
      </AnimatedPressable>
    );
  })
);

// ==========================================================================
// SectionHeader — stamped, machined section lead.
// Left: 3px vertical accent rule.  Icon (never emoji).  Bold h3 label.
// Never: pastel background, radial gradient, or rounded rule.
// ==========================================================================

export interface SectionHeaderProps {
  title: string;
  icon?: string;
  inline?: boolean;
  accent?: string;
  note?: string; // one-line category/action hint rendered under title
}

export function SectionHeader({
  title,
  icon,
  inline = false,
  accent,
  note,
}: SectionHeaderProps) {
  const colors = useThemeColors();
  const resolvedAccent = accent ?? colors.primary;
  const styles = useMemo(() => StyleSheet.create({
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.md,
      paddingTop: 2,
    },
    sectionHeaderInline: {
      marginBottom: 0,
      flex: 1,
    },
    rule: {
      width: 3,
      height: 16,
      borderRadius: 2,
      marginTop: 2,
    },
    iconTray: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    sectionNote: {
      ...typography.caption,
      color: colors.textTertiary,
      marginTop: 2,
      lineHeight: 16,
    },
  }), [colors]);

  return (
    <View
      style={[
        styles.sectionHeader,
        inline && styles.sectionHeaderInline,
      ]}
    >
      <View style={[styles.rule, { backgroundColor: resolvedAccent }]} />
      {icon ? (
        <View style={[styles.iconTray, { backgroundColor: resolvedAccent + '18' }]}>
          <Icon name={icon} size={14} color={resolvedAccent} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          {title}
        </Text>
        {note ? (
          <Text style={styles.sectionNote} numberOfLines={2}>
            {note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ==========================================================================
// SlabDivider — a heavy 1px divider with a faint left accent notch. Used
// between major sections so the hierarchy reads like folded metal plates.
// ==========================================================================

export function SlabDivider({ accent }: { accent?: string }) {
  const colors = useThemeColors();
  const resolvedAccent = accent ?? colors.primary;
  const slabStyles = useMemo(() => StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 1,
      marginVertical: spacing.md,
    },
    notch: { width: 32, height: 1 },
    line: { flex: 1, height: 1, backgroundColor: colors.surfaceDivider },
  }), [colors]);

  return (
    <View style={slabStyles.wrap}>
      <View style={[slabStyles.notch, { backgroundColor: resolvedAccent }]} />
      <View style={slabStyles.line} />
    </View>
  );
}

// ==========================================================================
// SearchBar — pill, icons for search + clear, no emoji fallbacks.
// ==========================================================================

export interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

function SearchBarImpl({
  value,
  onChange,
  placeholder = '搜索动作、肌肉、器械…',
  onClear,
}: SearchBarProps) {
  const colors = useThemeColors();
  const searchStyles = useMemo(() => StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      height: 48,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      gap: spacing.sm,
    },
    input: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '500',
      letterSpacing: -0.1,
      height: '100%',
      paddingVertical: 0,
    },
    clearBtn: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }), [colors]);

  return (
    <View style={searchStyles.wrap}>
      <Icon
        name="magnify"
        size={20}
        color={colors.textSecondary}
      />
      <TextInput
        value={value}
        onChangeText={onChange}
        style={searchStyles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <PressableScale
          onPress={onClear || (() => onChange(''))}
          style={searchStyles.clearBtn}
          hitSlop={8}
        >
          <Icon
            name="close"
            size={12}
            color={colors.textSecondary}
          />
        </PressableScale>
      )}
    </View>
  );
}

export const SearchBar = memo(SearchBarImpl);

// ==========================================================================
// StatsHero — 3 columns, tabular numbers, left accent top-rule.
// No radial gradients. No blobs. Just a slab with an accent strip.
// ==========================================================================

export interface StatsHeroProps {
  streak: number;
  workouts: number;
  volume: number;
  units?: 'kg' | 'lb';
  // Caller (screen-level) supplies i18n strings.  Keeping them as props
  // means UIKit itself never imports from react-i18next (single-responsibility)
  // and we guarantee these labels flip when language toggles at runtime.
  labelStreak: string;
  labelWorkouts: string;
  labelVolume: string;
  suffixStreak: string;
  suffixWorkouts: string;
  suffixVolume?: string;
}

export function StatsHero({
  streak,
  workouts,
  volume,
  units = 'kg',
  labelStreak,
  labelWorkouts,
  labelVolume,
  suffixStreak,
  suffixWorkouts,
  suffixVolume,
}: StatsHeroProps) {
  const colors = useThemeColors();
  const heroStyles = useMemo(() => StyleSheet.create({
    wrap: {
      marginBottom: spacing.lg,
      borderRadius: radius.xl,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      overflow: 'hidden',
      position: 'relative',
    },
    accentRule: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 56,
      height: 3,
      backgroundColor: colors.primary,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    vSep: {
      width: 1,
      height: 36,
      backgroundColor: colors.surfaceDivider,
    },
    statBlock: {
      alignItems: 'center',
      flex: 1,
      gap: 4,
    },
    iconTray: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    statValue: {
      ...typography.display,
      fontSize: 24,
      color: colors.textPrimary,
      letterSpacing: -0.6,
    },
    statSuffix: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textTertiary,
      letterSpacing: 0,
    },
    statLabel: {
      ...typography.small,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      marginTop: 2,
    },
  }), [colors]);

  return (
    <View style={heroStyles.wrap}>
      <View style={heroStyles.accentRule} />
      <View style={heroStyles.row}>
        <StatBlock
          colors={colors}
          heroStyles={heroStyles}
          label={labelStreak}
          value={streak}
          suffix={suffixStreak}
          icon="fire"
          highlight
        />
        <View style={heroStyles.vSep} />
        <StatBlock
          colors={colors}
          heroStyles={heroStyles}
          label={labelWorkouts}
          value={workouts}
          suffix={suffixWorkouts}
          icon="dumbbell"
        />
        <View style={heroStyles.vSep} />
        <StatBlock
          colors={colors}
          heroStyles={heroStyles}
          label={labelVolume}
          value={formatVolume(volume)}
          suffix={suffixVolume ?? units}
          icon="weight-kilogram"
        />
      </View>
    </View>
  );
}

function formatVolume(v: number): string | number {
  if (v >= 10000) return (v / 1000).toFixed(1) + 'k';
  return Math.round(v);
}

interface StatBlockProps {
  label: string;
  value: number | string;
  suffix: string;
  icon: string;
  highlight?: boolean;
  colors: ReturnType<typeof useThemeColors>;
  heroStyles: any;
}

function StatBlock({ label, value, suffix, icon, highlight, colors, heroStyles }: StatBlockProps) {
  return (
    <View style={heroStyles.statBlock}>
      <View
        style={[
          heroStyles.iconTray,
          highlight && { backgroundColor: colors.primaryDim },
        ]}
      >
        <Icon
          name={icon}
          size={15}
          color={highlight ? colors.primary : colors.textSecondary}
        />
      </View>
      <Text
        style={[
          heroStyles.statValue,
          highlight && { color: colors.primary },
        ]}
      >
        {value}
        <Text style={heroStyles.statSuffix}> {suffix}</Text>
      </Text>
      <Text style={heroStyles.statLabel}>{label}</Text>
    </View>
  );
}

// ==========================================================================
// EmptyState — bold outline icon.  Two lines of copy. No emoji.
// ==========================================================================

export interface EmptyStateProps {
  icon: string;
  title: string;
  desc?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, desc, actionLabel, onAction }: EmptyStateProps) {
  const colors = useThemeColors();
  const emptyStyles = useMemo(() => StyleSheet.create({
    wrap: {
      paddingVertical: spacing.xxxl,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    iconBox: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.h3,
      color: colors.textPrimary,
    },
    desc: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 260,
    },
    actionBtn: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primaryDim,
    },
    actionText: {
      ...typography.captionBold,
      color: colors.primary,
      letterSpacing: 0.2,
    },
  }), [colors]);

  return (
    <View style={emptyStyles.wrap}>
      <View style={emptyStyles.iconBox}>
        <Icon name={icon} size={28} color={colors.textTertiary} />
      </View>
      <Text style={emptyStyles.title}>{title}</Text>
      {desc ? <Text style={emptyStyles.desc}>{desc}</Text> : null}
      {actionLabel && onAction ? (
        <PressableScale onPress={onAction} style={emptyStyles.actionBtn}>
          <Icon name="plus" size={14} color={colors.primary} />
          <Text style={emptyStyles.actionText}>{actionLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

// ==========================================================================
// MiniStat — inline stat, 3-up layout.  Icons only, no emoji.
// ==========================================================================

export interface MiniStatProps {
  label: string;
  value: string;
  unit?: string;
  icon: string;
  iconColor?: string;
}

export function MiniStat({
  label,
  value,
  unit,
  icon,
  iconColor,
}: MiniStatProps) {
  const colors = useThemeColors();
  const resolvedIconColor = iconColor ?? colors.textSecondary;
  const miniStyles = useMemo(() => StyleSheet.create({
    col: { alignItems: 'center', flex: 1, gap: 2 },
    iconTray: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    value: {
      ...typography.display,
      fontSize: 20,
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    unit: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textTertiary,
    },
    label: {
      ...typography.small,
      color: colors.textSecondary,
      marginTop: 2,
    },
  }), [colors]);

  return (
    <View style={miniStyles.col}>
      <View style={[miniStyles.iconTray, { backgroundColor: resolvedIconColor + '15' }]}>
        <Icon name={icon} size={14} color={resolvedIconColor} />
      </View>
      <Text style={miniStyles.value}>
        {value}
        {unit ? <Text style={miniStyles.unit}> {unit}</Text> : null}
      </Text>
      <Text style={miniStyles.label}>{label}</Text>
    </View>
  );
}

// ==========================================================================
// Badge — compact icon + text chip (used in headers, meta rows).
// ==========================================================================

export interface BadgeProps {
  icon: string;
  label: string;
  color?: string;
  size?: 'sm' | 'md';
}

export function Badge({
  icon,
  label,
  color,
  size = 'md',
}: BadgeProps) {
  const colors = useThemeColors();
  const resolvedColor = color ?? colors.primary;
  const small = size === 'sm';
  const badgeStyles = useMemo(() => StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      borderRadius: radius.sm,
      borderWidth: 1,
    },
    wrapSm: {
      paddingHorizontal: spacing.sm - 2,
      paddingVertical: 3,
      borderRadius: radius.sm,
    },
    text: {
      ...typography.small,
      fontWeight: '800',
      letterSpacing: 0.1,
    },
    textSm: {
      fontSize: 10,
    },
  }), []);

  return (
    <View
      style={[
        badgeStyles.wrap,
        small && badgeStyles.wrapSm,
        { backgroundColor: resolvedColor + '16', borderColor: resolvedColor + '38' },
      ]}
    >
      <Icon name={icon} size={small ? 11 : 12} color={resolvedColor} />
      <Text style={[badgeStyles.text, small && badgeStyles.textSm, { color: resolvedColor }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ==========================================================================
// OptionPicker — modal bottom-sheet style radio-list picker. Replaces the
// 4x bespoke "Pressable + cycle through options array" inline loop-toggles
// that lived in Profile.tsx (language, units, theme, defaultRestSeconds).
//
// Benefits over the old cycle-toggle pattern:
//   • Direct selection (no 3 taps to reach option 4 in a 5-item list)
//   • Semantic a11y roles (radiogroup / radio)
//   • Consistent visual language with History/Exercise picker modals
//   • Type-safe generic <T> value via discriminated options array
// ==========================================================================

export interface OptionPickerOption<T extends string | number> {
  value: T;
  label: string;
  sublabel?: string;
  icon?: string;
  iconColor?: string;
}

export interface OptionPickerProps<T extends string | number> {
  visible: boolean;
  title: string;
  options: OptionPickerOption<T>[];
  value: T;
  onSelect: (v: T) => void;
  onClose: () => void;
  cancelLabel?: string;
  accent?: string;
}

function OptionPickerImpl<T extends string | number>(
  {
    visible,
    title,
    options,
    value,
    onSelect,
    onClose,
    cancelLabel = 'Cancel',
    accent,
  }: OptionPickerProps<T>,
  _ref: React.Ref<View>
) {
  const colors = useThemeColors();
  const resolvedAccent = accent ?? colors.primary;
  const op = useMemo(() => StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      maxHeight: '80%',
      borderTopWidth: 1,
      borderTopColor: colors.surfaceBorder,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceDivider,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: layout.paddingHorizontal,
      paddingVertical: spacing.sm,
      justifyContent: 'space-between',
    },
    sheetTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      textAlign: 'center',
      flex: 1,
    },
    closeBtn: {
      width: 56,
      alignItems: 'flex-end',
      paddingVertical: spacing.xs,
    },
    closeText: {
      ...typography.captionBold,
      color: colors.textSecondary,
    },
    scroll: {
      maxHeight: '100%',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      marginBottom: spacing.sm,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    rowLabel: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    rowSublabel: {
      ...typography.caption,
      color: colors.textTertiary,
      lineHeight: 16,
    },
    radio: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.surfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
  }), [colors]);

  const handleSelect = useCallback(
    (v: T) => {
      onSelect(v);
      onClose();
    },
    [onSelect, onClose]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        style={op.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={cancelLabel}
      >
        <Pressable style={op.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={op.sheetHandle} />

          <View style={op.headerRow}>
            <View style={{ width: 56 }} />
            <Text style={op.sheetTitle} numberOfLines={1}>
              {title}
            </Text>
            <PressableScale
              onPress={onClose}
              style={op.closeBtn}
              hitSlop={8}
              scaleTo={0.94}
            >
              <Text style={op.closeText}>{cancelLabel}</Text>
            </PressableScale>
          </View>

          <ScrollView
            style={op.scroll}
            contentContainerStyle={{
              paddingHorizontal: layout.paddingHorizontal,
              paddingVertical: spacing.sm,
            }}
            showsVerticalScrollIndicator={false}
          >
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <PressableScale
                  key={String(opt.value)}
                  onPress={() => handleSelect(opt.value)}
                  style={[
                    op.row,
                    selected && {
                      borderColor: resolvedAccent + '66',
                      backgroundColor: resolvedAccent + '10',
                    },
                  ]}
                  scaleTo={0.985}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  {opt.icon ? (
                    <View
                      style={[
                        op.rowIcon,
                        {
                          backgroundColor:
                            (opt.iconColor || resolvedAccent) + '16',
                        },
                      ]}
                    >
                      <Icon
                        name={opt.icon}
                        size={16}
                        color={selected ? resolvedAccent : (opt.iconColor || colors.textSecondary)}
                      />
                    </View>
                  ) : null}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        op.rowLabel,
                        selected && { color: resolvedAccent },
                      ]}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                    {opt.sublabel ? (
                      <Text style={op.rowSublabel} numberOfLines={2}>
                        {opt.sublabel}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      op.radio,
                      selected && {
                        borderColor: resolvedAccent,
                        backgroundColor: resolvedAccent,
                      },
                    ]}
                  >
                    {selected ? (
                      <Icon name="check" size={12} color={colors.textInverse} />
                    ) : null}
                  </View>
                </PressableScale>
              );
            })}
            <View style={{ height: spacing.xxl }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Standalone generic signature so JSX callers can write `<OptionPicker<T>>`
// after `memo()` / `forwardRef()` would otherwise erase generics.  The
// `as unknown as ...` cast is safe: it restores the T-parametric call
// surface that MemoExoticComponent drops, without altering runtime behavior.
type OptionPickerComponent = <T extends string | number>(
  p: OptionPickerProps<T> & { ref?: React.Ref<View> }
) => React.ReactElement | null;

export const OptionPicker = memo(
  forwardRef(OptionPickerImpl)
) as unknown as OptionPickerComponent & { displayName?: string };

// ———————————————————————————————————————————————————————————————————————
// OptionPicker inline "toggle cell" helper: wraps a Pressable pill +
// opens the modal.  Screens supply the open state via useState + setter.
// ———————————————————————————————————————————————————————————————————————

export interface OptionPickerToggleProps {
  label: string;
  onPress: () => void;
  accent?: string;
  iconName?: string;
}

export function OptionPickerToggle({
  label,
  onPress,
  accent,
  iconName = 'chevron-right',
}: OptionPickerToggleProps) {
  const colors = useThemeColors();
  const resolvedAccent = accent ?? colors.primary;
  const opToggle = useMemo(() => StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs + 1,
      borderRadius: 999,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      minHeight: 30,
      paddingRight: 6,
    },
    label: {
      fontSize: 12,
      fontWeight: '800',
      maxWidth: 140,
    },
  }), [colors]);

  return (
    <PressableScale onPress={onPress} style={opToggle.pill}>
      <Text style={[opToggle.label, { color: resolvedAccent }]} numberOfLines={1}>
        {label}
      </Text>
      <Icon name={iconName} size={11} color={resolvedAccent} />
    </PressableScale>
  );
}
