import { Pressable, Text, View, Image as RNImage, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBrowserHistoryLength } from '../../lib/browser';
import { HapticButton } from '../../components/common/HapticButton';
import { useAppTheme } from '../../lib/theme-provider';

const prepGuideImage = require('../../assets/photo-prep-guide.png');

const PREP_POINTS = [
  {
    title: '正面から 1 名で撮影',
    description: '顔全体と髪の輪郭が分かるように、まっすぐ正面から撮影してください。',
  },
  {
    title: '影や逆光を避ける',
    description: '暗い影や強い逆光があると、スタイル提案の精度が下がることがあります。',
  },
  {
    title: '整った状態で確認',
    description: '帽子や大きな髪留めを外し、髪の状態が見えるようにしてください。',
  },
];

export default function PhotoPrepScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const imgWidth = width - 48;
  const imgHeight = imgWidth * 0.56;

  const handleBack = () => {
    const historyLength = getBrowserHistoryLength();
    if (historyLength !== null && historyLength <= 1) {
      router.replace('/(main)');
      return;
    }
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 24, paddingTop: insets.top + 12, paddingBottom: 40 }}>
      <Pressable onPress={handleBack} style={{ paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 24 }}>
        <Text style={{ color: theme.colors.muted, fontSize: 14 }}>戻る</Text>
      </Pressable>

      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: theme.colors.muted, fontSize: 11, letterSpacing: 3, marginBottom: 12 }}>PHOTO PREP</Text>
          <Text style={{ color: theme.colors.primary, fontSize: 28, fontWeight: '600', lineHeight: 36, marginBottom: 16 }}>
            写真の準備
          </Text>

          <RNImage
            source={prepGuideImage}
            style={{ width: imgWidth, height: imgHeight, borderRadius: 12, marginBottom: 20 }}
            resizeMode="cover"
          />

          <Text style={{ color: theme.colors.secondary, fontSize: 14, lineHeight: 22, marginBottom: 24 }}>
            このあとカメラが起動します。撮影前に、顔写真の条件を軽く確認してください。
          </Text>

          <View style={{
            backgroundColor: 'rgba(151,145,137,0.06)',
            borderRadius: 12,
            borderWidth: 0.5,
            borderColor: 'rgba(151,145,137,0.12)',
            padding: 20,
            gap: 18,
          }}>
            {PREP_POINTS.map((point) => (
              <View key={point.title}>
                <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: '500', marginBottom: 4 }}>
                  {point.title}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 18 }}>
                  {point.description}
                </Text>
              </View>
            ))}
          </View>

          <Text style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 16 }}>
            ライブラリの写真を使う場合は、次の画面下部にある「ライブラリ」から選択できます。
          </Text>
        </View>

        <View style={{ gap: 10, marginTop: 24 }}>
          <HapticButton title="カメラを開く" size="lg" onPress={() => router.push('/(main)/camera')} />
          <HapticButton title="ホームへ戻る" variant="secondary" size="md" onPress={() => router.replace('/(main)')} />
        </View>
      </View>
    </View>
  );
}
