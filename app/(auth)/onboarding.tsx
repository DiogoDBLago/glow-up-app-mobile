import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronLeft } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { AppText, AppButton, AppCard, AppTextInput } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { state, actions } = useOnboarding();
  const { step, i, progress, value, totalSteps } = state;
  const [showDatePicker, setShowDatePicker] = useState(false);

  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);
  const progressWidth = useSharedValue(progress);

  useEffect(() => {
    progressWidth.value = withTiming(progress, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  function animateAndRun(action: () => void, direction: 1 | -1) {
    opacity.value = withTiming(0, { duration: 140 }, () => {
      translateX.value = 16 * direction;
      runOnJS(action)();
      translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: 200 });
    });
  }

  const handleNext = () => animateAndRun(actions.next, 1);
  const handlePrev = () => animateAndRun(actions.prev, -1);

  if (!step) return null;

  const canContinue = (() => {
    if (step.type === 'choice') return !!value;
    if (step.type === 'multi') return Array.isArray(value) && value.length > 0;
    if (step.type === 'text') return typeof value === 'string' && value.trim().length > 0;
    if (step.type === 'number') return value !== '' && value !== null && value !== undefined && !Number.isNaN(Number(value));
    if (step.type === 'date') return !!value;
    return true;
  })();

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="px-5" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between">
          <Logo />
          <AppText className="text-xs text-ink-soft">
            {i + 1} de {totalSteps}
          </AppText>
        </View>
        <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
          <Animated.View
            style={[{ height: '100%', backgroundColor: '#FF4F93', borderRadius: 999 }, progressBarStyle]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={cardStyle}>
          <AppCard className="gap-0 p-7">
            <AppText className="text-xs font-semibold uppercase tracking-[2px] text-primary">
              {step.section}
            </AppText>
            <AppText className="mt-2 font-display text-2xl font-semibold">{step.title}</AppText>

            <View className="mt-6">
              {step.type === 'choice' ? (
                <View className="gap-3">
                  {step.options?.map((opt) => {
                    const active = value === opt.v;
                    return (
                      <Pressable
                        key={opt.v}
                        onPress={() => actions.selectChoice(opt.v)}
                        className={`rounded-2xl border px-4 py-3.5 ${
                          active ? 'border-primary bg-primary' : 'border-border bg-white'
                        }`}
                      >
                        <AppText className={active ? 'font-semibold text-white' : 'text-ink'}>
                          {opt.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {step.type === 'multi' ? (
                <View className="flex-row flex-wrap gap-3">
                  {step.options?.map((opt) => {
                    const active = Array.isArray(value) && value.includes(opt.v);
                    return (
                      <Pressable
                        key={opt.v}
                        onPress={() => actions.toggleMulti(opt.v)}
                        className={`w-[47%] rounded-2xl border px-3 py-3 ${
                          active ? 'border-primary bg-primary' : 'border-border bg-white'
                        }`}
                      >
                        <AppText
                          className={
                            active ? 'text-center text-sm font-semibold text-white' : 'text-center text-sm text-ink'
                          }
                        >
                          {opt.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {step.type === 'text' || step.type === 'number' ? (
                <AppTextInput
                  value={String(value ?? '')}
                  onChangeText={actions.setValue}
                  placeholder={step.placeholder ?? (step.suffix ? `Em ${step.suffix}` : undefined)}
                  keyboardType={step.type === 'number' ? 'numeric' : 'default'}
                />
              ) : null}

              {step.type === 'date' ? (
                <View>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    className="rounded-2xl border border-border bg-white px-4 py-3.5"
                  >
                    <AppText className={value ? 'text-ink' : 'text-ink-soft'}>
                      {value ? value : 'Selecionar data'}
                    </AppText>
                  </Pressable>
                  {showDatePicker ? (
                    <DateTimePicker
                      value={value ? new Date(value) : new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      onChange={(_, selectedDate) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (selectedDate) {
                          actions.setValue(selectedDate.toISOString().slice(0, 10));
                        }
                      }}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          </AppCard>
        </Animated.View>
      </ScrollView>

      <View className="gap-3 px-5" style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="flex-row items-center gap-3">
          {i > 0 ? (
            <Pressable
              onPress={handlePrev}
              className="size-12 items-center justify-center rounded-full border border-border bg-white"
            >
              <ChevronLeft size={20} color="#2A1B2E" />
            </Pressable>
          ) : null}
          <AppButton
            label={i === totalSteps - 1 ? 'Entrar' : 'Continuar'}
            variant="dark"
            onPress={handleNext}
            disabled={!canContinue}
            className="flex-1"
          />
        </View>
        <Pressable onPress={handleNext} className="items-center py-1">
          <AppText className="text-xs text-ink-soft">Pular esta pergunta</AppText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
