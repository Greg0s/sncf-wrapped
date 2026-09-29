import { describe, expect, it } from 'vitest'
import { canonicalOf, pathOf, routeOf, SITE_ORIGIN } from './routes'

// Vitest serves at '/', the build at '/sncf-wrapped/': the paths follow whichever base is in effect.
const B = import.meta.env.BASE_URL

describe('routes', () => {
  it('maps each page to its path under the base', () => {
    expect(pathOf('landing')).toBe(B)
    expect(pathOf('data')).toBe(B + 'obtenir-mes-donnees/')
    expect(pathOf('legal')).toBe(B + 'mentions-legales/')
    expect(canonicalOf('data')).toBe(SITE_ORIGIN + B + 'obtenir-mes-donnees/')
  })

  it('reads the page from a pathname, with or without a trailing slash', () => {
    expect(routeOf(B)).toBe('landing')
    expect(routeOf(B + 'obtenir-mes-donnees/')).toBe('data')
    expect(routeOf(B + 'mentions-legales')).toBe('legal')
    expect(routeOf(B + 'index.html')).toBe('landing')
    expect(routeOf('/elsewhere/')).toBe('landing')
  })
})
