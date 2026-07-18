"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthState = { error?: string; success?: string } | null;

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

// Maps Supabase auth error codes to keys of the auth.errors namespace
function mapAuthError(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "invalidCredentials";
    case "email_not_confirmed":
      return "emailNotConfirmed";
    case "user_already_exists":
    case "email_exists":
      return "userExists";
    case "weak_password":
      return "weakPassword";
    case "over_email_send_rate_limit":
      return "rateLimited";
    default:
      return "generic";
  }
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "") || "/dashboard";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: mapAuthError(error.code) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_suspended")
    .eq("id", data.user.id)
    .single();
  if (profile?.is_suspended) {
    await supabase.auth.signOut();
    return { error: "suspended" };
  }

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const language = String(formData.get("language") ?? "fr");

  if (password.length < 8) return { error: "weakPassword" };
  if (password !== confirmPassword) return { error: "mismatch" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, language },
      emailRedirectTo: `${appUrl()}/auth/callback`,
    },
  });
  if (error) return { error: mapAuthError(error.code) };

  // Supabase returns a user with no identities when the email is already taken
  if (data.user && data.user.identities?.length === 0) {
    return { error: "userExists" };
  }

  if (!data.session) {
    // Email confirmation is enabled
    return { success: email };
  }

  redirect("/dashboard");
}

export async function resendConfirmation(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "generic" };

  // Certains fournisseurs mail (Gmail en tête) pré-visitent les liens dans
  // les emails entrants pour les scanner, ce qui consomme le lien de
  // confirmation à usage unique et confirme le compte avant même que
  // l'utilisateur ne l'ouvre. Sans ce garde-fou, resend() renvoie un succès
  // silencieux (rien n'est réellement envoyé pour un compte déjà confirmé),
  // ce qui affichait "Email renvoyé !" alors qu'aucun email ne partait.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (profile) {
    const { data } = await admin.auth.admin.getUserById(profile.id);
    if (data.user?.email_confirmed_at) {
      return { error: "alreadyConfirmed" };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${appUrl()}/auth/callback` },
  });
  if (error) return { error: mapAuthError(error.code) };

  return { success: email };
}

export async function forgotPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl()}/auth/callback?next=/auth/reset-password`,
  });
  // Always report success to avoid account enumeration
  return { success: "sent" };
}

export async function resetPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) return { error: "weakPassword" };
  if (password !== confirm) return { error: "mismatch" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: mapAuthError(error.code) };

  return { success: "done" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
