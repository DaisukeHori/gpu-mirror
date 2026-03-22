import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const mobileRoot = path.resolve(__dirname, '../..');

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf-8');
}

describe('Android regression: no iPad-only references remain in user-facing text', () => {
  it('terms.tsx does not contain "iPad アプリ"', () => {
    const content = readSourceFile('app/(main)/terms.tsx');
    expect(content).not.toContain('iPad アプリ');
  });

  it('terms.tsx uses "モバイルアプリ" instead', () => {
    const content = readSourceFile('app/(main)/terms.tsx');
    expect(content).toContain('モバイルアプリ');
  });

  it('settings.tsx does not contain "iPad運用"', () => {
    const content = readSourceFile('app/settings.tsx');
    expect(content).not.toContain('iPad運用');
  });

  it('settings.tsx does not contain "iPad flow"', () => {
    const content = readSourceFile('app/settings.tsx');
    expect(content).not.toContain('iPad flow');
  });

  it('settings.tsx uses "モバイル運用" instead', () => {
    const content = readSourceFile('app/settings.tsx');
    expect(content).toContain('モバイル運用');
  });

  it('settings.tsx uses "iOS・Android flow" instead', () => {
    const content = readSourceFile('app/settings.tsx');
    expect(content).toContain('iOS・Android flow');
  });

  it('README uses "iOS / Android アプリ" instead of "iPad ネイティブアプリ"', () => {
    const content = fs.readFileSync(path.join(mobileRoot, '../../README.md'), 'utf-8');
    expect(content).not.toContain('iPad ネイティブアプリ');
    expect(content).toContain('iOS / Android アプリ');
  });
});

describe('Android regression: no hardcoded paddingTop: 60 remains', () => {
  it('result.tsx does not contain paddingTop: 60', () => {
    const content = readSourceFile('app/(main)/result.tsx');
    expect(content).not.toContain('paddingTop: 60');
  });

  it('result.tsx uses insets.top', () => {
    const content = readSourceFile('app/(main)/result.tsx');
    expect(content).toContain('insets.top');
  });

  it('FullscreenViewer.tsx does not contain paddingTop: 60', () => {
    const content = readSourceFile('components/result/FullscreenViewer.tsx');
    expect(content).not.toContain('paddingTop: 60');
    expect(content).not.toContain('top: 60');
  });

  it('FullscreenViewer.tsx uses insets.top', () => {
    const content = readSourceFile('components/result/FullscreenViewer.tsx');
    expect(content).toContain('insets.top');
  });
});

describe('Android regression: no static Dimensions.get remains in FullscreenViewer', () => {
  it('FullscreenViewer.tsx does not import Dimensions', () => {
    const content = readSourceFile('components/result/FullscreenViewer.tsx');
    expect(content).not.toMatch(/\bDimensions\b/);
  });

  it('FullscreenViewer.tsx uses useWindowDimensions', () => {
    const content = readSourceFile('components/result/FullscreenViewer.tsx');
    expect(content).toContain('useWindowDimensions');
  });
});

describe('Android regression: BackHandler is imported in PinterestBrowser.native', () => {
  it('PinterestBrowser.native.tsx imports BackHandler', () => {
    const content = readSourceFile('components/explore/PinterestBrowser.native.tsx');
    expect(content).toContain('BackHandler');
  });

  it('PinterestBrowser.native.tsx registers handler only for android', () => {
    const content = readSourceFile('components/explore/PinterestBrowser.native.tsx');
    expect(content).toContain("Platform.OS !== 'android'");
  });
});

describe('Android regression: image-cache.ts has platform-specific UA', () => {
  it('image-cache.ts imports Platform', () => {
    const content = readSourceFile('lib/image-cache.ts');
    expect(content).toContain("import { Platform } from 'react-native'");
  });

  it('image-cache.ts branches on Platform.OS for User-Agent', () => {
    const content = readSourceFile('lib/image-cache.ts');
    expect(content).toContain("Platform.OS === 'android'");
    expect(content).toContain('Android');
    expect(content).toContain('iPad');
  });
});

describe('Android regression: expo-image-picker plugin is in app.json', () => {
  it('app.json plugins contain expo-image-picker', () => {
    const appJson = JSON.parse(readSourceFile('app.json'));
    const pluginNames = appJson.expo.plugins.map((p: string | [string, unknown]) =>
      Array.isArray(p) ? p[0] : p,
    );
    expect(pluginNames).toContain('expo-image-picker');
  });
});

describe('Android regression: permission check before image picker', () => {
  it('ImageUploader.tsx calls requestMediaLibraryPermissionsAsync', () => {
    const content = readSourceFile('components/explore/ImageUploader.tsx');
    expect(content).toContain('requestMediaLibraryPermissionsAsync');
  });

  it('camera.tsx calls requestMediaLibraryPermissionsAsync in handlePickFromLibrary', () => {
    const content = readSourceFile('app/(main)/camera.tsx');
    expect(content).toContain('requestMediaLibraryPermissionsAsync');
  });
});

describe('Android regression: deep link handler in _layout.tsx', () => {
  it('_layout.tsx imports Linking', () => {
    const content = readSourceFile('app/_layout.tsx');
    expect(content).toContain("import * as Linking from 'expo-linking'");
  });

  it('_layout.tsx calls getInitialURL', () => {
    const content = readSourceFile('app/_layout.tsx');
    expect(content).toContain('getInitialURL');
  });

  it('_layout.tsx registers addEventListener for url', () => {
    const content = readSourceFile('app/_layout.tsx');
    expect(content).toContain("addEventListener('url'");
  });

  it('_layout.tsx has catch on getInitialURL', () => {
    const content = readSourceFile('app/_layout.tsx');
    expect(content).toContain('.catch');
  });

  it('_layout.tsx skips deep link handling on web', () => {
    const content = readSourceFile('app/_layout.tsx');
    expect(content).toContain("Platform.OS === 'web'");
  });
});

describe('Android regression: CSV export uses file system on native', () => {
  it('sessions.tsx imports FileSystem', () => {
    const content = readSourceFile('app/(main)/(admin)/sessions.tsx');
    expect(content).toContain("import * as FileSystem from 'expo-file-system/legacy'");
  });

  it('sessions.tsx imports Sharing', () => {
    const content = readSourceFile('app/(main)/(admin)/sessions.tsx');
    expect(content).toContain("import * as Sharing from 'expo-sharing'");
  });

  it('sessions.tsx does not import Share from react-native', () => {
    const content = readSourceFile('app/(main)/(admin)/sessions.tsx');
    expect(content).not.toMatch(/\bShare\b.*from\s+'react-native'/);
    expect(content).not.toMatch(/import\s*\{[^}]*\bShare\b[^}]*\}\s*from\s+'react-native'/);
  });

  it('sessions.tsx downloadCsv has try-catch for write/share errors', () => {
    const content = readSourceFile('app/(main)/(admin)/sessions.tsx');
    const downloadCsvSection = content.slice(
      content.indexOf('async function downloadCsv'),
      content.indexOf('function buildCsv'),
    );
    expect(downloadCsvSection).toContain('try {');
    expect(downloadCsvSection).toContain('catch');
  });
});

describe('Bug fixes: code-level verification', () => {
  it('FullscreenViewer uses onFinalize instead of onEnd for LongPress', () => {
    const content = readSourceFile('components/result/FullscreenViewer.tsx');
    expect(content).toContain('.onFinalize');
    expect(content).not.toMatch(/\.onEnd\(\(\) => \{\s*setShowBefore\(false\)/);
  });

  it('PinterestBrowser handleNavStateChange has onPinDetailChange in deps', () => {
    const content = readSourceFile('components/explore/PinterestBrowser.native.tsx');
    expect(content).toContain('[onPinDetailChange]');
    expect(content).not.toMatch(/handleNavStateChange[\s\S]*?\[\],\s*\)/);
  });

  it('GlamourTile does not call impactLight directly (avoids double haptics)', () => {
    const content = readSourceFile('app/(main)/result.tsx');
    const glamourTileFn = content.slice(content.indexOf('function GlamourTile'));
    expect(glamourTileFn).not.toContain('impactLight()');
  });

  it('sessions.tsx CSV pagination loop has empty page break', () => {
    const content = readSourceFile('app/(main)/(admin)/sessions.tsx');
    expect(content).toContain('if (response.sessions.length === 0) break');
  });

  it('sessions.tsx CSV pagination loop has max page guard', () => {
    const content = readSourceFile('app/(main)/(admin)/sessions.tsx');
    expect(content).toContain('currentPage <= 100');
  });

  it('generation-cache passes is_favorite from meta', () => {
    const content = readSourceFile('lib/generation-cache.ts');
    expect(content).toContain('meta.is_favorite ?? false');
  });

  it('result.tsx passes is_favorite to downloadAndCache', () => {
    const content = readSourceFile('app/(main)/result.tsx');
    expect(content).toContain('is_favorite: g.is_favorite');
  });

  it('_layout.tsx has .catch on getInitialURL', () => {
    const content = readSourceFile('app/_layout.tsx');
    const linkingSection = content.slice(content.indexOf('getInitialURL'));
    expect(linkingSection).toContain('.catch');
  });

  it('sessions.tsx downloadCsv has try-catch around write/share', () => {
    const content = readSourceFile('app/(main)/(admin)/sessions.tsx');
    const downloadCsvSection = content.slice(
      content.indexOf('async function downloadCsv'),
      content.indexOf('function buildCsv'),
    );
    expect(downloadCsvSection).toContain('try {');
    expect(downloadCsvSection).toContain('ファイルの書き出しまたは共有に失敗しました');
  });
});

describe('Android regression: eas.json has Android profiles', () => {
  it('eas.json has Android preview build type', () => {
    const easJson = JSON.parse(readSourceFile('eas.json'));
    expect(easJson.build.preview.android).toBeDefined();
    expect(easJson.build.preview.android.buildType).toBe('apk');
  });

  it('eas.json has Android production build type', () => {
    const easJson = JSON.parse(readSourceFile('eas.json'));
    expect(easJson.build.production.android).toBeDefined();
    expect(easJson.build.production.android.buildType).toBe('app-bundle');
  });

  it('eas.json has Android submit config', () => {
    const easJson = JSON.parse(readSourceFile('eas.json'));
    expect(easJson.submit.production.android).toBeDefined();
  });
});

describe('Structural guards: prevent previously found bugs from recurring', () => {
  it('useGenerate.ts has no useEffect inside useCallback', () => {
    const content = readSourceFile('hooks/useGenerate.ts');
    const callbacks = content.split('useCallback(');
    for (let i = 1; i < callbacks.length; i++) {
      let depth = 0;
      let callbackBody = '';
      for (const ch of callbacks[i]) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (depth < 0) break;
        callbackBody += ch;
      }
      expect(callbackBody).not.toContain('useEffect(');
    }
  });

  it('ShareSheet.tsx uses expo-file-system/legacy, not new API', () => {
    const content = readSourceFile('components/result/ShareSheet.tsx');
    expect(content).toContain("from 'expo-file-system/legacy'");
    expect(content).not.toContain('FileSystem.File');
    expect(content).not.toContain('FileSystem.Paths');
  });

  it('ShareSheet.tsx skips download for file:// URIs', () => {
    const content = readSourceFile('components/result/ShareSheet.tsx');
    expect(content).toContain("startsWith('file://')");
  });

  it('PinterestBrowser.tsx uses forwardRef', () => {
    const content = readSourceFile('components/explore/PinterestBrowser.tsx');
    expect(content).toContain('forwardRef');
  });

  it('PinterestBrowser.tsx exports PinterestBrowserHandle', () => {
    const content = readSourceFile('components/explore/PinterestBrowser.tsx');
    expect(content).toContain('PinterestBrowserHandle');
  });

  it('no screen uses theme.colors.bg (should be theme.colors.background)', () => {
    const screens = [
      'app/(main)/result.tsx',
      'app/(main)/confirm.tsx',
      'app/(main)/photo-prep.tsx',
      'app/(main)/explore.tsx',
      'app/(main)/generating.tsx',
      'app/(main)/terms.tsx',
      'app/(main)/camera.tsx',
      'app/(main)/(admin)/sessions.tsx',
    ];
    for (const screen of screens) {
      const content = readSourceFile(screen);
      expect(content).not.toMatch(/theme\.colors\.bg\b/);
    }
  });

  it('no screen has hardcoded paddingTop: 60', () => {
    const screens = [
      'app/(main)/result.tsx',
      'app/(main)/confirm.tsx',
      'app/(main)/photo-prep.tsx',
      'app/(main)/terms.tsx',
    ];
    for (const screen of screens) {
      const content = readSourceFile(screen);
      expect(content).not.toContain('paddingTop: 60');
    }
  });

  it('no screen header uses pt-16 without safe area', () => {
    const screens = [
      'app/(main)/explore.tsx',
      'app/(main)/generating.tsx',
      'app/(main)/(admin)/sessions.tsx',
    ];
    for (const screen of screens) {
      const content = readSourceFile(screen);
      expect(content).not.toMatch(/className="[^"]*pt-16[^"]*"/);
    }
  });

  it('CSV functions are imported from lib/csv.ts, not defined locally in sessions.tsx', () => {
    const content = readSourceFile('app/(main)/(admin)/sessions.tsx');
    expect(content).toContain("from '../../../lib/csv'");
    expect(content).not.toMatch(/^function escapeCsvCell/m);
    expect(content).not.toMatch(/^function buildCsv/m);
  });

  it('Pinterest helpers are imported from lib/pinterest-helpers.ts', () => {
    const content = readSourceFile('components/explore/PinterestBrowser.native.tsx');
    expect(content).toContain("from '../../lib/pinterest-helpers'");
    expect(content).not.toMatch(/^function buildPinterestSearchUrl/m);
    expect(content).not.toMatch(/^const DEFAULT_QUERY/m);
  });

  it('upload route checks session ownership', () => {
    const fs = require('node:fs');
    const p = require('node:path');
    const content = fs.readFileSync(
      p.resolve(__dirname, '../../../../apps/api/app/api/upload/route.ts'), 'utf-8',
    );
    expect(content).toContain('staff_id');
    expect(content).toContain('Access denied');
  });

  it('proxy-image route checks session ownership', () => {
    const fs = require('node:fs');
    const p = require('node:path');
    const content = fs.readFileSync(
      p.resolve(__dirname, '../../../../apps/api/app/api/proxy-image/route.ts'), 'utf-8',
    );
    expect(content).toContain('staff_id');
    expect(content).toContain('Access denied');
  });

  it('sessions PATCH resets closed_at to null when reopening', () => {
    const fs = require('node:fs');
    const p = require('node:path');
    const content = fs.readFileSync(
      p.resolve(__dirname, '../../../../apps/api/app/api/sessions/[id]/route.ts'), 'utf-8',
    );
    expect(content).toContain('closed_at = null');
  });
});
