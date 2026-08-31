import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/store/useAppStore';

/**
 * Centralized haptic feedback helper.  Respects the user's
 * `settings.hapticFeedback` toggle so the preferences page is not a lie.
 *
 * Usage (replace all inline `Haptics.impactAsync` / `notificationAsync` calls):
 *   import { safeHaptic } from '@/utils/haptic';
 *   safeHaptic('light');
 *   safeHaptic('success');
 */
export type HapticKind =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

export function safeHaptic(kind: HapticKind = 'light'): void {
  // Pull synchronously from store to avoid requiring React hooks context.
  // Works both inside and outside of component trees.
  let enabled: boolean;
  try {
    enabled = !!useAppStore.getState().settings.hapticFeedback;
  } catch {
    enabled = true;
  }
  if (!enabled) return;

  try {
    switch (kind) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'selection':
        Haptics.selectionAsync();
        break;
    }
  } catch {
    // iOS 模拟器 / 低端 Android 不支持，静默即可。
  }
}
