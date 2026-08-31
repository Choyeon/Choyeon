import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { colors, spacing, radius, layout } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { normalizeLanguage } from '@/i18n';
import type { LanguageCode, WeightUnit } from '@/types';
import {
  PressableScale,
  Icon,
  SlabDivider,
  MiniStat,
  CategoryInfoNote,
  OptionPicker,
} from '@/components/UIKit';
import type { OptionPickerOption } from '@/components/UIKit';
import { safeHaptic } from '@/utils/haptic';
import { formatCompactCount } from '@/utils/format';

// APP_VERSION is read from expo-constants manifest at runtime so this file
// never drifts again.  The static literal here is used ONLY as a fallback
// when Constants.expoConfig is unavailable (rare — only in unit tests).
const APP_VERSION =
  (Constants.expoConfig?.version as string | undefined) ??
  (Constants.manifest?.version as string | undefined) ??
  '1.0.7';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  // Granular subscriptions — only primitive/array references, not the whole
  // store.  Derived figures (exercises/sets/volume/streak) are recomputed via
  // useMemo only when `workouts` reference changes.
  const workouts = useAppStore((s) => s.workouts);
  const favoriteIds = useAppStore((s) => s.favoriteIds);
  const resetAllData = useAppStore((s) => s.resetAllData);

  // ----------------------------------------------------------
  // Derived stats — computed once per `workouts` reference change.
  // This previously computed values on every render (including unrelated
  // updates like i18n language switching and settings toggles).  Putting
  // all figures (totalWorkouts/totalExercises/totalSets/totalVolume/streak)
  // into a single memoized bundle avoids duplicate work.
  // ----------------------------------------------------------
  const {
    totalWorkouts,
    totalExercises,
    totalSets,
    totalVolume,
    streak,
  } = useMemo(() => {
    const store = useAppStore.getState();
    let volAcc = 0;
    let setAcc = 0;
    const exerAcc = workouts.reduce((n, w) => n + w.exercises.length, 0);
    for (const w of workouts) {
      for (const e of w.exercises) {
        for (const set of e.sets) {
          if (set.completed) {
            volAcc += (set.weight || 0) * (set.reps || 0);
            setAcc += 1;
          }
        }
      }
    }
    return {
      totalWorkouts: workouts.length,
      totalExercises: exerAcc,
      totalSets: setAcc,
      totalVolume: Math.round(volAcc),
      // Streak math lives only in the store to guarantee the same
      // "yesterday grace" semantics as the Workout tab; avoids the earlier
      // drift where Profile & Workout showed different streak numbers.
      streak: store.streakDays(),
    };
  }, [workouts]);

  // ----------------------------------------------------------
  // OptionPicker (Modal) visibility — only ONE picker open at a time.
  // Replaces the previous 4 "Pressable cycles next in list" interactions
  // which were undiscoverable (3+ value options) and couldn't be
  // screen-read as lists.  Stable callbacks wrapped in useCallback so
  // SettingRow props don't churn re-renders on every state tick.
  // ----------------------------------------------------------
  type PickerKind = 'lang' | 'units' | 'theme' | 'rest' | null;
  const [pickerOpen, setPickerOpen] = useState<PickerKind>(null);
  const closePicker = useCallback(() => setPickerOpen(null), []);
  const openPicker = useCallback((k: Exclude<PickerKind, null>) => {
    safeHaptic('light');
    setPickerOpen(k);
  }, []);

  const toggleKey = useCallback(
    (key: 'restTimerEnabled' | 'autoRest' | 'saveHistory' | 'hapticFeedback') => {
      safeHaptic('light');
      setSettings({ [key]: !settings[key] });
    },
    [setSettings, settings]
  );

  const applyUnits = useCallback(
    (next: WeightUnit) => {
      safeHaptic('light');
      setSettings({ units: next });
      closePicker();
    },
    [setSettings, closePicker]
  );

  const applyLang = useCallback(
    (next: LanguageCode) => {
      safeHaptic('light');
      setSettings({ language: next });
      closePicker();
    },
    [setSettings, closePicker]
  );

  const applyTheme = useCallback(
    (next: 'dark' | 'light' | 'system') => {
      safeHaptic('light');
      setSettings({ theme: next });
      closePicker();
    },
    [setSettings, closePicker]
  );

  const applyRestSeconds = useCallback(
    (next: number) => {
      safeHaptic('light');
      setSettings({ defaultRestSeconds: next });
      closePicker();
    },
    [setSettings, closePicker]
  );

  const handleReset = () => {
    Alert.alert(t('profile.resetAll'), t('profile.resetAllConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.reset'),
        style: 'destructive',
        onPress: () => {
          safeHaptic('warning');
          resetAllData();
        },
      },
    ]);
  };

  // Use normalizeLanguage so locale codes like zh-CN / en-US correctly map to
  // our canonical {zh,en}.  Previous ==='en' check produced wrong label for
  // any regional variant i18next picked up from expo-localization.
  //
  // NOTE: the displayed option uses the CANONICAL normalized language value
  // (not `settings.language`) so even if an older migration wrote 'zh-CN'
  // into storage, the picker still highlights the correct radio entry.
  const currentLang: LanguageCode = normalizeLanguage(
    i18n.language ?? settings.language
  );
  const volumeUnitLabel = useMemo(
    () => (settings.units === 'kg' ? t('workout.unitVolumeKg') : t('workout.unitVolumeLb')),
    [settings.units, t]
  );

  // Picker option arrays — memoized so <OptionPicker /> doesn't churn
  // selected-flag re-renders on each screen render.  Sub-labels provide
  // extra context for accessibility and longer option labels.
  const langOptions: OptionPickerOption<LanguageCode>[] = useMemo(
    () => [
      { value: 'zh', label: t('profile.languageZh'), sublabel: t('profile.optionLangZhSublabel') },
      { value: 'en', label: t('profile.languageEn'), sublabel: t('profile.optionLangEnSublabel') },
    ],
    [t]
  );

  const unitsOptions: OptionPickerOption<WeightUnit>[] = useMemo(
    () => [
      { value: 'kg', label: t('profile.unitsKg'), sublabel: t('profile.optionUnitsKgSublabel') },
      { value: 'lb', label: t('profile.unitsLb'), sublabel: t('profile.optionUnitsLbSublabel') },
    ],
    [t]
  );

  const themeOptions: OptionPickerOption<'dark' | 'light' | 'system'>[] = useMemo(
    () => [
      { value: 'dark', label: t('profile.themeDark'), sublabel: t('profile.optionThemeDarkSublabel') },
      { value: 'light', label: t('profile.themeLight'), sublabel: t('profile.optionThemeLightSublabel') },
      { value: 'system', label: t('profile.themeSystem'), sublabel: t('profile.optionThemeSystemSublabel') },
    ],
    [t]
  );

  const restOptions: OptionPickerOption<number>[] = useMemo(
    () => [
      { value: 60,  label: `60${t('profile.unitRestSeconds')}`,  sublabel: t('profile.optionRest60Sublabel')  },
      { value: 75,  label: `75${t('profile.unitRestSeconds')}`,  sublabel: t('profile.optionRest75Sublabel')  },
      { value: 90,  label: `90${t('profile.unitRestSeconds')}`,  sublabel: t('profile.optionRest90Sublabel')  },
      { value: 120, label: `120${t('profile.unitRestSeconds')}`, sublabel: t('profile.optionRest120Sublabel') },
      { value: 180, label: `180${t('profile.unitRestSeconds')}`, sublabel: t('profile.optionRest180Sublabel') },
    ],
    [t]
  );

  const langCurrentLabel = useMemo(
    () => (currentLang === 'zh' ? t('profile.languageZh') : t('profile.languageEn')),
    [currentLang, t]
  );

  const unitsCurrentLabel = useMemo(
    () => (settings.units === 'kg' ? t('profile.unitsKg') : t('profile.unitsLb')),
    [settings.units, t]
  );

  const themeCurrentLabel = useMemo(
    () =>
      settings.theme === 'dark'
        ? t('profile.themeDark')
        : settings.theme === 'light'
          ? t('profile.themeLight')
          : t('profile.themeSystem'),
    [settings.theme, t]
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER / PROFILE */}
        <View style={styles.header}>
          <Text style={styles.brandLine}>PROFILE</Text>
          <Text style={styles.title}>{t('profile.title')}</Text>
        </View>

        {/* PROFILE HERO */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.avatarTray}>
              <Icon name="dumbbell" size={28} color={colors.primary} />
            </View>
            <View style={styles.heroLeftCol}>
              <Text style={styles.heroName}>{t('app.title')}</Text>
              <Text style={styles.heroSubtitle}>
                {t('profile.athleteTagline')}
              </Text>
            </View>
            <View style={styles.heroRank}>
              <Text style={styles.heroRankVal}>{streak}</Text>
              <Text style={styles.heroRankLabel}>{t('profile.statStreak')}</Text>
            </View>
          </View>
          <View style={styles.gapMd} />
          <View style={styles.heroStats}>
            <MiniStat
              label={t('profile.statSessions')}
              value={`${totalWorkouts}`}
              unit={t('profile.statUnits')}
              icon="dumbbell"
              iconColor={colors.primary}
            />
            <MiniStat
              label={t('profile.statExercises')}
              value={`${totalExercises}`}
              unit={t('profile.statUnits')}
              icon="arm-flex-outline"
              iconColor={colors.muscle.chest}
            />
            <MiniStat
              label={t('profile.statSets')}
              value={`${totalSets}`}
              unit={t('profile.statUnitReps')}
              icon="checkbox-marked-circle-outline"
              iconColor={colors.success}
            />
            <MiniStat
              label={t('profile.statFavorites')}
              value={`${favoriteIds.length}`}
              unit={t('profile.statUnitFav')}
              icon="heart-outline"
              iconColor={colors.accent}
            />
          </View>
          <View style={styles.gapMd} />
          <CategoryInfoNote
            icon="lightning-bolt"
            text={`${t('workout.statsVolume')} · ${formatCompactCount(totalVolume)} ${volumeUnitLabel}`}
            accent={colors.primary}
          />
        </View>

        {/* =================== SETTINGS =================== */}
        <SlabDivider accent={colors.primary} />
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('profile.sectionGeneral')}</Text>
          <Text style={styles.sectionCount}>
            <Icon name="cog" size={10} color={colors.textTertiary} /> {t('profile.version')} {APP_VERSION}
          </Text>
        </View>

        <SettingRow
          icon="translate"
          label={t('profile.language')}
          desc={t('profile.languageDesc')}
          accent={colors.info}
          right={
            <PressableScale onPress={() => openPicker('lang')} style={styles.pillBtn}>
              <Text style={[styles.pillBtnLabel, styles.pillInfoAccent]}>
                {langCurrentLabel}
              </Text>
              <Icon name="chevron-right" size={11} color={colors.info} />
            </PressableScale>
          }
        />

        <SettingRow
          icon="weight-kilogram"
          label={t('profile.units')}
          desc={t('profile.unitsDesc')}
          accent={colors.primary}
          right={
            <PressableScale onPress={() => openPicker('units')} style={styles.pillBtn}>
              <Text style={[styles.pillBtnLabel, styles.pillPrimaryAccent]}>
                {unitsCurrentLabel}
              </Text>
              <Icon name="chevron-right" size={11} color={colors.primary} />
            </PressableScale>
          }
        />

        <SettingRow
          icon="theme-light-dark"
          label={t('profile.appearance')}
          desc={t('profile.themeDesc')}
          accent={colors.muscle.shoulders}
          right={
            <PressableScale onPress={() => openPicker('theme')} style={styles.pillBtn}>
              <Text style={styles.pillBtnLabel}>
                {themeCurrentLabel}
              </Text>
              <Icon name="chevron-right" size={11} color={colors.textSecondary} />
            </PressableScale>
          }
        />

        {/* section: Training */}
        <SlabDivider accent={colors.muscle.back} />
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('profile.sectionTraining')}</Text>
          <Text style={styles.sectionCount}>
            <Icon name="clock-outline" size={10} color={colors.textTertiary} /> {settings.defaultRestSeconds}s
          </Text>
        </View>

        <SettingRow
          icon="timer-sand"
          label={t('profile.restTimerEnabled')}
          desc={t('profile.restTimerDesc')}
          accent={colors.accent}
          right={
            <Switch
              value={settings.restTimerEnabled}
              onValueChange={() => toggleKey('restTimerEnabled')}
              thumbColor={settings.restTimerEnabled ? colors.primary : colors.textTertiary}
              trackColor={{ false: colors.surfaceElevated, true: colors.primary + '66' }}
              ios_backgroundColor={colors.surfaceElevated}
            />
          }
        />

        <SettingRow
          icon="autorenew"
          label={t('profile.autoRest')}
          desc={t('profile.autoRestDesc')}
          accent={colors.success}
          right={
            <Switch
              value={settings.autoRest}
              onValueChange={() => toggleKey('autoRest')}
              thumbColor={settings.autoRest ? colors.success : colors.textTertiary}
              trackColor={{ false: colors.surfaceElevated, true: colors.success + '66' }}
              ios_backgroundColor={colors.surfaceElevated}
            />
          }
        />

        <SettingRow
          icon="content-save-outline"
          label={t('profile.saveHistory')}
          desc={t('profile.saveHistoryDesc')}
          accent={colors.info}
          right={
            <Switch
              value={settings.saveHistory}
              onValueChange={() => toggleKey('saveHistory')}
              thumbColor={settings.saveHistory ? colors.info : colors.textTertiary}
              trackColor={{ false: colors.surfaceElevated, true: colors.info + '66' }}
              ios_backgroundColor={colors.surfaceElevated}
            />
          }
        />

        <SettingRow
          icon="vibrate"
          label={t('profile.hapticFeedback')}
          desc={t('profile.hapticDesc')}
          accent={colors.muscle.back}
          right={
            <Switch
              value={settings.hapticFeedback}
              onValueChange={() => toggleKey('hapticFeedback')}
              thumbColor={settings.hapticFeedback ? colors.muscle.back : colors.textTertiary}
              trackColor={{ false: colors.surfaceElevated, true: colors.muscle.back + '66' }}
              ios_backgroundColor={colors.surfaceElevated}
            />
          }
        />

        <SettingRow
          icon="timer-outline"
          label={t('profile.defaultRestSeconds')}
          desc={t('profile.defaultRestDesc')}
          accent={colors.warning}
          right={
            <PressableScale
              onPress={() => openPicker('rest')}
              style={styles.pillBtn}
            >
              <Text style={[styles.pillBtnLabel, styles.pillWarningAccent]}>
                {settings.defaultRestSeconds}
                {t('profile.unitRestSeconds')}
              </Text>
              <Icon name="chevron-right" size={11} color={colors.warning} />
            </PressableScale>
          }
        />

        {/* =================== INFO / DATA =================== */}
        <SlabDivider accent={colors.info} />
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('profile.sectionData')}</Text>
          <Text style={styles.sectionCount}>
            <Icon name="information-outline" size={10} color={colors.textTertiary} /> {t('profile.about')}
          </Text>
        </View>

        <InfoCard
          icon="database-outline"
          title={t('profile.dataStorage')}
          desc={t('profile.aboutBody')}
          accent={colors.info}
        />
        <InfoCard
          icon="book-open-page-variant"
          title={t('profile.datasetCredits')}
          desc={t('app.poweredBy')}
          accent={colors.muscle.chest}
        />
        <InfoCard
          icon="shield-alert-outline"
          title={t('profile.dataResetInfo')}
          desc={t('profile.resetAllConfirm')}
          accent={colors.warning}
        />

        {/* DANGER ZONE */}
        <SlabDivider accent={colors.danger} />
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.danger }]}>{t('profile.resetAll')}</Text>
        </View>
        <PressableScale
          onPress={handleReset}
          style={styles.dangerBtn}
          scaleTo={0.98}
        >
          <View style={styles.dangerIconTray}>
            <Icon name="trash-can-outline" size={16} color={colors.danger} />
          </View>
          <View style={styles.dangerBody}>
            <Text style={styles.dangerTitle}>{t('profile.resetAll')}</Text>
            <Text style={styles.dangerSub}>
              {t('profile.resetAllConfirm')}
            </Text>
          </View>
          <Icon name="chevron-right" size={14} color={colors.danger} />
        </PressableScale>

        {/* App version footer */}
        <View style={styles.versionRow}>
          <Icon name="copyright" size={10} color={colors.textTertiary} />
          <Text style={styles.versionText}>
            {t('app.title')} · v{APP_VERSION}
          </Text>
        </View>
        <View style={styles.bottomInset} />
      </ScrollView>

      {/* ============================================================
          OptionPicker Modals — all 4 pickers share a single visibility
          state (pickerOpen) so only one modal can ever be mounted at
          a time, avoiding stacked modals and broken tap-through.
          ============================================================ */}
      <OptionPicker<LanguageCode>
        visible={pickerOpen === 'lang'}
        title={t('profile.pickerTitleLanguage')}
        options={langOptions}
        value={currentLang}
        onSelect={applyLang}
        onClose={closePicker}
        cancelLabel={t('common.cancel')}
        accent={colors.info}
      />
      <OptionPicker<WeightUnit>
        visible={pickerOpen === 'units'}
        title={t('profile.pickerTitleUnits')}
        options={unitsOptions}
        value={settings.units}
        onSelect={applyUnits}
        onClose={closePicker}
        cancelLabel={t('common.cancel')}
        accent={colors.primary}
      />
      <OptionPicker<'dark' | 'light' | 'system'>
        visible={pickerOpen === 'theme'}
        title={t('profile.pickerTitleTheme')}
        options={themeOptions}
        value={settings.theme}
        onSelect={applyTheme}
        onClose={closePicker}
        cancelLabel={t('common.cancel')}
        accent={colors.muscle.shoulders}
      />
      <OptionPicker<number>
        visible={pickerOpen === 'rest'}
        title={t('profile.pickerTitleRest')}
        options={restOptions}
        value={settings.defaultRestSeconds}
        onSelect={applyRestSeconds}
        onClose={closePicker}
        cancelLabel={t('common.cancel')}
        accent={colors.warning}
      />
    </SafeAreaView>
  );
}

// ============================================================
// Sub components
// ============================================================

function SettingRow({
  icon,
  label,
  desc,
  accent = colors.primary,
  right,
}: {
  icon: string;
  label: string;
  desc?: string;
  accent?: string;
  right: React.ReactNode;
}) {
  return (
    <View style={s.sRow}>
      <View
        style={[
          s.sIcon,
          { backgroundColor: accent + '16' },
        ]}
      >
        <Icon name={icon} size={16} color={accent} />
      </View>
      <View style={s.sBody}>
        <Text style={s.sLabel} numberOfLines={1}>
          {label}
        </Text>
        {desc ? (
          <Text style={s.sDesc} numberOfLines={2}>
            {desc}
          </Text>
        ) : null}
      </View>
      <View>{right}</View>
    </View>
  );
}

function InfoCard({
  icon,
  title,
  desc,
  accent,
}: {
  icon: string;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <View style={i.card}>
      <View
        style={[
          i.left,
          { backgroundColor: accent + '14', borderColor: accent + '33' },
        ]}
      >
        <Icon name={icon} size={16} color={accent} />
      </View>
      <View style={i.body}>
        <Text style={[i.title, { color: accent }]} numberOfLines={1}>{title}</Text>
        <Text style={i.desc} numberOfLines={3}>{desc}</Text>
      </View>
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: layout.paddingHorizontal, paddingTop: spacing.sm },
  header: { marginBottom: spacing.md },
  brandLine: {
    color: colors.primary,
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
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarTray: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primary + '18',
    borderWidth: 1,
    borderColor: colors.primaryStroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLeftCol: {
    flex: 1,
    minWidth: 0,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    color: colors.textPrimary,
    lineHeight: 26,
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  heroRank: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  heroRankVal: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    color: colors.accent,
    lineHeight: 22,
  },
  heroRankLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroStats: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.surfaceDivider,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.1,
  },
  sectionCount: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textTertiary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillBtn: {
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
  pillBtnLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    maxWidth: 140,
  },
  pillInfoAccent:    { color: colors.info },
  pillPrimaryAccent: { color: colors.primary },
  pillWarningAccent: { color: colors.warning },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.danger + '0E',
    borderWidth: 1,
    borderColor: colors.danger + '28',
    marginBottom: spacing.xl,
  },
  dangerIconTray: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    // Previously applied as inline `colors.danger + '18'`.  Keeping the
    // tint inline with a semantic style name so DangerZone card keeps its
    // signature look without needing to compute the alpha in render.
    backgroundColor: colors.danger + '18',
  },
  dangerBody: {
    flex: 1,
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  dangerSub: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  versionText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  gapMd: { height: spacing.md },
  bottomInset: { height: layout.tabBarHeight + spacing.xxl },
});

const s = StyleSheet.create({
  sRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md + 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.sm,
  },
  sLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  sDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

const i = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.sm,
  },
  left: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  desc: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
