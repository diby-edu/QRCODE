export function formatDate(iso: string | null | undefined, locale: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(iso)
  );
}

export function formatDateTime(iso: string | null | undefined, locale: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatNumber(n: number, locale: string) {
  return new Intl.NumberFormat(locale).format(n);
}

export function formatMoney(amount: number, currency: string, locale: string) {
  // XOF n'est pas toujours bien géré par Intl : affichage manuel
  if (currency === "XOF" || currency === "FCFA") {
    return `${new Intl.NumberFormat(locale).format(amount)} FCFA`;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
