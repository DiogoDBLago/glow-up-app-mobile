import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { AppText, AppButton, AppCard, AppTextInput } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { GoogleIcon } from '@/components/GoogleIcon';
import { supabase } from '@/supabase/client';
import { useStore } from '@/lib/store';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const invalidCreds = err.includes('incorretos');

  // Só navega depois que o store confirma authed=true (o listener de auth do
  // store é assíncrono — navegar direto após signInWithPassword cria uma race
  // em que o guard de (app)/_layout.tsx ainda vê authed=false e devolve pro login).
  useEffect(() => {
    if (state.authed) {
      router.replace('/');
    }
  }, [state.authed]);

  async function submit() {
    if (honeypot) {
      // Honeypot triggered: simulate a generic network delay/error without
      // revealing to a bot that this was detected as automated traffic.
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setErr('Ocorreu um erro temporário de rede. Tente novamente em instantes.');
      }, 1200);
      return;
    }
    if (!email || !password) {
      setErr('Preencha e-mail e senha');
      return;
    }
    setLoading(true);
    setErr('');
    setResetSent(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid login') || msg.includes('invalid_credentials')) {
        setErr(
          'E-mail ou senha incorretos. Se você criou sua conta com Google, entre com Google ou crie uma senha Glow Up abaixo.'
        );
      } else {
        setErr(error.message);
      }
      return;
    }
    // Navegação acontece no useEffect acima quando state.authed virar true.
  }

  async function sendResetLink() {
    if (!email) {
      setErr('Digite seu e-mail primeiro');
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
    setResetSent(true);
  }

  async function google() {
    setLoading(true);
    setErr('');
    const redirectUrl = Linking.createURL('/');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });
    if (error || !data?.url) {
      setErr('Não foi possível entrar com Google');
      setLoading(false);
      return;
    }
    await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-row items-center gap-2 px-5" style={{ paddingTop: insets.top + 16, paddingBottom: 16 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
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
          <AppText className="font-display text-3xl font-semibold">Bem-vinda de volta</AppText>
          <AppText className="mt-1 text-sm text-ink-soft">Sentimos sua falta, linda.</AppText>

          <Pressable
            onPress={google}
            disabled={loading}
            className="mt-6 flex-row items-center justify-center gap-2 rounded-full border border-border bg-white py-3.5"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <GoogleIcon />
            <AppText className="font-medium">Continuar com Google</AppText>
          </Pressable>

          <View className="my-4 flex-row items-center gap-2">
            <View className="h-px flex-1 bg-border" />
            <AppText className="text-xs text-ink-soft">ou</AppText>
            <View className="h-px flex-1 bg-border" />
          </View>

          <View className="gap-3">
            {/* Honeypot field: invisible to real users, only bots fill hidden inputs */}
            <TextInput
              value={honeypot}
              onChangeText={setHoneypot}
              autoComplete="off"
              accessible={false}
              style={{ height: 0, width: 0, position: 'absolute' }}
              tabIndex={-1}
            />
            <AppTextInput
              placeholder="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AppTextInput
              placeholder="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {err ? <AppText className="mt-2 text-xs text-destructive">{err}</AppText> : null}
          {resetSent ? (
            <AppText className="mt-2 text-xs text-primary">
              Enviamos um link para {email}. Abra o e-mail para criar sua senha Glow Up.
            </AppText>
          ) : null}

          {invalidCreds && !resetSent ? (
            <AppButton
              label="Enviar link para criar senha"
              variant="secondary"
              onPress={sendResetLink}
              disabled={loading}
              className="mt-3"
            />
          ) : null}

          <AppButton
            label={loading ? 'Entrando...' : 'Entrar'}
            variant="dark"
            onPress={submit}
            isLoading={loading}
            className="mt-5"
          />

          <View className="mt-4 flex-row items-center justify-between">
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable>
                <AppText className="text-xs text-primary">Esqueci minha senha</AppText>
              </Pressable>
            </Link>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <AppText className="text-xs text-ink-soft">Criar conta</AppText>
              </Pressable>
            </Link>
          </View>
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
