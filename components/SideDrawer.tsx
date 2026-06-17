import { useEffect, useState, type ComponentType } from 'react';
import { Modal, Pressable, View, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import {
  Droplets,
  Clock,
  CalendarHeart,
  Apple,
  Dumbbell,
  Ruler,
  Camera,
  BarChart3,
  Trophy,
  ListChecks,
  BellRing,
  User,
  Shield,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react-native';
import { AppText } from './ui';
import { useStore } from '@/lib/store';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.88, 360);

type IconComponent = ComponentType<{ size?: number; color?: string }>;

interface DrawerItem {
  label: string;
  href: string;
  icon: IconComponent;
}
interface DrawerSection {
  title: string;
  items: DrawerItem[];
}

const SECTIONS: DrawerSection[] = [
  {
    title: 'Minha Rotina',
    items: [
      { label: 'Hidratação', href: '/(app)/hydration', icon: Droplets },
      { label: 'Jejum', href: '/(app)/fasting', icon: Clock },
      { label: 'Calendário do Ciclo', href: '/(app)/cycle', icon: CalendarHeart },
      { label: 'Nutrição', href: '/(app)/diet', icon: Apple },
      { label: 'Treinos', href: '/(app)/treinos', icon: Dumbbell },
    ],
  },
  {
    title: 'Meu Progresso',
    items: [
      { label: 'Medidas corporais', href: '/(app)/progress/measurements', icon: Ruler },
      { label: 'Fotos de progresso', href: '/(app)/photos', icon: Camera },
      { label: 'Relatórios & Insights', href: '/(app)/progress', icon: BarChart3 },
      { label: 'Conquistas', href: '/(app)/achievements', icon: Trophy },
      { label: 'Missões', href: '/(app)/missions', icon: ListChecks },
    ],
  },
  {
    title: 'Ferramentas GlowUp',
    items: [{ label: 'Lembretes inteligentes', href: '/(app)/notifications', icon: BellRing }],
  },
  {
    title: 'Conta',
    items: [
      { label: 'Perfil', href: '/(app)/profile', icon: User },
      { label: 'Notificações', href: '/(app)/notifications', icon: BellRing },
      { label: 'Segurança', href: '/(app)/security', icon: Shield },
      { label: 'Personalização', href: '/(app)/tips', icon: Settings },
    ],
  },
];

export function SideDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, signOut } = useStore();
  const [visible, setVisible] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ 'Minha Rotina': true });
  const translateX = useSharedValue(-DRAWER_WIDTH);

  useEffect(() => {
    if (open) {
      setVisible(true);
      translateX.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    } else {
      translateX.value = withTiming(
        -DRAWER_WIDTH,
        { duration: 240, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setVisible)(false);
        },
      );
    }
  }, [open]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const toggleSection = (title: string) =>
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));

  const navigateTo = (href: string) => {
    onClose();
    router.push(href as Parameters<typeof router.push>[0]);
  };

  const handleLogout = async () => {
    onClose();
    await signOut();
    router.replace('/(auth)/login');
  };

  if (!visible) return null;

  const initial = (state.profile?.name ?? 'G')[0]?.toUpperCase();

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <BlurView intensity={30} tint="dark" style={{ flex: 1 }} />
      </Pressable>
      <Animated.View
        style={[
          { position: 'absolute', top: 0, bottom: 0, left: 0, width: DRAWER_WIDTH, backgroundColor: '#FFFFFF' },
          drawerStyle,
        ]}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 20,
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
          }}
        >
          <View className="flex-row items-center gap-3 border-b border-border pb-4">
            <View className="size-12 items-center justify-center rounded-full bg-primary/10">
              <AppText className="font-display text-lg font-semibold text-primary">{initial}</AppText>
            </View>
            <View>
              <AppText className="font-display text-base font-semibold">{state.profile?.name ?? 'Você'}</AppText>
              {state.streak > 0 ? (
                <AppText className="text-xs text-ink-soft">🔥 {state.streak} dias de sequência</AppText>
              ) : null}
            </View>
          </View>

          {SECTIONS.map((section) => (
            <View key={section.title} className="mt-3">
              <Pressable
                onPress={() => toggleSection(section.title)}
                className="flex-row items-center justify-between py-2.5"
              >
                <AppText className="font-display text-sm font-semibold text-ink-soft">{section.title}</AppText>
                <ChevronDown size={16} color="#8B7280" />
              </Pressable>
              {openSections[section.title]
                ? section.items.map((item) => (
                    <Pressable
                      key={item.href}
                      onPress={() => navigateTo(item.href)}
                      className="flex-row items-center gap-3 rounded-2xl px-2 py-2.5"
                    >
                      <View className="size-9 items-center justify-center rounded-xl bg-primary/10">
                        <item.icon size={16} color="#FF4F93" />
                      </View>
                      <AppText className="font-display text-sm">{item.label}</AppText>
                    </Pressable>
                  ))
                : null}
            </View>
          ))}

          <Pressable onPress={handleLogout} className="mt-4 flex-row items-center gap-3 rounded-2xl px-2 py-2.5">
            <View className="size-9 items-center justify-center rounded-xl bg-destructive/10">
              <LogOut size={16} color="#EF4444" />
            </View>
            <AppText className="font-display text-sm text-destructive">Sair</AppText>
          </Pressable>

          <AppText className="mt-6 text-center text-xs text-ink-soft">
            Pequenos rituais, grandes transformações
          </AppText>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
