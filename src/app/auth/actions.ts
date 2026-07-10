"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  const language = String(formData.get("language") ?? "fr");

  if (password.length < 8) return { error: "weakPassword" };

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

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
