import { useEffect, useState, type ComponentType } from 'react';
import { View, Pressable, type LayoutChangeEvent } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Home, Dumbbell, Apple, CalendarHeart, Sparkles } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AppText } from './ui';

type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const ICONS: Record<string, IconComponent> = {
  index: Home,
  treinos: Dumbbell,
  diet: Apple,
  cycle: CalendarHeart,
  progress: Sparkles,
};

const LABELS: Record<string, string> = {
  index: 'Início',
  treinos: 'Treino',
  diet: 'Dieta',
  cycle: 'Ciclo',
  progress: 'Evolução',
};

function TabButton({
  routeName,
  focused,
  onPress,
}: {
  routeName: string;
  focused: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const Icon = ICONS[routeName] ?? Home;
  const color = focused ? '#FFFFFF' : 'rgba(42,27,46,0.55)';

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withTiming(0.88, { duration: 80 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 2 }}
    >
      <Animated.View style={animStyle}>
        <Icon size={20} color={color} strokeWidth={focused ? 2.4 : 1.8} />
      </Animated.View>
      <AppText style={{ fontSize: 11, color }}>{LABELS[routeName] ?? routeName}</AppText>
    </Pressable>
  );
}

export function GlowBottomNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [containerWidth, setContainerWidth] = useState(0);
  const pillX = useSharedValue(0);
  const tabWidth = containerWidth / Math.max(state.routes.length, 1);

  useEffect(() => {
    if (containerWidth > 0) {
      pillX.value = withTiming(state.index * tabWidth, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [state.index, containerWidth, tabWidth]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: tabWidth,
  }));

  const onLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        paddingBottom: insets.bottom || 12,
      }}
    >
      <View style={{ width: '92%', maxWidth: 448 }} onLayout={onLayout}>
        <BlurView
          intensity={80}
          tint="light"
          style={{
            borderRadius: 32,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.06)',
          }}
        >
          <View style={{ flexDirection: 'row' }}>
            {containerWidth > 0 && (
              <Animated.View
                style={[
                  { position: 'absolute', top: 6, bottom: 6, left: 0, borderRadius: 24, overflow: 'hidden' },
                  pillStyle,
                ]}
              >
                <LinearGradient colors={['#DB2777', '#FF4F93']} style={{ flex: 1 }} />
              </Animated.View>
            )}
            {state.routes.map((route, index) => (
              <TabButton
                key={route.key}
                routeName={route.name}
                focused={state.index === index}
                onPress={() => navigation.navigate(route.name)}
              />
            ))}
          </View>
        </BlurView>
      </View>
    </View>
  );
}
