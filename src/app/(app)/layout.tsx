import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { signOut } from "@/app/auth/actions";

export default async function AppLayout({
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

  return (
    <AppShell
      user={{
        name: profile?.full_name ?? "",
        email: user.email ?? "",
        isAdmin: profile?.role === "admin",
      }}
    >
      {children}
    </AppShell>
  );
}
