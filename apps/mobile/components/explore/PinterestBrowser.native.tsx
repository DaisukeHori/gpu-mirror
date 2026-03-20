import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Text, Pressable, Alert, TextInput, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { PINTEREST_INJECT_SCRIPT } from '../../lib/pinterest-inject';
import { usePinterest } from '../../hooks/usePinterest';
import type { SelectedStyle } from '../../lib/types';
import { impactLight } from '../../lib/haptics';

const DEFAULT_QUERY = 'ヘアスタイル 日本人 女性';
const JAPANESE_PRESETS = [
  { label: 'ボブ', query: 'ヘアスタイル 日本人 ボブ' },
  { label: 'ショート', query: 'ヘアスタイル 日本人 ショート' },
  { label: 'ミディアム', query: 'ヘアスタイル 日本人 ミディアム' },
  { label: 'レイヤー', query: 'ヘアスタイル 日本人 レイヤー' },
  { label: '前髪あり', query: 'ヘアスタイル 日本人 前髪あり' },
  { label: '韓国風', query: 'ヘアスタイル 韓国風 日本人' },
  { label: 'メンズ', query: 'ヘアスタイル 日本人 メンズ' },
] as const;

function buildPinterestSearchUrl(query: string) {
  const normalized = query.trim() || DEFAULT_QUERY;
  return `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(normalized)}`;
}

interface PinterestBrowserProps {
  sessionId: string;
  onSelectImage: (style: SelectedStyle) => void;
  onPinDetailChange?: (isPinDetail: boolean) => void;
  onImportStart?: () => void;
  onImportEnd?: () => void;
}

export interface PinterestBrowserHandle {
  selectCurrentPin: () => void;
}

export const PinterestBrowser = forwardRef<PinterestBrowserHandle, PinterestBrowserProps>(function PinterestBrowser({ sessionId, onSelectImage, onPinDetailChange, onImportStart, onImportEnd }, ref) {
  const webviewRef = useRef<WebView>(null);
  const { loading, importImage } = usePinterest(sessionId);
  const [showTooltip, setShowTooltip] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [pageLabel, setPageLabel] = useState('Pinterest');
  const [searchQuery, setSearchQuery] = useState(DEFAULT_QUERY);
  const [webUrl, setWebUrl] = useState(buildPinterestSearchUrl(DEFAULT_QUERY));
  const [isPinDetail, setIsPinDetail] = useState(false);

  const handleMessage = useCallback(
    async (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'unsupported_video') {
          Alert.alert('動画は選択できません', '別のヘアスタイル画像をお試しください。');
          return;
        }
        if (data.type === 'long_press_image' && data.url) {
          impactLight();
          setShowTooltip(false);
          onImportStart?.();
          try {
            const result = await importImage(data.url);
            onSelectImage({
              id: result.storagePath,
              thumbnailUrl: result.signedUrl || data.url,
              localThumbnailUri: result.localFileUri,
              storagePath: result.storagePath,
              label: 'Pinterest',
              referenceType: 'pinterest',
              sourceUrl: data.url,
            });
            onImportEnd?.();
          } catch (err) {
            onImportEnd?.();
            Alert.alert(
              '画像の取り込みに失敗しました',
              err instanceof Error ? err.message : '別の画像をお試しください。',
            );
          }
        }
      } catch {
        // ignore
      }
    },
    [importImage, onSelectImage, onImportStart, onImportEnd],
  );


  const handleNavStateChange = useCallback(
    (state: {
      canGoBack: boolean;
      canGoForward: boolean;
      loading: boolean;
      title?: string;
      url: string;
    }) => {
      setCanGoBack(state.canGoBack);
      setCanGoForward(state.canGoForward);

      const nextLabel =
        state.title?.trim() ||
        (() => {
          try {
            return new URL(state.url).hostname.replace(/^www\./, '');
          } catch {
            return 'Pinterest';
          }
        })();

      setPageLabel(nextLabel);
      const pinDetail = state.url.includes('/pin/');
      setIsPinDetail(pinDetail);
      onPinDetailChange?.(pinDetail);
    },
    [],
  );

  const handleApplyQuery = useCallback((nextQuery: string) => {
    const normalized = nextQuery.trim() || DEFAULT_QUERY;
    impactLight();
    setSearchQuery(normalized);
    setWebUrl(buildPinterestSearchUrl(normalized));
    setShowTooltip(false);
  }, []);

  const handleShouldStartLoad = useCallback((request: { url: string }) => {
    const url = request.url ?? '';
    if (!url) {
      return false;
    }

    if (url === 'about:blank' || url.startsWith('about:srcdoc')) {
      return true;
    }

    return /^(https?|about):\/\//.test(url) || url.startsWith('about:');
  }, []);

  const handleLoadEnd = useCallback(() => {
    webviewRef.current?.injectJavaScript(PINTEREST_INJECT_SCRIPT);
  }, []);

  const handleSelectFromDetail = useCallback(() => {
    webviewRef.current?.injectJavaScript(
      'var imgs=document.querySelectorAll("img[src*=\'pinimg.com\']");' +
      'var best=null,bestA=0;' +
      'imgs.forEach(function(i){var r=i.getBoundingClientRect();var a=r.width*r.height;if(a>bestA&&r.width>100){bestA=a;best=i}});' +
      'if(best){var u=best.src.replace(/\\/[0-9]+x[0-9]*\\//, "/originals/").replace(/\\/[0-9]+x\\//, "/originals/");' +
      'window.ReactNativeWebView.postMessage(JSON.stringify({type:"long_press_image",url:u}))}' +
      ';true;'
    );
  }, []);

  useImperativeHandle(ref, () => ({
    selectCurrentPin: handleSelectFromDetail,
  }), [handleSelectFromDetail]);

  return (
    <View className="flex-1">
      <View className="px-5 pt-2 pb-3 border-b border-border bg-bg">
        <View className="flex-row items-center gap-2">
          <Pressable
            className={`px-4 py-2 rounded-pill border ${canGoBack ? 'bg-bg-surface border-border' : 'bg-bg-elevated/50 border-border/50'}`}
            onPress={() => webviewRef.current?.goBack()}
            disabled={!canGoBack}
          >
            <Text className={`text-xs tracking-wide ${canGoBack ? 'text-text-primary' : 'text-text-muted opacity-50'}`}>
              戻る
            </Text>
          </Pressable>
          <Pressable
            className={`px-4 py-2 rounded-pill border ${canGoForward ? 'bg-bg-surface border-border' : 'bg-bg-elevated/50 border-border/50'}`}
            onPress={() => webviewRef.current?.goForward()}
            disabled={!canGoForward}
          >
            <Text className={`text-xs tracking-wide ${canGoForward ? 'text-text-primary' : 'text-text-muted opacity-50'}`}>
              進む
            </Text>
          </Pressable>
          <Pressable
            className="px-4 py-2 rounded-pill border bg-bg-surface border-border"
            onPress={() => webviewRef.current?.reload()}
          >
            <Text className="text-xs tracking-wide text-text-primary">再読込</Text>
          </Pressable>
          <View className="flex-1 items-end">
            <Text className="text-text-muted text-[11px] tracking-wide" numberOfLines={1}>
              {pageLabel}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-5 pt-3 pb-2 bg-bg border-b border-border">
        <View className="flex-row items-center gap-2 bg-bg-surface border border-border rounded-pill px-4 py-2.5">
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleApplyQuery(searchQuery)}
            placeholder="日本人向けヘアスタイルを検索"
            placeholderTextColor="rgba(151, 145, 137, 0.72)"
            className="flex-1 text-text-primary text-sm"
            returnKeyType="search"
          />
          <Pressable className="px-3 py-1.5 rounded-pill bg-accent" onPress={() => handleApplyQuery(searchQuery)}>
            <Text className="text-text-on-accent text-xs tracking-wide font-semibold">検索</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          <View className="flex-row gap-2 pr-5">
            {JAPANESE_PRESETS.map((preset) => (
              <Pressable
                key={preset.label}
                className={`px-4 py-2 rounded-pill border ${searchQuery === preset.query ? 'bg-accent border-accent' : 'bg-bg-surface border-border'}`}
                onPress={() => handleApplyQuery(preset.query)}
              >
                <Text
                  className={`text-xs tracking-wide ${searchQuery === preset.query ? 'text-text-on-accent font-semibold' : 'text-text-secondary'}`}
                >
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <WebView
        ref={webviewRef}
        source={{ uri: webUrl }}
        injectedJavaScriptBeforeContentLoaded={PINTEREST_INJECT_SCRIPT}
        injectedJavaScript={PINTEREST_INJECT_SCRIPT}
        onMessage={handleMessage}
        onNavigationStateChange={handleNavStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onLoadEnd={handleLoadEnd}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowsLinkPreview={false}
        setSupportMultipleWindows={false}
      />

      {showTooltip && (
        <View className="absolute top-44 left-5 right-5 bg-bg-elevated/95 rounded-card px-4 py-3 border border-border">
          <Text className="text-text-secondary text-xs text-center tracking-wide">
            長押しで画像を直接選択できます
          </Text>
        </View>
      )}




    </View>
  );
});
