const EARTH_RADIUS_KM = 6371.0088

/** Earth's circumference, for the "laps around the Earth" equivalent. */
export const EARTH_CIRCUMFERENCE_KM = 40075

/**
 * The rail track is longer than the straight line between two stations. The displayed km are
 * therefore "as the crow flies × 1.2": a flat-rate ESTIMATE, since the CSV contains no distance data.
 */
export const RAIL_DETOUR_FACTOR = 1.2

/** Great-circle distance (haversine formula), in km. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * Projects (latitude, longitude) → coordinates in the mockup's "CarteFrance" SVG (viewBox 10 10 405 405).
 * Affine transform fitted by least squares on the mockup's 6 cities (Lyon, Paris, Marseille,
 * Nantes, Dijon, Strasbourg): maximum deviation 0.1 px.
 */
export function projectToFranceMap(lat: number, lon: number): { x: number; y: number } {
  return { x: 27.5327 * lon + 143.162, y: -39.9919 * lat + 2059.6156 }
}
