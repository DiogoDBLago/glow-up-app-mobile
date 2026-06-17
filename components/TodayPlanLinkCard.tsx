import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, CalendarHeart } from 'lucide-react-native';
import { AppText } from './ui';

/**
 * Premium pill card linking to the Today Plan route.
 * White background, pink icon on the left, arrow on the right.
 */
export function TodayPlanLinkCard() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/today' as never)}
      className="w-full flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 shadow-petal"
    >
      <View className="flex-row items-center gap-3">
        <View className="size-9 items-center justify-center rounded-xl bg-primary/10">
          <CalendarHeart size={18} color="#FF4F93" />
        </View>
        <AppText className="text-[14px] font-semibold">Ver Meu Plano de Hoje</AppText>
      </View>
      <ArrowRight size={16} color="rgba(42,27,46,0.4)" />
    </Pressable>
  );
}
