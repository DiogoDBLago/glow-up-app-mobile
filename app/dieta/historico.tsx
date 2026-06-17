import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Droplet, Flame, Trash2, UtensilsCrossed, Wheat } from 'lucide-react-native';
import { AppText, AppButton } from '@/components/ui';
import { useStore } from '@/lib/store';
import { FOOD_BY_ID } from '@/lib/data/foods';
import { mealTypeLabel, type MealType } from '@/lib/data/meals';

function formatDateLabel(dateIso: string): string {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  if (dateIso === todayKey) return 'Hoje';
  if (dateIso === yesterdayKey) return 'Ontem';
  const [, m, d] = dateIso.split('-');
  return `${d}/${m}`;
}

export default function HistoricoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, dispatch, toast } = useStore();
  const logs = state.mealLogs;

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center gap-2 px-5" style={{ paddingTop: insets.top + 16, paddingBottom: 12 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/diet'))}
          className="size-10 items-center justify-center rounded-full border border-border bg-white"
        >
          <ChevronLeft size={20} color="#2A1B2E" />
        </Pressable>
        <View>
          <AppText className="font-display text-lg font-semibold">Histórico</AppText>
          <AppText className="text-xs text-ink-soft">{logs.length} refeições</AppText>
        </View>
      </View>

      {logs.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <AppText className="text-3xl">🍽️</AppText>
          <AppText className="text-center font-display text-lg font-semibold">Sem refeições ainda</AppText>
          <AppText className="text-center text-sm text-ink-soft">
            Monte sua primeira refeição para acompanhar suas estatísticas aqui.
          </AppText>
          <AppButton label="Montar refeição" onPress={() => router.push('/dieta/montar')} />
        </View>
      ) : (
        <HistoryContent logs={logs} dispatch={dispatch} toast={toast} insets={insets} />
      )}
    </View>
  );
}

function HistoryContent({
  logs,
  dispatch,
  toast,
  insets,
}: {
  logs: ReturnType<typeof useStore>['state']['mealLogs'];
  dispatch: ReturnType<typeof useStore>['dispatch'];
  toast: ReturnType<typeof useStore>['toast'];
  insets: { bottom: number };
}) {
  const totalKcal = logs.reduce((a, m) => a + (m.kcal ?? 0), 0);
  const totalProtein = Math.round(logs.reduce((a, m) => a + (m.protein ?? 0), 0));
  const totalCarbs = Math.round(logs.reduce((a, m) => a + (m.carbs ?? 0), 0));
  const totalFats = Math.round(logs.reduce((a, m) => a + (m.fats ?? 0), 0));

  const grouped = logs.reduce<Record<string, typeof logs>>((acc, l) => {
    (acc[l.date] ??= []).push(l);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort().reverse();

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 20 }}>
      <View className="flex-row gap-2">
        <StatPill label="Refs" value={`${logs.length}`} />
        <StatPill label="Kcal" value={`${totalKcal}`} />
        <StatPill label="Prot" value={`${totalProtein}g`} />
        <StatPill label="Carb" value={`${totalCarbs}g`} />
        <StatPill label="Gord" value={`${totalFats}g`} />
      </View>

      <View className="gap-5">
        {dates.map((date) => {
          const meals = grouped[date];
          const dayKcal = meals.reduce((a, m) => a + (m.kcal ?? 0), 0);
          return (
            <View key={date} className="gap-2">
              <View className="flex-row items-baseline justify-between px-1">
                <AppText className="font-display text-base font-bold">{formatDateLabel(date)}</AppText>
                <AppText className="text-[11px] text-ink-soft">
                  {meals.length} refeições · {dayKcal} kcal
                </AppText>
              </View>
              {meals.map((l) => {
                const foods = l.foodIds?.length ? l.foodIds.map((id) => FOOD_BY_ID[id]?.name).filter(Boolean).join(' + ') : l.name;
                const eyebrow = l.mealType ? mealTypeLabel(l.mealType as MealType) : 'Refeição';
                const hasMacros = l.kcal || l.protein || l.carbs || l.fats;
                return (
                  <View key={l.id} className="rounded-2xl border border-border bg-white p-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View className="size-8 items-center justify-center rounded-full bg-primary/10">
                          <UtensilsCrossed size={14} color="#FF4F93" />
                        </View>
                        <View>
                          <AppText className="text-[10px] uppercase tracking-widest text-primary">{eyebrow}</AppText>
                          <AppText className="text-sm font-medium" numberOfLines={1}>
                            {foods || 'Refeição'}
                          </AppText>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => {
                          dispatch({ type: 'DELETE_MEAL', id: l.id });
                          toast('Removida');
                        }}
                        className="size-8 items-center justify-center rounded-full bg-destructive/10"
                      >
                        <Trash2 size={14} color="#8B7280" />
                      </Pressable>
                    </View>
                    {hasMacros ? (
                      <View className="mt-2 flex-row gap-3 pl-10">
                        <InlineStat icon={Flame} value={`${l.kcal ?? 0}`} />
                        <InlineStat icon={Wheat} value={`${Math.round(l.carbs ?? 0)}g`} />
                        <InlineStat icon={Droplet} value={`${Math.round(l.fats ?? 0)}g`} />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-border bg-white py-2.5">
      <AppText className="font-display text-sm font-bold">{value}</AppText>
      <AppText className="text-[9px] uppercase tracking-widest text-ink-soft">{label}</AppText>
    </View>
  );
}

function InlineStat({ icon: Icon, value }: { icon: typeof Flame; value: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <Icon size={11} color="#8B7280" />
      <AppText className="text-[11px] text-ink-soft">{value}</AppText>
    </View>
  );
}
