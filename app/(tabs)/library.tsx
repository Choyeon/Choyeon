import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import type { BodyPart, Exercise } from '@/types';
import { useThemeColors, spacing, radius, layout } from '@/theme';
import { useExercisesStore } from '@/data/exercises-store';
import { ExerciseCard } from '@/components/ExerciseCard';
import { BodyPartChip, EquipmentChip } from '@/components/FilterChips';
import {
  SearchBar,
  Icon,
  EmptyState,
  SlabDivider,
} from '@/components/UIKit';
import { useAppStore } from '@/store/useAppStore';
import { safeHaptic } from '@/utils/haptic';
import {
  labelForBodyPart,
  labelForEquipment,
  BODY_REGIONS,
  EQUIPMENT_GROUPS,
  type BodyRegion,
  type EquipmentGroup,
} from '@/constants';

type TopTab = 'all' | 'favorites';

const TOP_TABS: { key: TopTab; icon: string; labelKey: string }[] = [
  { key: 'all', icon: 'view-grid-outline', labelKey: 'library.tabAll' },
  { key: 'favorites', icon: 'heart-outline', labelKey: 'library.tabFavorites' },
];

export default function LibraryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ bodyPart?: string; equipment?: string }>();
  const colors = useThemeColors();
  const currentLang: 'zh' | 'en' = i18n.language?.startsWith('en') ? 'en' : 'zh';

  const store = useExercisesStore();
  const favoriteIds = useAppStore((s) => s.favoriteIds);

  // ====== Filter state (new hierarchical model) ======
  const [activeTab, setActiveTab] = useState<TopTab>('all');
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion>('all');
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | null>(
    (params.bodyPart as BodyPart) ?? null,
  );
  const [selectedEquipGroup, setSelectedEquipGroup] = useState<EquipmentGroup>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(
    params.equipment ?? null,
  );
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    store.ensureReady();
  }, [store]);

  // ====== Filter data with region/group hierarchy ======
  const bodyPartCounts = useMemo(() => store.countByBodyPart(), [store, store.ready]);
  const equipmentCounts = useMemo(() => store.countByEquipment(), [store, store.ready]);

  // Body parts filtered by selected region
  const visibleBodyParts = useMemo(() => {
    if (selectedRegion === 'all') return bodyPartCounts;
    const regionParts = BODY_REGIONS.find((r) => r.key === selectedRegion)?.parts ?? [];
    return bodyPartCounts.filter(({ bodyPart }) => regionParts.includes(bodyPart));
  }, [bodyPartCounts, selectedRegion]);

  // Equipment filtered by selected group
  const visibleEquipments = useMemo(() => {
    if (selectedEquipGroup === 'all') return equipmentCounts;
    const groupItems = EQUIPMENT_GROUPS.find((g) => g.key === selectedEquipGroup)?.items ?? [];
    return equipmentCounts.filter(({ equipment }) => groupItems.includes(equipment));
  }, [equipmentCounts, selectedEquipGroup]);

  // ====== Result computation ======
  const filteredExercises = useMemo(() => {
    // Resolve bodyPart filter: explicit selection wins, else region narrows it
    let bodyPartFilter: BodyPart | null = selectedBodyPart;
    if (!bodyPartFilter && selectedRegion !== 'all') {
      const regionParts = BODY_REGIONS.find((r) => r.key === selectedRegion)?.parts ?? [];
      // If region maps to exactly 1 body part, auto-select it
      if (regionParts.length === 1) bodyPartFilter = regionParts[0];
      // Otherwise don't filter by bodyPart — the region concept is broader
    }

    // Resolve equipment filter: explicit selection wins, else group narrows it
    let equipmentFilter: string | null = selectedEquipment;
    // We don't auto-select from group because equipment groups can have many items

    if (activeTab === 'favorites') {
      const favSet = new Set(favoriteIds);
      const base = store.filter({
        bodyPart: bodyPartFilter,
        equipment: equipmentFilter,
        searchQuery,
      });
      return base.filter((ex) => favSet.has(ex.id));
    }
    return store.filter({
      bodyPart: bodyPartFilter,
      equipment: equipmentFilter,
      searchQuery,
    });
  }, [
    activeTab,
    favoriteIds,
    selectedRegion,
    selectedBodyPart,
    selectedEquipGroup,
    selectedEquipment,
    searchQuery,
    store,
    store.ready,
  ]);

  const hasAnyFilter =
    activeTab === 'favorites' ||
    selectedRegion !== 'all' ||
    selectedBodyPart !== null ||
    selectedEquipGroup !== 'all' ||
    selectedEquipment !== null ||
    searchQuery.length > 0;

  // ====== Event handlers ======
  const handleTabPress = useCallback((next: TopTab) => {
    if (next === activeTab) return;
    safeHaptic('selection');
    setActiveTab(next);
  }, [activeTab]);

  const handleRegionPress = useCallback((region: BodyRegion) => {
    safeHaptic('selection');
    setSelectedRegion((prev) => {
      const next = prev === region ? 'all' : region;
      // When region changes to specific, clear body part filter
      if (next !== prev) setSelectedBodyPart(null);
      return next;
    });
  }, []);

  const handleBodyPartPress = useCallback((bodyPart: BodyPart) => {
    safeHaptic('selection');
    setSelectedBodyPart((prev) => (prev === bodyPart ? null : bodyPart));
    // Auto-select matching region for the chosen body part
    const region = BODY_REGIONS.find((r) => r.parts.includes(bodyPart));
    if (region) setSelectedRegion(region.key);
  }, []);

  const handleEquipGroupPress = useCallback((group: EquipmentGroup) => {
    safeHaptic('selection');
    setSelectedEquipGroup((prev) => {
      const next = prev === group ? 'all' : group;
      if (next !== prev) setSelectedEquipment(null);
      return next;
    });
  }, []);

  const handleEquipmentPress = useCallback((equipment: string) => {
    safeHaptic('selection');
    setSelectedEquipment((prev) => (prev === equipment ? null : equipment));
    // Auto-select matching group
    const group = EQUIPMENT_GROUPS.find((g) => g.items.includes(equipment));
    if (group) setSelectedEquipGroup(group.key);
  }, []);

  const handleReset = useCallback(() => {
    safeHaptic('light');
    setSelectedRegion('all');
    setSelectedBodyPart(null);
    setSelectedEquipGroup('all');
    setSelectedEquipment(null);
    setSearchQuery('');
  }, []);

  const handleExercisePress = useCallback(
    (exercise: Exercise) => {
      safeHaptic('light');
      router.push({
        pathname: '/exercise/[id]',
        params: { id: exercise.id },
      } as Parameters<typeof router.push>[0]);
    },
    [router],
  );

  // ====== Styles ======
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.bg },

        // --- Top bar ---
        topBar: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
          gap: spacing.sm,
        },
        titleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        title: {
          color: colors.textPrimary,
          fontSize: 22,
          fontWeight: '800',
          letterSpacing: -0.5,
        },
        searchWrap: { marginTop: spacing.xs },
        tabsRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
        tab: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          backgroundColor: colors.surface,
        },
        tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
        tabText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
        tabTextActive: { color: colors.textInverse },

        // --- Region / Group row (compact tabs) ---
        compactRow: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
          gap: spacing.xs,
        },
        compactTab: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: spacing.md,
          paddingVertical: 6,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          backgroundColor: colors.surface,
        },
        compactTabActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
        compactTabText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
        compactTabTextActive: { color: colors.primary, fontWeight: '800' },

        // --- Filter section (body parts / equipments) ---
        filterSection: {
          borderBottomWidth: 1,
          borderBottomColor: colors.surfaceDivider,
        },
        filterHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xs,
          paddingBottom: spacing.xs,
        },
        filterLabel: {
          color: colors.textTertiary,
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        },
        filterChipsRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
          gap: spacing.xs,
        },

        // --- Result header ---
        resultHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.surfaceDivider,
        },
        resultLabelWrap: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, flex: 1 },
        resultLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
        resultCount: { color: colors.primary, fontSize: 15, fontWeight: '800' },
        resetBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          backgroundColor: colors.surface,
        },
        resetText: {
          color: colors.textSecondary,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },

        // --- List ---
        listContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
        emptyFill: { flex: 1, justifyContent: 'center' },
      }),
    [colors],
  );

  // ====== Render ======
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ====== TOP BAR ====== */}
      <View style={styles.topBar}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t('library.title')}</Text>
        </View>

        <View style={styles.searchWrap}>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder={t('home.searchPlaceholder')}
          />
        </View>

        <View style={styles.tabsRow}>
          {TOP_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => handleTabPress(tab.key)}
                style={[styles.tab, isActive && styles.tabActive]}
              >
                <Icon
                  name={tab.icon}
                  size={16}
                  color={isActive ? colors.textInverse : colors.textSecondary}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={1}>
                  {t(tab.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ====== BODY REGION ROW (compact horizontal tabs) ====== */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterLabel}>{t('home.bodySectionTitle')}</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.compactRow}
        >
          {BODY_REGIONS.map((region) => {
            const isActive = selectedRegion === region.key;
            return (
              <Pressable
                key={region.key}
                onPress={() => handleRegionPress(region.key)}
                style={[styles.compactTab, isActive && styles.compactTabActive]}
              >
                <Icon
                  name={region.icon}
                  size={12}
                  color={isActive ? colors.primary : colors.textTertiary}
                />
                <Text style={[styles.compactTabText, isActive && styles.compactTabTextActive]}>
                  {currentLang === 'en' ? region.en : region.zh}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ====== BODY PART CHIPS (filtered by region) ====== */}
      <View style={styles.filterSection}>
        <View style={styles.filterChipsRow}>
          {visibleBodyParts.map(({ bodyPart, count }) => (
            <BodyPartChip
              key={bodyPart}
              bodyPart={bodyPart}
              count={count}
              selected={selectedBodyPart === bodyPart}
              onPress={handleBodyPartPress}
            />
          ))}
        </View>
      </View>

      {/* ====== EQUIPMENT GROUP ROW (compact horizontal tabs) ====== */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterLabel}>{t('home.equipmentSectionTitle')}</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.compactRow}
        >
          {EQUIPMENT_GROUPS.map((group) => {
            const isActive = selectedEquipGroup === group.key;
            return (
              <Pressable
                key={group.key}
                onPress={() => handleEquipGroupPress(group.key)}
                style={[styles.compactTab, isActive && styles.compactTabActive]}
              >
                <Icon
                  name={group.icon}
                  size={12}
                  color={isActive ? colors.primary : colors.textTertiary}
                />
                <Text style={[styles.compactTabText, isActive && styles.compactTabTextActive]}>
                  {currentLang === 'en' ? group.en : group.zh}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ====== EQUIPMENT CHIPS (filtered by group) ====== */}
      <View style={styles.filterSection}>
        <View style={styles.filterChipsRow}>
          {visibleEquipments.map(({ equipment, count }) => (
            <EquipmentChip
              key={equipment}
              equipment={equipment}
              count={count}
              selected={selectedEquipment === equipment}
              onPress={handleEquipmentPress}
            />
          ))}
        </View>
      </View>

      {/* ====== RESULT HEADER ====== */}
      <View style={styles.resultHeader}>
        <View style={styles.resultLabelWrap}>
          <Text style={styles.resultLabel} numberOfLines={1}>
            {buildResultLabel({
              t,
              activeTab,
              selectedRegion,
              selectedBodyPart,
              selectedEquipGroup,
              selectedEquipment,
              currentLang,
            })}
          </Text>
          <Text style={styles.resultCount}>· {filteredExercises.length}</Text>
        </View>
        {hasAnyFilter && (
          <Pressable onPress={handleReset} style={styles.resetBtn}>
            <Icon name="refresh" size={12} color={colors.textSecondary} />
            <Text style={styles.resetText}>{t('common.reset')}</Text>
          </Pressable>
        )}
      </View>

      {/* ====== LIST ====== */}
      {filteredExercises.length === 0 ? (
        <View style={styles.emptyFill}>
          {activeTab === 'favorites' && favoriteIds.length === 0 ? (
            <EmptyState
              icon="heart-off-outline"
              title={t('library.noFavorites')}
              desc={t('library.noFavoritesDesc')}
            />
          ) : searchQuery.length > 0 ? (
            <EmptyState
              icon="file-search-outline"
              title={t('home.emptyTitle')}
              desc={t('home.emptyDesc')}
            />
          ) : (
            <EmptyState
              icon="file-search-outline"
              title={t('home.emptyTitle')}
              desc={t('home.emptyDesc')}
            />
          )}
        </View>
      ) : (
        <FlashList<Exercise>
          data={filteredExercises}
          renderItem={({ item }) => (
            <ExerciseCard
              exercise={item}
              grid
              onPress={() => handleExercisePress(item)}
            />
          )}
          numColumns={3}
          getItemType={() => 'exercise'}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={SlabDivider}
          removeClippedSubviews
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function buildResultLabel(args: {
  t: (key: string) => string;
  activeTab: TopTab;
  selectedRegion: BodyRegion;
  selectedBodyPart: BodyPart | null;
  selectedEquipGroup: EquipmentGroup;
  selectedEquipment: string | null;
  currentLang: 'zh' | 'en';
}): string {
  const { t, activeTab, selectedRegion, selectedBodyPart, selectedEquipGroup, selectedEquipment, currentLang } = args;

  if (activeTab === 'favorites') return t('library.tabFavorites');

  const parts: string[] = [];

  // Body part name (specific selection takes priority)
  if (selectedBodyPart) {
    parts.push(labelForBodyPart(selectedBodyPart, currentLang));
  } else if (selectedRegion !== 'all') {
    const region = BODY_REGIONS.find((r) => r.key === selectedRegion);
    if (region) parts.push(currentLang === 'en' ? region.en : region.zh);
  }

  // Equipment name
  if (selectedEquipment) {
    parts.push(labelForEquipment(selectedEquipment, currentLang));
  } else if (selectedEquipGroup !== 'all') {
    const group = EQUIPMENT_GROUPS.find((g) => g.key === selectedEquipGroup);
    if (group) parts.push(currentLang === 'en' ? group.en : group.zh);
  }

  if (parts.length === 0) return t('library.title');
  return parts.join(' · ');
}

