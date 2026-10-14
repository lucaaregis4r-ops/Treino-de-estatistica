/** Four explicit contact grades used by the gesture recorder. */
export type ContactQuality = '#' | '+' | '-' | '=';
export const CONTACT_EVALUATIONS = { '#': 'excellent', '+': 'positive', '-': 'negative', '=': 'error' } as const;
export function contactQuality(value?: string): ContactQuality | undefined {
  return ({ '#': '#', '+': '+', '-': '-', '=': '=', excellent: '#', perfect: '#', positive: '+', negative: '-', poor: '-', error: '=' } as Record<string, ContactQuality>)[value ?? ''];
}
/** Descriptive pressure on the opponent, not an independent observation or a score. */
export function pressureFromResponse(value?: string): string | undefined {
  const grade = contactQuality(value);
  return grade ? ({ '#': 'negative', '+': 'neutral', '-': 'positive', '=': 'excellent' } as const)[grade] : undefined;
}
