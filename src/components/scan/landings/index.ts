import type { LandingProps } from "./util";
import { AppLanding, LinksLanding, SocialLanding } from "./links";
import { VCardLanding } from "./contact";
import {
  BusinessLanding,
  CouponLanding,
  MenuLanding,
  PaymentLanding,
} from "./business";
import {
  ImagesLanding,
  Mp3Landing,
  PdfLanding,
  TextLanding,
} from "./content";
import { EventLanding, WifiLanding } from "./utility";

export type { LandingProps } from "./util";

/** Composant de page publique par id de type (registry.ts, scanBehavior: "landing"). */
export const LANDINGS: Record<
  string,
  (props: LandingProps) => Promise<React.ReactElement>
> = {
  app: AppLanding,
  links: LinksLanding,
  social: SocialLanding,
  vcard: VCardLanding,
  business: BusinessLanding,
  menu: MenuLanding,
  coupon: CouponLanding,
  payment: PaymentLanding,
  pdf: PdfLanding,
  images: ImagesLanding,
  mp3: Mp3Landing,
  text: TextLanding,
  wifi: WifiLanding,
  event: EventLanding,
};

/** Landings plus larges que la carte standard (lecture confortable). */
export const WIDE_LANDINGS = new Set(["menu", "pdf", "images", "business"]);
