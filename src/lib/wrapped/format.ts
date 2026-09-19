/** Nombre entier à la française : « 31 144 » (espace simple, comme dans la maquette). */
export const fmtNum = (n: number): string => Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ')

/**
 * Montant sur les écrans : euros entiers dès 10 € (« 850 € »), centimes en dessous (« 1,50 € »),
 * pour ne pas arrondir un billet à 1,50 € en « 2 € ».
 */
export const fmtEur = (n: number): string => (n >= 10 || Number.isInteger(n) ? `${fmtNum(n)} €` : `${n.toFixed(2).replace('.', ',')} €`)

/** En français, 0 et 1 s'accordent au singulier. */
export const plural = (n: number, one: string, many: string): string => (n > 1 ? many : one)

export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
