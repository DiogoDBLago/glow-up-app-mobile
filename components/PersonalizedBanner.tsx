import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { AppText } from './ui';
import { usePersonalization } from '@/hooks/use-personalization';

interface Props {
  area: 'home' | 'workouts' | 'diet' | 'fasting' | 'cycle';
}

/**
 * Premium card that adapts copy to the user's goal and current cycle phase.
 * Renders nothing until personalization is loaded to avoid flashing defaults.
 */
export function PersonalizedBanner({ area }: Props) {
  const router = useRouter();
  const { recommendations, profile, loaded } = usePersonalization();
  if (!loaded) return null;

  const { phase, phaseLabel, goalLabel } = recommendations;

  let title = recommendations.homeMessage;
  let body = recommendations.hormoneAlert;
  let highlight = goalLabel;

  if (area === 'workouts') {
    title = `Treino sugerido: ${recommendations.workoutFocus}`;
    body = `Intensidade ${recommendations.workoutIntensity} · foco em ${goalLabel.toLowerCase()}`;
    highlight = phase ? `Fase ${phaseLabel}` : goalLabel;
  } else if (area === 'diet') {
    title = 'Nutrição do dia';
    body = recommendations.nutritionFocus;
    highlight = phase ? `${goalLabel} · ${phaseLabel}` : goalLabel;
  } else if (area === 'fasting') {
    title = 'Jejum hoje';
    body = recommendations.fastingAdvice;
    highlight = phase ? `Fase ${phaseLabel}` : goalLabel;
  } else if (area === 'cycle') {
    title = phase ? `Você está na fase ${phaseLabel}` : 'Configure seu ciclo';
    body = recommendations.hormoneAlert;
    highlight = goalLabel;
  }

  const showQuizCta = !profile?.goal && !profile?.last_period_date;

  return (
    <View className="rounded-3xl border border-border bg-white p-5 shadow-petal">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-1.5">
          <Sparkles size={14} color="#FF4F93" />
          <AppText className="text-[10px] font-bold uppercase tracking-[2px] text-primary">Para você</AppText>
        </View>
        <AppText className="text-[10px] font-medium text-ink-soft">{highlight}</AppText>
      </View>
      <AppText className="mt-2 font-display text-[17px] font-semibold leading-snug">{title}</AppText>
      <AppText className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{body}</AppText>
      {showQuizCta ? (
        <Pressable onPress={() => router.push('/(auth)/onboarding')} className="mt-3">
          <AppText className="text-[12px] font-semibold text-primary">Completar perfil hormonal →</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
