import { useEffect } from 'react';
import { View, Text, Pressable, FlatList, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useHistory } from '../../hooks/useHistory';

interface HistoryPanelProps {
  visible: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return '今日';
  if (isYesterday) return '昨日';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function HistoryPanel({ visible, onClose, onSelectSession }: HistoryPanelProps) {
  const { sessions, loading, fetchSessions, loadMore } = useHistory();

  useEffect(() => {
    if (visible) fetchSessions(1);
  }, [visible, fetchSessions]);

  const grouped = sessions.reduce<Record<string, typeof sessions>>((acc, s) => {
    const key = formatDateGroup(s.created_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 flex-row">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="w-96 bg-bg-surface border-l border-border h-full pt-16 px-5">
          <View className="flex-row items-center justify-between mb-8">
            <Text className="text-text-primary text-xl font-semibold tracking-wide">
              履歴
            </Text>
            <Pressable className="p-2 -mr-2" onPress={onClose}>
              <Text className="text-text-muted text-xs tracking-wide">閉じる</Text>
            </Pressable>
          </View>

          <FlatList
            data={Object.entries(grouped)}
            keyExtractor={([key]) => key}
            renderItem={({ item: [dateLabel, daySessions] }) => (
              <View className="mb-6">
                <Text className="text-text-muted text-[11px] mb-3 font-medium tracking-widest uppercase">
                  {dateLabel}
                </Text>
                {daySessions.map((s) => (
                  <Pressable
                    key={s.id}
                    className="bg-bg-elevated rounded-card p-4 mb-2 border border-border"
                    onPress={() => onSelectSession(s.id)}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-text-secondary text-sm">
                        {formatTime(s.created_at)}
                      </Text>
                      <Text className="text-text-muted text-xs tracking-wide">
                        {s.generation_count > 0
                          ? `${Math.ceil(s.generation_count / 5)}スタイル`
                          : '途中終了'}
                      </Text>
                    </View>
                    {s.first_front_photo && (
                      <View className="flex-row gap-2 mt-3">
                        <Image
                          source={{ uri: s.first_front_photo }}
                          className="w-12 h-12 rounded-img"
                          contentFit="cover"
                        />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            showsVerticalScrollIndicator={false}
          />

          {loading && (
            <Text className="text-text-muted text-center py-4 text-xs tracking-wide">
              読み込み中...
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
