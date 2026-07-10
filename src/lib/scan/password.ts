// Cookie de session des QR protégés par mot de passe. Sa valeur est un
// fragment du hash bcrypt : invérifiable sans connaître le hash complet.

export function passwordCookieName(qrId: string) {
  return `qrpw_${qrId.replace(/-/g, "").slice(0, 16)}`;
}

export function passwordCookieValue(hash: string) {
  return hash.slice(7, 29);
}
