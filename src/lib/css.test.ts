import { describe, expect, it } from 'vitest'
import { css } from './css'

describe('css', () => {
  it('convertit une chaîne CSS en objet style React', () => {
    expect(css('display: flex; align-items: center; gap: 10px;')).toEqual({ display: 'flex', alignItems: 'center', gap: '10px' })
  })

  it('conserve les valeurs complexes telles quelles (clamp, gradients, guillemets, virgules)', () => {
    const s = css(
      "font-family: 'Schibsted Grotesk', sans-serif; padding: 0 clamp(12px, 3.5vw, 40px); background-image: repeating-linear-gradient(90deg, rgba(14,18,25,.4) 0 2px, transparent 2px 13px);",
    )
    expect(s.fontFamily).toBe("'Schibsted Grotesk', sans-serif")
    expect(s.padding).toBe('0 clamp(12px, 3.5vw, 40px)')
    expect(s.backgroundImage).toBe('repeating-linear-gradient(90deg, rgba(14,18,25,.4) 0 2px, transparent 2px 13px)')
  })

  it('gère les préfixes vendeur et les variables CSS', () => {
    expect(css('-webkit-overflow-scrolling: touch; --ac: #8DE8FD; background: var(--ac);')).toEqual({
      WebkitOverflowScrolling: 'touch',
      '--ac': '#8DE8FD',
      background: 'var(--ac)',
    })
  })

  it('laisse la dernière déclaration l’emporter (ex. couleur d’accent ajoutée en fin de chaîne)', () => {
    expect(css('background: #8DE8FD; color: red; background: var(--ac);').background).toBe('var(--ac)')
  })

  it('ne coupe pas sur un point-virgule dans une URL de données', () => {
    expect(css('background-image: url(data:image/png;base64,AAAA); color: red').color).toBe('red')
  })

  it('renvoie le même objet pour la même chaîne (cache)', () => {
    expect(css('gap: 1px')).toBe(css('gap: 1px'))
  })
})
