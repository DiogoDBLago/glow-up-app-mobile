import { useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowRight, Check, Flame, Pause, Play, SkipForward, Timer } from 'lucide-react-native';
import { AppText, AppButton } from '@/components/ui';
import { MediaPlaceholder } from '@/components/workouts/MediaPlaceholder';
import { useStore } from '@/lib/store';
import { MUSCLE_LABELS } from '@/lib/data/exercise-library';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';

export default function SessionScreen() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const plan = state.userPlan;
  const baseDay = plan?.days.find((d) => d.id === dayId) ?? null;
  const day = baseDay;

  const {
    state: {
      idx,
      entry,
      restLeft,
      paused,
      finished,
      planEx,
      lib,
      displayImage,
      progress,
      elapsedMin,
      runningKcal,
      doneSets,
      allSetsDone,
    },
    actions: { setIdx, setRestLeft, setPaused, updateSet, completeSet, nextExercise, finish },
  } = useWorkoutSession({
    plan,
    baseDay,
    day,
    dayId: dayId ?? '',
    resolvedVariant: 'original',
    adaptiveCtx: null,
    adaptation: null,
  });

  if (!plan || !baseDay) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 40 }}>
        <AppText className="text-center text-sm text-ink-soft">Treino não encontrado.</AppText>
      </View>
    );
  }

  if (!day || day.exercises.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white px-6" style={{ paddingTop: insets.top }}>
        <AppText className="text-center text-sm text-ink-soft">Este dia ainda não tem exercícios.</AppText>
        <AppButton label="Voltar ao plano" onPress={() => router.replace('/treino/meu-plano')} />
      </View>
    );
  }

  if (!planEx) return null;

  if (finished) {
    return (
      <View className="flex-1 bg-white px-6" style={{ paddingTop: insets.top + 48 }}>
        <View className="items-center gap-4">
          <LinearGradient
            colors={['#EC4899', '#A855F7']}
            style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <AppText className="text-4xl">✨</AppText>
          </LinearGradient>
          <AppText className="font-display text-2xl font-semibold">Treino concluído!</AppText>
          <AppText className="text-center text-sm text-ink-soft">Parabéns! Seu corpo agradece esse cuidado.</AppText>
          <View className="flex-row gap-2">
            <Big label="Tempo" value={`${elapsedMin}m`} />
            <Big label="Kcal" value={`${runningKcal}`} />
            <Big label="Séries" value={`${doneSets}`} />
          </View>
          <View className="w-full gap-2 pt-2">
            <AppButton label="Voltar" variant="dark" onPress={() => router.replace('/(app)/treinos')} />
            <AppButton label="Ver meu plano" variant="outline" onPress={() => router.replace('/treino/meu-plano')} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center gap-2 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 8 }}>
        <Pressable
          onPress={() => router.replace('/treino/meu-plano')}
          className="size-10 items-center justify-center rounded-full border border-border bg-white"
        >
          <ArrowLeft size={18} color="#2A1B2E" />
        </Pressable>
        <AppText className="font-display text-lg font-semibold" numberOfLines={1}>
          {day.name}
        </AppText>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}>
        {/* Progress */}
        <View className="gap-1.5">
          <View className="flex-row justify-between">
            <AppText className="text-[11px] text-ink-soft">
              Exercício {idx + 1} de {day.exercises.length}
            </AppText>
            <AppText className="text-[11px] text-ink-soft">{progress}%</AppText>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-primary/10">
            <LinearGradient colors={['#EC4899', '#A855F7']} style={{ height: '100%', width: `${progress}%` }} />
          </View>
          <View className="flex-row justify-between pt-1">
            <View className="flex-row items-center gap-1">
              <Timer size={12} color="#8B7280" />
              <AppText className="text-[11px] text-ink-soft">{elapsedMin} min</AppText>
            </View>
            <View className="flex-row items-center gap-1">
              <Flame size={12} color="#FF4F93" />
              <AppText className="text-[11px] text-ink-soft">~{runningKcal} kcal</AppText>
            </View>
          </View>
        </View>

        {/* Exercise card */}
        <View className="overflow-hidden rounded-3xl border border-border bg-white">
          <View className="aspect-[16/10] items-center justify-center bg-ink/5">
            {displayImage ? (
              <Image source={{ uri: displayImage }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <MediaPlaceholder style={{ width: '100%', height: '100%' }} />
            )}
          </View>
          <View className="p-4">
            <AppText className="text-[10px] font-bold uppercase tracking-widest text-primary">Agora</AppText>
            <AppText className="mt-1 font-display text-xl font-semibold capitalize">
              {lib?.name ?? planEx.exerciseId}
            </AppText>
            <AppText className="mt-0.5 text-[12px] text-ink-soft">{lib ? MUSCLE_LABELS[lib.muscle] : ''}</AppText>
            {planEx.notes ? (
              <AppText className="mt-2 rounded-xl bg-primary/5 px-3 py-2 text-[12px] text-primary">
                📝 {planEx.notes}
              </AppText>
            ) : null}
          </View>
        </View>

        {/* Sets */}
        <View className="gap-2 rounded-2xl border border-border bg-white p-3">
          <View className="flex-row px-2">
            <AppText className="w-[16%] text-[10px] font-semibold uppercase tracking-widest text-ink-soft">Set</AppText>
            <AppText className="w-[34%] text-[10px] font-semibold uppercase tracking-widest text-ink-soft">Kg</AppText>
            <AppText className="w-[34%] text-[10px] font-semibold uppercase tracking-widest text-ink-soft">Reps</AppText>
            <AppText className="w-[16%] text-right text-[10px] font-semibold uppercase tracking-widest text-ink-soft">
              ✓
            </AppText>
          </View>
          {entry?.sets.map((s, i) => (
            <View key={i} className={`flex-row items-center gap-2 rounded-xl p-2 ${s.done ? 'bg-primary/10' : 'bg-primary/5'}`}>
              <AppText className="w-[16%] text-center font-bold text-primary">{i + 1}</AppText>
              <TextInput
                value={s.weightKg ? String(s.weightKg) : ''}
                onChangeText={(v) => updateSet(i, { weightKg: Number(v) || 0 })}
                keyboardType="numeric"
                placeholder="0"
                className="w-[34%] rounded-lg bg-white px-2 py-1.5 text-sm"
              />
              <TextInput
                value={s.reps ? String(s.reps) : ''}
                onChangeText={(v) => updateSet(i, { reps: Number(v) || 0 })}
                keyboardType="numeric"
                placeholder={planEx.reps}
                className="w-[34%] rounded-lg bg-white px-2 py-1.5 text-sm"
              />
              <Pressable
                onPress={() => (s.done ? updateSet(i, { done: false }) : completeSet(i))}
                className={`ml-auto size-8 items-center justify-center rounded-full ${
                  s.done ? 'bg-primary' : 'border border-primary/30 bg-white'
                }`}
              >
                <Check size={16} color={s.done ? '#FFFFFF' : '#FF4F93'} />
              </Pressable>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View className="flex-row gap-2">
          {idx > 0 ? (
            <Pressable
              onPress={() => {
                setIdx(idx - 1);
                setRestLeft(0);
              }}
              className="items-center justify-center rounded-full border border-border bg-white px-4 py-3"
            >
              <ArrowLeft size={16} color="#2A1B2E" />
            </Pressable>
          ) : null}
          {allSetsDone ? (
            <Pressable onPress={nextExercise} style={{ flex: 1, overflow: 'hidden', borderRadius: 999 }}>
              <LinearGradient
                colors={['#EC4899', '#A855F7']}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 }}
              >
                <AppText className="font-semibold text-white">
                  {idx === day.exercises.length - 1 ? 'Finalizar treino' : 'Próximo exercício'}
                </AppText>
                <ArrowRight size={16} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                setIdx(Math.min(day.exercises.length - 1, idx + 1));
                setRestLeft(0);
              }}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-border bg-white py-3.5"
            >
              <SkipForward size={16} color="#2A1B2E" />
              <AppText className="text-sm font-semibold">Pular</AppText>
            </Pressable>
          )}
        </View>

        <Pressable onPress={finish} className="items-center rounded-full bg-primary/5 py-2.5">
          <AppText className="text-[12px] text-ink-soft">Finalizar treino agora</AppText>
        </Pressable>
      </ScrollView>

      {/* Rest overlay */}
      <Modal transparent visible={restLeft > 0} animationType="fade" onRequestClose={() => setRestLeft(0)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(42,27,46,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onPress={() => setRestLeft(0)}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 360 }}>
            <LinearGradient colors={['#EC4899', '#A855F7']} style={{ borderRadius: 24, padding: 32, alignItems: 'center' }}>
              <AppText className="text-[11px] uppercase tracking-widest text-white/85">Descanso</AppText>
              <AppText className="mt-2 font-display text-7xl font-semibold text-white">{restLeft}s</AppText>
              <View className="mt-5 flex-row flex-wrap justify-center gap-2">
                {[30, 60, 90, 120].map((t) => (
                  <Pressable key={t} onPress={() => setRestLeft(t)} className="rounded-full bg-white/20 px-3 py-1.5">
                    <AppText className="text-[11px] font-semibold text-white">{t}s</AppText>
                  </Pressable>
                ))}
              </View>
              <View className="mt-4 flex-row gap-2">
                <Pressable
                  onPress={() => setPaused((p) => !p)}
                  className="size-11 items-center justify-center rounded-full bg-white/20"
                >
                  {paused ? <Play size={16} color="#FFFFFF" /> : <Pause size={16} color="#FFFFFF" />}
                </Pressable>
                <Pressable onPress={() => setRestLeft(0)} className="rounded-full bg-white px-5 justify-center">
                  <AppText className="text-sm font-semibold text-ink">Pular</AppText>
                </Pressable>
              </View>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center rounded-2xl border border-border bg-white p-3" style={{ minWidth: 88 }}>
      <AppText className="font-display text-2xl font-semibold">{value}</AppText>
      <AppText className="mt-1 text-[10px] uppercase tracking-widest text-ink-soft">{label}</AppText>
    </View>
  );
}
