import { describe, expect, it } from 'vitest'
import { canonicalOf, ROUTES, type Route } from './routes'
import { sitemapXml } from './sitemap'

describe('sitemap.xml', () => {
  it('lists every public page by its canonical URL, once', () => {
    const locs = [...sitemapXml().matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs).toEqual((Object.keys(ROUTES) as Route[]).map(canonicalOf))
    expect(new Set(locs).size).toBe(locs.length)
  })

  it('is a sitemaps.org urlset', () => {
    const xml = sitemapXml()
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true)
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true)
  })
})
