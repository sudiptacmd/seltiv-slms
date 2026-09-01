/** Pure SMS helpers — safe to import from client components (no server-only). */

const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

export function isUnicode(text: string): boolean {
  for (const ch of text) if (!GSM7.includes(ch)) return true;
  return false;
}

export function countSegments(text: string): { segments: number; unicode: boolean } {
  const unicode = isUnicode(text);
  const len = [...text].length;
  if (unicode) return { segments: len <= 70 ? 1 : Math.ceil(len / 67), unicode };
  return { segments: len <= 160 ? 1 : Math.ceil(len / 153), unicode };
}

export function renderTemplate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/** Bangladesh MSISDN normalisation to +8801XXXXXXXXX. */
export function normalizeMsisdn(phone: string): string {
  const p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("+880")) return p;
  if (p.startsWith("880")) return "+" + p;
  if (p.startsWith("0")) return "+88" + p;
  if (p.length === 10) return "+880" + p;
  return p;
}
