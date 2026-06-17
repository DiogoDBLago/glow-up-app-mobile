import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Check, Dumbbell, Home, Plus, Target, Trash2 } from 'lucide-react-native';
import { AppText, AppButton, AppCard } from '@/components/ui';
import { ExercisePickerSheet } from '@/components/workouts/ExercisePickerSheet';
import { useStore, type Level, type Place, type PlanExercise, type WGoal } from '@/lib/store';
import { GOAL_LABELS, WEEKDAY_LABELS, WEEKDAY_SHORT, defaultWeekdaysFor, makeEmptyPlan, newPlanExercise } from '@/lib/workouts-v2';
import { getLibraryExercise } from '@/lib/data/exercise-library';

const STEP_LABELS = ['Objetivo & local', 'Dias da semana', 'Montar treinos'];

const LEVEL_LABELS: Record<Level, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

const LEVEL_PRESETS: Record<Level, { minExercises: number }> = {
  beginner: { minExercises: 4 },
  intermediate: { minExercises: 5 },
  advanced: { minExercises: 6 },
};

export default function PlanNovoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useStore();
  const existing = state.userPlan;

  const initialWeekdays =
    existing?.weekdays && existing.weekdays.length > 0 ? [...existing.weekdays].sort((a, b) => a - b) : defaultWeekdaysFor(3);

  const [step, setStep] = useState(0);
  const [place, setPlace] = useState<Place>(existing?.place ?? state.profile?.place ?? 'both');
  const [goal, setGoal] = useState<WGoal>(existing?.goal ?? 'tone');
  const [level, setLevel] = useState<Level>(existing?.level ?? 'beginner');
  const [weekdays, setWeekdays] = useState<number[]>(initialWeekdays);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [dayExercises, setDayExercises] = useState<Record<number, PlanExercise[]>>(() => {
    const map: Record<number, PlanExercise[]> = {};
    if (existing) {
      existing.days.forEach((d, i) => {
        const wd = d.weekday ?? initialWeekdays[i] ?? i;
        map[wd] = d.exercises;
      });
    }
    return map;
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeWd = weekdays[activeDayIdx];
  const activeList = activeWd !== undefined ? dayExercises[activeWd] ?? [] : [];
  const minExercises = LEVEL_PRESETS[level].minExercises;

  function toggleWeekday(wd: number) {
    setWeekdays((prev) => {
      const has = prev.includes(wd);
      const next = has ? prev.filter((x) => x !== wd) : [...prev, wd];
      return next.sort((a, b) => a - b);
    });
  }

  function addMany(ids: string[], restSec: number) {
    if (activeWd === undefined) return;
    const newExercises = ids.map((id) => ({ ...newPlanExercise(id), restSec }));
    setDayExercises((prev) => ({ ...prev, [activeWd]: [...(prev[activeWd] ?? []), ...newExercises] }));
    setPickerOpen(false);
  }

  function removeExercise(wd: number, peId: string) {
    setDayExercises((prev) => ({ ...prev, [wd]: (prev[wd] ?? []).filter((e) => e.id !== peId) }));
  }

  function dayIsComplete(wd: number): boolean {
    return (dayExercises[wd] ?? []).length >= minExercises;
  }
  const incompleteDays = weekdays.filter((wd) => !dayIsComplete(wd));

  function savePlan() {
    if (weekdays.length === 0) {
      setStep(1);
      return;
    }
    if (incompleteDays.length > 0) {
      setStep(2);
      setActiveDayIdx(weekdays.indexOf(incompleteDays[0]));
      return;
    }
    const base = makeEmptyPlan({ place, goal, weekdays });
    const plan = {
      ...(existing ?? {}),
      ...base,
      level,
      id: existing?.id ?? base.id,
      createdAt: existing?.createdAt ?? base.createdAt,
      days: base.days.map((d) => ({ ...d, exercises: dayExercises[d.weekday ?? -1] ?? [] })),
    };
    dispatch({ type: 'WV2_SET_PLAN', plan });
    router.replace('/treino/meu-plano');
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center gap-2 px-5" style={{ paddingTop: insets.top + 16, paddingBottom: 12 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/treino/meu-plano'))}
          className="size-10 items-center justify-center rounded-full border border-border bg-white"
        >
          <ChevronLeft size={20} color="#2A1B2E" />
        </Pressable>
        <AppText className="font-display text-lg font-semibold">Criar meu plano</AppText>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 160, gap: 20 }} keyboardShouldPersistTaps="handled">
        {/* Stepper */}
        <AppCard className="gap-0">
          <View className="flex-row gap-1.5">
            {STEP_LABELS.map((label, index) => (
              <Pressable
                key={label}
                onPress={() => setStep(index)}
                className={`h-2 flex-1 rounded-full ${index <= step ? 'bg-primary' : 'bg-ink/10'}`}
              />
            ))}
          </View>
          <AppText className="mt-3 text-center text-[11px] font-bold uppercase tracking-[2px] text-primary">
            Passo {step + 1} de {STEP_LABELS.length} · {STEP_LABELS[step]}
          </AppText>
        </AppCard>

        {step === 0 ? (
          <>
            <Section title="Objetivo" subtitle="Qual resultado você quer priorizar?">
              <View className="gap-2.5">
                {(['lose', 'tone', 'muscle', 'strength', 'fitness'] as WGoal[]).map((item) => {
                  const active = goal === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => setGoal(item)}
                      className={`flex-row items-center gap-3 rounded-[22px] border p-4 ${
                        active ? 'border-primary bg-primary' : 'border-border bg-white'
                      }`}
                    >
                      <Target size={18} color={active ? '#FFFFFF' : '#2A1B2E'} />
                      <AppText className={`flex-1 font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                        {GOAL_LABELS[item]}
                      </AppText>
                      {active ? <Check size={16} color="#FFFFFF" /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </Section>

            <Section title="Local" subtitle="Isso filtra os equipamentos disponíveis.">
              <View className="flex-row gap-3">
                <PlaceOption active={place === 'home'} onPress={() => setPlace('home')} icon={Home} label="Casa" />
                <PlaceOption active={place === 'gym'} onPress={() => setPlace('gym')} icon={Dumbbell} label="Academia" />
                <PlaceOption active={place === 'both'} onPress={() => setPlace('both')} icon={Dumbbell} label="Ambos" />
              </View>
            </Section>

            <Section title="Nível" subtitle="Define o mínimo de exercícios por dia.">
              <View className="gap-2.5">
                {(['beginner', 'intermediate', 'advanced'] as Level[]).map((lv) => {
                  const active = level === lv;
                  return (
                    <Pressable
                      key={lv}
                      onPress={() => setLevel(lv)}
                      className={`flex-row items-center gap-3 rounded-[22px] border p-4 ${
                        active ? 'border-primary bg-primary' : 'border-border bg-white'
                      }`}
                    >
                      <View className="flex-1">
                        <AppText className={`font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                          {LEVEL_LABELS[lv]}
                        </AppText>
                        <AppText className={`mt-0.5 text-[11px] ${active ? 'text-white/80' : 'text-ink-soft'}`}>
                          mín. {LEVEL_PRESETS[lv].minExercises} exercícios
                        </AppText>
                      </View>
                      {active ? <Check size={16} color="#FFFFFF" /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </Section>
          </>
        ) : null}

        {step === 1 ? (
          <Section title="Dias da semana" subtitle="Escolha exatamente em quais dias você vai treinar.">
            <View className="flex-row flex-wrap justify-center gap-2">
              {[3, 4, 5, 6, 7].map((n) => {
                const active = weekdays.length === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setWeekdays(defaultWeekdaysFor(n))}
                    className={`rounded-full px-3.5 py-1.5 ${active ? 'bg-primary' : 'bg-ink/5'}`}
                  >
                    <AppText className={`text-[12px] font-semibold ${active ? 'text-white' : 'text-ink-soft'}`}>
                      {n} dias
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <View className="mt-3 gap-2">
              {WEEKDAY_LABELS.map((label, wd) => {
                const active = weekdays.includes(wd);
                return (
                  <Pressable
                    key={wd}
                    onPress={() => toggleWeekday(wd)}
                    className={`flex-row items-center gap-3 rounded-[18px] border p-3.5 ${
                      active ? 'border-primary bg-primary/8' : 'border-border bg-white'
                    }`}
                  >
                    <View className={`size-10 items-center justify-center rounded-2xl ${active ? 'bg-primary' : 'bg-ink/5'}`}>
                      <AppText className={`font-display text-[13px] font-bold ${active ? 'text-white' : 'text-ink-soft'}`}>
                        {WEEKDAY_SHORT[wd]}
                      </AppText>
                    </View>
                    <AppText className="flex-1 font-semibold">{label}</AppText>
                    {active ? <Check size={18} color="#FF4F93" /> : null}
                  </Pressable>
                );
              })}
            </View>
            <AppText className="pt-1 text-center text-[12px] text-ink-soft">
              {weekdays.length} dia(s) selecionado(s)
            </AppText>
          </Section>
        ) : null}

        {step === 2 ? (
          <Section title="Montar treinos" subtitle={`Mín. ${minExercises} exercícios por dia (nível ${LEVEL_LABELS[level]}).`}>
            {weekdays.length === 0 ? (
              <View className="rounded-2xl bg-ink/5 p-4">
                <AppText className="text-center text-sm text-ink-soft">
                  Volte ao passo anterior e escolha pelo menos um dia.
                </AppText>
              </View>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {weekdays.map((wd, i) => {
                    const isActive = i === activeDayIdx;
                    const count = (dayExercises[wd] ?? []).length;
                    const complete = count >= minExercises;
                    return (
                      <Pressable
                        key={wd}
                        onPress={() => setActiveDayIdx(i)}
                        className={`flex-row items-center gap-1.5 rounded-full px-3.5 py-2 ${
                          isActive ? 'bg-primary' : 'border border-border bg-white'
                        }`}
                      >
                        <AppText className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-ink'}`}>
                          {WEEKDAY_SHORT[wd]} {count > 0 ? `· ${count}` : ''}
                        </AppText>
                        {complete ? <Check size={14} color={isActive ? '#FFFFFF' : '#059669'} /> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View className="gap-3 rounded-[24px] border border-border bg-white p-4">
                  <View>
                    <AppText className="font-display text-lg font-bold">{WEEKDAY_LABELS[activeWd ?? 0]}</AppText>
                    <AppText className={`text-[12px] ${dayIsComplete(activeWd ?? -1) ? 'text-success' : 'text-warning'}`}>
                      {activeList.length}/{minExercises} exercícios{dayIsComplete(activeWd ?? -1) ? ' · ok' : ' · incompleto'}
                    </AppText>
                  </View>

                  <Pressable
                    onPress={() => setPickerOpen(true)}
                    className="flex-row items-center gap-1.5 self-start rounded-full bg-primary px-4 py-2.5"
                  >
                    <Plus size={16} color="#FFFFFF" />
                    <AppText className="text-[13px] font-bold text-white">Adicionar exercício</AppText>
                  </Pressable>

                  <View className="gap-2">
                    {activeList.length === 0 ? (
                      <AppText className="rounded-2xl bg-ink/5 p-4 text-sm text-ink-soft">
                        Toque em "Adicionar exercício" para montar o treino deste dia.
                      </AppText>
                    ) : (
                      activeList.map((item) => {
                        const lib = getLibraryExercise(item.exerciseId);
                        return (
                          <View key={item.id} className="flex-row items-center gap-3 rounded-2xl bg-ink/5 p-2.5">
                            <View className="flex-1">
                              <AppText className="text-sm font-bold">{lib?.name ?? item.exerciseId}</AppText>
                              <AppText className="mt-0.5 text-[11px] font-semibold text-primary">
                                {item.sets}×{item.reps} · {item.restSec}s
                              </AppText>
                            </View>
                            <Pressable
                              onPress={() => activeWd !== undefined && removeExercise(activeWd, item.id)}
                              className="size-9 items-center justify-center rounded-full bg-white"
                            >
                              <Trash2 size={16} color="#8B7280" />
                            </Pressable>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>

                {incompleteDays.length > 0 ? (
                  <View className="rounded-2xl border border-warning/30 bg-warning/10 p-3">
                    <AppText className="text-[12px] text-ink">
                      <AppText className="font-bold">Faltam exercícios em:</AppText>{' '}
                      {incompleteDays.map((wd) => WEEKDAY_SHORT[wd]).join(', ')}. Mínimo {minExercises} por dia.
                    </AppText>
                  </View>
                ) : null}
              </>
            )}
          </Section>
        ) : null}
      </ScrollView>

      <View className="gap-2 px-5" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 16 }}>
        <View className="flex-row gap-2">
          {step > 0 ? (
            <AppButton label="Voltar" variant="outline" onPress={() => setStep((c) => c - 1)} className="flex-1" />
          ) : null}
          {step < STEP_LABELS.length - 1 ? (
            <AppButton label="Continuar" variant="dark" onPress={() => setStep((c) => c + 1)} className="flex-1" />
          ) : (
            <AppButton
              label="Salvar plano"
              variant="dark"
              onPress={savePlan}
              disabled={incompleteDays.length > 0}
              className="flex-1"
            />
          )}
        </View>
      </View>

      <ExercisePickerSheet open={pickerOpen} onClose={() => setPickerOpen(false)} onAdd={addMany} place={place} />
    </View>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <AppCard className="gap-0">
      <AppText className="text-center font-display text-2xl font-bold">{title}</AppText>
      {subtitle ? <AppText className="mt-2 text-center text-sm text-ink-soft">{subtitle}</AppText> : null}
      <View className="mt-4">{children}</View>
    </AppCard>
  );
}

function PlaceOption({
  active,
  onPress,
  icon: Icon,
  label,
}: {
  active: boolean;
  onPress: () => void;
  icon: typeof Home;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-h-[104px] flex-1 items-center justify-center gap-2 rounded-3xl border p-3 ${
        active ? 'border-primary bg-primary' : 'border-border bg-white'
      }`}
    >
      <Icon size={26} color={active ? '#FFFFFF' : '#2A1B2E'} />
      <AppText className={`text-sm font-bold ${active ? 'text-white' : 'text-ink'}`}>{label}</AppText>
    </Pressable>
  );
}
