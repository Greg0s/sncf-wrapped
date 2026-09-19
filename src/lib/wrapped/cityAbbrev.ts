/**
 * Road-sign style abbreviations ("St" for "Saint", as on French directional panels), used only on the
 * shareable card where two city names must fit side by side.
 *
 * Only matches a prefix directly followed by a hyphen ("Saint-Étienne" → "St-Étienne"), never a bare
 * name that happens to equal one of these words ("Saintes" stays "Saintes") or a suffix ("Mont-Saint-Michel"
 * still becomes "Mont-St-Michel", but a trailing "…-Saints" is left alone).
 */
const PREFIX_ABBREVIATIONS: [RegExp, string][] = [
  [/\bSaintes-/g, 'Stes-'],
  [/\bSaints-/g, 'Sts-'],
  [/\bSainte-/g, 'Ste-'],
  [/\bSaint-/g, 'St-'],
  [/\bMont-/g, 'Mt-'],
]

export function abbreviateCityName(name: string): string {
  return PREFIX_ABBREVIATIONS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), name)
}
