import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Dumbbell,
  Flame,
  Pencil,
  Plus,
  Target,
  Timer,
  Trash2,
} from 'lucide-react-native';
import { AppText, AppButton, AppCard } from '@/components/ui';
import { ExercisePickerSheet } from '@/components/workouts/ExercisePickerSheet';
import { useStore } from '@/lib/store';
import { estimateDayDurationMin, estimateDayKcal, GOAL_LABELS, isDayCompletedThisWeek, PLACE_LABELS, WEEKDAY_LABELS, newPlanExercise } from '@/lib/workouts-v2';

export default function MeuPlanoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, dispatch, toast } = useStore();
  const plan = state.userPlan;
  const sessions = state.workoutSessionsV2;
  const [editDayId, setEditDayId] = useState<string | null>(null);

  function deletePlan() {
    Alert.alert('Excluir seu plano?', 'Isso não apaga o histórico.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'WV2_DELETE_PLAN' });
          toast('Plano excluído');
          router.replace('/(app)/treinos');
        },
      },
    ]);
  }

  function addToDay(ids: string[], restSec: number) {
    if (!plan || !editDayId) return;
    const day = plan.days.find((d) => d.id === editDayId);
    if (!day) return;
    const newExercises = ids.map((id) => ({ ...newPlanExercise(id), restSec }));
    dispatch({ type: 'WV2_UPDATE_DAY', dayId: day.id, day: { ...day, exercises: [...day.exercises, ...newExercises] } });
    setEditDayId(null);
  }

  if (!plan) {
    return (
      <View className="flex-1 bg-white">
        <Header router={router} insets={insets} title="Meu plano" />
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <View className="size-20 items-center justify-center rounded-full bg-primary/10">
            <AppText className="text-3xl">🧘‍♀️</AppText>
          </View>
          <AppText className="text-center font-display text-xl font-semibold">Nenhum plano ainda</AppText>
          <AppText className="max-w-[280px] text-center text-sm text-ink-soft">
            Crie seu plano de treino. Você escolhe local, objetivo, dias e cada exercício.
          </AppText>
          <AppButton label="Criar meu plano" onPress={() => router.push('/treino/plano-novo')} />
        </View>
      </View>
    );
  }

  const editDay = plan.days.find((d) => d.id === editDayId) ?? null;

  return (
    <View className="flex-1 bg-white">
      <Header router={router} insets={insets} title="Meu plano" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}>
        <AppCard className="gap-0">
          <View className="flex-row justify-between">
            <Meta icon={Target} label="Objetivo" value={GOAL_LABELS[plan.goal]} />
            <Meta icon={Dumbbell} label="Local" value={PLACE_LABELS[plan.place]} />
            <Meta icon={Calendar} label="Dias/sem" value={`${plan.daysPerWeek}`} />
          </View>
        </AppCard>

        <View className="gap-3">
          {plan.days.map((day) => {
            const min = estimateDayDurationMin(day);
            const kcal = estimateDayKcal(day);
            const done = isDayCompletedThisWeek(day.id, sessions);
            const weekdayName = day.weekday !== undefined ? WEEKDAY_LABELS[day.weekday] : day.name;
            const empty = day.exercises.length === 0;
            return (
              <View
                key={day.id}
                className={`overflow-hidden rounded-[26px] border bg-white ${done ? 'border-primary/40' : 'border-border'}`}
              >
                <View className="flex-row items-start gap-3 p-4">
                  <View
                    className={`size-14 items-center justify-center rounded-2xl ${done ? 'bg-primary' : 'bg-primary/10'}`}
                  >
                    <AppText
                      className={`font-display text-[13px] font-bold ${done ? 'text-white' : 'text-primary'}`}
                    >
                      {weekdayName.slice(0, 3)}
                    </AppText>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <AppText className="font-display text-[17px] font-bold leading-tight" numberOfLines={1}>
                        {weekdayName}
                      </AppText>
                      {done ? (
                        <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                          <CheckCircle2 size={12} color="#FF4F93" />
                          <AppText className="text-[10px] font-bold text-primary">Concluído</AppText>
                        </View>
                      ) : null}
                    </View>
                    {empty ? (
                      <AppText className="mt-1 text-[12px] text-ink-soft">Sem exercícios ainda</AppText>
                    ) : (
                      <View className="mt-1 flex-row flex-wrap gap-x-3 gap-y-0.5">
                        <AppText className="text-[12px] text-ink-soft">{day.exercises.length} exerc.</AppText>
                        <View className="flex-row items-center gap-1">
                          <Timer size={12} color="#8B7280" />
                          <AppText className="text-[12px] text-ink-soft">{min} min</AppText>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Flame size={12} color="#FF4F93" />
                          <AppText className="text-[12px] text-ink-soft">{kcal} kcal</AppText>
                        </View>
                      </View>
                    )}
                  </View>
                  <Pressable
                    onPress={() => setEditDayId(day.id)}
                    className="size-10 items-center justify-center rounded-full bg-primary/10"
                  >
                    <Pencil size={16} color="#FF4F93" />
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => !empty && router.push({ pathname: '/treino/sessao/[dayId]', params: { dayId: day.id } })}
                  disabled={empty}
                  className={`w-full items-center py-3 ${empty ? 'bg-primary/5' : done ? 'bg-primary/10' : 'bg-primary'}`}
                >
                  {empty ? (
                    <AppText className="text-sm font-semibold text-ink-soft">Adicione exercícios para iniciar</AppText>
                  ) : (
                    <View className="flex-row items-center gap-2">
                      <AppText className={`text-sm font-semibold ${done ? 'text-primary' : 'text-white'}`}>
                        {done ? 'Treinar novamente' : 'Iniciar'}
                      </AppText>
                      <ArrowRight size={16} color={done ? '#FF4F93' : '#FFFFFF'} />
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>

        <View className="flex-row gap-2 pt-2">
          <AppButton
            label="Editar plano"
            variant="outline"
            onPress={() => router.push('/treino/plano-novo')}
            className="flex-1"
          />
          <Pressable
            onPress={deletePlan}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-border bg-white py-3.5"
          >
            <Trash2 size={16} color="#8B7280" />
            <AppText className="text-sm font-medium text-ink-soft">Excluir</AppText>
          </Pressable>
        </View>
      </ScrollView>

      <ExercisePickerSheet
        open={!!editDay}
        onClose={() => setEditDayId(null)}
        onAdd={addToDay}
        place={plan.place}
      />
    </View>
  );
}

function Header({
  router,
  insets,
  title,
}: {
  router: ReturnType<typeof useRouter>;
  insets: { top: number };
  title: string;
}) {
  return (
    <View className="flex-row items-center gap-2 px-5" style={{ paddingTop: insets.top + 16, paddingBottom: 12 }}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/treinos'))}
        className="size-10 items-center justify-center rounded-full border border-border bg-white"
      >
        <ChevronLeft size={20} color="#2A1B2E" />
      </Pressable>
      <AppText className="font-display text-lg font-semibold">{title}</AppText>
    </View>
  );
}

function Meta({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <View className="flex-1 items-center">
      <Icon size={16} color="#FF4F93" />
      <AppText className="mt-1 text-[10px] uppercase tracking-widest text-ink-soft">{label}</AppText>
      <AppText className="mt-0.5 font-display text-sm font-semibold">{value}</AppText>
    </View>
  );
}
