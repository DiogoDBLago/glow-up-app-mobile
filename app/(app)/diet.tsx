import { useMemo, type ComponentType } from 'react';
import { Alert, ImageBackground, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Apple, ArrowRight, Check, Droplet, Flame, Dumbbell, Plus, Wheat } from 'lucide-react-native';
import { AppText } from '@/components/ui';
import { useStore, dateKey, type MealLog } from '@/lib/store';
import { usePersonalization } from '@/hooks/use-personalization';
import { useGlowUpIntelligence } from '@/hooks/use-glowup-intelligence';
import { getDailyDerived, todayKeyBR } from '@/lib/daily-derived';
import { getNutritionAdjustmentAdvice } from '@/lib/glowup-intelligence';
import { FOOD_BY_ID } from '@/lib/data/foods';
import { mealTypeLabel, type MealType } from '@/lib/data/meals';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

type MealDayStatus = 'complete' | 'partial' | 'none';

function statusFor(mealsCount: number): MealDayStatus {
  if (mealsCount >= 3) return 'complete';
  if (mealsCount >= 1) return 'partial';
  return 'none';
}

function statusLabel(status: MealDayStatus): string {
  if (status === 'complete') return 'Completo';
  if (status === 'partial') return 'Parcial';
  return 'Sem registro';
}

export default function DietScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, dispatch, toast } = useStore();
  const { profile } = usePersonalization();
  const { context: intel } = useGlowUpIntelligence();
  const today = dateKey();

  const isProfileComplete = !!(profile?.weight_kg && profile?.height_cm && profile?.goal);
  const daily = getDailyDerived(state, profile, today);
  const todays = daily.nutrition.meals;
  const totals = daily.nutrition.totals;
  const targetKcal = daily.nutrition.targets.kcal;
  const targetProtein = daily.nutrition.targets.protein;
  const targetCarbs = daily.nutrition.targets.carbs;
  const targetFats = daily.nutrition.targets.fats;
  const kcalRemaining = Math.max(0, Math.round(daily.nutrition.caloriesRemaining));
  const nutritionAdvice = intel ? getNutritionAdjustmentAdvice(intel) : null;

  const weekStats = useMemo(() => {
    const now = new Date();
    const dayIdx = (now.getDay() + 6) % 7; // Mon=0..Sun=6
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayIdx);
    monday.setHours(0, 0, 0, 0);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = todayKeyBR(d);
      const mealsCount = state.mealLogs.filter((m) => m.date === key).length;
      return {
        key,
        dateLabel: `${d.getDate()}/${d.getMonth() + 1}`,
        mealsCount,
        isToday: key === today,
        status: statusFor(mealsCount),
      };
    });

    return { days, hasAnyData: state.mealLogs.length > 0 };
  }, [state.mealLogs, today]);

  function removeMeal(id: string) {
    Alert.alert('Excluir refeição?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'DELETE_MEAL', id });
          toast('Refeição removida');
        },
      },
    ]);
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 128, gap: 16 }}
    >
      {!isProfileComplete ? (
        <View className="items-center rounded-3xl border border-border bg-white p-6 shadow-luxe">
          <Apple size={32} color="rgba(255,79,147,0.3)" />
          <AppText className="mt-3 font-display text-lg font-semibold">Plano Nutricional</AppText>
          <AppText className="mt-1 text-center text-sm text-ink-soft">
            Complete seu perfil para calcular seu plano nutricional personalizado.
          </AppText>
          <Pressable onPress={() => router.push('/(auth)/onboarding')} className="mt-4 rounded-full bg-primary px-6 py-2.5">
            <AppText className="text-sm font-medium text-white">Completar perfil</AppText>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Hero */}
          <ImageBackground
            source={require('../../assets/home/nutrition-bg.jpg')}
            style={{ borderRadius: 32, overflow: 'hidden', minHeight: 280 }}
            imageStyle={{ resizeMode: 'cover' }}
          >
            <LinearGradient
              colors={['rgba(255,79,147,0.92)', 'rgba(255,79,147,0.45)', 'rgba(255,79,147,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ position: 'absolute', inset: 0 }}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.65)']}
              locations={[0, 0.35, 1]}
              style={{ position: 'absolute', inset: 0 }}
            />
            <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
              <View className="self-start flex-row items-center gap-1.5 rounded-full bg-white px-3 py-1.5">
                <AppText className="text-[10px] font-bold uppercase tracking-[2px] text-primary">🥗 Nutrição</AppText>
              </View>

              <View style={{ gap: 16 }}>
                <AppText className="font-display text-[28px] font-bold leading-[1.05] text-white">
                  Sua próxima{'\n'}refeição.
                </AppText>

                <View className="flex-row gap-1">
                  <HeroMetric icon={Flame} label="Calorias" value={kcalRemaining} target={Math.round(targetKcal)} unit=" kcal" />
                  <HeroMetric icon={Dumbbell} label="Proteína" value={Math.round(totals.protein)} target={targetProtein} unit="g" divider />
                  <HeroMetric icon={Wheat} label="Carbo" value={Math.round(totals.carbs)} target={targetCarbs} unit="g" divider />
                  <HeroMetric icon={Droplet} label="Gordura" value={Math.round(totals.fats)} target={targetFats} unit="g" divider />
                </View>

                <Pressable onPress={() => router.push('/dieta/montar')} className="w-full items-center rounded-full bg-white py-4">
                  <View className="flex-row items-center gap-3">
                    <AppText className="text-[16px] font-bold text-primary">Montar refeição</AppText>
                    <ArrowRight size={20} color="#FF4F93" />
                  </View>
                </Pressable>
              </View>
            </View>
          </ImageBackground>

          {nutritionAdvice ? (
            <View className="gap-2 rounded-3xl border border-border bg-white p-5 shadow-petal">
              <View className="flex-row items-center justify-between">
                <View className="rounded-full bg-primary/10 px-2.5 py-1">
                  <AppText className="text-[10px] font-bold uppercase tracking-[1.5px] text-primary">
                    Prioridade de hoje
                  </AppText>
                </View>
              </View>
              <AppText className="text-[14px] font-medium leading-snug">{nutritionAdvice}</AppText>
            </View>
          ) : null}
        </>
      )}

      {/* Weekly progress */}
      <View className="gap-4 rounded-[28px] border border-border bg-white p-5 shadow-petal">
        <View>
          <AppText className="font-display text-[17px] font-bold leading-tight">Seu progresso semanal</AppText>
          <AppText className="mt-1 text-[12.5px] text-ink-soft">Acompanhe suas refeições da semana.</AppText>
        </View>

        {!weekStats.hasAnyData ? (
          <View className="items-center gap-2 rounded-2xl bg-ink/5 py-6">
            <Apple size={24} color="rgba(255,79,147,0.35)" />
            <AppText className="text-center text-xs text-ink-soft">
              Registre sua primeira refeição para começar a acompanhar a semana.
            </AppText>
          </View>
        ) : (
          <>
            <View className="flex-row justify-between">
              {weekStats.days.map((d, i) => (
                <View key={d.key} className="items-center gap-1.5">
                  <AppText className="text-[12px] font-bold leading-none" style={{ color: d.isToday ? '#FF4F93' : '#111111' }}>
                    {WEEKDAYS[i]}
                  </AppText>
                  <AppText className="text-[11px] leading-none text-ink-soft">{d.dateLabel}</AppText>
                  <View
                    accessibilityLabel={statusLabel(d.status)}
                    className="mt-1 size-9 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: d.status === 'complete' ? '#FF4F93' : d.status === 'partial' ? 'rgba(255,79,147,0.12)' : '#F4F4F4',
                      borderWidth: d.isToday ? 2 : 0,
                      borderColor: '#FF4F93',
                    }}
                  >
                    {d.status === 'complete' ? <Check size={16} color="#FFFFFF" strokeWidth={3} /> : null}
                  </View>
                </View>
              ))}
            </View>

            <View className="flex-row items-center justify-center gap-4 border-t border-border pt-4">
              <Legend color="#FF4F93" label="Completo" />
              <Legend color="rgba(255,79,147,0.12)" label="Parcial" outline />
              <Legend color="#F4F4F4" label="Sem registro" />
            </View>
          </>
        )}
      </View>

      <Pressable onPress={() => router.push('/dieta/montar')} className="flex-row items-center justify-center gap-2 rounded-full bg-primary py-4">
        <Plus size={18} color="#FFFFFF" />
        <AppText className="text-sm font-bold uppercase tracking-widest text-white">Registrar</AppText>
      </Pressable>

      {/* Meals */}
      <View className="gap-3 pb-4 pt-2">
        <AppText className="font-display text-lg font-bold">Refeições</AppText>
        {todays.length === 0 ? (
          <View className="items-center rounded-3xl border border-dashed border-border bg-white px-6 py-12">
            <View className="mb-4 size-16 items-center justify-center rounded-full bg-primary/5">
              <Apple size={32} color="rgba(255,79,147,0.3)" />
            </View>
            <AppText className="font-display font-semibold">Nenhuma refeição registrada</AppText>
            <AppText className="mt-2 max-w-[220px] text-center text-xs text-ink-soft">
              Registre o que você comeu hoje para acompanhar seus resultados.
            </AppText>
          </View>
        ) : (
          todays.map((log) => <SavedMealCard key={log.id} log={log} onRemove={() => removeMeal(log.id)} />)
        )}
      </View>
    </ScrollView>
  );
}

function Legend({ color, label, outline }: { color: string; label: string; outline?: boolean }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        className="size-3 rounded-full"
        style={{ backgroundColor: color, borderWidth: outline ? 1 : 0, borderColor: '#FF4F93' }}
      />
      <AppText className="text-[11px] text-ink-soft">{label}</AppText>
    </View>
  );
}

function SavedMealCard({ log, onRemove }: { log: MealLog; onRemove: () => void }) {
  const router = useRouter();
  const typeLabel = log.mealType ? mealTypeLabel(log.mealType as MealType) : 'Refeição';
  const uniqueFoodIds = log.foodIds ? Array.from(new Set(log.foodIds)) : [];
  const foodCounts = (log.foodIds ?? []).reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});
  const foods =
    uniqueFoodIds.length > 0
      ? uniqueFoodIds
          .map((id) => {
            const f = FOOD_BY_ID[id];
            if (!f) return null;
            const n = foodCounts[id];
            return n > 1 ? `${f.name} ×${n}` : f.name;
          })
          .filter(Boolean)
          .join(', ')
      : log.name;

  return (
    <View className="rounded-2xl border border-border bg-white p-3">
      <View className="flex-row items-center justify-between">
        <AppText className="text-[10px] uppercase tracking-widest text-primary">{typeLabel}</AppText>
        <AppText className="text-[10px] text-ink-soft">{log.date}</AppText>
      </View>
      <AppText className="mt-0.5 text-sm font-medium">{foods}</AppText>
      {log.kcal || log.protein || log.carbs || log.fats ? (
        <AppText className="mt-1 text-[11px] text-ink-soft">
          {log.kcal ?? 0} kcal · {Math.round(log.protein ?? 0)}g prot · {Math.round(log.carbs ?? 0)}g carbo · {Math.round(log.fats ?? 0)}g gord
        </AppText>
      ) : null}
      <View className="mt-2 flex-row gap-2">
        <Pressable
          onPress={() => router.push({ pathname: '/dieta/editar/[logId]', params: { logId: log.id } })}
          className="rounded-full bg-ink px-3 py-1"
        >
          <AppText className="text-[11px] text-white">Editar</AppText>
        </Pressable>
        <Pressable onPress={onRemove} className="rounded-full bg-destructive/10 px-3 py-1">
          <AppText className="text-[11px] text-ink-soft">Excluir</AppText>
        </Pressable>
      </View>
    </View>
  );
}

function HeroMetric({
  icon: Icon,
  label,
  value,
  target,
  unit,
  divider,
}: {
  icon: ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: number;
  target: number;
  unit: string;
  divider?: boolean;
}) {
  return (
    <View className={`flex-1 px-1.5 ${divider ? 'border-l border-white/25' : ''}`}>
      <View className="flex-row items-center gap-1">
        <Icon size={11} color="rgba(255,255,255,0.85)" />
        <AppText className="text-[9px] text-white/85">{label}</AppText>
      </View>
      <AppText className="mt-1 font-display text-[14px] font-bold text-white">
        {value}
        <AppText className="text-[10px] font-semibold text-white/75">{unit}</AppText>
      </AppText>
      <AppText className="text-[9px] text-white/70">/{target}{unit}</AppText>
    </View>
  );
}
