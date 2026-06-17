import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Activity,
  Apple,
  Battery,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Dumbbell,
  Eye,
  Flower2,
  Heart,
  Leaf,
  Lock,
  Moon,
  Pencil,
  Smile,
  Sun,
  Zap,
} from 'lucide-react-native';
import { AppText } from '@/components/ui';
import { usePersonalization } from '@/hooks/use-personalization';
import { supabase } from '@/supabase/client';
import { buildCycleSnapshot, buildMonthGrid, todayKey, parseISODate, type CalendarDay } from '@/lib/cycle-engine';
import { type CyclePhase } from '@/lib/personalization';
import { MOODS, SYMPTOMS, ENERGY_LEVELS, FLOWS } from '@/lib/cycle-insights';

const PHASE_CONFIG: Record<CyclePhase, { label: string; icon: ComponentType<{ size?: number; color?: string }>; color: string }> = {
  menstrual: { label: 'Menstrual', icon: Moon, color: '#EC4899' },
  follicular: { label: 'Folicular', icon: Leaf, color: '#A855F7' },
  ovulation: { label: 'Ovulatória', icon: Sun, color: '#EAB308' },
  luteal: { label: 'Lútea', icon: Flower2, color: '#F472B6' },
};

const PHASE_DETAILS: Record<
  CyclePhase,
  { tips: string[]; energy: string; hydration: string; workout: string; nutrition: string }
> = {
  menstrual: {
    tips: ['Priorize hidratação ao longo do dia', 'Treinos leves ou alongamento', 'Alimentos ricos em ferro', 'Descanso e sono de qualidade'],
    energy: 'Baixa',
    hydration: 'Alta prioridade',
    workout: 'Caminhada / Yoga leve',
    nutrition: 'Ferro + magnésio',
  },
  follicular: {
    tips: ['Hidrate bem antes de treinar', 'Treinos de força são bem-vindos', 'Proteína magra e carbo complexo', 'Aposte em novos hábitos'],
    energy: 'Crescendo',
    hydration: 'Média',
    workout: 'Força / HIIT',
    nutrition: 'Proteína + antioxidantes',
  },
  ovulation: {
    tips: ['Aproveite para treinos intensos', 'Hidratação extra com eletrólitos', 'Refeições completas pré e pós treino', 'Bom momento pra socializar'],
    energy: 'Alta',
    hydration: 'Alta prioridade',
    workout: 'Treino intenso',
    nutrition: 'Carbo + proteína completa',
  },
  luteal: {
    tips: ['Reduza cafeína e ultraprocessados', 'Treinos moderados, sem extremos', 'Magnésio, ômega-3 e fibras', 'Priorize sono e rotinas calmas'],
    energy: 'Variável',
    hydration: 'Média-alta',
    workout: 'Pilates / Força moderada',
    nutrition: 'Magnésio + fibras',
  },
};

const PHASE_NEXT_MSG: Record<CyclePhase, string> = {
  menstrual: 'Seu corpo está em fase de recuperação.',
  follicular: 'A energia está aumentando — bom momento para criar.',
  ovulation: 'Você está na sua janela fértil — pico de performance.',
  luteal: 'Seu corpo se prepara para um novo ciclo.',
};

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function formatBR(iso: string): string {
  const d = parseISODate(iso);
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(d);
}

function withAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function getPhaseDayStyle(d: CalendarDay): { bg: string | null; color: string } {
  const op = d.inMonth ? 1 : 0.45;
  if (d.isPeriod) return { bg: withAlpha('#EC4899', op), color: '#fff' };
  if (d.isOvulation) return { bg: withAlpha('#EAB308', op), color: '#fff' };
  if (d.isFertile) return { bg: withAlpha('#FDE68A', op * 0.9), color: '#92400E' };
  if (d.phase === 'follicular') return { bg: withAlpha('#DDD6FE', op * 0.85), color: '#5B21B6' };
  if (d.phase === 'luteal') return { bg: withAlpha('#BFDBFE', op * 0.85), color: '#1E40AF' };
  return { bg: null, color: d.inMonth ? '#1e293b' : '#cbd5e1' };
}

export default function CycleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile: pProfile, recommendations } = usePersonalization();

  const [today, setToday] = useState<string>(() => todayKey());
  useEffect(() => {
    const id = setInterval(() => {
      const t = todayKey();
      setToday((prev) => (prev === t ? prev : t));
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState<number>(() => parseISODate(todayKey()).getUTCFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => parseISODate(todayKey()).getUTCMonth());

  const snapshot = useMemo(() => buildCycleSnapshot(pProfile, today), [pProfile, today]);
  const monthGrid = useMemo(() => buildMonthGrid(viewYear, viewMonth, pProfile, today), [viewYear, viewMonth, pProfile, today]);
  const selectedSnapshot = useMemo(() => {
    if (!selectedDate || selectedDate === today) return null;
    return buildCycleSnapshot(pProfile, selectedDate);
  }, [selectedDate, pProfile, today]);

  const todayPhase: CyclePhase = snapshot.phase ?? 'follicular';
  const todayConfig = PHASE_CONFIG[todayPhase];

  const nextEvent = useMemo(() => {
    const { cycleDay, cycleLength, periodLength } = snapshot;
    const ovulation = Math.max(periodLength + 1, cycleLength - 14);
    const segments: Array<{ end: number; next: CyclePhase; startDay: number }> = [
      { end: periodLength, next: 'follicular', startDay: periodLength + 1 },
      { end: ovulation - 2, next: 'ovulation', startDay: ovulation - 1 },
      { end: ovulation + 1, next: 'luteal', startDay: ovulation + 2 },
      { end: cycleLength, next: 'menstrual', startDay: cycleLength + 1 },
    ];
    for (const s of segments) {
      if (cycleDay <= s.end) return { phase: s.next, days: Math.max(0, s.startDay - cycleDay) };
    }
    return { phase: 'menstrual' as CyclePhase, days: Math.max(0, cycleLength - cycleDay + 1) };
  }, [snapshot]);

  const todayLabel = useMemo(() => {
    const d = parseISODate(today);
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }, [today]);

  function prevMonth() {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }
  function nextMonth() {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }
  function goToday() {
    const d = parseISODate(today);
    setViewYear(d.getUTCFullYear());
    setViewMonth(d.getUTCMonth());
    setSelectedDate(null);
  }

  const modalOpen = selectedDate !== null;
  const modalIso = selectedDate ?? today;
  const modalSnapshot = selectedSnapshot ?? snapshot;
  const modalPhase: CyclePhase = modalSnapshot.phase ?? todayPhase;
  const modalConfig = PHASE_CONFIG[modalPhase];
  const modalDetails = PHASE_DETAILS[modalPhase];
  const isModalToday = modalIso === today;
  const isModalPast = modalIso < today;
  const isModalFuture = modalIso > today;

  const [pastLog, setPastLog] = useState<any | null>(null);
  const [pastLogLoading, setPastLogLoading] = useState(false);
  useEffect(() => {
    if (!selectedDate || !isModalPast) {
      setPastLog(null);
      return;
    }
    let cancelled = false;
    setPastLogLoading(true);
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        if (!cancelled) {
          setPastLog(null);
          setPastLogLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from('cycle_daily_logs')
        .select('*')
        .eq('user_id', u.user.id)
        .eq('date', selectedDate)
        .maybeSingle();
      if (!cancelled) {
        setPastLog(data ?? null);
        setPastLogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, isModalPast]);

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 128, gap: 20 }}>
        {/* Hoje */}
        <View className="rounded-[28px] border-2 p-6" style={{ backgroundColor: '#FFF1F7', borderColor: '#FBCFE8' }}>
          <View className="flex-row items-center justify-between">
            <View className="rounded-full bg-primary px-2.5 py-1">
              <AppText className="text-[10px] font-black uppercase tracking-[2px] text-white">HOJE</AppText>
            </View>
            <AppText className="text-[11px] font-semibold capitalize text-ink-soft">{todayLabel}</AppText>
          </View>

          <View className="mt-4 flex-row items-center gap-2">
            <todayConfig.icon size={22} color={todayConfig.color} />
            <AppText className="font-display text-xl font-bold uppercase tracking-tight">{todayConfig.label}</AppText>
          </View>

          <AppText className="mt-2 font-display text-[26px] font-bold leading-none">
            Dia <AppText className="text-primary">{snapshot.cycleDay}</AppText>
            <AppText className="text-xl font-bold text-ink-soft"> de {snapshot.cycleLength}</AppText>
          </AppText>

          <AppText className="mt-3 text-sm leading-relaxed text-ink-soft">{PHASE_NEXT_MSG[todayPhase]}</AppText>

          <View className="mt-3 gap-1">
            <AppText className="text-sm">
              <AppText className="text-[11px] font-black uppercase tracking-wider text-ink-soft">Próxima fase: </AppText>
              <AppText className="font-bold">{PHASE_CONFIG[nextEvent.phase].label}</AppText>{' '}
              <AppText className="text-ink-soft">
                {nextEvent.days === 0 ? 'começa hoje' : `em ${nextEvent.days} ${nextEvent.days === 1 ? 'dia' : 'dias'}`}
              </AppText>
            </AppText>
            <AppText className="text-sm">
              <AppText className="text-[11px] font-black uppercase tracking-wider text-ink-soft">Ovulação: </AppText>
              <AppText className="font-bold">
                {snapshot.daysToOvulation > 0
                  ? `em ${snapshot.daysToOvulation} ${snapshot.daysToOvulation === 1 ? 'dia' : 'dias'}`
                  : snapshot.daysToOvulation === 0
                    ? 'hoje'
                    : `há ${Math.abs(snapshot.daysToOvulation)} ${Math.abs(snapshot.daysToOvulation) === 1 ? 'dia' : 'dias'}`}
              </AppText>
            </AppText>
          </View>

          <Pressable
            onPress={() => router.push('/ciclo/perfil' as never)}
            className="mt-5 flex-row items-center gap-2 self-start rounded-full border border-primary/20 bg-white px-3 py-2"
          >
            <Pencil size={12} color="#FF4F93" />
            <AppText className="text-[11px] font-bold text-primary">Editar dados do ciclo</AppText>
          </Pressable>
        </View>

        {/* Check-in rápido */}
        <View className="rounded-[28px] border border-border bg-white p-5 shadow-petal">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="rounded-xl bg-primary/10 p-2">
                <Heart size={18} color="#FF4F93" />
              </View>
              <AppText className="font-display text-base font-bold">Check-in rápido</AppText>
            </View>
            <Pressable onPress={() => router.push('/ciclo/checkin')}>
              <AppText className="text-[10px] font-black uppercase tracking-wider text-primary">ABRIR</AppText>
            </Pressable>
          </View>
          <View className="flex-row gap-2">
            {[
              { icon: Smile, label: 'Humor', color: '#EC4899' },
              { icon: Zap, label: 'Energia', color: '#A855F7' },
              { icon: Activity, label: 'Sintomas', color: '#F59E0B' },
              { icon: Droplet, label: 'Fluxo', color: '#3B82F6' },
            ].map((c) => (
              <Pressable
                key={c.label}
                onPress={() => router.push('/ciclo/checkin')}
                className="flex-1 items-center gap-1.5 rounded-2xl border border-border bg-ink/5 p-3"
              >
                <View className="size-9 items-center justify-center rounded-full" style={{ backgroundColor: `${c.color}1f` }}>
                  <c.icon size={16} color={c.color} />
                </View>
                <AppText className="text-[10px] font-bold">{c.label}</AppText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Calendário */}
        <View className="rounded-[28px] border border-border bg-white p-6 shadow-petal">
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="rounded-xl bg-primary/10 p-2">
                <Calendar size={18} color="#FF4F93" />
              </View>
              <AppText className="font-display text-lg font-bold">Calendário</AppText>
            </View>
            <Pressable onPress={goToday} className="rounded-full bg-primary/10 px-3 py-1">
              <AppText className="text-[10px] font-black uppercase tracking-wider text-primary">HOJE</AppText>
            </Pressable>
          </View>

          <View className="mb-3 flex-row items-center justify-between">
            <Pressable onPress={prevMonth} className="size-9 items-center justify-center rounded-full border border-border bg-ink/5">
              <ChevronLeft size={16} color="#2A1B2E" />
            </Pressable>
            <AppText className="text-sm font-bold capitalize">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </AppText>
            <Pressable onPress={nextMonth} className="size-9 items-center justify-center rounded-full border border-border bg-ink/5">
              <ChevronRight size={16} color="#2A1B2E" />
            </Pressable>
          </View>

          <View className="mb-1 flex-row">
            {WEEKDAYS.map((w, i) => (
              <AppText key={i} className="flex-1 text-center text-[10px] font-bold uppercase text-ink-soft">
                {w}
              </AppText>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {monthGrid.map((d) => {
              if (!d.inMonth) {
                return <View key={d.iso} style={{ width: '14.28%', height: 40 }} />;
              }
              const isSelected = selectedDate === d.iso;
              const phaseStyle = getPhaseDayStyle(d);
              let bg = phaseStyle.bg ?? 'transparent';
              let color = phaseStyle.color;
              let borderWidth = 0;
              if (d.isToday && d.isPeriod) {
                bg = '#EC4899';
                color = '#fff';
              } else if (d.isToday || isSelected) {
                borderWidth = 2;
              }
              return (
                <View key={d.iso} style={{ width: '14.28%', height: 40, padding: 2 }}>
                  <Pressable
                    onPress={() => setSelectedDate(d.iso)}
                    style={{
                      flex: 1,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: bg,
                      borderWidth,
                      borderColor: '#FF4F93',
                    }}
                  >
                    <AppText style={{ fontSize: 12, fontWeight: '700', color }}>{d.day}</AppText>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View className="mt-4 flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
            <LegendDot color="#EC4899" label="Menstrual" />
            <LegendDot color="#FDE68A" label="Fértil" />
            <LegendDot color="#EAB308" label="Ovulação" />
            <LegendDot color="#DDD6FE" label="Folicular" />
            <LegendDot color="#BFDBFE" label="Lútea" />
          </View>
        </View>

        {/* Previsões */}
        {snapshot.hasData ? (
          <View className="gap-3 rounded-[28px] border border-border bg-white p-5 shadow-petal">
            <View className="mb-1 flex-row items-center gap-2">
              <View className="rounded-xl bg-ink/5 p-2">
                <Calendar size={14} color="#777777" />
              </View>
              <AppText className="font-display text-sm font-bold text-ink-soft">Previsões</AppText>
            </View>
            <PredictionRow
              color={PHASE_CONFIG[nextEvent.phase].color}
              label="Próxima fase"
              value={`${PHASE_CONFIG[nextEvent.phase].label} · ${nextEvent.days === 0 ? 'hoje' : `em ${nextEvent.days}d`}`}
            />
            <PredictionRow
              color="#EAB308"
              label="Ovulação"
              value={`${formatBR(snapshot.ovulationDate)} · ${
                snapshot.daysToOvulation > 0 ? `em ${snapshot.daysToOvulation}d` : snapshot.daysToOvulation === 0 ? 'hoje' : `há ${Math.abs(snapshot.daysToOvulation)}d`
              }`}
            />
            <PredictionRow color="#EC4899" label="Próxima menstruação" value={`${formatBR(snapshot.nextPeriodDate)} · em ${snapshot.daysToNextPeriod}d`} />
          </View>
        ) : null}
      </ScrollView>

      {/* Day details modal */}
      <Modal transparent visible={modalOpen} animationType="fade" onRequestClose={() => setSelectedDate(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setSelectedDate(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '85%' }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row items-start justify-between gap-3">
                <View>
                  <AppText className="text-[10px] font-black uppercase tracking-[2px] text-ink-soft">
                    {isModalToday ? 'Hoje' : 'Data selecionada'}
                  </AppText>
                  <AppText className="mt-0.5 font-display text-xl font-bold capitalize">{formatBR(modalIso)}</AppText>
                  <AppText className="mt-0.5 text-xs text-ink-soft">
                    Dia <AppText className="font-bold text-ink">{modalSnapshot.cycleDay}</AppText> de {modalSnapshot.cycleLength}
                  </AppText>
                </View>
                <View className="size-10 items-center justify-center rounded-full" style={{ backgroundColor: `${modalConfig.color}22` }}>
                  <modalConfig.icon size={20} color={modalConfig.color} />
                </View>
              </View>

              <View className="mt-3 self-start rounded-full px-2.5 py-1" style={{ backgroundColor: `${modalConfig.color}1f` }}>
                <AppText className="text-xs font-bold" style={{ color: modalConfig.color }}>
                  {modalConfig.label}
                </AppText>
              </View>

              <View className="mt-4 flex-row flex-wrap gap-2.5">
                <InsightTile icon={Battery} color="#A855F7" label="Energia" value={modalDetails.energy} />
                <InsightTile icon={Droplet} color="#3B82F6" label="Hidratação" value={modalDetails.hydration} />
                <InsightTile
                  icon={Dumbbell}
                  color="#EC4899"
                  label="Treino"
                  value={
                    isModalToday
                      ? recommendations.workoutIntensity === 'leve'
                        ? 'Leve'
                        : recommendations.workoutIntensity === 'alta'
                          ? 'Intenso'
                          : modalDetails.workout
                      : modalDetails.workout
                  }
                />
                <InsightTile icon={Apple} color="#16A34A" label="Nutrição" value={modalDetails.nutrition} />
              </View>

              <View className="mt-4">
                <AppText className="mb-2 text-[10px] font-black uppercase tracking-wider text-ink-soft">Foco do dia</AppText>
                <View className="gap-1.5">
                  {modalDetails.tips.map((t) => (
                    <View key={t} className="flex-row items-start gap-2">
                      <View className="mt-1.5 size-1.5 rounded-full" style={{ backgroundColor: modalConfig.color }} />
                      <AppText className="flex-1 text-[13px]">{t}</AppText>
                    </View>
                  ))}
                </View>
              </View>

              {isModalPast ? (
                <View className="mt-4 rounded-2xl border border-border bg-ink/5 p-4">
                  <View className="mb-2 flex-row items-center gap-1.5">
                    <Lock size={12} color="#8B7280" />
                    <AppText className="text-[10px] font-black uppercase tracking-wider text-ink-soft">Registro do dia (somente leitura)</AppText>
                  </View>
                  {pastLogLoading ? (
                    <AppText className="text-xs text-ink-soft">Carregando…</AppText>
                  ) : pastLog ? (
                    <View className="gap-1.5">
                      {pastLog.mood ? (
                        <AppText className="text-[13px]">
                          <AppText className="text-ink-soft">Humor: </AppText>
                          <AppText className="font-semibold">{MOODS.find((m) => m.id === pastLog.mood)?.label ?? pastLog.mood}</AppText>
                        </AppText>
                      ) : null}
                      {pastLog.energy_level ? (
                        <AppText className="text-[13px]">
                          <AppText className="text-ink-soft">Energia: </AppText>
                          <AppText className="font-semibold">
                            {ENERGY_LEVELS.find((e) => e.id === pastLog.energy_level)?.label ?? pastLog.energy_level}
                          </AppText>
                        </AppText>
                      ) : null}
                      {pastLog.menstrual_flow ? (
                        <AppText className="text-[13px]">
                          <AppText className="text-ink-soft">Fluxo: </AppText>
                          <AppText className="font-semibold">{FLOWS.find((f) => f.id === pastLog.menstrual_flow)?.label ?? pastLog.menstrual_flow}</AppText>
                        </AppText>
                      ) : null}
                      {pastLog.symptoms?.length > 0 ? (
                        <AppText className="text-[13px]">
                          <AppText className="text-ink-soft">Sintomas: </AppText>
                          <AppText className="font-semibold">
                            {pastLog.symptoms.map((s: string) => SYMPTOMS.find((x) => x.id === s)?.label ?? s).join(', ')}
                          </AppText>
                        </AppText>
                      ) : null}
                      {pastLog.notes ? <AppText className="mt-1 text-[13px] italic text-ink-soft">"{pastLog.notes}"</AppText> : null}
                    </View>
                  ) : (
                    <AppText className="text-xs text-ink-soft">Nenhum registro feito neste dia</AppText>
                  )}
                </View>
              ) : null}

              {isModalFuture ? (
                <View className="mt-4 flex-row items-center gap-2 rounded-2xl border border-border bg-ink/5 p-4">
                  <Eye size={16} color="#8B7280" />
                  <AppText className="flex-1 text-xs text-ink-soft">Previsão do dia — registros só podem ser feitos no dia atual.</AppText>
                </View>
              ) : null}

              <View className="mt-5 flex-row gap-2">
                {isModalToday ? (
                  <Pressable
                    onPress={() => {
                      setSelectedDate(null);
                      router.push('/ciclo/checkin');
                    }}
                    className="flex-1 items-center rounded-full bg-primary py-3"
                  >
                    <AppText className="text-sm font-bold text-white">Registrar sintomas</AppText>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => setSelectedDate(null)}
                  className={`${isModalToday ? 'px-5' : 'flex-1'} items-center rounded-full bg-ink/5 py-3`}
                >
                  <AppText className="text-sm font-bold text-ink-soft">Fechar</AppText>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
      <AppText className="text-[10px] font-bold uppercase text-ink-soft">{label}</AppText>
    </View>
  );
}

function InsightTile({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: ComponentType<{ size?: number; color?: string }>;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View className="w-[47%] rounded-2xl border border-border bg-ink/5 p-3">
      <View className="flex-row items-center gap-2">
        <View className="size-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1f` }}>
          <Icon size={14} color={color} />
        </View>
        <AppText className="text-[10px] font-black uppercase tracking-wider text-ink-soft">{label}</AppText>
      </View>
      <AppText className="mt-1.5 text-[12px] font-bold leading-tight">{value}</AppText>
    </View>
  );
}

function PredictionRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
      <View className="flex-1">
        <AppText className="text-xs font-medium text-ink-soft">{label}</AppText>
        <AppText className="text-sm font-bold capitalize">{value}</AppText>
      </View>
    </View>
  );
}
