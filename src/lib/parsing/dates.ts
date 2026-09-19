// Dates in YYYY-MM-DD format (and YYYY-MM for months), handled in UTC to avoid any timezone or DST effects.

const pad = (n: number) => String(n).padStart(2, '0')

const parts = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  return { y, m, d }
}

export function localToday(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Day number since 1970: the difference between two dates gives a number of calendar days. */
export function dayNumber(date: string): number {
  const { y, m, d } = parts(date)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(date: string): number {
  const { y, m, d } = parts(date)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export const monthOf = (date: string) => date.slice(0, 7)
export const yearOf = (date: string) => Number(date.slice(0, 4))

/** Number of days in a YYYY-MM month. */
export function daysInMonth(month: string): number {
  const { y, m } = parts(`${month}-01`)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Number of months between two YYYY-MM months (b - a). */
export function monthsBetween(a: string, b: string): number {
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)))
}

/** All the months from `first` to `last` inclusive. */
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
