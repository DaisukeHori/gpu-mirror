import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import type { SelectedStyle } from '../../lib/types';
import { HapticButton } from '../common/HapticButton';
import { useAppTheme } from '../../lib/theme-provider';
import { StyleThumbnail } from './StyleThumbnail';

interface StyleTrayProps {
  styles: SelectedStyle[];
  onRemove: (id: string) => void;
  onConfirm: () => void;
  isPinDetail?: boolean;
  onAddCurrentPin?: () => void;
  addingPin?: boolean;
}

export function StyleTray({
  styles,
  onRemove,
  onConfirm,
  isPinDetail,
  onAddCurrentPin,
  addingPin,
}: StyleTrayProps) {
  const theme = useAppTheme();
  const hasStyles = styles.length > 0;

  if (!hasStyles && !isPinDetail) return null;

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(151,145,137,0.12)',
        paddingTop: 12,
        paddingBottom: 32,
        paddingHorizontal: 20,
      }}
    >
      {hasStyles && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: isPinDetail ? 10 : 0 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: 14, paddingRight: 16, paddingTop: 12, paddingLeft: 10 }}
          >
            {styles.map((style) => (
              <View key={style.id} style={{ overflow: 'visible' }}>
                {style.referenceType === 'color_only' ? (
                  <View
                    style={{
                      width: 200,
                      height: 200,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(151,145,137,0.08)',
                      borderWidth: 0.5,
                      borderColor: 'rgba(151,145,137,0.12)',
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: style.colorHex ?? theme.colors.muted,
                      }}
                    />
                  </View>
                ) : (
                  <StyleThumbnail
                    localThumbnailUri={style.localThumbnailUri}
                    thumbnailUrl={style.thumbnailUrl}
                    sourceUrl={style.sourceUrl}
                    label={style.label}
                    size={200}
                  />
                )}
                <Pressable
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#fff',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.18,
                    shadowRadius: 3,
                    elevation: 3,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => onRemove(style.id)}
                >
                  <Text style={{ color: '#333', fontSize: 16, fontWeight: '700', marginTop: -1 }}>
                    x
                  </Text>
                </Pressable>
              </View>
            ))}
            {addingPin && (
              <View
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: 8,
                  backgroundColor: 'rgba(30,28,26,0.95)',
                  borderWidth: 0.5,
                  borderColor: 'rgba(151,145,137,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ActivityIndicator size="large" color={theme.colors.accent} />
                <Text style={{ color: theme.colors.muted, fontSize: 17, marginTop: 10 }}>
                  取り込み中...
                </Text>
              </View>
            )}
          </ScrollView>

          <Pressable
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: theme.colors.accent,
              marginLeft: 8,
            }}
            onPress={onConfirm}
          >
            <Text
              style={{ color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 }}
              numberOfLines={1}
            >
              {styles.length}つで生成
            </Text>
          </Pressable>
        </View>
      )}

      {isPinDetail && (
        <Pressable
          style={{
            paddingVertical: 13,
            borderRadius: 999,
            alignItems: 'center',
            backgroundColor: theme.colors.accent,
            opacity: addingPin ? 0.6 : 1,
          }}
          onPress={onAddCurrentPin}
          disabled={addingPin}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 17,
              fontWeight: '600',
              letterSpacing: 0.3,
            }}
          >
            {addingPin ? '取り込み中...' : 'この画像を追加'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
