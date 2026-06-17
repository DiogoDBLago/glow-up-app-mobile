import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
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

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  // Mesma race do login: só navega quando o store confirmar authed=true.
  useEffect(() => {
    if (state.authed) {
      router.replace('/');
    }
  }, [state.authed]);

  async function submit() {
    if (honeypot) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setInfo('Conta criada! Verifique seu e-mail para confirmar e depois faça login.');
      }, 1200);
      return;
    }
    if (!name || !email || password.length < 6) {
      setErr('Preencha tudo (senha 6+ caracteres)');
      return;
    }
    setLoading(true);
    setErr('');
    setInfo('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);
    if (error) {
      setErr(error.message.includes('already') ? 'Esse e-mail já está cadastrado' : error.message);
      return;
    }
    if (!data.session) {
      setInfo('Conta criada! Verifique seu e-mail para confirmar e depois faça login.');
    }
    // Se já vier com sessão, a navegação acontece no useEffect quando authed virar true.
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
          <AppText className="font-display text-3xl font-semibold">Criar conta</AppText>
          <AppText className="mt-1 text-sm text-ink-soft">Seu Glow começa agora.</AppText>

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
            <TextInput
              value={honeypot}
              onChangeText={setHoneypot}
              autoComplete="off"
              accessible={false}
              style={{ height: 0, width: 0, position: 'absolute' }}
              tabIndex={-1}
            />
            <AppTextInput placeholder="Como podemos te chamar" value={name} onChangeText={setName} />
            <AppTextInput
              placeholder="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AppTextInput
              placeholder="Senha (6+ caracteres)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {err ? <AppText className="mt-2 text-xs text-destructive">{err}</AppText> : null}
          {info ? <AppText className="mt-2 text-xs text-primary">{info}</AppText> : null}

          <AppButton
            label={loading ? 'Criando...' : 'Criar minha conta'}
            variant="dark"
            onPress={submit}
            isLoading={loading}
            className="mt-5"
          />

          <View className="mt-4 flex-row justify-center gap-1">
            <AppText className="text-xs text-ink-soft">Já tem conta?</AppText>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <AppText className="text-xs text-primary">Entrar</AppText>
              </Pressable>
            </Link>
          </View>
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
