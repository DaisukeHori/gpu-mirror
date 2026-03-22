import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const mobileRoot = path.resolve(__dirname, '../..');
const appJson = JSON.parse(fs.readFileSync(path.join(mobileRoot, 'app.json'), 'utf-8'));
const easJson = JSON.parse(fs.readFileSync(path.join(mobileRoot, 'eas.json'), 'utf-8'));
const expo = appJson.expo;

describe('app.json configuration', () => {
  describe('basic metadata', () => {
    it('has a name', () => {
      expect(expo.name).toBe('REVOL Mirror');
    });

    it('has a slug', () => {
      expect(expo.slug).toBe('revol-mirror');
    });

    it('has a version string', () => {
      expect(expo.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('has a custom URL scheme', () => {
      expect(expo.scheme).toBe('revol-mirror');
    });

    it('uses dark user interface style', () => {
      expect(expo.userInterfaceStyle).toBe('dark');
    });
  });

  describe('iOS configuration', () => {
    it('has an iOS section', () => {
      expect(expo.ios).toBeDefined();
    });

    it('has a bundle identifier', () => {
      expect(expo.ios.bundleIdentifier).toBe('com.revol.mirror');
    });

    it('supports tablets', () => {
      expect(expo.ios.supportsTablet).toBe(true);
    });

    it('has a camera usage description', () => {
      expect(expo.ios.infoPlist.NSCameraUsageDescription).toBeTruthy();
    });

    it('has a photo library usage description', () => {
      expect(expo.ios.infoPlist.NSPhotoLibraryUsageDescription).toBeTruthy();
    });
  });

  describe('Android configuration', () => {
    it('has an Android section', () => {
      expect(expo.android).toBeDefined();
    });

    it('has a package name matching iOS bundle ID', () => {
      expect(expo.android.package).toBe('com.revol.mirror');
    });

    it('has a versionCode for Play Store', () => {
      expect(expo.android.versionCode).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(expo.android.versionCode)).toBe(true);
    });

    it('has explicit permissions for camera and media', () => {
      expect(expo.android.permissions).toContain('CAMERA');
      expect(expo.android.permissions).toContain('READ_MEDIA_IMAGES');
    });

    describe('adaptive icon', () => {
      it('has an adaptiveIcon section', () => {
        expect(expo.android.adaptiveIcon).toBeDefined();
      });

      it('has a foreground image path', () => {
        expect(expo.android.adaptiveIcon.foregroundImage).toBeTruthy();
      });

      it('has a background image path', () => {
        expect(expo.android.adaptiveIcon.backgroundImage).toBeTruthy();
      });

      it('has a monochrome image path', () => {
        expect(expo.android.adaptiveIcon.monochromeImage).toBeTruthy();
      });

      it('has a background color', () => {
        expect(expo.android.adaptiveIcon.backgroundColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });

      it('foreground image file exists', () => {
        const fullPath = path.join(mobileRoot, expo.android.adaptiveIcon.foregroundImage);
        expect(fs.existsSync(fullPath)).toBe(true);
      });

      it('background image file exists', () => {
        const fullPath = path.join(mobileRoot, expo.android.adaptiveIcon.backgroundImage);
        expect(fs.existsSync(fullPath)).toBe(true);
      });

      it('monochrome image file exists', () => {
        const fullPath = path.join(mobileRoot, expo.android.adaptiveIcon.monochromeImage);
        expect(fs.existsSync(fullPath)).toBe(true);
      });
    });
  });

  describe('splash screen', () => {
    it('has a splash section', () => {
      expect(expo.splash).toBeDefined();
    });

    it('splash image file exists', () => {
      const fullPath = path.join(mobileRoot, expo.splash.image);
      expect(fs.existsSync(fullPath)).toBe(true);
    });

    it('has a background color', () => {
      expect(expo.splash.backgroundColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('web configuration', () => {
    it('has a web section', () => {
      expect(expo.web).toBeDefined();
    });

    it('favicon file exists', () => {
      const fullPath = path.join(mobileRoot, expo.web.favicon);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });

  describe('icon', () => {
    it('main icon file exists', () => {
      const fullPath = path.join(mobileRoot, expo.icon);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });

  describe('plugins', () => {
    const pluginNames = expo.plugins.map((p: string | [string, unknown]) =>
      Array.isArray(p) ? p[0] : p,
    );

    it('includes expo-router', () => {
      expect(pluginNames).toContain('expo-router');
    });

    it('includes expo-camera', () => {
      expect(pluginNames).toContain('expo-camera');
    });

    it('includes expo-image-picker', () => {
      expect(pluginNames).toContain('expo-image-picker');
    });

    it('includes expo-sharing', () => {
      expect(pluginNames).toContain('expo-sharing');
    });

    it('includes expo-secure-store', () => {
      expect(pluginNames).toContain('expo-secure-store');
    });

    it('includes expo-web-browser', () => {
      expect(pluginNames).toContain('expo-web-browser');
    });

    it('expo-camera has a camera permission message', () => {
      const camPlugin = expo.plugins.find(
        (p: string | [string, unknown]) => Array.isArray(p) && p[0] === 'expo-camera',
      );
      expect(camPlugin).toBeDefined();
      expect(camPlugin[1].cameraPermission).toBeTruthy();
    });

    it('expo-image-picker has a photos permission message', () => {
      const pickerPlugin = expo.plugins.find(
        (p: string | [string, unknown]) => Array.isArray(p) && p[0] === 'expo-image-picker',
      );
      expect(pickerPlugin).toBeDefined();
      expect(pickerPlugin[1].photosPermission).toBeTruthy();
    });
  });
});

describe('eas.json configuration', () => {
  it('has a CLI version requirement', () => {
    expect(easJson.cli.version).toBeDefined();
  });

  describe('build profiles', () => {
    it('has a development profile', () => {
      expect(easJson.build.development).toBeDefined();
    });

    it('development uses dev client', () => {
      expect(easJson.build.development.developmentClient).toBe(true);
    });

    it('has a preview profile', () => {
      expect(easJson.build.preview).toBeDefined();
    });

    it('preview has iOS simulator config', () => {
      expect(easJson.build.preview.ios.simulator).toBe(true);
    });

    it('preview has Android APK build type', () => {
      expect(easJson.build.preview.android.buildType).toBe('apk');
    });

    it('has a production profile', () => {
      expect(easJson.build.production).toBeDefined();
    });

    it('production iOS uses Release configuration', () => {
      expect(easJson.build.production.ios.buildConfiguration).toBe('Release');
    });

    it('production Android uses app-bundle', () => {
      expect(easJson.build.production.android.buildType).toBe('app-bundle');
    });
  });

  describe('submit profiles', () => {
    it('has a production submit profile', () => {
      expect(easJson.submit.production).toBeDefined();
    });

    it('has iOS submit config', () => {
      expect(easJson.submit.production.ios).toBeDefined();
    });

    it('has Android submit config', () => {
      expect(easJson.submit.production.android).toBeDefined();
    });

    it('Android submit has a service account key path', () => {
      expect(easJson.submit.production.android.serviceAccountKeyPath).toBeTruthy();
    });

    it('Android submit targets internal track', () => {
      expect(easJson.submit.production.android.track).toBe('internal');
    });
  });
});
