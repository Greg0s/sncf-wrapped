/** Integer in French format: "31 144" (plain space, as in the mockup). */
export const fmtNum = (n: number): string => Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ')

/**
 * Amount shown on screens: whole euros from 10 € up ("850 €"), cents below that ("1,50 €"),
 * so a 1.50 € ticket doesn't get rounded to "2 €".
 */
export const fmtEur = (n: number): string => (n >= 10 || Number.isInteger(n) ? `${fmtNum(n)} €` : `${n.toFixed(2).replace('.', ',')} €`)

/** In French, 0 and 1 both take the singular. */
export const plural = (n: number, one: string, many: string): string => (n > 1 ? many : one)

export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
