export const DEFAULT_PINTEREST_QUERY = 'ヘアスタイル 日本人 女性';

export const JAPANESE_PRESETS = [
  { label: 'ボブ', query: 'ヘアスタイル 日本人 ボブ' },
  { label: 'ショート', query: 'ヘアスタイル 日本人 ショート' },
  { label: 'ミディアム', query: 'ヘアスタイル 日本人 ミディアム' },
  { label: 'レイヤー', query: 'ヘアスタイル 日本人 レイヤー' },
  { label: '前髪あり', query: 'ヘアスタイル 日本人 前髪あり' },
  { label: '韓国風', query: 'ヘアスタイル 韓国風 日本人' },
  { label: 'メンズ', query: 'ヘアスタイル 日本人 メンズ' },
] as const;

export function buildPinterestSearchUrl(query: string): string {
  const normalized = query.trim() || DEFAULT_PINTEREST_QUERY;
  return `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(normalized)}`;
}

export function shouldStartLoadWithRequest(url: string): boolean {
  if (!url) return false;
  if (url === 'about:blank' || url.startsWith('about:srcdoc')) return true;
  return /^(https?|about):\/\//.test(url) || url.startsWith('about:');
}

export function isPinDetailUrl(url: string): boolean {
  return url.includes('/pin/');
}

export function extractPageLabel(title: string | undefined, url: string): string {
  if (title?.trim()) return title.trim();
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Pinterest';
  }
}
