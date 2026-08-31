import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  WorkoutSession,
  WorkoutExercise,
  WorkoutSet,
  AppSettings,
  LanguageCode,
} from '@/types';
import { STORAGE_KEYS, DEFAULT_LANGUAGE } from '@/constants';
import {
  setAppLanguage,
  i18n as i18nInstance,
  normalizeLanguage,
  detectInitialLanguage,
} from '@/i18n';

// Used as a last-resort fallback when i18n hasn't finished bootstrapping and
// the caller needs a session name Right Now (tm).  Only `zh` and `en` are
// officially supported UI locales; the wider LanguageCode union covers
// exercise instruction translations.  normalizeLanguage() gates every read
// so a regional variant like en-US / zh-Hant always collapses to `zh` or
// `en`; the remaining keys are therefore passive safe-defaults in case a
// caller forgets the normalizer.
const DEFAULT_SESSION_NAME_FALLBACK: Record<LanguageCode, string> = {
  zh: '今日训练',
  en: "Today's session",
  es: "Today's session",
  it: "Today's session",
  tr: "Today's session",
  ru: "Today's session",
  hi: "Today's session",
  pl: "Today's session",
  ko: "Today's session",
  fr: "Today's session",
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/**
 * A tiny wrapper over AsyncStorage that maps STORAGE_KEYS into a single
 * "choyeon/vault" payload, with explicit schema versioning.  Keeping a
 * single storage key makes migrations trivial and avoids broken partial
 * state when the user upgrades between settings/workout schema bumps.
 */
const VAULT_KEY = '@choyeon/vault/v2';
const PERSIST_VERSION = 2;

interface PersistedShape {
  v: number;
  settings: AppSettings;
  favoriteIds: string[];
  workouts: WorkoutSession[];
}

const appStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      /* swallow to prevent UI crashes */
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      /* swallow */
    }
  },
};

function normalizeLegacySettings(raw: any): AppSettings {
  const base: AppSettings = { ...INITIAL_SETTINGS, ...(raw || {}) };
  if (base.language !== 'zh' && base.language !== 'en') {
    base.language = DEFAULT_LANGUAGE;
  }
  if (base.units !== 'kg' && base.units !== 'lb') base.units = 'kg';
  if (base.theme !== 'dark' && base.theme !== 'light' && base.theme !== 'system') {
    base.theme = 'system';
  }
  if (typeof base.defaultRestSeconds !== 'number' || Number.isNaN(base.defaultRestSeconds)) {
    base.defaultRestSeconds = INITIAL_SETTINGS.defaultRestSeconds;
  }
  if (typeof base.restTimerEnabled !== 'boolean') base.restTimerEnabled = true;
  if (typeof base.autoRest !== 'boolean') base.autoRest = true;
  if (typeof base.saveHistory !== 'boolean') base.saveHistory = true;
  if (typeof base.hapticFeedback !== 'boolean') base.hapticFeedback = true;
  // Legacy "restTimer" used to be the single source; fold it into
  // defaultRestSeconds if the user has never migrated.
  if (
    typeof base.restTimer === 'number' &&
    !Number.isNaN(base.restTimer) &&
    base.defaultRestSeconds === INITIAL_SETTINGS.defaultRestSeconds
  ) {
    base.defaultRestSeconds = Math.max(0, Math.floor(base.restTimer));
  }
  return base;
}

function normalizeLegacyWorkouts(raw: any): WorkoutSession[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkoutSession[] = [];
  for (const w of raw) {
    if (!w || typeof w !== 'object') continue;
    const exercises: WorkoutExercise[] = Array.isArray(w.exercises)
      ? w.exercises
          .map((e: any) => {
            if (!e || typeof e !== 'object' || typeof e.exerciseId !== 'string') return null;
            const sets: WorkoutSet[] = Array.isArray(e.sets)
              ? e.sets
                  .map((s: any) => {
                    if (!s || typeof s !== 'object') return null;
                    const id =
                      typeof s.id === 'string' && s.id.length ? s.id : uid();
                    const weight = Number.isFinite(Number(s.weight)) ? Number(s.weight) : 0;
                    const reps = Number.isFinite(Number(s.reps)) ? Number(s.reps) : 0;
                    return {
                      id,
                      exerciseId: String(e.exerciseId),
                      weight,
                      reps,
                      completed: !!s.completed,
                      note: typeof s.note === 'string' ? s.note : undefined,
                    } as WorkoutSet;
                  })
                  .filter(Boolean) as WorkoutSet[]
              : [];
            return { exerciseId: String(e.exerciseId), sets } as WorkoutExercise;
          })
          .filter(Boolean) as WorkoutExercise[]
      : [];
    const duration = Number.isFinite(Number(w.duration)) ? Math.max(0, Math.floor(Number(w.duration))) : 0;
    out.push({
      id: typeof w.id === 'string' && w.id.length ? w.id : uid(),
      name: typeof w.name === 'string' && w.name.length ? w.name : '训练记录',
      date: typeof w.date === 'string' ? w.date : new Date().toISOString(),
      duration,
      exercises,
      note: typeof w.note === 'string' ? w.note : undefined,
    });
  }
  return out;
}

function normalizeFavoriteIds(raw: any): string[] {
  return Array.isArray(raw) ? raw.filter((v) => typeof v === 'string') : [];
}

/**
 * zustand persist `migrate` callback.  Receives either the previous v1 / v2
 * payload (or older shapes that lived in separate AsyncStorage keys such as
 * @choyeon/workouts) and returns a v2-compatible persisted state.  Returning
 * `undefined` falls through to a clean initial state.
 */
async function migrate(persisted: any, version: number): Promise<any> {
  // If the payload never went through the vault, the `persisted` object may
  // be a partial shape emitted by earlier persist configs.  In that case try
  // to pull the legacy per-slice AsyncStorage keys as a best-effort merge.
  let settings: any = persisted?.settings;
  let favoriteIds: any = persisted?.favoriteIds;
  let workouts: any = persisted?.workouts;

  if (!settings || !favoriteIds || !workouts) {
    try {
      const [sLeg, fLeg, wLeg] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
        AsyncStorage.getItem(STORAGE_KEYS.FAVORITES),
        AsyncStorage.getItem(STORAGE_KEYS.WORKOUTS),
      ]);
      if (sLeg) {
        const parsed = JSON.parse(sLeg);
        settings = settings ?? parsed?.state?.settings ?? parsed?.settings ?? parsed;
      }
      if (fLeg) {
        const parsed = JSON.parse(fLeg);
        favoriteIds = favoriteIds ?? parsed?.state?.favoriteIds ?? parsed?.favoriteIds ?? parsed;
      }
      if (wLeg) {
        const parsed = JSON.parse(wLeg);
        workouts = workouts ?? parsed?.state?.workouts ?? parsed?.workouts ?? parsed;
      }
    } catch {
      /* ignore legacy parse errors */
    }
  }

  const shape: PersistedShape = {
    v: PERSIST_VERSION,
    settings: normalizeLegacySettings(settings ?? {}),
    favoriteIds: normalizeFavoriteIds(favoriteIds),
    workouts: normalizeLegacyWorkouts(workouts),
  };
  // version tracking: zustand persist wraps the shape in { state, version }
  // at its outer level.  Here we return the inner state, and persist will
  // stamp version=PERSIST_VERSION on its own envelope.
  // Use `satisfies` first so TypeScript enforces PersistedShape against the
  // returned payload (catches forgotten fields on future schema bumps).
  const typed = shape satisfies PersistedShape;
  return typed as unknown as any;
}

interface AppState {
  // ============ SETTINGS ============
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setSettings: (patch: Partial<AppSettings>) => void; // alias for screens that expect setSettings

  // ============ FAVORITES ============
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;

  // ============ WORKOUT HISTORY ============
  workouts: WorkoutSession[];
  addWorkout: (workout: Omit<WorkoutSession, 'id' | 'date'>) => void;
  deleteWorkout: (id: string) => void;
  clearAllWorkouts: () => void;
  resetAllData: () => void; // clear everything + favorites + settings back to defaults

  // ============ ACTIVE WORKOUT ============
  activeWorkout: {
    startedAt: number | null;
    exercises: WorkoutExercise[];
    name: string;
  } | null;
  startWorkout: (name?: string) => void;
  endWorkout: (note?: string) => WorkoutSession | null;
  cancelWorkout: () => void;
  addExerciseToActive: (exerciseId: string) => void;
  removeExerciseFromActive: (exerciseId: string) => void;
  addSetToExercise: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (
    exerciseId: string,
    setId: string,
    patch: Partial<WorkoutSet>
  ) => void;

  // ============ STATS ============
  totalVolumeKg: () => number;
  totalWorkouts: () => number;
  streakDays: () => number;
}

/**
 * First-run language resolution: on a fresh install we want the language to
 * follow the device's system locale, not a hard-coded "zh".  zustand persist
 * calls `migrate` synchronously during `create()`, but we can't block on
 * expo-localization's async `getLocales()` there.  Instead we resolve the
 * system locale once at module-load time and bake the result into the
 * initial settings.  This runs BEFORE any React component mounts, so the
 * very first render already has the correct language.
 */
function resolveInitialLanguageSync(): LanguageCode {
  try {
    // expo-localization getLocales() is synchronous — it reads from the
    // native Activity's Configuration which is always available by the
    // time JS boots.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getLocales } = require('expo-localization');
    const locales = getLocales();
    const first = locales?.[0]?.languageCode;
    const normalized = normalizeLanguage(first);
    return normalized;
  } catch {
    // Module resolution failed (shouldn't happen).  Fall back to DEFAULT.
    return DEFAULT_LANGUAGE;
  }
}

const SYSTEM_LANGUAGE = resolveInitialLanguageSync();

const INITIAL_SETTINGS: AppSettings = {
  language: SYSTEM_LANGUAGE, // follows device locale on first run
  theme: 'system',
  units: 'kg',
  restTimer: 90, // legacy
  defaultRestSeconds: 90,
  restTimerEnabled: true,
  autoRest: true,
  saveHistory: true,
  hapticFeedback: true,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      settings: INITIAL_SETTINGS,
      updateSettings: (patch) =>
        set((s) => {
          const next: AppSettings = { ...s.settings, ...patch };
          // Language side-effect: keep i18next in sync with persisted choice so
          // toggles apply immediately without a restart.  Swallow errors to avoid
          // UI crashes if the i18n pipeline hasn't finished bootstrapping yet.
          if (patch.language) {
            setAppLanguage(patch.language).catch((err) => {
              // eslint-disable-next-line no-console
              console.error('[i18n] changeLanguage failed from updateSettings', err);
            });
          }
          return { settings: next };
        }),
      setSettings: (patch) => get().updateSettings(patch),

      // ------------------------------
      // FAVORITES
      // ------------------------------
      favoriteIds: [],
      toggleFavorite: (id) =>
        set((s) => ({
          favoriteIds: s.favoriteIds.includes(id)
            ? s.favoriteIds.filter((f) => f !== id)
            : [...s.favoriteIds, id],
        })),
      isFavorite: (id) => get().favoriteIds.includes(id),

      // ------------------------------
      // WORKOUT HISTORY
      // ------------------------------
      workouts: [],
      addWorkout: (workout) =>
        set((s) => ({
          workouts: [
            {
              ...workout,
              id: uid(),
              date: new Date().toISOString(),
            },
            ...s.workouts,
          ],
        })),
      deleteWorkout: (id) =>
        set((s) => ({
          workouts: s.workouts.filter((w) => w.id !== id),
        })),
      clearAllWorkouts: () => set({ workouts: [] }),
      resetAllData: () =>
        set({
          workouts: [],
          favoriteIds: [],
          settings: { ...INITIAL_SETTINGS },
          activeWorkout: null,
        }),

      // ------------------------------
      // ACTIVE WORKOUT
      // ------------------------------
      activeWorkout: null,
      startWorkout: (name) =>
        set((s) => {
          // Defensive: if a workout is already active (e.g. user double-taps
          // "Start" before the first tap navigates, or a new entry point forgets
          // the `if (!activeWorkout)` guard), return the existing state as-is
          // so in-progress exercises / sets are NOT silently overwritten.
          if (s.activeWorkout) return s;
          return {
            activeWorkout: {
              startedAt: Date.now(),
              exercises: [],
              // Resolve the session name from the current locale when the
              // caller hasn't supplied one.  Previously this defaulted to a
              // hard-coded Chinese string ("今日训练") which persisted into
              // History entries even for English-speaking users.
              //
              // Resolution order:
              //   1. Caller-provided `name` (non-empty) — wins outright.
              //   2. `i18n.t('workout.defaultSessionName')` — only if resources
              //      have finished loading (no raw key echo-back).
              //   3. `DEFAULT_SESSION_NAME_FALLBACK` keyed by CANONICAL
              //      normalizeLanguage() output — never by string-matching on
              //      i18n.language directly (fixes en-US / zh-CN mismatches).
              name:
                (name && name.length > 0)
                  ? name
                  : (() => {
                      try {
                        const resolved = i18nInstance.t('workout.defaultSessionName');
                        // `resolved` may fall back to the key itself when the
                        // resource isn't loaded yet.  Guard against using the
                        // raw "workout.defaultSessionName" key as a name.
                        if (resolved && !resolved.includes('defaultSessionName')) {
                          return resolved;
                        }
                      } catch {
                        /* i18n pipeline not ready */
                      }
                      // normalizeLanguage() guarantees a canonical 'zh' | 'en'
                      // result regardless of whether i18n.language reports a
                      // regional variant (en-US, zh-Hans-CN, …) or is empty.
                      const canonical = normalizeLanguage(
                        i18nInstance.language || get().settings.language || DEFAULT_LANGUAGE
                      );
                      return DEFAULT_SESSION_NAME_FALLBACK[canonical];
                    })(),
            },
          };
        }),
      endWorkout: (note) => {
        const { activeWorkout } = get();
        if (!activeWorkout || !activeWorkout.startedAt) return null;
        // Filter exercises with sets
        const exercisesWithSets = activeWorkout.exercises.filter(
          (e) => e.sets.length > 0
        );
        if (exercisesWithSets.length === 0) {
          set({ activeWorkout: null });
          return null;
        }
        const duration = Math.round(
          (Date.now() - activeWorkout.startedAt) / 1000
        );
        const session: WorkoutSession = {
          id: uid(),
          name: activeWorkout.name,
          date: new Date().toISOString(),
          duration,
          exercises: exercisesWithSets,
          note,
        };
        set((s) => ({
          workouts: [session, ...s.workouts],
          activeWorkout: null,
        }));
        return session;
      },
      cancelWorkout: () => set({ activeWorkout: null }),

      addExerciseToActive: (exerciseId) =>
        set((s) => {
          if (!s.activeWorkout) return s;
          if (
            s.activeWorkout.exercises.some(
              (e) => e.exerciseId === exerciseId
            )
          ) {
            return s;
          }
          const firstSet: WorkoutSet = {
            id: uid(),
            exerciseId,
            weight: 0,
            reps: 0,
            completed: false,
          };
          return {
            activeWorkout: {
              ...s.activeWorkout,
              exercises: [
                ...s.activeWorkout.exercises,
                { exerciseId, sets: [firstSet] },
              ],
            },
          };
        }),
      removeExerciseFromActive: (exerciseId) =>
        set((s) => {
          if (!s.activeWorkout) return s;
          return {
            activeWorkout: {
              ...s.activeWorkout,
              exercises: s.activeWorkout.exercises.filter(
                (e) => e.exerciseId !== exerciseId
              ),
            },
          };
        }),
      addSetToExercise: (exerciseId) =>
        set((s) => {
          if (!s.activeWorkout) return s;
          return {
            activeWorkout: {
              ...s.activeWorkout,
              exercises: s.activeWorkout.exercises.map((e) => {
                if (e.exerciseId !== exerciseId) return e;
                const lastSet = e.sets[e.sets.length - 1];
                return {
                  ...e,
                  sets: [
                    ...e.sets,
                    {
                      id: uid(),
                      exerciseId,
                      weight: lastSet?.weight ?? 0,
                      reps: lastSet?.reps ?? 0,
                      completed: false,
                    },
                  ],
                };
              }),
            },
          };
        }),
      removeSet: (exerciseId, setId) =>
        set((s) => {
          if (!s.activeWorkout) return s;
          return {
            activeWorkout: {
              ...s.activeWorkout,
              exercises: s.activeWorkout.exercises.map((e) => {
                if (e.exerciseId !== exerciseId) return e;
                return {
                  ...e,
                  sets: e.sets.filter((s) => s.id !== setId),
                };
              }),
            },
          };
        }),
      updateSet: (exerciseId, setId, patch) =>
        set((s) => {
          if (!s.activeWorkout) return s;
          return {
            activeWorkout: {
              ...s.activeWorkout,
              exercises: s.activeWorkout.exercises.map((e) => {
                if (e.exerciseId !== exerciseId) return e;
                return {
                  ...e,
                  sets: e.sets.map((set) =>
                    set.id === setId ? { ...set, ...patch } : set
                  ),
                };
              }),
            },
          };
        }),

      // ------------------------------
      // STATS
      // ------------------------------
      totalVolumeKg: () => {
        const { workouts } = get();
        let total = 0;
        for (const w of workouts) {
          for (const e of w.exercises) {
            for (const set of e.sets) {
              if (set.completed) total += (set.weight || 0) * (set.reps || 0);
            }
          }
        }
        return Math.round(total);
      },
      totalWorkouts: () => get().workouts.length,
      streakDays: () => {
        const { workouts } = get();
        if (workouts.length === 0) return 0;
        const dates = new Set(
          workouts.map((w) => new Date(w.date).toDateString())
        );
        let streak = 0;
        const cursor = new Date();
        while (dates.has(cursor.toDateString())) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        }
        // Check from yesterday if today is empty
        if (streak === 0) {
          cursor.setDate(new Date().getDate() - 1);
          while (dates.has(cursor.toDateString())) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
          }
        }
        return streak;
      },
    }),
    {
      name: VAULT_KEY,
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => appStorage),
      migrate,
      partialize: (state) => ({
        workouts: state.workouts,
        settings: state.settings,
        favoriteIds: state.favoriteIds,
      }),
    }
  )
);
