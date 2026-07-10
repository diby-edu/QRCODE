import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/shell/AdminShell";
import { signOut } from "@/app/auth/actions";

/**
 * Shell dédié à l'espace admin (route group séparé de (app) pour éviter
 * d'imbriquer AdminShell dans AppShell — l'admin a sa propre navigation).
 */
export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_suspended")
    .eq("id", user.id)
    .single();

  if (profile?.is_suspended) {
    await signOut();
  }
  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <AdminShell user={{ name: profile?.full_name ?? "", email: user.email ?? "" }}>
      {children}
    </AdminShell>
  );
}
