import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { Exercise } from '@/types';
import { useThemeColors, spacing, radius, layout } from '@/theme';
import {
  getImageUrl,
  getAnimationUrl,
  labelForBodyPart,
  labelForEquipment,
  labelForTarget,
  iconForBodyPart,
  iconForEquipment,
  BODY_PART_LABELS,
  EQUIPMENT_LABELS,
  displayNameZh,
} from '@/constants';
import { getAllExercisesSync } from '@/data/queries';
import { useAppStore } from '@/store/useAppStore';
import { safeHaptic } from '@/utils/haptic';
import {
  PressableScale,
  Icon,
  Badge,
  SlabDivider,
} from '@/components/UIKit';
import { GifPlayer } from '@/components/GifPlayer';

const instructionsFor = (ex: Exercise, lang: 'zh' | 'en'): string[] => {
  // 1) Prefer structured instruction_steps (1,324 / 1,324 actions ship this as string[]).
  if (ex.instruction_steps && Array.isArray(ex.instruction_steps[lang])) {
    const steps = ex.instruction_steps[lang].filter(
      (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0
    );
    if (steps.length > 0) return steps;
  }
  // 2) Fallback: legacy `instructions` blob — dataset stores multi-line
  //    instructions as a single concatenated string separated by "。 " or "\n".
  const raw = ex.instructions?.[lang] as unknown;
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter(
      (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0
    );
  }
  if (typeof raw === 'string') {
    return raw
      .split(/\r?\n|(?<=。)\s+/)
      .map((s: string) => s.trim().replace(/^\d+[.)、\uff0e]\s*/u, ''))
      .filter(Boolean);
  }
  return [];
};

export default function ExerciseDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();

  // ====== Theme-aware styles ======
  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: layout.paddingHorizontal, paddingTop: spacing.sm },
    emptyWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: layout.paddingHorizontal,
      gap: spacing.md,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: -0.2,
      color: colors.textPrimary,
    },
    emptyDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 999,
    },
    backBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textInverse,
    },
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: layout.paddingHorizontal,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceDivider,
      backgroundColor: colors.bg,
    },
    navBtn: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
      letterSpacing: -0.1,
    },
    heroWrap: {
      marginBottom: spacing.lg,
      marginTop: spacing.md,
    },
    heroImage: {
      width: '100%',
      aspectRatio: 4 / 3,
      borderRadius: radius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      backgroundColor: colors.surfaceElevated,
      position: 'relative',
    },
    heroPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
    },
    heroPlaceholderIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroPlaceholderText: {
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: -0.2,
      textAlign: 'center',
      lineHeight: 20,
    },
    animationRow: {
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    animLeft: {
      flex: 1,
      minWidth: 0,
    },
    animLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    animLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    animSub: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    animPlayBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.muscle.shoulders + '18',
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.muscle.shoulders + '40',
    },
    animPlayInner: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.muscle.shoulders,
      alignItems: 'center',
      justifyContent: 'center',
    },
    animPlayText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.muscle.shoulders,
    },
    titleBlock: {
      marginBottom: spacing.lg,
    },
    zhRow: {
      marginBottom: 4,
    },
    zhName: {
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: -0.4,
      lineHeight: 28,
      color: colors.textPrimary,
    },
    enRow: {
      marginBottom: spacing.sm,
    },
    enName: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.2,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    targetRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    metaGrid: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    ctaBox: {
      gap: spacing.sm,
    },
    ctaPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.lg,
    },
    ctaPrimaryIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.textInverse + '22',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaPrimaryText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: -0.1,
      color: colors.textInverse,
    },
    ctaSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    ctaSecondaryText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
  }), [colors]);
  const params = useLocalSearchParams<{ id: string }>();
  // useLocalSearchParams can return `string | string[]` depending on whether
  // the dynamic route segment was visited via deep link with duplicate params.
  // Coerce to scalar so downstream lookups never compare against an array.
  const id: string = Array.isArray(params.id)
    ? params.id[params.id.length - 1]
    : (params.id ?? '');
  const effectiveLang: 'zh' | 'en' = i18n.language?.startsWith('en') ? 'en' : 'zh';
  const exercise = useMemo(() => {
    if (!id) return null;
    const all = getAllExercisesSync();
    return all.find((e) => e.id === id) || null;
  }, [id]);
  const [showAnim, setShowAnim] = React.useState(false);

  const settings = useAppStore((s) => s.settings);
  const isFavorite = useAppStore((s) => s.isFavorite(id));
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const addExerciseToActive = useAppStore((s) => s.addExerciseToActive);
  const startWorkout = useAppStore((s) => s.startWorkout);
  const activeWorkout = useAppStore((s) => s.activeWorkout);


  if (!exercise) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.emptyWrap}>
          <Icon name="alert-circle-outline" size={42} color={colors.danger} />
          <Text style={styles.emptyTitle}>{t('common.noData')}</Text>
          <Text style={styles.emptyDesc}>
            {t('home.emptyDesc')}
          </Text>
          <PressableScale
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Icon name="arrow-left" size={14} color={colors.textInverse} />
            <Text style={styles.backBtnText}>{t('common.back')}</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  const muscleColor =
    colors.muscle[exercise.body_part as keyof typeof colors.muscle] ||
    colors.primary;

  const zhIns = instructionsFor(exercise, 'zh');
  const enIns = instructionsFor(exercise, 'en');

  const bodyMeta = BODY_PART_LABELS[exercise.body_part];
  const equipMeta = EQUIPMENT_LABELS[exercise.equipment];

  const handleAddToWorkout = useCallback(() => {
    safeHaptic('medium');
    if (!activeWorkout) startWorkout();
    addExerciseToActive(exercise.id);
    safeHaptic('success');
    const dispName = effectiveLang === 'zh' ? displayNameZh(exercise) : exercise.name;
    Alert.alert(
      t('exercise.addedTitle'),
      `「${dispName}」${t('exercise.addedToWorkout')}`,
      [
        { text: t('common.close'), style: 'cancel' },
        {
          text: t('workout.title'),
          onPress: () => router.push('/workout/start' as Parameters<typeof router.push>[0]),
        },
      ]
    );
  }, [activeWorkout, startWorkout, addExerciseToActive, exercise, t, router]);

  const handleToggleFav = useCallback(() => {
    safeHaptic('medium');
    toggleFavorite(exercise.id);
  }, [toggleFavorite, exercise.id]);

  const handleNavBack = useCallback(() => {
    safeHaptic('light');
    router.back();
  }, [router]);

  const handleToggleAnim = useCallback(() => {
    safeHaptic('light');
    setShowAnim((v) => !v);
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* NAV BAR */}
      <View style={styles.navBar}>
        <PressableScale
          onPress={handleNavBack}
          style={styles.navBtn}
          hitSlop={8}
        >
          <Icon name="arrow-left" size={18} color={colors.textPrimary} />
        </PressableScale>
        <View style={{ flex: 1, minWidth: 0, marginHorizontal: spacing.sm }}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {effectiveLang === 'zh' ? displayNameZh(exercise) : exercise.name}
          </Text>
        </View>
        <PressableScale
          onPress={handleToggleFav}
          style={[
            styles.navBtn,
            isFavorite && { borderColor: colors.accent },
          ]}
          hitSlop={8}
        >
          <Icon
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorite ? colors.accent : colors.textPrimary}
          />
        </PressableScale>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* IMAGE + ANIMATION HERO */}
        <View style={styles.heroWrap}>
          <View style={[styles.heroImage, { borderColor: muscleColor + '33' }]}>
            <GifPlayer
              gifUri={getAnimationUrl(exercise.gif_url)}
              posterUri={getImageUrl(exercise.image)}
              active={showAnim}
              tint={muscleColor}
            />
          </View>

          <View style={styles.animationRow}>
            <View style={styles.animLeft}>
              <View style={styles.animLabelRow}>
                <Icon
                  name={showAnim ? 'pause' : 'play-circle-outline'}
                  size={13}
                  color={colors.muscle.shoulders}
                />
                <Text style={styles.animLabel}>
                  {showAnim ? t('compact.playAnim') : t('exercise.showAnimation')}
                </Text>
              </View>
              <Text style={styles.animSub}>
                {showAnim
                  ? t('exercise.hideAnimation')
                  : t('app.poweredBy')}
              </Text>
            </View>
            <PressableScale
              onPress={handleToggleAnim}
              style={styles.animPlayBtn}
            >
              <View style={styles.animPlayInner}>
                <Icon name={showAnim ? 'image-outline' : 'play-circle-outline'} size={18} color={colors.textInverse} />
              </View>
              <Text style={styles.animPlayText}>{showAnim ? t('exercise.hideAnimation') : t('exercise.showAnimation')}</Text>
            </PressableScale>
          </View>
        </View>

        {/* NAME — single language only */}
        <View style={styles.titleBlock}>
          <Text style={styles.zhName} numberOfLines={2}>
            {effectiveLang === 'zh' ? displayNameZh(exercise) : exercise.name}
          </Text>
          <View style={styles.targetRow}>
            <Badge
              icon="crosshairs-gps"
              label={`${t('exercise.target')}: ${labelForTarget(exercise.target)}`}
              color={colors.success}
              size="sm"
            />
            {exercise.muscle_group ? (
              <Badge
                icon="arm-flex"
                label={`${t('exercise.muscleGroup')}: ${exercise.muscle_group}`}
                color={muscleColor}
                size="sm"
              />
            ) : null}
          </View>
        </View>

        {/* META ROW */}
        <View style={styles.metaGrid}>
          <MetaCell
            icon={iconForBodyPart(exercise.body_part)}
            label={t('exercise.bodyPart')}
            value={labelForBodyPart(exercise.body_part, settings.language)}
            accent={muscleColor}
            note={bodyMeta?.note}
          />
          <MetaCell
            icon={iconForEquipment(exercise.equipment)}
            label={t('exercise.equipment')}
            value={labelForEquipment(exercise.equipment, settings.language)}
            accent={colors.info}
            note={equipMeta?.note}
          />
        </View>

        {/* INSTRUCTIONS — single language */}
        <SlabDivider accent={muscleColor} />
        <SectionTitle
          icon="text-box-check-outline"
          title={t('exercise.instructions')}
          color={muscleColor}
        />
        {effectiveLang === 'zh' ? (
          zhIns.length === 0 ? (
            <EmptyNote
              icon="text-remove-outline"
              title={t('exercise.instructionsEmpty')}
              desc={t('home.emptyDesc')}
            />
          ) : (
            <StepList items={zhIns} accent={muscleColor} />
          )
        ) : enIns.length === 0 ? (
          <EmptyNote
            icon="text-remove-outline"
            title={t('exercise.instructionsEmpty')}
            desc={t('home.emptyDesc')}
          />
        ) : (
          <StepList items={enIns} accent={muscleColor} />
        )}

        <View style={{ height: spacing.xl }} />

        {/* CTA BAR */}
        <View style={styles.ctaBox}>
          <PressableScale
            onPress={handleAddToWorkout}
            style={styles.ctaPrimary}
            scaleTo={0.98}
          >
            <View style={styles.ctaPrimaryIcon}>
              <Icon name="plus" size={16} color={colors.textInverse} />
            </View>
            <Text style={styles.ctaPrimaryText}>
              {activeWorkout ? t('compact.addToSession') : t('compact.startPlus')}
            </Text>
            <Icon name="chevron-right" size={16} color={colors.textInverse} />
          </PressableScale>
          <PressableScale
            onPress={handleToggleFav}
            style={[
              styles.ctaSecondary,
              isFavorite && { borderColor: colors.accent + '55' },
            ]}
            scaleTo={0.98}
          >
            <Icon
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorite ? colors.accent : colors.textPrimary}
            />
            <Text style={styles.ctaSecondaryText}>
              {isFavorite ? t('exercise.favorited') : t('exercise.favorite')}
            </Text>
          </PressableScale>
        </View>

        <View style={{ height: layout.tabBarHeight + spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// Sub components
// ============================================================

function SectionTitle({
  icon,
  title,
  color,
}: {
  icon: string;
  title: string;
  color: string;
}) {
  const colors = useThemeColors();
  const sec = useMemo(() => StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
      marginTop: spacing.md,
    },
    icon: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: -0.1,
    },
  }), [colors]);
  return (
    <View style={sec.wrap}>
      <View style={[sec.icon, { backgroundColor: color + '16' }]}>
        <Icon name={icon} size={15} color={color} />
      </View>
      <Text style={[sec.title, { color }]}>{title}</Text>
    </View>
  );
}

function StepList({
  items,
  accent,
}: {
  items: string[];
  accent: string;
}) {
  const colors = useThemeColors();
  const st = useMemo(() => StyleSheet.create({
    wrap: {
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      alignItems: 'flex-start',
    },
    idx: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    idxText: {
      fontSize: 12,
      fontWeight: '900',
      color: colors.textInverse,
      lineHeight: 14,
    },
    step: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      color: colors.textPrimary,
      lineHeight: 20,
    },
  }), [colors]);
  return (
    <View style={st.wrap}>
      {items.map((step, i) => (
        <View key={i} style={st.row}>
          <View style={[st.idx, { backgroundColor: accent }]}>
            <Text style={st.idxText}>{i + 1}</Text>
          </View>
          <Text style={st.step}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

function MetaCell({
  icon,
  label,
  value,
  accent,
  note,
}: {
  icon: string;
  label: string;
  value: string;
  accent: string;
  note?: string;
}) {
  const colors = useThemeColors();
  const m = useMemo(() => StyleSheet.create({
    wrap: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      overflow: 'hidden',
    },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderBottomWidth: 1,
      borderColor: colors.surfaceDivider,
    },
    icon: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    label: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 2,
    },
    value: {
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: -0.1,
    },
    note: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surfaceElevated,
    },
    noteText: {
      flex: 1,
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
      lineHeight: 16,
    },
  }), [colors]);
  return (
    <View style={m.wrap}>
      <View style={[m.top, { borderColor: accent + '33' }]}>
        <View style={[m.icon, { backgroundColor: accent + '16' }]}>
          <Icon name={icon} size={16} color={accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={m.label}>{label}</Text>
          <Text style={[m.value, { color: accent }]} numberOfLines={1}>
            {value}
          </Text>
        </View>
      </View>
      {note ? (
        <View style={m.note}>
          <Icon name="information-outline" size={10} color={colors.textTertiary} />
          <Text style={m.noteText} numberOfLines={4}>
            {' '}
            {note}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function EmptyNote({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  const colors = useThemeColors();
  const en = useMemo(() => StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderStyle: 'dashed',
      backgroundColor: colors.surface,
      alignItems: 'center',
    },
    icon: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    title: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    desc: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
      lineHeight: 18,
    },
  }), [colors]);
  return (
    <View style={en.wrap}>
      <View style={en.icon}>
        <Icon name={icon} size={22} color={colors.textTertiary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={en.title}>{title}</Text>
        <Text style={en.desc}>{desc}</Text>
      </View>
    </View>
  );
}

// ============================================================
// End of file (all styles moved into components via useMemo + useThemeColors)
// ============================================================
