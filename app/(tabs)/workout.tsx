import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import type { WorkoutSession } from '@/types';
import { useThemeColors, spacing, radius, layout } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { getAllExercisesSync } from '@/data/queries';
import {
  getImageUrl,
  iconForBodyPart,
  labelForBodyPart,
  iconForEquipment,
} from '@/constants';
import {
  PressableScale,
  Icon,
  MiniStat,
  SlabDivider,
  EmptyState,
  SectionHeader,
} from '@/components/UIKit';
import { safeHaptic } from '@/utils/haptic';
import { formatDurationClock, formatDurationHuman } from '@/utils/format';

export default function WorkoutScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const router = useRouter();
  // Subscribe to stable slices — avoid calling expensive stats getters from
  // inside selectors. Methods like streakDays() / totalVolumeKg() iterate
  // the full workouts tree on every state change if invoked during select.
  const workouts = useAppStore((s) => s.workouts);
  const activeWorkout = useAppStore((s) => s.activeWorkout);
  const startWorkout = useAppStore((s) => s.startWorkout);
  const deleteWorkout = useAppStore((s) => s.deleteWorkout);
  const units = useAppStore((s) => s.settings.units);
  const settings = useAppStore((s) => s.settings);

  // Stats are derived once per `workouts` reference change.
  //
  // CRITICAL FIX: streak calculation previously lived in THREE places
  // (workout.tsx, profile.tsx, and store.streakDays()) and drifted apart
  // (Profile had "yesterday grace" but the Workout tab did not).  We now
  // delegate streak semantics EXCLUSIVELY to `store.streakDays()` so the
  // three tabs cannot disagree.  Local volume / total iteration remains
  // only because `totalVolumeKg()` returns kg regardless of settings.units
  // (we'd need a conversion step if we re-used it here).
  const { streak, total, volume } = useMemo(() => {
    const store = useAppStore.getState();
    let totalVol = 0;
    for (const w of workouts) {
      for (const e of w.exercises) {
        for (const set of e.sets) {
          if (set.completed) totalVol += (set.weight || 0) * (set.reps || 0);
        }
      }
    }
    return {
      streak: store.streakDays(),
      total: workouts.length,
      volume: Math.round(totalVol),
    };
  }, [workouts]);

  const exercises = useMemo(() => getAllExercisesSync(), []);
  const exMap = useMemo(() => {
    const m = new Map(exercises.map((e) => [e.id, e]));
    return m;
  }, [exercises]);

  const handleStart = useCallback(() => {
    safeHaptic('medium');
    // `as const` provides literal string widening for expo-router typedRoutes
    // without fully bypassing type system via `as any`.  Known static route
    // `app/workout/start.tsx` will always exist in this build.
    const route = '/workout/start' as const;
    if (activeWorkout) {
      router.push(route as Parameters<typeof router.push>[0]);
    } else {
      startWorkout();
      router.push(route as Parameters<typeof router.push>[0]);
    }
  }, [activeWorkout, router, startWorkout]);

  const handleDelete = useCallback(
    (id: string) => {
      // Previously the Alert title was `workout.historyTitle` — a generic
      // history list header.  Users need context that they are DELETING one
      // specific session, so we use the dedicated deleteOneTitle key.
      Alert.alert(t('workout.deleteOneTitle'), t('workout.deleteOneConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            safeHaptic('warning');
            deleteWorkout(id);
          },
        },
      ]);
    },
    [deleteWorkout, t]
  );

  const handleOpenActive = useCallback(() => {
    safeHaptic('light');
    router.push('/workout/start' as Parameters<typeof router.push>[0]);
  }, [router]);

  // 7 day bars + maxBar are coupled; compute together to avoid a stale
  // intermediate maxBar when workouts updates haven't propagated through
  // re-render yet (first paint would show old height + new data).
  const { last7Days, maxBar } = useMemo(() => {
    const week = new Array(7).fill(0) as number[];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const w of workouts) {
      const d = new Date(w.date);
      d.setHours(0, 0, 0, 0);
      const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
      if (diff >= 0 && diff < 7) {
        week[6 - diff]++;
      }
    }
    return { last7Days: week, maxBar: Math.max(1, ...week) };
  }, [workouts]);

  const dayLabels = useMemo(() => {
    // Semantic day labels via compact.day* keys.  Previously this array
    // was hardcoded CJK ("日一二三四五六") and leaked into EN/ja UIs as
    // undecipherable glyph soup even when every other label was English.
    const compactNames = [
      t('compact.daySun'), t('compact.dayMon'), t('compact.dayTue'),
      t('compact.dayWed'), t('compact.dayThu'), t('compact.dayFri'),
      t('compact.daySat'),
    ];
    const arr: string[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      arr.push(compactNames[d.getDay()]);
    }
    return arr;
  }, [t]);

  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: layout.paddingHorizontal, paddingTop: spacing.sm },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
      gap: spacing.md,
    },
    brandLine: {
      color: colors.accent,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      fontSize: 11,
      fontWeight: '800',
      marginBottom: 2,
    },
    title: {
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: -0.6,
      lineHeight: 34,
      color: colors.textPrimary,
    },
    primaryCTA: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
      borderRadius: 999,
      flexShrink: 0,
    },
    primaryCTAHot: {
      backgroundColor: colors.accent,
    },
    headerLeft: {
      flex: 1,
      minWidth: 0,
    },
    ctaIconTray: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.textInverse + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaIconTrayActive: {
      backgroundColor: colors.textInverse + '20',
    },
    ctaText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textInverse,
      letterSpacing: 0.3,
    },
    activeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.accent + '55',
      marginBottom: spacing.lg,
      position: 'relative',
      overflow: 'hidden',
      gap: spacing.sm,
    },
    activeAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: colors.accent,
    },
    activeBody: {
      flex: 1,
    },
    activeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    activeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.accent + '22',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
    },
    activePulse: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    activeBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.accent,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    activeName: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      marginLeft: spacing.sm,
      letterSpacing: -0.1,
    },
    activeMeta: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    activeChevron: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accent + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsStrip: {
      flexDirection: 'row',
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      marginBottom: spacing.lg,
    },
    weekCard: {
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      marginBottom: spacing.xl,
    },
    weekHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    weekTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    barRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: 84,
      gap: spacing.xs,
    },
    barCol: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
    },
    barBg: {
      width: '100%',
      maxWidth: 32,
      height: 72,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.sm,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    barFill: {
      width: '100%',
      borderRadius: radius.sm,
      minHeight: 8,
    },
    barLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textTertiary,
      letterSpacing: 0.4,
    },
    historyHeader: {
      marginBottom: spacing.md,
    },
    gapSm: { height: spacing.sm },
    bottomInset: { height: layout.tabBarHeight + spacing.xxl },
  }), [colors]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandLine}>TRAINING LOG</Text>
            <Text style={styles.title}>{t('workout.title')}</Text>
          </View>
          <PressableScale
            onPress={handleStart}
            style={[
              styles.primaryCTA,
              activeWorkout && styles.primaryCTAHot,
            ]}
          >
            <View style={[
              styles.ctaIconTray,
              activeWorkout && styles.ctaIconTrayActive,
            ]}>
              <Icon
                name={activeWorkout ? 'lightning-bolt' : 'plus'}
                size={14}
                color={colors.textInverse}
              />
            </View>
            <Text style={styles.ctaText}>
              {activeWorkout ? t('home.resumeWorkout') : t('home.startWorkout')}
            </Text>
          </PressableScale>
        </View>

        {/* ACTIVE WORKOUT CARD — uses stable handleOpenActive so the
            PressableScale prop doesn't churn re-renders every tick. */}
        {activeWorkout && (
          <PressableScale
            onPress={handleOpenActive}
            style={styles.activeCard}
          >
            <View style={styles.activeAccent} />
            <View style={styles.activeBody}>
              <View style={styles.activeRow}>
                <View style={styles.activeBadge}>
                  <View style={styles.activePulse} />
                  <Text style={styles.activeBadgeText}>{t('workout.titleActive')}</Text>
                </View>
                <Text style={styles.activeName} numberOfLines={1}>
                  {activeWorkout.name}
                </Text>
              </View>
              <View style={styles.gapSm} />
              <Text style={styles.activeMeta}>
                {t('workout.activeCardMeta', { count: activeWorkout.exercises.length })}
              </Text>
            </View>
            <View style={styles.activeChevron}>
              <Icon name="chevron-right" size={18} color={colors.accent} />
            </View>
          </PressableScale>
        )}

        {/* STATS STRIP */}
        <View style={styles.statsStrip}>
          <MiniStat
            label={t('compact.headerStreak')}
            value={`${streak}`}
            unit={t('workout.unitDays')}
            icon="fire"
            iconColor={colors.accent}
          />
          <MiniStat
            label={t('compact.headerWorkouts')}
            value={`${total}`}
            unit={t('workout.unitTimes')}
            icon="dumbbell"
            iconColor={colors.primary}
          />
          <MiniStat
            label={t('compact.headerVolume')}
            value={volume >= 1000 ? (volume / 1000).toFixed(1) + 'k' : String(Math.round(volume))}
            unit={units}
            icon="weight-kilogram"
            iconColor={colors.info}
          />
        </View>

        {/* 7-DAY BARS */}
        <View style={styles.weekCard}>
          <View style={styles.weekHeaderRow}>
            <Text style={styles.weekTitle}>{t('workout.historyTitle')} · 7 {t('workout.unitDays')}</Text>
            <Icon name="chart-bar" size={16} color={colors.textTertiary} />
          </View>
          <View style={styles.barRow}>
            {last7Days.map((count, i) => {
              const h = 12 + (count / maxBar) * 60;
              const isToday = i === 6;
              const fillColor =
                count > 0
                  ? isToday
                    ? colors.primary
                    : colors.accent
                  : colors.surfaceElevated;
              return (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barBg}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: h,
                          backgroundColor: fillColor,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.barLabel,
                      isToday && { color: colors.primary },
                    ]}
                  >
                    {dayLabels[i]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* HISTORY LIST */}
        <SlabDivider accent={colors.primary} />
        <View style={styles.historyHeader}>
          <SectionHeader
            title={t('workout.historyTitle')}
            icon="clipboard-text-clock-outline"
            accent={colors.primary}
            note={`${workouts.length} ${t('workout.unitTimes')} · ${t('compact.historyEmptyNote')}`}
            inline
          />
        </View>

        {workouts.length === 0 ? (
          <EmptyState
            icon="weight-lifter"
            title={t('workout.historyEmpty')}
            desc={t('workout.historyEmptyDesc')}
            actionLabel={t('home.startWorkout')}
            onAction={handleStart}
          />
        ) : (
          workouts.map((w) => (
            <WorkoutCard
              key={w.id}
              session={w}
              exMap={exMap}
              units={settings.units}
              onDelete={() => handleDelete(w.id)}
            />
          ))
        )}

        <View style={styles.bottomInset} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// Sub components
// ============================================================

function WorkoutCard({
  session,
  exMap,
  units,
  onDelete,
}: {
  session: WorkoutSession;
  exMap: Map<string, any>;
  units: 'kg' | 'lb';
  onDelete: () => void;
}) {
  // i18n for nested card — intentionally NOT hoisted so translated labels
  // react to language toggle without a screen-level re-render boundary.
  const colors = useThemeColors();
  const { t } = useTranslation();
  // Localized date formatting (not a module-level helper anymore because
  // the ZH/EN date pattern comes from i18n — ZH is "{{month}}月{{day}}日"
  // and EN is "{{month}}/{{day}}"; hardcoded CJK punctuation used to leak
  // into the EN UI making cards look half-translated).
  const d = new Date(session.date);
  const date = t('workout.dateMonthDay', { month: d.getMonth() + 1, day: d.getDate() });
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const totalSets = session.exercises.reduce((acc, e) => acc + e.sets.length, 0);
  const completedSets = session.exercises.reduce(
    (acc, e) => acc + e.sets.filter((s) => s.completed).length,
    0
  );
  const volume = session.exercises.reduce(
    (acc, e) =>
      acc +
      e.sets
        .filter((s) => s.completed)
        .reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0),
    0
  );

  const previewExercises = useMemo(
    () => session.exercises.slice(0, 4),
    [session.exercises]
  );

  const cardStyles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    dateCol: {
      flex: 1,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 2,
    },
    date: {
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: -0.2,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    time: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
      lineHeight: 18,
    },
    deleteBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.danger + '14',
      borderWidth: 1,
      borderColor: colors.danger + '30',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sessionName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primary,
      marginBottom: spacing.md,
      letterSpacing: -0.1,
    },
    statRow: {
      flexDirection: 'row',
      marginBottom: spacing.md,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.surfaceDivider,
    },
    statCol: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    statIconTray: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.1,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textTertiary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    previewRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
      flexWrap: 'wrap',
    },
    previewItem: {
      alignItems: 'center',
      width: 58,
      gap: 4,
    },
    previewImgWrap: {
      borderRadius: radius.md,
      borderWidth: 2,
      overflow: 'hidden',
    },
    previewImg: {
      width: 54,
      height: 54,
      backgroundColor: colors.surfaceElevated,
    },
    previewSets: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.2,
    },
    noteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.surfaceDivider,
    },
    note: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      lineHeight: 19,
    },
  }), [colors]);

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.topRow}>
        <View style={cardStyles.dateCol}>
          <View style={cardStyles.dateRow}>
            <Icon name="calendar-today" size={13} color={colors.textTertiary} />
            <Text style={cardStyles.date}>{date}</Text>
          </View>
          <Text style={cardStyles.time}>
            <Icon name="clock-outline" size={11} color={colors.textTertiary} />{' '}
            {time} · {formatDurationHuman(session.duration)}
          </Text>
        </View>
        <PressableScale
          onPress={onDelete}
          style={cardStyles.deleteBtn}
          hitSlop={8}
          scaleTo={0.9}
        >
          <Icon name="trash-can-outline" size={14} color={colors.danger} />
        </PressableScale>
      </View>

      {session.name ? (
        <Text style={cardStyles.sessionName} numberOfLines={1}>
          <Icon name="tag-outline" size={12} color={colors.primary} /> {session.name}
        </Text>
      ) : null}

      <View style={cardStyles.statRow}>
        <Stat
          label={t('compact.headerVolume')}
          value={`${Math.round(volume)} ${units}`}
          icon="weight-kilogram"
          color={colors.primary}
        />
        <Stat
          label={t('compact.headerDone')}
          value={`${completedSets}/${totalSets} ${t('compact.unitSets')}`}
          icon="check-circle-outline"
          color={colors.success}
        />
        <Stat
          label={t('compact.headerOverview')}
          value={`${session.exercises.length} ${t('compact.exercises')}`}
          icon="format-list-numbered"
          color={colors.info}
        />
      </View>

      <View style={cardStyles.previewRow}>
        {previewExercises.map((e) => {
          const ex = exMap.get(e.exerciseId);
          const color = ex
            ? colors.muscle[ex.body_part as keyof typeof colors.muscle] ||
              colors.primary
            : colors.primary;
          return (
            <View key={e.exerciseId} style={cardStyles.previewItem}>
              <View
                style={[
                  cardStyles.previewImgWrap,
                  { borderColor: color + '66' },
                ]}
              >
                {ex ? (
                  <Image
                    source={getImageUrl(ex.image)}
                    style={cardStyles.previewImg}
                    contentFit="cover"
                  />
                ) : (
                  <View style={cardStyles.previewImg} />
                )}
              </View>
              <Text style={cardStyles.previewSets}>{e.sets.length}{t('compact.setsHeader')}</Text>
            </View>
          );
        })}
      </View>

      {session.note ? (
        <View style={cardStyles.noteRow}>
          <Icon name="note-text-outline" size={12} color={colors.textTertiary} />
          <Text style={cardStyles.note} numberOfLines={2}>
            {' '}
            {session.note}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Stat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
}) {
  const colors = useThemeColors();
  const s = useMemo(() => StyleSheet.create({
    col: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    iconTray: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    value: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.1,
    },
    label: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textTertiary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
  }), [colors]);
  return (
    <View style={s.col}>
      <View style={[s.iconTray, { backgroundColor: color + '18' }]}>
        <Icon name={icon} size={12} color={color} />
      </View>
      <Text style={s.value}>{value}</Text>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}
