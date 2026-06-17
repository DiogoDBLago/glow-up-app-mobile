import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Trash2 } from 'lucide-react-native';
import { AppText, AppCard } from '@/components/ui';
import { supabase } from '@/supabase/client';
import { MOODS, SYMPTOMS, ENERGY_LEVELS, FLOWS } from '@/lib/cycle-insights';
import { usePersonalization } from '@/hooks/use-personalization';
import { getCurrentCyclePhase } from '@/lib/personalization';
import { emitGlobalSync } from '@/lib/sync';

function todayBR() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default function CheckinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = usePersonalization();
  const today = useMemo(() => todayBR(), []);
  const cycle = useMemo(() => (profile ? getCurrentCyclePhase(profile, today) : null), [profile, today]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mood, setMood] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [energy, setEnergy] = useState<string | null>(null);
  const [flow, setFlow] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [existingId, setExistingId] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('cycle_daily_logs')
        .select('*')
        .eq('user_id', u.user.id)
        .eq('date', today)
        .maybeSingle();
      if (data) {
        setExistingId(data.id);
        setMood(data.mood ?? null);
        setSymptoms(data.symptoms ?? []);
        setEnergy(data.energy_level ?? null);
        setFlow(data.menstrual_flow ?? null);
        setNotes(data.notes ?? '');
      }
      setLoading(false);
    })();
  }, [today]);

  const toggleSymptom = (id: string) => setSymptoms((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function save() {
    setSaving(true);
    setSavedMsg('');
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setSaving(false);
      return;
    }
    const payload = {
      user_id: u.user.id,
      date: today,
      cycle_day: cycle?.cycleDay ?? null,
      cycle_phase: cycle?.phase ?? null,
      mood,
      symptoms,
      energy_level: energy,
      menstrual_flow: flow,
      notes: notes.trim() || null,
    };
    const { error } = await supabase.from('cycle_daily_logs').upsert(payload, { onConflict: 'user_id,date' });
    setSaving(false);
    if (error) {
      setSavedMsg('Erro ao salvar. Tente de novo.');
      return;
    }
    emitGlobalSync({ source: 'cycle:checkin:save', domains: ['cycle', 'checkins', 'missions', 'reports'] });
    setSavedMsg('Check-in salvo');
    setTimeout(() => router.replace('/(app)/cycle'), 700);
  }

  async function remove() {
    if (!existingId) return;
    setSaving(true);
    await supabase.from('cycle_daily_logs').delete().eq('id', existingId);
    setSaving(false);
    emitGlobalSync({ source: 'cycle:checkin:delete', domains: ['cycle', 'checkins', 'missions', 'reports'] });
    router.replace('/(app)/cycle');
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-5" style={{ paddingTop: insets.top + 16, paddingBottom: 8 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/cycle'))}
          className="size-10 items-center justify-center rounded-full border border-border bg-white"
        >
          <ArrowLeft size={18} color="#2A1B2E" />
        </Pressable>
        <View className="items-center">
          <AppText className="text-[10px] font-bold uppercase tracking-[2px] text-primary">CHECK-IN DIÁRIO</AppText>
          <AppText className="font-display text-lg font-bold">Como você está hoje?</AppText>
          <AppText className="mt-0.5 text-[10px] text-ink-soft">
            Registrando {today.split('-').reverse().join('/')} · horário de Brasília
          </AppText>
        </View>
        <View className="size-10" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FF4F93" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Section title="Humor">
            <View className="flex-row flex-wrap gap-2">
              {MOODS.map((m) => {
                const active = mood === m.id;
                return (
                  <Chip key={m.id} active={active} onPress={() => setMood(active ? null : m.id)} style={{ width: '22%' }}>
                    <AppText className="text-xl">{m.emoji}</AppText>
                    <AppText className="mt-1 text-[10px]">{m.label}</AppText>
                  </Chip>
                );
              })}
            </View>
          </Section>

          <Section title="Sintomas" hint="Toque em todos que sentir">
            <View className="flex-row flex-wrap gap-2">
              {SYMPTOMS.map((s) => {
                const active = symptoms.includes(s.id);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => toggleSymptom(s.id)}
                    className={`rounded-full border px-3 py-2 ${active ? 'border-primary bg-primary' : 'border-border bg-white'}`}
                  >
                    <AppText className={`text-xs font-semibold ${active ? 'text-white' : 'text-ink'}`}>{s.label}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="Energia">
            <View className="flex-row gap-2">
              {ENERGY_LEVELS.map((e) => {
                const active = energy === e.id;
                return (
                  <Chip key={e.id} active={active} onPress={() => setEnergy(active ? null : e.id)} style={{ flex: 1 }}>
                    <AppText className="text-xl">{e.emoji}</AppText>
                    <AppText className="mt-1 text-xs font-bold">{e.label}</AppText>
                  </Chip>
                );
              })}
            </View>
          </Section>

          <Section title="Fluxo menstrual">
            <View className="flex-row flex-wrap gap-2">
              {FLOWS.map((f) => {
                const active = flow === f.id;
                return (
                  <Chip key={f.id} active={active} onPress={() => setFlow(active ? null : f.id)} style={{ width: '22%' }}>
                    <AppText className="text-xs font-bold">{f.label}</AppText>
                  </Chip>
                );
              })}
            </View>
          </Section>

          <Section title="Notas (opcional)">
            <TextInput
              value={notes}
              onChangeText={(t) => setNotes(t.slice(0, 500))}
              maxLength={500}
              multiline
              numberOfLines={3}
              placeholder="Algo que queira lembrar sobre hoje..."
              className="rounded-2xl border border-border bg-white p-3 text-sm"
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          </Section>

          {savedMsg ? <AppText className="text-center text-sm font-semibold text-primary">{savedMsg}</AppText> : null}

          <View className="gap-2 pt-1">
            <Pressable
              onPress={save}
              disabled={saving}
              className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-4"
              style={{ opacity: saving ? 0.6 : 1 }}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Check size={16} color="#FFFFFF" />}
              <AppText className="font-bold text-white">{existingId ? 'Atualizar check-in' : 'Salvar check-in'}</AppText>
            </Pressable>
            {existingId ? (
              <Pressable onPress={remove} disabled={saving} className="flex-row items-center justify-center gap-1.5 py-2">
                <Trash2 size={12} color="#8B7280" />
                <AppText className="text-xs font-semibold text-ink-soft">Apagar registro de hoje</AppText>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <AppCard className="gap-0">
      <View className="mb-3 flex-row items-baseline justify-between">
        <AppText className="font-display text-base font-bold">{title}</AppText>
        {hint ? <AppText className="text-[10px] text-ink-soft">{hint}</AppText> : null}
      </View>
      {children}
    </AppCard>
  );
}

function Chip({
  active,
  onPress,
  children,
  style,
}: {
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={style}
      className={`items-center justify-center rounded-2xl border px-2 py-3 ${
        active ? 'border-primary bg-primary/10' : 'border-border bg-ink/5'
      }`}
    >
      {children}
    </Pressable>
  );
}
