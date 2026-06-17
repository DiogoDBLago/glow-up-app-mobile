// Auth configuration (React Native).
// AUTH_REQUIRED = true: every visitor must sign in or register before
// reaching onboarding/home. Flip back to `false` only if a local "demo" mode
// (no real Supabase session) is needed again.

export const AUTH_REQUIRED = true;

export const DEMO_USER_ID = "local-demo-user";
export const DEMO_USER_NAME = "Você";

export const DEMO_STORAGE_KEY = "glowup:demo-state:v1";

export function isDemoUserId(uid: string | null | undefined): boolean {
  return !!uid && uid.startsWith("local-");
}
