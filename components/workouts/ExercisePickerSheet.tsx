import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { ArrowLeft, Check, Plus, Search, X } from 'lucide-react-native';
import { AppText, AppButton } from '@/components/ui';
import { EXERCISE_LIBRARY, MUSCLE_LABELS, DIFFICULTY_LABELS, type WMuscle } from '@/lib/data/exercise-library';
import type { Place } from '@/lib/store';

const CATEGORIES: { id: WMuscle; label: string; emoji: string }[] = [
  { id: 'glutes', label: 'Glúteos', emoji: '🍑' },
  { id: 'quads', label: 'Quadríceps', emoji: '🦵' },
  { id: 'hamstrings', label: 'Posteriores', emoji: '🦵' },
  { id: 'calves', label: 'Panturrilhas', emoji: '🦶' },
  { id: 'back', label: 'Costas', emoji: '🏋️‍♀️' },
  { id: 'chest', label: 'Peito', emoji: '💪' },
  { id: 'shoulders', label: 'Ombros', emoji: '🤸‍♀️' },
  { id: 'biceps', label: 'Bíceps', emoji: '💪' },
  { id: 'triceps', label: 'Tríceps', emoji: '💪' },
  { id: 'core', label: 'Core', emoji: '🔥' },
  { id: 'abs', label: 'Abdômen', emoji: '✨' },
  { id: 'full_body', label: 'Corpo todo', emoji: '⚡' },
];

const REST_OPTIONS = [30, 45, 60, 90, 120];

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (ids: string[], restSec: number) => void;
  place: Place;
};

export function ExercisePickerSheet({ open, onClose, onAdd, place }: Props) {
  const [category, setCategory] = useState<WMuscle | null>(null);
  const [search, setSearch] = useState('');
  const [placeFilter, setPlaceFilter] = useState<'all' | 'home' | 'gym'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [restSec, setRestSec] = useState<number>(60);

  const counts = useMemo(() => {
    const c: Partial<Record<WMuscle, number>> = {};
    for (const e of EXERCISE_LIBRARY) {
      if (place !== 'both' && e.place !== 'both' && e.place !== place) continue;
      c[e.muscle] = (c[e.muscle] ?? 0) + 1;
    }
    return c;
  }, [place]);

  const list = useMemo(() => {
    if (!category) return [];
    const q = search.trim().toLowerCase();
    return EXERCISE_LIBRARY.filter((e) => {
      if (e.muscle !== category) return false;
      if (place !== 'both' && e.place !== 'both' && e.place !== place) return false;
      if (placeFilter !== 'all' && e.place !== 'both' && e.place !== placeFilter) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [category, search, placeFilter, place]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function reset() {
    setCategory(null);
    setSearch('');
    setPlaceFilter('all');
    setSelected([]);
    setRestSec(60);
  }

  function add() {
    if (selected.length === 0) return;
    onAdd(selected, restSec);
    reset();
  }

  function close() {
    reset();
    onClose();
  }

  return (
    <Modal transparent visible={open} animationType="slide" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(42,27,46,0.4)' }} onPress={close} />
      <View className="max-h-[92%] rounded-t-3xl bg-white">
        {/* Header */}
        <View className="border-b border-border px-5 pb-3 pt-5">
          <View className="flex-row items-center gap-3">
            {category ? (
              <Pressable
                onPress={() => {
                  setCategory(null);
                  setSelected([]);
                  setSearch('');
                }}
                className="size-9 items-center justify-center rounded-full bg-ink/5"
              >
                <ArrowLeft size={16} color="#2A1B2E" />
              </Pressable>
            ) : null}
            <AppText className="flex-1 font-display text-xl font-bold">
              {category ? MUSCLE_LABELS[category] : 'Grupo muscular'}
            </AppText>
            <Pressable onPress={close} className="size-9 items-center justify-center rounded-full bg-ink/5">
              <X size={16} color="#2A1B2E" />
            </Pressable>
          </View>
          {category ? (
            <View className="mt-3 gap-2">
              <View className="flex-row items-center rounded-full bg-ink/5 px-3">
                <Search size={16} color="#8B7280" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar exercício..."
                  className="ml-2 flex-1 py-2.5 text-sm"
                />
              </View>
              <View className="flex-row gap-1.5">
                {(['all', 'home', 'gym'] as const).map((p) => {
                  const active = placeFilter === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setPlaceFilter(p)}
                      className={`flex-1 rounded-full py-1.5 ${active ? 'bg-primary' : 'bg-ink/5'}`}
                    >
                      <AppText
                        className={`text-center text-[12px] font-semibold ${active ? 'text-white' : 'text-ink-soft'}`}
                      >
                        {p === 'all' ? 'Todos' : p === 'home' ? 'Casa' : 'Academia'}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        {/* Body */}
        <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
          {!category ? (
            <View className="flex-row flex-wrap gap-3">
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  className="w-[47%] gap-2 rounded-3xl border border-border bg-white p-4"
                >
                  <AppText className="text-3xl">{cat.emoji}</AppText>
                  <AppText className="font-display text-base font-bold leading-tight">{cat.label}</AppText>
                  <AppText className="text-xs text-ink-soft">{counts[cat.id] ?? 0} exercícios</AppText>
                </Pressable>
              ))}
            </View>
          ) : (
            <View className="gap-2.5">
              {list.length === 0 ? (
                <AppText className="py-8 text-center text-sm text-ink-soft">
                  Nenhum exercício encontrado neste filtro.
                </AppText>
              ) : (
                list.map((e) => {
                  const sel = selected.includes(e.id);
                  const placeBadge = e.place === 'home' ? 'Casa' : e.place === 'gym' ? 'Academia' : 'Casa/Gym';
                  return (
                    <Pressable
                      key={e.id}
                      onPress={() => toggle(e.id)}
                      className={`flex-row gap-3 rounded-[20px] border p-3 ${
                        sel ? 'border-primary bg-primary/5' : 'border-border bg-white'
                      }`}
                    >
                      <Image source={{ uri: e.image }} style={{ width: 64, height: 64, borderRadius: 16 }} />
                      <View className="flex-1">
                        <AppText className="text-sm font-bold leading-tight">{e.name}</AppText>
                        <AppText className="mt-0.5 text-[11px] text-ink-soft">{MUSCLE_LABELS[e.muscle]}</AppText>
                        <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                          <View className="rounded-full bg-primary/10 px-2 py-0.5">
                            <AppText className="text-[10px] font-bold text-primary">{placeBadge}</AppText>
                          </View>
                          <View className="rounded-full bg-ink/5 px-2 py-0.5">
                            <AppText className="text-[10px] font-bold text-ink-soft">
                              {DIFFICULTY_LABELS[e.difficulty]}
                            </AppText>
                          </View>
                        </View>
                      </View>
                      <View
                        className={`size-8 self-center items-center justify-center rounded-full ${
                          sel ? 'bg-primary' : 'bg-ink/5'
                        }`}
                      >
                        {sel ? <Check size={16} color="#FFFFFF" /> : <Plus size={16} color="#FF4F93" />}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        {category ? (
          <View className="border-t border-border px-5 pb-5 pt-3">
            <AppText className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-soft">
              Descanso entre séries
            </AppText>
            <View className="flex-row gap-1.5">
              {REST_OPTIONS.map((r) => {
                const active = restSec === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRestSec(r)}
                    className={`flex-1 rounded-full py-2 ${active ? 'bg-primary' : 'bg-ink/5'}`}
                  >
                    <AppText className={`text-center text-[12px] font-bold ${active ? 'text-white' : 'text-ink-soft'}`}>
                      {r}s
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <AppButton
              label={`Adicionar${selected.length > 0 ? ` (${selected.length})` : ''}`}
              onPress={add}
              disabled={selected.length === 0}
              className="mt-3"
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
