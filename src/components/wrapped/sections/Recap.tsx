import { toPng } from 'html-to-image'
import { Fragment, useEffect, useRef, useState } from 'react'
import { css } from '../../../lib/css'
import type { WrappedView } from '../../../lib/wrapped'
import { FranceMap } from '../FranceMap'

// Formats of the shareable card: preview dimensions (px) and exported image size (exportW/exportH).
const FORMATS = [
  { key: 'square', label: 'Carré', dims: '1080 × 1080', w: 400, h: 400, iconW: 11, iconH: 11, exportW: 1080, exportH: 1080 },
  { key: 'wide', label: '4:5', dims: '1080 × 1350', w: 400, h: 500, iconW: 11, iconH: 13.75, exportW: 1080, exportH: 1350 },
  { key: 'story', label: 'Story', dims: '1080 × 1920', w: 320, h: 569, iconW: 8, iconH: 14, exportW: 1080, exportH: 1920 },
] as const

// Readable filename from the displayed period ("Édition 2024" -> "edition-2024").
function slugify(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'export'
}

export function Recap({ index, label, view, replay }: { index: number; label?: string | null; view: WrappedView; replay: () => void }) {
  const { d, franceMap, cardCities, cardRoutes, recapNote } = view
  const [format, setFormat] = useState<(typeof FORMATS)[number]['key']>('square')
  const [availH, setAvailH] = useState(300)
  const [downloading, setDownloading] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const measure = () => setAvailH(Math.max(220, (window.innerHeight || 600) - 240))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const fmt = FORMATS.find((f) => f.key === format) ?? FORMATS[0]
  const fit = Math.max(0.42, Math.min(1, availH / fmt.h)).toFixed(3)
  const formats = FORMATS.map((f) => {
    const on = f.key === fmt.key
    return {
      label: f.label,
      iconW: f.iconW,
      iconH: f.iconH,
      fg: on ? '#0E1219' : '#AEB7C6',
      bg: on ? 'var(--ac)' : 'transparent',
      bd: on ? 'var(--ac)' : 'rgba(241,244,247,.22)',
      pick: () => setFormat(f.key),
    }
  })
  const [isSquare, isWide, isStory] = [fmt.key === 'square', fmt.key === 'wide', fmt.key === 'story']
  const [cardW, cardH] = [fmt.w, fmt.h]
  const [boxW, boxH] = [Math.round(fmt.w * Number(fit)), Math.round(fmt.h * Number(fit))]
  const dlLabel = downloading ? 'Génération…' : `Télécharger · ${fmt.dims}`

  const handleDownload = async () => {
    const node = cardRef.current
    if (!node || downloading) return
    setDownloading(true)
    try {
      // The font is self-hosted but may not be ready if the screen just appeared.
      await document.fonts.ready
      const dataUrl = await toPng(node, {
        canvasWidth: fmt.exportW,
        canvasHeight: fmt.exportH,
        pixelRatio: 1, // otherwise the canvas size would depend on the device's pixel ratio
        backgroundColor: '#0E1219',
        style: { transform: 'none' }, // ignore the preview's scale(fit), export at native size
      })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `sncf-wrapped-${slugify(d.period)}-${slugify(fmt.label)}.png`
      link.click()
    } catch (error) {
      console.error('Failed to generate the shareable card', error)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section
      data-sec={index}
      data-sec-id="recap"
      style={css(
        `min-height: 100svh; scroll-snap-align: start; background: #0E1219; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: clamp(8px, 1.4vh, 16px); padding: clamp(46px, 7vh, 90px) clamp(14px, 4vw, 60px) clamp(14px, 2.6vh, 48px);`,
      )}
    >
      <div data-anim="up" style={css(`font-size: 14px; font-weight: 600; color: #8A93A6; text-align: center;`)}>
        {label}
      </div>
      <div data-anim="up" data-delay="60" style={css(`display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;`)}>
        {formats.map((f, i) => (
          <Fragment key={i}>
            <button
              type="button"
              onClick={f.pick}
              style={css(
                `font-family: 'Schibsted Grotesk', sans-serif; font-size: 13px; font-weight: 600; color: ${f.fg}; background: ${f.bg}; border: 1.5px solid ${f.bd}; border-radius: 999px; padding: 8px 15px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: transform .16s ease;`,
              )}
              className="hv-lift-2"
            >
              <span
                style={css(`display: inline-block; width: ${f.iconW}px; height: ${f.iconH}px; border: 1.5px solid ${f.fg}; border-radius: 2px;`)}
              />
              {f.label}
            </button>
          </Fragment>
        ))}
      </div>
      <div data-anim="scale" data-delay="120" style={css(`width: ${boxW}px; height: ${boxH}px;`)}>
        <div
          ref={cardRef}
          style={css(
            `width: ${cardW}px; height: ${cardH}px; transform: scale(${fit}); transform-origin: top left; background: #0E1219; border-radius: 24px; overflow: hidden; display: flex; flex-direction: column;`,
          )}
        >
          {isSquare && (
            <>
              <div
                style={css(
                  `position: relative; flex: 0 0 auto; height: 156px;  overflow: hidden; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 0 22px;`,
                )}
              >
                <div style={css(`position: absolute; inset: 0; background: #8DE8FD; background: var(--ac);`)} />
                <div
                  style={css(
                    `position: absolute; left: -10px; top: -10px; font-size: 96px; font-weight: 800; letter-spacing: -.07em; line-height: .78; color: rgba(14,18,25,.13);`,
                  )}
                >
                  {d.bigA}
                </div>
                <div
                  style={css(
                    `position: absolute; right: -12px; bottom: -18px; font-size: 96px; font-weight: 800; letter-spacing: -.07em; line-height: .78; color: rgba(14,18,25,.13);`,
                  )}
                >
                  {d.bigB}
                </div>
                <div
                  style={css(
                    `position: relative; flex: 0 0 auto; width: 132px; height: 132px; display: flex; align-items: center; justify-content: center; overflow: hidden;`,
                  )}
                >
                  <FranceMap lineColor="#FFFFFF" scale={1.5} model={franceMap} style={css('width: 100%; height: 100%;')} />
                </div>
                <div
                  style={css(
                    `position: relative; display: flex; flex-direction: column; align-items: flex-end; gap: 18px; text-align: right; color: #0E1219;`,
                  )}
                >
                  <div style={css(`display: flex; flex-direction: column; gap: 3px;`)}>
                    <div style={css(`font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; opacity: .65;`)}>
                      Kilomètres
                    </div>
                    <div style={css(`font-size: 34px; font-weight: 800; letter-spacing: -.045em; line-height: .9;`)}>{d.km}</div>
                  </div>
                  <div style={css(`display: flex; flex-direction: column; gap: 3px;`)}>
                    <div style={css(`font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; opacity: .65;`)}>
                      Budget
                    </div>
                    <div style={css(`font-size: 34px; font-weight: 800; letter-spacing: -.045em; line-height: .9;`)}>
                      {d.eur}
                      {' €'}
                    </div>
                  </div>
                </div>
              </div>
              <div style={css(`flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; justify-content: center; padding: 16px 22px;`)}>
                <div style={css(`display: grid; grid-template-columns: 1fr 1.18fr; gap: 20px; align-items: start;`)}>
                  <div style={css(`min-width: 0;`)}>
                    <div
                      style={css(
                        `font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #8DE8FD; margin-bottom: 10px; white-space: nowrap; color: var(--ac);`,
                      )}
                    >
                      Top villes
                    </div>
                    <div style={css(`display: flex; flex-direction: column; gap: 7px;`)}>
                      {cardCities.map((v, i) => (
                        <Fragment key={i}>
                          <div style={css(`display: flex; align-items: baseline; gap: 6px;`)}>
                            <span style={css(`flex: 0 0 auto; width: 22px; font-size: 12px; font-weight: 700; color: #6C768A;`)}>{v.n}</span>
                            <span
                              style={css(
                                `flex: 1 1 auto; min-width: 0; font-size: 16px; font-weight: 700; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`,
                              )}
                            >
                              {v.name}
                            </span>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                  <div style={css(`min-width: 0;`)}>
                    <div
                      style={css(
                        `font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #8DE8FD; margin-bottom: 10px; white-space: nowrap; color: var(--ac);`,
                      )}
                    >
                      Top trajets
                    </div>
                    <div style={css(`display: flex; flex-direction: column; gap: 7px;`)}>
                      {cardRoutes.map((r, i) => (
                        <Fragment key={i}>
                          <div style={css(`display: flex; align-items: baseline; gap: 6px;`)}>
                            <span style={css(`flex: 0 0 auto; width: 22px; font-size: 12px; font-weight: 700; color: #6C768A;`)}>{r.n}</span>
                            <span
                              style={css(
                                `flex: 1 1 auto; min-width: 0; font-size: 16px; font-weight: 700; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`,
                              )}
                            >
                              {r.name}
                            </span>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div
                style={css(
                  `flex: 0 0 auto; margin-top: auto; padding: 12px 22px 14px; border-top: 1px solid rgba(241,244,247,.12); display: flex; align-items: center; justify-content: space-between; gap: 10px;`,
                )}
              >
                <div style={css(`display: flex; align-items: center; gap: 9px; min-width: 0;`)}>
                  <span style={css(`flex: 0 0 auto; width: 18px; height: 18px; border-radius: 50%; background: #8DE8FD; background: var(--ac);`)} />
                  <div style={css(`min-width: 0;`)}>
                    <div style={css(`font-size: 15px; font-weight: 800; letter-spacing: -.025em; line-height: 1.1; white-space: nowrap;`)}>
                      SNCF Wrapped
                    </div>
                    <div style={css(`font-size: 10px; color: #8A93A6; line-height: 1.2;`)}>{d.period}</div>
                  </div>
                </div>
                <span style={css(`flex: 0 0 auto; font-size: 9px; font-weight: 600; color: #8A93A6; white-space: nowrap;`)}>
                  greg0s.github.io/wrapped-sncf
                </span>
              </div>
            </>
          )}
          {isWide && (
            <>
              <div
                style={css(
                  `position: relative; flex: 0 0 auto; height: 208px; overflow: hidden; display: flex; align-items: center; justify-content: center;`,
                )}
              >
                <div style={css(`position: absolute; inset: 0; background: #8DE8FD; background: var(--ac);`)} />
                <div
                  style={css(
                    `position: absolute; left: -10px; top: -12px; font-size: 104px; font-weight: 800; letter-spacing: -.07em; line-height: .78; color: rgba(14,18,25,.13);`,
                  )}
                >
                  {d.bigA}
                </div>
                <div
                  style={css(
                    `position: absolute; right: -12px; bottom: -20px; font-size: 104px; font-weight: 800; letter-spacing: -.07em; line-height: .78; color: rgba(14,18,25,.13);`,
                  )}
                >
                  {d.bigB}
                </div>
                <div
                  style={css(
                    `position: relative; width: 168px; height: 168px; display: flex; align-items: center; justify-content: center; overflow: hidden;`,
                  )}
                >
                  <FranceMap lineColor="#FFFFFF" scale={1.4} model={franceMap} style={css('width: 100%; height: 100%;')} />
                </div>
              </div>
              <div
                style={css(
                  `flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; justify-content: space-evenly; gap: 22px; padding: 20px 22px;`,
                )}
              >
                <div style={css(`display: grid; grid-template-columns: 1fr 1.18fr; gap: 20px; align-items: start;`)}>
                  <div style={css(`min-width: 0;`)}>
                    <div
                      style={css(
                        `font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #8DE8FD; margin-bottom: 10px; white-space: nowrap; color: var(--ac);`,
                      )}
                    >
                      Top villes
                    </div>
                    <div style={css(`display: flex; flex-direction: column; gap: 7px;`)}>
                      {cardCities.map((v, i) => (
                        <Fragment key={i}>
                          <div style={css(`display: flex; align-items: baseline; gap: 6px;`)}>
                            <span style={css(`flex: 0 0 auto; width: 22px; font-size: 12px; font-weight: 700; color: #6C768A;`)}>{v.n}</span>
                            <span
                              style={css(
                                `flex: 1 1 auto; min-width: 0; font-size: 16px; font-weight: 700; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`,
                              )}
                            >
                              {v.name}
                            </span>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                  <div style={css(`min-width: 0;`)}>
                    <div
                      style={css(
                        `font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #8DE8FD; margin-bottom: 10px; white-space: nowrap; color: var(--ac);`,
                      )}
                    >
                      Top trajets
                    </div>
                    <div style={css(`display: flex; flex-direction: column; gap: 7px;`)}>
                      {cardRoutes.map((r, i) => (
                        <Fragment key={i}>
                          <div style={css(`display: flex; align-items: baseline; gap: 6px;`)}>
                            <span style={css(`flex: 0 0 auto; width: 22px; font-size: 12px; font-weight: 700; color: #6C768A;`)}>{r.n}</span>
                            <span
                              style={css(
                                `flex: 1 1 auto; min-width: 0; font-size: 16px; font-weight: 700; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`,
                              )}
                            >
                              {r.name}
                            </span>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={css(`display: grid; grid-template-columns: 1fr 1.18fr; gap: 20px;`)}>
                  <div style={css(`min-width: 0;`)}>
                    <div
                      style={css(
                        `font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #8DE8FD; margin-bottom: 5px; color: var(--ac);`,
                      )}
                    >
                      Kilomètres
                    </div>
                    <div style={css(`font-size: 34px; font-weight: 800; letter-spacing: -.045em; line-height: .9;`)}>{d.km}</div>
                  </div>
                  <div style={css(`min-width: 0;`)}>
                    <div
                      style={css(
                        `font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #8DE8FD; margin-bottom: 5px; color: var(--ac);`,
                      )}
                    >
                      Budget
                    </div>
                    <div style={css(`font-size: 34px; font-weight: 800; letter-spacing: -.045em; line-height: .9; color: #F1F4F7;`)}>
                      {d.eur}
                      {' €'}
                    </div>
                  </div>
                </div>
              </div>
              <div
                style={css(
                  `flex: 0 0 auto; margin-top: auto; padding: 12px 22px 14px; border-top: 1px solid rgba(241,244,247,.12); display: flex; align-items: center; justify-content: space-between; gap: 10px;`,
                )}
              >
                <div style={css(`display: flex; align-items: center; gap: 9px; min-width: 0;`)}>
                  <span style={css(`flex: 0 0 auto; width: 18px; height: 18px; border-radius: 50%; background: #8DE8FD; background: var(--ac);`)} />
                  <div style={css(`min-width: 0;`)}>
                    <div style={css(`font-size: 14px; font-weight: 800; letter-spacing: -.025em; line-height: 1.1; white-space: nowrap;`)}>
                      SNCF Wrapped
                    </div>
                    <div style={css(`font-size: 10px; color: #8A93A6; line-height: 1.2;`)}>{d.period}</div>
                  </div>
                </div>
                <span style={css(`flex: 0 0 auto; font-size: 9px; font-weight: 600; color: #8A93A6; white-space: nowrap;`)}>
                  greg0s.github.io/wrapped-sncf
                </span>
              </div>
            </>
          )}
          {isStory && (
            <>
              <div
                style={css(
                  `position: relative; flex: 0 0 auto; height: 262px; overflow: hidden; display: flex; align-items: center; justify-content: center;`,
                )}
              >
                <div style={css(`position: absolute; inset: 0; background: #8DE8FD; background: var(--ac);`)} />
                <div
                  style={css(
                    `position: absolute; left: -10px; top: -16px; font-size: 126px; font-weight: 800; letter-spacing: -.07em; line-height: .78; color: rgba(14,18,25,.13);`,
                  )}
                >
                  {d.bigA}
                </div>
                <div
                  style={css(
                    `position: absolute; right: -12px; bottom: -26px; font-size: 126px; font-weight: 800; letter-spacing: -.07em; line-height: .78; color: rgba(14,18,25,.13);`,
                  )}
                >
                  {d.bigB}
                </div>
                <div
                  style={css(
                    `position: relative; width: 208px; height: 208px; display: flex; align-items: center; justify-content: center; overflow: hidden;`,
                  )}
                >
                  <FranceMap lineColor="#FFFFFF" scale={1.45} model={franceMap} style={css('width: 100%; height: 100%;')} />
                </div>
              </div>
              <div
                style={css(
                  `flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; justify-content: space-evenly; gap: 26px; padding: 24px 20px;`,
                )}
              >
                <div style={css(`display: grid; grid-template-columns: 106px 160px; justify-content: center; gap: 12px; align-items: start;`)}>
                  <div style={css(`min-width: 0;`)}>
                    <div
                      style={css(
                        `font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #8DE8FD; margin-bottom: 10px; white-space: nowrap; color: var(--ac);`,
                      )}
                    >
                      Top villes
                    </div>
                    <div style={css(`display: flex; flex-direction: column; gap: 9px;`)}>
                      {cardCities.map((v, i) => (
                        <Fragment key={i}>
                          <div style={css(`display: flex; align-items: baseline; gap: 6px;`)}>
                            <span style={css(`flex: 0 0 auto; width: 22px; font-size: 12px; font-weight: 700; color: #6C768A;`)}>{v.n}</span>
                            <span
                              style={css(
                                `flex: 1 1 auto; min-width: 0; font-size: 16px; font-weight: 700; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`,
                              )}
                            >
                              {v.name}
                            </span>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                  <div style={css(`min-width: 0;`)}>
                    <div
                      style={css(
                        `font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #8DE8FD; margin-bottom: 10px; white-space: nowrap; color: var(--ac);`,
                      )}
                    >
                      Top trajets
                    </div>
                    <div style={css(`display: flex; flex-direction: column; gap: 9px;`)}>
                      {cardRoutes.map((r, i) => (
                        <Fragment key={i}>
                          <div style={css(`display: flex; align-items: baseline; gap: 6px;`)}>
                            <span style={css(`flex: 0 0 auto; width: 22px; font-size: 12px; font-weight: 700; color: #6C768A;`)}>{r.n}</span>
                            <span
                              style={css(
                                `flex: 1 1 auto; min-width: 0; font-size: 16px; font-weight: 700; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`,
                              )}
                            >
                              {r.name}
                            </span>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={css(`display: grid; grid-template-columns: 106px 160px; justify-content: center; gap: 12px;`)}>
                  <div style={css(`min-width: 0;`)}>
                    <div
                      style={css(
                        `font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #8DE8FD; margin-bottom: 5px; color: var(--ac);`,
                      )}
                    >
                      Kilomètres
                    </div>
                    <div style={css(`font-size: 29px; font-weight: 800; letter-spacing: -.045em; line-height: .9; white-space: nowrap;`)}>{d.km}</div>
                  </div>
                  <div style={css(`min-width: 0;`)}>
                    <div
                      style={css(
                        `font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #8DE8FD; margin-bottom: 5px; color: var(--ac);`,
                      )}
                    >
                      Budget
                    </div>
                    <div
                      style={css(`font-size: 29px; font-weight: 800; letter-spacing: -.045em; line-height: .9; white-space: nowrap; color: #F1F4F7;`)}
                    >
                      {d.eur}
                      {' €'}
                    </div>
                  </div>
                </div>
              </div>
              <div
                style={css(
                  `flex: 0 0 auto; margin-top: auto; padding: 12px 20px 14px; border-top: 1px solid rgba(241,244,247,.12); display: flex; align-items: center; justify-content: space-between; gap: 10px;`,
                )}
              >
                <div style={css(`display: flex; align-items: center; gap: 9px; min-width: 0;`)}>
                  <span style={css(`flex: 0 0 auto; width: 18px; height: 18px; border-radius: 50%; background: #8DE8FD; background: var(--ac);`)} />
                  <div style={css(`min-width: 0;`)}>
                    <div style={css(`font-size: 14px; font-weight: 800; letter-spacing: -.025em; line-height: 1.1; white-space: nowrap;`)}>
                      SNCF Wrapped
                    </div>
                    <div style={css(`font-size: 10px; color: #8A93A6; line-height: 1.2;`)}>{d.period}</div>
                  </div>
                </div>
                <span style={css(`flex: 0 0 auto; font-size: 9px; font-weight: 600; color: #8A93A6; white-space: nowrap;`)}>
                  greg0s.github.io/wrapped-sncf
                </span>
              </div>
            </>
          )}
        </div>
      </div>
      <div data-anim="up" data-delay="300" style={css(`display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;`)}>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          style={css(
            `font-family: 'Schibsted Grotesk', sans-serif; font-size: 16px; font-weight: 700; color: #0E1219; background: #8DE8FD; border: none; border-radius: 999px; padding: 15px 26px; cursor: pointer; transition: transform .18s ease, filter .2s ease; background: var(--ac); opacity: ${downloading ? 0.7 : 1};`,
          )}
          className="hv-cta"
        >
          {dlLabel}
        </button>
        <button
          type="button"
          onClick={replay}
          style={css(
            `font-family: 'Schibsted Grotesk', sans-serif; font-size: 16px; font-weight: 600; color: #F1F4F7; background: transparent; border: 1.5px solid rgba(241,244,247,.35); border-radius: 999px; padding: 14px 24px; cursor: pointer; transition: border-color .2s ease;`,
          )}
          className="hv-border"
        >
          Revoir depuis le début
        </button>
      </div>
      <p data-anim="up" data-delay="380" style={css(`margin: 0; font-size: 12px; color: #6C768A; text-align: center;`)}>
        {recapNote}
      </p>
    </section>
  )
}
