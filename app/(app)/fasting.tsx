import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Circle } from 'react-native-svg';
import { Calendar, ChevronLeft, Flame, Pencil, Play, Square, Trophy, TrendingUp, X } from 'lucide-react-native';
import { AppText, AppCard } from '@/components/ui';
import { PersonalizedBanner } from '@/components/PersonalizedBanner';
import { useFastingTimer, formatFastingGoal } from '@/hooks/useFastingTimer';

const QUICK_GOALS = [12, 14, 16, 18, 20];

function fmtHM(ms: number) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function relativeDay(ts: number) {
  const today = new Date();
  const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / 86400000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][new Date(ts).getDay()];
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function fmtTimeShort(ts: number) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDayLabel(ts: number) {
  const today = new Date();
  const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / 86400000);
  const time = fmtTimeShort(ts);
  if (diffDays === 0) return `Hoje ${time}`;
  if (diffDays === -1) return `Amanhã ${time}`;
  if (diffDays === 1) return `Ontem ${time}`;
  return `${new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} ${time}`;
}

const MILESTONES = [
  { hours: 4, emoji: '⚡', label: 'Energia' },
  { hours: 8, emoji: '🔥', label: 'Queima' },
  { hours: 12, emoji: '🧠', label: 'Foco' },
  { hours: 16, emoji: '💜', label: 'Bem-estar' },
];

export default function FastingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fasting = useFastingTimer();
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const { active, applyGoal, elapsedMs, expectedFinish, formatted, goalMin, progressPct: pct, sessions, startedAt, toggle, busy } = fasting;
  const pctLabel = Math.round(pct);

  const stats = useMemo(() => {
    if (sessions.length === 0) return { longest: 0, weeklyAvg: 0, completed: 0 };
    const longest = Math.max(...sessions.map((s) => s.durationMs));
    const completed = sessions.filter((s) => s.durationMs >= s.goalHours * 3600_000).length;
    const weekAgo = Date.now() - 7 * 86400_000;
    const recentS = sessions.filter((s) => s.endedAt >= weekAgo);
    const weeklyAvg = recentS.length > 0 ? recentS.reduce((a, s) => a + s.durationMs, 0) / recentS.length : 0;
    return { longest, weeklyAvg, completed };
  }, [sessions]);

  const recent = useMemo(() => [...sessions].sort((a, b) => b.endedAt - a.endedAt).slice(0, 5), [sessions]);

  const handleApplyGoal = (newMin: number) => {
    if (active) {
      Alert.alert('Atualizar meta?', 'Deseja atualizar a meta deste jejum?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Atualizar', onPress: () => { setGoalSheetOpen(false); void applyGoal(newMin); } },
      ]);
      return;
    }
    setGoalSheetOpen(false);
    void applyGoal(newMin);
  };

  const r = 88;
  const c = 2 * Math.PI * r;
  const dash = `${(pct / 100) * c} ${c}`;

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center gap-2 px-5" style={{ paddingTop: insets.top + 16, paddingBottom: 12 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)'))}
          className="size-10 items-center justify-center rounded-full border border-border bg-white"
        >
          <ChevronLeft size={20} color="#2A1B2E" />
        </Pressable>
        <View>
          <AppText className="font-display text-lg font-semibold">Jejum</AppText>
          <AppText className="text-xs text-ink-soft">Jejum Personalizado</AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 128, gap: 24 }}>
        <PersonalizedBanner area="fasting" />

        <LinearGradient colors={['#DB2777', '#EC4899', '#EC4899']} style={{ borderRadius: 32, padding: 24, overflow: 'hidden' }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5">
              <Flame size={12} color="#FFFFFF" />
              <AppText className="text-[10px] font-bold uppercase tracking-[2px] text-white">
                {startedAt ? 'Jejum em andamento' : 'Pronta para iniciar'}
              </AppText>
            </View>
            <Pressable onPress={() => setGoalSheetOpen(true)} className="flex-row items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5">
              <AppText className="text-[11px] font-semibold text-white">Meta {formatFastingGoal(goalMin)}</AppText>
              <Pencil size={12} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="mx-auto mt-4" style={{ width: 240, height: 240 }}>
            <Svg width={240} height={240} viewBox="0 0 200 200" style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={100} cy={100} r={r} stroke="rgba(255,255,255,0.18)" strokeWidth={12} fill="none" />
              <Circle
                cx={100}
                cy={100}
                r={r}
                stroke="#FFFFFF"
                strokeWidth={12}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={dash}
              />
            </Svg>
            <View className="absolute inset-0 items-center justify-center">
              <AppText className="text-[10px] font-semibold uppercase tracking-[2px] text-white/80">
                {startedAt ? 'Em jejum' : 'Tempo'}
              </AppText>
              <AppText className="mt-1.5 font-display text-[40px] font-semibold leading-none text-white">{formatted}</AppText>
              <AppText className="mt-2 text-[12px] font-medium text-white/90">{pctLabel}% da meta</AppText>
            </View>
          </View>

          <View className="mt-6 flex-row gap-2">
            <GoalInfoCard label="Início" value={startedAt ? fmtDayLabel(startedAt) : '—'} />
            <GoalInfoCard label="Meta" value={formatFastingGoal(goalMin)} />
            <GoalInfoCard label="Fim previsto" value={expectedFinish ? fmtDayLabel(expectedFinish) : '—'} />
          </View>

          <Pressable
            onPress={toggle}
            disabled={busy}
            className="mt-5 flex-row items-center justify-center gap-2 rounded-full bg-white py-4"
            style={{ opacity: busy ? 0.7 : 1 }}
          >
            {startedAt ? <Square size={16} color="#EC4899" /> : <Play size={16} color="#EC4899" />}
            <AppText className="text-[15px] font-bold text-primary">{startedAt ? 'Encerrar jejum' : 'Iniciar jejum'}</AppText>
          </Pressable>

          <AppText className="mt-3 text-center text-[12px] text-white/85">Mantenha-se hidratada e continue 💧</AppText>
        </LinearGradient>

        <View className="flex-row gap-2">
          {MILESTONES.map((m) => {
            const reached = elapsedMs / 3600_000 >= m.hours;
            return (
              <View
                key={m.label}
                className={`flex-1 items-center rounded-2xl border px-1 py-3 ${reached ? 'border-primary/20 bg-primary/10' : 'border-border bg-white opacity-60'}`}
              >
                <AppText className="text-xl leading-none">{m.emoji}</AppText>
                <AppText className="mt-1.5 text-[10.5px] font-semibold" numberOfLines={1}>
                  {m.label}
                </AppText>
                <AppText className="mt-0.5 text-[9px] text-ink-soft">{m.hours}h</AppText>
              </View>
            );
          })}
        </View>

        <View>
          <AppText className="mb-3 px-1 text-[10px] font-bold uppercase tracking-[2px] text-primary">Seu progresso</AppText>
          <View className="flex-row gap-2.5">
            <StatCard icon={Trophy} label="Maior jejum" value={stats.longest ? fmtHM(stats.longest) : '—'} />
            <StatCard icon={TrendingUp} label="Média semanal" value={stats.weeklyAvg ? fmtHM(stats.weeklyAvg) : '—'} />
            <StatCard icon={Calendar} label="Dias completos" value={stats.completed ? `${stats.completed}` : '0'} />
          </View>
        </View>

        <View>
          <AppText className="mb-3 px-1 text-[10px] font-bold uppercase tracking-[2px] text-primary">Jejuns recentes</AppText>
          {recent.length === 0 ? (
            <AppCard className="items-center gap-2 py-6">
              <AppText className="text-2xl">🌸</AppText>
              <AppText className="text-center text-[13px] text-ink-soft">Seu histórico aparece aqui após o primeiro jejum.</AppText>
            </AppCard>
          ) : (
            <View className="gap-2">
              {recent.map((s) => {
                const gMs = s.goalHours * 3600_000;
                const sPct = Math.min(100, (s.durationMs / gMs) * 100);
                const completed = s.durationMs >= gMs;
                return (
                  <AppCard key={s.startedAt} className="flex-row items-center gap-3 p-3.5">
                    <View className={`size-11 items-center justify-center rounded-2xl ${completed ? 'border border-primary/20 bg-primary/10' : 'bg-primary/5'}`}>
                      <AppText className="text-lg">{completed ? '✨' : '⏱️'}</AppText>
                    </View>
                    <View className="min-w-0 flex-1">
                      <View className="flex-row items-baseline justify-between gap-2">
                        <AppText className="font-display text-[15px] font-semibold">{fmtHM(s.durationMs)}</AppText>
                        <AppText className="text-[11px] text-ink-soft">{relativeDay(s.endedAt)}</AppText>
                      </View>
                      <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-primary/5">
                        <View className="h-full rounded-full bg-primary" style={{ width: `${sPct}%` }} />
                      </View>
                    </View>
                  </AppCard>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={goalSheetOpen} transparent animationType="slide" onRequestClose={() => setGoalSheetOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setGoalSheetOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <GoalSheet current={goalMin} insetsBottom={insets.bottom} onClose={() => setGoalSheetOpen(false)} onApply={handleApplyGoal} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function GoalInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-white/20 bg-white/15 px-3 py-2.5">
      <AppText className="text-[9px] font-semibold uppercase tracking-[1.5px] text-white/80">{label}</AppText>
      <AppText className="mt-1 text-[12px] font-semibold text-white" numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return (
    <AppCard className="flex-1 gap-0 p-3.5">
      <View className="size-7 items-center justify-center rounded-full bg-primary/10">
        <Icon size={14} color="#FF4F93" />
      </View>
      <AppText className="mt-2 font-display text-[18px] font-semibold leading-none">{value}</AppText>
      <AppText className="mt-1.5 text-[10.5px] leading-tight text-ink-soft">{label}</AppText>
    </AppCard>
  );
}

function GoalSheet({
  current, onClose, onApply, insetsBottom,
}: { current: number; onClose: () => void; onApply: (min: number) => void; insetsBottom: number }) {
  const isQuick = QUICK_GOALS.includes(Math.round(current / 60)) && current % 60 === 0;
  const [mode, setMode] = useState<'quick' | 'custom'>(isQuick ? 'quick' : 'custom');
  const [h, setH] = useState(Math.floor(current / 60));
  const [m, setM] = useState(current % 60);

  return (
    <View className="rounded-t-[2rem] bg-white p-6" style={{ paddingBottom: insetsBottom + 24 }}>
      <View className="mb-1 flex-row items-center justify-between">
        <AppText className="font-display text-lg font-semibold">Meta de jejum</AppText>
        <Pressable onPress={onClose} className="size-8 items-center justify-center rounded-full bg-primary/5">
          <X size={16} color="#8B7280" />
        </Pressable>
      </View>
      <AppText className="mb-5 text-[12px] text-ink-soft">Escolha quanto tempo deseja jejuar hoje.</AppText>

      <View className="flex-row flex-wrap gap-2">
        {QUICK_GOALS.map((hrs) => {
          const selected = mode === 'quick' && h === hrs && m === 0;
          return (
            <Pressable
              key={hrs}
              onPress={() => { setMode('quick'); setH(hrs); setM(0); }}
              className={`min-w-[30%] flex-1 items-center rounded-2xl py-3 ${selected ? 'bg-primary' : 'bg-primary/5'}`}
            >
              <AppText className={`text-[14px] font-semibold ${selected ? 'text-white' : 'text-ink'}`}>{hrs}h</AppText>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setMode('custom')}
          className={`min-w-[30%] flex-1 items-center rounded-2xl py-3 ${mode === 'custom' ? 'bg-primary' : 'bg-primary/5'}`}
        >
          <AppText className={`text-[13px] font-semibold ${mode === 'custom' ? 'text-white' : 'text-ink'}`}>Personalizada</AppText>
        </Pressable>
      </View>

      {mode === 'custom' && (
        <View className="mt-5 flex-row gap-3">
          <View className="flex-1">
            <AppText className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Horas</AppText>
            <TextInput
              value={String(h)}
              onChangeText={(t) => setH(Math.max(1, Math.min(48, Number(t) || 0)))}
              keyboardType="number-pad"
              className="mt-1 rounded-2xl border border-primary/15 bg-white px-4 py-3 text-[16px] font-semibold"
            />
          </View>
          <View className="flex-1">
            <AppText className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Minutos</AppText>
            <TextInput
              value={String(m)}
              onChangeText={(t) => setM(Math.max(0, Math.min(59, Number(t) || 0)))}
              keyboardType="number-pad"
              className="mt-1 rounded-2xl border border-primary/15 bg-white px-4 py-3 text-[16px] font-semibold"
            />
          </View>
        </View>
      )}

      <Pressable
        onPress={() => onApply(Math.max(15, h * 60 + m))}
        className="mt-6 items-center rounded-full bg-primary py-4"
      >
        <AppText className="text-[15px] font-bold text-white">Salvar meta</AppText>
      </Pressable>
    </View>
  );
}
