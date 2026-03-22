import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SelectedStyle } from '../../lib/types';
import { ExitButton } from '../../components/common/ExitButton';
import { MissingRouteParamsFallback } from '../../components/common/MissingRouteParamsFallback';
import { useCloseSession } from '../../hooks/useCloseSession';
import { apiGet } from '../../lib/api';
import { normalizeRouteParam } from '../../lib/route-params';
import { PinterestBrowser, type PinterestBrowserHandle } from '../../components/explore/PinterestBrowser';
import { CatalogGrid } from '../../components/explore/CatalogGrid';
import { ImageUploader } from '../../components/explore/ImageUploader';
import { ColorPalette } from '../../components/explore/ColorPalette';
import { StyleTray } from '../../components/explore/StyleTray';
import { impactLight } from '../../lib/haptics';
import {
  getStoredSelectedStyles,
  setStoredSelectedStyles,
} from '../../lib/style-selection-store';

export type { SelectedStyle } from '../../lib/types';

const TABS = [
  { key: 'pinterest', label: 'Pinterest' },
  { key: 'catalog', label: 'カタログ' },
  { key: 'upload', label: 'アップロード' },
  { key: 'color', label: 'カラー' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function ExploreScreen() {
  const { sessionId, customerPhotoPath, customerPhotoUrl } = useLocalSearchParams<{
    sessionId: string;
    customerPhotoPath: string;
    customerPhotoUrl: string;
  }>();
  const sid = normalizeRouteParam(sessionId as unknown as string | string[] | undefined);
  const pathParam = normalizeRouteParam(customerPhotoPath as unknown as string | string[] | undefined);
  const urlParam = normalizeRouteParam(customerPhotoUrl as unknown as string | string[] | undefined);

  const closeSession = useCloseSession(sid || undefined);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>(Platform.OS === 'web' ? 'catalog' : 'pinterest');
  const [selectedStyles, setSelectedStyles] = useState<SelectedStyle[]>([]);
  const [hasHydratedSelection, setHasHydratedSelection] = useState(false);
  const [selectedColor, setSelectedColor] = useState<{ id: string; name: string; hex: string } | null>(null);
  const pinterestRef = useRef<PinterestBrowserHandle>(null);
  const [isPinDetail, setIsPinDetail] = useState(false);
  const [addingPin, setAddingPin] = useState(false);

  const [customerHydration, setCustomerHydration] = useState<
    'pending' | 'ready' | 'error'
  >('pending');
  const [resolvedCustomerPath, setResolvedCustomerPath] = useState('');
  const [resolvedCustomerUrl, setResolvedCustomerUrl] = useState('');

  useEffect(() => {
    if (!sid.trim()) {
      return;
    }
    const pathOk = pathParam.trim().length > 0 && pathParam !== 'existing';
    const urlOk = urlParam.trim().length > 0;
    if (pathOk && urlOk) {
      setResolvedCustomerPath(pathParam);
      setResolvedCustomerUrl(urlParam);
      setCustomerHydration('ready');
      return;
    }

    setCustomerHydration('pending');
    let cancelled = false;
    apiGet<{ session: { customer_photo_path: string; customer_photo_url: string | null } }>(
      `/api/sessions/${sid}`,
    )
      .then((res) => {
        if (cancelled) return;
        const p = res.session.customer_photo_path ?? '';
        const u = res.session.customer_photo_url ?? '';
        if (!p.trim() || !u.trim()) {
          setCustomerHydration('error');
          return;
        }
        setResolvedCustomerPath(p);
        setResolvedCustomerUrl(u);
        setCustomerHydration('ready');
      })
      .catch(() => {
        if (!cancelled) setCustomerHydration('error');
      });
    return () => {
      cancelled = true;
    };
  }, [sid, pathParam, urlParam]);

  useEffect(() => {
    setSelectedStyles(getStoredSelectedStyles(sid));
    setHasHydratedSelection(true);
  }, [sid]);

  useEffect(() => {
    if (!hasHydratedSelection) {
      return;
    }
    setStoredSelectedStyles(sid, selectedStyles);
  }, [hasHydratedSelection, sid, selectedStyles]);

  const addStyle = (style: SelectedStyle) => {
    impactLight();
    setAddingPin(false);
    setSelectedStyles((prev) => {
      if (prev.find((s) => s.id === style.id)) return prev;
      return [...prev, style];
    });
  };

  const removeStyle = (id: string) => {
    setSelectedStyles((prev) => prev.filter((s) => s.id !== id));
  };

  const handleConfirm = () => {
    if (selectedStyles.length === 0 || customerHydration !== 'ready') return;
    setStoredSelectedStyles(sid, selectedStyles);
    router.push({
      pathname: '/(main)/confirm',
      params: {
        sessionId: sid,
        customerPhotoPath: resolvedCustomerPath,
        customerPhotoUrl: resolvedCustomerUrl,
        selectedColorId: selectedColor?.id ?? '',
        selectedColorName: selectedColor?.name ?? '',
      },
    });
  };

  if (!sid.trim()) {
    return (
      <MissingRouteParamsFallback message="セッション情報が見つかりません。ホームからやり直してください。" />
    );
  }

  if (customerHydration === 'pending') {
    return (
      <View className="flex-1 bg-bg items-center justify-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#B8956A" />
        <Text className="text-text-muted text-sm mt-4 tracking-wide">読み込み中...</Text>
      </View>
    );
  }

  if (customerHydration === 'error') {
    return (
      <MissingRouteParamsFallback message="お客さまの写真情報を取得できませんでした。ホームからやり直してください。" />
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-4" style={{ paddingTop: insets.top + 12 }}>
        <Pressable className="py-2 pr-4" onPress={() => router.back()}>
          <Text className="text-text-muted text-sm tracking-wide">戻る</Text>
        </Pressable>
        <Text className="text-text-primary text-base font-medium tracking-wide">
          スタイルを探す
        </Text>
        <ExitButton onConfirm={closeSession} />
      </View>

      {/* Tabs — underline style for premium feel */}
      <View className="px-5 mb-3">
        <View className="flex-row border-b border-border">
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              className={`flex-1 items-center pb-3 ${activeTab === tab.key ? 'border-b-2 border-accent' : ''}`}
              onPress={() => {
                impactLight();
                setActiveTab(tab.key);
              }}
            >
              <Text
                className={`text-sm ${activeTab === tab.key ? 'text-text-primary font-medium' : 'text-text-muted'}`}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Tab content */}
      <View className="flex-1">
        {activeTab === 'pinterest' && (
          <PinterestBrowser
            ref={pinterestRef}
            sessionId={sid}
            onSelectImage={addStyle}
            onPinDetailChange={setIsPinDetail}
            onImportStart={() => setAddingPin(true)}
            onImportEnd={() => setAddingPin(false)}
          />
        )}
        {activeTab === 'catalog' && (
          <CatalogGrid onSelectItem={addStyle} />
        )}
        {activeTab === 'upload' && (
          <ImageUploader sessionId={sid} onUpload={addStyle} />
        )}
        {activeTab === 'color' && (
          <ColorPalette
            selectedColorId={selectedColor?.id}
            onSelectColor={(id, name, hex) => {
              setSelectedColor({ id, name, hex });
              addStyle({
                id: `color-${id}`,
                thumbnailUrl: '',
                storagePath: '',
                label: name,
                referenceType: 'color_only',
                colorId: id,
                colorName: name,
                colorHex: hex,
              });
            }}
          />
        )}
      </View>

      {/* Selection Tray */}
      <StyleTray
        styles={selectedStyles}
        onRemove={removeStyle}
        onConfirm={handleConfirm}
        isPinDetail={activeTab === 'pinterest' && isPinDetail}
        addingPin={addingPin}
        onAddCurrentPin={() => pinterestRef.current?.selectCurrentPin()}
      />
    </View>
  );
}
