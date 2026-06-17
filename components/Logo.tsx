import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from './ui';

export function Logo() {
  return (
    <View className="flex-row items-center gap-2">
      <LinearGradient
        colors={['#FF4F93', '#C084FC']}
        style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
      >
        <View className="size-3 rounded-full bg-white/90" />
      </LinearGradient>
      <AppText className="font-display text-xl font-semibold">
        Glow<AppText className="font-display text-xl font-semibold text-primary">Up</AppText>
      </AppText>
    </View>
  );
}
