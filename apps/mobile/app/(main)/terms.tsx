import { useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '../../lib/theme-provider';

const TERMS_TEXT = `REVOL Mirror 利用規約

第1条（サービスの概要）
REVOL Mirror（以下「本サービス」）は、株式会社レボル（以下「当社」）が提供する AI ヘアスタイルシミュレーションサービスです。お客さまの顔写真をもとに、AI がヘアスタイルの合成画像を生成します。

第2条（利用条件）
1. 本サービスは、当社の美容室店舗において、スタッフの補助のもとでご利用いただきます。
2. 本サービスの利用にあたり、顔写真の撮影にご同意いただく必要があります。
3. 18歳未満の方は、保護者の同意のもとでご利用ください。

第3条（写真データの取り扱い）
1. 撮影した顔写真は、ヘアスタイルシミュレーションの目的にのみ使用します。
2. 写真データは暗号化された状態でクラウドサーバーに一時的に保存されます。
3. セッション終了後、写真データは当社のサーバーに一定期間保存された後、自動的に削除されます。
4. お客さまの写真データを、お客さまの同意なく第三者に提供・公開することはありません。

第4条（AI 生成画像について）
1. AI が生成する画像は、あくまでシミュレーションであり、実際の施術結果を保証するものではありません。
2. 生成画像の品質は、撮影条件や参照画像の品質により異なる場合があります。
3. 生成画像は、カウンセリングの参考資料としてご活用ください。

第5条（禁止事項）
1. 他人の写真を無断で使用すること
2. 生成画像を商業目的で無断使用すること
3. 本サービスの不正利用

第6条（免責事項）
1. 本サービスの利用により生じた損害について、当社は故意または重大な過失がない限り責任を負いません。
2. システムの不具合やメンテナンスにより、一時的にサービスが利用できない場合があります。

第7条（規約の変更）
当社は、本規約を予告なく変更することがあります。変更後の規約は、本サービス上に掲示した時点で効力を生じるものとします。

第8条（準拠法）
本規約は日本法に準拠し、日本国の裁判所を専属的合意管轄裁判所とします。

株式会社レボル
最終更新日: 2026年3月20日`;

const PRIVACY_TEXT = `プライバシーポリシー

株式会社レボル（以下「当社」）は、REVOL Mirror サービスにおけるお客さまの個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。

1. 収集する情報
本サービスでは、以下の情報を収集します。
・顔写真（ヘアスタイルシミュレーション用）
・参照用ヘアスタイル画像（Pinterest 等から選択した画像）
・スタイリングに関するフリーワード指示
・サービス利用履歴（セッション情報）

2. 利用目的
収集した情報は、以下の目的にのみ使用します。
・AI によるヘアスタイルシミュレーション画像の生成
・カウンセリングにおけるスタイル提案の補助
・サービスの品質改善および統計分析（個人を特定しない形で）

3. 第三者提供
お客さまの個人情報を、以下の場合を除き第三者に提供することはありません。
・お客さまの同意がある場合
・法令に基づく場合
・人の生命、身体または財産の保護のために必要な場合

4. AI 処理について
・顔写真は Google Gemini API に送信され、AI によるヘアスタイル合成に使用されます。
・送信されたデータは、AI 処理完了後に Google のサーバーから削除されます。
・Google の AI サービスのプライバシーポリシーも適用されます。

5. データの保管
・写真および生成画像は、Supabase（クラウドサービス）上に暗号化された状態で保管されます。
・データの保管場所は日本国内のサーバーを優先しますが、サービスの特性上、海外のサーバーに保管される場合があります。
・セッションデータは一定期間経過後に自動削除されます。

6. データの削除
お客さまは、スタッフにお申し出いただくことで、ご自身のセッションデータの削除を請求することができます。

7. セキュリティ
・通信は TLS（SSL）により暗号化されています。
・データへのアクセスは認証済みスタッフに限定されています。
・定期的なセキュリティ監査を実施しています。

8. お問い合わせ
個人情報の取り扱いに関するお問い合わせは、ご利用の店舗スタッフまたは以下までご連絡ください。

株式会社レボル
お問い合わせ: info@revol.co.jp

最終更新日: 2026年3月20日`;

export default function TermsScreen() {
  const theme = useAppTheme();
  const { height } = useWindowDimensions();
  const [agreed, setAgreed] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 50) {
      setScrolledToEnd(true);
    }
  };

  const handleNext = () => {
    if (!agreed) return;
    router.push('/(main)/photo-prep');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 12 }}>
        <Text style={{ color: theme.colors.primary, fontSize: 20, fontWeight: '600' }}>
          利用規約・プライバシーポリシー
        </Text>
        <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 4 }}>
          内容をご確認のうえ、同意をお願いいたします
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, marginHorizontal: 24 }}
        contentContainerStyle={{
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          padding: 20,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        <Text style={{ color: theme.colors.primary, fontSize: 15, fontWeight: '600', marginBottom: 12 }}>
          利用規約
        </Text>
        <Text style={{ color: theme.colors.secondary, fontSize: 12, lineHeight: 20 }}>
          {TERMS_TEXT}
        </Text>

        <View style={{ height: 32 }} />

        <Text style={{ color: theme.colors.primary, fontSize: 15, fontWeight: '600', marginBottom: 12 }}>
          プライバシーポリシー
        </Text>
        <Text style={{ color: theme.colors.secondary, fontSize: 12, lineHeight: 20 }}>
          {PRIVACY_TEXT}
        </Text>
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, borderTopWidth: 0.5, borderTopColor: theme.colors.border }}>
        <Pressable
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
          onPress={() => scrolledToEnd && setAgreed(!agreed)}
          disabled={!scrolledToEnd}
        >
          <View style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            borderWidth: 1.5,
            borderColor: agreed ? theme.colors.accent : theme.colors.border,
            backgroundColor: agreed ? theme.colors.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            opacity: scrolledToEnd ? 1 : 0.4,
          }}>
            {agreed && <Text style={{ color: theme.colors.onAccent, fontSize: 14, fontWeight: '700' }}>v</Text>}
          </View>
          <Text style={{ color: scrolledToEnd ? theme.colors.primary : theme.colors.muted, fontSize: 14, flex: 1 }}>
            利用規約およびプライバシーポリシーに同意します
          </Text>
        </Pressable>

        {!scrolledToEnd && (
          <Text style={{ color: theme.colors.muted, fontSize: 11, marginBottom: 12, textAlign: 'center' }}>
            最後までスクロールしてご確認ください
          </Text>
        )}

        <Pressable
          style={{
            paddingVertical: 14,
            borderRadius: 999,
            alignItems: 'center',
            backgroundColor: agreed ? theme.colors.accent : 'rgba(151,145,137,0.15)',
          }}
          onPress={handleNext}
          disabled={!agreed}
        >
          <Text style={{
            color: agreed ? theme.colors.onAccent : theme.colors.muted,
            fontSize: 15,
            fontWeight: '600',
          }}>
            次へ
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
