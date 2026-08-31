import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, DEFAULT_LANGUAGE } from '@/constants';
import type { AppSettings, LanguageCode } from '@/types';

/**
 * The zustand persist v2 pipeline now writes the ENTIRE app state
 * (settings + workouts + favorites) into a SINGLE combined vault key
 * `@choyeon/vault/v2` (see `VAULT_KEY` in useAppStore.ts).  The legacy
 * per-slice keys (`@choyeon/settings`, `@choyeon/workouts`, etc.) are
 * only kept as fallbacks for users who have never opened >= v1.0.7.
 *
 * If `loadSettings()` only reads the OLD key, i18n bootstrap at app
 * startup sees `null` and falls back to `expo-localization` device
 * locale — effectively losing any language/theme/units toggle the user
 * saved via the new vault-backed Settings screen.  We now try THREE
 * locations in priority order:
 *
 *   1.  NEW — combined vault key (zustand v2 envelope:
 *       `{ state: { settings, workouts, favoriteIds }, version: 2 }`)
 *   2.  TRANSITIONAL — zustand v2 payload that sat on the settings
 *       slice key during the brief v1.0.4 — v1.0.6 window.
 *   3.  LEGACY — raw settings JSON (pre-persist) on `@choyeon/settings`
 */
const VAULT_KEY = '@choyeon/vault/v2';

function parsePersistedEnvelope(raw: string | null): any {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // zustand persist envelope
    if (parsed && typeof parsed === 'object' && 'state' in parsed) {
      return (parsed as any).state;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function loadSettings(): Promise<Partial<AppSettings> | null> {
  // 1) Vault key — authoritative for >= v1.0.7
  try {
    const raw = await AsyncStorage.getItem(VAULT_KEY);
    const state = parsePersistedEnvelope(raw);
    if (state?.settings && typeof state.settings === 'object') {
      return state.settings as Partial<AppSettings>;
    }
  } catch {
    /* fall through */
  }

  // 2) Legacy slice keys (zustand or raw form) — keep for pre-v2 users
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return null;
    const parsed = parsePersistedEnvelope(raw);
    return (
      parsed?.settings ??
      parsed ??
      null
    );
  } catch {
    return null;
  }
}

export function currentLanguageFromSettings(
  settings: Partial<AppSettings> | null | undefined
): LanguageCode {
  const cand = settings?.language ?? DEFAULT_LANGUAGE;
  return cand === 'zh' || cand === 'en' ? cand : DEFAULT_LANGUAGE;
}
