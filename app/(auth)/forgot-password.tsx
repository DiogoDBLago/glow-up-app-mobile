import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { AppText, AppButton, AppCard, AppTextInput } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { supabase } from '@/supabase/client';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!email) {
      setErr('Digite seu e-mail');
      return;
    }
    setLoading(true);
    setErr('');
    const redirectUrl = Linking.createURL('/reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-row items-center gap-2 px-5" style={{ paddingTop: insets.top + 16, paddingBottom: 16 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
          className="size-10 items-center justify-center rounded-full border border-border bg-white"
        >
          <ChevronLeft size={20} color="#2A1B2E" />
        </Pressable>
        <Logo />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <AppCard className="gap-0">
          <AppText className="font-display text-3xl font-semibold">Esqueci minha senha</AppText>
          <AppText className="mt-1 text-sm text-ink-soft">
            Te enviamos um link para criar uma nova senha.
          </AppText>

          <View className="mt-6 gap-3">
            <AppTextInput
              placeholder="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {err ? <AppText className="mt-2 text-xs text-destructive">{err}</AppText> : null}
          {sent ? (
            <AppText className="mt-2 text-xs text-primary">
              Enviamos um link para {email}. Confira sua caixa de entrada.
            </AppText>
          ) : null}

          <AppButton
            label={loading ? 'Enviando...' : 'Enviar link'}
            variant="dark"
            onPress={submit}
            isLoading={loading}
            disabled={sent}
            className="mt-5"
          />
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
