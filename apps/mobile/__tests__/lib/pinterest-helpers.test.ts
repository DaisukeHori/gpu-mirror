import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PINTEREST_QUERY,
  JAPANESE_PRESETS,
  buildPinterestSearchUrl,
  shouldStartLoadWithRequest,
  isPinDetailUrl,
  extractPageLabel,
} from '../../lib/pinterest-helpers';

describe('buildPinterestSearchUrl', () => {
  it('encodes a Japanese query', () => {
    const url = buildPinterestSearchUrl('ボブ');
    expect(url).toContain('pinterest.com/search/pins/');
    expect(url).toContain(encodeURIComponent('ボブ'));
  });

  it('uses default query for empty string', () => {
    const url = buildPinterestSearchUrl('');
    expect(url).toContain(encodeURIComponent(DEFAULT_PINTEREST_QUERY));
  });

  it('uses default query for whitespace-only string', () => {
    const url = buildPinterestSearchUrl('   ');
    expect(url).toContain(encodeURIComponent(DEFAULT_PINTEREST_QUERY));
  });

  it('trims whitespace from the query', () => {
    const url = buildPinterestSearchUrl('  ショート  ');
    expect(url).toContain(encodeURIComponent('ショート'));
  });
});

describe('shouldStartLoadWithRequest', () => {
  it('allows HTTPS URLs', () => {
    expect(shouldStartLoadWithRequest('https://www.pinterest.com/pin/123')).toBe(true);
  });

  it('allows HTTP URLs', () => {
    expect(shouldStartLoadWithRequest('http://example.com')).toBe(true);
  });

  it('allows about:blank', () => {
    expect(shouldStartLoadWithRequest('about:blank')).toBe(true);
  });

  it('allows about:srcdoc', () => {
    expect(shouldStartLoadWithRequest('about:srcdoc')).toBe(true);
  });

  it('blocks empty URLs', () => {
    expect(shouldStartLoadWithRequest('')).toBe(false);
  });

  it('blocks javascript: URLs', () => {
    expect(shouldStartLoadWithRequest('javascript:void(0)')).toBe(false);
  });

  it('blocks data: URLs', () => {
    expect(shouldStartLoadWithRequest('data:text/html,<h1>Hi</h1>')).toBe(false);
  });

  it('blocks custom scheme URLs', () => {
    expect(shouldStartLoadWithRequest('intent://something')).toBe(false);
    expect(shouldStartLoadWithRequest('pinterest://pin/123')).toBe(false);
  });
});

describe('isPinDetailUrl', () => {
  it('returns true for a pin detail URL', () => {
    expect(isPinDetailUrl('https://www.pinterest.com/pin/123456789/')).toBe(true);
  });

  it('returns false for a search URL', () => {
    expect(isPinDetailUrl('https://www.pinterest.com/search/pins/?q=bob')).toBe(false);
  });
});

describe('extractPageLabel', () => {
  it('uses the title when available', () => {
    expect(extractPageLabel('My Pin', 'https://www.pinterest.com')).toBe('My Pin');
  });

  it('extracts hostname without www when title is empty', () => {
    expect(extractPageLabel('', 'https://www.pinterest.com/pin/123')).toBe('pinterest.com');
  });

  it('extracts hostname when title is undefined', () => {
    expect(extractPageLabel(undefined, 'https://www.pinterest.com/search')).toBe('pinterest.com');
  });

  it('falls back to "Pinterest" for an invalid URL', () => {
    expect(extractPageLabel(undefined, 'not-a-url')).toBe('Pinterest');
  });

  it('trims whitespace from the title', () => {
    expect(extractPageLabel('  Pin Title  ', 'https://example.com')).toBe('Pin Title');
  });
});

describe('JAPANESE_PRESETS', () => {
  it('has at least 5 presets', () => {
    expect(JAPANESE_PRESETS.length).toBeGreaterThanOrEqual(5);
  });

  it('each preset has label and query', () => {
    for (const preset of JAPANESE_PRESETS) {
      expect(preset.label).toBeTruthy();
      expect(preset.query).toBeTruthy();
    }
  });
});
