import { useMemo, type ComponentType } from 'react';
import { ImageBackground, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Moon,
  Plus,
  TrendingUp,
} from 'lucide-react-native';
import { AppText } from '@/components/ui';
import { useStore } from '@/lib/store';
import { todayDayId, estimateDayDurationMin, estimateDayKcal } from '@/lib/workouts-v2';
import { todayKeyBR } from '@/lib/daily-derived';
import { useBannerImages } from '@/hooks/use-banner-images';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function TreinosDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const banners = useBannerImages();
  // Some banner_images rows point to relative Lovable asset paths
  // (e.g. "/__l5e/assets-v1/...") that only resolve on the web build — on a
  // phone there's no host to resolve against, so the image silently fails
  // and we're left with just the dark fallback. Only trust absolute URLs.
  const heroImage = banners.workout && /^https?:\/\//.test(banners.workout) ? banners.workout : null;

  const plan = state.userPlan;
  const sessions = state.workoutSessionsV2;

  const weekStats = useMemo(() => {
    const now = new Date();
    const dayIdx = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayIdx);
    monday.setHours(0, 0, 0, 0);

    const weekSessions = sessions.filter((s) => s.startedAt >= monday.getTime() && s.endedAt);
    const plannedSet = new Set(plan?.weekdays ?? []);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);

      const done = weekSessions.some((s) => s.startedAt >= d.getTime() && s.startedAt < next.getTime());
      const current = i === dayIdx;
      const planned = plan ? (plan.weekdays ? plannedSet.has(i) : true) : false;

      return { done, current, planned, dateLabel: `${d.getDate()}/${d.getMonth() + 1}` };
    });

    const plannedCount = days.filter((d) => d.planned).length;
    const doneCount = days.filter((d) => d.planned && d.done).length;
    return { days, doneCount, plannedCount };
  }, [sessions, plan]);

  const tId = todayDayId(plan);
  const todayDay = plan?.days.find((d) => d.id === tId) ?? null;

  const todayStats = useMemo(() => {
    const today = todayKeyBR();
    const todaySessions = sessions.filter((s) => !!s.endedAt && todayKeyBR(new Date(s.endedAt)) === today);
    const minutes = todaySessions.reduce((acc, s) => acc + (s.durationMin || 0), 0);
    const kcal = todaySessions.reduce((acc, s) => acc + (s.kcal || 0), 0);
    return { minutes, kcal, count: todaySessions.length };
  }, [sessions]);

  const hasTodayActivity = todayStats.count > 0;
  const heroDuration = hasTodayActivity ? todayStats.minutes : todayDay ? estimateDayDurationMin(todayDay) : null;
  const heroKcal = hasTodayActivity ? todayStats.kcal : todayDay ? estimateDayKcal(todayDay) : null;

  const goHeroCta = () => {
    if (todayDay && todayDay.exercises.length > 0) {
      router.push({ pathname: '/treino/sessao/[dayId]', params: { dayId: todayDay.id } });
    } else if (plan) {
      router.push('/treino/meu-plano');
    } else {
      router.push('/treino/plano-novo');
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 128, gap: 32 }}
    >
      {/* Hero */}
      <ImageBackground
        source={heroImage ? { uri: heroImage } : require('../../assets/home/workout-bg.jpg')}
        style={{ borderRadius: 32, overflow: 'hidden', minHeight: 320, backgroundColor: '#111111' }}
        imageStyle={{ resizeMode: 'cover' }}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']}
          locations={[0, 0.45, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
          <View
            className="flex-row items-center gap-2 self-start rounded-full px-4 py-2"
            style={{ backgroundColor: '#FF4F93' }}
          >
            <Dumbbell size={14} color="#FFFFFF" strokeWidth={3} />
            <AppText className="text-[11px] font-extrabold tracking-[2px] text-white">TREINO</AppText>
          </View>

          <View style={{ gap: 16 }}>
            <AppText className="font-display text-[32px] font-bold leading-[1.05] text-white">
              Seu treino,{'\n'}seus{'\n'}resultados.
            </AppText>

            {plan ? (
              <View className="flex-row gap-1">
                <HeroMetric icon={Clock} label={hasTodayActivity ? 'Hoje' : 'Duração'} value={`${heroDuration ?? 0}m`} />
                <HeroMetric
                  icon={Flame}
                  label={hasTodayActivity ? 'Queimadas' : 'Estimativa'}
                  value={`${heroKcal ?? 0}`}
                  unit="kcal"
                  divider
                />
                <HeroMetric
                  icon={CheckCircle2}
                  label="Esta semana"
                  value={`${weekStats.doneCount}/${weekStats.plannedCount}`}
                  divider
                />
              </View>
            ) : (
              <View>
                <AppText className="font-display text-[18px] font-bold text-white">Crie seu plano de treino</AppText>
                <AppText className="mt-1 text-[12.5px] leading-snug text-white/80">
                  Monte um plano personalizado para sua rotina e objetivo.
                </AppText>
              </View>
            )}

            <Pressable onPress={goHeroCta} className="w-full items-center rounded-full bg-white py-4">
              <View className="flex-row items-center gap-3">
                <AppText className="text-[16px] font-bold text-primary">
                  {plan ? 'Iniciar treino' : 'Criar meu plano'}
                </AppText>
                <ArrowRight size={20} color="#FF4F93" />
              </View>
            </Pressable>
          </View>
        </View>
      </ImageBackground>

      {/* Progresso semanal */}
      <View className="rounded-[28px] border border-border bg-white p-6 shadow-petal">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <TrendingUp size={18} color="#FF4F93" strokeWidth={2.5} />
              <AppText className="font-display text-[19px] font-bold leading-tight">Seu progresso semanal</AppText>
            </View>
            <AppText className="mt-1.5 text-[13px] leading-snug text-ink-soft">
              Acompanhe sua consistência durante a semana.
            </AppText>
          </View>
          <Pressable
            onPress={() => router.push('/treino/historico' as never)}
            className="flex-row items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-2"
          >
            <CalendarDays size={14} color="#FF4F93" />
            <AppText className="text-[12px] font-bold text-primary">Calendário</AppText>
          </Pressable>
        </View>

        <View className="mt-6 flex-row items-start justify-between gap-1">
          {weekStats.days.map((d, i) => {
            const isRest = !d.planned;
            const done = d.planned && d.done;
            return (
              <View key={i} className="flex-1 items-center gap-2">
                <AppText
                  className="text-[12px] font-bold leading-none"
                  style={{ color: d.current ? '#FF4F93' : isRest ? '#999999' : '#111111' }}
                >
                  {WEEKDAYS[i]}
                </AppText>
                <AppText className="text-[11px] leading-none text-ink-soft">{d.dateLabel}</AppText>
                <View
                  className="mt-1 size-9 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: done ? '#FF4F93' : isRest ? '#F4F4F4' : '#FFFFFF',
                    borderWidth: done || isRest ? 0 : 1,
                    borderColor: '#EAEAEA',
                  }}
                >
                  {done ? <Check size={16} color="#FFFFFF" strokeWidth={3} /> : isRest ? <Moon size={14} color="#999999" /> : null}
                </View>
                {isRest ? <AppText className="text-[10px] leading-none text-ink-soft">Descanso</AppText> : null}
              </View>
            );
          })}
        </View>

        <View className="mt-6 flex-row items-center justify-between gap-3 border-t border-border pt-5">
          <View className="flex-row items-center gap-1.5">
            <TrendingUp size={16} color="#FF4F93" />
            <AppText className="text-[13px] font-bold text-primary">
              {weekStats.plannedCount > 0 ? `${weekStats.doneCount} de ${weekStats.plannedCount}` : 'Sem plano'}
            </AppText>
            <AppText className="text-[13px] text-ink-soft">
              {weekStats.plannedCount > 0 ? 'treinos concluídos' : 'crie seu plano'}
            </AppText>
          </View>
        </View>
      </View>

      {/* Quick access */}
      <View className="flex-row gap-4">
        {plan ? (
          <QuickCard
            onPress={() => router.push('/treino/meu-plano')}
            icon={Dumbbell}
            title="Meu plano"
            subtitle="Veja seu plano atual"
          />
        ) : (
          <QuickCard
            onPress={() => router.push('/treino/plano-novo')}
            icon={Plus}
            title="Criar meu plano"
            subtitle="Monte seu treino"
          />
        )}
        <QuickCard
          onPress={() => router.push('/treino/biblioteca' as never)}
          icon={BookOpen}
          title="Biblioteca"
          subtitle="Exercícios com GIFs"
        />
      </View>
    </ScrollView>
  );
}

function HeroMetric({
  icon: Icon,
  label,
  value,
  unit,
  divider,
}: {
  icon: ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
  unit?: string;
  divider?: boolean;
}) {
  return (
    <View className={`flex-1 px-2 ${divider ? 'border-l border-white/25' : ''}`}>
      <View className="flex-row items-center gap-1">
        <Icon size={12} color="rgba(255,255,255,0.85)" />
        <AppText className="text-[10px] text-white/85">{label}</AppText>
      </View>
      <AppText className="mt-1 font-display text-[16px] font-bold text-white">
        {value}
        {unit ? <AppText className="text-[11px] font-semibold text-white/80"> {unit}</AppText> : null}
      </AppText>
    </View>
  );
}

function QuickCard({
  onPress,
  icon: Icon,
  title,
  subtitle,
}: {
  onPress: () => void;
  icon: ComponentType<{ size?: number; color?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <Pressable onPress={onPress} className="flex-1 gap-3 rounded-[28px] border border-border bg-white p-5">
      <View className="size-11 items-center justify-center rounded-2xl bg-primary/10">
        <Icon size={22} color="#FF4F93" />
      </View>
      <View>
        <AppText className="font-display text-[16px] font-bold leading-tight">{title}</AppText>
        <AppText className="mt-0.5 text-[12px] text-ink-soft">{subtitle}</AppText>
      </View>
      <View className="flex-row justify-end">
        <View className="size-7 items-center justify-center rounded-full bg-ink/5">
          <ChevronRight size={14} color="rgba(42,27,46,0.3)" />
        </View>
      </View>
    </Pressable>
  );
}
