import type { Position } from '../location/googleMaps'

export interface SelectedLocation extends Position {
  label: string
  /** Address text for this exact point; absent for map, device or fallback labels. */
  address?: string
}
export function validPosition(point: Position) {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180
  )
}
