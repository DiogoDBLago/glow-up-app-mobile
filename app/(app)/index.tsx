import { useMemo } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Circle } from 'react-native-svg';
import {
  Droplets,
  Dumbbell,
  Apple,
  ArrowRight,
  Sparkles,
  Timer,
  Bell,
  Menu,
  Clock,
  Flame,
  CheckCircle2,
  Play,
  Square,
} from 'lucide-react-native';
import { AppText } from '@/components/ui';
import { PersonalizedBanner } from '@/components/PersonalizedBanner';
import { TodayPlanLinkCard } from '@/components/TodayPlanLinkCard';
import { useStore, dateKey } from '@/lib/store';
import { usePersonalization } from '@/hooks/use-personalization';
import { useGlowUpIntelligence } from '@/hooks/use-glowup-intelligence';
import { useFastingTimer } from '@/hooks/useFastingTimer';
import { useHydrationActions } from '@/hooks/useHydrationActions';
import { getDailyDerived } from '@/lib/daily-derived';
import { getNutritionAdjustmentAdvice } from '@/lib/glowup-intelligence';
import { useDrawer } from '@/contexts/DrawerContext';

const WEEKDAY_SHORT = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']; // Mon..Sun

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openDrawer } = useDrawer();
  const { state, waterToday } = useStore();
  const { profile: pProfile } = usePersonalization();
  const { context: intel } = useGlowUpIntelligence();
  const fasting = useFastingTimer();
  const { addWater } = useHydrationActions();

  const profile = state.profile;
  const firstName = profile?.name?.split(' ')[0] ?? 'Você';
  const initial = firstName.charAt(0).toUpperCase();
  const today = dateKey();
  const daily = getDailyDerived(state, pProfile, today);
  const goalMl = daily.hydration.goalMl;
  const pct = daily.hydration.progressPct;

  const totals = daily.nutrition.totals;
  const targetKcal = daily.nutrition.targets.kcal;
  const targetProtein = daily.nutrition.targets.protein;
  const targetCarbs = daily.nutrition.targets.carbs;
  const targetFats = daily.nutrition.targets.fats;

  // Workout plan (Fase 4 builds the real plan + adaptive engine; for now this
  // is always the empty state, matching a fresh account).
  const workoutPlan = state.userPlan;
  const hasWorkoutPlan = !!(workoutPlan && workoutPlan.days.length > 0);

  const nutritionAdvice = intel ? getNutritionAdjustmentAdvice(intel) : null;

  // Weekly progress — Mon..Sun (idx 0..6)
  const dayIdx = (new Date().getDay() + 6) % 7;
  const planWeekdays: number[] =
    workoutPlan?.weekdays && workoutPlan.weekdays.length > 0
      ? workoutPlan.weekdays
      : workoutPlan?.daysPerWeek
        ? Array.from({ length: workoutPlan.daysPerWeek }, (_, i) => i)
        : [];
  const trainingDaysGoal = planWeekdays.length;
  const monday = useMemo(() => {
    const n = new Date();
    n.setDate(n.getDate() - dayIdx);
    n.setHours(0, 0, 0, 0);
    return n;
  }, [dayIdx]);
  const completedIdx = useMemo(() => {
    const set = new Set<number>();
    for (const s of state.workoutSessionsV2) {
      if (s.startedAt >= monday.getTime() && s.endedAt) {
        set.add((new Date(s.startedAt).getDay() + 6) % 7);
      }
    }
    return set;
  }, [state.workoutSessionsV2, monday]);
  const trainingDoneCount = planWeekdays.filter((i) => completedIdx.has(i)).length;

  const fastingActive = fasting.active;
  const fastingC = 2 * Math.PI * 30;
  const fastingDash = `${(fasting.progressPct / 100) * fastingC} ${fastingC}`;

  const litersNow = waterToday / 1000;
  const litersGoal = goalMl / 1000;
  const remainingL = Math.max(0, (goalMl - waterToday) / 1000);
  const pctRounded = Math.round(pct);

  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';

  const focoRecommendation =
    intel?.dailyRecommendation ||
    `${firstName}, hoje é um bom dia para escutar o seu corpo, manter pequenas escolhas saudáveis e seguir no seu ritmo.`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 128, gap: 20 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={openDrawer} style={styles.iconButton} accessibilityLabel="Abrir menu">
            <Menu size={18} color="#2A1B2E" strokeWidth={1.8} />
          </Pressable>
          <View>
            <View style={styles.rowCenter}>
              <Sparkles size={13} color="#FF4F93" />
              <AppText style={styles.headerLabel}>Hoje</AppText>
            </View>
            <AppText style={styles.greeting}>
              {greet}, {firstName}
            </AppText>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.push('/(app)/notifications' as never)} style={styles.iconButton}>
            <Bell size={18} color="#2A1B2E" strokeWidth={1.8} />
            <View style={styles.notifDot} />
          </Pressable>
          <Pressable onPress={() => router.push('/(app)/profile' as never)} style={styles.iconButton}>
            <AppText style={styles.avatarInitial}>{initial}</AppText>
          </Pressable>
        </View>
      </View>

      <PersonalizedBanner area="home" />

      {/* Jejum intermitente */}
      <View style={styles.sectionCard}>
        <View style={styles.fastingRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.rowCenter}>
              <Timer size={12} color="#FF4F93" />
              <AppText style={styles.sectionLabelInline}>Jejum intermitente</AppText>
            </View>
            <AppText style={styles.fastingTimer}>{fastingActive ? fasting.formatted : '00:00:00'}</AppText>
            <AppText style={styles.fastingStatus}>
              {fastingActive ? 'Em andamento' : 'Pausado'} · Meta {fasting.goalHours}h
            </AppText>
          </View>
          <View style={styles.fastingRing}>
            <Svg width={76} height={76} viewBox="0 0 72 72" style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={36} cy={36} r={30} stroke="rgba(236,72,153,0.12)" strokeWidth={5} fill="none" />
              <Circle
                cx={36}
                cy={36}
                r={30}
                stroke="#FF4F93"
                strokeWidth={5}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={fastingDash}
              />
            </Svg>
            <View style={styles.fastingRingIcon}>
              <Flame size={20} color="#FF4F93" />
            </View>
          </View>
        </View>
        <View style={styles.fastingButtonRow}>
          <Pressable
            onPress={fasting.toggle}
            disabled={fasting.busy}
            style={[styles.fastingMainBtn, fastingActive ? styles.fastingMainBtnActive : styles.fastingMainBtnIdle]}
          >
            {fastingActive ? <Square size={16} color="#FF4F93" /> : <Play size={16} color="#FFFFFF" />}
            <AppText style={fastingActive ? styles.fastingMainBtnTextActive : styles.fastingMainBtnText}>
              {fastingActive ? 'Encerrar jejum' : 'Iniciar meu jejum'}
            </AppText>
          </Pressable>
          <Pressable onPress={() => router.push('/(app)/fasting' as never)} style={styles.fastingDetailsBtn}>
            <AppText style={styles.fastingDetailsBtnText}>Detalhes</AppText>
          </Pressable>
        </View>
      </View>

      {/* Seu foco de hoje */}
      <LinearGradient colors={['#DB2777', '#FF4F93']} style={styles.focusCard}>
        <View style={styles.rowCenter}>
          <Sparkles size={12} color="rgba(255,255,255,0.9)" />
          <AppText style={styles.focusLabel}>Seu foco de hoje</AppText>
        </View>
        <AppText style={styles.focusCopy}>{focoRecommendation}</AppText>
      </LinearGradient>

      {/* Treino do dia */}
      <ImageBackground
        source={require('../../assets/home/workout-bg.jpg')}
        style={styles.bannerCard}
        imageStyle={styles.bannerImage}
      >
        <LinearGradient colors={['transparent', 'rgba(255,255,255,0.85)', '#FFFFFF']} style={styles.bannerWash} />
        <View style={styles.bannerContent}>
          <View style={styles.badge}>
            <Dumbbell size={12} color="#FF4F93" />
            <AppText style={styles.badgeText}>Treino</AppText>
          </View>
          <View style={styles.bannerBottom}>
            <AppText style={styles.bannerTitle}>Pronta para treinar?</AppText>
            <AppText style={styles.bannerSubtitle}>Mantenha sua consistência e alcance seus objetivos.</AppText>

            {!hasWorkoutPlan ? (
              <View style={styles.whiteBox}>
                <AppText className="font-display text-[18px] font-bold">Crie seu plano de treino</AppText>
                <AppText className="mt-1 text-[12.5px] leading-snug text-ink-soft">
                  Monte um plano personalizado para sua rotina e objetivo.
                </AppText>
              </View>
            ) : null}

            <Pressable onPress={() => router.push('/(app)/treinos' as never)} style={styles.bannerCta}>
              <AppText style={styles.bannerCtaText}>Criar meu plano</AppText>
              <ArrowRight size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </ImageBackground>

      {/* Nutrição */}
      <ImageBackground
        source={require('../../assets/home/nutrition-bg.jpg')}
        style={styles.bannerCardShort}
        imageStyle={styles.bannerImage}
      >
        <LinearGradient colors={['transparent', 'rgba(255,255,255,0.85)', '#FFFFFF']} style={styles.bannerWash} />
        <View style={styles.bannerContent}>
          <View style={styles.badge}>
            <Apple size={12} color="#FF4F93" />
            <AppText style={styles.badgeText}>Nutrição</AppText>
          </View>
          <View style={styles.bannerBottom}>
            <AppText style={styles.bannerTitle}>Sua próxima refeição</AppText>
            <AppText style={styles.bannerSubtitle}>
              <AppText className="font-bold text-ink">{Math.round(totals.kcal)}</AppText> de{' '}
              <AppText className="font-bold text-ink">{targetKcal}</AppText> kcal hoje
            </AppText>

            <View style={styles.macroBox}>
              <Macro label="Proteína" value={Math.round(totals.protein)} target={targetProtein} />
              <Macro label="Carbo" value={Math.round(totals.carbs)} target={targetCarbs} divider />
              <Macro label="Gordura" value={Math.round(totals.fats)} target={targetFats} divider />
            </View>

            {nutritionAdvice ? (
              <View style={styles.adaptiveBox}>
                <AppText style={styles.adaptiveLabel}>Adaptado para hoje · </AppText>
                <AppText style={styles.adaptiveText}>{nutritionAdvice}</AppText>
              </View>
            ) : null}

            <Pressable onPress={() => router.push('/(app)/diet' as never)} style={styles.bannerCtaSolid}>
              <AppText style={styles.bannerCtaText}>Montar refeição</AppText>
              <ArrowRight size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </ImageBackground>

      {/* Hidratação */}
      <View style={styles.sectionCard}>
        <View style={styles.hydrationHeader}>
          <View style={styles.rowCenter}>
            <View style={styles.hydrationIcon}>
              <Droplets size={16} color="#3B82F6" strokeWidth={2.5} />
            </View>
            <AppText style={styles.hydrationLabel}>Hidratação</AppText>
          </View>
          <AppText style={styles.hydrationPct}>{pctRounded}%</AppText>
        </View>

        <View style={styles.hydrationValueRow}>
          <AppText style={styles.hydrationValue}>{litersNow.toFixed(2).replace('.', ',')}</AppText>
          <AppText style={styles.hydrationGoal}>/ {litersGoal.toFixed(1).replace('.', ',')}L</AppText>
        </View>
        <AppText style={styles.hydrationRemaining}>
          {remainingL > 0 ? (
            <>
              Faltam <AppText style={{ fontWeight: '700', color: '#3B82F6' }}>{remainingL.toFixed(1).replace('.', ',')}L</AppText> hoje
            </>
          ) : (
            <AppText style={{ fontWeight: '600', color: '#3B82F6' }}>Meta atingida ✨</AppText>
          )}
        </AppText>

        <View style={styles.hydrationTrack}>
          <View style={[styles.hydrationFill, { width: `${Math.min(100, pct)}%` }]} />
        </View>

        <View style={styles.hydrationButtonsRow}>
          <Pressable onPress={() => addWater(250)} style={styles.hydrationBtnLight}>
            <Droplets size={14} color="#3B82F6" strokeWidth={2.5} />
            <AppText style={styles.hydrationBtnLightText}>+250ml</AppText>
          </Pressable>
          <Pressable onPress={() => addWater(500)} style={styles.hydrationBtnSolid}>
            <Droplets size={14} color="#FFFFFF" strokeWidth={2.5} />
            <AppText style={styles.hydrationBtnSolidText}>+500ml</AppText>
          </Pressable>
        </View>
        <Pressable onPress={() => router.push('/(app)/hydration' as never)} style={styles.hydrationDetailsBtn}>
          <AppText style={styles.hydrationDetailsBtnText}>Detalhes</AppText>
        </Pressable>
      </View>

      {/* Progresso semanal */}
      <View style={styles.sectionCard}>
        <View style={styles.weeklyHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.rowCenter}>
              <CheckCircle2 size={12} color="#FF4F93" />
              <AppText style={styles.sectionLabelInline}>Progresso semanal</AppText>
            </View>
            <AppText className="mt-2 font-display text-[18px] font-semibold leading-tight">
              {trainingDoneCount}/{trainingDaysGoal} treinos concluídos
            </AppText>
            <AppText className="mt-1 text-[12.5px] text-ink-soft">
              {workoutPlan ? 'Baseado no seu plano de treino' : 'Defina seu plano para acompanhar'}
            </AppText>
          </View>
          <AppText style={styles.weeklyPct}>
            {trainingDaysGoal > 0 ? Math.round((trainingDoneCount / trainingDaysGoal) * 100) : 0}%
          </AppText>
        </View>

        <View style={styles.weekdaysRow}>
          {Array.from({ length: 7 }, (_, i) => {
            const isTraining = planWeekdays.includes(i);
            const isDone = isTraining && completedIdx.has(i);
            const isToday = i === dayIdx;
            return (
              <View key={i} style={styles.weekdayCol}>
                <View
                  style={[
                    styles.weekdayCircle,
                    isDone
                      ? styles.weekdayCircleDone
                      : isTraining
                        ? isToday
                          ? styles.weekdayCircleTodayTraining
                          : styles.weekdayCircleTraining
                        : styles.weekdayCircleRest,
                  ]}
                >
                  {isDone ? (
                    <CheckCircle2 size={16} color="#FFFFFF" />
                  ) : (
                    <AppText
                      style={isTraining ? { color: '#FF4F93', fontWeight: '700' } : { color: 'rgba(42,27,46,0.4)', fontWeight: '700' }}
                    >
                      {isTraining ? '·' : 'Z'}
                    </AppText>
                  )}
                </View>
                <AppText style={isToday ? styles.weekdayLabelToday : styles.weekdayLabel}>{WEEKDAY_SHORT[i]}</AppText>
              </View>
            );
          })}
        </View>

        <Pressable onPress={() => router.push('/(app)/treinos' as never)} style={styles.linkRow}>
          <AppText style={styles.linkText}>Ver meu plano</AppText>
          <ArrowRight size={14} color="#FF4F93" />
        </Pressable>
      </View>

      <TodayPlanLinkCard />
    </ScrollView>
  );
}

function Macro({ label, value, target, divider }: { label: string; value: number; target: number; divider?: boolean }) {
  return (
    <View style={[styles.macroItem, divider && styles.macroDivider]}>
      <AppText style={styles.macroLabel}>{label}</AppText>
      <AppText style={styles.macroValue}>{value}g</AppText>
      <AppText style={styles.macroTarget}>/ {target}g</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  headerLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2, color: '#FF4F93', textTransform: 'uppercase' },
  greeting: { fontFamily: 'System', fontSize: 26, lineHeight: 28, fontWeight: '700', color: '#2A1B2E', marginTop: 6 },
  notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4F93' },
  avatarInitial: { fontFamily: 'System', fontSize: 15, fontWeight: '700', color: '#FF4F93' },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionLabelInline: { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: '#FF4F93', textTransform: 'uppercase' },
  fastingRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  fastingTimer: { fontFamily: 'System', fontSize: 30, fontWeight: '600', color: '#2A1B2E', marginTop: 6 },
  fastingStatus: { fontSize: 12, color: '#8B7280', marginTop: 8 },
  fastingRing: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  fastingRingIcon: { position: 'absolute' },
  fastingButtonRow: { marginTop: 16, flexDirection: 'row', gap: 8 },
  fastingMainBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 999, paddingVertical: 12 },
  fastingMainBtnIdle: { backgroundColor: '#FF4F93' },
  fastingMainBtnActive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(255,79,147,0.3)' },
  fastingMainBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  fastingMainBtnTextActive: { fontSize: 13, fontWeight: '700', color: '#FF4F93' },
  fastingDetailsBtn: { borderRadius: 999, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: 'rgba(255,79,147,0.05)', borderWidth: 1, borderColor: 'rgba(255,79,147,0.15)' },
  fastingDetailsBtnText: { fontSize: 12.5, fontWeight: '600', color: '#FF4F93' },
  focusCard: { borderRadius: 28, padding: 24 },
  focusLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2.4, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' },
  focusCopy: { marginTop: 12, fontSize: 15.5, lineHeight: 22, color: 'rgba(255,255,255,0.95)' },
  bannerCard: { borderRadius: 32, overflow: 'hidden', minHeight: 420, borderWidth: 1, borderColor: '#EAEAEA' },
  bannerCardShort: { borderRadius: 32, overflow: 'hidden', minHeight: 400, borderWidth: 1, borderColor: '#EAEAEA' },
  bannerImage: { resizeMode: 'cover' },
  bannerWash: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' },
  bannerContent: { flex: 1, padding: 24, justifyContent: 'space-between' },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,79,147,0.15)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: '#FF4F93', textTransform: 'uppercase' },
  bannerBottom: { marginTop: 'auto' },
  bannerTitle: { fontFamily: 'System', fontSize: 24, fontWeight: '700', color: '#2A1B2E', lineHeight: 28 },
  bannerSubtitle: { marginTop: 8, fontSize: 13, color: 'rgba(42,27,46,0.65)', lineHeight: 18 },
  whiteBox: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(234,234,234,0.6)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerCta: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF4F93',
    borderRadius: 999,
    height: 48,
  },
  bannerCtaSolid: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF4F93',
    borderRadius: 999,
    height: 48,
  },
  bannerCtaText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  macroBox: {
    marginTop: 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(234,234,234,0.6)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  macroItem: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  macroDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(42,27,46,0.1)' },
  macroLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(42,27,46,0.5)', textTransform: 'uppercase' },
  macroValue: { marginTop: 4, fontFamily: 'System', fontSize: 15, fontWeight: '800', color: '#2A1B2E' },
  macroTarget: { marginTop: 2, fontSize: 9.5, color: 'rgba(42,27,46,0.4)', fontWeight: '500' },
  adaptiveBox: {
    marginTop: 12,
    backgroundColor: 'rgba(255,79,147,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,79,147,0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  adaptiveLabel: { fontSize: 12, fontWeight: '700', color: '#FF4F93' },
  adaptiveText: { fontSize: 12, lineHeight: 16, color: 'rgba(42,27,46,0.75)' },
  hydrationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hydrationIcon: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center' },
  hydrationLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: '#3B82F6', textTransform: 'uppercase' },
  hydrationPct: { fontSize: 11, fontWeight: '700', color: '#3B82F6' },
  hydrationValueRow: { marginTop: 16, flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  hydrationValue: { fontFamily: 'System', fontSize: 40, fontWeight: '800', color: '#2A1B2E', lineHeight: 42 },
  hydrationGoal: { fontSize: 14, fontWeight: '600', color: 'rgba(42,27,46,0.45)' },
  hydrationRemaining: { marginTop: 8, fontSize: 12.5, color: 'rgba(42,27,46,0.6)' },
  hydrationTrack: { marginTop: 12, height: 8, borderRadius: 999, backgroundColor: '#EAF4FF', overflow: 'hidden' },
  hydrationFill: { height: '100%', borderRadius: 999, backgroundColor: '#3B82F6' },
  hydrationButtonsRow: { marginTop: 16, flexDirection: 'row', gap: 10 },
  hydrationBtnLight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 12,
    backgroundColor: '#EAF4FF',
    borderWidth: 1,
    borderColor: '#CFE6FF',
  },
  hydrationBtnLightText: { fontSize: 12.5, fontWeight: '700', color: '#3B82F6' },
  hydrationBtnSolid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
  },
  hydrationBtnSolidText: { fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' },
  hydrationDetailsBtn: { marginTop: 10, borderRadius: 999, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(59,130,246,0.05)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.15)' },
  hydrationDetailsBtnText: { fontSize: 12.5, fontWeight: '600', color: '#3B82F6' },
  weeklyHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  weeklyPct: { fontFamily: 'System', fontSize: 24, fontWeight: '700', color: '#FF4F93' },
  weekdaysRow: { marginTop: 16, flexDirection: 'row', gap: 6 },
  weekdayCol: { flex: 1, alignItems: 'center', gap: 6 },
  weekdayCircle: { width: 36, height: 36, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  weekdayCircleDone: { backgroundColor: '#FF4F93' },
  weekdayCircleTraining: { backgroundColor: 'rgba(255,79,147,0.08)', borderWidth: 1, borderColor: 'rgba(255,79,147,0.15)' },
  weekdayCircleTodayTraining: { backgroundColor: 'rgba(255,79,147,0.15)', borderWidth: 1, borderColor: 'rgba(255,79,147,0.3)' },
  weekdayCircleRest: { backgroundColor: 'rgba(42,27,46,0.05)' },
  weekdayLabel: { fontSize: 10, fontWeight: '500', color: 'rgba(42,27,46,0.45)' },
  weekdayLabelToday: { fontSize: 10, fontWeight: '500', color: '#FF4F93' },
  linkRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  linkText: { fontSize: 12.5, fontWeight: '700', color: '#FF4F93' },
});
