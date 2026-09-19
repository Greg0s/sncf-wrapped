import type { CityRef } from '../parsing'

/*
 * « Étoile » de l'écran Kilomètres : la ville de base au centre, jusqu'à 4 rayons vers les destinations.
 * La maquette dessine 4 rayons à des emplacements fixes (nord-ouest, sud, ouest, nord-est). Les destinations
 * réelles y sont réparties d'après leur direction géographique depuis la ville de base : Roanne (au nord de
 * Saint-Étienne) ne sera pas dessinée au sud.
 */

export type Anchor = 'start' | 'middle' | 'end'

export interface StarSlot {
  end: { x: number; y: number }
  r: number
  stroke: string
  strokeWidth: number
  dotFill: string
  label: { x: number; y: number; anchor: Anchor; fill: string; fontSize: number }
}

export const STAR_HUB = { x: 120, y: 140 }

export const STAR_SLOTS: StarSlot[] = [
  { end: { x: 95, y: 58 }, r: 5, stroke: '#0E1219', strokeWidth: 2.5, dotFill: '#0E1219', label: { x: 95, y: 46, anchor: 'middle', fill: '#0E1219', fontSize: 11 } },
  { end: { x: 126, y: 208 }, r: 4, stroke: '#0E1219', strokeWidth: 2.5, dotFill: '#0E1219', label: { x: 126, y: 224, anchor: 'middle', fill: '#0E1219', fontSize: 11 } },
  { end: { x: 44, y: 116 }, r: 4, stroke: '#0E1219', strokeWidth: 2.5, dotFill: '#0E1219', label: { x: 44, y: 104, anchor: 'middle', fill: '#0E1219', fontSize: 11 } },
  { end: { x: 170, y: 72 }, r: 3, stroke: 'rgba(14,18,25,.5)', strokeWidth: 1.5, dotFill: 'rgba(14,18,25,.6)', label: { x: 177, y: 66, anchor: 'start', fill: 'rgba(14,18,25,.7)', fontSize: 10 } },
]

export interface StarSpoke {
  name: string
  slot: StarSlot
  /** Ordre de tracé (1 à 4), pour le décalage d'animation. */
  draw: number
}

const angle = (dx: number, dy: number) => (Math.atan2(dy, dx) * 180) / Math.PI
const gap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)
const SLOT_ANGLES = STAR_SLOTS.map((s) => angle(s.end.x - STAR_HUB.x, s.end.y - STAR_HUB.y))

/** Répartit les villes sur les rayons en minimisant l'écart entre leur direction réelle et celle du rayon. */
export function assignSlots(bearings: (number | null)[]): number[] {
  const placed = bearings.flatMap((b, i) => (b === null ? [] : [i]))
  const result = Array.from({ length: bearings.length }, () => -1)
  let best = { cost: Infinity, slots: [] as number[] }

  const search = (k: number, used: number[], cost: number) => {
    if (cost >= best.cost) return
    if (k === placed.length) return void (best = { cost, slots: used.slice() })
    for (let s = 0; s < STAR_SLOTS.length; s++) {
      if (used.includes(s)) continue
      used.push(s)
      search(k + 1, used, cost + gap(bearings[placed[k]] as number, SLOT_ANGLES[s]))
      used.pop()
    }
  }
  search(0, [], 0)
  placed.forEach((cityIndex, k) => (result[cityIndex] = best.slots[k]))

  // Villes sans coordonnées : rayons restants, dans l'ordre.
  const free = STAR_SLOTS.map((_, s) => s).filter((s) => !result.includes(s))
  bearings.forEach((_, i) => {
    if (result[i] === -1) result[i] = free.shift() ?? -1
  })
  return result
}

/** Rayons de l'étoile pour les villes données (les 4 premières), en partant de la ville de base. */
export function buildStar(hub: CityRef | null, cities: CityRef[]): StarSpoke[] {
  const top = cities.slice(0, STAR_SLOTS.length)
  const bearings = top.map((c) => (hub && hub.x !== null && hub.y !== null && c.x !== null && c.y !== null ? angle(c.x - hub.x, c.y - hub.y) : null))
  const slots = assignSlots(bearings)
  return top
    .map((c, i) => ({ name: c.name, slot: STAR_SLOTS[slots[i]], draw: slots[i] + 1 }))
    .filter((s) => s.slot !== undefined)
    .sort((a, b) => a.draw - b.draw)
}
