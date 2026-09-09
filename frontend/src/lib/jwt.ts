interface JwtPayload {
  exp?: number;
  role?: string;
  matricule?: string;
  [key: string]: unknown;
}

/** Décode la charge utile d'un JWT sans bibliothèque externe. */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(payload);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

export function tokenExpiry(token: string): Date | null {
  const payload = decodeJwt(token);
  if (!payload?.exp) return null;
  return new Date(payload.exp * 1000);
}
