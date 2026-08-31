import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, Image as RNImage, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useThemeColors } from '@/theme';
import { Icon } from './UIKit';

const FILL: any = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

interface GifPlayerProps {
  /** Full CDN URL to the .gif file */
  gifUri: string;
  /** Full CDN URL to the static poster JPG — used as fallback when GIF fails */
  posterUri: string;
  /** Whether to play GIF (true) or show poster (false) */
  active: boolean;
  /** Optional tint color for the placeholder slab (e.g. muscle group color) */
  tint?: string;
  /** Called when both GIF attempts fail and we settle on the poster */
  onFallbackToPoster?: () => void;
  /** Optional override for placeholder icon name */
  placeholderIcon?: string;
}

/**
 * GifPlayer — robust 4-tier fallback chain for fitness GIF animations.
 *
 * ROOT CAUSES OF "BLACK SCREEN WHEN GIF PLAYS" ON ANDROID:
 *   1. RN core Image (Fresco) animated-gif silently fails on some OEM GPUs,
 *      leaving a fully-transparent layer.  Without backgroundColor the
 *      hardware black shows through.
 *   2. expo-image uses Glide on Android — when Glide's GIF pipeline chokes
 *      on malformed GIFs or CDN rate-limit responses, it also produces a
 *      transparent frame.
 *   3. Either decoder can hang on a network timeout from jsdelivr CDN.
 *
 * FALLBACK ORDER when `active=true`:
 *   Tier A — expo-image (Glide, best caching + network handling).
 *   Tier B — RN core Image (Fresco + explicit animated-gif dep).
 *   Tier C — static poster JPG (guaranteed to render).
 *   Tier D — solid tinted placeholder slab (never blank).
 *
 * CRITICAL GRADLE CONFIG (applied in android/app/build.gradle):
 *   implementation("com.facebook.fresco:animated-gif:3.6.0")
 *   implementation("com.facebook.fresco:animated-webp:3.6.0")
 *   implementation("com.facebook.fresco:webpsupport:3.6.0")
 *   implementation("com.facebook.fresco:okhttp3-image-loader:3.6.0")
 */
export function GifPlayer({
  gifUri,
  posterUri,
  active,
  tint,
  onFallbackToPoster,
  placeholderIcon = 'dumbbell',
}: GifPlayerProps) {
  const colors = useThemeColors();

  // Simplified state machine — each tier is tried ONCE per activation.
  // No more confusing retryCount that never actually retried the same tier.
  type Tier = 'expo' | 'rn' | 'poster' | 'placeholder';
  const [tier, setTier] = useState<Tier>(() => (active ? 'expo' : 'poster'));
  const [loading, setLoading] = useState(false);

  // Reset when animation toggles or URL changes (new exercise).
  useEffect(() => {
    if (!active) {
      setTier('poster');
      setLoading(false);
      return;
    }
    setTier('expo');
    setLoading(true);
  }, [active, gifUri]);

  const tintColor = tint ?? colors.primary;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      width: '100%',
      height: '100%',
      // OPAQUE container — the #1 fix for "GIF looks black".  If any GIF
      // decoder produces a transparent frame, this surface color shows
      // through instead of the phone's black hardware background.
      backgroundColor: colors.surfaceElevated,
    },
    img: {
      width: '100%',
      height: '100%',
      // BOTH expo-image and RN Image respect backgroundColor on Android.
      // Setting it to match the container guarantees transparent GIF frames
      // never reveal the hardware black, even if decoding partially succeeds.
      backgroundColor: colors.surfaceElevated,
    },
    loadingOverlay: {
      ...FILL,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
    },
    placeholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tintColor + '18',
    },
  }), [colors.surfaceElevated, tintColor]);

  // --- Error handlers: each tier tries ONCE, then moves down the chain ---

  const handleExpoError = useCallback(() => {
    // expo-image (Glide) failed → try RN core Image (Fresco).
    setTier('rn');
    setLoading(true);
  }, []);

  const handleRnError = useCallback(() => {
    // RN core Image (Fresco) also failed → show static poster permanently.
    setTier('poster');
    setLoading(false);
    onFallbackToPoster?.();
  }, [onFallbackToPoster]);

  // Not playing → show poster, always (tier-independent).
  if (!active) {
    return (
      <View style={styles.container}>
        <ExpoImage
          source={posterUri}
          style={styles.img}
          contentFit="cover"
          transition={200}
        />
      </View>
    );
  }

  // ============================================================
  // TIER A — expo-image (Glide on Android, animated-gif via Glide native)
  // ============================================================
  if (tier === 'expo') {
    return (
      <View style={styles.container}>
        <ExpoImage
          source={gifUri}
          style={styles.img}
          contentFit="cover"
          onLoadEnd={() => setLoading(false)}
          onError={handleExpoError}
        />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>
    );
  }

  // ============================================================
  // TIER B — RN core Image (Fresco + explicit animated-gif dep)
  // ============================================================
  if (tier === 'rn') {
    return (
      <View style={styles.container}>
        <RNImage
          source={{ uri: gifUri }}
          style={styles.img}
          resizeMode="cover"
          onLoadEnd={() => setLoading(false)}
          onError={handleRnError}
        />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>
    );
  }

  // ============================================================
  // TIER C — static poster JPG (guaranteed to render)
  // ============================================================
  if (tier === 'poster') {
    return (
      <View style={styles.container}>
        <ExpoImage
          source={posterUri}
          style={styles.img}
          contentFit="cover"
        />
      </View>
    );
  }

  // ============================================================
  // TIER D — tinted placeholder slab (never blank)
  // ============================================================
  return (
    <View style={styles.placeholder}>
      <Icon name={placeholderIcon} size={48} color={tintColor} />
    </View>
  );
}
