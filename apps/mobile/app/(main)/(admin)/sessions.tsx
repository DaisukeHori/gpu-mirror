import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Share,
  Platform,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { GetSessionResponse, ListSessionsResponse } from '@revol-mirror/shared';
import { apiGet } from '../../../lib/api';
import { getBrowserHistoryLength } from '../../../lib/browser';
import { useAppTheme } from '../../../lib/theme-provider';
import { useCurrentStaff } from '../../../hooks/useCurrentStaff';
import { HapticButton } from '../../../components/common/HapticButton';

type SessionListItem = ListSessionsResponse['sessions'][number];
type SessionDetail = GetSessionResponse['session'];
type SessionGeneration = SessionDetail['session_generations'][number];
type StatusFilter = 'all' | 'open' | 'closed';

const PAGE_LIMIT = 20;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(total: number) {
  return `$${total.toFixed(2)}`;
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

async function downloadCsv(filename: string, csv: string) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
    return;
  }

  await Share.share({
    title: filename,
    message: csv,
  });
}

function buildCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(',')),
  ];

  return lines.join('\n');
}

export default function AdminSessionsScreen() {
  const theme = useAppTheme();
  const { staff } = useCurrentStaff();
  const { width } = useWindowDimensions();
  const isWide = width >= 1180;

  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchSessions = useCallback(async (pageNum: number, append: boolean) => {
    setLoading(true);
    try {
      const res = await apiGet<ListSessionsResponse>(`/api/sessions?page=${pageNum}&limit=${PAGE_LIMIT}`);
      setSessions((prev) => (append ? [...prev, ...res.sessions] : res.sessions));
      setPage(res.page);
      setTotal(res.total);
    } catch {
      Alert.alert('取得に失敗しました', '施術ログを読み込めませんでした。');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessionDetail = useCallback(async (sessionId: string) => {
    setDetailLoading(true);
    try {
      const res = await apiGet<GetSessionResponse>(`/api/sessions/${sessionId}`);
      setSelectedSession(res.session);
    } catch {
      Alert.alert('取得に失敗しました', 'セッション詳細を読み込めませんでした。');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions(1, false);
  }, [fetchSessions]);

  useEffect(() => {
    if (!selectedSessionId && sessions[0]) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionDetail(selectedSessionId);
    }
  }, [fetchSessionDetail, selectedSessionId]);

  const matchesFilter = useCallback(
    (session: SessionListItem) => {
      const normalized = search.trim().toLowerCase();
      const matchesQuery =
        normalized.length === 0 ||
        session.id.toLowerCase().includes(normalized) ||
        (session.store_code ?? '').toLowerCase().includes(normalized) ||
        session.staff_id.toLowerCase().includes(normalized);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'closed' && session.is_closed) ||
        (statusFilter === 'open' && !session.is_closed);

      return matchesQuery && matchesStatus;
    },
    [search, statusFilter],
  );

  const filteredSessions = useMemo(
    () => sessions.filter(matchesFilter),
    [matchesFilter, sessions],
  );

  const sessionSummary = useMemo(() => {
    const completedImages = filteredSessions.reduce((sum, item) => sum + item.generation_count, 0);
    const closedCount = filteredSessions.filter((item) => item.is_closed).length;

    return {
      visible: filteredSessions.length,
      closed: closedCount,
      active: filteredSessions.length - closedCount,
      completedImages,
    };
  }, [filteredSessions]);

  const groupedGenerations = useMemo(() => {
    if (!selectedSession) return [];

    const grouped = new Map<number, SessionGeneration[]>();
    for (const generation of selectedSession.session_generations) {
      const bucket = grouped.get(generation.style_group) ?? [];
      bucket.push(generation);
      grouped.set(generation.style_group, bucket);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a - b)
      .map(([styleGroup, generations]) => ({
        styleGroup,
        generations: generations.sort((a, b) => a.angle.localeCompare(b.angle)),
      }));
  }, [selectedSession]);

  const detailStats = useMemo(() => {
    if (!selectedSession) return null;

    const completed = selectedSession.session_generations.filter((generation) => generation.status === 'completed');
    const failed = selectedSession.session_generations.filter((generation) => generation.status === 'failed');
    const totalCost = completed.reduce((sum, generation) => sum + Number(generation.ai_cost_usd ?? 0), 0);
    const avgLatency =
      completed.length > 0
        ? Math.round(
            completed.reduce((sum, generation) => sum + Number(generation.ai_latency_ms ?? 0), 0) / completed.length,
          )
        : 0;

    return {
      completed: completed.length,
      failed: failed.length,
      totalCost,
      avgLatency,
    };
  }, [selectedSession]);

  const handleExportSessions = useCallback(async () => {
    setExporting(true);
    try {
      const allSessions: SessionListItem[] = [];
      let currentPage = 1;
      let expectedTotal = 0;

      do {
        const response = await apiGet<ListSessionsResponse>(`/api/sessions?page=${currentPage}&limit=100`);
        allSessions.push(...response.sessions);
        expectedTotal = response.total;
        currentPage += 1;
      } while (allSessions.length < expectedTotal);

      const rows = allSessions
        .filter(matchesFilter)
        .map((session) => ({
          session_id: session.id,
          created_at: session.created_at,
          store_code: session.store_code ?? '',
          staff_id: session.staff_id,
          status: session.is_closed ? 'closed' : 'open',
          completed_images: session.generation_count,
          first_front_photo: session.first_front_photo ?? '',
        }));

      const csv = buildCsv(rows);
      await downloadCsv(`revol-sessions-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    } catch {
      Alert.alert('出力に失敗しました', 'CSVの作成中に問題が発生しました。');
    } finally {
      setExporting(false);
    }
  }, [matchesFilter]);

  const handleExportSelectedSession = useCallback(async () => {
    if (!selectedSession) return;

    setExporting(true);
    try {
      const rows = selectedSession.session_generations.map((generation) => ({
        session_id: selectedSession.id,
        session_created_at: selectedSession.created_at,
        style_group: generation.style_group,
        angle: generation.angle,
        style_label: generation.style_label ?? '',
        simulation_mode: generation.simulation_mode,
        reference_type: generation.reference_type,
        status: generation.status,
        is_favorite: generation.is_favorite,
        is_selected: generation.is_selected,
        ai_latency_ms: generation.ai_latency_ms ?? '',
        ai_cost_usd: generation.ai_cost_usd ?? '',
        photo_url: generation.photo_url ?? '',
      }));

      const csv = buildCsv(rows);
      await downloadCsv(`revol-session-${selectedSession.id.slice(0, 8)}.csv`, csv);
    } catch {
      Alert.alert('出力に失敗しました', '詳細CSVを作成できませんでした。');
    } finally {
      setExporting(false);
    }
  }, [selectedSession]);

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
      <View className="px-6 pt-16 pb-5 border-b border-border bg-bg">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Pressable onPress={handleBack} className="py-2 mb-4 self-start">
              <Text className="text-text-muted text-sm tracking-wide">戻る</Text>
            </Pressable>
            <Text className="text-text-primary text-2xl font-semibold">施術ログ</Text>
            <Text className="text-text-muted text-xs mt-2 tracking-wide">
              {staff?.display_name ?? '管理者'}  ·  {total}件のセッション
            </Text>
          </View>
          <View className="flex-row gap-3">
            <HapticButton
              title={exporting ? '出力中...' : '一覧CSV'}
              variant="secondary"
              size="sm"
              onPress={handleExportSessions}
              disabled={exporting}
            />
            <HapticButton
              title="詳細CSV"
              variant="secondary"
              size="sm"
              onPress={handleExportSelectedSession}
              disabled={!selectedSession || exporting}
            />
          </View>
        </View>

        <View className="flex-row gap-3 mt-5">
          <View className="flex-1 bg-bg-surface rounded-card border border-border px-4 py-4">
            <Text className="text-text-muted text-[11px] tracking-wide mb-2">表示中</Text>
            <Text className="text-text-primary text-lg font-semibold">{sessionSummary.visible}</Text>
          </View>
          <View className="flex-1 bg-bg-surface rounded-card border border-border px-4 py-4">
            <Text className="text-text-muted text-[11px] tracking-wide mb-2">進行中</Text>
            <Text className="text-text-primary text-lg font-semibold">{sessionSummary.active}</Text>
          </View>
          <View className="flex-1 bg-bg-surface rounded-card border border-border px-4 py-4">
            <Text className="text-text-muted text-[11px] tracking-wide mb-2">完了画像</Text>
            <Text className="text-text-primary text-lg font-semibold">{sessionSummary.completedImages}</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-3 mt-4">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="session_id / store_code / staff_id"
            placeholderTextColor={theme.colors.muted}
            className="flex-1 bg-bg-surface border border-border rounded-pill px-4 py-3 text-text-primary"
          />
          <View className="flex-row bg-bg-surface border border-border rounded-pill p-1">
            {(['all', 'open', 'closed'] as const).map((filter) => (
              <Pressable
                key={filter}
                className={`px-4 py-2 rounded-pill ${statusFilter === filter ? 'bg-accent' : ''}`}
                onPress={() => setStatusFilter(filter)}
              >
                <Text
                  className={`text-xs tracking-wide ${statusFilter === filter ? 'text-text-on-accent font-semibold' : 'text-text-muted'}`}
                >
                  {filter === 'all' ? '全て' : filter === 'open' ? '進行中' : '終了済み'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View
        className="flex-1"
        style={{ flexDirection: isWide ? 'row' : 'column' }}
      >
        <View
          className="bg-bg"
          style={{
            width: isWide ? 420 : '100%',
            borderRightWidth: isWide ? 0.5 : 0,
            borderBottomWidth: isWide ? 0 : 0.5,
            borderColor: theme.colors.border,
          }}
        >
          <ScrollView className="flex-1 px-6 py-5" showsVerticalScrollIndicator={false}>
            {filteredSessions.map((session) => (
              <Pressable
                key={session.id}
                className={`bg-bg-surface rounded-card border p-4 mb-3 ${selectedSessionId === session.id ? 'border-accent' : 'border-border'}`}
                onPress={() => setSelectedSessionId(session.id)}
              >
                <View className="flex-row gap-4">
                  {session.first_front_photo ? (
                    <Image
                      source={{ uri: session.first_front_photo }}
                      className="w-20 h-24 rounded-img"
                      contentFit="cover"
                    />
                  ) : (
                    <View className="w-20 h-24 rounded-img bg-bg-elevated border border-border items-center justify-center">
                      <Text className="text-text-muted text-[11px] tracking-wide text-center">NO{'\n'}IMAGE</Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-text-primary text-sm font-medium">
                        {session.id.slice(0, 8)}
                      </Text>
                      <View className={`px-2.5 py-1 rounded-pill ${session.is_closed ? 'bg-bg-elevated' : 'bg-accent/15'}`}>
                        <Text className={`text-[10px] tracking-wide ${session.is_closed ? 'text-text-muted' : 'text-accent'}`}>
                          {session.is_closed ? '終了済み' : '進行中'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-text-secondary text-xs mb-1">
                      {formatDateTime(session.created_at)}
                    </Text>
                    <Text className="text-text-muted text-xs">
                      {session.store_code ?? 'store 未設定'}  ·  staff {session.staff_id.slice(0, 8)}
                    </Text>
                    <Text className="text-text-muted text-xs mt-3">
                      完了画像 {session.generation_count}枚
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}

            {loading && (
              <View className="py-6 items-center">
                <ActivityIndicator size="small" color={theme.colors.accent} />
              </View>
            )}

            {!loading && sessions.length < total && (
              <View className="pt-2 pb-8">
                <HapticButton
                  title="さらに読み込む"
                  variant="secondary"
                  onPress={() => fetchSessions(page + 1, true)}
                />
              </View>
            )}
          </ScrollView>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {detailLoading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text className="text-text-muted text-sm mt-4 tracking-wide">詳細を読み込み中...</Text>
            </View>
          ) : !selectedSession ? (
            <View className="items-center justify-center py-24">
              <Text className="text-text-muted text-sm tracking-wide">
                セッションを選択すると詳細が表示されます
              </Text>
            </View>
          ) : (
            <>
              <View className="bg-bg-surface rounded-card border border-border p-5 mb-5">
                <View className="flex-row items-start justify-between gap-4">
                  <View className="flex-1">
                    <Text className="text-text-primary text-xl font-semibold mb-2">
                      Session {selectedSession.id.slice(0, 8)}
                    </Text>
                    <Text className="text-text-secondary text-sm">
                      {formatDateTime(selectedSession.created_at)}
                    </Text>
                    <Text className="text-text-muted text-xs mt-2">
                      store {selectedSession.store_code ?? '未設定'}  ·  staff {selectedSession.staff_id.slice(0, 8)}
                    </Text>
                  </View>
                  <View className={`px-3 py-2 rounded-pill ${selectedSession.is_closed ? 'bg-bg-elevated' : 'bg-accent/15'}`}>
                    <Text className={`text-xs tracking-wide ${selectedSession.is_closed ? 'text-text-muted' : 'text-accent'}`}>
                      {selectedSession.is_closed ? '終了済み' : '進行中'}
                    </Text>
                  </View>
                </View>

                {detailStats && (
                  <View className="flex-row gap-3 mt-5">
                    <View className="flex-1 bg-bg-elevated rounded-card border border-border px-4 py-4">
                      <Text className="text-text-muted text-[11px] tracking-wide mb-2">完了</Text>
                      <Text className="text-text-primary text-lg font-semibold">{detailStats.completed}</Text>
                    </View>
                    <View className="flex-1 bg-bg-elevated rounded-card border border-border px-4 py-4">
                      <Text className="text-text-muted text-[11px] tracking-wide mb-2">失敗</Text>
                      <Text className="text-text-primary text-lg font-semibold">{detailStats.failed}</Text>
                    </View>
                    <View className="flex-1 bg-bg-elevated rounded-card border border-border px-4 py-4">
                      <Text className="text-text-muted text-[11px] tracking-wide mb-2">推定コスト</Text>
                      <Text className="text-text-primary text-lg font-semibold">{formatCurrency(detailStats.totalCost)}</Text>
                    </View>
                    <View className="flex-1 bg-bg-elevated rounded-card border border-border px-4 py-4">
                      <Text className="text-text-muted text-[11px] tracking-wide mb-2">平均レイテンシ</Text>
                      <Text className="text-text-primary text-lg font-semibold">{detailStats.avgLatency}ms</Text>
                    </View>
                  </View>
                )}
              </View>

              {selectedSession.customer_photo_url && (
                <View className="bg-bg-surface rounded-card border border-border p-5 mb-5">
                  <Text className="text-text-primary text-sm font-medium mb-4">お客さま写真</Text>
                  <Image
                    source={{ uri: selectedSession.customer_photo_url }}
                    className="w-48 h-60 rounded-img"
                    contentFit="cover"
                  />
                </View>
              )}

              {groupedGenerations.map((group) => {
                const lead = group.generations[0];
                return (
                  <View key={group.styleGroup} className="bg-bg-surface rounded-card border border-border p-5 mb-4">
                    <View className="flex-row items-center justify-between mb-4">
                      <View>
                        <Text className="text-text-primary text-base font-medium">
                          {lead?.style_label ?? `Style ${group.styleGroup}`}
                        </Text>
                        <Text className="text-text-muted text-xs mt-1">
                          style_group {group.styleGroup}
                        </Text>
                      </View>
                      <View className="flex-row gap-2">
                        <View className="px-2.5 py-1 rounded-pill bg-bg-elevated border border-border">
                          <Text className="text-text-muted text-[10px] tracking-wide">
                            {lead?.simulation_mode ?? 'style'}
                          </Text>
                        </View>
                        <View className="px-2.5 py-1 rounded-pill bg-bg-elevated border border-border">
                          <Text className="text-text-muted text-[10px] tracking-wide">
                            {lead?.reference_type ?? 'unknown'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="flex-row flex-wrap gap-3">
                      {group.generations.map((generation) => (
                        <View
                          key={generation.id}
                          className="bg-bg-elevated rounded-card border border-border p-3"
                          style={{ width: isWide ? 182 : '48%' }}
                        >
                          {generation.photo_url ? (
                            <Image
                              source={{ uri: generation.photo_url }}
                              className="w-full aspect-[3/4] rounded-img"
                              contentFit="cover"
                            />
                          ) : (
                            <View className="w-full aspect-[3/4] rounded-img bg-bg border border-border items-center justify-center">
                              <Text className="text-text-muted text-[11px] tracking-wide">{generation.status}</Text>
                            </View>
                          )}
                          <Text className="text-text-primary text-xs font-medium mt-3">
                            {generation.angle}
                          </Text>
                          <Text className="text-text-muted text-[11px] mt-1">
                            {generation.status}
                            {generation.ai_latency_ms ? `  ·  ${generation.ai_latency_ms}ms` : ''}
                          </Text>
                          <View className="flex-row gap-2 mt-3 flex-wrap">
                            {generation.is_favorite && (
                              <View className="px-2 py-1 rounded-pill bg-accent/15">
                                <Text className="text-accent text-[10px] tracking-wide">favorite</Text>
                              </View>
                            )}
                            {generation.is_selected && (
                              <View className="px-2 py-1 rounded-pill bg-success/15">
                                <Text className="text-success text-[10px] tracking-wide">selected</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
