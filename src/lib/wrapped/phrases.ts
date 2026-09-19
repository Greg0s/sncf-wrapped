import { MONTHS_FR, WEEKDAYS_FR, type Anticipation, type TripHighlight, type WrappedStats } from '../parsing'
import { cap, fmtEur, fmtNum, plural } from './format'

/** "Les trois quarts du tour de la Terre": the comparison follows the order of magnitude, regardless of volume. */
export function earthPhrase(laps: number): string {
  if (laps < 0.03) return 'Un premier pas vers le tour de la Terre'
  if (laps < 0.2) return `Environ ${Math.round(laps * 100)} % du tour de la Terre`
  if (laps < 0.29) return 'Environ un quart du tour de la Terre'
  if (laps < 0.42) return 'Environ un tiers du tour de la Terre'
  if (laps < 0.58) return 'Environ la moitié du tour de la Terre'
  if (laps < 0.68) return 'Plus de la moitié du tour de la Terre'
  if (laps < 0.85) return 'Les trois quarts du tour de la Terre'
  if (laps < 1) return 'Presque un tour de la Terre'
  if (laps < 1.15) return 'Un tour de la Terre'
  if (laps < 1.55) return "Plus d'un tour de la Terre"
  if (laps < 1.85) return 'Presque deux tours de la Terre'
  if (laps < 2.15) return 'Deux tours de la Terre'
  return `${laps.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} tours de la Terre`
}

export function kmNote(laps: number, tripCount: number): string {
  return `${earthPhrase(laps)}, en ${fmtNum(tripCount)} ${plural(tripCount, 'trajet', 'trajets')}.`
}

const DAY_PART: Record<NonNullable<TripHighlight['partOfDay']>, string> = {
  night: 'de nuit',
  morning: 'matin',
  afternoon: 'après-midi',
  evening: 'soir',
}

/** "un vendredi soir" */
export function whenPhrase(t: TripHighlight): string {
  const part = t.partOfDay ? ` ${DAY_PART[t.partOfDay]}` : ''
  return `un ${WEEKDAYS_FR[t.weekday]}${part}`
}

/** Number of years covered by an "all years" period (2023 → 2026: 4). */
export function yearSpan(s: WrappedStats): number {
  return s.years.length ? s.years[s.years.length - 1] - s.years[0] + 1 : 1
}

/** "Soit 31 € par trajet et 203 € par mois. Votre billet le plus cher : 119 € pour un Lyon — Nantes un vendredi soir." */
export function eurNote(s: WrappedStats): string {
  const { spend } = s
  const sentences: string[] = []
  if (spend.avgPerTripEur !== null) {
    const avg = fmtEur(spend.avgPerTripEur)
    if (s.period.kind === 'all') {
      sentences.push(`Soit ${avg} par trajet sur ${yearSpan(s)} ${plural(yearSpan(s), 'an', 'ans')}.`)
    } else if (spend.perMonthEur !== null && spend.monthsSpan > 1) {
      sentences.push(`Soit ${avg} par trajet et ${fmtEur(spend.perMonthEur)} par mois.`)
    } else {
      sentences.push(`Soit ${avg} par trajet.`)
    }
  }
  const t = spend.priciest
  if (t) {
    const what = t.from === t.to ? `trajet à ${t.from}` : `${t.roundTrip ? 'aller-retour ' : ''}${t.from} — ${t.to}`
    sentences.push(`Votre billet le plus cher : ${fmtEur(t.priceEur)} pour un ${what} ${whenPhrase(t)}.`)
  }
  return sentences.join(' ')
}

/** Month "Juillet"; with the year ("Juin 2026") when the period spans several years. */
export function monthName(month: string, withYear: boolean): string {
  const name = cap(MONTHS_FR[Number(month.slice(5, 7)) - 1])
  return withYear ? `${name} ${month.slice(0, 4)}` : name
}

/** "3 mars"; with the year ("3 mars 2025") when the period spans several years. */
export function dayMonthLabel(date: string, withYear: boolean): string {
  const day = Number(date.slice(8, 10))
  const name = MONTHS_FR[Number(date.slice(5, 7)) - 1]
  return withYear ? `${day} ${name} ${date.slice(0, 4)}` : `${day} ${name}`
}

export function anticipationNote(a: Anticipation, s: WrappedStats): string {
  const days = Math.round(a.averageDays)
  const who = s.period.kind === 'all' ? `Sur ${yearSpan(s)} ${plural(yearSpan(s), 'an', 'ans')}, vous réservez` : 'Vous réservez'
  const lead = `${who} en moyenne ${days} ${plural(days, 'jour', 'jours')} avant le départ.`
  if (a.sameDayCount === 0) return `${lead} Votre achat le plus tardif : ${a.minDays} ${plural(a.minDays, 'jour', 'jours')} avant le départ.`
  if (a.sameDayCount / a.tripsConsidered >= 0.5) return `${lead} Plus d'un billet sur deux est acheté le jour même.`
  return `${lead} Et ${a.sameDayCount} fois, vous avez acheté votre billet le jour même.`
}
