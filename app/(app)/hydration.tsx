import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Circle } from 'react-native-svg';
import { ChevronLeft, Droplets, RotateCcw } from 'lucide-react-native';
import { AppText, AppCard } from '@/components/ui';
import { useStore } from '@/lib/store';
import { usePersonalization } from '@/hooks/use-personalization';
import { getDailyDerived, todayKeyBR } from '@/lib/daily-derived';
import { useHydrationActions } from '@/hooks/useHydrationActions';

function fmtL(ml: number) {
  return (ml / 1000).toFixed(2).replace('.', ',');
}

export default function HydrationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const { profile: pProfile } = usePersonalization();
  const { addWater, resetWater } = useHydrationActions();
  const [busy, setBusy] = useState(false);

  const today = todayKeyBR();
  const daily = getDailyDerived(state, pProfile, today);
  const { currentMl, goalMl, progressPct, remainingMl, complete } = daily.hydration;
  const weightKg = state.profile?.weightKg ?? 60;

  const handleAdd = async (ml: number) => {
    setBusy(true);
    try {
      await addWater(ml);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setBusy(true);
    try {
      await resetWater();
    } finally {
      setBusy(false);
    }
  };

  const r = 44;
  const c = 2 * Math.PI * r;
  const dash = `${(progressPct / 100) * c} ${c}`;

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
          <AppText className="font-display text-lg font-semibold">Hidratação</AppText>
          <AppText className="text-xs text-ink-soft">Hidratação Personalizada</AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 128, gap: 20 }}>
        <AppCard className="items-center gap-0 py-8">
          <View style={{ width: 112, height: 112 }}>
            <Svg width={112} height={112} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={50} cy={50} r={r} stroke="#F5DCE8" strokeWidth={10} fill="none" />
              <Circle
                cx={50}
                cy={50}
                r={r}
                stroke="#EC4899"
                strokeWidth={10}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={dash}
              />
            </Svg>
            <View className="absolute inset-0 items-center justify-center">
              <AppText className="font-display text-xl font-semibold leading-none">{fmtL(currentMl)}L</AppText>
              <AppText className="mt-1 text-[10px] text-ink-soft">de {(goalMl / 1000).toFixed(1).replace('.', ',')}L</AppText>
            </View>
          </View>

          <AppText className={`mt-5 text-[13px] font-semibold ${complete ? 'text-primary' : 'text-ink-soft'}`}>
            {complete ? 'Meta concluída ✓' : `Faltam ${(remainingMl / 1000).toFixed(2).replace('.', ',')}L hoje`}
          </AppText>

          <View className="mt-5 flex-row gap-2.5">
            <WaterBtn label="+250ml" onPress={() => handleAdd(250)} disabled={busy} />
            <WaterBtn label="+500ml" onPress={() => handleAdd(500)} disabled={busy} />
            <WaterBtn label="+1L" onPress={() => handleAdd(1000)} disabled={busy} primary />
          </View>

          <Pressable
            onPress={handleReset}
            disabled={busy}
            className="mt-4 flex-row items-center gap-1.5 rounded-full px-4 py-2"
            style={{ opacity: busy ? 0.6 : 1 }}
          >
            <RotateCcw size={13} color="#8B7280" />
            <AppText className="text-[12px] font-medium text-ink-soft">Resetar o dia</AppText>
          </Pressable>
        </AppCard>

        <AppCard className="flex-row items-start gap-3">
          <View className="size-9 items-center justify-center rounded-full bg-primary/10">
            <Droplets size={16} color="#FF4F93" />
          </View>
          <View className="flex-1">
            <AppText className="text-[13px] font-semibold">Sua meta personalizada</AppText>
            <AppText className="mt-1 text-[12px] leading-snug text-ink-soft">
              Calculada com base em {weightKg}kg de peso corporal, seguindo a recomendação de aproximadamente 35ml por kg.
            </AppText>
          </View>
        </AppCard>
      </ScrollView>
    </View>
  );
}

function WaterBtn({
  label, onPress, disabled, primary,
}: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`items-center rounded-2xl px-5 py-3 ${primary ? 'bg-primary' : 'bg-primary/10'}`}
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      <AppText className={`text-[13px] font-bold ${primary ? 'text-white' : 'text-primary'}`}>{label}</AppText>
    </Pressable>
  );
}
