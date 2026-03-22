import { useEffect, useMemo, useState } from 'react';
import { View, Text, Image as RNImage, type ImageStyle, type ViewStyle } from 'react-native';

interface StyleThumbnailProps {
  localThumbnailUri?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  label: string;
  size: number;
  style?: ViewStyle;
}

function getInitialUri(
  localThumbnailUri?: string,
  thumbnailUrl?: string,
  sourceUrl?: string,
) {
  return thumbnailUrl || localThumbnailUri || sourceUrl || '';
}

export function StyleThumbnail({
  localThumbnailUri,
  thumbnailUrl,
  sourceUrl,
  label,
  size,
  style,
}: StyleThumbnailProps) {
  const initialUri = getInitialUri(localThumbnailUri, thumbnailUrl, sourceUrl);
  const [uri, setUri] = useState(initialUri);
  const fallbackUri = useMemo(() => sourceUrl || '', [sourceUrl]);

  useEffect(() => {
    const next = getInitialUri(localThumbnailUri, thumbnailUrl, sourceUrl);
    setUri(next);
  }, [localThumbnailUri, thumbnailUrl, sourceUrl]);

  const handleError = () => {
    console.warn('[StyleThumbnail] Image load error', { uri: uri?.slice(0, 60), label });
    if (uri && fallbackUri && uri !== fallbackUri) {
      setUri(fallbackUri);
      return;
    }
    setUri('');
  };

  const imageStyle: ImageStyle = {
    width: size,
    height: size,
    borderRadius: 8,
    ...(style as ImageStyle),
  };

  if (!uri) {
    return (
      <View
        style={[
          imageStyle,
          {
            backgroundColor: 'rgba(151,145,137,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 0.5,
            borderColor: 'rgba(151,145,137,0.12)',
          },
        ]}
      >
        <Text style={{ color: 'rgba(151,145,137,0.48)', fontSize: 11, fontWeight: '500' }}>
          {label.slice(0, 1).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <RNImage
      source={{ uri }}
      style={imageStyle}
      resizeMode="cover"
      onError={handleError}
    />
  );
}
