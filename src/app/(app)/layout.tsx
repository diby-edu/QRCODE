import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, isUnlimited } from "@/lib/plans";
import { fetchScansPerDay } from "@/lib/stats";
import { AppShell, type AppNotification } from "@/components/shell/AppShell";
import { signOut } from "@/app/auth/actions";

const WARN_RATIO = 0.8;
const EXPIRY_WARNING_DAYS = 7;

async function buildNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<AppNotification[]> {
  const t = await getTranslations("common.notifications");
  const notifications: AppNotification[] = [];

  const [userPlan, { count: totalQr }, { count: dynamicQr }, days, { data: storageBytes }] =
    await Promise.all([
      getUserPlan(supabase, userId),
      supabase.from("qr_codes").select("id", { count: "exact", head: true }),
      supabase
        .from("qr_codes")
        .select("id", { count: "exact", head: true })
        .eq("is_dynamic", true),
      fetchScansPerDay(supabase, 30),
      supabase.rpc("user_storage_bytes"),
    ]);

  const { limits, subscription, isFree } = userPlan;
  const scans30d = days.reduce((sum, d) => sum + d.scans, 0);
  const storageMb = Number(storageBytes ?? 0) / 1024 / 1024;

  const checks: { id: string; used: number; limit: number; labelKey: string }[] = [
    { id: "qr", used: totalQr ?? 0, limit: limits.max_qr_codes, labelKey: "qrCodes" },
    { id: "dynamic", used: dynamicQr ?? 0, limit: limits.max_dynamic, labelKey: "dynamicQr" },
    { id: "scans", used: scans30d, limit: limits.max_scans_month, labelKey: "scans" },
    { id: "storage", used: storageMb, limit: limits.max_storage_mb, labelKey: "storage" },
  ];

  for (const check of checks) {
    if (isUnlimited(check.limit) || check.limit <= 0) continue;
    if (check.used / check.limit < WARN_RATIO) continue;
    const atLimit = check.used >= check.limit;
    notifications.push({
      id: `limit-${check.id}`,
      level: atLimit ? "warning" : "info",
      message: t(atLimit ? "limitReached" : "limitApproaching", {
        label: t(`labels.${check.labelKey}`),
      }),
      href: "/billing",
      cta: t("upgrade"),
    });
  }

  if (!isFree && subscription?.current_period_end) {
    const daysLeft = Math.ceil(
      (new Date(subscription.current_period_end).getTime() - Date.now()) / 86_400_000
    );
    if (daysLeft >= 0 && daysLeft <= EXPIRY_WARNING_DAYS) {
      notifications.push({
        id: "subscription-expiry",
        level: "warning",
        message: t("expiringSoon", { days: daysLeft }),
        href: "/billing",
        cta: t("renew"),
      });
    }
  }

  return notifications;
}

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

  const notifications = await buildNotifications(supabase, user.id);

  return (
    <AppShell
      user={{
        name: profile?.full_name ?? "",
        email: user.email ?? "",
        isAdmin: profile?.role === "admin",
      }}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
