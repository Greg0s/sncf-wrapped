import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { canonicalOf } from './routes'
import { DATA_REQUEST_STEPS, jsonLdScriptOf, structuredDataOf } from './structuredData'

const parse = (script: string) => JSON.parse(script.replace(/^<script type="application\/ld\+json">|<\/script>$/g, ''))

describe('structured data (JSON-LD)', () => {
  it('describes the landing as a free web application', () => {
    const data = structuredDataOf('landing')
    expect(data).toMatchObject({ '@type': 'WebApplication', url: canonicalOf('landing'), isAccessibleForFree: true, inLanguage: 'fr' })
    expect(data).toMatchObject({ offers: { price: 0, priceCurrency: 'EUR' } })
  })

  it('describes the data-request page as a HowTo whose steps are shown on the page', () => {
    const data = structuredDataOf('data') as { step: { name: string; text: string }[] }
    expect(data.step).toHaveLength(DATA_REQUEST_STEPS.length)
    const page = renderToString(createElement(App, { route: 'data' }))
    for (const s of data.step) {
      expect(page).toContain(s.name)
      expect(page).toContain(s.text.replace(/'/g, '&#x27;'))
    }
  })

  it('has none for the legal page', () => {
    expect(jsonLdScriptOf('legal')).toBe('')
  })

  it('emits a script tag that parses back to the data and cannot be closed early', () => {
    const script = jsonLdScriptOf('landing')
    expect(parse(script)).toEqual(structuredDataOf('landing'))
    expect(script.slice(1, -'</script>'.length)).not.toContain('<')
  })
})
