import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** Bump when 利用規約 / プライバシーポリシー本文を重要変更した場合（再同意が必要になる） */
export const TERMS_CONSENT_VERSION = '1';

const STORAGE_KEY = `revol_mirror_terms_consent_v${TERMS_CONSENT_VERSION}`;

export async function hasRecordedTermsConsent(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === '1';
  }
  try {
    const v = await SecureStore.getItemAsync(STORAGE_KEY);
    return v === '1';
  } catch {
    return false;
  }
}

export async function recordTermsConsent(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1');
    }
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, '1');
}
