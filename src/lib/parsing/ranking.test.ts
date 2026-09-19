import { describe, expect, it } from 'vitest'
import { CARD_TOP, MAX_TOP, rankTop } from './ranking'

describe('rankTop (classements adaptatifs)', () => {
  it('coupe à MAX_TOP quand il y a plus d’éléments', () => {
    const r = rankTop([9, 8, 7, 6, 5, 4, 3])
    expect(r.items).toEqual([9, 8, 7, 6, 5])
    expect(r.totalDistinct).toBe(7)
    expect(r.mode).toBe('ranking')
    expect(r.items).toHaveLength(MAX_TOP)
  })

  it('ne renvoie jamais un top 5 quand il n’y a que 3 éléments distincts', () => {
    const r = rankTop(['Paris', 'Lyon', 'Nice'])
    expect(r.items).toEqual(['Paris', 'Lyon', 'Nice'])
    expect(r.mode).toBe('ranking')
  })

  it('bascule en présentation « single » avec un seul élément', () => {
    expect(rankTop(['Paris'])).toEqual({ items: ['Paris'], totalDistinct: 1, mode: 'single' })
  })

  it('signale « empty » sans donnée', () => {
    expect(rankTop([])).toEqual({ items: [], totalDistinct: 0, mode: 'empty' })
  })

  it('accepte une taille maximale personnalisée (carte à partager : top 3)', () => {
    expect(rankTop([5, 4, 3, 2, 1], CARD_TOP).items).toEqual([5, 4, 3])
  })
})
