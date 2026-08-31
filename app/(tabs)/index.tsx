import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { BodyPart } from '@/types';
import { colors, spacing, layout } from '@/theme';
import {
  useBodyPartCounts,
  useEquipmentCounts,
  useFilteredExercises,
} from '@/hooks/useExercises';
import { ExerciseCard } from '@/components/ExerciseCard';
import { BodyPartChip, EquipmentChip } from '@/components/FilterChips';
import {
  SearchBar,
  StatsHero,
  SectionHeader,
  EmptyState,
  PressableScale,
  Icon,
  CategoryInfoNote,
  SlabDivider,
} from '@/components/UIKit';
import { useAppStore } from '@/store/useAppStore';
import { safeHaptic } from '@/utils/haptic';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const bodyParts = useBodyPartCounts();
  const equipments = useEquipmentCounts();
  // ========================================================================
  // STORE SUBSCRIPTIONS — granular slices only, NEVER call expensive
  // derived getters (totalWorkouts / streakDays / totalVolumeKg) inside the
  // selector callback.  Doing so runs the getter (which iterates the full
  // `workouts` tree) on *every* zustand state publish (language toggle,
  // favorites flip, activeWorkout set edits, etc.) — the classic
  // "rerender-derived-state" anti-pattern that scales O(sessions × listeners).
  // Instead we subscribe to the stable `workouts` reference, then
  // recompute stats in a useMemo gated on the reference change alone.
  // ========================================================================
  const workouts = useAppStore((s) => s.workouts);
  const units = useAppStore((s) => s.settings.units);
  const activeWorkout = useAppStore((s) => s.activeWorkout);
  const startWorkout = useAppStore((s) => s.startWorkout);

  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Stats derived purely from the `workouts` reference.  Reads from the
  // store's canonical getters (single source of truth) but is gated so
  // these O(n) traversals only fire when the workouts array identity
  // actually changes (set, add, delete, reset — not on unrelated updates).
  const { totalWorkouts, streak, volume } = useMemo(() => {
    const store = useAppStore.getState();
    return {
      totalWorkouts: workouts.length,
      streak: store.streakDays(),
      volume: store.totalVolumeKg(),
    };
  }, [workouts]);

  const filters = useMemo(
    () => ({
      bodyPart: selectedBodyPart,
      equipment: selectedEquipment,
      searchQuery: query,
    }),
    [selectedBodyPart, selectedEquipment, query]
  );

  const { filtered, total } = useFilteredExercises(filters);
  // Memoize slice-derived display lists so re-renders triggered by unrelated
  // store state (e.g. activeWorkout timer ticks) don't rebuild these arrays.
  const topEquipments = useMemo(() => equipments.slice(0, 8), [equipments]);
  const previewExercises = useMemo(() => filtered.slice(0, 10), [filtered]);

  const onBodyPartPress = useCallback((bp: BodyPart) => {
    safeHaptic('light');
    setSelectedBodyPart((cur) => (cur === bp ? null : bp));
  }, []);

  const onEquipmentPress = useCallback((eq: string) => {
    safeHaptic('light');
    setSelectedEquipment((cur) => (cur === eq ? null : eq));
  }, []);

  const handleStartWorkout = useCallback(() => {
    safeHaptic('medium');
    if (!activeWorkout) startWorkout();
    router.push('/workout/start' as Parameters<typeof router.push>[0]);
  }, [activeWorkout, router, startWorkout]);

  const handleSeeAll = useCallback(() => {
    safeHaptic('light');
    router.push('/(tabs)/library' as Parameters<typeof router.push>[0]);
  }, [router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // 600ms visual affordance — RefreshControl needs a state transition so
    // users see the spinner even though we have no network layer here.
    const id = setTimeout(() => setRefreshing(false), 600);
    return () => clearTimeout(id);
  }, []);

  const hasFilter = !!selectedBodyPart || !!selectedEquipment || query.length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandLine}>CHOYEON · EXERCISES</Text>
            <Text style={styles.helloText} numberOfLines={1}>
              {activeWorkout ? t('home.greetingActive') : t('home.greetingIdle')}
            </Text>
          </View>
          <PressableScale
            onPress={handleStartWorkout}
            style={[
              styles.ctaBtn,
              activeWorkout && styles.ctaBtnActive,
            ]}
          >
            <View style={[
              styles.ctaIconTray,
              activeWorkout && styles.ctaIconTrayActive,
            ]}>
              <Icon
                name={activeWorkout ? 'lightning-bolt' : 'play'}
                size={14}
                color={activeWorkout ? colors.textInverse : colors.primary}
              />
            </View>
            <Text
              style={[
                styles.ctaText,
                activeWorkout && styles.ctaTextActive,
              ]}
            >
              {activeWorkout ? t('home.resumeWorkout') : t('home.startWorkout')}
            </Text>
          </PressableScale>
        </View>

        {/* STATS HERO — caller supplies i18n labels so the component itself
            stays i18n-agnostic and doesn't import react-i18next directly. */}
        <StatsHero
          streak={streak}
          workouts={totalWorkouts}
          volume={volume}
          units={units}
          labelStreak={t('workout.heroLabelStreak')}
          labelWorkouts={t('workout.heroLabelWorkouts')}
          labelVolume={t('workout.heroLabelVolume')}
          suffixStreak={t('workout.heroUnitStreak')}
          suffixWorkouts={t('workout.heroUnitWorkouts')}
          suffixVolume={units === 'kg'
            ? (t('workout.heroUnitVolume') || 'kg')
            : (t('workout.heroUnitVolume') || 'lb')}
        />

        {/* SEARCH */}
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={t('home.searchPlaceholder')}
        />
        <View style={styles.gapLg} />

        {/* BODY PART FILTERS */}
        <SectionHeader
          title={t('home.bodySectionTitle')}
          icon="arm-flex-outline"
          accent={colors.muscle.chest}
          note={t('home.bodySectionNote')}
        />
        <CategoryInfoNote
          icon="book-open-page-variant"
          text={t('home.bodySectionDoc')}
          accent={colors.info}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {bodyParts.map(({ bodyPart, count }) => (
            <View key={bodyPart} style={styles.chipWrap}>
              <BodyPartChip
                bodyPart={bodyPart}
                count={count}
                selected={selectedBodyPart === bodyPart}
                onPress={onBodyPartPress}
              />
            </View>
          ))}
        </ScrollView>

        {/* EQUIPMENT FILTERS */}
        <SlabDivider accent={colors.primary} />
        <SectionHeader
          title={t('home.equipmentSectionTitle')}
          icon="dumbbell"
          accent={colors.info}
          note={t('home.equipmentSectionNote')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {topEquipments.map(({ equipment, count }) => (
            <View key={equipment} style={styles.chipWrap}>
              <EquipmentChip
                equipment={equipment}
                count={count}
                selected={selectedEquipment === equipment}
                onPress={onEquipmentPress}
              />
            </View>
          ))}
        </ScrollView>

        {/* EXERCISE PREVIEW */}
        <SlabDivider accent={hasFilter ? colors.accent : colors.primary} />
        <View style={styles.previewHeader}>
          <SectionHeader
            title={
              hasFilter
                ? `${t('home.previewFiltered')} (${filtered.length})`
                : `${t('home.previewAll')} (${total})`
            }
            icon={hasFilter ? 'crosshairs-gps' : 'format-list-bulleted-square'}
            accent={hasFilter ? colors.accent : colors.primary}
            inline
          />
          <PressableScale onPress={handleSeeAll} hitSlop={6} style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>{t('home.seeAll')}</Text>
            <Icon name="arrow-right" size={14} color={colors.primary} />
          </PressableScale>
        </View>

        {previewExercises.length === 0 ? (
          <EmptyState
            icon="magnify-close"
            title={t('home.emptyTitle')}
            desc={t('home.emptyDesc')}
          />
        ) : (
          <View style={styles.previewGrid}>
            {previewExercises.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} grid compact showFavorite={false} />
            ))}
          </View>
        )}

        <View style={styles.bottomInset} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: layout.paddingHorizontal,
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  brandLine: {
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  helloText: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 34,
    color: colors.textPrimary,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.sm,
    flexShrink: 0,
  },
  ctaBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  ctaIconTray: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIconTrayActive: {
    backgroundColor: colors.textInverse + '20',
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  ctaTextActive: {
    color: colors.textInverse,
  },
  horizontalList: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.lg,
    marginBottom: spacing.lg,
  },
  chipWrap: {
    marginRight: spacing.sm,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  // Spacer utilities (inline style extraction)
  gapLg: {
    height: spacing.lg,
  },
  bottomInset: {
    height: layout.tabBarHeight + spacing.xxl,
  },
});
