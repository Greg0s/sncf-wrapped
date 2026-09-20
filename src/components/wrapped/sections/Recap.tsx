import { toPng } from 'html-to-image'
import { Fragment, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { css } from '../../../lib/css'
import type { WrappedView } from '../../../lib/wrapped'
import { FranceMap } from '../FranceMap'

// Formats of the shareable card: preview dimensions (px) and exported image size (exportW/exportH).
// iconW/iconH size the little format-shape glyph on the desktop format buttons below.
const FORMATS = [
  { key: 'story', label: 'Story', dims: '1080 × 1920', w: 320, h: 569, iconW: 8, iconH: 14, exportW: 1080, exportH: 1920 },
  { key: 'wide', label: '4:5', dims: '1080 × 1350', w: 400, h: 500, iconW: 11, iconH: 13.75, exportW: 1080, exportH: 1350 },
  { key: 'square', label: 'Carré', dims: '1080 × 1080', w: 400, h: 400, iconW: 11, iconH: 11, exportW: 1080, exportH: 1080 },
] as const

// A horizontal drag shorter than this is a tap or a scroll attempt, not a format swipe.
const SWIPE_THRESHOLD_PX = 40

// Tallest and widest formats ('story' and 'square'/'wide'), used to keep the preview slot's size
// constant across format switches: the slide track below relies on a fixed slot per format.
const MAX_FORMAT_H = Math.max(...FORMATS.map((f) => f.h))
const MAX_FORMAT_W = Math.max(...FORMATS.map((f) => f.w))

// Duration of the slide transition between formats, in ms.
const FORMAT_SLIDE_MS = 420

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
  const { d, franceMap, cardCities, cardRoutes } = view
  const [format, setFormat] = useState<(typeof FORMATS)[number]['key']>(FORMATS[0].key)
  const [availH, setAvailH] = useState(300)
  const [downloading, setDownloading] = useState(false)
  // Desktop (mouse + hover) gets 3 distinct format buttons and an instant switch, like before the
  // slide/swipe carousel was added; that carousel (dots, swipe, slide+crossfade) stays touch-only.
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  const cardRef = useRef<HTMLDivElement>(null)
  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null)
  useEffect(() => {
    const measure = () => setAvailH(Math.max(220, (window.innerHeight || 600) - 240))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const fmt = FORMATS.find((f) => f.key === format) ?? FORMATS[0]
  // Scale is derived from the tallest format (not the selected one) so the preview slot's height
  // stays constant across format switches: surrounding content never shifts when the card does.
  const fit = Math.max(0.42, Math.min(1, availH / MAX_FORMAT_H)).toFixed(3)
  const formatIndex = FORMATS.findIndex((f) => f.key === fmt.key)
  const changeFormat = (direction: 1 | -1) => {
    const next = FORMATS[Math.min(FORMATS.length - 1, Math.max(0, formatIndex + direction))]
    if (next) setFormat(next.key)
  }

  // Swipe left/right on the card preview to change format, in addition to the dots below it.
  // Touch only, scoped to the preview box (not the whole screen), so it never fights the
  // tap-to-navigate zone: a real swipe already moves well past the tap tolerance that gesture uses.
  const onCardPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return
    swipeStart.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
  }
  const onCardPointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (swipeStart.current?.id === e.pointerId) swipeStart.current = null
  }
  const onCardPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current
    if (e.pointerType !== 'touch' || !start || start.id !== e.pointerId) return
    swipeStart.current = null
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return
    changeFormat(dx < 0 ? 1 : -1)
  }

  const slotH = Math.round(MAX_FORMAT_H * Number(fit))
  const stageW = Math.round(MAX_FORMAT_W * Number(fit))
  const dlLabel = downloading ? 'Génération…' : `Télécharger · ${fmt.dims}`

  // Active card's on-screen box, used to size the drop shadow below: it's drawn as a sibling of the
  // carousel's clipped stage (not inside it), so the shadow bleeds evenly on every side instead of
  // being cut by the overflow:hidden window that hides the other formats' slides.
  const cardBoxW = Math.round(fmt.w * Number(fit))
  const cardBoxH = Math.round(fmt.h * Number(fit))
  const cardRadius = Math.round(24 * Number(fit))
  const cardShadow = `0 ${Math.round(28 * Number(fit))}px ${Math.round(64 * Number(fit))}px rgba(0,0,0,.55), 0 ${Math.round(6 * Number(fit))}px ${Math.round(16 * Number(fit))}px rgba(0,0,0,.4)`

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
      {isDesktop ? (
        <div data-anim="up" data-delay="60" style={css(`display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;`)}>
          {FORMATS.map((f) => {
            const on = f.key === fmt.key
            const fg = on ? '#0E1219' : '#AEB7C6'
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFormat(f.key)}
                style={css(
                  `font-family: 'Schibsted Grotesk', sans-serif; font-size: 13px; font-weight: 600; color: ${fg}; background: ${on ? 'var(--ac)' : 'transparent'}; border: 1.5px solid ${on ? 'var(--ac)' : 'rgba(241,244,247,.22)'}; border-radius: 999px; padding: 8px 15px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: transform .16s ease;`,
                )}
                className="hv-lift-2"
              >
                <span style={css(`display: inline-block; width: ${f.iconW}px; height: ${f.iconH}px; border: 1.5px solid ${fg}; border-radius: 2px;`)} />
                {f.label}
              </button>
            )
          })}
        </div>
      ) : (
        <div data-anim="up" data-delay="60" style={css(`display: flex; flex-direction: column; align-items: center; gap: 10px;`)}>
          <div style={css(`font-size: 13px; font-weight: 600; color: #AEB7C6;`)}>
            {fmt.label} · {fmt.dims}
          </div>
          <div style={css(`display: flex; align-items: center; gap: 8px;`)}>
            {FORMATS.map((f) => {
              const on = f.key === fmt.key
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFormat(f.key)}
                  aria-label={`Format ${f.label} (${f.dims})`}
                  aria-current={on || undefined}
                  style={css(
                    `width: ${on ? 22 : 8}px; height: 8px; padding: 0; border: none; border-radius: 999px; background: ${on ? 'var(--ac)' : 'rgba(241,244,247,.28)'}; cursor: pointer; transition: width .22s cubic-bezier(.16,.84,.26,1), background .2s ease, transform .16s ease;`,
                  )}
                  className="hv-lift-2"
                />
              )
            })}
          </div>
        </div>
      )}
      <div style={css(`height: ${slotH}px; display: flex; align-items: center; justify-content: center; position: relative;`)}>
        {/* Drop shadow for the active card, centered on this box. Kept outside the clipped stage below
            so the carousel's overflow:hidden (which hides the other formats' slides) never cuts it. */}
        <div
          aria-hidden="true"
          style={css(
            `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: ${cardBoxW}px; height: ${cardBoxH}px; border-radius: ${cardRadius}px; box-shadow: ${cardShadow}; transition: ${isDesktop ? 'none' : `width ${FORMAT_SLIDE_MS}ms cubic-bezier(.16,.84,.26,1), height ${FORMAT_SLIDE_MS}ms cubic-bezier(.16,.84,.26,1)`};`,
          )}
        />
        {/* Fixed-size viewport (biggest format's dims) so the slide track below lines formats up side by side. */}
        <div
          data-anim="scale"
          data-delay="120"
          style={css(`width: ${stageW}px; height: ${slotH}px; overflow: hidden; position: relative;`)}
        >
          {/* All formats are always mounted, laid out side by side; changing `format` only moves this
              track's translateX and crossfades each slide's opacity, so the format switch (swipe or
              dots) animates as a CSS transition. */}
          <div
            onPointerDown={onCardPointerDown}
            onPointerUp={onCardPointerUp}
            onPointerCancel={onCardPointerCancel}
            style={css(
              `display: flex; width: ${stageW * FORMATS.length}px; height: 100%; transform: translateX(-${formatIndex * stageW}px); transition: ${isDesktop ? 'none' : `transform ${FORMAT_SLIDE_MS}ms cubic-bezier(.16,.84,.26,1)`}; touch-action: pan-y;`,
            )}
          >
          {FORMATS.map((f) => {
            const isSquare = f.key === 'square'
            const isWide = f.key === 'wide'
            const isStory = f.key === 'story'
            const boxW = Math.round(f.w * Number(fit))
            const boxH = Math.round(f.h * Number(fit))
            return (
          <div
            key={f.key}
            style={css(
              `flex: 0 0 ${stageW}px; height: 100%; display: flex; align-items: center; justify-content: center; opacity: ${f.key === fmt.key ? 1 : 0}; transition: ${isDesktop ? 'none' : `opacity ${FORMAT_SLIDE_MS}ms ease`};`,
            )}
          >
          <div style={css(`width: ${boxW}px; height: ${boxH}px;`)}>
          <div
            ref={f.key === fmt.key ? cardRef : undefined}
            style={css(
              `width: ${f.w}px; height: ${f.h}px; transform: scale(${fit}); transform-origin: top left; background: #0E1219; border-radius: 24px; overflow: hidden; display: flex; flex-direction: column;`,
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
          </div>
            )
          })}
          </div>
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
    </section>
  )
}
