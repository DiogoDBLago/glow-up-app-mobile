/**
 * Platform abstraction layer (React Native).
 *
 * Mirrors the web's `Storage` API but backed by AsyncStorage. The only
 * structural difference from the web version: every method is async here
 * (AsyncStorage has no synchronous API), so callers in store.tsx that used
 * to read localStorage synchronously had to become async too.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const Storage = {
  getItem: (key: string): Promise<string | null> => AsyncStorage.getItem(key).catch(() => null),

  setItem: (key: string, value: string): Promise<void> =>
    AsyncStorage.setItem(key, value).catch(() => undefined),

  removeItem: (key: string): Promise<void> => AsyncStorage.removeItem(key).catch(() => undefined),

  clear: (): Promise<void> => AsyncStorage.clear().catch(() => undefined),
};
