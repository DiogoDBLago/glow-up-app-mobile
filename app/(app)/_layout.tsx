import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, runOnJS } from 'react-native-reanimated';
import { useStore } from '@/lib/store';
import { GlowBottomNav } from '@/components/GlowBottomNav';
import { SideDrawer } from '@/components/SideDrawer';
import { DrawerProvider } from '@/contexts/DrawerContext';

function PulsingCard({ height }: { height: number }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { height, borderRadius: 24, backgroundColor: '#EAEAEA', marginBottom: 16 },
        style,
      ]}
    />
  );
}

function LoadingSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 20,
        paddingTop: insets.top + 20,
        justifyContent: 'center',
      }}
    >
      <PulsingCard height={120} />
      <PulsingCard height={120} />
      <PulsingCard height={120} />
      <View
        style={{
          height: 64,
          borderRadius: 32,
          backgroundColor: '#EAEAEA',
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: insets.bottom + 24,
        }}
      />
    </View>
  );
}

export default function AppLayout() {
  const { state } = useStore();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const startX = useSharedValue(0);

  useEffect(() => {
    if (!state.bootHydrated) return;
    if (!state.authed) {
      router.replace('/(auth)/login');
      return;
    }
    if (!state.onboardingComplete) {
      router.replace('/(auth)/onboarding');
    }
  }, [state.bootHydrated, state.authed, state.onboardingComplete]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX(20)
    .failOffsetY([-10, 10])
    .onStart((e) => {
      startX.value = e.x;
    })
    .onEnd((e) => {
      if (e.translationX > 60 && startX.value < 30) {
        runOnJS(setDrawerOpen)(true);
      }
    });

  if (!state.bootHydrated) {
    return <LoadingSkeleton />;
  }

  return (
    <DrawerProvider openDrawer={() => setDrawerOpen(true)}>
      <GestureDetector gesture={swipeGesture}>
        <View style={{ flex: 1 }}>
          <Tabs tabBar={(props) => <GlowBottomNav {...props} />} screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="index" options={{ title: 'Início' }} />
            <Tabs.Screen name="treinos" options={{ title: 'Treino' }} />
            <Tabs.Screen name="diet" options={{ title: 'Dieta' }} />
            <Tabs.Screen name="cycle" options={{ title: 'Ciclo' }} />
            <Tabs.Screen name="progress" options={{ title: 'Evolução' }} />
            <Tabs.Screen name="fasting" options={{ href: null }} />
            <Tabs.Screen name="hydration" options={{ href: null }} />
          </Tabs>
          <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </View>
      </GestureDetector>
    </DrawerProvider>
  );
}
