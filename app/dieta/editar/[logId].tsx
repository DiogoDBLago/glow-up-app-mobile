import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Replace, Search, Trash2 } from 'lucide-react-native';
import { AppText, AppButton, AppCard } from '@/components/ui';
import { useStore } from '@/lib/store';
import { FOODS, FOOD_BY_ID, FOOD_CATEGORIES, SUBSTITUTIONS, type FoodCategoryId } from '@/lib/data/foods';
import { MEAL_TYPES, mealTypeLabel, type MealType } from '@/lib/data/meals';

export default function EditarRefeicaoScreen() {
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, dispatch, toast } = useStore();
  const log = state.mealLogs.find((l) => l.id === logId);

  const [foodIds, setFoodIds] = useState<string[]>(log?.foodIds ?? []);
  const [mealType, setMealType] = useState<MealType>((log?.mealType as MealType) ?? 'breakfast');
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [category, setCategory] = useState<FoodCategoryId>('protein');
  const [search, setSearch] = useState('');

  const totals = useMemo(
    () =>
      foodIds.reduce(
        (acc, fid) => {
          const f = FOOD_BY_ID[fid];
          if (!f) return acc;
          acc.kcal += f.kcal;
          acc.protein += f.protein;
          acc.carbs += f.carbs;
          acc.fats += f.fats;
          return acc;
        },
        { kcal: 0, protein: 0, carbs: 0, fats: 0 },
      ),
    [foodIds],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) return FOODS.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 60);
    return FOODS.filter((f) => f.category === category);
  }, [category, search]);

  function swap(oldId: string, newId: string) {
    setFoodIds((ids) => ids.map((i) => (i === oldId ? newId : i)));
    setSwapFor(null);
  }
  function remove(fid: string) {
    setFoodIds((ids) => ids.filter((i) => i !== fid));
  }
  function add(fid: string) {
    if (!foodIds.includes(fid)) setFoodIds((ids) => [...ids, fid]);
  }

  function save() {
    if (!log) return;
    if (foodIds.length === 0) {
      toast('Adicione pelo menos um alimento');
      return;
    }
    const name = foodIds.map((fid) => FOOD_BY_ID[fid]?.name).filter(Boolean).join(' + ');
    dispatch({
      type: 'UPDATE_MEAL',
      meal: { ...log, name, mealType, foodIds, kcal: totals.kcal, protein: totals.protein, carbs: totals.carbs, fats: totals.fats },
    });
    toast('Refeição atualizada ✨');
    router.replace('/(app)/diet');
  }

  function del() {
    if (!log) return;
    dispatch({ type: 'DELETE_MEAL', id: log.id });
    toast('Refeição removida');
    router.replace('/(app)/diet');
  }

  if (!log) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 40 }}>
        <AppText className="text-center text-sm text-ink-soft">Refeição não encontrada.</AppText>
      </View>
    );
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
        <AppText className="font-display text-lg font-semibold">Editar refeição</AppText>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View>
          <AppText className="mb-2 text-[10px] uppercase tracking-widest text-ink-soft">Tipo de refeição</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {MEAL_TYPES.map((t) => {
              const active = mealType === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setMealType(t.id)}
                  className={`rounded-full border px-3 py-1.5 ${active ? 'border-ink bg-ink' : 'border-border bg-white'}`}
                >
                  <AppText className={`text-xs font-medium ${active ? 'text-white' : 'text-ink'}`}>
                    {t.emoji} {mealTypeLabel(t.id)}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <AppCard className="gap-0">
          <View className="flex-row items-baseline justify-between">
            <AppText className="font-display text-2xl font-semibold">{totals.kcal} kcal</AppText>
            <AppText className="text-[11px] text-ink-soft">{foodIds.length} alimentos</AppText>
          </View>
          <View className="mt-3 flex-row gap-2">
            <Macro label="Proteína" v={totals.protein} />
            <Macro label="Carbo" v={totals.carbs} />
            <Macro label="Gordura" v={totals.fats} />
          </View>
        </AppCard>

        <View>
          <AppText className="mb-2 font-display font-semibold">Alimentos</AppText>
          {foodIds.length === 0 ? (
            <AppText className="mb-2 text-xs text-ink-soft">Nenhum alimento. Adicione abaixo.</AppText>
          ) : null}
          <View className="gap-2">
            {foodIds.map((fid) => {
              const f = FOOD_BY_ID[fid];
              if (!f) return null;
              return (
                <View key={fid} className="rounded-xl border border-border bg-white p-3">
                  <View className="flex-row items-center justify-between gap-2">
                    <View className="flex-1">
                      <AppText className="text-sm font-medium" numberOfLines={1}>
                        {f.emoji} {f.name}
                      </AppText>
                      <AppText className="text-[10px] text-ink-soft">
                        {f.servingSize} · {f.kcal} kcal
                      </AppText>
                    </View>
                    <View className="flex-row gap-1.5">
                      <Pressable
                        onPress={() => setSwapFor(swapFor === fid ? null : fid)}
                        className="flex-row items-center gap-1 rounded-full bg-primary/10 px-3 py-1"
                      >
                        <Replace size={12} color="#FF4F93" />
                        <AppText className="text-[11px] text-primary">Trocar</AppText>
                      </Pressable>
                      <Pressable onPress={() => remove(fid)} className="flex-row items-center gap-1 rounded-full bg-destructive/10 px-3 py-1">
                        <Trash2 size={12} color="#8B7280" />
                      </Pressable>
                    </View>
                  </View>
                  {swapFor === fid ? (
                    <View className="mt-2 flex-row flex-wrap gap-1.5">
                      {(SUBSTITUTIONS[fid] ?? []).map((sid) => {
                        const s = FOOD_BY_ID[sid];
                        if (!s) return null;
                        return (
                          <Pressable key={sid} onPress={() => swap(fid, sid)} className="rounded-full bg-destructive/10 px-3 py-1">
                            <AppText className="text-[11px]">
                              {s.emoji} {s.name}
                            </AppText>
                          </Pressable>
                        );
                      })}
                      {!SUBSTITUTIONS[fid]?.length ? (
                        <AppText className="text-[11px] text-ink-soft">Sem substitutos cadastrados.</AppText>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={() => setAdding((a) => !a)}
            className="mt-3 flex-row items-center justify-center gap-1.5 rounded-full border border-border bg-white py-2"
          >
            <Plus size={16} color="#2A1B2E" />
            <AppText className="text-xs font-medium">{adding ? 'Fechar' : 'Adicionar alimento'}</AppText>
          </Pressable>
        </View>

        {adding ? (
          <View className="gap-3 rounded-2xl border border-border bg-white p-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {FOOD_CATEGORIES.map((c) => {
                const active = category === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategory(c.id)}
                    className={`rounded-full border px-3 py-1 ${active ? 'border-ink bg-ink' : 'border-border bg-white'}`}
                  >
                    <AppText className={`text-[11px] font-medium ${active ? 'text-white' : 'text-ink'}`}>
                      {c.emoji} {c.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View className="flex-row items-center rounded-full bg-primary/5 px-3">
              <Search size={16} color="#8B7280" />
              <TextInput value={search} onChangeText={setSearch} placeholder="Buscar alimento…" className="ml-2 flex-1 py-2 text-sm" />
            </View>
            <View className="gap-1.5">
              {filtered.map((f) => {
                const already = foodIds.includes(f.id);
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => add(f.id)}
                    disabled={already}
                    className={`flex-row items-center justify-between gap-2 rounded-xl border p-2.5 ${
                      already ? 'border-border bg-primary/5' : 'border-border bg-white'
                    }`}
                  >
                    <View className="flex-1">
                      <AppText className="text-sm font-medium" numberOfLines={1}>
                        {f.emoji} {f.name}
                      </AppText>
                      <AppText className="text-[10px] text-ink-soft">
                        {f.servingSize} · {f.kcal} kcal · P{f.protein} C{f.carbs} G{f.fats}
                      </AppText>
                    </View>
                    {already ? (
                      <AppText className="text-[10px] text-ink-soft">Adicionado</AppText>
                    ) : (
                      <Plus size={16} color="#FF4F93" />
                    )}
                  </Pressable>
                );
              })}
              {filtered.length === 0 ? <AppText className="py-4 text-center text-xs text-ink-soft">Nada encontrado.</AppText> : null}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View className="flex-row gap-2 px-5" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 16 }}>
        <Pressable onPress={del} className="items-center justify-center rounded-full border border-border bg-white px-4 py-3">
          <Trash2 size={16} color="#8B7280" />
        </Pressable>
        <AppButton label="Salvar mudanças" variant="dark" onPress={save} className="flex-1" />
      </View>
    </View>
  );
}

function Macro({ label, v }: { label: string; v: number }) {
  return (
    <View className="flex-1 items-center rounded-xl bg-primary/5 p-2">
      <AppText className="font-display text-sm font-semibold">{Math.round(v)}g</AppText>
      <AppText className="text-[10px] text-ink-soft">{label}</AppText>
    </View>
  );
}
