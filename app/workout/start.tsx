import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { safeHaptic } from '@/utils/haptic';
import { formatDurationClock } from '@/utils/format';
import { useThemeColors, typography, spacing, radius, layout } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { getAllExercisesSync } from '@/data/queries';
import {
  getImageUrl,
  BODY_PART_LABELS,
  labelForBodyPart,
  labelForEquipment,
  iconForBodyPart,
  iconForEquipment,
  displayNameZh,
} from '@/constants';
import type { WorkoutExercise, WorkoutSet, Exercise } from '@/types';
import { Icon, PressableScale, SearchBar } from '@/components/UIKit';

export default function WorkoutStartScreen() {
  const { t, i18n } = useTranslation();
  const effectiveLang: 'zh' | 'en' = i18n.language?.startsWith('en') ? 'en' : 'zh';
  const router = useRouter();
  const colors = useThemeColors();
  const activeWorkout = useAppStore((s) => s.activeWorkout);
  const settings = useAppStore((s) => s.settings);
  const endWorkout = useAppStore((s) => s.endWorkout);
  const cancelWorkout = useAppStore((s) => s.cancelWorkout);
  const addExerciseToActive = useAppStore((s) => s.addExerciseToActive);
  const removeExerciseFromActive = useAppStore(
    (s) => s.removeExerciseFromActive
  );
  const addSetToExercise = useAppStore((s) => s.addSetToExercise);
  const removeSet = useAppStore((s) => s.removeSet);
  const updateSet = useAppStore((s) => s.updateSet);

  const [elapsed, setElapsed] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [restLeft, setRestLeft] = useState(settings.defaultRestSeconds);
  const [note, setNote] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  // Guard against double `router.back()` when cancel button's explicit pop
  // coincides with the `activeWorkout`-change effect.  See effect below.
  const navPoppedRef = useRef(false);
  // When user navigates FORWARD into this screen, reset the guard so the
  // next cancellation cycle through `handleCancel` is protected again.
  useEffect(() => {
    navPoppedRef.current = false;
  }, []);

  const allExercises = useMemo(() => getAllExercisesSync(), []);
  const exMap = useMemo(
    () => new Map(allExercises.map((e) => [e.id, e])),
    [allExercises]
  );

  useEffect(() => {
    if (!activeWorkout?.startedAt) return;
    const start = activeWorkout.startedAt;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [activeWorkout?.startedAt]);

  useEffect(() => {
    if (!restActive) return;
    if (restLeft <= 0) {
      safeHaptic('success');
      setRestActive(false);
      setRestLeft(settings.defaultRestSeconds);
      return;
    }
    const id = setTimeout(() => setRestLeft((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [restActive, restLeft, settings.defaultRestSeconds]);

  useEffect(() => {
    // Auto-navigate back when activeWorkout is cleared BUT ONLY if the clear
    // was triggered programmatically (endWorkout -> history push redirects,
    // cancelWorkout-from-deep-link-with-no-UI, etc.).  When the user cancels
    // from the header button, `handleCancel` calls `cancelWorkout` and then
    // `router.back()` explicitly.  Without this ref guard both the callback
    // AND this effect call `router.back()` — popping TWO screens instead of
    // one and dumping the user back at e.g. Profile instead of Workout tab.
    if (activeWorkout || navPoppedRef.current) return;
    navPoppedRef.current = true;
    router.back();
  }, [activeWorkout, router]);

  if (!activeWorkout) return null;

  // Memoize session aggregates across 1-second elapsed ticks.  The timer
  // effect bumps `elapsed` state every second — we don't want that tick to
  // trigger three full array traversals each pass.
  const { totalVolume, completedSets, totalSets } = useMemo(() => {
    let tv = 0;
    let cs = 0;
    let ts = 0;
    for (const e of activeWorkout.exercises) {
      ts += e.sets.length;
      for (const s of e.sets) {
        if (s.completed) {
          cs += 1;
          tv += (s.weight || 0) * (s.reps || 0);
        }
      }
    }
    return {
      totalVolume: tv,
      completedSets: cs,
      totalSets: ts,
    };
  }, [activeWorkout.exercises]);

  // Stabilize the PressableScale button callbacks so the components can
  // memoize correctly (each timer tick re-render no longer rebuilds these
  // anonymous function references).
  const startRest = useCallback(() => {
    safeHaptic('light');
    setRestLeft(settings.defaultRestSeconds);
    setRestActive(true);
  }, [settings.defaultRestSeconds]);

  const skipRest = useCallback(() => {
    safeHaptic('light');
    setRestActive(false);
    setRestLeft(settings.defaultRestSeconds);
  }, [settings.defaultRestSeconds]);

  const openPicker = useCallback(() => {
    safeHaptic('medium');
    setPickerOpen(true);
    setPickerQuery('');
  }, []);

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const handleFinish = () => {
    safeHaptic('success');
    const result = endWorkout(note.trim().length > 0 ? note : undefined);
    if (result) {
      // Alert TITLE is `doneTitle` ("Session complete!"), NOT the short
      // `workoutSession.done` action-button label we reuse elsewhere.
      Alert.alert(t('workoutSession.doneTitle'), `${t('workout.statsVolume')}: ${Math.round(totalVolume)} ${settings.units}`, [
        { text: t('workout.historyTitle'), onPress: () => {
          // Prevent redundant back() pop from activeWorkout effect: we're
          // replacing the whole stack to /(tabs)/workout so the back guard
          // must be set before endWorkout's state update triggers the effect.
          navPoppedRef.current = true;
          router.replace('/(tabs)/workout' as Parameters<typeof router.replace>[0]);
        } },
      ]);
    } else {
      // Alert TITLE is the semantic `emptyFinishTitle` ("No sets completed"),
      // not the generic `common.confirm` header that was being reused here
      // (which read as confusing inside EN/ja locales — "Confirm" what?).
      Alert.alert(t('workoutSession.emptyFinishTitle'), t('workoutSession.emptyDesc'), [
        { text: t('workout.restNext') },
        {
          text: t('workoutSession.cancel'),
          style: 'destructive',
          onPress: () => {
            // ------------------------------------------------------------
            // RACE FIX: earlier version here called cancelWorkout + back()
            // WITHOUT setting the ref guard — the activeWorkout-change
            // effect ALSO called router.back() resulting in a DOUBLE pop
            // that booted the user all the way back to Profile instead of
            // the Workout tab.  Always lock the guard BEFORE clearing.
            // ------------------------------------------------------------
            navPoppedRef.current = true;
            cancelWorkout();
            router.back();
          },
        },
      ]);
    }
  };

  const handleCancel = () => {
    // Cancelling a session: use the purpose-built cancel-warning key so the
    // dialog copy stays correct across locales (no auto-slicing of unrelated
    // settings text — previously resetAllConfirm was sliced to 12 chars which
    // made no semantic sense in EN/ja and truncated mid-word in ZH).
    Alert.alert(t('workoutSession.cancelConfirm'), t('session.cancelProgressWarn'), [
      { text: t('workout.restNext'), style: 'cancel' },
      {
        text: t('workoutSession.cancel'),
        style: 'destructive',
        onPress: () => {
          // Set ref FIRST before cancelling so the activeWorkout-watching
          // effect above skips its redundant `router.back()`.  Order matters:
          // cancelWorkout mutates zustand, which re-renders and fires the
          // effect synchronously in the same microtask on the next paint.
          navPoppedRef.current = true;
          cancelWorkout();
          router.back();
        },
      },
    ]);
  };

  const pickerResults = useMemo(() => {
    if (!pickerOpen) return [];
    const q = pickerQuery.trim().toLowerCase();
    let list = allExercises;
    if (q.length > 0) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.name_zh && e.name_zh.toLowerCase().includes(q)) ||
          e.target.toLowerCase().includes(q) ||
          (e.muscle_group || '').toLowerCase().includes(q) ||
          (e.instructions?.zh && String(e.instructions.zh).includes(pickerQuery.trim()))
      );
    }
    return list.slice(0, 50);
  }, [allExercises, pickerQuery, pickerOpen]);

  // Stable picker-item select: always checks `already` via fresh snapshot.
  // Using useCallback here flattens re-render churn on every keystroke in the
  // picker's search input (which was rebuilding 50 closures at a time).
  const handlePickExercise = useCallback(
    (exId: string) => {
      const active = useAppStore.getState().activeWorkout;
      if (!active) return;
      if (active.exercises.some((e) => e.exerciseId === exId)) return;
      safeHaptic('light');
      addExerciseToActive(exId);
      setPickerOpen(false);
    },
    [addExerciseToActive]
  );

  // ====== Theme-aware styles ======
  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    headerCancel: {
      color: colors.textSecondary,
      fontWeight: '700',
    },
    summaryBar: {
      flexDirection: 'row',
      paddingHorizontal: layout.paddingHorizontal,
      paddingVertical: spacing.md,
      gap: spacing.sm,
      backgroundColor: colors.bg,
    },
    restAccentDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    restBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: layout.paddingHorizontal,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    restIconTray: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.info + '18',
    },
    restBarText: {
      ...typography.bodyBold,
      color: colors.textSecondary,
      flex: 1,
    },
    restBarActive: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: layout.paddingHorizontal,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.accent + '14',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.accent + '55',
      gap: spacing.md,
    },
    restLabel: {
      ...typography.captionBold,
      color: colors.accent,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    restTimer: {
      ...typography.display,
      fontSize: 24,
      color: colors.accent,
      flex: 1,
      fontVariant: ['tabular-nums'],
      fontWeight: '900',
    },
    restSkipBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      backgroundColor: colors.accent + '22',
      borderWidth: 1,
      borderColor: colors.accent + '33',
    },
    restSkipText: {
      ...typography.captionBold,
      color: colors.accent,
    },
    content: {
      paddingHorizontal: layout.paddingHorizontal,
      paddingTop: spacing.xs,
    },
    emptyWrap: {
      padding: spacing.xxxl,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      marginTop: spacing.md,
    },
    emptyIconTray: {
      width: 64,
      height: 64,
      borderRadius: radius.lg,
      backgroundColor: colors.primary + '16',
      borderWidth: 1,
      borderColor: colors.primaryStroke,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    emptyTitle: {
      ...typography.h3,
      color: colors.textPrimary,
    },
    emptyDesc: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 260,
    },
    noteCard: {
      marginTop: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      padding: spacing.lg,
    },
    noteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    noteIconTray: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.info + '16',
    },
    noteHeaderBody: {
      flex: 1,
    },
    bottomContentInset: {
      height: 180,
    },
    noteTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    noteSub: {
      ...typography.small,
      color: colors.textTertiary,
    },
    noteInput: {
      color: colors.textPrimary,
      ...typography.body,
      minHeight: 72,
      textAlignVertical: 'top',
      padding: spacing.md,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.md,
    },
    bottomBar: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: layout.paddingHorizontal,
      paddingTop: spacing.md,
      paddingBottom: layout.safeBottom + spacing.md,
      backgroundColor: colors.bg,
      borderTopWidth: 1,
      borderTopColor: colors.surfaceBorder,
    },
    addBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      height: 56,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary + '66',
    },
    addBtnIconTray: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnText: {
      ...typography.bodyBold,
      color: colors.primary,
      letterSpacing: 0.2,
    },
    finishBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      height: 56,
      borderRadius: radius.lg,
      backgroundColor: colors.primary,
    },
    finishBtnDisabled: {
      backgroundColor: colors.surfaceElevated,
      opacity: 0.5,
    },
    finishBtnText: {
      ...typography.bodyBold,
      color: colors.textInverse,
      letterSpacing: 0.3,
    },
    modalScreen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: layout.paddingHorizontal,
      paddingVertical: spacing.md,
    },
    modalCancel: {
      ...typography.bodyBold,
      color: colors.textSecondary,
      width: 50,
    },
    modalTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    modalTitle: {
      ...typography.h3,
      color: colors.textPrimary,
    },
    pickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    pickerImgWrap: {
      width: 56,
      height: 56,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 2,
      overflow: 'hidden',
    },
    pickerImg: {
      width: '100%',
      height: '100%',
    },
    pickerName: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    pickerMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
    },
    pickerAddBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary + '18',
      borderWidth: 1,
      borderColor: colors.primary + '44',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.sm,
    },
    modalHeaderSpacer: { width: 50 },
    modalSearchWrap: {
      paddingHorizontal: layout.paddingHorizontal,
    },
    modalList: { flex: 1 },
    modalListContent: {
      paddingHorizontal: layout.paddingHorizontal,
      paddingVertical: spacing.md,
    },
    pickerItemDisabled: { opacity: 0.5 },
    pickerItemBody: {
      flex: 1,
      marginLeft: spacing.md,
    },
    pickerAddBtnActive: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    modalEmptyWrap: {
      padding: spacing.xxxl,
      alignItems: 'center',
      gap: spacing.sm,
    },
    modalEmptyTitle: {
      ...typography.h3,
      color: colors.textPrimary,
    },
    modalEmptyDesc: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    modalEmptyIcon: {
      width: 58,
      height: 58,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
  }), [colors]);

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: `${t('workout.titleActive')}  ${formatDurationClock(elapsed)}`,
          headerTintColor: colors.accent,
          headerLeft: () => (
            <Pressable onPress={handleCancel}>
              <Text style={styles.headerCancel}>
                {t('workoutSession.cancel')}
              </Text>
            </Pressable>
          ),
        }}
      />

      <SafeAreaView style={styles.screen} edges={['bottom']}>
        {/* SUMMARY BAR */}
        <View style={styles.summaryBar}>
          <SummaryPill
            label={t('workout.statsVolume')}
            value={`${Math.round(totalVolume)}`}
            unit={settings.units}
            icon="weight-kilogram"
            accent={colors.primary}
          />
          <SummaryPill
            label={t('compact.headerDone')}
            value={`${completedSets}/${totalSets}`}
            unit={t('compact.unitSets')}
            icon="check-all"
            accent={colors.success}
          />
          <SummaryPill
            label={t('compact.rest')}
            value={formatDurationClock(elapsed)}
            icon="av-timer"
            accent={colors.info}
          />
        </View>

        {/* REST TIMER */}
        {restActive ? (
          <View style={styles.restBarActive}>
            <View style={[styles.restAccentDot, { backgroundColor: colors.accent }]} />
            <Text style={styles.restLabel}>{t('workoutSession.restTitle')}</Text>
            <Text style={styles.restTimer}>{restLeft}s</Text>
            <PressableScale onPress={skipRest} style={styles.restSkipBtn} scaleTo={0.96}>
              <Text style={styles.restSkipText}>{t('workoutSession.restSkip')}</Text>
              <Icon name="arrow-right" size={12} color={colors.accent} />
            </PressableScale>
          </View>
        ) : (
          <PressableScale
            onPress={startRest}
            style={styles.restBar}
            scaleTo={0.985}
          >
            <View style={[styles.restIconTray, { backgroundColor: colors.info + '18' }]}>
              <Icon name="timer-sand" size={16} color={colors.info} />
            </View>
            <Text style={styles.restBarText}>
              {`${t('workoutSession.restTitle')} (${settings.defaultRestSeconds}s)`}
            </Text>
            <Icon name="chevron-right" size={14} color={colors.textTertiary} />
          </PressableScale>
        )}

        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {activeWorkout.exercises.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconTray}>
                <Icon name="weight-lifter" size={34} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>{t('workoutSession.newSession')}</Text>
              <Text style={styles.emptyDesc}>
                {t('workoutSession.emptyDesc')}
              </Text>
            </View>
          ) : (
            activeWorkout.exercises.map((we) => (
              <ExerciseBlock
                key={we.exerciseId}
                exercise={exMap.get(we.exerciseId)}
                workoutExercise={we}
                units={settings.units}
                t={t}
                onAddSet={() => addSetToExercise(we.exerciseId)}
                onRemoveSet={(setId) => removeSet(we.exerciseId, setId)}
                onUpdateSet={(setId, patch) => updateSet(we.exerciseId, setId, patch)}
                onRemove={() => removeExerciseFromActive(we.exerciseId)}
              />
            ))
          )}

          {/* Note */}
          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <View style={styles.noteIconTray}>
                <Icon name="notebook-edit-outline" size={16} color={colors.info} />
              </View>
              <View style={styles.noteHeaderBody}>
                <Text style={styles.noteTitle}>{t('workout.historyTitle') + ' · ' + t('compact.instrHeader')}</Text>
                <Text style={styles.noteSub}>{t('chips.recent')}</Text>
              </View>
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              style={styles.noteInput}
              placeholder={t('home.searchPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              multiline
            />
          </View>

          <View style={styles.bottomContentInset} />
        </ScrollView>

        {/* BOTTOM ACTIONS */}
        <View style={styles.bottomBar}>
          <PressableScale
            onPress={openPicker}
            style={styles.addBtn}
            scaleTo={0.98}
          >
            <View style={styles.addBtnIconTray}>
              <Icon name="plus" size={18} color={colors.primary} />
            </View>
            <Text style={styles.addBtnText}>{t('workoutSession.addExercise')}</Text>
          </PressableScale>

          <PressableScale
            onPress={handleFinish}
            style={[
              styles.finishBtn,
              totalSets === 0 && styles.finishBtnDisabled,
            ]}
            scaleTo={0.98}
          >
            <Icon name="flag-checkered" size={18} color={colors.textInverse} />
            <Text style={styles.finishBtnText}>{t('workoutSession.done')}</Text>
          </PressableScale>
        </View>

        {/* EXERCISE PICKER MODAL */}
        <Modal
          visible={pickerOpen}
          animationType="slide"
          onRequestClose={closePicker}
        >
          <SafeAreaView style={styles.modalScreen}>
            <View style={styles.modalHeader}>
              <PressableScale onPress={closePicker} hitSlop={8} scaleTo={0.96}>
                <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
              </PressableScale>
              <View style={styles.modalTitleWrap}>
                <Icon name="clipboard-list-outline" size={14} color={colors.primary} />
                <Text style={styles.modalTitle}>{t('workoutSession.addExercise')}</Text>
              </View>
              <View style={styles.modalHeaderSpacer} />
            </View>

            <View style={styles.modalSearchWrap}>
              <SearchBar
                value={pickerQuery}
                onChange={setPickerQuery}
                placeholder={t('home.searchPlaceholder')}
              />
            </View>

            <ScrollView
              style={styles.modalList}
              contentContainerStyle={styles.modalListContent}
            >
              {pickerResults.map((ex) => {
                const already = activeWorkout.exercises.some(
                  (e) => e.exerciseId === ex.id
                );
                const muscleColor =
                  colors.muscle[ex.body_part as keyof typeof colors.muscle] ||
                  colors.primary;
                return (
                  <PressableScale
                    key={ex.id}
                    onPress={() => handlePickExercise(ex.id)}
                    style={[
                      styles.pickerItem,
                      already && styles.pickerItemDisabled,
                    ]}
                  >
                    <View style={[styles.pickerImgWrap, { borderColor: muscleColor + '55' }]}>
                      <Image
                        source={getImageUrl(ex.image)}
                        style={styles.pickerImg}
                        contentFit="cover"
                      />
                    </View>
                    <View style={styles.pickerItemBody}>
                      <Text style={styles.pickerName} numberOfLines={1}>
                        {effectiveLang === 'zh' ? displayNameZh(ex) : ex.name}
                      </Text>
                      <View style={styles.pickerMetaRow}>
                        <MiniTag
                          icon={iconForBodyPart(ex.body_part)}
                          label={labelForBodyPart(ex.body_part, effectiveLang)}
                          color={muscleColor}
                        />
                        <MiniTag
                          icon={iconForEquipment(ex.equipment)}
                          label={labelForEquipment(ex.equipment, effectiveLang)}
                          color={colors.info}
                        />
                      </View>
                    </View>
                    <View style={[
                      styles.pickerAddBtn,
                      already && styles.pickerAddBtnActive,
                    ]}>
                      <Icon
                        name={already ? 'check' : 'plus'}
                        size={16}
                        color={already ? colors.textInverse : colors.primary}
                      />
                    </View>
                  </PressableScale>
                );
              })}
              {pickerResults.length === 0 && (
                <View style={styles.modalEmptyWrap}>
                  <View style={styles.modalEmptyIcon}>
                    <Icon name="magnify-close" size={28} color={colors.textTertiary} />
                  </View>
                  <Text style={styles.modalEmptyTitle}>
                    {t('home.emptyTitle')}
                  </Text>
                  <Text style={styles.modalEmptyDesc}>
                    {t('home.emptyDesc')}
                  </Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </>
  );
}

// ============================
// Sub components
// ============================
function SummaryPill({
  label,
  value,
  unit,
  icon,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: string;
  accent: string;
}) {
  const colors = useThemeColors();
  const pillStyles = useMemo(() => StyleSheet.create({
    wrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    iconTray: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      marginLeft: 8,
      flex: 1,
    },
    value: {
      ...typography.mono,
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '800',
    },
    unit: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textTertiary,
    },
    label: {
      ...typography.small,
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 2,
    },
  }), [colors]);
  return (
    <View style={pillStyles.wrap}>
      <View style={[pillStyles.iconTray, { backgroundColor: accent + '18' }]}>
        <Icon name={icon} size={13} color={accent} />
      </View>
      <View style={pillStyles.body}>
        <Text style={pillStyles.value}>
          {value}
          {unit ? <Text style={pillStyles.unit}> {unit}</Text> : null}
        </Text>
        <Text style={pillStyles.label}>{label}</Text>
      </View>
    </View>
  );
}

function MiniTag({
  icon,
  label,
  color,
}: {
  icon: string;
  label: string;
  color: string;
}) {
  const mt = useMemo(() => StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
      marginRight: 6,
    },
    label: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.2,
      maxWidth: 100,
    },
  }), []);
  return (
    <View style={[mt.wrap, { backgroundColor: color + '12', borderColor: color + '30' }]}>
      <Icon name={icon} size={10} color={color} />
      <Text style={[mt.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function ExerciseBlock({
  exercise,
  workoutExercise,
  units,
  t,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onRemove,
}: {
  exercise: Exercise | undefined;
  workoutExercise: WorkoutExercise;
  units: 'kg' | 'lb';
  t: (k: string, opts?: any) => string;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onUpdateSet: (setId: string, patch: Partial<WorkoutSet>) => void;
  onRemove: () => void;
}) {
  const colors = useThemeColors();
  const { i18n } = useTranslation();
  const effectiveLang: 'zh' | 'en' = i18n.language?.startsWith('en') ? 'en' : 'zh';
  const exBlockStyles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    imgWrap: {
      width: 56,
      height: 56,
      borderRadius: radius.md,
      borderWidth: 2,
      overflow: 'hidden',
      backgroundColor: colors.surfaceElevated,
    },
    img: { width: '100%', height: '100%' },
    name: {
      ...typography.bodyBold,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    removeBtn: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      backgroundColor: colors.danger + '14',
      borderWidth: 1,
      borderColor: colors.danger + '30',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
      marginBottom: spacing.sm,
    },
    th: {
      ...typography.small,
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginHorizontal: 4,
      fontSize: 10,
      fontWeight: '800',
    },
    addSetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: radius.md,
      borderColor: colors.primary + '44',
      backgroundColor: colors.primary + '08',
    },
    addSetText: {
      ...typography.captionBold,
      color: colors.primary,
      letterSpacing: 0.3,
    },
  }), [colors]);

  const color = exercise
    ? colors.muscle[exercise.body_part as keyof typeof colors.muscle] || colors.primary
    : colors.primary;

  return (
    <View style={exBlockStyles.card}>
      <View style={exBlockStyles.header}>
        <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
          <View style={[exBlockStyles.imgWrap, { borderColor: color + '66' }]}>
            {exercise ? (
              <Image
                source={getImageUrl(exercise.image)}
                style={exBlockStyles.img}
                contentFit="cover"
              />
            ) : null}
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md, justifyContent: 'center' }}>
            <Text style={exBlockStyles.name} numberOfLines={1}>
              {exercise ? (effectiveLang === 'zh' ? displayNameZh(exercise) : exercise.name) : workoutExercise.exerciseId}
            </Text>
            <View style={exBlockStyles.metaRow}>
              <MiniTag
                icon={exercise ? iconForBodyPart(exercise.body_part) : 'target'}
                label={exercise ? labelForBodyPart(exercise.body_part) : t('common.noData')}
                color={color}
              />
              <MiniTag
                icon={exercise ? iconForEquipment(exercise.equipment) : 'help-circle'}
                label={exercise ? labelForEquipment(exercise.equipment) : t('common.noData')}
                color={colors.info}
              />
            </View>
          </View>
        </View>
        <PressableScale
          onPress={() => {
            safeHaptic('light');
            Alert.alert(t('workoutSession.removeExerciseTitle'), t('session.removeExerciseWarn'), [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('common.delete'),
                style: 'destructive',
                onPress: onRemove,
              },
            ]);
          }}
          hitSlop={6}
          style={exBlockStyles.removeBtn}
          scaleTo={0.92}
        >
          <Icon name="trash-can-outline" size={14} color={colors.danger} />
        </PressableScale>
      </View>

      <View style={exBlockStyles.tableHeader}>
        <Text style={[exBlockStyles.th, { width: 36, textAlign: 'center' }]}>SET</Text>
        <Text style={[exBlockStyles.th, { flex: 1 }]}>{units.toUpperCase()}</Text>
        <Text style={[exBlockStyles.th, { flex: 1 }]}>{t('compact.unitReps')}</Text>
        <View style={{ width: 36, alignItems: 'center' }}>
          <Icon name="check-bold" size={10} color={colors.textTertiary} />
        </View>
        <Text style={[exBlockStyles.th, { width: 30 }]} />
      </View>

      {workoutExercise.sets.map((set, idx) => (
        <SetRow
          key={set.id}
          index={idx}
          set={set}
          onToggleDone={() => {
            if (!set.completed) safeHaptic('light');
            onUpdateSet(set.id, { completed: !set.completed });
          }}
          onChangeWeight={(v) => onUpdateSet(set.id, { weight: v })}
          onChangeReps={(v) => onUpdateSet(set.id, { reps: v })}
          onRemove={() => onRemoveSet(set.id)}
        />
      ))}

      <PressableScale
        onPress={() => {
          safeHaptic('light');
          onAddSet();
        }}
        style={exBlockStyles.addSetBtn}
        scaleTo={0.98}
      >
        <Icon name="plus" size={14} color={colors.primary} />
        <Text style={exBlockStyles.addSetText}>{t('workoutSession.addSet')}</Text>
      </PressableScale>
    </View>
  );
}

function SetRow({
  index,
  set,
  onToggleDone,
  onChangeWeight,
  onChangeReps,
  onRemove,
}: {
  index: number;
  set: WorkoutSet;
  onToggleDone: () => void;
  onChangeWeight: (v: number) => void;
  onChangeReps: (v: number) => void;
  onRemove: () => void;
}) {
  const colors = useThemeColors();
  const setRowStyles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.xs,
      marginBottom: spacing.xs,
    },
    rowDone: {
      opacity: 0.75,
    },
    index: {
      ...typography.captionBold,
      color: colors.textSecondary,
    },
    inputFlex: {
      flex: 1,
    },
    checkBtn: {
      height: 36,
      borderRadius: radius.sm,
      marginHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    checkBtnDone: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    deleteBtn: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  }), [colors]);
  return (
    <View
      style={[
        setRowStyles.row,
        set.completed && setRowStyles.rowDone,
      ]}
    >
      <Text
        style={[
          setRowStyles.index,
          { width: 36, textAlign: 'center' },
          set.completed && { color: colors.textTertiary },
        ]}
      >
        {index + 1}
      </Text>

      <NumInput
        value={set.weight}
        onChange={onChangeWeight}
        style={setRowStyles.inputFlex}
        highlight={set.completed}
      />
      <NumInput
        value={set.reps}
        onChange={onChangeReps}
        style={setRowStyles.inputFlex}
        highlight={set.completed}
      />

      <PressableScale
        onPress={onToggleDone}
        style={[
          setRowStyles.checkBtn,
          set.completed && setRowStyles.checkBtnDone,
          { width: 36 },
        ]}
        scaleTo={0.92}
      >
        {set.completed ? (
          <Icon name="check" size={14} color={colors.textInverse} />
        ) : null}
      </PressableScale>

      <PressableScale
        onPress={onRemove}
        style={[setRowStyles.deleteBtn, { width: 30 }]}
        hitSlop={4}
        scaleTo={0.9}
      >
        <Icon name="close" size={12} color={colors.textTertiary} />
      </PressableScale>
    </View>
  );
}

function NumInput({
  value,
  onChange,
  style,
  highlight,
}: {
  value: number;
  onChange: (v: number) => void;
  style?: any;
  highlight?: boolean;
}) {
  const colors = useThemeColors();
  const numInp = useMemo(() => StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.sm,
      overflow: 'hidden',
      height: 36,
      marginHorizontal: 4,
    },
    btn: {
      width: 28,
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      height: '100%',
      textAlign: 'center',
      color: colors.textPrimary,
      ...typography.mono,
      fontSize: 14,
      padding: 0,
      minWidth: 36,
    },
    inputDone: {
      color: colors.primary,
      fontWeight: '800',
    },
  }), [colors]);
  return (
    <View style={[numInp.wrap, style]}>
      <PressableScale
        onPress={() => {
          safeHaptic('light');
          onChange(Math.max(0, (value || 0) - (value >= 20 ? 5 : 2.5)));
        }}
        style={numInp.btn}
        scaleTo={0.92}
      >
        <Icon name="minus" size={12} color={colors.textSecondary} />
      </PressableScale>
      <TextInput
        value={value ? String(value) : ''}
        onChangeText={(t) => {
          const n = parseFloat(t) || 0;
          onChange(n >= 0 ? n : 0);
        }}
        keyboardType="numeric"
        style={[
          numInp.input,
          highlight && numInp.inputDone,
        ]}
        placeholder="0"
        placeholderTextColor={colors.textTertiary}
      />
      <PressableScale
        onPress={() => {
          safeHaptic('light');
          onChange((value || 0) + (value >= 20 ? 5 : 2.5));
        }}
        style={numInp.btn}
        scaleTo={0.92}
      >
        <Icon name="plus" size={12} color={colors.textSecondary} />
      </PressableScale>
    </View>
  );
}

// ============================================================
// End of file (all styles moved into components via useMemo + useThemeColors)
// ============================================================
