import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft, Plus, Search, Trash2 } from 'lucide-react-native';
import { AppText, AppButton, AppCard } from '@/components/ui';
import { useStore, dateKey } from '@/lib/store';
import { usePersonalization } from '@/hooks/use-personalization';
import { FOODS, FOOD_BY_ID, FOOD_CATEGORIES, type FoodCategoryId } from '@/lib/data/foods';
import { MEAL_TYPES, MEAL_GOALS, type MealType, type MealGoal, mealTypeLabel } from '@/lib/data/meals';

export default function MontarRefeicaoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dispatch, toast } = useStore();
  const { profile } = usePersonalization();
  const isProfileComplete = !!(profile?.weight_kg && profile?.height_cm && profile?.goal);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [goal, setGoal] = useState<MealGoal | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [category, setCategory] = useState<FoodCategoryId>('protein');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) return FOODS.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 60);
    return FOODS.filter((f) => f.category === category && (!goal || f.goalTags.includes(goal) || f.id === 'water'));
  }, [category, search, goal]);

  const totals = selected.reduce(
    (acc, id) => {
      const f = FOOD_BY_ID[id];
      if (!f) return acc;
      acc.kcal += f.kcal;
      acc.protein += f.protein;
      acc.carbs += f.carbs;
      acc.fats += f.fats;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fats: 0 },
  );

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function save() {
    if (!mealType || selected.length === 0) return;
    const name = selected.map((id) => FOOD_BY_ID[id]?.name).filter(Boolean).join(' + ');
    dispatch({
      type: 'ADD_MEAL',
      meal: {
        id: `ml-${Date.now()}`,
        date: dateKey(),
        name,
        mealType,
        foodIds: selected,
        kcal: totals.kcal,
        protein: totals.protein,
        carbs: totals.carbs,
        fats: totals.fats,
      },
    });
    toast('Refeição salva! +XP pelo cuidado de hoje ✨');
    router.replace('/(app)/diet');
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center gap-2 px-5" style={{ paddingTop: insets.top + 16, paddingBottom: 12 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/diet'))}
          className="size-10 items-center justify-center rounded-full border border-border bg-white"
        >
          <ChevronLeft size={20} color="#2A1B2E" />
        </Pressable>
        <AppText className="font-display text-lg font-semibold">Montar refeição</AppText>
      </View>

      {!isProfileComplete ? (
        <View className="items-center px-6 pt-10">
          <AppText className="font-display text-xl font-semibold">Complete seu perfil</AppText>
          <AppText className="mt-2 text-center text-sm text-ink-soft">
            Para montar refeições precisas, precisamos calcular sua meta nutricional.
          </AppText>
          <AppButton label="Completar agora" variant="dark" onPress={() => router.push('/(auth)/onboarding')} className="mt-6" />
        </View>
      ) : (
        <>
          <View className="flex-row gap-1 px-5">
            {[1, 2, 3, 4].map((s) => (
              <View key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-primary' : 'bg-primary/10'}`} />
            ))}
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 160, gap: 16 }} keyboardShouldPersistTaps="handled">
            {step === 1 ? (
              <Section title="Qual refeição?">
                <View className="flex-row flex-wrap gap-2">
                  {MEAL_TYPES.map((t) => {
                    const active = mealType === t.id;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => {
                          setMealType(t.id);
                          setStep(2);
                        }}
                        className={`w-[47%] rounded-2xl border p-4 ${active ? 'border-ink bg-ink' : 'border-border bg-white'}`}
                      >
                        <AppText className="text-xl">{t.emoji}</AppText>
                        <AppText className={`mt-1 text-sm font-medium ${active ? 'text-white' : 'text-ink'}`}>{t.label}</AppText>
                        <AppText className={`text-[10px] ${active ? 'text-white/70' : 'text-ink-soft'}`}>{t.time}</AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </Section>
            ) : null}

            {step === 2 ? (
              <Section title="Qual seu foco hoje?">
                <View className="flex-row flex-wrap gap-2">
                  {MEAL_GOALS.map((g) => {
                    const active = goal === g.id;
                    return (
                      <Pressable
                        key={g.id}
                        onPress={() => {
                          setGoal(g.id);
                          setStep(3);
                        }}
                        className={`w-[47%] rounded-2xl border p-4 ${active ? 'border-ink bg-ink' : 'border-border bg-white'}`}
                      >
                        <AppText className="text-xl">{g.emoji}</AppText>
                        <AppText className={`mt-1 text-sm font-medium ${active ? 'text-white' : 'text-ink'}`}>{g.label}</AppText>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable onPress={() => setStep(1)} className="mt-2">
                  <AppText className="text-xs text-ink-soft underline">Voltar</AppText>
                </Pressable>
              </Section>
            ) : null}

            {step === 3 ? (
              <Section title="Escolha os alimentos">
                <View className="flex-row items-center rounded-full border border-border bg-white px-3">
                  <Search size={16} color="#8B7280" />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Buscar alimento..."
                    className="ml-2 flex-1 py-2.5 text-sm"
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {FOOD_CATEGORIES.map((c) => {
                    const active = category === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setCategory(c.id)}
                        className={`rounded-full px-3 py-1.5 ${active ? 'bg-ink' : 'border border-border bg-white'}`}
                      >
                        <AppText className={`text-xs font-medium ${active ? 'text-white' : 'text-ink'}`}>
                          {c.emoji} {c.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <View className="flex-row flex-wrap gap-2">
                  {filtered.map((f) => {
                    const on = selected.includes(f.id);
                    return (
                      <Pressable
                        key={f.id}
                        onPress={() => toggle(f.id)}
                        className={`w-[47%] rounded-2xl border p-3 ${on ? 'border-primary bg-primary/10' : 'border-border bg-white'}`}
                      >
                        <View className="flex-row items-start justify-between">
                          <AppText className="text-xl">{f.emoji}</AppText>
                          {on ? <Check size={16} color="#FF4F93" /> : <Plus size={16} color="#8B7280" />}
                        </View>
                        <AppText className="mt-1 text-xs font-medium leading-tight">{f.name}</AppText>
                        <AppText className="text-[10px] text-ink-soft">{f.servingSize}</AppText>
                        <AppText className="mt-0.5 text-[10px] text-primary">
                          {f.kcal} kcal · P{f.protein} C{f.carbs} G{f.fats}
                        </AppText>
                      </Pressable>
                    );
                  })}
                  {filtered.length === 0 ? (
                    <AppText className="w-full py-6 text-center text-xs text-ink-soft">Nenhum alimento encontrado.</AppText>
                  ) : null}
                </View>
                <View className="flex-row gap-2">
                  <AppButton label="Voltar" variant="outline" onPress={() => setStep(2)} className="flex-1" />
                  <AppButton
                    label={`Revisar (${selected.length})`}
                    variant="dark"
                    onPress={() => setStep(4)}
                    disabled={selected.length === 0}
                    className="flex-1"
                  />
                </View>
              </Section>
            ) : null}

            {step === 4 ? (
              <Section title="Resumo">
                <AppCard className="gap-0">
                  <AppText className="text-[10px] uppercase tracking-widest text-primary">
                    {mealType ? mealTypeLabel(mealType) : ''} · {MEAL_GOALS.find((g) => g.id === goal)?.label}
                  </AppText>
                  <AppText className="mt-1 font-display text-2xl font-semibold">{totals.kcal} kcal</AppText>
                  <View className="mt-2 flex-row gap-2">
                    <Macro label="Proteína" v={totals.protein} />
                    <Macro label="Carbo" v={totals.carbs} />
                    <Macro label="Gordura" v={totals.fats} />
                  </View>
                </AppCard>
                <View className="gap-1.5">
                  {selected.map((id, i) => {
                    const f = FOOD_BY_ID[id];
                    if (!f) return null;
                    return (
                      <View key={`${id}-${i}`} className="flex-row items-center justify-between gap-2 rounded-xl border border-border bg-white p-3">
                        <AppText className="flex-1 text-sm" numberOfLines={1}>
                          {f.emoji} {f.name} <AppText className="text-[10px] text-ink-soft">· {f.kcal} kcal</AppText>
                        </AppText>
                        <Pressable onPress={() => toggle(id)} className="p-1.5">
                          <Trash2 size={16} color="#8B7280" />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
                <View className="flex-row gap-2">
                  <AppButton label="Editar" variant="outline" onPress={() => setStep(3)} className="flex-1" />
                  <AppButton label="Salvar refeição" variant="dark" onPress={save} className="flex-1" />
                </View>
              </Section>
            ) : null}
          </ScrollView>
        </>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <AppText className="font-display text-lg font-semibold">{title}</AppText>
      {children}
    </View>
  );
}

function Macro({ label, v }: { label: string; v: number }) {
  return (
    <View className="flex-1 rounded-xl bg-primary/5 p-2 items-center">
      <AppText className="font-display text-sm font-semibold">{Math.round(v)}g</AppText>
      <AppText className="text-[10px] text-ink-soft">{label}</AppText>
    </View>
  );
}
