// Application-level row types matching the Supabase schema
// (supabase/migrations/001_schema.sql).

export type Role = "user" | "admin";
export type SubscriptionStatus = "active" | "expired" | "cancelled";
export type PaymentStatus = "pending" | "completed" | "failed" | "cancelled";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  language: string;
  is_suspended: boolean;
  created_at: string;
}

export interface PlanLimits {
  max_qr_codes: number; // -1 = unlimited
  max_dynamic: number;
  max_scans_month: number;
  max_storage_mb: number; // fichiers uploadés (photos, vidéos, PDF…)
  logo_enabled: boolean;
  video_enabled: boolean; // hébergement de fichiers vidéo
  formats: string[]; // ["png"] | ["png","svg","pdf"]
  stats_level: "basic" | "full";
  folders_enabled: boolean;
  password_enabled: boolean;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  currency: string;
  limits: PlanLimits;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string | null;
  gateway: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  gateway: string;
  gateway_ref: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  raw_response: Record<string, unknown> | null;
  created_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface QrDesign {
  fgColor: string;
  bgColor: string;
  dotStyle:
    | "square"
    | "rounded"
    | "dots"
    | "classy"
    | "classy-rounded"
    | "extra-rounded";
  cornerStyle: "square" | "dot" | "extra-rounded";
  logoUrl: string | null;
}

export interface QrCode {
  id: string;
  user_id: string;
  folder_id: string | null;
  type: string;
  title: string;
  slug: string;
  qr_image: string | null;
  is_dynamic: boolean;
  is_active: boolean;
  expires_at: string | null;
  password: string | null;
  scan_count: number;
  design: QrDesign;
  created_at: string;
  updated_at: string;
}

export interface QrCodeData {
  id: string;
  qr_code_id: string;
  data: Record<string, unknown>;
}

export interface QrScan {
  id: string;
  qr_code_id: string;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  operating_system: string | null;
  ip_address: string | null;
  scanned_at: string;
}

export interface SiteSetting {
  key: string;
  value: Record<string, unknown>;
}

export type QrCodeWithData = QrCode & { qr_code_data: QrCodeData[] };
