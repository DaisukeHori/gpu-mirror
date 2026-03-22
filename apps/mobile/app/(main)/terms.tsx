import { useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../lib/theme-provider';

const TERMS_TEXT = `REVOL Mirror 利用規約

第1条（サービスの概要）
REVOL Mirror（以下「本サービス」）は、株式会社レボル（以下「当社」）が提供する AI ヘアスタイルシミュレーションサービスです。お客さまの顔写真をもとに、人工知能（AI）技術を用いてヘアスタイルの合成画像を生成し、美容室でのカウンセリングを支援するサービスです。本サービスは、当社が運営する美容室店舗内において、スタッフの補助のもとで提供されます。

第2条（利用条件）
1. 本サービスは、当社の美容室店舗において、当社スタッフの案内・補助のもとでご利用いただけます。
2. 本サービスの利用にあたり、お客さまの顔写真の撮影および AI による画像処理にご同意いただく必要があります。
3. 18歳未満の方が本サービスをご利用になる場合は、保護者の方の同意が必要です。
4. 本サービスは日本国内の店舗でのみ提供され、日本語でのサービス提供となります。
5. 本サービスの利用は無料ですが、美容室での施術費用は別途発生します。

第3条（写真データの取り扱い）
1. 撮影した顔写真は、ヘアスタイルシミュレーションの目的にのみ使用します。撮影はスタッフが行うか、お客さまご自身で行っていただきます。
2. 写真データは暗号化された通信（TLS/SSL）を通じてクラウドサーバーに送信され、暗号化された状態で一時的に保存されます。
3. 写真データの保存期間は、セッション終了後最大90日間とし、期間経過後に自動的に削除されます。
4. お客さまの写真データを、お客さまの同意なく第三者に提供・公開・販売することは一切ありません。
5. 写真データへのアクセスは、当該セッションを担当したスタッフおよび管理者に限定されます。
6. お客さまは、いつでもスタッフにお申し出いただくことで、ご自身の写真データの即時削除を請求することができます。

第4条（AI 画像生成について）
1. 本サービスでは、Google LLC が提供する Gemini AI（以下「AI エンジン」）を使用してヘアスタイルの合成画像を生成します。
2. AI が生成する画像は、あくまでシミュレーション（仮想的な合成画像）であり、実際の施術結果を保証するものではありません。
3. 生成画像と実際の施術結果との間には、髪質・髪色・顔の形状・照明条件等の要因により差異が生じる場合があります。
4. 生成画像の品質は、撮影条件（照明、角度、背景等）や参照画像の品質により異なる場合があります。
5. AI エンジンの仕様変更により、生成画像の品質やスタイルが変更される場合があります。
6. 生成画像は、美容室でのカウンセリングにおける参考資料としてのみご活用ください。

第5条（参照画像について）
1. 本サービスでは、ヘアスタイルの参照画像として Pinterest 等の外部サービスの画像を使用する場合があります。
2. 参照画像の著作権は各権利者に帰属します。参照画像は本サービス内でのシミュレーション目的にのみ使用し、外部への再配布は行いません。
3. お客さまが持ち込んだ参照画像についても、同様にシミュレーション目的にのみ使用します。

第6条（フリーワード再生成機能について）
1. 本サービスでは、生成画像に対してフリーワード（自由入力テキスト）で指示を与え、スタイルを調整する機能を提供します。
2. フリーワードの内容は AI エンジンに送信されますが、当社がフリーワードの内容を閲覧・分析することはありません。
3. 不適切な内容のフリーワードを入力した場合、AI エンジンが画像生成を拒否する場合があります。

第7条（知的財産権）
1. 本サービスのアプリケーション、デザイン、ロゴ等に関する知的財産権は当社に帰属します。
2. AI が生成した画像の著作権の帰属については、現行法令の解釈に従います。
3. お客さまは、生成画像を個人的な参考資料として使用する権利を有します。
4. 生成画像の商業的利用（広告、SNS での商用投稿等）については、事前に当社の許諾を得てください。

第8条（禁止事項）
お客さまは、本サービスの利用にあたり、以下の行為を行ってはなりません。
1. 他人の写真を本人の同意なく使用すること
2. 生成画像を不正な目的（詐欺、なりすまし等）に使用すること
3. 生成画像を当社の許諾なく商業的に使用すること
4. 本サービスのシステムに対する不正アクセスや改ざん
5. 本サービスを利用して法令に違反する行為を行うこと
6. その他、当社が不適切と判断する行為

第9条（サービスの中断・終了）
1. 当社は、システムのメンテナンス、障害対応、その他やむを得ない事由により、事前通知なく本サービスを一時的に中断する場合があります。
2. 当社は、経営判断により本サービスを終了する場合があります。その際は、合理的な期間をもって事前に通知するよう努めます。
3. サービス終了時には、保存されているお客さまのデータはすべて削除されます。

第10条（免責事項）
1. 本サービスの利用により生じた損害について、当社は故意または重大な過失がない限り責任を負いません。
2. AI が生成した画像に基づいて行われた施術の結果について、当社は責任を負いません。施術の判断はお客さまとスタッフの間で行ってください。
3. システムの不具合、通信障害、サーバー障害等により本サービスが利用できない場合について、当社は責任を負いません。
4. 第三者サービス（Google Gemini、Supabase、Pinterest 等）の障害や仕様変更により本サービスの機能が制限される場合について、当社は責任を負いません。

第11条（損害賠償）
当社の責めに帰すべき事由により、お客さまに損害が生じた場合の賠償額は、当該サービスの利用料金を上限とします。本サービスが無料で提供されている場合、損害賠償の責任は負いません。

第12条（規約の変更）
1. 当社は、法令の改正、社会情勢の変化、サービス内容の変更等に応じて、本規約を変更することがあります。
2. 変更後の規約は、本サービス上に掲示した時点で効力を生じるものとします。
3. 重要な変更がある場合は、店舗内掲示またはスタッフからの告知により、お客さまにお知らせするよう努めます。

第13条（準拠法および管轄裁判所）
1. 本規約は日本法に準拠し、日本法に従って解釈されるものとします。
2. 本規約に関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。

株式会社レボル
所在地: 埼玉県越谷市南越谷4-9-6 新越谷プラザビル2F
最終更新日: 2026年3月20日`;

const PRIVACY_TEXT = `プライバシーポリシー

株式会社レボル（以下「当社」）は、REVOL Mirror サービス（以下「本サービス」）におけるお客さまの個人情報の取り扱いについて、個人情報の保護に関する法律（個人情報保護法）およびその他関連法令を遵守し、以下のとおりプライバシーポリシーを定めます。

1. 個人情報保護方針
当社は、お客さまの個人情報の保護を重要な経営課題と位置づけ、個人情報の適切な収集、利用、管理に努めます。全従業員に対して個人情報保護に関する教育を実施し、継続的な改善を行います。

2. 収集する情報
本サービスでは、以下の情報を収集します。

（1）お客さまから直接収集する情報
・顔写真（ヘアスタイルシミュレーション用に撮影する写真）
・参照用ヘアスタイル画像（Pinterest 等から選択、またはお持ち込みの画像）
・スタイリングに関するフリーワード指示（テキスト入力による指示内容）

（2）サービス利用に伴い自動的に収集する情報
・セッション情報（利用日時、担当スタッフ、使用した機能）
・生成画像データ（AI が生成したシミュレーション画像）
・端末情報（デバイスの種類、OS バージョン ※匿名化された形式）

（3）収集しない情報
本サービスでは、以下の情報は一切収集しません。
・お客さまの氏名、住所、電話番号、メールアドレス
・決済情報（クレジットカード番号等）
・位置情報
・SNS アカウント情報

3. 利用目的
収集した情報は、以下の目的にのみ使用し、目的外の利用は行いません。
（1）AI によるヘアスタイルシミュレーション画像の生成
（2）カウンセリングにおけるスタイル提案の補助
（3）お客さまへの生成画像の表示および共有
（4）サービスの品質改善および統計分析（個人を特定しない匿名化されたデータの形で）
（5）システムの障害対応および不正利用の防止

4. 第三者提供
お客さまの個人情報を、以下の場合を除き第三者に提供することはありません。
（1）お客さまの事前の同意がある場合
（2）法令に基づく開示請求があった場合（裁判所の令状、捜査機関からの照会等）
（3）人の生命、身体または財産の保護のために緊急に必要がある場合
（4）公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合

5. AI 処理に関する説明
（1）本サービスでは、Google LLC が提供する Gemini AI を使用してヘアスタイルの合成画像を生成します。
（2）顔写真は、画像生成のために Google のサーバーに暗号化された通信を通じて送信されます。
（3）Google は、送信されたデータを AI モデルのトレーニングに使用しない設定（API 利用）で提供しています。
（4）送信されたデータは、AI 処理完了後に Google のサーバーから自動的に削除されます。
（5）Google のプライバシーポリシー（https://policies.google.com/privacy）も併せてご確認ください。

6. データの保管
（1）写真および生成画像は、Supabase 社が提供するクラウドストレージサービス上に保管されます。
（2）すべてのデータは暗号化された状態で保管されます（AES-256）。
（3）データの保管場所は、AWS のアジア太平洋リージョン（東京または大阪）を優先しますが、サービスの可用性確保のために、他のリージョンにバックアップが保管される場合があります。
（4）セッションデータは、最終利用日から90日経過後に自動削除されます。
（5）自動削除前であっても、お客さまの申し出により即時削除が可能です。

7. データの削除・開示請求
（1）お客さまは、スタッフにお申し出いただくことで、ご自身のセッションデータ（顔写真、生成画像を含む）の即時削除を請求することができます。
（2）削除請求を受けた場合、当社は遅滞なく（原則として7営業日以内に）対象データを完全に削除します。
（3）お客さまは、当社が保有するご自身の個人情報の開示を請求することができます。開示請求は店舗スタッフまたは下記問い合わせ先にて承ります。
（4）開示請求に対しては、本人確認のうえ、原則として14営業日以内に回答いたします。

8. セキュリティ対策
当社は、お客さまの個人情報を適切に保護するため、以下のセキュリティ対策を実施しています。
（1）通信の暗号化: すべての通信は TLS 1.3 により暗号化されています。
（2）アクセス制御: データへのアクセスは、Azure Active Directory による SAML 認証を経た認証済みスタッフに限定されています。
（3）データの暗号化: 保存データは AES-256 で暗号化されています。
（4）アクセスログ: データへのアクセスはログとして記録され、不正アクセスの検知に使用されます。
（5）定期的な監査: セキュリティ対策の有効性を定期的に確認し、必要に応じて改善します。
（6）従業員教育: 個人情報を取り扱う従業員に対し、定期的にセキュリティ教育を実施します。

9. Cookie および類似技術
本サービス（モバイルアプリ）では、Cookie は使用しません。認証情報はセキュアストレージに暗号化された状態で保存されます。

10. 未成年者の個人情報
18歳未満のお客さまの個人情報については、保護者の同意を得たうえで取り扱います。保護者の方から削除請求があった場合は、速やかに対応いたします。

11. プライバシーポリシーの変更
（1）当社は、法令の改正、サービス内容の変更等に応じて、本プライバシーポリシーを変更することがあります。
（2）重要な変更がある場合は、店舗内掲示またはアプリ内通知によりお知らせいたします。
（3）変更後のプライバシーポリシーは、本サービス上に掲示した時点で効力を生じるものとします。

12. お問い合わせ
個人情報の取り扱いに関するお問い合わせ、開示・削除請求は、以下までご連絡ください。

株式会社レボル 個人情報保護担当
所在地: 埼玉県越谷市南越谷4-9-6 新越谷プラザビル2F
メール: info@revol.co.jp
受付時間: 平日 10:00〜18:00

最終更新日: 2026年3月20日`;

export default function TermsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [agreed, setAgreed] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const layoutRef = useRef<{ height: number }>(null);

  const handleScroll = (e: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    layoutRef.current = { height: layoutMeasurement.height };
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 50) {
      setScrolledToEnd(true);
    }
  };

  const handleContentSizeChange = (_w: number, contentHeight: number) => {
    const layoutHeight = layoutRef.current?.height ?? height * 0.6;
    if (contentHeight > 0 && contentHeight <= layoutHeight + 50) {
      setScrolledToEnd(true);
    }
  };

  const handleNext = () => {
    if (!agreed) return;
    router.push('/(main)/photo-prep');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: 24, paddingTop: insets.top + 12, paddingBottom: 12 }}>
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
        onContentSizeChange={handleContentSizeChange}
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
