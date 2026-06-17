import { supabase } from '@/supabase/client';
import {
  getCurrentCyclePhase,
  getPersonalizedRecommendations,
  type PersonalizationProfile,
} from './personalization';

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function fetchProfile() {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('user_personalization_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[personalization] fetch error', error);
    return null;
  }
  return data;
}

async function saveProfile({ data }: { data: Record<string, unknown> }) {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');
  const payload = { user_id: userId, ...data };
  const { data: row, error } = await supabase
    .from('user_personalization_profile')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) {
    console.error('[personalization] upsert error', error);
    throw new Error(error.message);
  }
  return row;
}

export interface DailyTip {
  id: string;
  date: string;
  cycle_phase: string;
  cycle_day: number;
  goal: string;
  tip_title: string;
  tip_text: string;
  tip_icon: string;
  tip_image_url: string | null;
}

async function fetchDailyTip(): Promise<DailyTip | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const { data: existingTip } = await supabase
    .from('user_daily_tips')
    .select('*')
    .eq('user_id', userId)
    .eq('date', todayStr)
    .single();
  if (existingTip) return existingTip as DailyTip;

  const { data: profileData } = await supabase
    .from('user_personalization_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  const profile = (profileData as PersonalizationProfile) || {};

  const cycle = getCurrentCyclePhase(profile, todayStr);
  const recommendations = getPersonalizedRecommendations(profile, todayStr);
  const phase = cycle?.phase || 'follicular';
  const day = cycle?.cycleDay || 1;
  const goal = recommendations.goal || 'hormonal_health';

  let title = 'Dica para hoje';
  let text = recommendations.homeMessage + '. ' + recommendations.selfCareTip;
  let icon = '✨';

  if (phase === 'menstrual') {
    title = 'Cuide da sua energia hoje';
    text = 'Priorize hidratação, refeições leves e alimentos ricos em ferro.';
    icon = '💧';
  } else if (phase === 'follicular') {
    title = 'Dia de construir ritmo';
    text = 'Sua energia tende a subir. Foque em proteína magra e treinos consistentes.';
    icon = '🌱';
  } else if (phase === 'ovulation') {
    title = 'Aproveite seu pico de energia';
    text = 'Bom dia para treinos intensos, hidratação reforçada e antioxidantes.';
    icon = '☀️';
  } else if (phase === 'luteal') {
    title = 'Conforto com equilíbrio';
    text = 'Inclua magnésio, fibras e refeições mais saciantes para controlar a fome.';
    icon = '🌙';
  }

  const finalText = `${text} ${recommendations.nutritionFocus}.`;

  const newTipData = {
    user_id: userId,
    date: todayStr,
    timezone: 'America/Sao_Paulo',
    cycle_phase: phase,
    cycle_day: day,
    goal,
    tip_title: title,
    tip_text: finalText,
    tip_icon: icon,
    created_at: new Date().toISOString(),
  };

  const { data: insertedTip, error: insertError } = await supabase
    .from('user_daily_tips')
    .insert([newTipData])
    .select()
    .single();

  if (insertError) {
    if ((insertError as { code?: string }).code === '23505') {
      const { data: retryTip } = await supabase
        .from('user_daily_tips')
        .select('*')
        .eq('user_id', userId)
        .eq('date', todayStr)
        .single();
      return retryTip as DailyTip;
    }
    console.error('[daily-tip] insert error', insertError);
  }

  return insertedTip as DailyTip | null;
}

/**
 * Universal API Client (React Native).
 *
 * Web used TanStack Start's `useServerFn`; here every call goes straight to
 * Supabase (auth.uid() + RLS already scope each row to the signed-in user).
 */
export function useApiClient() {
  return {
    saveProfile,
    fetchProfile,
    fetchDailyTip,
  };
}
