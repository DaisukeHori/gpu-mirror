import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGet } from '../../../lib/api';
import { useAppTheme } from '../../../lib/theme-provider';
import { getBrowserHistoryLength } from '../../../lib/browser';
import { HapticButton } from '../../../components/common/HapticButton';

interface StaffUsage {
  staff_id: string;
  display_name: string;
  email: string;
  store_code: string | null;
  role: string;
  total_generations: number;
  completed_generations: number;
  failed_generations: number;
  total_cost_usd: number;
  avg_latency_ms: number;
}

interface StoreUsage {
  store_code: string;
  total_generations: number;
  total_cost_usd: number;
  staff_count: number;
}

interface UsageResponse {
  period: { from: string; to: string };
  summary: {
    total_cost_usd: number;
    total_generations: number;
    staff_count: number;
  };
  by_staff: StaffUsage[];
  by_store: StoreUsage[];
}

type PeriodKey = '7d' | '30d' | '90d';

const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: '7d', label: '7日間', days: 7 },
  { key: '30d', label: '30日間', days: 30 },
  { key: '90d', label: '90日間', days: 90 },
];

function formatCurrency(usd: number) {
  return `$${usd.toFixed(4)}`;
}

function formatCurrencyShort(usd: number) {
  return `$${usd.toFixed(2)}`;
}

export default function AdminUsageScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 1180;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UsageResponse | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const fetchUsage = useCallback(async (periodKey: PeriodKey) => {
    setLoading(true);
    try {
      const days = PERIODS.find((p) => p.key === periodKey)?.days ?? 30;
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date().toISOString();
      const res = await apiGet<UsageResponse>(`/api/admin/usage?from=${from}&to=${to}`);
      setData(res);
    } catch {
      Alert.alert('取得に失敗しました', '使用量データを読み込めませんでした。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage(period);
  }, [fetchUsage, period]);

  const selectedStaff = useMemo(
    () => data?.by_staff.find((s) => s.staff_id === selectedStaffId) ?? null,
    [data, selectedStaffId],
  );

  useEffect(() => {
    if (data?.by_staff.length && !selectedStaffId) {
      setSelectedStaffId(data.by_staff[0].staff_id);
    }
  }, [data, selectedStaffId]);

  const handleBack = useCallback(() => {
    const historyLength = getBrowserHistoryLength();
    if (historyLength !== null && historyLength <= 1) {
      router.replace('/settings');
      return;
    }
    router.back();
  }, []);

  return (
    <View className="flex-1 bg-bg">
      {/* Header */}
      <View className="px-6 pb-5 border-b border-border bg-bg" style={{ paddingTop: insets.top + 12 }}>
        <Pressable onPress={handleBack} className="py-2 mb-4 self-start">
          <Text className="text-text-muted text-sm tracking-wide">戻る</Text>
        </Pressable>
        <Text className="text-text-primary text-2xl font-semibold">AI 使用量</Text>
        <Text className="text-text-muted text-xs mt-2 tracking-wide">
          アカウント別・店舗別のトークン使用状況
        </Text>

        {/* Period selector */}
        <View className="flex-row bg-bg-surface border border-border rounded-pill p-1 mt-4 self-start">
          {PERIODS.map((p) => (
            <Pressable
              key={p.key}
              className={`px-4 py-2 rounded-pill ${period === p.key ? 'bg-accent' : ''}`}
              onPress={() => setPeriod(p.key)}
            >
              <Text
                className={`text-xs tracking-wide ${period === p.key ? 'text-text-on-accent font-semibold' : 'text-text-muted'}`}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Summary cards */}
        {data && (
          <View className="flex-row gap-3 mt-5">
            <View className="flex-1 bg-bg-surface rounded-card border border-border px-4 py-4">
              <Text className="text-text-muted text-[11px] tracking-wide mb-2">総コスト</Text>
              <Text className="text-text-primary text-lg font-semibold">
                {formatCurrencyShort(data.summary.total_cost_usd)}
              </Text>
            </View>
            <View className="flex-1 bg-bg-surface rounded-card border border-border px-4 py-4">
              <Text className="text-text-muted text-[11px] tracking-wide mb-2">総生成数</Text>
              <Text className="text-text-primary text-lg font-semibold">
                {data.summary.total_generations}
              </Text>
            </View>
            <View className="flex-1 bg-bg-surface rounded-card border border-border px-4 py-4">
              <Text className="text-text-muted text-[11px] tracking-wide mb-2">アクティブユーザー</Text>
              <Text className="text-text-primary text-lg font-semibold">
                {data.summary.staff_count}
              </Text>
            </View>
          </View>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text className="text-text-muted text-sm mt-4 tracking-wide">読み込み中...</Text>
        </View>
      ) : !data ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-muted text-sm tracking-wide">データがありません</Text>
        </View>
      ) : (
        <View
          className="flex-1"
          style={{ flexDirection: isWide ? 'row' : 'column' }}
        >
          {/* Staff list */}
          <View
            className="bg-bg"
            style={{
              width: isWide ? 420 : '100%',
              borderRightWidth: isWide ? 0.5 : 0,
              borderBottomWidth: isWide ? 0 : 0.5,
              borderColor: theme.colors.border,
              maxHeight: isWide ? undefined : 360,
            }}
          >
            <ScrollView className="flex-1 px-6 py-5" showsVerticalScrollIndicator={false}>
              <Text className="text-text-primary text-base font-medium mb-4">スタッフ別</Text>
              {data.by_staff.map((staff) => (
                <Pressable
                  key={staff.staff_id}
                  className={`bg-bg-surface rounded-card border p-4 mb-3 ${selectedStaffId === staff.staff_id ? 'border-accent' : 'border-border'}`}
                  onPress={() => setSelectedStaffId(staff.staff_id)}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-text-primary text-sm font-medium" numberOfLines={1}>
                      {staff.display_name}
                    </Text>
                    <View className={`px-2.5 py-1 rounded-pill ${staff.role === 'admin' ? 'bg-accent/15' : 'bg-bg-elevated'}`}>
                      <Text className={`text-[10px] tracking-wide ${staff.role === 'admin' ? 'text-accent' : 'text-text-muted'}`}>
                        {staff.role}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-text-muted text-xs mb-1">
                    {staff.store_code ?? '店舗未設定'}
                  </Text>
                  <View className="flex-row items-center gap-4 mt-2">
                    <Text className="text-text-secondary text-xs">
                      {staff.total_generations}回生成
                    </Text>
                    <Text className="text-text-primary text-xs font-semibold">
                      {formatCurrency(staff.total_cost_usd)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Detail panel */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
            showsVerticalScrollIndicator={false}
          >
            {selectedStaff ? (
              <>
                {/* Staff detail card */}
                <View className="bg-bg-surface rounded-card border border-border p-5 mb-5">
                  <Text className="text-text-primary text-xl font-semibold mb-1">
                    {selectedStaff.display_name}
                  </Text>
                  <Text className="text-text-muted text-xs mb-1">{selectedStaff.email}</Text>
                  <Text className="text-text-muted text-xs">
                    {selectedStaff.store_code ?? '店舗未設定'}  ·  {selectedStaff.role}
                  </Text>

                  <View className="flex-row gap-3 mt-5">
                    <View className="flex-1 bg-bg-elevated rounded-card border border-border px-4 py-4">
                      <Text className="text-text-muted text-[11px] tracking-wide mb-2">総生成数</Text>
                      <Text className="text-text-primary text-lg font-semibold">
                        {selectedStaff.total_generations}
                      </Text>
                    </View>
                    <View className="flex-1 bg-bg-elevated rounded-card border border-border px-4 py-4">
                      <Text className="text-text-muted text-[11px] tracking-wide mb-2">完了</Text>
                      <Text className="text-text-primary text-lg font-semibold">
                        {selectedStaff.completed_generations}
                      </Text>
                    </View>
                    <View className="flex-1 bg-bg-elevated rounded-card border border-border px-4 py-4">
                      <Text className="text-text-muted text-[11px] tracking-wide mb-2">失敗</Text>
                      <Text className="text-text-primary text-lg font-semibold">
                        {selectedStaff.failed_generations}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row gap-3 mt-3">
                    <View className="flex-1 bg-bg-elevated rounded-card border border-border px-4 py-4">
                      <Text className="text-text-muted text-[11px] tracking-wide mb-2">推定コスト</Text>
                      <Text className="text-text-primary text-lg font-semibold">
                        {formatCurrency(selectedStaff.total_cost_usd)}
                      </Text>
                    </View>
                    <View className="flex-1 bg-bg-elevated rounded-card border border-border px-4 py-4">
                      <Text className="text-text-muted text-[11px] tracking-wide mb-2">平均レイテンシ</Text>
                      <Text className="text-text-primary text-lg font-semibold">
                        {selectedStaff.avg_latency_ms}ms
                      </Text>
                    </View>
                    <View className="flex-1 bg-bg-elevated rounded-card border border-border px-4 py-4">
                      <Text className="text-text-muted text-[11px] tracking-wide mb-2">単価平均</Text>
                      <Text className="text-text-primary text-lg font-semibold">
                        {selectedStaff.total_generations > 0
                          ? formatCurrency(selectedStaff.total_cost_usd / selectedStaff.total_generations)
                          : '$0'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Store summary */}
                <View className="bg-bg-surface rounded-card border border-border p-5">
                  <Text className="text-text-primary text-base font-medium mb-4">店舗別サマリー</Text>
                  {data.by_store.map((store) => (
                    <View
                      key={store.store_code}
                      className="flex-row items-center justify-between py-3 border-b border-border last:border-b-0"
                    >
                      <View className="flex-1">
                        <Text className="text-text-primary text-sm font-medium">
                          {store.store_code}
                        </Text>
                        <Text className="text-text-muted text-xs mt-1">
                          {store.staff_count}名のスタッフ
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-text-primary text-sm font-semibold">
                          {formatCurrencyShort(store.total_cost_usd)}
                        </Text>
                        <Text className="text-text-muted text-xs mt-1">
                          {store.total_generations}回生成
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View className="items-center justify-center py-24">
                <Text className="text-text-muted text-sm tracking-wide">
                  スタッフを選択すると詳細が表示されます
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
