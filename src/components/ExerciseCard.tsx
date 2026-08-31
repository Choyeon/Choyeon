import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, type GestureResponderEvent } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Exercise, LanguageCode } from '@/types';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import {
  getImageUrl,
  iconForBodyPart,
  iconForEquipment,
  labelForBodyPart,
  labelForEquipment,
  displayNameZh,
} from '@/constants';
import { useAppStore } from '@/store/useAppStore';
import { Icon, PressableScale, Badge } from '@/components/UIKit';
import { safeHaptic } from '@/utils/haptic';

interface ExerciseCardProps {
  exercise: Exercise;
  /** Override display language; when omitted the card reads the active
   *  i18n locale reactively — so flipping language in Settings rerenders
   *  every visible card with no caller-side plumbing required. */
  language?: LanguageCode;
  onPress?: () => void;
  compact?: boolean;
  grid?: boolean;
  showFavorite?: boolean;
}

function ExerciseCardImpl({
  exercise,
  language: languageProp,
  onPress,
  compact = false,
  grid = false,
  showFavorite = true,
}: ExerciseCardProps) {
  const colors = useThemeColors();
  const { i18n } = useTranslation();
  // Resolve display language once per render: explicit prop wins, otherwise
  // fall back to the i18n instance's current language.  This keeps the
  // component language-correct even when a caller forgets to pass it.
  const effective: LanguageCode =
    languageProp ?? (i18n.language?.startsWith('en') ? 'en' : 'zh');

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    cardCompact: {
      borderRadius: radius.md,
    },
    imageWrap: {
      position: 'relative',
      width: '100%',
      height: 160,
      backgroundColor: colors.surfaceElevated,
    },
    imageWrapCompact: {
      height: 104,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    favBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.xs,
    },
    infoWrap: {
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    name: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: 2,
      letterSpacing: -0.2,
    },
    nameZh: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    metaRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    quickAddBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.sm,
    },
    // ===================== GRID MODE (3 columns) =====================
    cardGrid: {
      width: '31%',
    },
    imageWrapGrid: {
      height: 124,
    },
    infoWrapGrid: {
      padding: spacing.sm,
    },
    nameGrid: {
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 17,
      letterSpacing: -0.1,
      marginBottom: 3,
    },
    metaRowGrid: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    metaTextGrid: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      flex: 1,
    },
  }), [colors]);

  const router = useRouter();
  const isFavorite = useAppStore((s) => s.isFavorite(exercise.id));
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  // rerender-deferred-reads: don't subscribe to the ENTIRE activeWorkout
  // object (which mutates on every set edit) — we only need a boolean to
  // decide whether the quick-add "+" button should render.  A stable getter
  // is O(1) and avoids thousands of FlashList re-renders for users with
  // 100+ visible cards while a workout is active.
  const hasActiveWorkout = useAppStore((s) => s.activeWorkout !== null);

  // Muscle accent + derived label/icon bundle.  Helpers are O(1) table reads,
  // but memoizing the whole bundle keeps downstream `Badge` memo() calls valid
  // and avoids thousands of re-reconciliations inside a 1000-row FlashList.
  const muscleColor = useMemo(
    () =>
      colors.muscle[exercise.body_part as keyof typeof colors.muscle] ||
      colors.primary,
    [exercise.body_part, colors]
  );

  const { bodyPartIcon, bodyPartLabel, equipIcon, equipLabel } = useMemo(
    () => ({
      bodyPartIcon: iconForBodyPart(exercise.body_part),
      bodyPartLabel: labelForBodyPart(exercise.body_part, effective),
      equipIcon: iconForEquipment(exercise.equipment),
      equipLabel: labelForEquipment(exercise.equipment, effective),
    }),
    [exercise.body_part, exercise.equipment, effective]
  );

  const handlePress = useCallback(() => {
    safeHaptic('light');
    if (onPress) {
      onPress();
      return;
    }
    // expo-router's typedRoutes only knows about statically-declared hrefs.
    // `/exercise/${id}` is a valid dynamic route (app/exercise/[id].tsx),
    // but TypeScript can't prove the union at compile time.  We cast via
    // `as unknown` as a narrow bridge rather than `as any` — runtime behavior
    // is unchanged; this satisfies tsc without dropping type safety of the
    // router object itself.
    const href = `/exercise/${encodeURIComponent(exercise.id)}` as unknown as Parameters<typeof router.push>[0];
    router.push(href);
  }, [onPress, exercise.id, router]);

  const handleFavorite = useCallback((e: GestureResponderEvent) => {
    e.stopPropagation?.();
    safeHaptic('medium');
    toggleFavorite(exercise.id);
  }, [exercise.id, toggleFavorite]);

  const handleQuickAdd = useCallback((e: GestureResponderEvent) => {
    e.stopPropagation?.();
    if (!hasActiveWorkout) {
      useAppStore.getState().startWorkout();
    }
    safeHaptic('success');
    useAppStore.getState().addExerciseToActive(exercise.id);
  }, [hasActiveWorkout, exercise.id]);

  return (
    <PressableScale
      onPress={handlePress}
      style={[styles.card, compact && styles.cardCompact, grid && styles.cardGrid]}
    >
      <View style={[styles.imageWrap, compact && styles.imageWrapCompact, grid && styles.imageWrapGrid]}>
        <Image
          source={getImageUrl(exercise.image)}
          style={styles.image}
          contentFit="contain"
          transition={200}
          placeholder={require('@/../assets/icon.png')}
        />
      </View>

      <View style={[styles.infoWrap, grid && styles.infoWrapGrid]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, grid && styles.nameGrid]} numberOfLines={grid ? 2 : 1}>
            {effective === 'zh' ? displayNameZh(exercise) : exercise.name}
          </Text>
          {!grid && (
            <Text style={styles.nameZh} numberOfLines={1}>
              {effective === 'zh' && exercise.instructions?.zh
                ? exercise.instructions.zh.slice(0, 26) + '…'
                : (exercise.target ?? '') + ' · ' + (exercise.muscle_group ?? '')}
            </Text>
          )}

          {!grid ? (
            <View style={styles.metaRow}>
              <Badge
                icon={bodyPartIcon}
                label={bodyPartLabel}
                color={muscleColor}
                size="sm"
              />
              <Badge
                icon={equipIcon}
                label={equipLabel}
                color={colors.info}
                size="sm"
              />
            </View>
          ) : (
            <View style={styles.metaRowGrid}>
              <Icon name={bodyPartIcon} size={11} color={muscleColor} />
              <Text style={styles.metaTextGrid} numberOfLines={1}>
                {bodyPartLabel}
              </Text>
            </View>
          )}
        </View>

        {showFavorite && (
          <PressableScale
            onPress={handleFavorite}
            style={styles.favBtn}
            hitSlop={8}
            scaleTo={0.88}
          >
            <Icon
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={grid ? 14 : 18}
              color={isFavorite ? colors.accent : colors.textSecondary}
            />
          </PressableScale>
        )}

        {hasActiveWorkout && !grid && (
          <PressableScale
            onPress={handleQuickAdd}
            style={styles.quickAddBtn}
            hitSlop={6}
            scaleTo={0.92}
          >
            <Icon name="plus" size={20} color={colors.textInverse} />
          </PressableScale>
        )}
      </View>
    </PressableScale>
  );
}

export const ExerciseCard = memo(ExerciseCardImpl);
