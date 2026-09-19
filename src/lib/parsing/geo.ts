const EARTH_RADIUS_KM = 6371.0088

/** Circonférence terrestre, pour l'équivalent « tours de la Terre ». */
export const EARTH_CIRCUMFERENCE_KM = 40075

/**
 * Le tracé ferroviaire est plus long que la ligne droite entre deux gares. Les km affichés sont donc
 * « à vol d'oiseau × 1,2 » : une ESTIMATION forfaitaire, le CSV ne contient aucune distance.
 */
export const RAIL_DETOUR_FACTOR = 1.2

/** Distance à vol d'oiseau (formule de haversine), en km. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * Projection (latitude, longitude) → coordonnées du SVG « CarteFrance » de la maquette (viewBox 10 10 405 405).
 * Transformation affine ajustée par moindres carrés sur les 6 villes de la maquette (Lyon, Paris, Marseille,
 * Nantes, Dijon, Strasbourg) : écart maximal 0,1 px.
 */
export function projectToFranceMap(lat: number, lon: number): { x: number; y: number } {
  return { x: 27.5327 * lon + 143.162, y: -39.9919 * lat + 2059.6156 }
}
