/**
 * Speed of the reveals. The mockup exposes this setting ("revealSpeed", 0.5 to 2) with 0.6 by default:
 * all animation durations are divided by this value.
 */
export const REVEAL_SPEED = 0.6

/**
 * Whether the visitor asked their system to reduce motion. Read when an animation is about to start
 * (never while rendering: the landing is prerendered), so a change of setting applies to the next reveal.
 */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}
