import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Award,
  CheckCircle2,
  Camera,
  Droplet,
  Dumbbell,
  Flame,
  Lock,
  Plus,
  Ruler,
  Sparkles,
  Trash2,
  Trophy,
} from 'lucide-react-native';
import { AppText, AppCard } from '@/components/ui';
import { useStore } from '@/lib/store';
import {
  fetchProgressData,
  uploadProgressPhoto,
  deleteProgressPhoto,
  refreshSignedUrls,
  saveMeasurement,
  deleteMeasurement,
  type PhotoRow,
  type MeasurementRow,
  type AchievementRow,
  type Streaks,
  type WeeklyPoint,
  type LevelInfo,
  type ProgressSummary,
} from '@/lib/progress-data';
import { getCachedData, setCachedData, invalidateCache, CACHE_TTL } from '@/lib/session-cache';
import { emitGlobalSync, subscribeGlobalSync } from '@/lib/sync';

type Data = Awaited<ReturnType<typeof fetchProgressData>>;
type Tab = 'resumo' | 'fotos' | 'medidas' | 'conquistas';

const progressCacheKey = (uid: string) => `progress:hub:${uid}`;

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { state, toast } = useStore();
  const uid = state.userId;
  const [data, setData] = useState<Data | null>(() => (uid ? getCachedData<Data>(progressCacheKey(uid)) ?? null : null));
  const [loading, setLoading] = useState(() => !data);
  const [tab, setTab] = useState<Tab>('resumo');

  const reload = useCallback(async () => {
    if (!uid) return;
    if (!data) setLoading(true);
    try {
      const d = await fetchProgressData(uid);
      setCachedData(progressCacheKey(uid), d, CACHE_TTL.progress);
      setData(d);
      void refreshSignedUrls(d.photos)
        .then((photos) => {
          const next = { ...d, photos };
          setCachedData(progressCacheKey(uid), next, CACHE_TTL.progress);
          setData(next);
        })
        .catch(() => undefined);
    } catch (e) {
      console.error(e);
      toast('Erro ao carregar evolução');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const invalidateAndReload = useCallback(() => {
    if (uid) invalidateCache(progressCacheKey(uid));
    return reload();
  }, [uid, reload]);

  useEffect(() => {
    if (uid) void reload();
  }, [uid, reload]);

  useEffect(
    () =>
      subscribeGlobalSync((detail) => {
        if (detail.source.startsWith('progress:hub')) return;
        if (
          detail.domains.some((d) =>
            [
              'reports', 'progress', 'bodyMeasurements', 'progressPhotos', 'hydration', 'workouts',
              'nutrition', 'fasting', 'cycle', 'checkins', 'missions', 'xp', 'achievements',
              'weeklySummaries', 'dailySummaries',
            ].includes(d),
          )
        ) {
          void invalidateAndReload();
        }
      }),
    [invalidateAndReload],
  );

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 128, gap: 16 }}
    >
      {loading || !data ? (
        <SkeletonHero />
      ) : (
        <>
          <Hero summary={data.summary} level={data.level} />
          <StreaksGrid streaks={data.streaks} />
          <Tabs value={tab} onChange={setTab} />

          {tab === 'resumo' && <ResumoTab data={data} />}
          {tab === 'fotos' && (
            <FotosTab uid={uid!} photos={data.photos} onChange={invalidateAndReload} toast={toast} />
          )}
          {tab === 'medidas' && (
            <MedidasTab uid={uid!} measurements={data.measurements} onChange={invalidateAndReload} toast={toast} />
          )}
          {tab === 'conquistas' && <ConquistasTab achievements={data.achievements} />}

          <AppText className="pt-2 text-center text-[11px] italic text-ink-soft">
            Dados calculados a partir dos seus registros reais. Continue se cuidando ✨
          </AppText>
        </>
      )}
    </ScrollView>
  );
}

// ============================================================
// HERO + STREAKS
// ============================================================
function Hero({ summary, level }: { summary: ProgressSummary; level: LevelInfo }) {
  const wc = summary.weightChangeKg;
  const wcLabel = wc == null ? '—' : `${wc > 0 ? '+' : ''}${wc.toFixed(1)} kg`;
  return (
    <View className="overflow-hidden rounded-[28px] bg-primary p-6">
      <AppText className="text-[10px] font-extrabold uppercase tracking-[2.5px] text-white/90">
        Sua transformação
      </AppText>
      <View className="mt-1 flex-row items-end gap-2">
        <AppText className="font-display text-[28px] font-bold leading-none text-white">
          {summary.glowupScore || '—'}
          <AppText className="text-[16px] text-white/80">/100</AppText>
        </AppText>
        <AppText className="mb-1 text-[12px] text-white/90">GlowUp Score</AppText>
      </View>

      {!summary.scoreReady ? (
        <View className="mt-3 flex-row items-center gap-2 rounded-2xl bg-white/15 p-3">
          <Sparkles size={16} color="#FFFFFF" />
          <AppText className="flex-1 text-[11px] text-white/90">
            Continue registrando sua rotina para gerar seu Score GlowUp.
          </AppText>
        </View>
      ) : null}

      <View className="mt-5 flex-row gap-2">
        <MetricCell label="Peso" value={wcLabel} />
        <MetricCell label="Treinos" value={`${summary.workoutCount}`} />
        <MetricCell label="Check-ins" value={`${summary.checkinCount}`} />
        <MetricCell label="XP" value={`${summary.totalXp}`} />
      </View>

      <View className="mt-5 rounded-2xl bg-white/15 p-3.5">
        <View className="flex-row items-center justify-between">
          <AppText className="text-[12px] font-semibold text-white">
            Nível {level.level} — {level.name}
          </AppText>
          <AppText className="text-[12px] text-white/90">
            {level.nextLevelXp ? `${level.currentXp}/${level.nextLevelXp} XP` : `${level.currentXp} XP`}
          </AppText>
        </View>
        <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
          <View className="h-full rounded-full bg-white" style={{ width: `${level.progressPct}%` }} />
        </View>
      </View>
    </View>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl bg-white/15 p-2">
      <AppText className="text-[15px] font-display font-semibold leading-tight text-white" numberOfLines={1}>
        {value}
      </AppText>
      <AppText className="mt-1 text-[10px] text-white/90" numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

function StreaksGrid({ streaks }: { streaks: Streaks }) {
  const items: { label: string; val: Streaks[keyof Streaks]; icon: ComponentType<{ size?: number; color?: string }> }[] = [
    { label: 'Treino', val: streaks.workout, icon: Dumbbell },
    { label: 'Check-in', val: streaks.checkin, icon: CheckCircle2 },
    { label: 'Água', val: streaks.hydration, icon: Droplet },
    { label: 'Nutrição', val: streaks.nutrition, icon: Flame },
  ];
  return (
    <View className="flex-row gap-2">
      {items.map((s) => (
        <View key={s.label} className="flex-1 items-center rounded-2xl border border-border bg-white p-3">
          <s.icon size={16} color="#FF4F93" />
          <AppText className="mt-1.5 font-display text-[18px] font-semibold leading-none">{s.val.current}</AppText>
          <AppText className="mt-1 text-[10px] text-ink-soft" numberOfLines={1}>
            {s.label}
          </AppText>
          <AppText className="mt-0.5 text-[9px] text-ink-soft/70" numberOfLines={1}>
            Recorde {s.val.best}
          </AppText>
        </View>
      ))}
    </View>
  );
}

// ============================================================
// TABS
// ============================================================
function Tabs({ value, onChange }: { value: Tab; onChange: (v: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'fotos', label: 'Fotos' },
    { id: 'medidas', label: 'Medidas' },
    { id: 'conquistas', label: 'Conquistas' },
  ];
  return (
    <View className="flex-row gap-1.5">
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            className={`flex-1 items-center rounded-2xl py-2.5 ${active ? 'bg-primary' : 'border border-border bg-white'}`}
          >
            <AppText className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-ink-soft'}`} numberOfLines={1}>
              {t.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ============================================================
// RESUMO TAB — numbers/bars, no line charts
// ============================================================
function ResumoTab({ data }: { data: Data }) {
  const { weightTrend, waistTrend, weeklyTimeline, summary } = data;
  return (
    <View className="gap-4">
      <TrendCard title="Peso" icon={Ruler} series={weightTrend.map((p) => ({ x: p.date, y: p.kg }))} suffix="kg" emptyMsg="Adicione suas medidas para ver a evolução." />
      <TrendCard title="Cintura" icon={Ruler} series={waistTrend.map((p) => ({ x: p.date, y: p.cm }))} suffix="cm" emptyMsg="Sem registros de cintura ainda." />
      <FastingProgressCard summary={summary} />

      <AppCard className="gap-0">
        <View className="mb-3 flex-row items-center gap-2">
          <Sparkles size={16} color="#FF4F93" />
          <AppText className="font-display text-[15px] font-semibold">Linha do tempo (últimas 12 semanas)</AppText>
        </View>
        {weeklyTimeline.length === 0 ? (
          <AppText className="py-6 text-center text-[12px] text-ink-soft">
            Sua linha do tempo aparece aqui assim que você começar a registrar.
          </AppText>
        ) : (
          <View className="gap-2">
            {weeklyTimeline.map((w) => (
              <TimelineRow key={w.weekStart} w={w} />
            ))}
          </View>
        )}
      </AppCard>
    </View>
  );
}

function TrendCard({
  title, icon: Icon, series, suffix, emptyMsg,
}: {
  title: string; icon: ComponentType<{ size?: number; color?: string }>;
  series: { x: string; y: number }[]; suffix: string; emptyMsg: string;
}) {
  return (
    <AppCard className="gap-0">
      <View className="flex-row items-center gap-2">
        <Icon size={16} color="#FF4F93" />
        <AppText className="font-display text-[15px] font-semibold">{title}</AppText>
      </View>
      {series.length < 2 ? (
        <AppText className="py-6 text-center text-[12px] text-ink-soft">{emptyMsg}</AppText>
      ) : (
        <View className="mt-3 flex-row gap-2">
          <StatCell label="Inicial" value={`${series[0].y.toFixed(1)} ${suffix}`} />
          <StatCell label="Atual" value={`${series[series.length - 1].y.toFixed(1)} ${suffix}`} highlight />
          <StatCell
            label="Variação"
            value={`${series[series.length - 1].y - series[0].y > 0 ? '+' : ''}${(series[series.length - 1].y - series[0].y).toFixed(1)} ${suffix}`}
          />
        </View>
      )}
    </AppCard>
  );
}

function StatCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View className={`flex-1 items-center rounded-2xl p-2.5 ${highlight ? 'bg-primary/10' : 'bg-ink/5'}`}>
      <AppText className={`font-display text-[14px] font-semibold ${highlight ? 'text-primary' : 'text-ink'}`} numberOfLines={1}>
        {value}
      </AppText>
      <AppText className="mt-0.5 text-[10px] text-ink-soft" numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

function FastingProgressCard({ summary }: { summary: ProgressSummary }) {
  const has =
    summary.fastingCompletedDaysLast30 > 0 || summary.fastingBestStreak > 0 || summary.fastingAverageDurationMin != null;
  const goalH = summary.fastingMostUsedTargetMinutes ? `${Math.round(summary.fastingMostUsedTargetMinutes / 60)}h` : '—';
  const avg = summary.fastingAverageDurationMin
    ? `${Math.floor(summary.fastingAverageDurationMin / 60)}h${String(summary.fastingAverageDurationMin % 60).padStart(2, '0')}`
    : '—';
  return (
    <AppCard className="gap-0">
      <View className="mb-3 flex-row items-center gap-2">
        <Flame size={16} color="#FF4F93" />
        <AppText className="font-display text-[15px] font-semibold">Jejum (últimos 30 dias)</AppText>
      </View>
      {has ? (
        <View className="flex-row flex-wrap gap-2">
          <View className="min-w-[45%] flex-1 rounded-2xl bg-primary/5 p-3">
            <AppText className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Dias completos</AppText>
            <AppText className="mt-1 font-display text-[18px] font-semibold">{summary.fastingCompletedDaysLast30}</AppText>
          </View>
          <View className="min-w-[45%] flex-1 rounded-2xl bg-primary/5 p-3">
            <AppText className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Melhor sequência</AppText>
            <AppText className="mt-1 font-display text-[18px] font-semibold">{summary.fastingBestStreak}d</AppText>
          </View>
          <View className="min-w-[45%] flex-1 rounded-2xl bg-primary/5 p-3">
            <AppText className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Duração média</AppText>
            <AppText className="mt-1 font-display text-[18px] font-semibold">{avg}</AppText>
          </View>
          <View className="min-w-[45%] flex-1 rounded-2xl bg-primary/5 p-3">
            <AppText className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Meta mais usada</AppText>
            <AppText className="mt-1 font-display text-[18px] font-semibold">{goalH}</AppText>
          </View>
        </View>
      ) : (
        <AppText className="py-4 text-center text-[12px] text-ink-soft">
          Comece a registrar seus jejuns para ver seu progresso aqui.
        </AppText>
      )}
    </AppCard>
  );
}

function TimelineRow({ w }: { w: WeeklyPoint }) {
  const d = new Date(`${w.weekStart}T12:00:00Z`);
  const label = `Semana de ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
  const chips: string[] = [];
  if (w.workouts > 0) chips.push(`🏋️ ${w.workouts}`);
  if (w.checkins > 0) chips.push(`💗 ${w.checkins}`);
  if (w.meals > 0) chips.push(`🥗 ${w.meals}`);
  if (w.hydrationDaysHit > 0) chips.push(`💧 ${w.hydrationDaysHit}`);
  if (w.photos > 0) chips.push(`📸 ${w.photos}`);
  if (w.weightUpdates > 0) chips.push(`⚖️ ${w.weightUpdates}`);
  return (
    <View className="flex-row items-center justify-between border-b border-border/60 py-2 last:border-0">
      <AppText className="text-[12px] font-medium text-ink-soft">{label}</AppText>
      <View className="flex-1 flex-row flex-wrap justify-end gap-x-2">
        {chips.map((c, i) => (
          <AppText key={i} className="text-[11px] text-ink-soft">
            {c}
          </AppText>
        ))}
        {w.xp > 0 ? <AppText className="text-[11px] font-semibold text-primary">+{w.xp} XP</AppText> : null}
      </View>
    </View>
  );
}

// ============================================================
// FOTOS TAB — expo-image-picker, no compare mode
// ============================================================
function FotosTab({
  uid, photos, onChange, toast,
}: {
  uid: string; photos: PhotoRow[]; onChange: () => void; toast: (m: string) => void;
}) {
  const [type, setType] = useState<'front' | 'side' | 'back'>('front');
  const [busy, setBusy] = useState(false);
  const filtered = photos.filter((p) => p.photo_type === type);

  const upload = async (uri: string) => {
    setBusy(true);
    try {
      await uploadProgressPhoto(uid, uri, type);
      toast('Foto adicionada ✨');
      emitGlobalSync({ source: 'progress:photo:add', domains: ['progressPhotos', 'progress', 'missions', 'reports'] });
      onChange();
    } catch (err: any) {
      console.error(err);
      toast(err?.message ?? 'Erro ao enviar foto');
    } finally {
      setBusy(false);
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast('Permita o acesso à câmera para tirar uma foto');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [3, 4] });
    if (!res.canceled && res.assets[0]) void upload(res.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast('Permita o acesso às fotos para escolher uma imagem');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true, aspect: [3, 4] });
    if (!res.canceled && res.assets[0]) void upload(res.assets[0].uri);
  };

  const choosePhoto = () => {
    Alert.alert('Adicionar foto', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Câmera', onPress: pickFromCamera },
      { text: 'Galeria', onPress: pickFromLibrary },
    ]);
  };

  const remove = (p: PhotoRow) => {
    Alert.alert('Excluir esta foto?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProgressPhoto(p.id, p.photo_path);
            toast('Foto removida');
            emitGlobalSync({ source: 'progress:photo:delete', domains: ['progressPhotos', 'progress', 'missions', 'reports'] });
            onChange();
          } catch (err: any) {
            console.error(err);
            toast(err?.message ?? 'Erro ao excluir');
          }
        },
      },
    ]);
  };

  return (
    <View className="gap-4">
      <View className="flex-row gap-2">
        {(['front', 'side', 'back'] as const).map((t) => {
          const labels = { front: 'Frente', side: 'Lado', back: 'Costas' };
          const active = type === t;
          return (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              className={`flex-1 items-center rounded-2xl py-2.5 ${active ? 'bg-primary' : 'border border-border bg-white'}`}
            >
              <AppText className={`text-[12px] font-semibold ${active ? 'text-white' : 'text-ink-soft'}`}>{labels[t]}</AppText>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        disabled={busy}
        onPress={choosePhoto}
        className="flex-row items-center justify-center gap-2 rounded-full bg-primary py-3.5"
        style={{ opacity: busy ? 0.6 : 1 }}
      >
        {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Camera size={16} color="#FFFFFF" />}
        <AppText className="font-semibold text-white">{busy ? 'Enviando...' : 'Adicionar foto'}</AppText>
      </Pressable>

      {filtered.length === 0 ? (
        <View className="items-center rounded-3xl border border-border bg-white p-10">
          <View className="mb-3 size-16 items-center justify-center rounded-full bg-primary/10">
            <Plus size={24} color="#FF4F93" />
          </View>
          <AppText className="font-display text-[15px] font-semibold">Comece sua jornada visual</AppText>
          <AppText className="mt-1 text-[12px] text-ink-soft">Acompanhe sua transformação mês a mês</AppText>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2.5">
          {filtered.map((p) => (
            <View key={p.id} className="relative overflow-hidden rounded-2xl bg-ink/5" style={{ width: '48%', aspectRatio: 3 / 4 }}>
              <Image source={{ uri: p.photo_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              <View className="absolute inset-x-0 bottom-0 bg-black/55 px-2.5 py-1.5">
                <AppText className="text-[11px] font-semibold text-white">
                  {new Date(p.photo_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                </AppText>
              </View>
              <Pressable
                onPress={() => remove(p)}
                className="absolute right-2 top-2 size-8 items-center justify-center rounded-full bg-white/90"
              >
                <Trash2 size={14} color="#E11D48" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================
// MEDIDAS TAB
// ============================================================
const FIELDS: { key: keyof MeasurementRow; label: string; suffix: string }[] = [
  { key: 'weight_kg', label: 'Peso', suffix: 'kg' },
  { key: 'waist_cm', label: 'Cintura', suffix: 'cm' },
  { key: 'abdomen_cm', label: 'Abdômen', suffix: 'cm' },
  { key: 'hip_cm', label: 'Quadril', suffix: 'cm' },
  { key: 'thigh_cm', label: 'Coxa', suffix: 'cm' },
  { key: 'arm_cm', label: 'Braço', suffix: 'cm' },
  { key: 'chest_cm', label: 'Busto', suffix: 'cm' },
  { key: 'calf_cm', label: 'Panturrilha', suffix: 'cm' },
  { key: 'neck_cm', label: 'Pescoço', suffix: 'cm' },
];

function MedidasTab({
  uid, measurements, onChange, toast,
}: {
  uid: string; measurements: MeasurementRow[]; onChange: () => void; toast: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const latest = measurements[measurements.length - 1];

  const remove = (id: string) => {
    Alert.alert('Excluir esta medida?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteMeasurement(id);
          emitGlobalSync({ source: 'progress:measurement:delete', domains: ['bodyMeasurements', 'progress', 'missions', 'reports'] });
          onChange();
        },
      },
    ]);
  };

  return (
    <View className="gap-4">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-center gap-2 rounded-full bg-primary py-3.5"
      >
        <Plus size={16} color="#FFFFFF" />
        <AppText className="font-semibold text-white">Nova medida</AppText>
      </Pressable>

      {open && (
        <MeasurementForm
          uid={uid}
          defaultDate={today}
          onSaved={() => {
            setOpen(false);
            onChange();
            toast('Medida salva');
          }}
        />
      )}

      {latest && (
        <AppCard className="gap-0">
          <AppText className="mb-3 text-[11px] font-semibold uppercase tracking-[2px] text-primary/80">
            Última medida — {new Date(latest.measurement_date).toLocaleDateString('pt-BR')}
          </AppText>
          <View className="flex-row flex-wrap gap-2">
            {FIELDS.filter((f) => latest[f.key] != null).map((f) => (
              <View key={f.key} className="min-w-[30%] flex-1 items-center rounded-2xl border border-border p-3">
                <AppText className="font-display text-[16px] font-semibold">{Number(latest[f.key]).toFixed(1)}</AppText>
                <AppText className="mt-0.5 text-[10px] text-ink-soft">
                  {f.label} ({f.suffix})
                </AppText>
              </View>
            ))}
          </View>
        </AppCard>
      )}

      {measurements.length === 0 ? (
        <View className="items-center rounded-3xl border border-border bg-white p-8">
          <Ruler size={28} color="#FF4F93" />
          <AppText className="mt-2 font-display text-[15px] font-semibold">Sem medidas ainda</AppText>
          <AppText className="mt-1 text-center text-[12px] text-ink-soft">
            Registre suas medidas para acompanhar a evolução em centímetros.
          </AppText>
        </View>
      ) : (
        <AppCard className="gap-0">
          <AppText className="mb-3 font-display text-[15px] font-semibold">Histórico</AppText>
          <View>
            {[...measurements].reverse().slice(0, 10).map((m) => (
              <View key={m.id} className="flex-row items-center justify-between border-b border-border/60 py-2 last:border-0">
                <View>
                  <AppText className="text-[13px] font-semibold">{new Date(m.measurement_date).toLocaleDateString('pt-BR')}</AppText>
                  <AppText className="text-[11px] text-ink-soft">
                    {m.weight_kg != null ? `${Number(m.weight_kg).toFixed(1)}kg` : ''}
                    {m.weight_kg != null && m.waist_cm != null ? ' • ' : ''}
                    {m.waist_cm != null ? `cintura ${Number(m.waist_cm).toFixed(0)}cm` : ''}
                  </AppText>
                </View>
                <Pressable onPress={() => remove(m.id)} className="size-8 items-center justify-center rounded-full border border-border bg-white">
                  <Trash2 size={14} color="#E11D48" />
                </Pressable>
              </View>
            ))}
          </View>
        </AppCard>
      )}
    </View>
  );
}

function MeasurementForm({
  uid, defaultDate, onSaved,
}: { uid: string; defaultDate: string; onSaved: () => void }) {
  const [date, setDate] = useState(defaultDate);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const payload: any = { measurement_date: date };
    for (const f of FIELDS) {
      const v = values[f.key as string];
      if (v && !isNaN(Number(v))) payload[f.key] = Number(v);
    }
    if (Object.keys(payload).length === 1) return;
    setSaving(true);
    try {
      await saveMeasurement(uid, payload);
      emitGlobalSync({ source: 'progress:measurement:save', domains: ['bodyMeasurements', 'progress', 'missions', 'reports'] });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppCard className="gap-3">
      <View>
        <AppText className="text-[11px] font-semibold uppercase tracking-[2px] text-primary/80">Data (AAAA-MM-DD)</AppText>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="2026-06-17"
          className="mt-1 rounded-2xl border border-border bg-white px-3 py-2.5 text-[14px]"
        />
      </View>
      <View className="flex-row flex-wrap gap-2">
        {FIELDS.map((f) => (
          <View key={f.key as string} className="min-w-[45%] flex-1">
            <AppText className="text-[11px] text-ink-soft">
              {f.label} ({f.suffix})
            </AppText>
            <TextInput
              value={values[f.key as string] ?? ''}
              onChangeText={(t) => setValues((v) => ({ ...v, [f.key as string]: t }))}
              keyboardType="decimal-pad"
              className="mt-1 rounded-2xl border border-border bg-white px-3 py-2.5 text-[14px]"
            />
          </View>
        ))}
      </View>
      <Pressable
        disabled={saving}
        onPress={submit}
        className="items-center rounded-full bg-primary py-3"
        style={{ opacity: saving ? 0.6 : 1 }}
      >
        <AppText className="font-semibold text-white">{saving ? 'Salvando...' : 'Salvar'}</AppText>
      </Pressable>
    </AppCard>
  );
}

// ============================================================
// CONQUISTAS TAB
// ============================================================
function ConquistasTab({ achievements }: { achievements: AchievementRow[] }) {
  const unlocked = achievements.filter((a) => a.unlocked_at);
  const locked = achievements.filter((a) => !a.unlocked_at);

  return (
    <View className="gap-4">
      <AppCard className="gap-0">
        <View className="mb-3 flex-row items-center gap-2">
          <Trophy size={16} color="#FF4F93" />
          <AppText className="font-display text-[15px] font-semibold">
            Conquistadas ({unlocked.length}/{achievements.length})
          </AppText>
        </View>
        {unlocked.length === 0 ? (
          <AppText className="py-6 text-center text-[12px] text-ink-soft">
            Suas conquistas aparecem aqui à medida que você evolui.
          </AppText>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {unlocked.map((a) => (
              <AchievementCard key={a.id} a={a} unlocked />
            ))}
          </View>
        )}
      </AppCard>

      {locked.length > 0 && (
        <AppCard className="gap-0">
          <View className="mb-3 flex-row items-center gap-2">
            <Lock size={16} color="#8B7280" />
            <AppText className="font-display text-[15px] font-semibold text-ink-soft">A conquistar</AppText>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {locked.map((a) => (
              <AchievementCard key={a.id} a={a} />
            ))}
          </View>
        </AppCard>
      )}
    </View>
  );
}

function AchievementCard({ a, unlocked }: { a: AchievementRow; unlocked?: boolean }) {
  return (
    <View
      className={`min-w-[47%] flex-1 rounded-2xl border p-3 ${unlocked ? 'border-primary/30 bg-white' : 'border-border bg-ink/5 opacity-70'}`}
    >
      <View className="flex-row items-center gap-2">
        <View className={`size-9 items-center justify-center rounded-xl ${unlocked ? 'bg-primary/10' : 'bg-ink/5'}`}>
          {unlocked ? <Award size={16} color="#FF4F93" /> : <Lock size={14} color="#8B7280" />}
        </View>
        <View className="min-w-0 flex-1">
          <AppText className="text-[12px] font-semibold" numberOfLines={1}>
            {a.title}
          </AppText>
          <AppText className="text-[10px] text-ink-soft">+{a.xp_reward} XP</AppText>
        </View>
      </View>
      {a.description ? (
        <AppText className="mt-1.5 text-[10px] text-ink-soft" numberOfLines={2}>
          {a.description}
        </AppText>
      ) : null}
    </View>
  );
}

// ============================================================
// SKELETON
// ============================================================
function SkeletonHero() {
  return (
    <View className="gap-4">
      <View className="h-44 rounded-[28px] bg-ink/5" />
      <View className="flex-row gap-2">
        {[0, 1, 2, 3].map((i) => (
          <View key={i} className="h-20 flex-1 rounded-2xl bg-ink/5" />
        ))}
      </View>
      <View className="h-12 rounded-2xl bg-ink/5" />
      <View className="h-40 rounded-3xl bg-ink/5" />
    </View>
  );
}
