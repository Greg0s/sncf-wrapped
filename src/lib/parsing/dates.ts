// Dates au format AAAA-MM-JJ (et mois AAAA-MM), manipulées en UTC pour éviter tout effet de fuseau ou d'heure d'été.

const pad = (n: number) => String(n).padStart(2, '0')

const parts = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  return { y, m, d }
}

export function localToday(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Numéro de jour depuis 1970 : la différence de deux dates donne un nombre de jours calendaires. */
export function dayNumber(date: string): number {
  const { y, m, d } = parts(date)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

/** 0 = dimanche … 6 = samedi. */
export function weekdayOf(date: string): number {
  const { y, m, d } = parts(date)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export const monthOf = (date: string) => date.slice(0, 7)
export const yearOf = (date: string) => Number(date.slice(0, 4))

/** Nombre de mois entre deux mois AAAA-MM (b - a). */
export function monthsBetween(a: string, b: string): number {
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)))
}

/** Tous les mois de `first` à `last` inclus. */
export function monthRange(first: string, last: string): string[] {
  const out: string[] = []
  let y = Number(first.slice(0, 4))
  let m = Number(first.slice(5, 7))
  const end = monthsBetween(first, last)
  for (let i = 0; i <= end; i++) {
    out.push(`${y}-${pad(m)}`)
    if (++m > 12) {
      m = 1
      y++
    }
  }
  return out
}

export const WEEKDAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] as const
export const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'] as const
