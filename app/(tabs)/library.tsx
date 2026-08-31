import React, { useState, useMemo, useCallback, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { BodyPart, Exercise } from '@/types';
import { colors, spacing, radius, layout } from '@/theme';
import { useFilteredExercises, useBodyPartCounts, useEquipmentCounts } from '@/hooks/useExercises';
import { ExerciseCard } from '@/components/ExerciseCard';
import { BodyPartChip, EquipmentChip } from '@/components/FilterChips';
import {
  SearchBar,
  PressableScale,
  Icon,
  EmptyState,
  SlabDivider,
  CategoryInfoNote,
} from '@/components/UIKit';
import { useAppStore } from '@/store/useAppStore';
import { safeHaptic } from '@/utils/haptic';

type TabKey = 'body_part' | 'equipment' | 'favorites';

const TABS: { key: TabKey; tKey: 'body' | 'equip' | 'fav'; icon: string; accent: string }[] = [
  { key: 'body_part', tKey: 'body', icon: 'arm-flex-outline', accent: colors.muscle.chest },
  { key: 'equipment', tKey: 'equip', icon: 'dumbbell', accent: colors.info },
  { key: 'favorites', tKey: 'fav', icon: 'heart-outline', accent: colors.accent },
];

export default function LibraryScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('body_part');
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  const bodyParts = useBodyPartCounts();
  const equipments = useEquipmentCounts();
  const favoriteIds = useAppStore((s) => s.favoriteIds);

  const filters = useMemo(() => ({
    bodyPart: activeTab === 'body_part' ? selectedBodyPart : null,
    equipment: activeTab === 'equipment' ? selectedEquipment : null,
    searchQuery: query,
  }), [activeTab, selectedBodyPart, selectedEquipment, query]);

  const { filtered } = useFilteredExercises(filters);

  const listData = useMemo(() => {
    if (activeTab === 'favorites') {
      return filtered.filter((e: Exercise) => favoriteIds.includes(e.id));
    }
    return filtered;
  }, [activeTab, filtered, favoriteIds]);

  // Semantic compact labels authored in locale files (NOT sliced from long copy
  // which breaks when locale sentence length changes between zh/en/ja).
  const tabLabels = useMemo(() => ({
    body: t('compact.libraryBody'),
    equip: t('compact.libraryEquip'),
    fav: t('library.tabFavorites'),
  }), [t]);

  const onTabChange = useCallback((k: TabKey) => {
    safeHaptic('light');
    setActiveTab(k);
    setSelectedBodyPart(null);
    setSelectedEquipment(null);
  }, []);

  const onBodyPartPress = useCallback((bp: BodyPart) => {
    safeHaptic('light');
    setSelectedBodyPart((cur) => (cur === bp ? null : bp));
  }, []);

  const onEquipmentPress = useCallback((eq: string) => {
    safeHaptic('light');
    setSelectedEquipment((cur) => (cur === eq ? null : eq));
  }, []);

  const onToggleFilter = useCallback(() => {
    safeHaptic('light');
    setShowFilters((v) => !v);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => <ExerciseCard exercise={item} compact />,
    []
  );

  const keyExtractor = useCallback((item: Exercise) => item.id, []);

  const resultLabel = useMemo(() => {
    if (activeTab === 'favorites') return t('library.tabFavorites');
    if (activeTab === 'body_part' && selectedBodyPart) {
      const meta = bodyParts.find((r) => r.bodyPart === selectedBodyPart);
      return meta ? `${meta.bodyPart} · ${meta.count}` : t('home.bodySectionTitle');
    }
    if (activeTab === 'equipment' && selectedEquipment) {
      const meta = equipments.find((r) => r.equipment === selectedEquipment);
      return meta ? `${meta.equipment} · ${meta.count}` : t('home.equipmentSectionTitle');
    }
    return t('library.tabAll');
  }, [activeTab, selectedBodyPart, selectedEquipment, bodyParts, equipments, t]);

  // CR-02 Fix: defensive fallback instead of `!`
  const activeTabCfg = TABS.find((t1) => t1.key === activeTab) ?? TABS[0];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.brandLine}>LIBRARY</Text>
        <Text style={styles.title}>{t('library.title')}</Text>
        <View style={{ height: spacing.md }} />
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={t('home.searchPlaceholder')}
        />
        <View style={{ height: spacing.md }} />

        {/* Tabs — icon + label */}
        <View style={styles.tabsRow}>
          {TABS.map((tb) => {
            const active = activeTab === tb.key;
            return (
              <PressableScale
                key={tb.key}
                onPress={() => onTabChange(tb.key)}
                style={[
                  styles.tabBtn,
                  active && {
                    backgroundColor: tb.accent + '18',
                    borderColor: tb.accent,
                  },
                ]}
                scaleTo={0.97}
              >
                <View style={[
                  styles.tabIconTray,
                  active && { backgroundColor: tb.accent + '28' },
                ]}>
                  <Icon
                    name={tb.icon}
                    size={15}
                    color={active ? tb.accent : colors.textTertiary}
                  />
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    active && { color: tb.accent },
                  ]}
                >
                  {tabLabels[tb.tKey]}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {/* Filter toggle */}
        {activeTab !== 'favorites' ? (
          <PressableScale
            onPress={onToggleFilter}
            style={styles.toggleWrap}
            scaleTo={0.98}
          >
            <Icon
              name={showFilters ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.textTertiary}
            />
            <Text style={styles.toggleLabel}>
              {showFilters ? '▲' : '▼'}
            </Text>
            <View style={styles.toggleRule} />
          </PressableScale>
        ) : (
          <CategoryInfoNote
            icon="heart"
            text={t('library.noFavoritesDesc')}
            accent={colors.accent}
          />
        )}

        {showFilters && activeTab === 'body_part' && (
          <View style={styles.filtersBlock}>
            <View style={styles.chipGrid}>
              {bodyParts.map(({ bodyPart, count }) => (
                <BodyPartChip
                  key={bodyPart}
                  bodyPart={bodyPart}
                  count={count}
                  size="sm"
                  selected={selectedBodyPart === bodyPart}
                  onPress={onBodyPartPress}
                />
              ))}
            </View>
          </View>
        )}

        {showFilters && activeTab === 'equipment' && (
          <View style={styles.filtersBlock}>
            <View style={styles.chipGrid}>
              {equipments.map(({ equipment, count }) => (
                <EquipmentChip
                  key={equipment}
                  equipment={equipment}
                  count={count}
                  size="sm"
                  selected={selectedEquipment === equipment}
                  onPress={onEquipmentPress}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.resultRow}>
          <Text style={[styles.resultLabel, { color: activeTabCfg.accent }]} numberOfLines={1}>
            {resultLabel}
          </Text>
          <Text style={styles.resultCount}>
            {listData.length} {t('compact.exercises')}
          </Text>
        </View>
        <SlabDivider accent={activeTabCfg.accent} />
      </View>

      <FlashList<Exercise>
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={1}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={<ListEmpty tab={activeTab} />}
        onMomentumScrollBegin={() => { if (showFilters) setShowFilters(false); }}
      />
    </SafeAreaView>
  );
}

const Separator = memo(() => <View style={{ height: spacing.sm }} />);

function ListEmpty({ tab }: { tab: TabKey }) {
  const { t } = useTranslation();
  if (tab === 'favorites') {
    return (
      <View style={{ marginTop: spacing.xxxl }}>
        <EmptyState
          icon="heart-off-outline"
          title={t('library.noFavorites')}
          desc={t('library.noFavoritesDesc')}
        />
      </View>
    );
  }
  return (
    <View style={{ marginTop: spacing.xxxl }}>
      <EmptyState
        icon="file-search-outline"
        title={t('home.emptyTitle')}
        desc={t('home.emptyDesc')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: layout.paddingHorizontal,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg,
  },
  brandLine: {
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
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
  tabsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  tabIconTray: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  toggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  toggleLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textTertiary,
    opacity: 0.6,
  },
  toggleRule: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: colors.surfaceDivider,
  },
  filtersBlock: {
    paddingBottom: spacing.md,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  resultLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
    flex: 1,
  },
  resultCount: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingHorizontal: layout.paddingHorizontal,
    paddingTop: spacing.xs,
    paddingBottom: layout.tabBarHeight + spacing.xxxl,
  },
});
