import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import {
  ArrowRight,
  Sparkles,
  Droplets,
  Apple,
  Dumbbell,
  Heart,
  Camera,
  Smile,
  Activity,
  CheckCircle2,
  Circle,
  AlertCircle,
  TrendingUp,
  Flame,
  Bell,
  Timer,
  ChevronLeft,
} from 'lucide-react-native';
import { AppText } from '@/components/ui';
import { useGlowUpIntelligence } from '@/hooks/use-glowup-intelligence';
import { useStore, dateKey } from '@/lib/store';
import { usePersonalization } from '@/hooks/use-personalization';
import { getCachedData, setCachedData, CACHE_TTL } from '@/lib/session-cache';
import { subscribeGlobalSync } from '@/lib/sync';
import { getCycleAwareTrainingAdvice, getNutritionAdjustmentAdvice } from '@/lib/glowup-intelligence';
import { getDailyDerived } from '@/lib/daily-derived';
import { buildTodayIntelligenceContext, type TodayFocus } from '@/lib/today-intelligence-engine';
import { getSmartReminders, type SmartReminder } from '@/lib/notification-engine';

// Web routes ("/app/...") used by the ported intelligence layer translated to
// our Expo Router paths. Most map 1:1; "workouts" is our "treinos" tab.
const ROUTE_MAP: Record<string, string> = {
  '/app': '/(app)',
  '/app/hydration': '/(app)/hydration',
  '/app/checkin': '/(app)/checkin',
  '/app/workouts': '/(app)/treinos',
  '/app/diet': '/(app)/diet',
  '/app/fasting': '/(app)/fasting',
  '/app/cycle/checkin': '/(app)/cycle/checkin',
  '/app/cycle': '/(app)/cycle',
  '/app/progress': '/(app)/progress',
  '/app/missions': '/(app)/missions',
  '/app/notifications': '/(app)/notifications',
  '/app/pregnancy': '/(app)/pregnancy',
};
function toAppRoute(webPath: string): string {
  return ROUTE_MAP[webPath] ?? webPath.replace(/^\/app/, '/(app)');
}

type TaskKind = 'water' | 'meal' | 'workout' | 'checkin' | 'symptoms' | 'measure' | 'photo' | 'rest' | 'fasting';

interface DailyTask {
  id: string;
  kind: TaskKind;
  label: string;
  hint?: string;
  done: boolean;
  to: string;
  icon: ComponentType<{ size?: number; color?: string }>;
}

type IntelLike = ReturnType<typeof useGlowUpIntelligence>['context'];

function getRecommendedWorkoutType(intel: NonNullable<IntelLike>): string {
  if (intel.pregnancy.isPregnant) return 'Caminhada leve ou mobilidade';
  switch (intel.cycle.phase) {
    case 'menstrual':
      return 'Recuperação ativa';
    case 'follicular':
      return 'Treino de força — membros superiores';
    case 'ovulation':
      return 'Treino intenso — corpo inteiro';
    case 'luteal':
      return 'Treino moderado — membros inferiores';
    default:
      if (intel.goal === 'gain_muscle') return 'Treino de força com progressão';
      if (intel.goal === 'lose') return 'Cardio moderado + força';
      return 'Treino moderado';
  }
}

function getNutritionFocusTag(intel: NonNullable<IntelLike>): string {
  if (intel.pregnancy.isPregnant) return 'proteína + ferro';
  if (intel.cycle.phase === 'luteal') return 'controle de desejos';
  if (intel.cycle.phase === 'menstrual') return 'ferro + líquidos mornos';
  if (intel.hydration.band === 'none' || intel.hydration.band === 'low') return 'aumentar hidratação';
  switch (intel.goal) {
    case 'lose':
      return 'proteína + saciedade';
    case 'gain_muscle':
      return 'proteína + superávit';
    case 'energy':
      return 'carbo complexo + proteína';
    default:
      return 'consistência';
  }
}

const FOCUS_META: Record<TodayFocus, { label: string; emoji: string; colors: [string, string] }> = {
  recovery: { label: 'Recuperação', emoji: '🌙', colors: ['#7C3AED', '#A855F7'] },
  workout: { label: 'Treino', emoji: '💪', colors: ['#FF4F93', '#F43F5E'] },
  nutrition: { label: 'Nutrição', emoji: '🥗', colors: ['#10B981', '#14B8A6'] },
  hydration: { label: 'Hidratação', emoji: '💧', colors: ['#0EA5E9', '#06B6D4'] },
  cycle_care: { label: 'Ciclo', emoji: '🌸', colors: ['#EC4899', '#F43F5E'] },
  fasting: { label: 'Jejum', emoji: '⏱️', colors: ['#F59E0B', '#F97316'] },
  consistency: { label: 'Consistência', emoji: '✨', colors: ['#FF4F93', '#A855F7'] },
};

export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { context: intel, loaded } = useGlowUpIntelligence();
  const { profile: pProfile } = usePersonalization();
  const { state, waterToday } = useStore();

  const today = dateKey();
  const daily = getDailyDerived(state, pProfile, today);
  const goalMl = daily.hydration.goalMl;
  const checkedInToday = daily.checkin.complete;
  const mealsToday = daily.nutrition.mealCount;
  const workoutToday = daily.workout.complete;

  const progressWidth = useSharedValue(0);

  const tasks: DailyTask[] = useMemo(() => {
    if (!intel) return [];
    const t: DailyTask[] = [];

    t.push({
      id: 'water',
      kind: 'water',
      label: `Beber ${(goalMl / 1000).toFixed(1)}L de água`,
      hint: `${(waterToday / 1000).toFixed(2).replace('.', ',')}L registrados hoje`,
      done: waterToday >= goalMl,
      to: '/app/hydration',
      icon: Droplets,
    });

    t.push({
      id: 'checkin',
      kind: 'checkin',
      label: 'Fazer check-in de humor',
      hint: checkedInToday ? 'Registrado ✓' : '1 minuto para se conectar com você',
      done: checkedInToday,
      to: '/app/checkin',
      icon: Smile,
    });

    const restDay = intel.cycle.phase === 'menstrual';
    if (restDay) {
      t.push({
        id: 'rest',
        kind: 'rest',
        label: 'Mobilidade ou caminhada leve',
        hint: 'Sua fase pede pausa ativa',
        done: workoutToday,
        to: '/app/workouts',
        icon: Activity,
      });
    } else {
      t.push({
        id: 'workout',
        kind: 'workout',
        label: intel.pregnancy.isPregnant ? 'Movimento suave do dia' : 'Treino recomendado',
        hint: getRecommendedWorkoutType(intel),
        done: workoutToday,
        to: '/app/workouts',
        icon: Dumbbell,
      });
    }

    t.push({
      id: 'meal',
      kind: 'meal',
      label: 'Registrar pelo menos 1 refeição',
      hint: mealsToday > 0 ? `${mealsToday} registrada${mealsToday > 1 ? 's' : ''} hoje` : 'Comece pelo café ou almoço',
      done: mealsToday > 0,
      to: '/app/diet',
      icon: Apple,
    });

    const f = intel.fasting;
    const showFasting =
      !intel.pregnancy.isPregnant && (f.todayStartedAt || f.completedDaysLast30 > 0 || f.todayTargetMinutes != null);
    if (showFasting) {
      const goalH = f.todayTargetMinutes ? Math.round(f.todayTargetMinutes / 60) : 16;
      const fastingDone = f.todayStatus === 'completed' || f.currentProgressPercent >= 80;
      const label = fastingDone ? 'Jejum concluído' : f.todayStartedAt ? 'Manter meu jejum' : 'Iniciar meu jejum';
      const hint = fastingDone
        ? 'Meta atingida hoje — ótimo trabalho ✨'
        : f.todayStartedAt
          ? `${f.currentProgressPercent}% da meta de ${goalH}h`
          : `Meta de hoje: ${goalH}h`;
      t.push({ id: 'fasting', kind: 'fasting', label, hint, done: fastingDone, to: '/app/fasting', icon: Timer });
    }

    if (!intel.pregnancy.isPregnant && intel.cycle.phase) {
      t.push({
        id: 'symptoms',
        kind: 'symptoms',
        label: 'Anotar sintomas do ciclo',
        hint: 'Ajuda a prever sua próxima fase',
        done: intel.checkins.streak > 0 && intel.cycle.recentSymptoms.length > 0,
        to: '/app/cycle/checkin',
        icon: Heart,
      });
    }

    if (intel.recentMeasurementsCount === 0) {
      t.push({
        id: 'measure',
        kind: 'measure',
        label: 'Registrar peso/medidas iniciais',
        hint: 'Sua linha de base para acompanhar progresso',
        done: false,
        to: '/app/progress',
        icon: TrendingUp,
      });
    }

    if (intel.workouts.streak >= 7 || intel.checkins.streak >= 7) {
      t.push({
        id: 'photo',
        kind: 'photo',
        label: 'Adicionar foto de progresso',
        hint: 'Você está consistente — capriche no registro',
        done: false,
        to: '/app/progress',
        icon: Camera,
      });
    }

    return t;
  }, [intel, waterToday, goalMl, checkedInToday, mealsToday, workoutToday]);

  const completed = tasks.filter((t) => t.done).length;
  const pct = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);

  useEffect(() => {
    progressWidth.value = withTiming(pct, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [pct]);

  const progressBarStyle = useAnimatedStyle(() => ({ width: `${progressWidth.value}%` }));

  if (!loaded) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
      >
        <PulsingBlock height={176} />
        <PulsingBlock height={96} />
        <PulsingBlock height={128} />
        <PulsingBlock height={256} />
      </ScrollView>
    );
  }

  if (!intel) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 32, paddingHorizontal: 16 }]}>
        <AppText className="font-display text-2xl font-semibold">Meu Plano de Hoje</AppText>
        <AppText className="mt-2 text-ink-soft">Faça login para ver seu plano personalizado.</AppText>
      </View>
    );
  }

  const greet = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  })();

  const phaseLine = intel.pregnancy.isPregnant
    ? intel.pregnancy.week
      ? `Gestação · Semana ${intel.pregnancy.week}`
      : 'Gestação ativa'
    : intel.cycle.phase
      ? `Fase ${intel.cycle.phaseLabel} · Dia ${intel.cycle.cycleDay}`
      : 'Ciclo a configurar';

  const workoutType = getRecommendedWorkoutType(intel);
  const nutritionAdvice = getNutritionAdjustmentAdvice(intel);
  const cycleAdvice = getCycleAwareTrainingAdvice(intel);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
    >
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)'))} style={styles.backRow}>
        <ChevronLeft size={16} color="#8B7280" />
        <AppText style={styles.backLabel}>Voltar</AppText>
      </Pressable>

      {/* Hero */}
      <LinearGradient colors={['#DB2777', '#FF4F93']} style={styles.heroCard}>
        <View style={styles.heroBlob} />
        <View style={styles.rowCenter}>
          <Sparkles size={12} color="rgba(255,255,255,0.9)" />
          <AppText style={styles.heroLabel}>Meu Plano de Hoje</AppText>
        </View>
        <AppText style={styles.heroTitle}>
          {greet}
          {intel.firstName ? `, ${intel.firstName}` : ''}
        </AppText>
        <AppText style={styles.heroSubtitle}>
          {phaseLine} · Objetivo: {intel.goalLabel}
        </AppText>
        <AppText style={styles.heroRecommendation}>{intel.dailyRecommendation}</AppText>

        <View style={styles.heroProgressRow}>
          <View style={styles.heroProgressTrack}>
            <Animated.View style={[styles.heroProgressFill, progressBarStyle]} />
          </View>
          <AppText style={styles.heroProgressLabel}>
            {completed}/{tasks.length}
          </AppText>
        </View>
      </LinearGradient>

      {/* Main focus */}
      <MainFocusCard intel={intel} daily={daily} onPress={(to) => router.push(toAppRoute(to) as never)} />

      {/* Smart reminders */}
      <SmartRemindersStrip onPress={(to) => router.push(toAppRoute(to) as never)} />

      {/* Smart alert */}
      {intel.smartAlert ? (
        <View
          style={[
            styles.alertBox,
            intel.smartAlert.tone === 'warning'
              ? styles.alertWarning
              : intel.smartAlert.tone === 'success'
                ? styles.alertSuccess
                : styles.alertInfo,
          ]}
        >
          <AlertCircle
            size={20}
            color={
              intel.smartAlert.tone === 'warning'
                ? '#D97706'
                : intel.smartAlert.tone === 'success'
                  ? '#059669'
                  : '#FF4F93'
            }
          />
          <View style={{ flex: 1 }}>
            <AppText className="font-display text-[15px] font-semibold">{intel.smartAlert.title}</AppText>
            <AppText className="mt-1 text-[12.5px] text-ink-soft">{intel.smartAlert.body}</AppText>
          </View>
        </View>
      ) : null}

      {/* Priority do dia */}
      <AppText style={styles.sectionLabel}>
        <Sparkles size={13} color="#FF4F93" /> Prioridade de hoje
      </AppText>
      <Pressable
        onPress={() => router.push(toAppRoute(intel.nextBestAction.cta.to) as never)}
        style={styles.sectionCard}
      >
        <View style={styles.rowStart}>
          <AppText style={styles.bigEmoji}>{intel.nextBestAction.emoji ?? '✨'}</AppText>
          <View style={{ flex: 1 }}>
            <AppText className="font-display text-[19px] font-semibold leading-tight">
              {intel.nextBestAction.title}
            </AppText>
            <AppText className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
              {intel.nextBestAction.body}
            </AppText>
          </View>
        </View>
        <View style={styles.ctaPill}>
          <AppText style={styles.ctaPillText}>{intel.nextBestAction.cta.label}</AppText>
          <ArrowRight size={16} color="#FFFFFF" />
        </View>
      </Pressable>

      {/* Checklist */}
      <AppText style={styles.sectionLabel}>Checklist do dia</AppText>
      <View style={styles.checklistCard}>
        {tasks.map((task, index) => (
          <Pressable
            key={task.id}
            onPress={() => router.push(toAppRoute(task.to) as never)}
            style={[
              styles.taskItem,
              index === 0 && { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
              index === tasks.length - 1
                ? { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }
                : styles.taskItemDivider,
            ]}
          >
            <View style={[styles.taskIcon, task.done ? styles.taskIconDone : styles.taskIconPending]}>
              <task.icon size={18} color={task.done ? '#059669' : '#FF4F93'} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText
                className="font-display text-[14.5px] font-semibold leading-tight"
                style={task.done ? { color: '#8B7280', textDecorationLine: 'line-through' } : undefined}
                numberOfLines={1}
              >
                {task.label}
              </AppText>
              {task.hint ? (
                <AppText className="mt-0.5 text-[12px] text-ink-soft" numberOfLines={1}>
                  {task.hint}
                </AppText>
              ) : null}
            </View>
            {task.done ? <CheckCircle2 size={20} color="#059669" /> : <Circle size={20} color="rgba(139,114,128,0.4)" />}
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => router.push(toAppRoute('/app/missions') as never)} style={styles.missionsCta}>
        <Sparkles size={16} color="#FFFFFF" />
        <AppText style={styles.missionsCtaText}>Ver missões e ganhar XP</AppText>
        <ArrowRight size={16} color="#FFFFFF" />
      </Pressable>

      {/* Treino sugerido */}
      <View style={styles.sectionCard}>
        <AppText style={styles.sectionLabelInline}>
          <Dumbbell size={12} color="#FF4F93" /> Treino sugerido
        </AppText>
        <AppText className="mt-2 font-display text-[18px] font-semibold leading-tight">{workoutType}</AppText>
        <AppText className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{cycleAdvice}</AppText>
        <Pressable onPress={() => router.push(toAppRoute('/app/workouts') as never)} style={styles.outlinePill}>
          <AppText style={styles.outlinePillText}>Ver biblioteca</AppText>
          <ArrowRight size={16} color="#FF4F93" />
        </Pressable>
      </View>

      {/* Nutrição do dia */}
      <View style={styles.sectionCard}>
        <AppText style={styles.sectionLabelInline}>
          <Apple size={12} color="#FF4F93" /> Nutrição do dia
        </AppText>
        <AppText className="mt-2 font-display text-[18px] font-semibold leading-tight">
          Foco: {getNutritionFocusTag(intel)}
        </AppText>
        <AppText className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{nutritionAdvice}</AppText>
        <Pressable onPress={() => router.push(toAppRoute('/app/diet') as never)} style={styles.gradientPillWrap}>
          <LinearGradient colors={['#DB2777', '#FF4F93']} style={styles.gradientPill}>
            <AppText style={styles.ctaPillText}>Montar refeição</AppText>
            <ArrowRight size={16} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Cuidado hormonal/gestacional */}
      {intel.pregnancy.isPregnant || intel.cycle.phase ? (
        <View style={styles.sectionCard}>
          <AppText style={styles.sectionLabelInline}>
            <Heart size={12} color="#FF4F93" /> {intel.pregnancy.isPregnant ? 'Cuidado gestacional' : 'Cuidado hormonal'}
          </AppText>
          {intel.pregnancy.isPregnant ? (
            <>
              <AppText className="mt-2 font-display text-[18px] font-semibold leading-tight">
                {intel.pregnancy.week ? `Semana ${intel.pregnancy.week}` : 'Sua gestação'}
              </AppText>
              <AppText className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                Priorize repouso quando o corpo pedir, mantenha hidratação e refeições leves. Lembre-se: este plano
                não substitui acompanhamento médico — mantenha o pré-natal em dia.
              </AppText>
              <Pressable onPress={() => router.push(toAppRoute('/app/pregnancy') as never)} style={styles.linkRow}>
                <AppText style={styles.linkText}>Abrir gestação</AppText>
                <ArrowRight size={14} color="#FF4F93" />
              </Pressable>
            </>
          ) : (
            <>
              <AppText className="mt-2 font-display text-[18px] font-semibold leading-tight">
                Fase {intel.cycle.phaseLabel}
              </AppText>
              <AppText className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{cycleAdvice}</AppText>
              {intel.cycle.recentSymptoms.length > 0 ? (
                <View style={styles.chipsRow}>
                  {intel.cycle.recentSymptoms.map((s) => (
                    <View key={s} style={styles.chip}>
                      <AppText style={styles.chipText}>{s}</AppText>
                    </View>
                  ))}
                </View>
              ) : null}
              <Pressable onPress={() => router.push(toAppRoute('/app/cycle') as never)} style={styles.linkRow}>
                <AppText style={styles.linkText}>Abrir meu ciclo</AppText>
                <ArrowRight size={14} color="#FF4F93" />
              </Pressable>
            </>
          )}
        </View>
      ) : null}

      {/* Evolução */}
      <View style={styles.sectionCard}>
        <AppText style={styles.sectionLabelInline}>
          <TrendingUp size={12} color="#FF4F93" /> Sua evolução
        </AppText>
        <View style={styles.statsGrid}>
          <SummaryStat
            icon={<Flame size={16} color="#FF4F93" />}
            label="Sequência"
            value={`${Math.max(intel.checkins.streak, intel.workouts.streak)}d`}
          />
          <SummaryStat
            icon={<Sparkles size={16} color="#FF4F93" />}
            label="Nível"
            value={`${intel.level.level}`}
            sub={intel.level.name}
          />
          <SummaryStat icon={<TrendingUp size={16} color="#FF4F93" />} label="XP 30d" value={`${intel.totalXp}`} />
        </View>
        {intel.weightTrend.currentKg != null ? (
          <AppText className="mt-4 text-[13px] text-ink-soft">
            Peso atual: <AppText className="font-semibold text-ink">{intel.weightTrend.currentKg.toFixed(1)} kg</AppText>
            {intel.weightTrend.deltaKg != null &&
            intel.weightTrend.direction !== 'flat' &&
            intel.weightTrend.direction !== 'unknown'
              ? ` (${intel.weightTrend.deltaKg > 0 ? '+' : ''}${intel.weightTrend.deltaKg.toFixed(1)} kg)`
              : ''}
          </AppText>
        ) : null}
        <Pressable onPress={() => router.push(toAppRoute('/app/progress') as never)} style={styles.linkRow}>
          <AppText style={styles.linkText}>Abrir Minha Evolução</AppText>
          <ArrowRight size={14} color="#FF4F93" />
        </Pressable>
      </View>
    </ScrollView>
  );
}

function MainFocusCard({
  intel,
  daily,
  onPress,
}: {
  intel: NonNullable<IntelLike>;
  daily: ReturnType<typeof getDailyDerived>;
  onPress: (to: string) => void;
}) {
  const ctx = useMemo(
    () =>
      buildTodayIntelligenceContext({
        cycle: {
          phase: intel.cycle.phase ?? null,
          symptomCount: intel.cycle.recentSymptoms.length,
          severeSymptoms: intel.cycle.recentSymptoms.length >= 3,
        },
        workout: {
          isRestDay: intel.cycle.phase === 'menstrual',
          completedToday: daily.workout.complete,
          readinessScore: null,
          recoveryScore: null,
        },
        nutrition: {
          mealsToday: daily.nutrition.mealCount,
          targetMeals: 4,
          cravingScore: intel.cycle.phase === 'luteal' ? 60 : 20,
          hungerScore: 30,
        },
        hydration: {
          currentMl: daily.hydration.currentMl,
          goalMl: daily.hydration.goalMl,
          hour: new Date().getHours(),
        },
        fasting: {
          active: !!intel.fasting.todayStartedAt && intel.fasting.todayStatus !== 'completed',
          progressPct: intel.fasting.currentProgressPercent,
          completed: intel.fasting.todayStatus === 'completed',
        },
        missions: undefined,
        checkins: { doneToday: daily.checkin.complete, sleepHours: null },
        pregnancy: { isPregnant: intel.pregnancy.isPregnant },
      }),
    [intel, daily],
  );
  const meta = FOCUS_META[ctx.mainFocus];
  return (
    <Pressable onPress={() => onPress(ctx.recommendation.action.to)}>
      <LinearGradient colors={meta.colors} style={styles.focusCard}>
        <AppText style={styles.focusLabel}>Foco principal de hoje</AppText>
        <View style={styles.rowStart}>
          <AppText style={styles.bigEmoji}>{meta.emoji}</AppText>
          <View style={{ flex: 1 }}>
            <AppText style={styles.focusTitle}>{ctx.recommendation.title}</AppText>
            <AppText style={styles.focusCopy}>{ctx.recommendation.supportiveCopy}</AppText>
          </View>
        </View>
        <View style={styles.chipsRow}>
          {ctx.recommendation.reasoning.slice(0, 3).map((r) => (
            <View key={r} style={styles.focusChip}>
              <AppText style={styles.focusChipText}>{r}</AppText>
            </View>
          ))}
        </View>
        <View style={styles.focusActionPill}>
          <AppText style={styles.focusActionText}>{ctx.recommendation.action.label}</AppText>
          <ArrowRight size={16} color="#2A1B2E" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function SummaryStat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <View style={styles.statBox}>
      <View style={styles.rowCenter}>
        {icon}
        <AppText style={styles.statLabel}>{label}</AppText>
      </View>
      <AppText className="mt-2 font-display text-[18px] font-semibold leading-none">{value}</AppText>
      {sub ? (
        <AppText className="mt-1 text-[10px] text-ink-soft" numberOfLines={1}>
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}

const SMART_REMINDERS_KEY = 'today:smart-reminders';

function SmartRemindersStrip({ onPress }: { onPress: (to: string) => void }) {
  const [items, setItems] = useState<SmartReminder[]>(() => getCachedData<SmartReminder[]>(SMART_REMINDERS_KEY) ?? []);

  const loadReminders = useCallback(() => {
    void getSmartReminders().then((r) => {
      const next = r.reminders.slice(0, 3);
      setCachedData(SMART_REMINDERS_KEY, next, CACHE_TTL.today);
      setItems(next);
    });
  }, []);

  useEffect(() => {
    let alive = true;
    void getSmartReminders().then((r) => {
      if (!alive) return;
      const next = r.reminders.slice(0, 3);
      setCachedData(SMART_REMINDERS_KEY, next, CACHE_TTL.today);
      setItems(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(
    () =>
      subscribeGlobalSync((detail) => {
        if (
          detail.domains.some((d) =>
            ['smartReminders', 'alerts', 'todayPlan', 'hydration', 'workouts', 'nutrition', 'fasting', 'cycle', 'checkins', 'missions'].includes(
              d,
            ),
          )
        ) {
          loadReminders();
        }
      }),
    [loadReminders],
  );

  if (items.length === 0) return null;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.remindersHeader}>
        <AppText style={styles.sectionLabelInline}>
          <Bell size={12} color="#FF4F93" /> Lembretes para hoje
        </AppText>
        <Pressable onPress={() => onPress('/app/notifications')} style={styles.rowCenter}>
          <AppText style={styles.linkTextSmall}>Ver todos</AppText>
          <ArrowRight size={12} color="#FF4F93" />
        </Pressable>
      </View>
      {items.map((r, index) => (
        <View key={r.reminder_key} style={[styles.reminderRow, index > 0 && styles.reminderRowDivider]}>
          <View
            style={[
              styles.reminderDot,
              { backgroundColor: r.priority === 'high' ? '#F43F5E' : r.priority === 'normal' ? '#FF4F93' : 'rgba(42,27,46,0.3)' },
            ]}
          />
          <View style={{ flex: 1 }}>
            <AppText className="text-[13px] text-ink" numberOfLines={1}>
              {r.title}
            </AppText>
            {r.cta_to ? (
              <Pressable onPress={() => onPress(r.cta_to!)}>
                <AppText style={styles.linkTextSmall}>{r.cta_label ?? 'Abrir'} →</AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function PulsingBlock({ height }: { height: number }) {
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 700 });
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ height, borderRadius: 24, backgroundColor: 'rgba(42,27,46,0.05)', marginBottom: 16 }, style]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backLabel: { fontSize: 13, fontWeight: '500', color: '#8B7280' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowStart: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bigEmoji: { fontSize: 30, lineHeight: 32 },
  heroCard: { borderRadius: 32, padding: 24, overflow: 'hidden', marginBottom: 20 },
  heroBlob: {
    position: 'absolute',
    right: -64,
    top: -64,
    width: 224,
    height: 224,
    borderRadius: 112,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' },
  heroTitle: { fontFamily: 'System', fontSize: 26, lineHeight: 30, fontWeight: '600', color: '#FFFFFF', marginTop: 8 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  heroRecommendation: { fontSize: 14, color: 'rgba(255,255,255,0.95)', marginTop: 16, lineHeight: 20 },
  heroProgressRow: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroProgressTrack: { flex: 1, height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  heroProgressFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 999 },
  heroProgressLabel: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  focusCard: { borderRadius: 28, padding: 20, marginBottom: 20 },
  focusLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' },
  focusTitle: { fontSize: 20, fontWeight: '600', color: '#FFFFFF', lineHeight: 24 },
  focusCopy: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 6, lineHeight: 18 },
  chipsRow: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  focusChip: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  focusChipText: { fontSize: 10, fontWeight: '600', color: '#FFFFFF' },
  focusActionPill: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  focusActionText: { fontSize: 13, fontWeight: '700', color: '#2A1B2E' },
  alertBox: { borderRadius: 24, borderWidth: 1, padding: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  alertWarning: { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' },
  alertSuccess: { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
  alertInfo: { backgroundColor: 'rgba(255,79,147,0.05)', borderColor: 'rgba(255,79,147,0.15)' },
  sectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 2, color: '#FF4F93', textTransform: 'uppercase', marginBottom: 8 },
  sectionLabelInline: { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: '#FF4F93', textTransform: 'uppercase' },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  ctaPill: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#FF4F93',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaPillText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  checklistCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 12,
  },
  taskItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  taskItemDivider: { borderBottomWidth: 1, borderBottomColor: '#EAEAEA' },
  taskIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  taskIconDone: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#D1FAE5' },
  taskIconPending: { backgroundColor: 'rgba(255,79,147,0.1)', borderWidth: 1, borderColor: 'rgba(255,79,147,0.15)' },
  missionsCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF4F93',
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  missionsCtaText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  outlinePill: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,79,147,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,79,147,0.15)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  outlinePillText: { fontSize: 13, fontWeight: '700', color: '#FF4F93' },
  gradientPillWrap: { marginTop: 16, alignSelf: 'flex-start' },
  gradientPill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  linkRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  linkText: { fontSize: 13, fontWeight: '700', color: '#FF4F93' },
  linkTextSmall: { fontSize: 11, fontWeight: '600', color: '#FF4F93' },
  chip: { backgroundColor: 'rgba(255,79,147,0.1)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontSize: 11, color: '#FF4F93' },
  statsGrid: { marginTop: 12, flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,79,147,0.05)', borderWidth: 1, borderColor: 'rgba(255,79,147,0.1)', borderRadius: 16, padding: 12, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(42,27,46,0.6)', textTransform: 'uppercase' },
  remindersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  reminderRowDivider: { borderTopWidth: 1, borderTopColor: '#EAEAEA' },
  reminderDot: { width: 8, height: 8, borderRadius: 4 },
});
